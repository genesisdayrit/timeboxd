# timeboxd

A desktop timebox tracking app built with Tauri, React, and TypeScript.

## Features

- Create timeboxes with description and duration (5, 15, 45 min presets + custom)
- Run multiple timeboxes simultaneously
- Auto-complete when timer expires
- Track sessions with start/stop times
- View all timeboxes for the current day
- Dark mode UI

## Tech Stack

- **Backend:** Tauri v2 + Rust + rusqlite
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Database:** SQLite

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```
