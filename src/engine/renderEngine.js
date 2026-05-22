/**
 * renderEngine.js — Centralized playback state for the Player window.
 *
 * Tracks scene + playCommand ('play' | 'pause' | 'stop' | 'idle')
 * and notifies React subscribers on any change.
 */

const renderEngine = (() => {
  let currentScene = null
  let playCommand  = 'idle'  // 'idle' | 'play' | 'pause' | 'stop'
  let listeners    = []

  function notify() {
    listeners.forEach((fn) => fn({
      scene:       currentScene,
      isPaused:    playCommand !== 'play',
      playCommand,
    }))
  }

  return {
    /** Load a full scene from control panel. Auto-starts playback. */
    loadScene(scene) {
      currentScene = scene
      playCommand  = 'play'
      notify()
    },

    /** Resume all media. */
    play() {
      playCommand = 'play'
      notify()
    },

    /** Pause all media (keep position). */
    pause() {
      playCommand = 'pause'
      notify()
    },

    /** Stop all media and seek to beginning. */
    stop() {
      playCommand = 'stop'
      notify()
    },

    /** Wipe canvas — no scene shown. */
    clear() {
      currentScene = null
      playCommand  = 'idle'
      notify()
    },

    getScene()       { return currentScene },
    getPlayCommand() { return playCommand },
    getIsPaused()    { return playCommand !== 'play' },

    /**
     * Subscribe to state changes.
     * @param {function} fn - callback({ scene, isPaused, playCommand })
     * @returns {function} unsubscribe
     */
    onSceneChange(fn) {
      listeners.push(fn)
      // Emit current state immediately so late subscribers are up to date
      fn({ scene: currentScene, isPaused: playCommand !== 'play', playCommand })
      return () => { listeners = listeners.filter((l) => l !== fn) }
    },

    /** Future: cross-fade / cut transition between scenes. */
    transition(nextScene, type = 'cut') {
      this.loadScene(nextScene)
    },
  }
})()

export default renderEngine
