import { useEffect, useRef, useCallback, useState } from 'react';
import { commands } from '../lib/commands';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import type { TimeboxWithSessions, IdleSettings } from '../lib/types';

export interface AutoStoppedInfo {
  timeboxes: { id: number; intention: string }[];
  stoppedAt: Date;
}

interface UseIdleDetectionOptions {
  activeTimeboxes: TimeboxWithSessions[];
  idleSettings: IdleSettings;
  onAutoStop: () => void;
}

export function useIdleDetection({
  activeTimeboxes,
  idleSettings,
  onAutoStop,
}: UseIdleDetectionOptions) {
  const checkIntervalRef = useRef<number | null>(null);
  const hasAutoStoppedRef = useRef(false);

  // Track auto-stopped timeboxes for return notification
  const [autoStoppedInfo, setAutoStoppedInfo] = useState<AutoStoppedInfo | null>(null);

  const dismissNotification = useCallback(() => {
    setAutoStoppedInfo(null);
  }, []);

  const showSystemNotification = useCallback(async (timeboxCount: number) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (permissionGranted) {
        await sendNotification({
          title: 'Timebox Auto-Stopped',
          body: timeboxCount === 1
            ? 'Your timebox was automatically stopped due to inactivity.'
            : `${timeboxCount} timeboxes were automatically stopped due to inactivity.`,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, []);

  const checkIdleAndStop = useCallback(async () => {
    if (!idleSettings.enabled) {
      hasAutoStoppedRef.current = false;
      return;
    }

    // Get timeboxes that are actively running (in_progress status)
    const inProgressTimeboxes = activeTimeboxes.filter(
      (t) => t.status === 'in_progress'
    );

    try {
      const idleSeconds = await commands.getSystemIdleTime();
      const thresholdSeconds = idleSettings.timeout_minutes * 60;

      if (idleSeconds >= thresholdSeconds && !hasAutoStoppedRef.current && inProgressTimeboxes.length > 0) {
        // Auto-stop all in_progress timeboxes
        const stopPromises = inProgressTimeboxes.map((timebox) =>
          commands.autoStopTimebox(timebox.id)
        );
        await Promise.all(stopPromises);

        hasAutoStoppedRef.current = true;

        // Store info about what was stopped for return notification
        setAutoStoppedInfo({
          timeboxes: inProgressTimeboxes.map(t => ({ id: t.id, intention: t.intention })),
          stoppedAt: new Date(),
        });

        // Show system notification
        await showSystemNotification(inProgressTimeboxes.length);

        // Trigger refresh of timebox data
        onAutoStop();
      } else if (idleSeconds < thresholdSeconds && hasAutoStoppedRef.current) {
        // User is active again, reset flag
        // The autoStoppedInfo stays until dismissed so user sees the return notification
        hasAutoStoppedRef.current = false;
      }
    } catch (error) {
      console.error('Failed to check idle time:', error);
    }
  }, [activeTimeboxes, idleSettings, onAutoStop, showSystemNotification]);

  useEffect(() => {
    // Check every 30 seconds
    checkIntervalRef.current = window.setInterval(checkIdleAndStop, 30000);

    // Also check immediately on mount
    checkIdleAndStop();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkIdleAndStop]);

  return {
    autoStoppedInfo,
    dismissNotification,
  };
}
