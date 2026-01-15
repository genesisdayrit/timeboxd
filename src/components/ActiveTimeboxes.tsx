import { useState, useEffect, useRef } from 'react';
import type { TimeboxWithSessions, LinearConfig } from '../lib/types';
import { commands } from '../lib/commands';
import { Timer } from './Timer';
import { MarkdownEditor } from './MarkdownEditor';
import { CopyButton } from './CopyButton';
import { openLinearUrl } from '../lib/utils';

interface ActiveTimeboxesProps {
  timeboxes: TimeboxWithSessions[];
  getTimer: (id: number) => { remainingSeconds: number; isExpired: boolean } | undefined;
  formatTime: (seconds: number) => string;
  onUpdate: () => void;
  highlightedIssueId?: string | null;
}

interface ActiveTimeboxCardProps {
  timebox: TimeboxWithSessions;
  timer: { remainingSeconds: number; isExpired: boolean } | undefined;
  formatTime: (seconds: number) => string;
  onStop: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onUpdate: () => void;
  isHighlighted?: boolean;
}

function ActiveTimeboxCard({
  timebox,
  timer,
  formatTime,
  onStop,
  onFinish,
  onCancel,
  onUpdate,
  isHighlighted,
}: ActiveTimeboxCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingIntention, setIsEditingIntention] = useState(false);
  const [intention, setIntention] = useState(timebox.intention);
  const [notes, setNotes] = useState(timebox.notes ?? '');
  const [linearOpenInNativeApp, setLinearOpenInNativeApp] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll into view when highlighted
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  // Load Linear native app setting
  useEffect(() => {
    commands.getIntegrationByType('linear').then(integration => {
      if (integration) {
        const config = integration.connection_config as unknown as LinearConfig;
        setLinearOpenInNativeApp(config.open_in_native_app ?? false);
      }
    }).catch(console.error);
  }, []);

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
    <div
      ref={cardRef}
      className={`bg-[#5E6AD2]/20 border border-[#5E6AD2] rounded-lg p-4 transition-all duration-500 ${
        isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''
      }`}
    >
      {/* Header row with intention and Linear link */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
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
            <div className="flex-1 relative group/title min-w-0">
              <p
                onClick={() => setIsEditingIntention(true)}
                className="font-medium text-white cursor-pointer hover:bg-neutral-900/50 px-2 py-1 -mx-2 rounded pr-6 truncate"
              >
                {intention}
              </p>
              <CopyButton text={intention} className="absolute top-1 right-0 opacity-0 group-hover/title:opacity-100" />
            </div>
          )}
        </div>

        {/* Linear link - top right */}
        {timebox.linear_issue_url && (
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <button
              onClick={() => openLinearUrl(timebox.linear_issue_url!, linearOpenInNativeApp)}
              className="px-2 py-1 bg-[#5E6AD2]/30 text-[#a5b4fc] text-xs rounded hover:bg-[#5E6AD2]/50 transition-colors flex items-center gap-1"
              title="Open in Linear"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Linear
            </button>
            <CopyButton
              text={timebox.linear_issue_url}
              className="w-6 h-6 bg-[#5E6AD2]/30 text-[#a5b4fc] rounded hover:bg-[#5E6AD2]/50"
            />
          </div>
        )}
      </div>

      {/* Actions row with timer and buttons */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          {timebox.intended_duration} min target
        </p>

        <div className="flex items-center gap-3 shrink-0">
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

      {/* Expandable notes section */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#5E6AD2]/50 relative group/notes">
          <MarkdownEditor
            value={notes}
            onChange={setNotes}
            placeholder="Add notes..."
            className="w-full px-2 py-1 bg-neutral-900/50 border border-neutral-800 text-neutral-300 text-sm rounded focus-within:ring-2 focus-within:ring-[#5E6AD2]"
            minHeight="80px"
          />
          <CopyButton
            text={notes}
            className="absolute bottom-2 right-2 opacity-0 group-hover/notes:opacity-100"
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
  highlightedIssueId,
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
            isHighlighted={highlightedIssueId === timebox.linear_issue_id}
          />
        ))}
      </div>
    </div>
  );
}
