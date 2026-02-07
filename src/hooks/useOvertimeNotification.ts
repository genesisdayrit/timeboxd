import { useEffect, useRef, useCallback } from 'react';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import type { TimeboxWithSessions } from '../lib/types';
import { playBeep } from '../lib/beep';

interface TimerState {
  timeboxId: number;
  remainingSeconds: number;
  isExpired: boolean;
}

interface UseOvertimeNotificationOptions {
  timers: Map<number, TimerState>;
  activeTimeboxes: TimeboxWithSessions[];
}

/**
 * Hook that sends a system notification when a timebox first goes into overtime.
 * Only notifies once per timebox session to avoid spamming the user.
 */
export function useOvertimeNotification({
  timers,
  activeTimeboxes,
}: UseOvertimeNotificationOptions) {
  // Track which timeboxes have already received an overtime notification
  const notifiedTimeboxesRef = useRef<Set<number>>(new Set());

  const showOvertimeNotification = useCallback(async (intention: string, overtimeSeconds: number) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        // Format overtime duration
        const overtimeMinutes = Math.floor(Math.abs(overtimeSeconds) / 60);
        const overtimeSecs = Math.abs(overtimeSeconds) % 60;
        const overtimeStr = overtimeMinutes > 0
          ? `${overtimeMinutes}m ${overtimeSecs}s`
          : `${overtimeSecs}s`;

        // Truncate intention if too long for notification
        const maxLength = 50;
        const truncatedIntention = intention.length > maxLength
          ? intention.substring(0, maxLength - 3) + '...'
          : intention;

        await sendNotification({
          title: `Timebox Over: ${truncatedIntention}`,
          body: `Estimated session time has ended. Now ${overtimeStr} over.`,
        });
      }

      // Play beep sound regardless of notification permission
      await playBeep();
    } catch (error) {
      console.error('Failed to send overtime notification:', error);
    }
  }, []);

  // Check for newly expired timers and send notifications
  useEffect(() => {
    for (const [timeboxId, timer] of timers) {
      // Check if this timer just went into overtime and we haven't notified yet
      if (timer.remainingSeconds < 0 && !notifiedTimeboxesRef.current.has(timeboxId)) {
        // Find the timebox to get the intention
        const timebox = activeTimeboxes.find(t => t.id === timeboxId);
        if (timebox) {
          notifiedTimeboxesRef.current.add(timeboxId);
          showOvertimeNotification(timebox.intention, timer.remainingSeconds);
        }
      }
    }
  }, [timers, activeTimeboxes, showOvertimeNotification]);

  // Clean up notified set when timeboxes are no longer active
  useEffect(() => {
    const activeIds = new Set(activeTimeboxes.map(t => t.id));
    notifiedTimeboxesRef.current = new Set(
      [...notifiedTimeboxesRef.current].filter(id => activeIds.has(id))
    );
  }, [activeTimeboxes]);
}
