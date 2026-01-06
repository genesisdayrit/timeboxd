import { useState } from 'react';
import type { TimeboxWithSessions } from '../lib/types';
import { TimeboxForm } from '../components/TimeboxForm';
import { TimeboxList } from '../components/TimeboxList';
import { ActiveTimeboxes } from '../components/ActiveTimeboxes';

interface SessionsPageProps {
  timeboxes: TimeboxWithSessions[];
  archivedTimeboxes: TimeboxWithSessions[];
  activeTimeboxes: TimeboxWithSessions[];
  getTimer: (id: number) => { remainingSeconds: number; isExpired: boolean } | undefined;
  formatTime: (seconds: number) => string;
  onUpdate: () => void;
  highlightedIssueId?: string | null;
}

export function SessionsPage({
  timeboxes,
  archivedTimeboxes,
  activeTimeboxes,
  getTimer,
  formatTime,
  onUpdate,
  highlightedIssueId,
}: SessionsPageProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Sessions</h2>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="px-3 py-1.5 bg-neutral-900 text-neutral-400 text-sm rounded hover:bg-neutral-800 transition-colors"
          >
            {showCompleted ? 'Hide Inactive' : 'View Inactive'}
          </button>
        </div>

        <TimeboxForm onCreated={onUpdate} />

        <ActiveTimeboxes
          timeboxes={activeTimeboxes}
          getTimer={getTimer}
          formatTime={formatTime}
          onUpdate={onUpdate}
          highlightedIssueId={highlightedIssueId}
        />

        <TimeboxList
          timeboxes={timeboxes}
          archivedTimeboxes={archivedTimeboxes}
          onUpdate={onUpdate}
          showCompleted={showCompleted}
          highlightedIssueId={highlightedIssueId}
        />
      </div>
    </div>
  );
}
