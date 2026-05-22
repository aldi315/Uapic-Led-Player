import React, { useState, useRef, useEffect } from 'react'
import useEditorStore from '../../store/useEditorStore'
import { Minus, Maximize2, X, MonitorPlay, ChevronDown } from 'lucide-react'

function FileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const { scene, currentFilePath, resetScene, loadScene, setCurrentFilePath } = useEditorStore()

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleNew() {
    if (confirm('Create new project? Unsaved changes will be lost.')) {
      resetScene()
    }
    setIsOpen(false)
  }

  async function handleOpen() {
    const res = await window.electronAPI?.openProject()
    if (res && res.data) {
      loadScene(res.data, res.filePath)
    }
    setIsOpen(false)
  }

  async function handleSave() {
    const res = await window.electronAPI?.saveProject(scene, currentFilePath)
    if (res) setCurrentFilePath(res)
    setIsOpen(false)
  }

  async function handleSaveAs() {
    const res = await window.electronAPI?.saveProject(scene, null)
    if (res) setCurrentFilePath(res)
    setIsOpen(false)
  }

  function handleExit() {
    window.electronAPI?.controlClose()
  }

  return (
    <div className="titlebar-menu-wrapper titlebar-no-drag" ref={menuRef}>
      <button className="titlebar-menu-btn" onClick={() => setIsOpen(!isOpen)}>
        File
      </button>
      {isOpen && (
        <div className="titlebar-dropdown">
          <button className="titlebar-dropdown-item" onClick={handleNew}>New Project</button>
          <button className="titlebar-dropdown-item" onClick={handleOpen}>Open Project...</button>
          <div className="titlebar-dropdown-sep" />
          <button className="titlebar-dropdown-item" onClick={handleSave}>Save</button>
          <button className="titlebar-dropdown-item" onClick={handleSaveAs}>Save As...</button>
          <div className="titlebar-dropdown-sep" />
          <button className="titlebar-dropdown-item" onClick={handleExit}>Exit</button>
        </div>
      )}
    </div>
  )
}

export default function Titlebar() {
  const sceneName = useEditorStore((s) => s.scene.name)
  const currentFilePath = useEditorStore((s) => s.currentFilePath)

  return (
    <div className="titlebar titlebar-drag">
      {/* Left: Branding */}
      <div className="titlebar-brand titlebar-no-drag">
        <MonitorPlay size={14} className="titlebar-icon" />
        <span className="titlebar-app-name">UAPIC LED PLAYER</span>
        <FileMenu />
        <span className="titlebar-divider" />
        <span className="titlebar-scene-name">
          {sceneName} {currentFilePath ? `(${currentFilePath.split(/\\|\//).pop()})` : ''}
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="titlebar-controls titlebar-no-drag">
        <button
          className="titlebar-btn"
          onClick={() => window.electronAPI?.controlMinimize()}
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          className="titlebar-btn"
          onClick={() => window.electronAPI?.controlMaximize()}
          title="Maximize"
        >
          <Maximize2 size={12} />
        </button>
        <button
          className="titlebar-btn titlebar-btn--close"
          onClick={() => window.electronAPI?.controlClose()}
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
