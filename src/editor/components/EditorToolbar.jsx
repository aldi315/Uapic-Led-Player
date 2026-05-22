import React from 'react'
import useEditorStore from '../../store/useEditorStore'
import {
  Play, Pause, Square, RefreshCw,
  ZoomIn, ZoomOut, AlignCenter,
  MonitorUp,
} from 'lucide-react'

export default function EditorToolbar() {
  const { zoomLevel, setZoomLevel, isPlaying, setIsPlaying, pushToPlayer, scene } = useEditorStore()

  function handlePush() {
    pushToPlayer()
    setIsPlaying(true)
  }

  function handlePlay() {
    window.electronAPI?.playerPlay()
    setIsPlaying(true)
  }

  function handlePause() {
    window.electronAPI?.playerPause()
    setIsPlaying(false)
  }

  function handleStop() {
    window.electronAPI?.playerStop()
    setIsPlaying(false)
  }

  function handleReload() {
    window.electronAPI?.playerReloadScene()
  }


  function handleFitZoom() {
    setZoomLevel(50)
  }

  return (
    <div className="toolbar">
      {/* Canvas info */}
      <div className="toolbar-group">
        <span className="toolbar-label">
          {scene.canvasSize.width} × {scene.canvasSize.height}
        </span>
      </div>

      <div className="toolbar-sep" />

      {/* Zoom controls */}
      <div className="toolbar-group">
        <button className="toolbar-btn" title="Zoom Out" onClick={() => setZoomLevel(zoomLevel - 10)}>
          <ZoomOut size={15} />
        </button>
        <span className="toolbar-zoom-val">{zoomLevel}%</span>
        <button className="toolbar-btn" title="Zoom In" onClick={() => setZoomLevel(zoomLevel + 10)}>
          <ZoomIn size={15} />
        </button>
        <button className="toolbar-btn" title="Fit to view" onClick={handleFitZoom}>
          <AlignCenter size={15} />
        </button>
      </div>

      <div className="toolbar-sep" />

      {/* Playback controls */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn toolbar-btn--push"
          title="Push scene to player"
          onClick={handlePush}
        >
          <MonitorUp size={15} />
          <span>PUSH</span>
        </button>

        <div className="toolbar-sep" />

        <button
          className={`toolbar-btn ${isPlaying ? '' : 'toolbar-btn--active-play'}`}
          title="Play"
          onClick={handlePlay}
        >
          <Play size={15} />
        </button>
        <button
          className="toolbar-btn"
          title="Pause"
          onClick={handlePause}
        >
          <Pause size={15} />
        </button>
        <button
          className="toolbar-btn"
          title="Stop"
          onClick={handleStop}
        >
          <Square size={15} />
        </button>
        <button
          className="toolbar-btn"
          title="Reload — re-send last pushed scene to player"
          onClick={handleReload}
        >
          <RefreshCw size={15} />
        </button>
      </div>

    </div>
  )
}
