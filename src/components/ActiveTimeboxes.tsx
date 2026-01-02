import type { TimeboxWithSessions } from '../lib/types';
import { commands } from '../lib/commands';
import { Timer } from './Timer';

interface ActiveTimeboxesProps {
  timeboxes: TimeboxWithSessions[];
  getTimer: (id: number) => { remainingSeconds: number; isExpired: boolean } | undefined;
  formatTime: (seconds: number) => string;
  onUpdate: () => void;
}

export function ActiveTimeboxes({
  timeboxes,
  getTimer,
  formatTime,
  onUpdate,
}: ActiveTimeboxesProps) {
  if (timeboxes.length === 0) return null;

  const handleStop = async (id: number) => {
    try {
      await commands.stopTimebox(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to stop timebox:', error);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await commands.cancelTimebox(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to cancel timebox:', error);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-300 mb-3">Active</h2>
      <div className="space-y-3">
        {timeboxes.map((timebox) => {
          const timer = getTimer(timebox.id);
          return (
            <div
              key={timebox.id}
              className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-100">{timebox.intention}</p>
                <p className="text-sm text-gray-400">
                  {timebox.intended_duration} min target
                </p>
              </div>

              <div className="flex items-center gap-4">
                {timer && (
                  <Timer remainingSeconds={timer.remainingSeconds} formatTime={formatTime} />
                )}

                <button
                  onClick={() => handleStop(timebox.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Stop
                </button>
                <button
                  onClick={() => handleCancel(timebox.id)}
                  className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
