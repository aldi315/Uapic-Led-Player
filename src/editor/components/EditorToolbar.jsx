import React from 'react'
import useEditorStore from '../../store/useEditorStore'
import {
  Play, Pause, Square, RefreshCw, ZoomIn, ZoomOut, Maximize,
  MonitorUp, Undo2, Redo2, Magnet, Grid3x3, Radio, Eraser, Expand,
} from 'lucide-react'
import { pushScene } from '../projectActions'

export default function EditorToolbar() {
  const {
    zoomLevel, setZoomLevel, requestFit, isPlaying, setIsPlaying, scene,
    undo, redo, past, future, snapEnabled, showGrid, liveUpdate, setPref, playerStatus,
  } = useEditorStore()

  const api = window.electronAPI

  function handlePlay()  { api?.playerPlay();  setIsPlaying(true) }
  function handlePause() { api?.playerPause(); setIsPlaying(false) }
  function handleStop()  { api?.playerStop();  setIsPlaying(false) }
  function handleClear() { api?.playerClearScene(); setIsPlaying(false) }

  function toggleLive() {
    const next = !liveUpdate
    setPref('liveUpdate', next)
    if (next) pushScene()
  }

  const connected = playerStatus.connected

  return (
    <div className="toolbar">
      {/* History */}
      <div className="toolbar-group">
        <button className="toolbar-btn" title="Undo (Ctrl+Z)" disabled={!past.length} onClick={undo}>
          <Undo2 size={15} />
        </button>
        <button className="toolbar-btn" title="Redo (Ctrl+Y)" disabled={!future.length} onClick={redo}>
          <Redo2 size={15} />
        </button>
      </div>

      <div className="toolbar-sep" />

      {/* Zoom controls */}
      <div className="toolbar-group">
        <button className="toolbar-btn" title="Zoom Out (Ctrl+-)" onClick={() => setZoomLevel(zoomLevel - 10)}>
          <ZoomOut size={15} />
        </button>
        <button
          className="toolbar-zoom-val"
          title="Click for 100%"
          onClick={() => setZoomLevel(100)}
        >
          {zoomLevel}%
        </button>
        <button className="toolbar-btn" title="Zoom In (Ctrl++)" onClick={() => setZoomLevel(zoomLevel + 10)}>
          <ZoomIn size={15} />
        </button>
        <button className="toolbar-btn" title="Fit to window (Ctrl+0)" onClick={requestFit}>
          <Maximize size={15} />
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${snapEnabled ? 'toolbar-btn--toggled' : ''}`}
          title="Snap to canvas & object edges (hold Alt to bypass)"
          onClick={() => setPref('snapEnabled', !snapEnabled)}
        >
          <Magnet size={15} />
        </button>
        <button
          className={`toolbar-btn ${showGrid ? 'toolbar-btn--toggled' : ''}`}
          title="Show grid"
          onClick={() => setPref('showGrid', !showGrid)}
        >
          <Grid3x3 size={15} />
        </button>
        <span className="toolbar-label">
          {scene.canvasSize.width} × {scene.canvasSize.height}
        </span>
      </div>

      <div className="toolbar-spacer" />

      {/* Playback controls */}
      <div className="toolbar-group">
        <span
          className={`toolbar-status ${connected ? 'toolbar-status--on' : ''}`}
          title={connected ? 'Output window connected' : 'Output window not connected'}
        >
          <span className="toolbar-status-dot" />
          {connected ? (isPlaying ? 'ON AIR' : 'READY') : 'OFFLINE'}
        </span>

        <button
          className={`toolbar-btn ${liveUpdate ? 'toolbar-btn--live' : ''}`}
          title="Live update — every edit is sent to the output instantly"
          onClick={toggleLive}
        >
          <Radio size={15} />
          <span>LIVE</span>
        </button>

        <button className="toolbar-btn toolbar-btn--push" title="Push scene to output (F5)" onClick={pushScene}>
          <MonitorUp size={15} />
          <span>PUSH</span>
        </button>

        <div className="toolbar-sep" />

        <button
          className={`toolbar-btn ${isPlaying ? 'toolbar-btn--active-play' : ''}`}
          title="Play"
          onClick={handlePlay}
        >
          <Play size={15} />
        </button>
        <button className={`toolbar-btn ${!isPlaying ? 'toolbar-btn--toggled' : ''}`} title="Pause" onClick={handlePause}>
          <Pause size={15} />
        </button>
        <button className="toolbar-btn" title="Stop (rewind all media)" onClick={handleStop}>
          <Square size={15} />
        </button>
        <button className="toolbar-btn" title="Reload — re-send last pushed scene" onClick={() => api?.playerReloadScene()}>
          <RefreshCw size={15} />
        </button>
        <button className="toolbar-btn toolbar-btn--danger" title="Clear output (black screen)" onClick={handleClear}>
          <Eraser size={15} />
        </button>
        <button
          className={`toolbar-btn ${playerStatus.fullscreen ? 'toolbar-btn--toggled' : ''}`}
          title="Toggle output fullscreen"
          onClick={() => api?.playerToggleFullscreen()}
        >
          <Expand size={15} />
        </button>
      </div>
    </div>
  )
}
