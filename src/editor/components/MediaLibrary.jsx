import React, { useMemo, useState } from 'react'
import useEditorStore from '../../store/useEditorStore'
import {
  Video, Image as ImageIcon, Type, Code2,
  Clock, Cloud, AlignLeft, Square, Layers,
  Trash2, Copy, ChevronUp, ChevronDown, Eye, EyeOff, ListVideo,
  Lock, Unlock, FolderOpen,
} from 'lucide-react'
import { importMedia } from '../projectActions'

export const TYPE_META = {
  video:          { label: 'Video',        icon: Video,      color: '#1e90ff' },
  image:          { label: 'Image',        icon: ImageIcon,  color: '#22c55e' },
  text:           { label: 'Text',         icon: Type,       color: '#f59e0b' },
  'running-text': { label: 'Running Text', icon: AlignLeft,  color: '#f97316' },
  playlist:       { label: 'Playlist',     icon: ListVideo,  color: '#8b5cf6' },
  html:           { label: 'HTML / Web',   icon: Code2,      color: '#a855f7' },
  clock:          { label: 'Clock',        icon: Clock,      color: '#06b6d4' },
  weather:        { label: 'Weather',      icon: Cloud,      color: '#38bdf8' },
  color:          { label: 'Color Block',  icon: Square,     color: '#ec4899' },
}

function ObjectName({ obj, onRename }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(obj.name)

  if (editing) {
    const finish = (commit) => {
      setEditing(false)
      if (commit && value.trim() && value !== obj.name) onRename(value.trim())
    }
    return (
      <input
        className="media-item-rename"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(true)
          if (e.key === 'Escape') finish(false)
          e.stopPropagation()
        }}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }
  return (
    <span
      className="media-item-name"
      title={`${obj.name} — double-click to rename`}
      onDoubleClick={(e) => { e.stopPropagation(); setValue(obj.name); setEditing(true) }}
    >
      {obj.name}
    </span>
  )
}

export default function MediaLibrary() {
  const {
    scene, selectedObjectId, addMediaObject, removeMediaObject, duplicateMediaObject,
    moveObjectLayer, reorderObject, selectObject, updateMediaObject,
  } = useEditorStore()

  // Top-most layer first
  const objects = useMemo(
    () => [...scene.mediaObjects].sort((a, b) => b.zIndex - a.zIndex),
    [scene.mediaObjects]
  )

  const [dragId, setDragId] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)

  const act = (fn) => (e) => { e.stopPropagation(); fn() }

  return (
    <div className="panel panel--left">
      <div className="panel-header">
        <Layers size={13} />
        <span>ADD MEDIA</span>
      </div>

      <div className="media-add-grid">
        {Object.entries(TYPE_META).map(([type, meta]) => {
          const Icon = meta.icon
          return (
            <button
              key={type}
              className="media-add-btn"
              style={{ '--accent': meta.color }}
              onClick={() => addMediaObject(type)}
              title={`Add ${meta.label}`}
            >
              <Icon size={13} />
              <span>{meta.label}</span>
            </button>
          )
        })}
        <button className="media-add-btn media-add-btn--wide" onClick={importMedia} title="Import video / image files (Ctrl+I) — or drag files onto the canvas">
          <FolderOpen size={13} />
          <span>Import Files…</span>
        </button>
      </div>

      <div className="panel-divider" />

      <div className="panel-header panel-header--sub">
        <span>LAYERS</span>
        <span className="panel-header-count">{objects.length}</span>
      </div>

      <div className="media-list" onClick={() => selectObject(null)}>
        {objects.length === 0 && (
          <div className="media-empty">
            No objects yet.<br />Add one above or drop files on the canvas.
          </div>
        )}
        {objects.map((obj, index) => {
          const meta = TYPE_META[obj.type] || { label: obj.type, icon: Square, color: '#666' }
          const Icon = meta.icon
          const isSelected = selectedObjectId === obj.id
          const hidden = obj.visible === false

          return (
            <div
              key={obj.id}
              draggable
              onDragStart={(e) => { setDragId(obj.id); e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => {
                if (!dragId) return
                e.preventDefault()
                const rect = e.currentTarget.getBoundingClientRect()
                setDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId && dropIndex != null) {
                  const from = objects.findIndex((o) => o.id === dragId)
                  const to = dropIndex > from ? dropIndex - 1 : dropIndex
                  reorderObject(dragId, to)
                }
                setDragId(null); setDropIndex(null)
              }}
              onDragEnd={() => { setDragId(null); setDropIndex(null) }}
              className={[
                'media-item',
                isSelected && 'media-item--selected',
                hidden && 'media-item--hidden',
                dragId === obj.id && 'media-item--dragging',
                dragId && dropIndex === index && 'media-item--drop-before',
                dragId && dropIndex === index + 1 && index === objects.length - 1 && 'media-item--drop-after',
              ].filter(Boolean).join(' ')}
              onClick={(e) => { e.stopPropagation(); selectObject(obj.id) }}
            >
              <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
              <ObjectName obj={obj} onRename={(name) => updateMediaObject(obj.id, { name })} />

              {obj.locked && <Lock size={10} className="media-item-badge" />}

              <div className="media-item-actions">
                <button className="media-action-btn" title={hidden ? 'Show' : 'Hide'}
                  onClick={act(() => updateMediaObject(obj.id, { visible: hidden }))}>
                  {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
                <button className="media-action-btn" title={obj.locked ? 'Unlock' : 'Lock position'}
                  onClick={act(() => updateMediaObject(obj.id, { locked: !obj.locked }))}>
                  {obj.locked ? <Unlock size={11} /> : <Lock size={11} />}
                </button>
                <button className="media-action-btn" title="Bring forward" onClick={act(() => moveObjectLayer(obj.id, 'up'))}>
                  <ChevronUp size={11} />
                </button>
                <button className="media-action-btn" title="Send backward" onClick={act(() => moveObjectLayer(obj.id, 'down'))}>
                  <ChevronDown size={11} />
                </button>
                <button className="media-action-btn" title="Duplicate (Ctrl+D)" onClick={act(() => duplicateMediaObject(obj.id))}>
                  <Copy size={11} />
                </button>
                <button className="media-action-btn media-action-btn--danger" title="Delete (Del)" onClick={act(() => removeMediaObject(obj.id))}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
