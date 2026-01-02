import type { TimeboxWithSessions } from '../lib/types';
import { commands } from '../lib/commands';

interface TimeboxCardProps {
  timebox: TimeboxWithSessions;
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  not_started: 'bg-yellow-900/50 text-yellow-300',
  in_progress: 'bg-green-900/50 text-green-300',
  paused: 'bg-orange-900/50 text-orange-300',
  completed: 'bg-blue-900/50 text-blue-300',
  stopped: 'bg-purple-900/50 text-purple-300',
  cancelled: 'bg-gray-700 text-gray-400',
};

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
};

export function TimeboxCard({ timebox, onUpdate }: TimeboxCardProps) {
  const handleStart = async () => {
    try {
      await commands.startTimebox(timebox.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to start timebox:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await commands.deleteTimebox(timebox.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete timebox:', error);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    return `${minutes.toFixed(1)} min`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-gray-100">{timebox.intention}</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              statusColors[timebox.status] || statusColors.not_started
            }`}
          >
            {statusLabels[timebox.status] || timebox.status}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Target: {formatDuration(timebox.intended_duration)} | Actual:{' '}
          {formatDuration(timebox.actual_duration)}
        </p>
        {timebox.sessions.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {timebox.sessions.length} session{timebox.sessions.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {(timebox.status === 'not_started' || timebox.status === 'paused') && (
          <button
            onClick={handleStart}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            Start
          </button>
        )}
        {(timebox.status === 'completed' || timebox.status === 'cancelled' || timebox.status === 'stopped') && (
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
