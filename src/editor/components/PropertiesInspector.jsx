import React, { useEffect, useMemo, useState } from 'react'
import useEditorStore from '../../store/useEditorStore'
import { CANVAS_PRESETS } from '../../data/scenes/defaultScene'
import { VIDEO_EXT, IMAGE_EXT, mediaTypeFromName } from '../projectActions'
import { TYPE_META } from './MediaLibrary'
import { parseYouTube, describeYouTube } from '../../engine/youtube'
import {
  Settings2, Layers, Monitor, Copy, Trash2, FolderOpen, ArrowLeftRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Maximize, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react'

const FONTS = [
  'Inter, sans-serif', 'Segoe UI, sans-serif', 'Arial, sans-serif', 'Arial Black, sans-serif',
  'Impact, sans-serif', 'Tahoma, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif',
  'Georgia, serif', 'Times New Roman, serif', 'Consolas, monospace', 'Courier New, monospace',
]

const TIMEZONES = (() => {
  try { return Intl.supportedValuesOf('timeZone') } catch { return ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC'] }
})()

const FIT_OPTIONS = [
  { value: 'cover',   label: 'Cover (crop to fill)' },
  { value: 'contain', label: 'Contain (letterbox)' },
  { value: 'fill',    label: 'Stretch' },
]

// ─── Inputs ──────────────────────────────────────────────────────────────────

/** Number field that lets you clear / type freely and commits valid numbers. */
function NumberInput({ label, value, onChange, min, max, step = 1, unit = '', title }) {
  const [draft, setDraft] = useState(null)
  const clamp = (n) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  return (
    <div className="prop-field" title={title}>
      <label className="prop-label">{label}</label>
      <div className="prop-input-wrap">
        <input
          type="number"
          className="prop-input"
          value={draft ?? (Number.isFinite(value) ? value : '')}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(n)) onChange(clamp(n))
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />
        {unit && <span className="prop-unit">{unit}</span>}
      </div>
    </div>
  )
}

function RangeInput({ label, value, onChange, min = 0, max = 100, unit = '%' }) {
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <div className="prop-range-wrap">
        <input type="range" className="prop-range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
        <span className="prop-range-val">{value}{unit}</span>
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder, list, mono }) {
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <input
        type="text"
        className={`prop-input ${mono ? 'prop-input--mono' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        list={list}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
function toHex6(v) {
  if (!HEX.test(v || '')) return '#000000'
  if (v.length === 4) return '#' + [...v.slice(1)].map((c) => c + c).join('')
  return v
}

function ColorInput({ label, value, onChange, allowNone = false }) {
  const none = allowNone && (!value || value === 'transparent')
  const [draft, setDraft] = useState(null)
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <div className="prop-color-wrap">
        <input
          type="color"
          className="prop-color-swatch"
          value={toHex6(value)}
          style={none ? { opacity: 0.35 } : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="prop-input prop-input--mono"
          value={draft ?? (none ? 'none' : value)}
          onChange={(e) => {
            const v = e.target.value.trim()
            setDraft(e.target.value)
            if (HEX.test(v)) onChange(v)
            else if (allowNone && (v === '' || v === 'none' || v === 'transparent')) onChange('transparent')
          }}
          onBlur={() => setDraft(null)}
        />
        {allowNone && !none && (
          <button className="prop-mini-btn" title="No background" onClick={() => onChange('transparent')}>✕</button>
        )}
      </div>
    </div>
  )
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <select className="prop-input prop-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="prop-checkbox-label">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  )
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="prop-section-header">
      <Icon size={11} />
      <span>{title}</span>
    </div>
  )
}

function IconToggle({ active, onClick, title, children }) {
  return (
    <button className={`prop-icon-btn ${active ? 'prop-icon-btn--active' : ''}`} title={title} onClick={onClick}>
      {children}
    </button>
  )
}

function FileField({ obj, update, kind }) {
  const exts = kind === 'video' ? VIDEO_EXT : IMAGE_EXT
  async function browse() {
    const result = await window.electronAPI?.openFileDialog(
      [{ name: kind === 'video' ? 'Video Files' : 'Image Files', extensions: exts }],
      kind === 'video' ? 'Select Video File' : 'Select Image File'
    )
    if (result) update({ src: result.url, name: result.name.replace(/\.[^.]+$/, '') }, null)
  }
  const display = obj.src?.startsWith('media:///') ? decodeURIComponent(obj.src.slice(9)) : obj.src || ''
  return (
    <div className="prop-field">
      <label className="prop-label">FILE</label>
      <div className="prop-file-row">
        <input
          type="text"
          className="prop-input prop-input--mono"
          value={display}
          title={display}
          onChange={(e) => {
            const v = e.target.value
            // Accept a pasted local path or any URL
            const src = /^[a-z]:[\\/]/i.test(v) || v.startsWith('/') ? 'media:///' + v.replace(/\\/g, '/') : v
            update({ src })
          }}
          placeholder="Browse or paste a path / URL…"
        />
        <button className="prop-browse-btn" onClick={browse} title="Browse file">
          <FolderOpen size={13} />
        </button>
      </div>
    </div>
  )
}

function TypographyProps({ obj, update, defaultSize = 48, showAlign = true }) {
  return (
    <>
      <TextInput label="FONT" value={obj.fontFamily} onChange={(v) => update({ fontFamily: v })} list="uapic-fonts" />
      <div className="prop-grid-2">
        <NumberInput label="SIZE" value={obj.fontSize ?? defaultSize} onChange={(v) => update({ fontSize: v })} min={4} unit="px" />
        <div className="prop-field">
          <label className="prop-label">STYLE</label>
          <div className="prop-btn-row">
            <IconToggle title="Bold" active={obj.fontWeight === 'bold'}
              onClick={() => update({ fontWeight: obj.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold size={12} /></IconToggle>
            <IconToggle title="Italic" active={obj.fontStyle === 'italic'}
              onClick={() => update({ fontStyle: obj.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic size={12} /></IconToggle>
            {showAlign && (
              <>
                <IconToggle title="Align left" active={obj.textAlign === 'left'} onClick={() => update({ textAlign: 'left' })}><AlignLeft size={12} /></IconToggle>
                <IconToggle title="Align center" active={!obj.textAlign || obj.textAlign === 'center'} onClick={() => update({ textAlign: 'center' })}><AlignCenter size={12} /></IconToggle>
                <IconToggle title="Align right" active={obj.textAlign === 'right'} onClick={() => update({ textAlign: 'right' })}><AlignRight size={12} /></IconToggle>
              </>
            )}
          </div>
        </div>
      </div>
      <ColorInput label="COLOR" value={obj.fontColor || '#ffffff'} onChange={(v) => update({ fontColor: v })} />
      <ColorInput label="BACKGROUND" value={obj.bgColor} onChange={(v) => update({ bgColor: v })} allowNone />
    </>
  )
}

// ─── Object-specific property panels ─────────────────────────────────────────

function VideoProps({ obj, update }) {
  return (
    <>
      <FileField obj={obj} update={update} kind="video" />
      <SelectInput label="FIT" value={obj.objectFit || 'cover'} onChange={(v) => update({ objectFit: v })} options={FIT_OPTIONS} />
      <div className="prop-row">
        <Checkbox label="Loop" checked={obj.loop !== false} onChange={(v) => update({ loop: v })} />
        <Checkbox label="Muted" checked={obj.muted !== false} onChange={(v) => update({ muted: v })} />
        <Checkbox label="Autoplay" checked={obj.autoplay !== false} onChange={(v) => update({ autoplay: v })} />
      </div>
      {obj.muted === false && (
        <RangeInput label="VOLUME" value={Math.round((obj.volume ?? 1) * 100)} onChange={(v) => update({ volume: v / 100 })} />
      )}
    </>
  )
}

function ImageProps({ obj, update }) {
  return (
    <>
      <FileField obj={obj} update={update} kind="image" />
      <SelectInput label="FIT" value={obj.objectFit || 'cover'} onChange={(v) => update({ objectFit: v })} options={FIT_OPTIONS} />
    </>
  )
}

function TextProps({ obj, update }) {
  return (
    <>
      <div className="prop-field">
        <label className="prop-label">CONTENT</label>
        <textarea className="prop-input prop-textarea" value={obj.text || ''} rows={3}
          onChange={(e) => update({ text: e.target.value })} />
      </div>
      <TypographyProps obj={obj} update={update} />
    </>
  )
}

function RunningTextProps({ obj, update }) {
  return (
    <>
      <div className="prop-field">
        <label className="prop-label">CONTENT</label>
        <textarea className="prop-input prop-textarea" value={obj.text || ''} rows={3}
          onChange={(e) => update({ text: e.target.value })} />
      </div>
      <div className="prop-grid-2">
        <NumberInput label="SPEED" value={obj.scrollSpeed ?? 80} onChange={(v) => update({ scrollSpeed: v })} min={5} unit="px/s" />
        <SelectInput label="DIRECTION" value={obj.scrollDirection || 'left'} onChange={(v) => update({ scrollDirection: v })}
          options={[{ value: 'left', label: '← Left' }, { value: 'right', label: 'Right →' }]} />
      </div>
      <TypographyProps obj={obj} update={update} showAlign={false} />
      <div className="prop-hint">Preview shows static text — push to the output to see it scroll.</div>
    </>
  )
}

function HtmlProps({ obj, update }) {
  return (
    <>
      <SelectInput label="SOURCE" value={obj.htmlMode || 'code'} onChange={(v) => update({ htmlMode: v })}
        options={[{ value: 'code', label: 'HTML code' }, { value: 'url', label: 'Web page (URL)' }]} />
      {obj.htmlMode === 'url' ? (
        <TextInput label="URL" value={obj.url} onChange={(v) => update({ url: v })} placeholder="https://…" mono />
      ) : (
        <div className="prop-field">
          <label className="prop-label">HTML</label>
          <textarea className="prop-input prop-textarea prop-textarea--tall prop-input--mono" rows={8}
            value={obj.htmlContent || ''} onChange={(e) => update({ htmlContent: e.target.value })} spellCheck={false} />
        </div>
      )}
    </>
  )
}

function YouTubeProps({ obj, update }) {
  const info = parseYouTube(obj.youtubeUrl)
  const ok = info && info.kind !== 'handle'
  return (
    <>
      <TextInput label="YOUTUBE LINK" value={obj.youtubeUrl || ''} onChange={(v) => update({ youtubeUrl: v.trim() })}
        placeholder="https://youtube.com/watch?v=… or /live/…" mono />
      {obj.youtubeUrl && (
        <div className={`prop-hint ${ok ? '' : 'prop-hint--error'}`}>{describeYouTube(info)}</div>
      )}
      <div className="prop-row">
        <Checkbox label="Muted" checked={obj.muted !== false} onChange={(v) => update({ muted: v }, null)} />
        <Checkbox label="Loop" checked={obj.loop !== false} onChange={(v) => update({ loop: v }, null)} />
      </div>
      {obj.muted === false && (
        <RangeInput label="VOLUME" value={Math.round((obj.volume ?? 1) * 100)} min={0} max={100} unit="%"
          onChange={(v) => update({ volume: v / 100 })} />
      )}
      <div className="prop-row">
        <Checkbox label="Controls" checked={!!obj.youtubeControls} onChange={(v) => update({ youtubeControls: v }, null)} />
        <Checkbox label="Captions" checked={!!obj.youtubeCaptions} onChange={(v) => update({ youtubeCaptions: v }, null)} />
      </div>
      {info?.kind === 'video' && (
        <NumberInput label="START AT" value={obj.youtubeStart || 0} onChange={(v) => update({ youtubeStart: v })} min={0} unit="s" />
      )}
      <div className="prop-hint">
        Works with videos, live streams (/live/…), playlists and a channel's live stream (channel ID UC…).
        Internet required; the editor shows a thumbnail — push to the output to play.
        Some videos block embedding by their owner.
      </div>
    </>
  )
}

function ClockProps({ obj, update }) {
  return (
    <>
      <TextInput label="TIMEZONE" value={obj.timezone} onChange={(v) => update({ timezone: v })} list="uapic-timezones" />
      <SelectInput label="FORMAT" value={obj.clockFormat || '24'} onChange={(v) => update({ clockFormat: v })}
        options={[{ value: '24', label: '24-hour' }, { value: '12', label: '12-hour (AM/PM)' }]} />
      <div className="prop-row">
        <Checkbox label="Seconds" checked={obj.showSeconds !== false} onChange={(v) => update({ showSeconds: v })} />
        <Checkbox label="Date" checked={!!obj.showDate} onChange={(v) => update({ showDate: v })} />
      </div>
      <TypographyProps obj={obj} update={update} defaultSize={96} />
    </>
  )
}

function WeatherProps({ obj, update }) {
  return (
    <>
      <TextInput label="LOCATION" value={obj.weatherLocation} onChange={(v) => update({ weatherLocation: v })}
        placeholder="City name or lat,lon" />
      <div className="prop-grid-2">
        <SelectInput label="UNIT" value={obj.weatherUnit || 'C'} onChange={(v) => update({ weatherUnit: v })}
          options={[{ value: 'C', label: 'Celsius °C' }, { value: 'F', label: 'Fahrenheit °F' }]} />
        <NumberInput label="REFRESH" value={obj.weatherRefresh ?? 15} onChange={(v) => update({ weatherRefresh: v })} min={5} unit="min" />
      </div>
      <TypographyProps obj={obj} update={update} />
      <div className="prop-hint">Live data from Open-Meteo (internet required).</div>
    </>
  )
}

function ColorBlockProps({ obj, update }) {
  return <ColorInput label="COLOR" value={obj.color || '#000000'} onChange={(v) => update({ color: v })} />
}

function PlaylistProps({ obj, update }) {
  const items = obj.playlistItems || []
  const [dragIdx, setDragIdx] = useState(null)

  async function addFromFile() {
    const files = await window.electronAPI?.openFileDialog(
      [{ name: 'Media Files', extensions: [...VIDEO_EXT, ...IMAGE_EXT] }],
      'Add to Playlist',
      true
    )
    if (!files?.length) return
    const added = files
      .map((f) => ({ f, type: mediaTypeFromName(f.name) }))
      .filter((x) => x.type)
      .map(({ f, type }) => ({
        id: `pi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        src: f.url,
        name: f.name,
        type,
        duration: obj.itemDuration || 5,
      }))
    update({ playlistItems: [...items, ...added] }, null)
  }

  const setItems = (arr) => update({ playlistItems: arr }, null)
  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length || from === to) return
    const arr = [...items]
    const [it] = arr.splice(from, 1)
    arr.splice(to, 0, it)
    setItems(arr)
  }

  const totalImages = items.filter((i) => i.type !== 'video').reduce((s, i) => s + (Number(i.duration) || 0), 0)

  return (
    <>
      <div className="prop-grid-2">
        <NumberInput label="IMAGE DURATION" value={obj.itemDuration ?? 5} onChange={(v) => update({ itemDuration: v })} min={1} unit="s"
          title="Default duration for newly added images" />
        <SelectInput label="TRANSITION" value={obj.transition || 'none'} onChange={(v) => update({ transition: v })}
          options={[{ value: 'none', label: 'Cut' }, { value: 'fade', label: 'Fade' }]} />
      </div>
      <SelectInput label="FIT" value={obj.objectFit || 'cover'} onChange={(v) => update({ objectFit: v })} options={FIT_OPTIONS} />
      <div className="prop-row">
        <Checkbox label="Loop" checked={obj.loop !== false} onChange={(v) => update({ loop: v })} />
        <Checkbox label="Muted" checked={obj.muted !== false} onChange={(v) => update({ muted: v })} />
      </div>

      <div className="prop-field">
        <label className="prop-label">
          ITEMS ({items.length}){totalImages > 0 && ` · images ${totalImages}s`}
        </label>
        <div className="playlist-list">
          {items.length === 0 && <div className="playlist-empty">No items. Add files below.</div>}
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`playlist-item ${dragIdx === idx ? 'playlist-item--dragging' : ''}`}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) moveItem(dragIdx, idx); setDragIdx(null) }}
              onDragEnd={() => setDragIdx(null)}
            >
              <span className="playlist-item-num">{idx + 1}</span>
              <span className="playlist-item-type">{item.type === 'video' ? '▶' : '🖼'}</span>
              <span className="playlist-item-name" title={item.name}>{item.name}</span>
              {item.type === 'video' ? (
                <span className="playlist-item-auto" title="Videos play to the end">auto</span>
              ) : (
                <>
                  <input
                    type="number"
                    className="playlist-item-dur"
                    value={item.duration}
                    min={1}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (n > 0) setItems(items.map((i) => (i.id === item.id ? { ...i, duration: n } : i)))
                    }}
                    title="Duration (seconds)"
                  />
                  <span className="playlist-item-unit">s</span>
                </>
              )}
              <button className="media-action-btn" title="Move up" onClick={() => moveItem(idx, idx - 1)}>↑</button>
              <button className="media-action-btn" title="Move down" onClick={() => moveItem(idx, idx + 1)}>↓</button>
              <button className="media-action-btn media-action-btn--danger" title="Remove"
                onClick={() => setItems(items.filter((i) => i.id !== item.id))}>×</button>
            </div>
          ))}
        </div>
        <button className="media-file-btn" style={{ marginTop: 6 }} onClick={addFromFile}>
          + Add Files…
        </button>
      </div>
    </>
  )
}

