import { invoke } from '@tauri-apps/api/core';
import type { Timebox, TimeboxWithSessions, Session, CreateTimeboxRequest, UpdateTimeboxRequest, ReorderTimeboxRequest } from './types';

export const commands = {
  createTimebox: (request: CreateTimeboxRequest) =>
    invoke<Timebox>('create_timebox', { request }),

  updateTimebox: (id: number, request: UpdateTimeboxRequest) =>
    invoke<Timebox>('update_timebox', { id, request }),

  startTimebox: (id: number) =>
    invoke<Timebox>('start_timebox', { id }),

  stopTimebox: (id: number) =>
    invoke<Timebox>('stop_timebox', { id }),

  finishTimebox: (id: number) =>
    invoke<Timebox>('finish_timebox', { id }),

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

  reorderTimeboxes: (orders: ReorderTimeboxRequest[]) =>
    invoke<void>('reorder_timeboxes', { orders }),

  archiveTimebox: (id: number) =>
    invoke<Timebox>('archive_timebox', { id }),

  unarchiveTimebox: (id: number) =>
    invoke<Timebox>('unarchive_timebox', { id }),

  getArchivedTimeboxes: () =>
    invoke<TimeboxWithSessions[]>('get_archived_timeboxes'),
};
