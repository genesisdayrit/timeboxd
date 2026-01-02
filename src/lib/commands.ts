import { invoke } from '@tauri-apps/api/core';
import type { Timebox, TimeboxWithSessions, Session, CreateTimeboxRequest, UpdateTimeboxRequest, ReorderTimeboxRequest, Integration, CreateIntegrationRequest, LinearTestResult, TodoistTestResult, LinearTeam, LinearApiProject, LinearProject, SaveLinearProjectRequest } from './types';

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

  // Integration commands
  createIntegration: (request: CreateIntegrationRequest) =>
    invoke<Integration>('create_integration', { request }),

  getIntegrations: () =>
    invoke<Integration[]>('get_integrations'),

  getIntegrationByType: (integrationType: string) =>
    invoke<Integration | null>('get_integration_by_type', { integrationType }),

  deleteIntegration: (id: number) =>
    invoke<void>('delete_integration', { id }),

  testLinearConnection: (apiKey: string) =>
    invoke<LinearTestResult>('test_linear_connection', { apiKey }),

  testTodoistConnection: (apiToken: string) =>
    invoke<TodoistTestResult>('test_todoist_connection', { apiToken }),

  // Linear project commands
  getLinearTeams: (apiKey: string) =>
    invoke<LinearTeam[]>('get_linear_teams', { apiKey }),

  getLinearTeamProjects: (apiKey: string, teamId: string) =>
    invoke<LinearApiProject[]>('get_linear_team_projects', { apiKey, teamId }),

  saveLinearProject: (request: SaveLinearProjectRequest) =>
    invoke<LinearProject>('save_linear_project', { request }),

  toggleLinearProjectActive: (linearProjectId: string, isActive: boolean) =>
    invoke<void>('toggle_linear_project_active', { linearProjectId, isActive }),

  getLinearProjects: () =>
    invoke<LinearProject[]>('get_linear_projects'),

  getActiveTimeboxProjects: () =>
    invoke<LinearProject[]>('get_active_timebox_projects'),

  archiveLinearProject: (linearProjectId: string) =>
    invoke<void>('archive_linear_project', { linearProjectId }),

  deleteLinearProject: (linearProjectId: string) =>
    invoke<void>('delete_linear_project', { linearProjectId }),
};
