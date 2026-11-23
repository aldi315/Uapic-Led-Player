# Uapic LED Player

A professional, dual-window digital signage and LED display player built with **Electron**, **React**, and **Vite**. 

Uapic LED Player is designed specifically for controlling Videotrons, LED matrix screens, and digital kiosks. It separates the control UI from the playback canvas to ensure uninterrupted, hardware-accelerated playback on secondary displays.

## 🌟 Key Features

### Dual-Window Architecture
*   **Control Panel Window:** A fully-featured drag-and-drop editor to orchestrate your scenes, modify object properties, and monitor live playback.
*   **Player Window:** A frameless, borderless, always-on-top rendering canvas optimized for GPU acceleration. Perfect for throwing onto an extended display (the actual LED screen).

### Advanced Playback Engine
*   **Multi-Layer Canvas:** Freely add, arrange, and overlap multiple media layers using X/Y coordinates and Z-index stacking.
*   **8-Point Resizing:** Drag and resize any media object directly on the editor canvas for pixel-perfect positioning.
*   **Rich Media Support:**
    *   🎥 **Video:** Hardware-accelerated local video playback.
    *   🖼️ **Image:** High-res image rendering.
    *   📜 **Running Text:** Smooth, marquee-style scrolling text (ticker).
    *   📝 **Static Text:** Custom fonts, sizes, and colors.
    *   🌐 **HTML:** Embed live web pages and dashboards.
    *   📺 **YouTube:** Stream YouTube videos, live streams and playlists.
    *   🕒 **Clock / Weather:** Dynamic widgets.
    *   🎨 **Color Block:** Solid color backgrounds and overlays.
*   **Playlist Media Type:** Group multiple videos and images into a single layer that automatically sequences and loops based on custom durations.

### Editor
*   **WYSIWYG preview:** the editor canvas uses the same renderers as the output window.
*   **Snapping & guides** to canvas edges/centre and other objects (hold `Alt` to bypass), optional grid.
*   **Shift-drag** locks the axis; **Shift + corner** resizes keeping the aspect ratio.
*   **Undo / redo** (100 steps), copy / cut / paste / duplicate, arrow-key nudging, lock & hide layers, drag-to-reorder layers.
*   **Drag & drop** video/image files from Explorer onto the canvas (or a `.ulp` to open it).
*   **Align tools**, canvas resolution presets (Full HD, 4K, portrait, LED strips…).
*   **Live mode** mirrors every edit to the output instantly; or use **PUSH** (`F5`).

### Output Window
*   Choose the target monitor from **Player → Send output to display**, toggle fullscreen / always-on-top / visibility.
*   **Scaling modes:** 1:1 (window sized to the canvas), Fit (keep aspect) or Stretch.
*   Optional hidden mouse cursor; `F11` toggles fullscreen and `Esc` leaves it.

### Widgets
*   **Weather** uses live data from [Open-Meteo](https://open-meteo.com) (no API key; city name or `lat,lon`).
*   **Clock** with timezone, 12/24h, seconds and date line.
*   **HTML** widget: inline HTML code or a full web page URL.
*   **YouTube** widget: paste a video, `/live/…`, playlist or channel (`UC…`) link. Muted autoplay by default; Play / Pause / Stop in the editor control it. Internet required, and some videos block embedding.

### Project Management (.ulp)
*   Save and load entire layout configurations using the **`.ulp` (Uapic LED Player)** project extension.
*   Unsaved-changes protection on New / Open / Exit, recent files list, atomic saves.
*   Double-click a `.ulp` file to open it (re-uses the running instance).

---

## 🚀 Development Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone or download this repository.
2. Open terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To launch the app in development mode with Hot-Module Replacement (HMR):
```bash
npm run dev
```

To run the production build locally without packaging:
```bash
npm start
```

### Keyboard shortcuts
See **Help → Keyboard Shortcuts** inside the app. The most used: `Ctrl+S` save, `Ctrl+Z/Y` undo/redo,
`Ctrl+D` duplicate, `Del` delete, arrows nudge, `F5` push to output, `Ctrl+0` fit canvas.

---

## 📦 Building for Production (.exe)

When you are ready to deploy the application to a client's computer, you can compile it into a standalone Windows Executable (`.exe`).

Run the following command:
```bash
npm run build
```

**What this does:**
1. Uses Vite to bundle and minify all React UI and engine code.
2. Uses `electron-builder` to package the Node/Electron runtime alongside your app.
3. Associates the `.ulp` extension with the Windows OS.
4. Generates an installer and a portable `.exe` inside the `release/` folder.

---

## 🛠️ Tech Stack
*   **Core:** Electron (Node.js + Chromium)
*   **Frontend:** React 19, Zustand (State Management)
*   **Styling:** CSS (dark professional theme) + Tailwind base
*   **Bundler:** Vite
*   **Packaging:** Electron Builder
