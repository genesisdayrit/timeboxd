export type TimeboxStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'stopped';

export interface Timebox {
  id: number;
  intention: string;
  notes?: string;
  intended_duration: number;
  status: TimeboxStatus;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  after_time_stopped_at?: string;
  deleted_at?: string;
  canceled_at?: string;
}

export interface Session {
  id: number;
  timebox_id: number;
  start_time: string;
  end_time: string | null;
  end_reason: 'completed' | 'manual_stop' | 'auto_expired' | 'cancelled' | null;
  created_at: string;
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
