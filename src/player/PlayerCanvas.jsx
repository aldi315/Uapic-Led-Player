import React, { useMemo, useRef, useEffect, useState, useCallback, memo } from 'react'

// ─── Individual media object renderers ───────────────────────────────────────

const VideoObject = memo(function VideoObject({ obj, isPaused, playCommand }) {
  const videoRef = useRef(null)

  // React to Play / Pause / Stop commands from toolbar
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playCommand === 'stop') {
      video.pause()
      video.currentTime = 0        // seek to beginning
    } else if (isPaused) {
      video.pause()
    } else {
      video.play().catch(() => {}) // play unconditionally when not paused
    }
  }, [isPaused, playCommand])

  // Load new src when it changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !obj.src) return
    video.src = obj.src
    video.load()
    if (!isPaused) video.play().catch(() => {}) // autoplay on load if not paused
  }, [obj.src])

  return (
    <video
      ref={videoRef}
      muted={obj.muted !== false}  // default: muted
      loop={obj.loop}
      playsInline
      preload="auto"
      style={{
        width: '100%',
        height: '100%',
        objectFit: obj.objectFit || 'cover',
        display: 'block',
        background: '#000',
      }}
    />
  )
})

const ImageObject = memo(function ImageObject({ obj }) {
  return (
    <img
      src={obj.src}
      alt={obj.name}
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: obj.objectFit || 'cover',
        display: 'block',
      }}
    />
  )
})

const TextObject = memo(function TextObject({ obj }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: obj.fontSize,
        color: obj.fontColor,
        fontFamily: obj.fontFamily,
        textAlign: 'center',
        padding: 8,
        wordBreak: 'break-word',
        overflow: 'hidden',
      }}
    >
      {obj.text}
    </div>
  )
})

const HtmlObject = memo(function HtmlObject({ obj }) {
  return (
    <div
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: obj.htmlContent }}
    />
  )
})

const ColorObject = memo(function ColorObject({ obj }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: obj.color,
      }}
    />
  )
})

const ClockObject = memo(function ClockObject({ obj, isPaused }) {
  const [time, setTime] = React.useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      const opts = {
        timeZone: obj.timezone || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: obj.clockFormat === '12',
      }
      setTime(new Intl.DateTimeFormat('en-US', opts).format(now))
    }
    tick()
    if (!isPaused) {
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }
  }, [obj.timezone, obj.clockFormat, isPaused])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: obj.fontSize || 96,
        color: obj.fontColor || '#ffffff',
        fontFamily: obj.fontFamily || 'monospace',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {time}
    </div>
  )
})

const WeatherObject = memo(function WeatherObject({ obj }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: obj.fontColor || '#ffffff',
        fontFamily: obj.fontFamily || 'Inter, sans-serif',
        fontSize: obj.fontSize || 32,
      }}
    >
      <div style={{ fontSize: '0.6em', opacity: 0.7 }}>{obj.weatherLocation}</div>
      <div>⛅ --°{obj.weatherUnit}</div>
    </div>
  )
})

const RunningTextObject = memo(function RunningTextObject({ obj, isPaused }) {
  const duration = obj.width / (obj.scrollSpeed || 80)
  const dirClass = obj.scrollDirection === 'right' ? 'running-text-right' : 'running-text-left'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className={`running-text-inner ${dirClass}`}
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
          fontSize: obj.fontSize || 48,
          color: obj.fontColor || '#ffffff',
          fontFamily: obj.fontFamily || 'Inter, sans-serif',
        }}
      >
        {obj.text}
      </span>
    </div>
  )
})

// ─── Playlist: cycles through video/image items ───────────────────────────────

const PlaylistObject = memo(function PlaylistObject({ obj, isPaused }) {
  const items = obj.playlistItems || []
  const [currentIdx, setCurrentIdx] = useState(0)
  const videoRef = useRef(null)

  const goNext = useCallback(() => {
    setCurrentIdx((i) => (obj.loop === false ? Math.min(i + 1, items.length - 1) : (i + 1) % items.length))
  }, [items.length, obj.loop])

  const currentItem = items[currentIdx] || null

  // For images: advance after duration
  useEffect(() => {
    if (!currentItem || currentItem.type === 'video' || isPaused) return
    const ms = (currentItem.duration || obj.itemDuration || 5) * 1000
    const t = setTimeout(goNext, ms)
    return () => clearTimeout(t)
  }, [currentIdx, isPaused, currentItem, obj.itemDuration, goNext])

  // For videos: load src and advance on ended
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentItem || currentItem.type !== 'video') return
    video.src = currentItem.src
    video.load()
    if (!isPaused) video.play().catch(() => {})
    const onEnded = () => goNext()
    video.addEventListener('ended', onEnded)
    return () => video.removeEventListener('ended', onEnded)
  }, [currentIdx, currentItem?.src, isPaused])

  // Pause/resume
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentItem || currentItem.type !== 'video') return
    if (isPaused) video.pause()
    else video.play().catch(() => {})
  }, [isPaused, currentItem])

  if (!currentItem) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 14 }}>
        Empty Playlist
      </div>
    )
  }

  return (
    <>
      {/* Video element always in DOM, hidden when not active */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: obj.objectFit || 'cover',
          display: currentItem.type === 'video' ? 'block' : 'none',
        }}
      />
      {currentItem.type === 'image' && (
        <img
          src={currentItem.src}
          alt={currentItem.name}
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: obj.objectFit || 'cover',
            display: 'block',
          }}
        />
      )}
    </>
  )
})


// ─── Object type dispatcher ───────────────────────────────────────────────────

const MediaObjectRenderer = memo(function MediaObjectRenderer({ obj, isPaused, playCommand }) {
  const style = {
    position: 'absolute',
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    opacity: obj.opacity,
    zIndex: obj.zIndex,
    transform: 'translate3d(0, 0, 0)',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
    display: obj.visible === false ? 'none' : 'block',
  }

  function renderContent() {
    switch (obj.type) {
      case 'video':        return <VideoObject obj={obj} isPaused={isPaused} playCommand={playCommand} />
      case 'image':        return <ImageObject obj={obj} />
      case 'text':         return <TextObject obj={obj} />
      case 'html':         return <HtmlObject obj={obj} />
      case 'color':        return <ColorObject obj={obj} />
      case 'clock':        return <ClockObject obj={obj} isPaused={isPaused} />
      case 'weather':      return <WeatherObject obj={obj} />
      case 'running-text': return <RunningTextObject obj={obj} isPaused={isPaused} />
      case 'playlist':     return <PlaylistObject obj={obj} isPaused={isPaused} />
      default:             return null
    }
  }

  return <div style={style}>{renderContent()}</div>
})

// ─── Main canvas ──────────────────────────────────────────────────────────────

export default memo(function PlayerCanvas({ scene, isPaused, playCommand }) {
  const sortedObjects = useMemo(() => {
    if (!scene?.mediaObjects) return []
    return [...scene.mediaObjects]
      .filter((o) => o.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex)
  }, [scene?.mediaObjects])

  const canvasStyle = useMemo(() => ({
    position: 'absolute',
    inset: 0,
    backgroundColor: scene?.backgroundColor || '#000000',
    overflow: 'hidden',
    transform: 'translate3d(0, 0, 0)',
    willChange: 'transform',
  }), [scene?.backgroundColor])

  return (
    <div style={canvasStyle}>
      {sortedObjects.map((obj) => (
        <MediaObjectRenderer key={obj.id} obj={obj} isPaused={isPaused} playCommand={playCommand} />
      ))}
    </div>
  )
})

