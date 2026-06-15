# TOC — Train of Consequences

**TOC** is a Critical Path Method (CPM) diagram editor. Build project networks from stations (milestones) and activities, and the CPM engine highlights the critical path in real time.

Available as a **web app** (browser / Docker) and a **desktop app** (Windows installer, macOS DMG, Linux AppImage via Electron).

![Mobile App Launch example diagram](examples/mobile-app-launch-preview.svg)

> *Example: Mobile App Launch — 9 stations, 3 lines, 47-day critical path through the backend branch.*  
> Load it yourself: **Load → `examples/mobile-app-launch.json`**

## Features

- Interactive SVG canvas — drag stations, click or drag to connect activities
- Multiple named path lines, each with its own colour
- Real-time CPM engine — forward/backward pass, float, critical path detection
- Critical path focus mode — click the stat counter to dim non-critical elements
- Mark activities as **in progress** — animated green marching-ants overlay
- Mark one station as **Start** (green ring) and one as **Target** (amber ring)
- Light / dark theme toggle
- Export diagram as **PNG** (2× resolution, clean background — ready for PowerPoint and email)
- Delete selected element with the **Del** key; **Esc** to deselect
- JSON save / load and automatic `localStorage` persistence
- Desktop installer (Electron) and Docker-ready web container

---

## Web App — Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the app in your browser at the URL shown in the terminal.

### Production build

```bash
npm run build
npm run preview
```

---

## Desktop App — Electron

### Development

```bash
npm run electron:dev
```

Starts the Vite dev server and Electron side-by-side with hot reload.

### Build installer

```bash
npm run electron:build
```

Outputs to `dist-electron/`:

| Platform | Output |
|----------|--------|
| Windows | `Train of Consequences Setup 1.0.0.exe` (NSIS, x64) |
| macOS | `Train of Consequences-1.0.0.dmg` |
| Linux | `Train of Consequences-1.0.0.AppImage` |

The Windows installer lets the user choose the install directory, creates a desktop shortcut and a Start Menu entry.

---

## Docker

Build and run the web app in a container:

```bash
docker build -t toc-editor .
docker run --rm -p 4173:4173 toc-editor
```

Open `http://localhost:4173` in your browser.

---

## Repository Structure

```
src/               Application source (React + Vite)
electron/          Electron main process (main.cjs, preload.cjs)
examples/          Sample diagram JSON + SVG preview
dist/              Web production build (generated)
dist-electron/     Desktop installer output (generated)
Dockerfile         Docker container definition
```

---

## Author

**David Avanzini**  
[LinkedIn](https://www.linkedin.com/in/davidavanzini/) · [GitHub](https://github.com/DavidAvanzini/TOC)

MIT License © 2026 David Avanzini
