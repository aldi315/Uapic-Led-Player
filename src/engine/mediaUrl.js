/**
 * media:// URLs for local files (served by electron/mediaProtocol.js).
 * Keep toMediaUrl in sync with the one in electron/mediaProtocol.js.
 *
 *   current: media://local/C%3A/Videos/promo%20%231.mp4
 *   older projects: media:///C:/Videos/promo 1.mp4 (still played and shown)
 */

function safeDecode(text) {
  try {
    return decodeURIComponent(text)
  } catch {
    return text.replace(/(%[0-9A-Fa-f]{2})+/g, (run) => {
      try { return decodeURIComponent(run) } catch { return run }
    })
  }
}

/** C:\Videos\promo #1.mp4 → media://local/C%3A/Videos/promo%20%231.mp4 */
export function toMediaUrl(filePath) {
  const parts = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '').split('/')
  return 'media://local/' + parts.map(encodeURIComponent).join('/')
}

/** media:// URL → readable local path (C:\Videos\promo #1.mp4); other URLs unchanged. */
export function mediaUrlToPath(url) {
  if (!url) return ''
  let p
  if (url.startsWith('media://local/')) p = safeDecode(url.slice('media://local/'.length))
  else if (url.startsWith('media:///')) p = safeDecode(url.slice('media:///'.length))
  else return url
  // Windows drive paths read best with backslashes; POSIX paths get their slash back
  return /^[a-z]:\//i.test(p) ? p.replace(/\//g, '\\') : '/' + p
}

/** Is this text a local file path (C:\…, /home/…)? */
export function isLocalPath(text) {
  return /^[a-z]:[\\/]/i.test(text) || text.startsWith('/')
}
