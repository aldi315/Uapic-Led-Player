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
  mediaObjects: [],
}

export default defaultScene
