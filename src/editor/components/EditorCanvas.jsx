import React, { useMemo, useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react'
import useEditorStore from '../../store/useEditorStore'
import { Monitor, Lock, Upload } from 'lucide-react'
import { MediaObjectRenderer } from '../../player/MediaRenderers'
import { addMediaFiles, mediaTypeFromName, openProject } from '../projectActions'

// ─── Resize handle geometry ──────────────────────────────────────────────────

const HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

function handleStyle(dir) {
  const H = 8, HALF = -4
  const mid = 'calc(50% - 4px)'
  const positions = {
    nw: { top: HALF, left: HALF },
    n:  { top: HALF, left: mid },
    ne: { top: HALF, right: HALF },
    e:  { top: mid,  right: HALF },
    se: { bottom: HALF, right: HALF },
    s:  { bottom: HALF, left: mid },
    sw: { bottom: HALF, left: HALF },
    w:  { top: mid,  left: HALF },
  }
  return {
    position: 'absolute',
    width: H, height: H,
    background: '#1e90ff',
    border: '1.5px solid #fff',
    borderRadius: 1,
    zIndex: 2,
    cursor: `${dir}-resize`,
    ...positions[dir],
  }
}

function applyResize(start, dir, dx, dy, keepAspect) {
  let { x, y, width, height } = start
  const MIN = 4
  if (dir.includes('e')) width = Math.max(MIN, width + dx)
  if (dir.includes('s')) height = Math.max(MIN, height + dy)
  if (dir.includes('w')) { const nw = Math.max(MIN, width - dx); x += width - nw; width = nw }
  if (dir.includes('n')) { const nh = Math.max(MIN, height - dy); y += height - nh; height = nh }

  // Shift + corner handle → keep the original aspect ratio
  if (keepAspect && dir.length === 2) {
    const ratio = start.width / start.height
    if (Math.abs(width - start.width) / start.width > Math.abs(height - start.height) / start.height) {
      const nh = width / ratio
      if (dir.includes('n')) y += height - nh
      height = nh
    } else {
      const nw = height * ratio
      if (dir.includes('w')) x += width - nw
      width = nw
    }
  }
  return { x, y, width, height }
}

// ─── Snapping ────────────────────────────────────────────────────────────────

function snapTargets(objects, id, cw, ch) {
  const xs = [0, cw / 2, cw]
  const ys = [0, ch / 2, ch]
  for (const o of objects) {
    if (o.id === id || o.visible === false) continue
    xs.push(o.x, o.x + o.width / 2, o.x + o.width)
    ys.push(o.y, o.y + o.height / 2, o.y + o.height)
  }
  return { xs, ys }
}

/** Find the smallest offset that aligns any of `values` with any target. */
function bestSnap(values, targets, threshold) {
  let best = null
  for (const v of values) {
    for (const t of targets) {
      const d = t - v
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, line: t }
    }
  }
  return best
}

const round = (r) => ({
  ...r,
  ...(r.x !== undefined && { x: Math.round(r.x) }),
  ...(r.y !== undefined && { y: Math.round(r.y) }),
  ...(r.width !== undefined && { width: Math.round(r.width) }),
  ...(r.height !== undefined && { height: Math.round(r.height) }),
})

// ─── Selection / interaction overlay per object ──────────────────────────────

function ObjectOverlay({ obj, isSelected, scale, onInteractStart }) {
  if (obj.visible === false) return null
  return (
    <div
      className={`canvas-overlay ${isSelected ? 'canvas-overlay--selected' : ''} ${obj.locked ? 'canvas-overlay--locked' : ''}`}
      style={{
        left: obj.x * scale, top: obj.y * scale,
        width: obj.width * scale, height: obj.height * scale,
      }}
      onMouseDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); e.preventDefault(); onInteractStart(e, obj, 'drag', null) }}
    >
      {isSelected && (
        <div className="canvas-overlay-label">
          {obj.locked && <Lock size={9} />}
          {obj.name} · {Math.round(obj.width)}×{Math.round(obj.height)}
        </div>
      )}
      {isSelected && !obj.locked && HANDLE_DIRS.map((dir) => (
        <div
          key={dir}
          style={handleStyle(dir)}
          onMouseDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); e.preventDefault(); onInteractStart(e, obj, 'resize', dir) }}
        />
      ))}
    </div>
  )
}

// ─── Main canvas ─────────────────────────────────────────────────────────────

