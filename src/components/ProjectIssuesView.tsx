import { useState, useEffect, useCallback } from 'react';
import { commands } from '../lib/commands';
import type { LinearApiIssue } from '../lib/types';
import { IssueCard } from './IssueCard';
import { TimeboxForm } from './TimeboxForm';

interface ProjectIssuesViewProps {
  apiKey: string;
  projectId: string;
  projectName: string;
  localProjectId?: number;
  onBack: () => void;
}

type StateType = 'unstarted' | 'started' | 'backlog' | 'completed' | 'canceled';

const STATE_ORDER: StateType[] = ['started', 'unstarted', 'backlog', 'completed', 'canceled'];

const STATE_LABELS: Record<StateType, string> = {
  started: 'In Progress',
  unstarted: 'Not Started',
  backlog: 'Backlog',
  completed: 'Completed',
  canceled: 'Canceled',
};

function groupIssuesByState(issues: LinearApiIssue[]): Record<StateType, LinearApiIssue[]> {
  const groups: Record<StateType, LinearApiIssue[]> = {
    unstarted: [],
    started: [],
    backlog: [],
    completed: [],
    canceled: [],
  };

  for (const issue of issues) {
    const stateType = (issue.state?.state_type || 'backlog') as StateType;
    if (groups[stateType]) {
      groups[stateType].push(issue);
    } else {
      groups.backlog.push(issue);
    }
  }

  return groups;
}

export function ProjectIssuesView({
  apiKey,
  projectId,
  projectName,
  localProjectId,
  onBack,
}: ProjectIssuesViewProps) {
  const [issues, setIssues] = useState<LinearApiIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingIssueIds, setExistingIssueIds] = useState<Set<string>>(new Set());

  // Load existing timeboxes to check for duplicates
  const loadExistingTimeboxes = useCallback(async () => {
    try {
      const timeboxes = await commands.getTodayTimeboxes();
      const issueIds = new Set<string>();
      for (const tb of timeboxes) {
        if (tb.linear_issue_id) {
          issueIds.add(tb.linear_issue_id);
        }
      }
      setExistingIssueIds(issueIds);
    } catch (err) {
      console.error('Failed to load existing timeboxes:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [issuesData] = await Promise.all([
          commands.getLinearProjectIssues(apiKey, projectId),
          loadExistingTimeboxes(),
        ]);
        setIssues(issuesData);
      } catch (err) {
        console.error('Failed to load issues:', err);
        setError('Failed to load issues from Linear');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [apiKey, projectId, loadExistingTimeboxes]);

  // Refresh existing timeboxes after a new one is created
  const handleTimeboxCreated = useCallback(() => {
    loadExistingTimeboxes();
  }, [loadExistingTimeboxes]);

  const groupedIssues = groupIssuesByState(issues);

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white">{projectName}</h2>
      </div>

      {/* Create Timebox Form - linked to this project */}
      <TimeboxForm onCreated={handleTimeboxCreated} linearProjectId={localProjectId} />

      {loading ? (
        <p className="text-neutral-500">Loading issues...</p>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      ) : issues.length === 0 ? (
        <p className="text-neutral-500">No issues found for this project.</p>
      ) : (
        <div className="space-y-8">
          {STATE_ORDER.map((stateType) => {
            const stateIssues = groupedIssues[stateType];
            if (stateIssues.length === 0) return null;

            return (
              <div key={stateType}>
                <h3 className="text-lg font-medium text-neutral-300 mb-4">
                  {STATE_LABELS[stateType]}{' '}
                  <span className="text-neutral-500 font-normal">({stateIssues.length})</span>
                </h3>
                <div className="space-y-3">
                  {stateIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      localProjectId={localProjectId}
                      isAlreadyAdded={existingIssueIds.has(issue.id)}
                      onTimeboxCreated={handleTimeboxCreated}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
