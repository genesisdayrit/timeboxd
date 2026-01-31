# Auto-Stop on System Idle

Automatically stops active timeboxes when the system has been idle for a configurable duration.

## Overview

When enabled, the app monitors system-wide user activity (keyboard and mouse input). If no activity is detected for the configured timeout period, all in-progress timeboxes are automatically stopped.

## Configuration

Settings are available in **Settings > Auto-Stop Settings**:

- **Stop on idle**: Toggle to enable/disable the feature (enabled by default)
- **Idle timeout**: Duration of inactivity before auto-stop triggers (1-30 minutes, default: 5 minutes)

## How It Works

### Idle Detection

The frontend polls the backend every 30 seconds to check system idle time. On macOS, this uses the Core Graphics API (`CGEventSourceSecondsSinceLastEventType`) for accurate system-wide idle detection that captures all input events regardless of which app is focused.

### Auto-Stop Behavior

When the idle threshold is reached:

1. All timeboxes with `in_progress` status are stopped
2. Each timebox is marked with `auto_stopped_at` timestamp to distinguish from manual stops
3. A system notification is sent: "Timebox Auto-Stopped - Your timebox was automatically stopped due to inactivity"
4. The timebox list is refreshed to reflect the changes

### Return Notification

When the user returns (activity detected after an auto-stop event), an in-app banner appears showing:

- Number of timeboxes that were auto-stopped
- How long ago they were stopped
- The intention of each stopped timebox (up to 3 shown)
- A dismiss button to clear the notification

This banner persists until manually dismissed so users can see what happened while they were away.

## Technical Implementation

### Backend (Rust/Tauri)

| File | Description |
|------|-------------|
| `src-tauri/src/commands/idle.rs` | `get_system_idle_time()` command using macOS Core Graphics API |
| `src-tauri/src/commands/settings.rs` | `get_idle_settings()` and `set_idle_settings()` commands |
| `src-tauri/src/commands/timebox.rs` | `auto_stop_timebox()` command with `auto_stopped_at` marker |
| `src-tauri/src/database.rs` | Migration for `settings` table and `auto_stopped_at` column |

### Frontend (React/TypeScript)

| File | Description |
|------|-------------|
| `src/hooks/useIdleDetection.ts` | Hook that polls idle time and triggers auto-stop |
| `src/components/IdleReturnBanner.tsx` | Banner component shown when user returns |
| `src/pages/IntegrationsPage.tsx` | Settings UI for idle configuration |
| `src/contexts/AppContext.tsx` | State management for idle settings |

## Platform Support

- **macOS**: Full support via Core Graphics API
- **Other platforms**: Idle detection returns 0 (never idle), effectively disabling the feature

## Database Schema

Settings are stored in the `settings` table:

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

Keys used:
- `auto_stop_enabled`: "true" or "false"
- `idle_timeout_minutes`: integer as string (1-30)
