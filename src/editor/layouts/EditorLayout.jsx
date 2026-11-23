import React, { useEffect, useState } from 'react'
import EditorTitlebar from '../components/Titlebar'
import EditorToolbar from '../components/EditorToolbar'
import MediaLibrary from '../components/MediaLibrary'
import EditorCanvas from '../components/EditorCanvas'
import PropertiesInspector from '../components/PropertiesInspector'
import useEditorStore from '../../store/useEditorStore'
import { X } from 'lucide-react'
import uapicLogo from '../../assets/uapic-logo.png'

const SHORTCUTS = [
  ['File', [
    ['Ctrl+N', 'New project'], ['Ctrl+O', 'Open project'], ['Ctrl+S', 'Save'],
    ['Ctrl+Shift+S', 'Save as'], ['Ctrl+I', 'Import media files'],
  ]],
  ['Edit', [
    ['Ctrl+Z', 'Undo'], ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'], ['Ctrl+C / X / V', 'Copy / cut / paste'],
    ['Ctrl+D', 'Duplicate'], ['Delete', 'Delete object'], ['Arrows', 'Nudge 1px (Shift: 10px)'],
    ['Ctrl+] / Ctrl+[', 'Bring forward / send backward'], ['Esc', 'Deselect'],
  ]],
  ['Canvas', [
    ['Drag', 'Move (Shift: lock axis)'], ['Corner drag + Shift', 'Resize keeping ratio'],
    ['Alt while dragging', 'Disable snapping'], ['Ctrl+Wheel', 'Zoom'],
    ['Ctrl+0', 'Fit to window'], ['Ctrl+1', 'Actual size'],
  ]],
  ['Output', [
    ['F5', 'Push scene to output'], ['F11 (output window)', 'Toggle fullscreen'],
    ['Esc (output window)', 'Exit fullscreen'], ['F11 (editor)', 'Editor fullscreen'],
  ]],
]

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="titlebar-btn" onClick={onClose}><X size={13} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function Toast() {
  const toast = useEditorStore((s) => s.toast)
  if (!toast) return null
  return <div key={toast.id} className={`toast toast--${toast.kind}`}>{toast.message}</div>
}

export default function EditorLayout() {
  const [modal, setModal] = useState(null)

  return (
    <div className="editor-root">
      <EditorTitlebar onShowShortcuts={() => setModal('shortcuts')} onShowAbout={() => setModal('about')} />

      <div className="editor-body">
        <MediaLibrary />
        <div className="editor-center">
          <EditorToolbar />
          <EditorCanvas />
        </div>
        <PropertiesInspector />
      </div>

      <Toast />

      {modal === 'shortcuts' && (
        <Modal title="Keyboard Shortcuts" onClose={() => setModal(null)}>
          <div className="shortcut-grid">
            {SHORTCUTS.map(([group, rows]) => (
              <div key={group} className="shortcut-group">
                <div className="shortcut-group-title">{group}</div>
                {rows.map(([keys, desc]) => (
                  <div key={keys} className="shortcut-row">
                    <kbd>{keys}</kbd>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'about' && (
        <Modal title="About" onClose={() => setModal(null)}>
          <div className="about">
            <img src={uapicLogo} alt="UAPIC" className="about-logo" draggable={false} />
            <div className="about-name">UAPIC LED Player</div>
            <div className="about-desc">
              Dual-window digital signage editor and player for LED screens, videotrons and kiosks.
            </div>
            <div className="about-meta">Projects are saved as <code>.ulp</code> files.</div>
          </div>
        </Modal>
      )}
    </div>
  )
}
