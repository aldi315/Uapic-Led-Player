/**
 * Media object renderers shared by the Player output and the Editor preview.
 *
 * Every renderer receives:
 *   obj          – the media object
 *   isPaused     – playback paused / stopped
 *   playCommand  – 'play' | 'pause' | 'stop' | 'idle'
 *   preview      – true inside the editor: static, lightweight rendering
 */
import React, { useEffect, useLayoutEffect, useRef, useState, memo } from 'react'
import { fetchWeather, describeWeather } from '../engine/weather'
import { parseYouTube, buildEmbedUrl, thumbnailUrl, describeYouTube } from '../engine/youtube'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FILL = { width: '100%', height: '100%', display: 'block' }

const ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' }

function textStyle(obj) {
  return {
    fontSize: obj.fontSize,
    color: obj.fontColor,
    fontFamily: obj.fontFamily,
    fontWeight: obj.fontWeight || 'normal',
    fontStyle: obj.fontStyle || 'normal',
    lineHeight: 1.15,
  }
}

function boxStyle(obj, extra = {}) {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: ALIGN[obj.textAlign] || 'center',
    textAlign: obj.textAlign || 'center',
    background: obj.bgColor && obj.bgColor !== 'transparent' ? obj.bgColor : undefined,
    overflow: 'hidden',
    ...extra,
  }
}

function Missing({ label, preview }) {
  if (!preview) return null // never show error text on the LED wall
  return (
    <div style={{
      ...FILL, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(45deg,#1a1a1a 0 12px,#141414 12px 24px)',
      color: '#ef4444', fontSize: 28, fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: 12,
      whiteSpace: 'pre-line', wordBreak: 'break-all',
    }}>
      {label}
    </div>
  )
}

function Placeholder({ label, color = '#777' }) {
  return (
    <div style={{
      ...FILL, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)', color, fontSize: 28, fontFamily: 'Inter, sans-serif',
      outline: '2px dashed rgba(255,255,255,0.12)', outlineOffset: -2,
    }}>
      {label}
    </div>
  )
}

/** Fade-in wrapper used by playlist transitions. */
function FadeIn({ enabled, children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (enabled && ref.current?.animate) {
      ref.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' })
    }
  }, [enabled])
  return <div ref={ref} style={{ position: 'absolute', inset: 0 }}>{children}</div>
}

// ─── Video ───────────────────────────────────────────────────────────────────

const VideoObject = memo(function VideoObject({ obj, isPaused, playCommand, preview }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(false)
  const pausedRef = useRef(isPaused)
  pausedRef.current = isPaused

  // Load new src
  useEffect(() => {
    const video = videoRef.current
    setError(false)
    if (!video || !obj.src) return
    if (preview) {
      const onMeta = () => { try { video.currentTime = Math.min(0.5, (video.duration || 1) / 2) } catch { /* ignore */ } }
      video.addEventListener('loadedmetadata', onMeta, { once: true })
      return () => video.removeEventListener('loadedmetadata', onMeta)
    }
    if (!pausedRef.current && obj.autoplay !== false) video.play().catch(() => {})
  }, [obj.src, preview])

  // Audio settings (React does not reliably update the muted attribute)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = preview || obj.muted !== false
    video.volume = Math.min(1, Math.max(0, Number(obj.volume ?? 1)))
  }, [obj.muted, obj.volume, preview])

  // Play / pause / stop
  useEffect(() => {
    const video = videoRef.current
    if (!video || preview) return
    if (playCommand === 'stop') {
      video.pause()
      video.currentTime = 0
    } else if (isPaused) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
  }, [isPaused, playCommand, preview])

  if (!obj.src) return preview ? <Placeholder label="▶ No video selected" color="#1e90ff" /> : null

  return (
    <>
      <video
        ref={videoRef}
        src={obj.src}
        muted
        loop={obj.loop !== false}
        playsInline
        preload={preview ? 'metadata' : 'auto'}
        onError={() => setError(true)}
        onLoadedData={() => setError(false)}
        style={{ ...FILL, objectFit: obj.objectFit || 'cover', background: '#000' }}
      />
      {error && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Missing label={`Video not found
${decodeURIComponent(obj.src.split('/').pop())}`} preview={preview} />
        </div>
      )}
    </>
  )
})

// ─── Image ───────────────────────────────────────────────────────────────────

const ImageObject = memo(function ImageObject({ obj, preview }) {
  const [error, setError] = useState(false)
  useEffect(() => setError(false), [obj.src])
  if (!obj.src) return preview ? <Placeholder label="🖼 No image selected" color="#22c55e" /> : null
  if (error) return <Missing label={`Image not found\n${decodeURIComponent(obj.src.split('/').pop())}`} preview={preview} />
  return (
    <img
      src={obj.src}
      alt={obj.name}
      draggable={false}
      onError={() => setError(true)}
      style={{ ...FILL, objectFit: obj.objectFit || 'cover' }}
    />
  )
})

