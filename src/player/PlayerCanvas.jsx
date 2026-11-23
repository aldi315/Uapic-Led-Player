import React, { useEffect, useMemo, useState, memo } from 'react'
import { MediaObjectRenderer } from './MediaRenderers'

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export default memo(function PlayerCanvas({ scene, isPaused, playCommand }) {
  const { w, h } = useWindowSize()

  const sortedObjects = useMemo(() => {
    if (!scene?.mediaObjects) return []
    return [...scene.mediaObjects]
      .filter((o) => o.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex)
  }, [scene?.mediaObjects])

  // Apply hide-cursor preference to the whole window
  useEffect(() => {
    document.body.style.cursor = scene?.hideCursor ? 'none' : ''
  }, [scene?.hideCursor])

  if (!scene) return <div style={{ position: 'absolute', inset: 0, background: '#000' }} />

  const cw = scene.canvasSize?.width || w
  const ch = scene.canvasSize?.height || h
  const mode = scene.scaleMode || 'none'

  let transform = 'translate3d(0,0,0)'
  let left = 0
  let top = 0
  if (mode === 'fit') {
    const s = Math.min(w / cw, h / ch)
    left = (w - cw * s) / 2
    top = (h - ch * s) / 2
    transform = `translate3d(0,0,0) scale(${s})`
  } else if (mode === 'stretch') {
    transform = `translate3d(0,0,0) scale(${w / cw}, ${h / ch})`
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: cw,
          height: ch,
          backgroundColor: scene.backgroundColor || '#000000',
          overflow: 'hidden',
          transform,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {sortedObjects.map((obj) => (
          <MediaObjectRenderer key={obj.id} obj={obj} isPaused={isPaused} playCommand={playCommand} />
        ))}
      </div>
    </div>
  )
})
