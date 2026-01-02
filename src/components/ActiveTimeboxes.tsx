import { useState, useEffect, useRef } from 'react';
import type { TimeboxWithSessions } from '../lib/types';
import { commands } from '../lib/commands';
import { Timer } from './Timer';
import { MarkdownEditor } from './MarkdownEditor';

interface ActiveTimeboxesProps {
  timeboxes: TimeboxWithSessions[];
  getTimer: (id: number) => { remainingSeconds: number; isExpired: boolean } | undefined;
  formatTime: (seconds: number) => string;
  onUpdate: () => void;
}

interface ActiveTimeboxCardProps {
  timebox: TimeboxWithSessions;
  timer: { remainingSeconds: number; isExpired: boolean } | undefined;
  formatTime: (seconds: number) => string;
  onStop: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onUpdate: () => void;
}

function ActiveTimeboxCard({
  timebox,
  timer,
  formatTime,
  onStop,
  onFinish,
  onCancel,
  onUpdate,
}: ActiveTimeboxCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingIntention, setIsEditingIntention] = useState(false);
  const [intention, setIntention] = useState(timebox.intention);
  const [notes, setNotes] = useState(timebox.notes ?? '');

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    intention !== timebox.intention || notes !== (timebox.notes ?? '');

  // Sync local state when timebox prop changes
  useEffect(() => {
    setIntention(timebox.intention);
    setNotes(timebox.notes ?? '');
  }, [timebox.intention, timebox.notes]);

  // Autosave with 300ms debounce
  useEffect(() => {
    if (!hasChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await commands.updateTimebox(timebox.id, {
          intention: intention !== timebox.intention ? intention : undefined,
          notes: notes !== (timebox.notes ?? '') ? (notes || null) : undefined,
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
  }, [intention, notes, timebox, onUpdate, hasChanges]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingIntention && intentionInputRef.current) {
      intentionInputRef.current.focus();
      intentionInputRef.current.select();
    }
  }, [isEditingIntention]);

  return (
    <div className="bg-[#5E6AD2]/20 border border-[#5E6AD2] rounded-lg p-4">
      {/* Header row with intention, timer, and actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center gap-2">
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
              className="flex-1 px-2 py-1 bg-neutral-900 border border-neutral-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]"
            />
          ) : (
            <p
              onClick={() => setIsEditingIntention(true)}
              className="font-medium text-white cursor-pointer hover:bg-neutral-900/50 px-2 py-1 -mx-2 rounded"
            >
              {intention}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {timer && (
            <Timer remainingSeconds={timer.remainingSeconds} formatTime={formatTime} />
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
            title={isExpanded ? 'Hide notes' : 'Show notes'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <button
            onClick={onFinish}
            className="px-3 py-1.5 bg-[#4338ca] text-white text-sm rounded hover:bg-[#3730a3] transition-colors"
          >
            Finish
          </button>
          <button
            onClick={onStop}
            className="px-3 py-1.5 bg-[#e44332] text-white text-sm rounded hover:bg-[#c93c2d] transition-colors"
          >
            Stop
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-neutral-800 text-white text-sm rounded hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Target duration info */}
      <p className="text-sm text-neutral-400 mt-1">
        {timebox.intended_duration} min target
      </p>

      {/* Expandable notes section */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#5E6AD2]/50">
          <MarkdownEditor
            value={notes}
            onChange={setNotes}
            placeholder="Add notes..."
            className="w-full px-2 py-1 bg-neutral-900/50 border border-neutral-800 text-neutral-300 text-sm rounded focus-within:ring-2 focus-within:ring-[#5E6AD2]"
            minHeight="80px"
          />
        </div>
      )}
    </div>
  );
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

  const handleFinish = async (id: number) => {
    try {
      await commands.finishTimebox(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to finish timebox:', error);
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
      <h2 className="text-lg font-semibold text-neutral-300 mb-3">Active</h2>
      <div className="space-y-3">
        {timeboxes.map((timebox) => (
          <ActiveTimeboxCard
            key={timebox.id}
            timebox={timebox}
            timer={getTimer(timebox.id)}
            formatTime={formatTime}
            onStop={() => handleStop(timebox.id)}
            onFinish={() => handleFinish(timebox.id)}
            onCancel={() => handleCancel(timebox.id)}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}
