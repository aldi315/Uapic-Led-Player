import React, { memo } from 'react'
import uapicLogo from '../assets/uapic-logo.png'

/**
 * Tiled, slightly rotated UAPIC logos shown on the output while the scene has
 * no (visible) layers, so an empty screen is clearly "idle", not broken.
 * Sized from the area it covers so it looks the same on any LED resolution.
 */
export default memo(function Watermark({ width, height }) {
  const w = Math.max(1, width || 1920)
  const h = Math.max(1, height || 1080)
  const logoW = Math.max(60, Math.round(Math.min(w, h) * 0.22))
  const logoH = Math.round(logoW * 0.268) // logo aspect ratio (600×161)
  const gapX = Math.round(logoW * 0.55)
  const gapY = Math.round(logoH * 2.2)

  // Cover the rotated area: use the diagonal for both directions
  const diag = Math.ceil(Math.hypot(w, h))
  const cols = Math.ceil(diag / (logoW + gapX)) + 2
  const rows = Math.ceil(diag / (logoH + gapY)) + 2

  const rowEls = []
  for (let r = 0; r < rows; r++) {
    const cells = []
    for (let c = 0; c < cols; c++) {
      cells.push(
        <img key={c} src={uapicLogo} alt="" draggable={false}
          style={{ width: logoW, height: logoH, marginRight: gapX, flex: 'none' }} />
      )
    }
    rowEls.push(
      <div key={r} style={{
        display: 'flex', height: logoH, marginBottom: gapY,
        marginLeft: r % 2 ? -(logoW + gapX) / 2 : 0, // brick offset
      }}>
        {cells}
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: diag + logoW * 2, height: diag + logoH * 2,
        transform: 'translate(-50%, -50%) rotate(-20deg)',
        opacity: 0.16,
      }}>
        {rowEls}
      </div>
    </div>
  )
})
