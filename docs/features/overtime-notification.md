# Overtime Notification

Sends a system notification when a timebox first goes into overtime.

## Overview

When an active timebox's timer expires (estimated time has ended), the app sends a system notification to inform the user. This helps users stay aware of their time without requiring them to constantly watch the app.

## Behavior

### When It Triggers

A notification is sent when:

1. A timebox has an active session (status = `in_progress`)
2. The timer crosses from positive to negative (remaining time becomes negative)
3. The timebox has not already received an overtime notification this session

### Notification Content

- **Title**: "Estimated Session Time has Ended"
- **Body**: `"[intention]" is now [duration] over time.`

Example: `"Fix login bug" is now 2m 30s over time.`

### Deduplication

Each timebox only receives one overtime notification per active session. The notification state is tracked in memory and reset when:

- The timebox is stopped or completed
- The timebox is no longer in the active list

This prevents notification spam if the user continues working past their estimated time.

## Technical Implementation

### Frontend (React/TypeScript)

| File | Description |
|------|-------------|
| `src/hooks/useOvertimeNotification.ts` | Hook that monitors timers and sends notifications |
| `src/App.tsx` | Integrates the hook with timer state |

### Key Logic

```typescript
// Check for newly expired timers
for (const [timeboxId, timer] of timers) {
  if (timer.remainingSeconds < 0 && !notifiedTimeboxesRef.current.has(timeboxId)) {
    // Send notification once
    notifiedTimeboxesRef.current.add(timeboxId);
    showOvertimeNotification(timebox.intention, timer.remainingSeconds);
  }
}
```

### Notification API

Uses `@tauri-apps/plugin-notification` for native system notifications:

1. Checks if permission is granted
2. Requests permission if needed
3. Sends notification via `sendNotification()`

## Text Handling

- **Intention truncation**: Long intentions are truncated to 50 characters with `...` to fit notification limits
- **Duration formatting**: Shows minutes and seconds (e.g., "2m 30s") or just seconds if under a minute (e.g., "45s")

## Requirements

- Notification permissions must be granted by the user
- The app must be running (foreground or background)
- Timer must be actively counting (timebox in `in_progress` status)
