import React from 'react'
import useEditorStore from '../../store/useEditorStore'
import { Settings2, Layers } from 'lucide-react'

function NumberInput({ label, value, onChange, min, max, step = 1, unit = '' }) {
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <div className="prop-input-wrap">
        <input
          type="number"
          className="prop-input"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span className="prop-unit">{unit}</span>}
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange }) {
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <input
        type="text"
        className="prop-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <div className="prop-color-wrap">
        <input
          type="color"
          className="prop-color-swatch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="prop-input prop-input--mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div className="prop-field">
      <label className="prop-label">{label}</label>
      <select
        className="prop-input prop-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
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

// ─── Object-specific property panels ─────────────────────────────────────────

function VideoProps({ obj, update }) {
  async function browse() {
    const result = await window.electronAPI?.openFileDialog(
      [{ name: 'Video Files', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'] }],
      'Select Video File'
    )
    if (result) update({ src: result.url, name: result.name })
  }

  return (
    <>
      <div className="prop-field">
        <label className="prop-label">FILE</label>
        <div className="prop-file-row">
          <input
            type="text"
            className="prop-input prop-input--mono"
            value={obj.src || ''}
            onChange={(e) => update({ src: e.target.value })}
            placeholder="path or URL…"
          />
          <button className="prop-browse-btn" onClick={browse} title="Browse file">
            📂
          </button>
        </div>
      </div>
      <SelectInput label="FIT" value={obj.objectFit || 'cover'} onChange={(v) => update({ objectFit: v })}
        options={[
          { value: 'cover',   label: 'Cover' },
          { value: 'contain', label: 'Contain' },
          { value: 'fill',    label: 'Fill' },
        ]}
      />
      <div className="prop-row">
        <label className="prop-checkbox-label">
          <input type="checkbox" checked={!!obj.loop}     onChange={(e) => update({ loop:     e.target.checked })} /> Loop
        </label>
        <label className="prop-checkbox-label">
          <input type="checkbox" checked={!!obj.muted}    onChange={(e) => update({ muted:    e.target.checked })} /> Muted
        </label>
        <label className="prop-checkbox-label">
          <input type="checkbox" checked={!!obj.autoplay} onChange={(e) => update({ autoplay: e.target.checked })} /> Auto
        </label>
      </div>
    </>
  )
}

function ImageProps({ obj, update }) {
  async function browse() {
    const result = await window.electronAPI?.openFileDialog(
      [{ name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }],
      'Select Image File'
    )
    if (result) update({ src: result.url, name: result.name })
  }

  return (
    <>
      <div className="prop-field">
        <label className="prop-label">FILE</label>
        <div className="prop-file-row">
          <input
            type="text"
            className="prop-input prop-input--mono"
            value={obj.src || ''}
            onChange={(e) => update({ src: e.target.value })}
            placeholder="path or URL…"
          />
          <button className="prop-browse-btn" onClick={browse} title="Browse file">
            📂
          </button>
        </div>
      </div>
      <SelectInput label="FIT" value={obj.objectFit || 'cover'} onChange={(v) => update({ objectFit: v })}
        options={[
          { value: 'cover',   label: 'Cover' },
          { value: 'contain', label: 'Contain' },
          { value: 'fill',    label: 'Fill' },
        ]}
      />
    </>
  )
}

function TextProps({ obj, update }) {
  return (
    <>
      <div className="prop-field">
        <label className="prop-label">CONTENT</label>
        <textarea
          className="prop-input prop-textarea"
          value={obj.text || ''}
          onChange={(e) => update({ text: e.target.value })}
          rows={3}
        />
      </div>
      <NumberInput label="SIZE" value={obj.fontSize || 48} onChange={(v) => update({ fontSize: v })} unit="px" />
      <ColorInput  label="COLOR" value={obj.fontColor || '#ffffff'} onChange={(v) => update({ fontColor: v })} />
      <TextInput   label="FONT" value={obj.fontFamily || 'Inter, sans-serif'} onChange={(v) => update({ fontFamily: v })} />
    </>
  )
}

function RunningTextProps({ obj, update }) {
  return (
    <>
      <TextProps obj={obj} update={update} />
      <NumberInput label="SPEED" value={obj.scrollSpeed || 80} onChange={(v) => update({ scrollSpeed: v })} unit="px/s" />
      <SelectInput label="DIR" value={obj.scrollDirection || 'left'} onChange={(v) => update({ scrollDirection: v })}
        options={[
          { value: 'left',  label: 'Left ←' },
          { value: 'right', label: 'Right →' },
        ]}
      />
    </>
  )
}

function HtmlProps({ obj, update }) {
  return (
    <div className="prop-field">
      <label className="prop-label">HTML</label>
      <textarea
        className="prop-input prop-textarea prop-textarea--tall"
        value={obj.htmlContent || ''}
        onChange={(e) => update({ htmlContent: e.target.value })}
        rows={6}
      />
    </div>
  )
}

function ClockProps({ obj, update }) {
  return (
    <>
      <TextInput label="TIMEZONE" value={obj.timezone || 'Asia/Jakarta'} onChange={(v) => update({ timezone: v })} />
      <SelectInput label="FORMAT" value={obj.clockFormat || '24'} onChange={(v) => update({ clockFormat: v })}
        options={[
          { value: '24', label: '24-hour' },
          { value: '12', label: '12-hour' },
        ]}
      />
      <NumberInput label="SIZE" value={obj.fontSize || 96} onChange={(v) => update({ fontSize: v })} unit="px" />
      <ColorInput  label="COLOR" value={obj.fontColor || '#ffffff'} onChange={(v) => update({ fontColor: v })} />
    </>
  )
}

function WeatherProps({ obj, update }) {
  return (
    <>
      <TextInput label="LOCATION" value={obj.weatherLocation || 'Jakarta'} onChange={(v) => update({ weatherLocation: v })} />
      <SelectInput label="UNIT" value={obj.weatherUnit || 'C'} onChange={(v) => update({ weatherUnit: v })}
        options={[
          { value: 'C', label: 'Celsius °C' },
          { value: 'F', label: 'Fahrenheit °F' },
        ]}
      />
    </>
  )
}

function ColorBlockProps({ obj, update }) {
  return (
    <ColorInput label="COLOR" value={obj.color || '#000000'} onChange={(v) => update({ color: v })} />
  )
}

function PlaylistProps({ obj, update }) {
  const items = obj.playlistItems || []

  async function addFromFile() {
    const result = await window.electronAPI?.openFileDialog(
      [{ name: 'Media Files', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
      'Add to Playlist'
    )
    if (!result) return
    const ext = result.name.split('.').pop().toLowerCase()
    const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(ext)
    const newItem = {
      id: `pi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: result.url,
      name: result.name,
      type: isVideo ? 'video' : 'image',
      duration: obj.itemDuration || 5,
    }
    update({ playlistItems: [...items, newItem] })
  }

  function removeItem(id) {
    update({ playlistItems: items.filter((i) => i.id !== id) })
  }

  function updateItemDuration(id, duration) {
    update({ playlistItems: items.map((i) => i.id === id ? { ...i, duration } : i) })
  }

  function moveItem(index, dir) {
    const arr = [...items]
    const target = index + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[index], arr[target]] = [arr[target], arr[index]]
    update({ playlistItems: arr })
  }

  return (
    <>
      <NumberInput label="DEFAULT DURATION" value={obj.itemDuration || 5} onChange={(v) => update({ itemDuration: v })} min={1} unit="s" />
      <SelectInput label="FIT" value={obj.objectFit || 'cover'} onChange={(v) => update({ objectFit: v })}
        options={[
          { value: 'cover',   label: 'Cover' },
          { value: 'contain', label: 'Contain' },
          { value: 'fill',    label: 'Fill' },
        ]}
      />
      <div className="prop-row">
        <label className="prop-checkbox-label">
          <input type="checkbox" checked={obj.loop !== false} onChange={(e) => update({ loop: e.target.checked })} /> Loop
        </label>
      </div>

      <div className="prop-field">
        <label className="prop-label">ITEMS ({items.length})</label>

        <div className="playlist-list">
          {items.length === 0 && (
            <div className="playlist-empty">No items. Add below.</div>
          )}
          {items.map((item, idx) => (
            <div key={item.id} className="playlist-item">
              <span className="playlist-item-num">{idx + 1}</span>
              <span className="playlist-item-type">{item.type === 'video' ? '▶' : '🖼'}</span>
              <span className="playlist-item-name" title={item.name}>{item.name}</span>
              <input
                type="number"
                className="playlist-item-dur"
                value={item.duration}
                min={1}
                onChange={(e) => updateItemDuration(item.id, Number(e.target.value))}
                title="Duration (seconds)"
              />
              <span className="playlist-item-unit">s</span>
              <button className="media-action-btn" title="Move up" onClick={() => moveItem(idx, -1)}>↑</button>
              <button className="media-action-btn" title="Move down" onClick={() => moveItem(idx, 1)}>↓</button>
              <button className="media-action-btn media-action-btn--danger" title="Remove" onClick={() => removeItem(item.id)}>×</button>
            </div>
          ))}
        </div>

        <button className="media-file-btn" style={{ marginTop: 6 }} onClick={addFromFile}>
          + Add from File…
        </button>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PropertiesInspector() {
  const {
    scene,
    selectedObjectId,
    getSelectedObject,
    updateMediaObject,
    setCanvasSize,
    setWindowPosition,
    setBackgroundColor,
    setSceneName,
  } = useEditorStore()

  const obj = getSelectedObject()

  function update(changes) {
    if (obj) updateMediaObject(obj.id, changes)
  }

  function renderTypeProps() {
    if (!obj) return null
    switch (obj.type) {
      case 'video':        return <VideoProps obj={obj} update={update} />
      case 'image':        return <ImageProps obj={obj} update={update} />
      case 'text':         return <TextProps  obj={obj} update={update} />
      case 'html':         return <HtmlProps  obj={obj} update={update} />
      case 'clock':        return <ClockProps obj={obj} update={update} />
      case 'weather':      return <WeatherProps obj={obj} update={update} />
      case 'running-text': return <RunningTextProps obj={obj} update={update} />
      case 'color':        return <ColorBlockProps  obj={obj} update={update} />
      case 'playlist':     return <PlaylistProps    obj={obj} update={update} />
      default:             return null
    }
  }

  return (
    <div className="panel panel--right">
      <div className="panel-header">
        <Settings2 size={13} />
        <span>PROPERTIES</span>
      </div>

      <div className="panel-scroll">
        {obj ? (
          <>
            {/* Name */}
            <div className="prop-section">
              <TextInput label="NAME" value={obj.name} onChange={(v) => update({ name: v })} />
            </div>

            {/* Transform */}
            <div className="prop-section">
              <SectionHeader icon={Layers} title="TRANSFORM" />
              <div className="prop-grid-2">
                <NumberInput label="X" value={obj.x} onChange={(v) => update({ x: v })} unit="px" />
                <NumberInput label="Y" value={obj.y} onChange={(v) => update({ y: v })} unit="px" />
                <NumberInput label="W" value={obj.width}  onChange={(v) => update({ width:  v })} min={1} unit="px" />
                <NumberInput label="H" value={obj.height} onChange={(v) => update({ height: v })} min={1} unit="px" />
              </div>
              <button
                className="prop-fit-btn"
                title="Set to full canvas size"
                onClick={() => update({
                  x: 0, y: 0,
                  width: scene.canvasSize.width,
                  height: scene.canvasSize.height,
                })}
              >
                ⛶ Fit to Full Canvas
              </button>
              <NumberInput label="OPACITY" value={Math.round(obj.opacity * 100)} onChange={(v) => update({ opacity: v / 100 })} min={0} max={100} unit="%" />
              <NumberInput label="LAYER"   value={obj.zIndex} onChange={(v) => update({ zIndex: v })} min={0} />
            </div>


            {/* Type-specific */}
            <div className="prop-section">
              <SectionHeader icon={Settings2} title={obj.type.toUpperCase()} />
              {renderTypeProps()}
            </div>
          </>
        ) : (
          /* Canvas settings when nothing selected */
          <div className="prop-section">
            <SectionHeader icon={Settings2} title="CANVAS / OUTPUT" />
            <TextInput label="SCENE NAME" value={scene.name} onChange={setSceneName} />
            <div className="prop-grid-2">
              <NumberInput label="WIDTH"  value={scene.canvasSize.width}  onChange={(v) => setCanvasSize(v, scene.canvasSize.height)} min={1} unit="px" />
              <NumberInput label="HEIGHT" value={scene.canvasSize.height} onChange={(v) => setCanvasSize(scene.canvasSize.width, v)}   min={1} unit="px" />
              <NumberInput label="WIN X"  value={scene.windowPosition?.x || 0} onChange={(v) => setWindowPosition(v, scene.windowPosition?.y || 0)} unit="px" />
              <NumberInput label="WIN Y"  value={scene.windowPosition?.y || 0} onChange={(v) => setWindowPosition(scene.windowPosition?.x || 0, v)} unit="px" />
            </div>
            <ColorInput label="BACKGROUND" value={scene.backgroundColor} onChange={setBackgroundColor} />
          </div>
        )}
      </div>
    </div>
  )
}
