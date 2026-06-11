# TOC — Train of Consequences

A browser-based **Critical Path Method (CPM) diagram editor** built with React + Vite and styled with Tailwind CSS / shadcn-ui components. The design was derived from a Figma prototype located in `Critical Path Diagram UI/`.

---

## What the app does

TOC lets users build, visualise, and analyse project networks made of **stations** (milestones) and **activities** (directed edges between stations). The CPM engine runs automatically on every change and highlights the critical path — the longest chain of dependent activities that determines the minimum project duration.

---

## Core concepts

| Term | Meaning in TOC |
|------|----------------|
| **Station** | A milestone / event node, positioned freely on the canvas. |
| **Activity** | A directed arc from one station to another, carrying a name, duration, and path membership. |
| **Line / Path** | A named, coloured grouping for activities (e.g. "Line A", "Line B"). Activities on the same line share a colour. |
| **Critical Path** | The set of activities with zero total float — computed in real time and rendered as a dashed yellow overlay. |
| **Start / Target** | Optional role markers on stations: one project Start (green double ring) and one Target / end (amber double ring). |

---

## Architecture

```
src/
  main.tsx                  React entry point
  app/
    App.tsx                 Root component — all state lives here
    types.ts                TypeScript interfaces: Milestone, Activity, Path, Diagram, Selection, ConsistencyIssue
    utils/
      cpm.ts                CPM engine (forward pass, backward pass, float, cycle detection)
    components/
      Toolbar.tsx           Top bar: title input, tool selector, active-line picker, critical toggle, theme toggle, export, file actions
      DiagramCanvas.tsx     SVG canvas: drag/click-to-connect stations, pan/zoom, role badges, ongoing overlays
      EditPanel.tsx         Right panel: tabbed editor for the selected element, path manager, consistency checker
      ui/                   shadcn-ui primitive components (buttons, inputs, dialogs, etc.)
      figma/
        ImageWithFallback.tsx  Figma-generated image helper
  styles/                   Tailwind, theme, and font CSS files
examples/
  mobile-app-launch.json          Sample diagram (9 stations, 3 lines, 47-day critical path)
  mobile-app-launch-preview.svg   SVG preview image used in README
```

---

## State management

All diagram state is held in a single `Diagram` object in `App.tsx` and persisted to **`localStorage`** (key: `toc-diagram`) on every change. On load, the saved state is restored automatically. There is no backend.

`computedActivities` and `consistencyIssues` are derived with `useMemo` — never stored, always recalculated.

### Data model highlights (`src/app/types.ts`)

```ts
interface Activity {
  // ...core fields...
  isOngoing?: boolean;          // renders animated green marching-ants overlay
}

interface Diagram {
  // ...core fields...
  startMilestoneId?: string | null;   // green double ring + START badge
  endMilestoneId?:   string | null;   // amber double ring + TARGET badge
}
```

---

## CPM engine (`src/app/utils/cpm.ts`)

1. **Validation** — filters out activities with invalid milestone references or self-loops.
2. **Topological sort** — Kahn's algorithm on the milestone graph.
3. **Forward pass** — computes `earlyStart` / `earlyFinish` for every activity.
4. **Backward pass** — computes `lateStart` / `lateFinish` from the project end date.
5. **Float & criticality** — `totalFloat = lateStart − earlyStart`; activities with `totalFloat === 0` are critical.

`checkConsistency` additionally reports: missing milestone/path references, self-loop activities, non-positive durations, cycle detection (DFS), and isolated milestones.

---

## UI layout

```
┌──────────────────────────────────────────────────────────────┐
│  Toolbar (title · tools · active line · critical toggle · theme · export · file) │
├──────────────────────────────────────────────────────────────┤
│  Path legend (clickable)              stats · ongoing · critical focus │
├──────────────────────────────┬───────────────────────────────┤
│                              │  Edit Panel (right sidebar)   │
│       DiagramCanvas (SVG)    │  ┌─ Element ─ Paths ─ Check ─┐ │
│                              │  │  selected item editor      │ │
│                              │  └────────────────────────────┘ │
└──────────────────────────────┴───────────────────────────────┘
```

---

## Tools

| Tool | Toolbar button | Interaction |
|------|---------------|-------------|
| **Select** | MousePointer | Click to select stations/activities; drag stations to reposition; Del to delete selection; Esc to deselect |
| **Station** | Circle | Click on the canvas to place a new station |
| **Activity** | GitCommitHorizontal | Drag from one station to another, **or** click first station then click second; uses the active line colour; Esc cancels in-progress connection |

---

## File actions

| Action | Behaviour |
|--------|-----------|
| **New** | Resets to the built-in sample diagram (with confirmation prompt) |
| **Save** | Downloads the diagram as `<title>.json` |
| **Load** | Opens a JSON file and replaces the current diagram |
| **Export PNG** | Renders canvas at 2× resolution with clean background — ready for PowerPoint and email |

---

## Canvas features

| Feature | Detail |
|---------|--------|
| **Pan** | Click-drag on empty canvas |
| **Zoom** | Mouse wheel |
| **Critical path focus** | Click the "N critical" stat counter to dim non-critical elements; click again or press Esc to exit |
| **Ongoing activities** | Toggle "In progress" in the activity editor → animated green marching-ants overlay |
| **Start / Target roles** | Select a station → click ▶ Start or ◼ Target in the editor; only one of each per project |
| **Theme** | Light / dark toggle in the toolbar |

---

## Docker

The app is built with Vite and served with Vite's preview server inside a container.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
```

```bash
docker build -t toc-editor .
docker run --rm -p 4173:4173 toc-editor
# open http://localhost:4173
```

---

## Tech stack

| Layer | Library / version |
|-------|------------------|
| UI framework | React 18 |
| Build tool | Vite 6 + `@vitejs/plugin-react` |
| Styling | Tailwind CSS 4 + `tw-animate-css` |
| Component primitives | Radix UI + shadcn-ui wrappers |
| Icons | lucide-react |
| Drag & drop | react-dnd + HTML5 backend |
| Package manager | npm |

---

## Key files for future changes

- **Add a new diagram algorithm** → `src/app/utils/cpm.ts`
- **Change canvas rendering** → `src/app/components/DiagramCanvas.tsx`
- **Add toolbar actions** → `src/app/components/Toolbar.tsx`
- **Add edit panel tabs** → `src/app/components/EditPanel.tsx`
- **Change data model** → `src/app/types.ts` (then update `App.tsx` and `cpm.ts`)
- **Change container startup** → `Dockerfile` + `package.json` `preview` script
- **Add/edit example diagrams** → `examples/`
