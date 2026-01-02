import { useState, useEffect, useRef } from 'react';
import type { TimeboxWithSessions } from '../lib/types';
import { commands } from '../lib/commands';
import { MarkdownEditor } from './MarkdownEditor';

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
  // Editable when not_started or paused
  const isEditable = timebox.status === 'not_started' || timebox.status === 'paused';

  // Local state for editable fields
  const [intention, setIntention] = useState(timebox.intention);
  const [notes, setNotes] = useState(timebox.notes ?? '');
  const [duration, setDuration] = useState(timebox.intended_duration);

  // Edit mode state
  const [isEditingIntention, setIsEditingIntention] = useState(false);

  // Refs for autosave debouncing
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionInputRef = useRef<HTMLInputElement>(null);

  // Track if we have unsaved changes
  const hasChanges =
    intention !== timebox.intention ||
    notes !== (timebox.notes ?? '') ||
    duration !== timebox.intended_duration;

  // Sync local state when timebox prop changes (e.g., after save)
  useEffect(() => {
    setIntention(timebox.intention);
    setNotes(timebox.notes ?? '');
    setDuration(timebox.intended_duration);
  }, [timebox.intention, timebox.notes, timebox.intended_duration]);

  // Autosave effect with 300ms debounce
  useEffect(() => {
    if (!isEditable || !hasChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await commands.updateTimebox(timebox.id, {
          intention: intention !== timebox.intention ? intention : undefined,
          notes: notes !== (timebox.notes ?? '') ? (notes || null) : undefined,
          intended_duration: duration !== timebox.intended_duration ? duration : undefined,
        });
        onUpdate();
      } catch (error) {
        console.error('Failed to update timebox:', error);
      }
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isEditable, intention, notes, duration, timebox, onUpdate, hasChanges]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingIntention && intentionInputRef.current) {
      intentionInputRef.current.focus();
      intentionInputRef.current.select();
    }
  }, [isEditingIntention]);


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

  const handleDurationChange = (newDuration: number) => {
    if (newDuration >= 1) {
      setDuration(newDuration);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    return `${minutes.toFixed(1)} min`;
  };

  // Render editable card for not_started or paused
  if (isEditable) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        {/* Header with intention and status */}
        <div className="flex items-center gap-2 mb-2">
          {isEditingIntention ? (
            <input
              ref={intentionInputRef}
              type="text"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              onBlur={() => setIsEditingIntention(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingIntention(false);
                }
              }}
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p
              onClick={() => setIsEditingIntention(true)}
              className="flex-1 font-medium text-gray-100 cursor-pointer hover:bg-gray-700/50 px-2 py-1 -mx-2 rounded"
            >
              {intention || 'Click to add intention...'}
            </p>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              statusColors[timebox.status] || statusColors.not_started
            }`}
          >
            {statusLabels[timebox.status] || timebox.status}
          </span>
        </div>

        {/* Notes section */}
        <div className="mb-3">
          <MarkdownEditor
            value={notes}
            onChange={setNotes}
            placeholder="Add notes..."
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded focus-within:ring-2 focus-within:ring-blue-500"
            minHeight="60px"
          />
        </div>

        {/* Duration and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Duration:</span>
            <button
              onClick={() => handleDurationChange(duration - 5)}
              disabled={duration <= 5}
              className="w-7 h-7 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              -5
            </button>
            <input
              type="number"
              value={duration}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  handleDurationChange(val);
                }
              }}
              min="1"
              step="1"
              className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 text-gray-100 text-center text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleDurationChange(duration + 5)}
              className="w-7 h-7 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
            >
              +5
            </button>
            <span className="text-sm text-gray-400">min</span>
          </div>

          <button
            onClick={handleStart}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // Render read-only card for in_progress, completed, cancelled, stopped
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
        {timebox.notes && (
          <div className="text-sm text-gray-400 line-clamp-2 mb-1">
            <MarkdownEditor
              value={timebox.notes}
              onChange={() => {}}
              disabled
              className="text-gray-400 pointer-events-none"
              minHeight="auto"
            />
          </div>
        )}
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
