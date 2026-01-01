import { invoke } from '@tauri-apps/api/core';
import type { Timebox, TimeboxWithSessions, Session, CreateTimeboxRequest } from './types';

export const commands = {
  createTimebox: (request: CreateTimeboxRequest) =>
    invoke<Timebox>('create_timebox', { request }),

  startTimebox: (id: number) =>
    invoke<Timebox>('start_timebox', { id }),

  stopTimebox: (id: number) =>
    invoke<Timebox>('stop_timebox', { id }),

  cancelTimebox: (id: number) =>
    invoke<Timebox>('cancel_timebox', { id }),

  deleteTimebox: (id: number) =>
    invoke<void>('delete_timebox', { id }),

  getTodayTimeboxes: () =>
    invoke<TimeboxWithSessions[]>('get_today_timeboxes'),

  getActiveTimeboxes: () =>
    invoke<TimeboxWithSessions[]>('get_active_timeboxes'),

  getSessionsForTimebox: (timeboxId: number) =>
    invoke<Session[]>('get_sessions_for_timebox', { timeboxId }),

  expireSession: (sessionId: number) =>
    invoke<void>('expire_session', { sessionId }),

  getActiveSessionForTimebox: (timeboxId: number) =>
    invoke<Session | null>('get_active_session_for_timebox', { timeboxId }),
};
