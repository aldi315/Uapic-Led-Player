import React, { useState, useEffect } from 'react'
import PlayerCanvas from './PlayerCanvas'
import renderEngine from '../engine/renderEngine'

export default function PlayerApp() {
  const [scene,       setScene]       = useState(null)
  const [isPaused,    setIsPaused]    = useState(false)
  const [playCommand, setPlayCommand] = useState('idle')

  useEffect(() => {
    // Subscribe to renderEngine state changes (scene + playback command)
    const unsubEngine = renderEngine.onSceneChange(({ scene, isPaused, playCommand }) => {
      setScene(scene ? { ...scene } : null)
      setIsPaused(isPaused)
      setPlayCommand(playCommand)
    })

    // Scene updates pushed from Control Panel
    const unsubScene = window.electronAPI?.onSceneUpdate((incomingScene) => {
      renderEngine.loadScene(incomingScene)
    })

    // Playback commands (play / pause / stop / clear) from Control Panel
    const unsubCmd = window.electronAPI?.onPlayerCommand(({ command }) => {
      switch (command) {
        case 'play':  renderEngine.play();  break
        case 'pause': renderEngine.pause(); break
        case 'stop':  renderEngine.stop();  break
        case 'clear': renderEngine.clear(); break
        default: break
      }
    })

    // Tell main process this player window is ready to receive scenes
    window.electronAPI?.playerReady()

    return () => {
      unsubEngine()
      if (typeof unsubScene === 'function') unsubScene()
      if (typeof unsubCmd   === 'function') unsubCmd()
    }
  }, [])

  return <PlayerCanvas scene={scene} isPaused={isPaused} playCommand={playCommand} />
}
