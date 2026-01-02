import type { TimeboxWithSessions } from '../lib/types';
import { TimeboxCard } from './TimeboxCard';

interface TimeboxListProps {
  timeboxes: TimeboxWithSessions[];
  onUpdate: () => void;
  showCompleted: boolean;
}

export function TimeboxList({ timeboxes, onUpdate, showCompleted }: TimeboxListProps) {
  // Filter out in_progress timeboxes (they're shown in ActiveTimeboxes)
  const nonActiveTimeboxes = timeboxes.filter((t) => t.status !== 'in_progress');

  // Separate completed/stopped timeboxes (both treated as completed now)
  const completedTimeboxes = nonActiveTimeboxes.filter(
    (t) => t.status === 'completed' || t.status === 'stopped'
  );
  const pendingTimeboxes = nonActiveTimeboxes.filter(
    (t) => t.status !== 'completed' && t.status !== 'stopped'
  );

  if (pendingTimeboxes.length === 0 && !showCompleted) {
    return (
      <div className="text-center py-8 text-gray-500">
        No timeboxes for today yet. Create one above!
      </div>
    );
  }

  const notStarted = pendingTimeboxes.filter((t) => t.status === 'not_started');
  const paused = pendingTimeboxes.filter((t) => t.status === 'paused');
  const cancelled = pendingTimeboxes.filter((t) => t.status === 'cancelled');

  return (
    <div className="space-y-6">
      {notStarted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Not Started</h2>
          <div className="space-y-2">
            {notStarted.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {paused.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Paused</h2>
          <div className="space-y-2">
            {paused.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Cancelled</h2>
          <div className="space-y-2">
            {cancelled.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {showCompleted && completedTimeboxes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Completed</h2>
          <div className="space-y-2">
            {completedTimeboxes.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
