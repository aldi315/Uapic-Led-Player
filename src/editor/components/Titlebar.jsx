import React, { useState, useEffect } from 'react'
import useEditorStore from '../../store/useEditorStore'
import { Minus, Maximize2, Minimize2, X, Check } from 'lucide-react'
import uapicLogo from '../../assets/uapic-logo.png'
import {
  newProject, openProject, saveProject, importMedia, pushScene,
} from '../projectActions'

const api = () => window.electronAPI

/** A single dropdown menu in the title bar. */
function Menu({ label, items, openMenu, setOpenMenu, onOpen }) {
  const isOpen = openMenu === label
  return (
    <div className="titlebar-menu-wrapper titlebar-no-drag">
      <button
        className={`titlebar-menu-btn ${isOpen ? 'titlebar-menu-btn--open' : ''}`}
        onMouseDown={(e) => {
          e.stopPropagation()
          if (!isOpen) onOpen?.()
          setOpenMenu(isOpen ? null : label)
        }}
        onMouseEnter={() => {
          if (openMenu && !isOpen) { onOpen?.(); setOpenMenu(label) }
        }}
      >
        {label}
      </button>
      {isOpen && (
        <div className="titlebar-dropdown" onMouseDown={(e) => e.stopPropagation()}>
          {items.filter(Boolean).map((item, i) => {
            if (item.sep) return <div key={`sep-${i}`} className="titlebar-dropdown-sep" />
            if (item.header) return <div key={`h-${i}`} className="titlebar-dropdown-header">{item.header}</div>
            return (
              <button
                key={`${item.label}-${i}`}
                className="titlebar-dropdown-item"
                disabled={item.disabled}
                title={item.title}
                onClick={() => { setOpenMenu(null); item.onClick?.() }}
              >
                <span className="titlebar-dropdown-check">{item.checked ? <Check size={11} /> : null}</span>
                <span className="titlebar-dropdown-label">{item.label}</span>
                {item.shortcut && <span className="titlebar-dropdown-shortcut">{item.shortcut}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fileName(p) {
  return p.split(/[\\/]/).pop()
}

export default function Titlebar({ onShowShortcuts, onShowAbout, onShowStartup }) {
  const s = useEditorStore()
  const [openMenu, setOpenMenu] = useState(null)
  const [maximized, setMaximized] = useState(false)
  const [displays, setDisplays] = useState([])

  useEffect(() => {
    const close = () => setOpenMenu(null)
    document.addEventListener('mousedown', close)
    window.addEventListener('blur', close)
    const unsub = api()?.onWindowState?.((st) => setMaximized(!!st.maximized))
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('blur', close)
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  const loadDisplays = async () => {
    const list = await api()?.getDisplays?.()
    if (list) setDisplays(list)
  }

  const sel = s.selectedObjectId
  const ps = s.playerStatus

  const fileItems = [
    { label: 'New Project', shortcut: 'Ctrl+N', onClick: newProject },
    { label: 'Open Project…', shortcut: 'Ctrl+O', onClick: () => openProject() },
    s.recentFiles.length > 0 && { sep: true },
    s.recentFiles.length > 0 && { header: 'RECENT' },
    ...s.recentFiles.map((p) => ({ label: fileName(p), title: p, onClick: () => openProject(p) })),
    s.recentFiles.length > 0 && { label: 'Clear Recent', onClick: s.clearRecentFiles },
    { sep: true },
    { label: 'Save', shortcut: 'Ctrl+S', onClick: () => saveProject(false) },
    { label: 'Save As…', shortcut: 'Ctrl+Shift+S', onClick: () => saveProject(true) },
    { sep: true },
    { label: 'Import Media…', shortcut: 'Ctrl+I', onClick: importMedia },
    { sep: true },
    { label: 'Exit', shortcut: 'Alt+F4', onClick: () => api()?.controlClose() },
  ]

  const editItems = [
    { label: 'Undo', shortcut: 'Ctrl+Z', onClick: s.undo, disabled: !s.past.length },
    { label: 'Redo', shortcut: 'Ctrl+Y', onClick: s.redo, disabled: !s.future.length },
    { sep: true },
    { label: 'Cut', shortcut: 'Ctrl+X', disabled: !sel, onClick: () => { s.copyObject(sel); s.removeMediaObject(sel) } },
    { label: 'Copy', shortcut: 'Ctrl+C', disabled: !sel, onClick: () => s.copyObject(sel) },
    { label: 'Paste', shortcut: 'Ctrl+V', disabled: !s.clipboard, onClick: () => s.pasteObject() },
    { label: 'Duplicate', shortcut: 'Ctrl+D', disabled: !sel, onClick: () => s.duplicateMediaObject(sel) },
    { label: 'Delete', shortcut: 'Del', disabled: !sel, onClick: () => s.removeMediaObject(sel) },
    { sep: true },
    { label: 'Bring to Front', shortcut: 'Ctrl+Shift+]', disabled: !sel, onClick: () => s.moveObjectLayer(sel, 'top') },
    { label: 'Bring Forward', shortcut: 'Ctrl+]', disabled: !sel, onClick: () => s.moveObjectLayer(sel, 'up') },
    { label: 'Send Backward', shortcut: 'Ctrl+[', disabled: !sel, onClick: () => s.moveObjectLayer(sel, 'down') },
    { label: 'Send to Back', shortcut: 'Ctrl+Shift+[', disabled: !sel, onClick: () => s.moveObjectLayer(sel, 'bottom') },
  ]

  const viewItems = [
    { label: 'Zoom In', shortcut: 'Ctrl++', onClick: () => s.setZoomLevel(s.zoomLevel + 10) },
    { label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: () => s.setZoomLevel(s.zoomLevel - 10) },
    { label: 'Fit to Window', shortcut: 'Ctrl+0', onClick: s.requestFit },
    { label: 'Actual Size (100%)', shortcut: 'Ctrl+1', onClick: () => s.setZoomLevel(100) },
    { sep: true },
    { label: 'Snap to Guides', checked: s.snapEnabled, onClick: () => s.setPref('snapEnabled', !s.snapEnabled) },
    { label: 'Show Grid', checked: s.showGrid, onClick: () => s.setPref('showGrid', !s.showGrid) },
  ]

  const playerItems = [
    { label: 'Push Scene to Output', shortcut: 'F5', onClick: pushScene },
    { label: 'Live Update', checked: s.liveUpdate, onClick: () => {
      const next = !s.liveUpdate
      s.setPref('liveUpdate', next)
      if (next) pushScene()
    } },
    { label: 'Clear Output', onClick: () => { api()?.playerClearScene(); s.setIsPlaying(false) } },
    { sep: true },
    { label: 'Show Output Window', checked: ps.visible, onClick: () => api()?.playerSetVisible(!ps.visible) },
    { label: 'Output Full Screen', checked: ps.fullscreen, onClick: () => api()?.playerToggleFullscreen() },
    { label: 'Always on Top', checked: ps.alwaysOnTop, onClick: () => api()?.playerSetAlwaysOnTop(!ps.alwaysOnTop) },
    { label: 'Startup & Autoplay…', onClick: onShowStartup },
    { sep: true },
    { header: 'SEND OUTPUT TO DISPLAY' },
    ...(displays.length === 0 ? [{ label: 'No displays found', disabled: true }] : []),
    ...displays.flatMap((d) => [
      {
        label: `${d.index}. ${d.label} — ${d.size.width}×${d.size.height}${d.primary ? ' (primary)' : ''}`,
        title: 'Cover this display fullscreen',
        onClick: () => api()?.playerMoveToDisplay(d.id, true),
      },
    ]),
  ]

  const helpItems = [
    { label: 'Keyboard Shortcuts', onClick: onShowShortcuts },
    { label: 'About UAPIC LED Player', onClick: onShowAbout },
  ]

  const menuProps = { openMenu, setOpenMenu }

  return (
    <div className="titlebar titlebar-drag">
      <div className="titlebar-brand titlebar-no-drag">
        <img src={uapicLogo} alt="UAPIC" className="titlebar-logo" draggable={false} />
        <span className="titlebar-app-name">LED PLAYER</span>
        <Menu label="File" items={fileItems} {...menuProps} />
        <Menu label="Edit" items={editItems} {...menuProps} />
        <Menu label="View" items={viewItems} {...menuProps} />
        <Menu label="Player" items={playerItems} {...menuProps} onOpen={loadDisplays} />
        <Menu label="Help" items={helpItems} {...menuProps} />
        <span className="titlebar-divider" />
        <span className="titlebar-scene-name" title={s.currentFilePath || 'Not saved yet'}>
          {s.scene.name}
          <span className="titlebar-file">
            {s.currentFilePath ? ` — ${fileName(s.currentFilePath)}` : ' — Untitled'}
          </span>
          {s.isDirty && <span className="titlebar-dirty" title="Unsaved changes">●</span>}
        </span>
      </div>

      <div className="titlebar-controls titlebar-no-drag">
        <button className="titlebar-btn" onClick={() => api()?.controlMinimize()} title="Minimize">
          <Minus size={13} />
        </button>
        <button className="titlebar-btn" onClick={() => api()?.controlMaximize()} title={maximized ? 'Restore' : 'Maximize'}>
          {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
        <button className="titlebar-btn titlebar-btn--close" onClick={() => api()?.controlClose()} title="Close">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
