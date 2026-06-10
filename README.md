# TOC — Critical Path Diagram Editor

This repository contains the source code for a Critical Path Diagram editor called **TOC (Train OF Consequences)**.

The editor is built with React and Vite and allows you to create milestones, connect them with activities, manage path lines, and visualize the critical path using CPM analysis.

## Features

- Interactive SVG canvas with milestone drag-and-drop
- Add milestones and draw activities between them
- Define and manage multiple path lines
- Critical path highlighting and CPM analysis
- JSON save/load diagram support
- Local storage autosave
- Docker-ready development container

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the app in your browser at the URL shown in the terminal.

## Build

Create a production build:

```bash
npm run build
```

## Docker

Build the Docker image:

```bash
docker build -t toc-editor .
```

Run the app in Docker:

```bash
docker run --rm -p 4173:4173 toc-editor
```

Open `http://localhost:4173` in your browser.

## Repository Structure

- `src/` — application source code
- `index.html` — Vite application entry
- `package.json` — project dependencies and scripts
- `vite.config.ts` — Vite configuration
- `.dockerignore` — Docker build ignore rules
- `Dockerfile` — container build instructions
- `README.md` — this file
- `CLAUDE.MD` — implementation notes and summary

## Notes

The primary application files are now located in the repository root, not inside a nested `Critical Path Diagram UI` folder.
  