import React, { useMemo, useRef, useState, useCallback } from 'react'
import useEditorStore from '../../store/useEditorStore'
import { Monitor } from 'lucide-react'

// ─── Resize handle geometry ────────────────────────────────────────────────────

const HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const HANDLE_CURSORS = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
}

function handlePos(dir) {
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
    boxSizing: 'border-box',
    zIndex: 10001,
    cursor: HANDLE_CURSORS[dir],
    ...positions[dir],
  }
}

function applyResize(start, dir, dx, dy) {
  let { x, y, width, height } = start
  const MIN = 20
  if (dir.includes('e')) width  = Math.max(MIN, width + dx)
  if (dir.includes('s')) height = Math.max(MIN, height + dy)
  if (dir.includes('w')) {
    const nw = Math.max(MIN, width - dx)
    x = x + (width - nw); width = nw
  }
  if (dir.includes('n')) {
    const nh = Math.max(MIN, height - dy)
    y = y + (height - nh); height = nh
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
}

// ─── Lightweight preview of a single object ───────────────────────────────────

function PreviewObject({ obj, scale }) {
  const style = {
    position: 'absolute',
    left: obj.x * scale, top: obj.y * scale,
    width: obj.width * scale, height: obj.height * scale,
    opacity: obj.opacity,
    zIndex: obj.zIndex,
    display: obj.visible === false ? 'none' : 'flex',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', boxSizing: 'border-box',
    fontSize: Math.max(9, (obj.fontSize || 16) * scale),
    color: obj.fontColor || '#fff',
    fontFamily: obj.fontFamily || 'Inter, sans-serif',
    background: obj.type === 'color' ? obj.color : 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    pointerEvents: 'none', userSelect: 'none',
  }

  function content() {
    switch (obj.type) {
      case 'video':
        return <span style={{ fontSize: 9, color: '#aaa' }}>▶ {obj.name}</span>
      case 'image':
        return obj.src
          ? <img src={obj.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
          : <span style={{ fontSize: 9, color: '#aaa' }}>🖼 {obj.name}</span>
      case 'playlist': {
        const first = (obj.playlistItems || [])[0]
        return first?.src
          ? (first.type === 'image'
              ? <img src={first.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
              : <span style={{ fontSize: 9, color: '#8b5cf6' }}>▶ {obj.name} ({(obj.playlistItems||[]).length} items)</span>)
          : <span style={{ fontSize: 9, color: '#8b5cf6' }}>📋 {obj.name}</span>
      }
      case 'text':
      case 'running-text':
        return <span style={{ fontSize: Math.max(8, (obj.fontSize || 16) * scale * 0.7), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>{obj.text}</span>
      case 'html':    return <span style={{ fontSize: 9, color: '#a855f7' }}>&lt;HTML&gt;</span>
      case 'clock':   return <span style={{ fontSize: Math.max(8, (obj.fontSize || 32) * scale * 0.6), fontVariantNumeric: 'tabular-nums' }}>⏱ 00:00:00</span>
      case 'weather': return <span style={{ fontSize: 9, color: '#38bdf8' }}>⛅ Weather</span>
      case 'color':   return null
      default:        return <span style={{ fontSize: 9, color: '#aaa' }}>{obj.type}</span>
    }
  }

  return <div style={style}>{content()}</div>
}

// ─── Drag + resize overlay per object ────────────────────────────────────────

function ObjectOverlay({ obj, isSelected, scale, onInteractStart, onSelect }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: obj.x * scale, top: obj.y * scale,
        width: obj.width * scale, height: obj.height * scale,
        zIndex: 9999,
        boxSizing: 'border-box',
        border: isSelected ? '1px solid #1e90ff' : '1px solid transparent',
        cursor: 'move',
        userSelect: 'none',
        display: obj.visible === false ? 'none' : 'block',
      }}
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onInteractStart(e, obj, 'drag', null) }}
      onClick={(e) => { e.stopPropagation(); onSelect(obj.id) }}
    >
      {/* Resize handles — only on selected object */}
      {isSelected && HANDLE_DIRS.map((dir) => (
        <div
          key={dir}
          style={handlePos(dir)}
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onInteractStart(e, obj, 'resize', dir) }}
        />
      ))}
    </div>
  )
}

// ─── Main canvas ──────────────────────────────────────────────────────────────

export default function EditorCanvas() {
  const { scene, zoomLevel, selectedObjectId, selectObject, updateMediaObject } = useEditorStore()
  const { canvasSize, backgroundColor, mediaObjects } = scene

  const scale = zoomLevel / 100
  const dispW = canvasSize.width  * scale
  const dispH = canvasSize.height * scale

  const sorted = useMemo(
    () => [...mediaObjects].sort((a, b) => a.zIndex - b.zIndex),
    [mediaObjects]
  )

  const interacting = useRef(null)
  const [isDragging, setIsDragging]   = useState(false)
  const [statusText, setStatusText]   = useState('')

  const handleInteractStart = useCallback((e, obj, type, direction) => {
    selectObject(obj.id)
    interacting.current = {
      type, direction, id: obj.id,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: obj.x, startY: obj.y,
      startW: obj.width, startH: obj.height,
    }
    setIsDragging(true)
  }, [selectObject])

  const handleMouseMove = useCallback((e) => {
    if (!interacting.current) return
    const { type, direction, id, startMouseX, startMouseY, startX, startY, startW, startH } = interacting.current
    const dx = (e.clientX - startMouseX) / scale
    const dy = (e.clientY - startMouseY) / scale

    if (type === 'drag') {
      const nx = Math.round(startX + dx)
      const ny = Math.round(startY + dy)
      updateMediaObject(id, { x: nx, y: ny })
      setStatusText(`x: ${nx}  y: ${ny}`)
    } else {
      const r = applyResize({ x: startX, y: startY, width: startW, height: startH }, direction, dx, dy)
      updateMediaObject(id, r)
      setStatusText(`${r.width} × ${r.height}`)
    }
  }, [scale, updateMediaObject])

  const handleMouseUp = useCallback(() => {
    interacting.current = null
    setIsDragging(false)
    setStatusText('')
  }, [])

  return (
    <div className="canvas-wrap">
      <div
        className="canvas-area"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'crosshair' : 'default' }}
      >
        <div
          className="canvas-surface"
          style={{ width: dispW, height: dispH, backgroundColor, position: 'relative', overflow: 'hidden', flexShrink: 0, userSelect: 'none' }}
          onClick={() => selectObject(null)}
        >
          {sorted.map((obj) => (
            <PreviewObject key={obj.id} obj={obj} scale={scale} />
          ))}
          {sorted.map((obj) => (
            <ObjectOverlay
              key={`ov-${obj.id}`}
              obj={obj}
              isSelected={selectedObjectId === obj.id}
              scale={scale}
              onInteractStart={handleInteractStart}
              onSelect={selectObject}
            />
          ))}
        </div>
      </div>

      <div className="canvas-footer">
        <Monitor size={12} />
        <span>{canvasSize.width} × {canvasSize.height} px</span>
        <span className="canvas-footer-sep" />
        <span>Preview {zoomLevel}%</span>
        {isDragging && statusText && (
          <>
            <span className="canvas-footer-sep" />
            <span style={{ color: '#1e90ff', fontVariantNumeric: 'tabular-nums' }}>{statusText}</span>
          </>
        )}
      </div>
    </div>
  )
}
