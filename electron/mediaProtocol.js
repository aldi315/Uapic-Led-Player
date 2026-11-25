/**
 * media://local/C%3A/path/to/file.mp4 → serves a local file to the renderers.
 *
 * Range requests are answered with a proper "206 Partial Content" response.
 * Chromium only treats a video as seekable when it gets 206 + Content-Range;
 * with a plain 200 it can never jump back to the start, so looping videos
 * played only once and large MP4s whose index sits at the end failed to load.
 */
const fs = require('fs')
const path = require('path')
const { Readable } = require('stream')

const MIME = {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.ogv': 'video/ogg',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.avif': 'image/avif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text)
  } catch {
    // Older projects saved unencoded names such as "50% off.mp4": decode only
    // the well-formed escape runs and keep stray % signs as they are.
    return text.replace(/(%[0-9A-Fa-f]{2})+/g, (run) => {
      try { return decodeURIComponent(run) } catch { return run }
    })
  }
}

/**
 * The scheme is "standard" (needed for seeking), so URLs arrive host-parsed:
 *   media://local/C%3A/Videos/a.mp4   → C:/Videos/a.mp4        (current format)
 *   media:///C:/Videos/a.mp4          → arrives as media://c/Videos/a.mp4 (older projects)
 *   media:///home/me/a.mp4            → arrives as media://home/me/a.mp4  (older, POSIX)
 */
function filePathFromUrl(url) {
  const { hostname, pathname } = new URL(url)
  const rest = safeDecode(pathname) // always starts with "/"
  if (hostname === 'local') {
    return process.platform === 'win32' ? rest.replace(/^\/+/, '') : rest
  }
  if (process.platform === 'win32' && /^[a-z]$/i.test(hostname)) {
    return `${hostname.toUpperCase()}:${rest}`
  }
  return `/${safeDecode(hostname)}${rest}`
}

/** Parse "bytes=start-end" / "bytes=start-" / "bytes=-suffix" for a file of `size`. */
function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim())
  if (!m || (m[1] === '' && m[2] === '')) return null
  let start, end
  if (m[1] === '') { // last N bytes
    start = Math.max(0, size - Number(m[2]))
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  if (start > end || start >= size) return { invalid: true }
  return { start, end }
}

async function handleMediaRequest(request) {
  const filePath = filePathFromUrl(request.url)
  let stat
  try {
    stat = await fs.promises.stat(filePath)
    if (!stat.isFile()) throw new Error('not a file')
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const size = stat.size
  const headers = {
    'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
  }
  const range = parseRange(request.headers.get('range'), size)

  if (range?.invalid) {
    return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } })
  }
  const start = range ? range.start : 0
  const end = range ? range.end : size - 1
  const length = size === 0 ? 0 : end - start + 1
  const body = request.method === 'HEAD' || length === 0
    ? null
    : Readable.toWeb(fs.createReadStream(filePath, { start, end }))

  return new Response(body, {
    status: range ? 206 : 200,
    headers: {
      ...headers,
      'Content-Length': String(length),
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
    },
  })
}

/** C:\Videos\promo #1.mp4 → media://local/C%3A/Videos/promo%20%231.mp4 */
function toMediaUrl(filePath) {
  const parts = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '').split('/')
  return 'media://local/' + parts.map(encodeURIComponent).join('/')
}

module.exports = { handleMediaRequest, parseRange, filePathFromUrl, toMediaUrl }
