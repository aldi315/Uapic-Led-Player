/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./control.html",
    "./player.html",
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#0c0c0c',
        surface:  '#141414',
        surface2: '#1e1e1e',
        surface3: '#252525',
        border:   '#2a2a2a',
        accent:   '#1e90ff',
        warm:     '#ff6d00',
        text:     '#e2e2e2',
        muted:    '#666666',
        danger:   '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