// ─── Canvas / output settings ────────────────────────────────────────────────

function CanvasProps() {
  const { scene, setCanvasSize, setWindowPosition, setBackgroundColor, setSceneName, updateScene } = useEditorStore()
  const [displays, setDisplays] = useState([])
  const { width, height } = scene.canvasSize

  useEffect(() => {
    const api = window.electronAPI
    const load = () => api?.getDisplays?.().then((d) => d && setDisplays(d))
    load()
    const unsub = api?.onDisplaysChanged?.(load)
    return () => typeof unsub === 'function' && unsub()
  }, [])

  const presetValue = useMemo(() => {
    const p = CANVAS_PRESETS.findIndex((x) => x.width === width && x.height === height)
    return p === -1 ? 'custom' : String(p)
  }, [width, height])

  return (
    <>
      <div className="prop-section">
        <SectionHeader icon={Settings2} title="SCENE" />
        <TextInput label="SCENE NAME" value={scene.name} onChange={setSceneName} />
        <ColorInput label="BACKGROUND" value={scene.backgroundColor} onChange={setBackgroundColor} />
      </div>

      <div className="prop-section">
        <SectionHeader icon={Layers} title="CANVAS RESOLUTION" />
        <SelectInput
          label="PRESET"
          value={presetValue}
          onChange={(v) => { if (v !== 'custom') { const p = CANVAS_PRESETS[Number(v)]; setCanvasSize(p.width, p.height) } }}
          options={[
            ...CANVAS_PRESETS.map((p, i) => ({ value: String(i), label: p.label })),
            { value: 'custom', label: 'Custom…' },
          ]}
        />
        <div className="prop-grid-2">
          <NumberInput label="WIDTH" value={width} onChange={(v) => setCanvasSize(v, height)} min={1} unit="px" />
          <NumberInput label="HEIGHT" value={height} onChange={(v) => setCanvasSize(width, v)} min={1} unit="px" />
        </div>
        <button className="prop-fit-btn" onClick={() => setCanvasSize(height, width)} title="Swap width and height">
          <ArrowLeftRight size={12} /> Swap orientation
        </button>
      </div>

      <div className="prop-section">
        <SectionHeader icon={Monitor} title="OUTPUT WINDOW" />
        <SelectInput
          label="SCALING"
          value={scene.scaleMode || 'none'}
          onChange={(v) => updateScene({ scaleMode: v })}
          options={[
            { value: 'none', label: '1:1 — window sized to canvas' },
            { value: 'fit', label: 'Fit — keep aspect ratio' },
            { value: 'stretch', label: 'Stretch — fill window' },
          ]}
        />
        <div className="prop-grid-2">
          <NumberInput label="POS X" value={scene.windowPosition?.x || 0}
            onChange={(v) => setWindowPosition(v, scene.windowPosition?.y || 0)} unit="px" />
          <NumberInput label="POS Y" value={scene.windowPosition?.y || 0}
            onChange={(v) => setWindowPosition(scene.windowPosition?.x || 0, v)} unit="px" />
        </div>
        {displays.length > 0 && (
          <div className="prop-field">
            <label className="prop-label">PLACE ON DISPLAY</label>
            <div className="prop-display-list">
              {displays.map((d) => (
                <button
                  key={d.id}
                  className="prop-display-btn"
                  title={`Set window position to ${d.bounds.x}, ${d.bounds.y}`}
                  onClick={() => setWindowPosition(d.bounds.x, d.bounds.y)}
                >
                  <Monitor size={12} />
                  <span>{d.index}{d.primary ? '★' : ''}</span>
                  <small>{d.size.width}×{d.size.height}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="prop-row">
          <Checkbox label="Hide mouse cursor on output" checked={!!scene.hideCursor} onChange={(v) => updateScene({ hideCursor: v })} />
        </div>
        <div className="prop-hint">Position &amp; size are applied when you PUSH the scene.</div>
      </div>
    </>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PropertiesInspector() {
  const { scene, selectedObjectId, updateMediaObject, alignObject, duplicateMediaObject, removeMediaObject } = useEditorStore()
  const obj = scene.mediaObjects.find((o) => o.id === selectedObjectId) || null

  // key: undefined → coalesce per field (typing), null → separate undo step
  function update(changes, key) {
    if (obj) updateMediaObject(obj.id, changes, key === null ? { key: null } : {})
  }

  function renderTypeProps() {
    switch (obj.type) {
      case 'video':        return <VideoProps obj={obj} update={update} />
      case 'image':        return <ImageProps obj={obj} update={update} />
      case 'text':         return <TextProps obj={obj} update={update} />
      case 'html':         return <HtmlProps obj={obj} update={update} />
      case 'youtube':      return <YouTubeProps obj={obj} update={update} />
      case 'clock':        return <ClockProps obj={obj} update={update} />
      case 'weather':      return <WeatherProps obj={obj} update={update} />
      case 'running-text': return <RunningTextProps obj={obj} update={update} />
      case 'color':        return <ColorBlockProps obj={obj} update={update} />
      case 'playlist':     return <PlaylistProps obj={obj} update={update} />
      default:             return null
    }
  }

  const meta = obj ? TYPE_META[obj.type] : null

  return (
    <div className="panel panel--right">
      <div className="panel-header">
        <Settings2 size={13} />
        <span>{obj ? 'PROPERTIES' : 'CANVAS / OUTPUT'}</span>
      </div>

      <datalist id="uapic-fonts">{FONTS.map((f) => <option key={f} value={f} />)}</datalist>
      <datalist id="uapic-timezones">{TIMEZONES.map((t) => <option key={t} value={t} />)}</datalist>

      <div className="panel-scroll">
        {obj ? (
          <>
            <div className="prop-section">
              <div className="prop-type-badge" style={{ '--accent': meta?.color || '#666' }}>
                {meta?.label || obj.type}
              </div>
              <TextInput label="NAME" value={obj.name} onChange={(v) => update({ name: v })} />
            </div>

            <div className="prop-section">
              <SectionHeader icon={Layers} title="TRANSFORM" />
              <div className="prop-grid-2">
                <NumberInput label="X" value={obj.x} onChange={(v) => update({ x: Math.round(v) })} unit="px" />
                <NumberInput label="Y" value={obj.y} onChange={(v) => update({ y: Math.round(v) })} unit="px" />
                <NumberInput label="W" value={obj.width} onChange={(v) => update({ width: Math.round(v) })} min={1} unit="px" />
                <NumberInput label="H" value={obj.height} onChange={(v) => update({ height: Math.round(v) })} min={1} unit="px" />
              </div>
              <div className="prop-field">
                <label className="prop-label">ALIGN TO CANVAS</label>
                <div className="prop-btn-row">
                  <button className="prop-icon-btn" title="Align left" onClick={() => alignObject(obj.id, 'left')}><AlignStartVertical size={13} /></button>
                  <button className="prop-icon-btn" title="Center horizontally" onClick={() => alignObject(obj.id, 'hcenter')}><AlignCenterVertical size={13} /></button>
                  <button className="prop-icon-btn" title="Align right" onClick={() => alignObject(obj.id, 'right')}><AlignEndVertical size={13} /></button>
                  <button className="prop-icon-btn" title="Align top" onClick={() => alignObject(obj.id, 'top')}><AlignStartHorizontal size={13} /></button>
                  <button className="prop-icon-btn" title="Center vertically" onClick={() => alignObject(obj.id, 'vcenter')}><AlignCenterHorizontal size={13} /></button>
                  <button className="prop-icon-btn" title="Align bottom" onClick={() => alignObject(obj.id, 'bottom')}><AlignEndHorizontal size={13} /></button>
                  <button className="prop-icon-btn" title="Fill entire canvas" onClick={() => alignObject(obj.id, 'fill')}><Maximize size={13} /></button>
                </div>
              </div>
              <RangeInput label="OPACITY" value={Math.round((obj.opacity ?? 1) * 100)} onChange={(v) => update({ opacity: v / 100 })} />
              <div className="prop-row">
                <Checkbox label="Visible" checked={obj.visible !== false} onChange={(v) => update({ visible: v }, null)} />
                <Checkbox label="Locked" checked={!!obj.locked} onChange={(v) => update({ locked: v }, null)} />
              </div>
            </div>

            <div className="prop-section">
              <SectionHeader icon={Settings2} title={(meta?.label || obj.type).toUpperCase()} />
              {renderTypeProps()}
            </div>

            <div className="prop-section prop-actions">
              <button className="prop-fit-btn" onClick={() => duplicateMediaObject(obj.id)}><Copy size={12} /> Duplicate</button>
              <button className="prop-fit-btn prop-fit-btn--danger" onClick={() => removeMediaObject(obj.id)}><Trash2 size={12} /> Delete</button>
            </div>
          </>
        ) : (
          <CanvasProps />
        )}
      </div>
    </div>
  )
}
