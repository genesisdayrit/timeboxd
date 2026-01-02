import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimeboxWithSessions } from '../lib/types';
import { commands } from '../lib/commands';

interface TimerState {
  timeboxId: number;
  sessionId: number;
  remainingSeconds: number;
  isExpired: boolean;
}

export function useTimers(activeTimeboxes: TimeboxWithSessions[], onExpire: () => void) {
  const [timers, setTimers] = useState<Map<number, TimerState>>(new Map());
  const expiredRef = useRef<Set<number>>(new Set());

  const calculateRemainingSeconds = useCallback((timebox: TimeboxWithSessions): number => {
    const activeSession = timebox.sessions.find(s => s.stopped_at === null && s.cancelled_at === null);
    if (!activeSession) return 0;

    // Calculate time spent in the current active session
    const sessionStartTime = new Date(activeSession.started_at).getTime();
    const now = Date.now();
    const currentSessionSeconds = Math.floor((now - sessionStartTime) / 1000);

    // Total intended duration in seconds
    const intendedSeconds = timebox.intended_duration * 60;

    // actual_duration already includes time from completed sessions (in seconds)
    // We need to add the current session's elapsed time to get total elapsed
    const totalElapsedSeconds = timebox.actual_duration + currentSessionSeconds;

    return Math.floor(intendedSeconds - totalElapsedSeconds);
  }, []);

  // Initialize timers when active timeboxes change
  useEffect(() => {
    const newTimers = new Map<number, TimerState>();

    for (const timebox of activeTimeboxes) {
      const activeSession = timebox.sessions.find(s => s.stopped_at === null && s.cancelled_at === null);
      if (activeSession) {
        const remaining = calculateRemainingSeconds(timebox);
        newTimers.set(timebox.id, {
          timeboxId: timebox.id,
          sessionId: activeSession.id,
          remainingSeconds: remaining,
          isExpired: remaining <= 0,
        });
      }
    }

    setTimers(newTimers);
  }, [activeTimeboxes, calculateRemainingSeconds]);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = new Map(prev);
        let hasChanges = false;

        for (const [id, timer] of next) {
          const newRemaining = timer.remainingSeconds - 1;
          const wasExpired = timer.isExpired;
          const isNowExpired = newRemaining <= 0;

          if (newRemaining !== timer.remainingSeconds) {
            hasChanges = true;
            next.set(id, {
              ...timer,
              remainingSeconds: newRemaining,
              isExpired: isNowExpired,
            });

            // Auto-expire when timer hits zero
            if (!wasExpired && isNowExpired && !expiredRef.current.has(timer.sessionId)) {
              expiredRef.current.add(timer.sessionId);
              commands.expireSession(timer.sessionId).then(() => {
                onExpire();
              });
            }
          }
        }

        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onExpire]);

  // Clear expired refs when activeTimeboxes changes
  useEffect(() => {
    const activeSessionIds = new Set(
      activeTimeboxes
        .flatMap(t => t.sessions)
        .filter(s => s.stopped_at === null && s.cancelled_at === null)
        .map(s => s.id)
    );

    expiredRef.current = new Set(
      [...expiredRef.current].filter(id => activeSessionIds.has(id))
    );
  }, [activeTimeboxes]);

  const getTimer = useCallback((timeboxId: number): TimerState | undefined => {
    return timers.get(timeboxId);
  }, [timers]);

  const formatTime = useCallback((seconds: number): string => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return { timers, getTimer, formatTime };
}
