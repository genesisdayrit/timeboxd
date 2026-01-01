export interface Timebox {
  id: number;
  description: string;
  intended_duration: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
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
  description: string;
  intended_duration: number;
}
