# Hourly

A weekly template planner built with vanilla HTML, CSS, and JavaScript — no framework. Plan a generic week by painting 30-minute time blocks across Mon–Sun.

## Features

- **Template-based** — one persistent weekly schedule, not tied to real calendar dates
- **Category system** — create named categories with custom colors; durations tracked per category
- **Paint to fill** — select a category in the sidebar, then click or drag across the grid to fill blocks
- **Multi-day drag** — drag diagonally to fill a rectangular range across multiple days and time slots
- **Right-click to remove** — right-click any filled block to erase it instantly
- **Eraser tool** — drag-erase multiple blocks at once
- **Persistent** — all data stored in `localStorage`; survives page refresh
- **Reset** — clear the entire template while keeping categories intact

## Stack

| Tool | Role |
|------|------|
| [Bun](https://bun.sh) | Package manager & script runner |
| [Vite](https://vitejs.dev) | Dev server & bundler |
| Vanilla JS / CSS / HTML | No framework |

## Getting started

```bash
bun install
bun run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Preview the production build locally |

## Usage

1. Click **+ Add** in the sidebar to create a category and give it a color.
2. Click the category in the sidebar to select it as your active brush.
3. Click or drag across the week grid to fill time blocks.
4. Drag across multiple days to fill a rectangular range at once.
5. Right-click a filled block to remove it, or use the **Eraser** tool to drag-erase.
6. The sidebar shows a weekly duration total per category.
7. Use **Reset template** in the header to clear all blocks (categories are preserved).

## Docker

Build and run a production image with nginx:

```bash
docker build -t hourly .
docker run -p 8080:80 hourly
```

Then open [http://localhost:8080](http://localhost:8080).

The image uses a two-stage build — Bun compiles the app in the first stage, and only the static `dist/` is copied into a minimal `nginx:alpine` image. Final image size is ~25 MB.

## Data storage

Everything is stored in `localStorage` under two keys:

| Key | Contents |
|-----|----------|
| `hourly-template-v1` | Time block entries for each day (index 0–6) |
| `hourly-categories-v1` | Category definitions `{ id → { name, color } }` |
