export type TimeboxStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'stopped';

export interface Timebox {
  id: number;
  intention: string;
  notes: string | null;
  intended_duration: number;
  status: TimeboxStatus;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  after_time_stopped_at?: string;
  deleted_at?: string;
  canceled_at?: string;
  display_order?: number;
  archived_at?: string;
  finished_at?: string;
  linear_project_id?: number;
  linear_issue_id?: string;
  linear_issue_identifier?: string;
  linear_issue_url?: string;
}

export interface ReorderTimeboxRequest {
  id: number;
  display_order: number;
}

export interface Session {
  id: number;
  timebox_id: number;
  started_at: string;
  stopped_at: string | null;
  cancelled_at: string | null;
}

export interface TimeboxWithSessions extends Timebox {
  sessions: Session[];
  actual_duration: number;
}

export interface CreateTimeboxRequest {
  intention: string;
  intended_duration: number;
  notes?: string;
  linear_project_id?: number;
  linear_issue_id?: string;
  linear_issue_identifier?: string;
  linear_issue_url?: string;
}

export interface UpdateTimeboxRequest {
  intention?: string;
  notes?: string | null;
  intended_duration?: number;
}

// Integration types
export type IntegrationType = 'linear' | 'todoist';

export interface Integration {
  id: number;
  connection_name: string;
  integration_type: IntegrationType;
  connection_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateIntegrationRequest {
  connection_name: string;
  integration_type: IntegrationType;
  connection_config: Record<string, unknown>;
}

export interface LinearConfig {
  api_key: string;
  open_in_native_app?: boolean;
}

export interface LinearTestResult {
  success: boolean;
  user_name: string | null;
  user_email: string | null;
  error: string | null;
}

export interface TodoistTestResult {
  success: boolean;
  user_name: string | null;
  error: string | null;
}

export interface LinearTeam {
  id: string;
  name: string;
}

export interface LinearApiProject {
  id: string;
  name: string;
  description: string | null;
  state: string | null;
}

export interface LinearProject {
  id: number;
  linear_project_id: string;
  linear_team_id: string;
  name: string;
  description: string | null;
  state: string | null;
  is_active_timebox_project: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
}

// Represents a selected Linear project (from API or local DB)
// Used for issue creation - only needs API-level IDs
export interface SelectedLinearProject {
  linearProjectId: string;   // Linear API project ID (required for createLinearIssue)
  linearTeamId: string;      // Linear API team ID (required)
  name: string;              // Display name
  localDbId?: number;        // Optional - present if project is saved locally
}

export interface SaveLinearProjectRequest {
  linear_project_id: string;
  linear_team_id: string;
  name: string;
  description?: string;
  state?: string;
}

// Linear Issue types
export interface LinearIssue {
  id: string;
  identifier: string;
  url: string;
  title: string;
}

export interface CreateLinearIssueRequest {
  title: string;
  description?: string;
  project_id: string;
  team_id: string;
}

export interface CreateLinearIssueResult {
  success: boolean;
  issue?: LinearIssue;
  error?: string;
}

// LinearTeamWorkflowState is used for fetching team workflow states (without color)
export interface LinearTeamWorkflowState {
  id: string;
  name: string;
  state_type: string;
}

// Linear Issue types for project issues view
export interface LinearWorkflowState {
  id: string;
  name: string;
  color: string;
  state_type: string; // "backlog" | "unstarted" | "started" | "completed" | "canceled"
}

export interface LinearUser {
  id: string;
  name: string;
  email: string | null;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearApiIssue {
  id: string;
  identifier: string; // e.g., "ENG-123"
  title: string;
  description: string | null;
  url: string;
  priority: number | null; // 0-4 (0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)
  priority_label: string | null;
  due_date: string | null;
  estimate: number | null;
  state: LinearWorkflowState | null;
  assignee: LinearUser | null;
  labels: { nodes: LinearLabel[] } | null;
}