export default function EditorCanvas() {
  const scene = useEditorStore((s) => s.scene)
  const zoomLevel = useEditorStore((s) => s.zoomLevel)
  const fitToken = useEditorStore((s) => s.fitToken)
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId)
  const showGrid = useEditorStore((s) => s.showGrid)
  const { selectObject, setZoomLevel } = useEditorStore.getState()

  const { canvasSize, backgroundColor, mediaObjects } = scene
  const cw = canvasSize.width
  const ch = canvasSize.height
  const scale = zoomLevel / 100
  const dispW = cw * scale
  const dispH = ch * scale

  const areaRef = useRef(null)
  const surfaceRef = useRef(null)
  const [interaction, setInteraction] = useState(null) // { text }
  const [guides, setGuides] = useState({ x: null, y: null })
  const [dropActive, setDropActive] = useState(false)
  const [cursorPos, setCursorPos] = useState(null)

  const sorted = useMemo(() => [...mediaObjects].sort((a, b) => a.zIndex - b.zIndex), [mediaObjects])
  const selected = mediaObjects.find((o) => o.id === selectedObjectId)

  // ── Fit canvas into the visible area (on start, on request, on size change)
  const fit = useCallback(() => {
    const el = areaRef.current
    if (!el) return
    const pad = 56
    const z = Math.min((el.clientWidth - pad) / cw, (el.clientHeight - pad) / ch) * 100
    setZoomLevel(Math.max(5, Math.min(100, Math.floor(z))))
  }, [cw, ch, setZoomLevel])

  useLayoutEffect(() => { fit() }, [fitToken, fit])

  // ── Ctrl + mouse wheel zoom
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const s = useEditorStore.getState()
      s.setZoomLevel(s.zoomLevel * (e.deltaY < 0 ? 1.1 : 1 / 1.1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Drag / resize
  const handleInteractStart = useCallback((e, obj, type, dir) => {
    const store = useEditorStore.getState()
    store.selectObject(obj.id)
    if (obj.locked) return

    const sc = store.zoomLevel / 100
    const { width: cW, height: cH } = store.scene.canvasSize
    const targets = snapTargets(store.scene.mediaObjects, obj.id, cW, cH)
    const start = { x: obj.x, y: obj.y, width: obj.width, height: obj.height }
    const startMouse = { x: e.clientX, y: e.clientY }
    let moved = false

    const onMove = (ev) => {
      const rawDx = (ev.clientX - startMouse.x) / sc
      const rawDy = (ev.clientY - startMouse.y) / sc
      if (!moved) {
        if (Math.abs(ev.clientX - startMouse.x) < 3 && Math.abs(ev.clientY - startMouse.y) < 3) return
        moved = true
        useEditorStore.getState().snapshot() // one undo step for the whole gesture
      }
      const { snapEnabled } = useEditorStore.getState()
      const snap = snapEnabled && !ev.altKey
      const threshold = 6 / sc
      let gx = null, gy = null
      let changes

      if (type === 'drag') {
        let dx = rawDx, dy = rawDy
        if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0 }
        let nx = start.x + dx
        let ny = start.y + dy
        if (snap) {
          const sx = bestSnap([nx, nx + start.width / 2, nx + start.width], targets.xs, threshold)
          const sy = bestSnap([ny, ny + start.height / 2, ny + start.height], targets.ys, threshold)
          if (sx) { nx += sx.delta; gx = sx.line }
          if (sy) { ny += sy.delta; gy = sy.line }
        }
        changes = round({ x: nx, y: ny })
        setInteraction({ text: `X ${changes.x}  Y ${changes.y}` })
      } else {
        const r = applyResize(start, dir, rawDx, rawDy, ev.shiftKey)
        if (snap && !ev.shiftKey) {
          if (dir.includes('e')) { const s = bestSnap([r.x + r.width], targets.xs, threshold); if (s) { r.width += s.delta; gx = s.line } }
          if (dir.includes('w')) { const s = bestSnap([r.x], targets.xs, threshold); if (s) { r.x += s.delta; r.width -= s.delta; gx = s.line } }
          if (dir.includes('s')) { const s = bestSnap([r.y + r.height], targets.ys, threshold); if (s) { r.height += s.delta; gy = s.line } }
          if (dir.includes('n')) { const s = bestSnap([r.y], targets.ys, threshold); if (s) { r.y += s.delta; r.height -= s.delta; gy = s.line } }
        }
        changes = round(r)
        setInteraction({ text: `W ${changes.width}  H ${changes.height}` })
      }
      setGuides({ x: gx, y: gy })
      useEditorStore.getState().updateMediaObject(obj.id, changes, { record: false })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setInteraction(null)
      setGuides({ x: null, y: null })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // ── Drop files from Explorer
  function toCanvasPoint(e) {
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.max(0, Math.min(cw - 10, (e.clientX - rect.left) / scale)),
      y: Math.max(0, Math.min(ch - 10, (e.clientY - rect.top) / scale)),
    }
  }

  async function handleDrop(e) {
    e.preventDefault()
    setDropActive(false)
    const api = window.electronAPI
    const files = [...(e.dataTransfer?.files || [])]
    if (!files.length || !api) return
    const project = files.find((f) => /\.ulp$/i.test(f.name))
    if (project) {
      const p = api.getPathForFile(project)
      if (p) openProject(p)
      return
    }
    const media = []
    for (const f of files) {
      if (!mediaTypeFromName(f.name)) continue
      const p = api.getPathForFile(f)
      if (p) media.push({ name: f.name, url: await api.pathToMediaUrl(p) })
    }
    if (media.length) addMediaFiles(media, toCanvasPoint(e))
    else useEditorStore.getState().showToast('Unsupported file type', 'error')
  }

  const gridStep = Math.max(10, Math.round(Math.min(cw, ch) / 12 / 10) * 10)

  return (
    <div className="canvas-wrap">
      <div
        ref={areaRef}
        className={`canvas-area ${dropActive ? 'canvas-area--drop' : ''}`}
        onMouseDown={() => selectObject(null)}
        onDragOver={(e) => {
          if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); setDropActive(true) }
        }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDropActive(false) }}
        onDrop={handleDrop}
        onMouseMove={(e) => {
          if (!surfaceRef.current) return
          const rect = surfaceRef.current.getBoundingClientRect()
          const x = Math.round((e.clientX - rect.left) / scale)
          const y = Math.round((e.clientY - rect.top) / scale)
          setCursorPos(x >= 0 && y >= 0 && x <= cw && y <= ch ? { x, y } : null)
        }}
        onMouseLeave={() => setCursorPos(null)}
      >
        <div
          ref={surfaceRef}
          className="canvas-surface"
          style={{ width: dispW, height: dispH }}
        >
          {/* Live preview rendered at native resolution, then scaled */}
          <div
            className="canvas-content"
            style={{
              width: cw, height: ch, backgroundColor,
              transform: `scale(${scale})`,
            }}
          >
            {sorted.map((obj) => (
              <MediaObjectRenderer key={obj.id} obj={obj} isPaused playCommand="pause" preview />
            ))}
          </div>

          {showGrid && (
            <div
              className="canvas-grid"
              style={{ backgroundSize: `${gridStep * scale}px ${gridStep * scale}px` }}
            />
          )}

          {sorted.map((obj) => (
            <ObjectOverlay
              key={`ov-${obj.id}`}
              obj={obj}
              isSelected={selectedObjectId === obj.id}
              scale={scale}
              onInteractStart={handleInteractStart}
            />
          ))}

          {guides.x !== null && <div className="canvas-guide canvas-guide--v" style={{ left: guides.x * scale }} />}
          {guides.y !== null && <div className="canvas-guide canvas-guide--h" style={{ top: guides.y * scale }} />}
        </div>

        {dropActive && (
          <div className="canvas-drop-hint">
            <Upload size={28} />
            <span>Drop video / image files to add them</span>
          </div>
        )}

        {mediaObjects.length === 0 && !dropActive && (
          <div className="canvas-empty-hint">
            Add media from the left panel, or drag video &amp; image files here
          </div>
        )}
      </div>

      <div className="canvas-footer">
        <Monitor size={12} />
        <span>{cw} × {ch} px</span>
        <span className="canvas-footer-sep" />
        <span>{zoomLevel}%</span>
        <span className="canvas-footer-sep" />
        <span>{mediaObjects.length} object{mediaObjects.length === 1 ? '' : 's'}</span>
        {selected && !interaction && (
          <>
            <span className="canvas-footer-sep" />
            <span className="canvas-footer-sel">
              {selected.name}: {selected.x}, {selected.y} · {selected.width}×{selected.height}
            </span>
          </>
        )}
        {interaction && (
          <>
            <span className="canvas-footer-sep" />
            <span className="canvas-footer-sel">{interaction.text}</span>
          </>
        )}
        <span className="canvas-footer-spacer" />
        {cursorPos && <span className="canvas-footer-cursor">⌖ {cursorPos.x}, {cursorPos.y}</span>}
        <span className="canvas-footer-hint">Shift: lock axis / ratio · Alt: no snap · Ctrl+Wheel: zoom</span>
      </div>
    </div>
  )
}
