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
}

export interface UpdateTimeboxRequest {
  intention?: string;
  notes?: string | null;
  intended_duration?: number;
}
