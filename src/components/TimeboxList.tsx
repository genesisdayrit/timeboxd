import type { TimeboxWithSessions } from '../lib/types';
import { TimeboxCard } from './TimeboxCard';

interface TimeboxListProps {
  timeboxes: TimeboxWithSessions[];
  onUpdate: () => void;
}

export function TimeboxList({ timeboxes, onUpdate }: TimeboxListProps) {
  // Filter out in_progress timeboxes (they're shown in ActiveTimeboxes)
  const nonActiveTimeboxes = timeboxes.filter((t) => t.status !== 'in_progress');

  if (nonActiveTimeboxes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No timeboxes for today yet. Create one above!
      </div>
    );
  }

  const notStarted = nonActiveTimeboxes.filter((t) => t.status === 'not_started');
  const paused = nonActiveTimeboxes.filter((t) => t.status === 'paused');
  const completed = nonActiveTimeboxes.filter((t) => t.status === 'completed');
  const stopped = nonActiveTimeboxes.filter((t) => t.status === 'stopped');
  const cancelled = nonActiveTimeboxes.filter((t) => t.status === 'cancelled');

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

      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Completed</h2>
          <div className="space-y-2">
            {completed.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {stopped.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Stopped</h2>
          <div className="space-y-2">
            {stopped.map((timebox) => (
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
    </div>
  );
}
