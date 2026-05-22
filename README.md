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
    *   🕒 **Clock / Weather:** Dynamic widgets.
    *   🎨 **Color Block:** Solid color backgrounds and overlays.
*   **Playlist Media Type:** Group multiple videos and images into a single layer that automatically sequences and loops based on custom durations.

### Project Management (.ulp)
*   Save and load entire layout configurations using our proprietary **`.ulp` (Uapic LED Player)** project extension.
*   Double-click a `.ulp` file to instantly launch the player with your pre-configured campaign.

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
4. Generates an installer and a portable `.exe` inside the `dist-electron/` folder.

---

## 🛠️ Tech Stack
*   **Core:** Electron (Node.js + Chromium)
*   **Frontend:** React 19, Zustand (State Management)
*   **Styling:** Vanilla CSS (Dark mode / Professional aesthetic)
*   **Bundler:** Vite
*   **Packaging:** Electron Builder