// ─── Text ────────────────────────────────────────────────────────────────────

const TextObject = memo(function TextObject({ obj }) {
  return (
    <div style={boxStyle(obj, { padding: '0 0.25em' })}>
      <div style={{ ...textStyle(obj), whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%' }}>
        {obj.text}
      </div>
    </div>
  )
})

// ─── Running text (marquee) ──────────────────────────────────────────────────

const RunningTextObject = memo(function RunningTextObject({ obj, isPaused, playCommand, preview }) {
  const boxRef = useRef(null)
  const textRef = useRef(null)
  const animRef = useRef(null)
  const pausedRef = useRef(isPaused)
  pausedRef.current = isPaused
  const [fontsReady, setFontsReady] = useState(0)

  // Re-measure once web fonts have loaded (text width changes)
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => alive && setFontsReady((n) => n + 1))
    return () => { alive = false }
  }, [obj.fontFamily])

  useLayoutEffect(() => {
    const box = boxRef.current
    const el = textRef.current
    if (preview || !box || !el || !el.animate) return
    const W = box.clientWidth
    const T = el.scrollWidth
    const speed = Math.max(5, Number(obj.scrollSpeed) || 80)
    const toRight = obj.scrollDirection === 'right'
    const from = toRight ? -T : W
    const to = toRight ? W : -T
    const anim = el.animate(
      [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
      { duration: ((W + T) / speed) * 1000, iterations: Infinity, easing: 'linear' }
    )
    animRef.current = anim
    if (pausedRef.current) anim.pause()
    return () => anim.cancel()
  }, [obj.text, obj.fontSize, obj.fontFamily, obj.fontWeight, obj.fontStyle, obj.width,
      obj.scrollSpeed, obj.scrollDirection, preview, fontsReady])

  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (playCommand === 'stop') { anim.pause(); anim.currentTime = 0 }
    else if (isPaused) anim.pause()
    else anim.play()
  }, [isPaused, playCommand])

  return (
    <div ref={boxRef} style={boxStyle({ ...obj, textAlign: 'left' }, { position: 'relative' })}>
      <span
        ref={textRef}
        style={{
          ...textStyle(obj),
          flex: 'none',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          // in the editor show the start of the text; on output it starts off-screen
          transform: preview ? 'none' : 'translate3d(100vw,0,0)',
          paddingLeft: preview ? '0.25em' : 0,
        }}
      >
        {String(obj.text || '').replace(/\s*\n\s*/g, '   ')}
      </span>
    </div>
  )
})

// ─── HTML / Web page ─────────────────────────────────────────────────────────

const HtmlObject = memo(function HtmlObject({ obj, preview }) {
  if (obj.htmlMode === 'url') {
    if (!obj.url) return preview ? <Placeholder label="🌐 No URL" color="#a855f7" /> : null
    return (
      <iframe
        title={obj.name}
        src={obj.url}
        sandbox="allow-scripts allow-same-origin allow-forms"
        referrerPolicy="no-referrer"
        style={{ ...FILL, border: 0, background: 'transparent', pointerEvents: preview ? 'none' : 'auto' }}
      />
    )
  }
  return (
    <div
      style={{ ...FILL, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: obj.htmlContent || '' }}
    />
  )
})

// ─── YouTube (video / live stream / playlist) ────────────────────────────────

function YouTubePreview({ info, obj }) {
  const thumb = thumbnailUrl(info)
  return (
    <div style={{
      ...FILL, position: 'relative', background: '#0f0f0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {thumb && (
        <img src={thumb} alt="" draggable={false}
          style={{ ...FILL, position: 'absolute', inset: 0, objectFit: 'cover', opacity: 0.85 }} />
      )}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <svg viewBox="0 0 68 48" width={Math.max(40, Math.min(obj.width, obj.height) * 0.22)}>
          <path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.2.3 34 .3 34 .3s-21.2 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z" fill="#f00" />
          <path d="M45 24 27 14v20z" fill="#fff" />
        </svg>
        {!thumb && (
          <div style={{ color: '#fff', fontSize: 24, fontFamily: 'Inter, sans-serif', textShadow: '0 1px 3px #000', textAlign: 'center', padding: '0 12px' }}>
            {info?.kind === 'channel' ? 'Channel live stream' : info?.kind === 'playlist' ? 'YouTube playlist' : 'YouTube'}
          </div>
        )}
      </div>
    </div>
  )
}

