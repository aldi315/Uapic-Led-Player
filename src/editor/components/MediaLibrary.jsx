import React from 'react'
import useEditorStore from '../../store/useEditorStore'
import {
  Video, Image as ImageIcon, Type, Code2,
  Clock, Cloud, AlignLeft, Square, Layers,
  Trash2, Copy, ChevronUp, ChevronDown, Eye, EyeOff, ListVideo,
} from 'lucide-react'

const TYPE_META = {
  video:          { label: 'Video',        icon: Video,      color: '#1e90ff' },
  image:          { label: 'Image',        icon: ImageIcon,  color: '#22c55e' },
  text:           { label: 'Text',         icon: Type,       color: '#f59e0b' },
  html:           { label: 'HTML',         icon: Code2,      color: '#a855f7' },
  clock:          { label: 'Clock',        icon: Clock,      color: '#06b6d4' },
  weather:        { label: 'Weather',      icon: Cloud,      color: '#38bdf8' },
  'running-text': { label: 'Running Text', icon: AlignLeft,  color: '#f97316' },
  color:          { label: 'Color Block',  icon: Square,     color: '#ec4899' },
  playlist:       { label: 'Playlist',     icon: ListVideo,  color: '#8b5cf6' },
}

export default function MediaLibrary() {
  const {
    scene,
    selectedObjectId,
    addMediaObject,
    removeMediaObject,
    duplicateMediaObject,
    moveObjectLayer,
    selectObject,
    updateMediaObject,
  } = useEditorStore()

  const objects = scene.mediaObjects

  return (
    <div className="panel panel--left">
      {/* Header */}
      <div className="panel-header">
        <Layers size={13} />
        <span>MEDIA OBJECTS</span>
      </div>

      {/* Add buttons */}
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
      </div>

      <div className="panel-divider" />

      {/* Object list */}
      <div className="media-list">
        {objects.length === 0 && (
          <div className="media-empty">No objects. Add one above.</div>
        )}
        {[...objects].reverse().map((obj) => {
          const meta = TYPE_META[obj.type] || { label: obj.type, icon: Square, color: '#666' }
          const Icon = meta.icon
          const isSelected = selectedObjectId === obj.id

          return (
            <div
              key={obj.id}
              className={`media-item ${isSelected ? 'media-item--selected' : ''}`}
              onClick={() => selectObject(obj.id)}
            >
              <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
              <span className="media-item-name" title={obj.name}>{obj.name}</span>

              <div className="media-item-actions">
                <button
                  className="media-action-btn"
                  title={obj.visible === false ? 'Show' : 'Hide'}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateMediaObject(obj.id, { visible: obj.visible === false ? true : false })
                  }}
                >
                  {obj.visible === false ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
                <button
                  className="media-action-btn"
                  title="Move up"
                  onClick={(e) => { e.stopPropagation(); moveObjectLayer(obj.id, 'up') }}
                >
                  <ChevronUp size={11} />
                </button>
                <button
                  className="media-action-btn"
                  title="Move down"
                  onClick={(e) => { e.stopPropagation(); moveObjectLayer(obj.id, 'down') }}
                >
                  <ChevronDown size={11} />
                </button>
                <button
                  className="media-action-btn"
                  title="Duplicate"
                  onClick={(e) => { e.stopPropagation(); duplicateMediaObject(obj.id) }}
                >
                  <Copy size={11} />
                </button>
                <button
                  className="media-action-btn media-action-btn--danger"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); removeMediaObject(obj.id) }}
                >
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
