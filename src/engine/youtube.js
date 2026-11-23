/**
 * YouTube link parsing + embed URL building for the YouTube widget.
 *
 * Accepted input (anything a user would paste):
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/live/VIDEO_ID        (live stream / premiere)
 *   https://www.youtube.com/shorts/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/playlist?list=PLAYLIST_ID
 *   https://www.youtube.com/channel/UC…           (plays the channel's current live stream)
 *   a bare 11-char video id, a PL…/UU… playlist id or a UC… channel id
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/
const PLAYLIST_ID = /^(PL|UU|LL|FL|OL|RD)[A-Za-z0-9_-]{10,}$/

/** @returns {{kind:'video'|'playlist'|'channel', id:string, list?:string, start?:number} | {kind:'handle', handle:string} | null} */
export function parseYouTube(input) {
  const raw = String(input || '').trim()
  if (!raw) return null
  if (VIDEO_ID.test(raw)) return { kind: 'video', id: raw }
  if (CHANNEL_ID.test(raw)) return { kind: 'channel', id: raw }
  if (PLAYLIST_ID.test(raw)) return { kind: 'playlist', id: raw }

  let url
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  const parts = url.pathname.split('/').filter(Boolean)
  const list = url.searchParams.get('list') || undefined
  const start = parseStart(url.searchParams.get('t') || url.searchParams.get('start'))

  if (host === 'youtu.be') {
    return parts[0] && VIDEO_ID.test(parts[0]) ? { kind: 'video', id: parts[0], list, start } : null
  }
  if (!/^(youtube\.com|youtube-nocookie\.com)$/.test(host)) return null

  const v = url.searchParams.get('v')
  if (v && VIDEO_ID.test(v)) return { kind: 'video', id: v, list, start }
  if (['live', 'shorts', 'embed', 'v'].includes(parts[0]) && parts[1] && VIDEO_ID.test(parts[1])) {
    return { kind: 'video', id: parts[1], list, start }
  }
  if (parts[0] === 'embed' && parts[1] === 'live_stream') {
    const ch = url.searchParams.get('channel')
    return ch && CHANNEL_ID.test(ch) ? { kind: 'channel', id: ch } : null
  }
  if (parts[0] === 'channel' && parts[1] && CHANNEL_ID.test(parts[1])) return { kind: 'channel', id: parts[1] }
  if (list) return { kind: 'playlist', id: list }
  if (parts[0]?.startsWith('@')) return { kind: 'handle', handle: parts[0] }
  return null
}

function parseStart(t) {
  if (!t) return undefined
  if (/^\d+$/.test(t)) return Number(t)
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t)
  if (!m) return undefined
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0)
}

/** Build the iframe URL for the player output. */
export function buildEmbedUrl(info, opts = {}) {
  if (!info || info.kind === 'handle') return null
  const p = new URLSearchParams({
    autoplay: '1',
    mute: opts.muted === false ? '0' : '1',
    controls: opts.controls ? '1' : '0',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3', // no annotations
    disablekb: '1',
    fs: '0',
    enablejsapi: '1', // lets the player pause/play/stop it via postMessage
    cc_load_policy: opts.captions ? '1' : '0',
  })
  if (opts.captions) p.set('cc_lang_pref', opts.captionLang || 'id')

  let path
  if (info.kind === 'channel') {
    path = 'live_stream'
    p.set('channel', info.id)
  } else if (info.kind === 'playlist') {
    path = 'videoseries'
    p.set('list', info.id)
    if (opts.loop !== false) p.set('loop', '1')
  } else {
    path = info.id
    if (info.list) p.set('list', info.list)
    if (opts.loop !== false) {
      p.set('loop', '1')
      if (!info.list) p.set('playlist', info.id) // required for single-video looping
    }
    const start = Number(opts.start) || info.start
    if (start) p.set('start', String(Math.floor(start)))
  }
  return `https://www.youtube.com/embed/${path}?${p.toString()}`
}

/** Thumbnail for the editor preview (video links only). */
export function thumbnailUrl(info) {
  return info?.kind === 'video' ? `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg` : null
}

export function describeYouTube(info) {
  if (!info) return 'Not a YouTube link'
  switch (info.kind) {
    case 'video': return `Video · ${info.id}${info.list ? ' (in playlist)' : ''}`
    case 'playlist': return `Playlist · ${info.id}`
    case 'channel': return `Channel live stream · ${info.id}`
    case 'handle': return `${info.handle} — paste the channel ID (UC…) or the live video link instead`
    default: return ''
  }
}