const YouTubeObject = memo(function YouTubeObject({ obj, isPaused, playCommand, preview }) {
  const frameRef = useRef(null)
  const info = parseYouTube(obj.youtubeUrl)
  const src = buildEmbedUrl(info, {
    muted: obj.muted !== false,
    controls: !!obj.youtubeControls,
    loop: obj.loop !== false,
    captions: !!obj.youtubeCaptions,
    start: obj.youtubeStart,
  })

  // Commands go to the embedded player through its postMessage JS API
  const send = (func, args = []) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  }
  const applyState = () => {
    send('setVolume', [Math.round(Math.min(1, Math.max(0, Number(obj.volume ?? 1))) * 100)])
    if (playCommand === 'stop') send('stopVideo')
    else if (isPaused) send('pauseVideo')
    else send('playVideo')
  }
  const stateRef = useRef(applyState)
  stateRef.current = applyState

  useEffect(() => {
    if (!preview) stateRef.current()
  }, [isPaused, playCommand, obj.volume, preview])

  if (preview) {
    if (!obj.youtubeUrl) return <Placeholder label="▶ Paste a YouTube link" color="#ff4444" />
    if (!src) return <Missing preview label={describeYouTube(info)} />
    return <YouTubePreview info={info} obj={obj} />
  }
  if (!src) return null

  return (
    <iframe
      ref={frameRef}
      key={src}
      title={obj.name}
      src={src}
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => setTimeout(() => stateRef.current(), 800)}
      style={{ ...FILL, border: 0, background: '#000', pointerEvents: obj.youtubeControls ? 'auto' : 'none' }}
    />
  )
})

// ─── Color block ─────────────────────────────────────────────────────────────

const ColorObject = memo(function ColorObject({ obj }) {
  return <div style={{ ...FILL, backgroundColor: obj.color }} />
})

// ─── Clock ───────────────────────────────────────────────────────────────────

function formatClock(obj, now) {
  const tz = obj.timezone || undefined
  const timeOpts = {
    hour: '2-digit', minute: '2-digit',
    second: obj.showSeconds === false ? undefined : '2-digit',
    hour12: obj.clockFormat === '12',
  }
  const dateOpts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  try {
    return {
      time: new Intl.DateTimeFormat('en-GB', { ...timeOpts, timeZone: tz }).format(now).replace(/\s?(am|pm)$/i, (m) => m.toUpperCase()),
      date: obj.showDate ? new Intl.DateTimeFormat(undefined, { ...dateOpts, timeZone: tz }).format(now) : null,
    }
  } catch {
    // invalid timezone — fall back to local time
    return {
      time: new Intl.DateTimeFormat('en-GB', timeOpts).format(now),
      date: obj.showDate ? new Intl.DateTimeFormat(undefined, dateOpts).format(now) : null,
    }
  }
}

