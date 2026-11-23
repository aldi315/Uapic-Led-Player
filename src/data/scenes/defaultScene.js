/**
 * Default scene template used when the app first starts.
 * Serves as the baseline for scene creation.
 */
const defaultScene = {
  id: 'scene-default',
  name: 'Default Scene',
  duration: 0, // 0 = hold indefinitely
  backgroundColor: '#000000',
  canvasSize: { width: 1920, height: 1080 },
  windowPosition: { x: 0, y: 0 },
  // 'none'    → player window is resized to the canvas (1:1 pixel mapping)
  // 'fit'     → canvas scaled to fit the window, keeping aspect ratio
  // 'stretch' → canvas stretched to fill the window
  scaleMode: 'none',
  hideCursor: false,
  mediaObjects: [],
}

export const CANVAS_PRESETS = [
  { label: 'Full HD 1920×1080', width: 1920, height: 1080 },
  { label: 'HD 1280×720',       width: 1280, height: 720 },
  { label: '4K UHD 3840×2160',  width: 3840, height: 2160 },
  { label: 'Portrait 1080×1920', width: 1080, height: 1920 },
  { label: 'Portrait 720×1280',  width: 720,  height: 1280 },
  { label: 'Square 1080×1080',   width: 1080, height: 1080 },
  { label: 'LED 960×540',        width: 960,  height: 540 },
  { label: 'LED Strip 1920×240', width: 1920, height: 240 },
  { label: 'LED Strip 1280×128', width: 1280, height: 128 },
]

export default defaultScene
