import { useState } from 'react';
import { commands } from '../lib/commands';
import type { LinearApiIssue } from '../lib/types';
import { useLinear } from '../contexts/AppContext';
import { openLinearUrl } from '../lib/utils';

interface IssueCardProps {
  issue: LinearApiIssue;
  localProjectId?: number;
  isAlreadyAdded?: boolean;
  onTimeboxCreated?: () => void;
  onNavigateToTimebox?: (issueId: string) => void;
}

const PRESET_DURATIONS = [15, 30, 45]; // in minutes

function getPriorityColor(priority: number | null): string {
  switch (priority) {
    case 1:
      return 'text-red-400'; // Urgent
    case 2:
      return 'text-orange-400'; // High
    case 3:
      return 'text-yellow-400'; // Normal
    case 4:
      return 'text-blue-400'; // Low
    default:
      return 'text-neutral-500';
  }
}

export function IssueCard({ issue, localProjectId, isAlreadyAdded, onTimeboxCreated, onNavigateToTimebox }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get Linear settings from context
  const { openInNativeApp: linearOpenInNativeApp } = useLinear();

  const handleAddTimebox = async () => {
    if (selectedDuration === null) return;

    setIsSubmitting(true);
    try {
      await commands.createTimebox({
        intention: `${issue.identifier}: ${issue.title}`,
        intended_duration: selectedDuration * 60, // Convert minutes to seconds
        notes: issue.description || undefined,
        linear_project_id: localProjectId,
        linear_issue_id: issue.id,
        linear_issue_identifier: issue.identifier,
        linear_issue_url: issue.url,
      });

      // Show success state briefly
      setSuccess(true);
      onTimeboxCreated?.();
      setTimeout(() => {
        setSuccess(false);
        setIsExpanded(false);
        setSelectedDuration(null);
        setCustomDuration('');
        setIsCustom(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to create timebox:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomDecrement = () => {
    const current = parseInt(customDuration, 10) || 0;
    const newVal = Math.max(5, current - 5);
    setCustomDuration(String(newVal));
    setSelectedDuration(newVal);
    setIsCustom(true);
  };

  const handleCustomIncrement = () => {
    const current = parseInt(customDuration, 10) || 0;
    const newVal = current + 5;
    setCustomDuration(String(newVal));
    setSelectedDuration(newVal);
    setIsCustom(true);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDuration(e.target.value);
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedDuration(parsed);
    }
  };

  return (
    <div className="bg-[#0a0a0a] rounded-lg p-4 border border-neutral-800">
      {/* Issue Header */}
      <div className="flex items-start gap-3">
        {/* State indicator */}
        {issue.state && (
          <span
            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: issue.state.color }}
            title={issue.state.name}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Identifier and Priority */}
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openLinearUrl(issue.url, linearOpenInNativeApp);
              }}
              className="text-neutral-400 text-sm hover:text-[#5E6AD2] transition-colors"
            >
              {issue.identifier}
            </button>
            {issue.priority_label && (
              <span className={`text-xs ${getPriorityColor(issue.priority)}`}>
                {issue.priority_label}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="font-medium text-white">{issue.title}</p>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-neutral-500">
            {issue.assignee && <span>{issue.assignee.name}</span>}
            {issue.due_date && (
              <span>Due: {new Date(issue.due_date).toLocaleDateString()}</span>
            )}
            {issue.estimate != null && <span>{issue.estimate} pts</span>}
          </div>

          {/* Labels */}
          {issue.labels?.nodes && issue.labels.nodes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {issue.labels.nodes.map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 text-xs rounded"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    border: `1px solid ${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add Timebox button or Already added indicator */}
        {isAlreadyAdded ? (
          <button
            onClick={() => onNavigateToTimebox?.(issue.id)}
            className="px-3 py-1.5 text-sm text-[#5E6AD2] hover:text-[#a5b4fc] flex items-center gap-1.5 flex-shrink-0 transition-colors"
            title="View timebox"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Added
          </button>
        ) : (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 text-sm bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 transition-colors flex-shrink-0"
          >
            {isExpanded ? 'Cancel' : 'Add Timebox'}
          </button>
        )}
      </div>

      {/* Expanded timebox creation form */}
      {isExpanded && !isAlreadyAdded && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          {success ? (
            <div className="flex items-center justify-center gap-2 py-4 text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Timebox created!</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-400 mb-3">Select duration:</p>

              <div className="flex flex-wrap gap-2 items-center mb-4">
                {PRESET_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => {
                      setSelectedDuration(duration);
                      setIsCustom(false);
                      setCustomDuration('');
                    }}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedDuration === duration && !isCustom
                        ? 'bg-[#5E6AD2] text-white'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {duration} min
                  </button>
                ))}

                {/* Custom duration input */}
                <div className="flex gap-1 items-center">
                  <button
                    onClick={handleCustomDecrement}
                    disabled={isSubmitting}
                    className="px-2 py-1.5 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={customDuration}
                    onChange={handleCustomChange}
                    onFocus={() => setIsCustom(true)}
                    placeholder="Custom"
                    min="1"
                    step="5"
                    disabled={isSubmitting}
                    className={`w-16 px-2 py-1.5 bg-neutral-800 border text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] disabled:opacity-50 ${
                      isCustom ? 'border-[#5E6AD2]' : 'border-neutral-700'
                    }`}
                  />
                  <button
                    onClick={handleCustomIncrement}
                    disabled={isSubmitting}
                    className="px-2 py-1.5 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-neutral-400 text-sm ml-1">min</span>
                </div>
              </div>

              <button
                onClick={handleAddTimebox}
                disabled={selectedDuration === null || isSubmitting}
                className="w-full px-4 py-2 bg-[#5E6AD2] text-white rounded-lg hover:bg-[#4f5ab8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {isSubmitting ? 'Adding...' : 'Add Timebox'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