const ClockObject = memo(function ClockObject({ obj }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Align ticks to the start of each second
    let timer
    const tick = () => {
      setNow(new Date())
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    return () => clearTimeout(timer)
  }, [])

  const { time, date } = formatClock(obj, now)

  return (
    <div style={boxStyle(obj, { flexDirection: 'column', alignItems: ALIGN[obj.textAlign] || 'center', justifyContent: 'center' })}>
      <div style={{ ...textStyle(obj), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{time}</div>
      {date && (
        <div style={{ ...textStyle(obj), fontSize: (obj.fontSize || 96) * 0.32, opacity: 0.8, whiteSpace: 'nowrap' }}>
          {date}
        </div>
      )}
    </div>
  )
})

// ─── Weather (Open-Meteo, no API key) ────────────────────────────────────────

const WeatherObject = memo(function WeatherObject({ obj }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let alive = true
    const load = () => {
      fetchWeather(obj.weatherLocation, obj.weatherUnit)
        .then((data) => alive && setState({ status: 'ok', data }))
        .catch((err) => alive && setState((s) => (s.data ? s : { status: 'error', error: err.message })))
    }
    load()
    const minutes = Math.max(5, Number(obj.weatherRefresh) || 15)
    const timer = setInterval(load, minutes * 60 * 1000)
    return () => { alive = false; clearInterval(timer) }
  }, [obj.weatherLocation, obj.weatherUnit, obj.weatherRefresh])

  const d = state.data
  const info = d ? describeWeather(d.code, d.isDay) : null
  const unit = obj.weatherUnit === 'F' ? '°F' : '°C'

  return (
    <div style={boxStyle(obj, { flexDirection: 'column', alignItems: ALIGN[obj.textAlign] || 'center', gap: '0.1em' })}>
      <div style={{ ...textStyle(obj), fontSize: (obj.fontSize || 48) * 0.45, opacity: 0.8, whiteSpace: 'nowrap' }}>
        {d?.place || obj.weatherLocation}
      </div>
      <div style={{ ...textStyle(obj), whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25em' }}>
        <span>{info ? info.icon : '⛅'}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {d ? `${Math.round(d.temperature)}${unit}` : `--${unit}`}
        </span>
      </div>
      <div style={{ ...textStyle(obj), fontSize: (obj.fontSize || 48) * 0.38, opacity: 0.75, whiteSpace: 'nowrap' }}>
        {state.status === 'loading' && 'Loading…'}
        {state.status === 'error' && !d && 'Weather unavailable'}
        {d && `${info.label} · 💧${Math.round(d.humidity)}%`}
      </div>
    </div>
  )
})

// ─── Playlist: cycles through video / image items ────────────────────────────

const PlaylistObject = memo(function PlaylistObject({ obj, isPaused, playCommand, preview }) {
  const items = obj.playlistItems || []
  const [idx, setIdx] = useState(0)
  const [cycle, setCycle] = useState(0) // bump to restart the same item
  const videoRef = useRef(null)
  const pausedRef = useRef(isPaused)
  pausedRef.current = isPaused

  const safeIdx = items.length ? Math.min(idx, items.length - 1) : 0
  const current = items[safeIdx] || null
  const loop = obj.loop !== false

  const goNext = () => {
    if (items.length === 0) return
    const next = safeIdx + 1
    if (next < items.length) setIdx(next)
    else if (loop) {
      if (items.length === 1) setCycle((c) => c + 1)
      else setIdx(0)
    }
  }
  const goNextRef = useRef(goNext)
  goNextRef.current = goNext

  // Stop → rewind to the first item
  useEffect(() => {
    if (playCommand === 'stop') { setIdx(0); setCycle((c) => c + 1) }
  }, [playCommand])

  // Images advance after their duration
  useEffect(() => {
    if (preview || !current || current.type === 'video' || isPaused) return
    const ms = Math.max(0.5, Number(current.duration) || Number(obj.itemDuration) || 5) * 1000
    const t = setTimeout(() => goNextRef.current(), ms)
    return () => clearTimeout(t)
  }, [safeIdx, cycle, isPaused, current?.id, current?.duration, obj.itemDuration, preview])

  // Videos: load when the item changes, advance when it ends
  useEffect(() => {
    const video = videoRef.current
    if (!video || !current || current.type !== 'video') return
    video.src = current.src
    video.load()
    if (preview) return
    if (!pausedRef.current) video.play().catch(() => {})
    const onEnded = () => goNextRef.current()
    const onError = () => setTimeout(() => goNextRef.current(), 1000) // skip broken files
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
    }
  }, [safeIdx, cycle, current?.src, preview])

  // Pause / resume the current video without reloading it
  useEffect(() => {
    const video = videoRef.current
    if (preview || !video || current?.type !== 'video') return
    if (isPaused) video.pause()
    else video.play().catch(() => {})
  }, [isPaused, preview])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = preview || obj.muted !== false
  })

  if (!current) {
    return preview ? <Placeholder label="📋 Empty playlist" color="#8b5cf6" /> : null
  }

  const fit = obj.objectFit || 'cover'
  return (
    <FadeIn key={`${safeIdx}-${cycle}`} enabled={!preview && obj.transition === 'fade'}>
      {current.type === 'video' ? (
        <video ref={videoRef} muted playsInline preload="auto" style={{ ...FILL, objectFit: fit, background: '#000' }} />
      ) : (
        <img src={current.src} alt={current.name} draggable={false} style={{ ...FILL, objectFit: fit }} />
      )}
    </FadeIn>
  )
})

// ─── Dispatcher ──────────────────────────────────────────────────────────────

const RENDERERS = {
  video: VideoObject,
  image: ImageObject,
  text: TextObject,
  html: HtmlObject,
  youtube: YouTubeObject,
  color: ColorObject,
  clock: ClockObject,
  weather: WeatherObject,
  'running-text': RunningTextObject,
  playlist: PlaylistObject,
}

export const MediaObjectRenderer = memo(function MediaObjectRenderer({ obj, isPaused, playCommand, preview = false }) {
  const Renderer = RENDERERS[obj.type]
  const style = {
    position: 'absolute',
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    opacity: obj.opacity,
    zIndex: obj.zIndex,
    overflow: 'hidden',
    display: obj.visible === false ? 'none' : 'block',
    pointerEvents: preview ? 'none' : undefined,
    ...(preview ? {} : { transform: 'translate3d(0,0,0)', willChange: 'transform, opacity', backfaceVisibility: 'hidden' }),
  }
  return (
    <div style={style}>
      {Renderer ? <Renderer obj={obj} isPaused={isPaused} playCommand={playCommand} preview={preview} /> : null}
    </div>
  )
})

export default MediaObjectRenderer
