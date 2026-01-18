import { useState, useEffect, useRef } from 'react';
import type { TimeboxWithSessions, LinearProject, LinearConfig } from '../lib/types';
import { commands } from '../lib/commands';
import { useLinear } from '../contexts/AppContext';
import { MarkdownEditor } from './MarkdownEditor';
import { CopyButton } from './CopyButton';
import { openLinearUrl } from '../lib/utils';

interface TimeboxCardProps {
  timebox: TimeboxWithSessions;
  onUpdate: () => void;
  showDragHandle?: boolean;
  isArchived?: boolean;
  dragHandleProps?: Record<string, unknown>;
  isHighlighted?: boolean;
}

const statusColors: Record<string, string> = {
  not_started: 'bg-yellow-900/20 text-yellow-400',
  in_progress: 'bg-indigo-900/20 text-indigo-400',
  paused: 'bg-orange-900/20 text-orange-400',
  completed: 'bg-indigo-900/20 text-indigo-300',
  stopped: 'bg-purple-900/20 text-purple-400',
  cancelled: 'bg-neutral-800 text-neutral-500',
};

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
};

export function TimeboxCard({ timebox, onUpdate, showDragHandle, isArchived, dragHandleProps, isHighlighted }: TimeboxCardProps) {
  // Fully editable when not_started or paused (can edit duration)
  const isFullyEditable = timebox.status === 'not_started' || timebox.status === 'paused';
  // Completed timeboxes can edit intention and notes only
  const isCompletedEditable = timebox.status === 'completed' || timebox.status === 'stopped';
  const isEditable = isFullyEditable || isCompletedEditable;

  // Local state for editable fields
  const [intention, setIntention] = useState(timebox.intention);
  const [notes, setNotes] = useState(timebox.notes ?? '');
  const [duration, setDuration] = useState(timebox.intended_duration);

  // Edit mode state
  const [isEditingIntention, setIsEditingIntention] = useState(false);

  // Refs for autosave debouncing
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionInputRef = useRef<HTMLInputElement>(null);

  // Linear project state
  const [activeProjects, setActiveProjects] = useState<LinearProject[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get Linear settings from context
  const { openInNativeApp: linearOpenInNativeApp } = useLinear();

  // Scroll into view when highlighted
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  // Load active projects for dropdown
  useEffect(() => {
    if (isFullyEditable && !isArchived) {
      commands.getActiveTimeboxProjects().then(setActiveProjects).catch(console.error);
    }
  }, [isFullyEditable, isArchived]);

  // Handle click outside to close project dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentProject = activeProjects.find(p => p.id === timebox.linear_project_id);

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
    if (!isEditable || !hasChanges || isArchived) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await commands.updateTimebox(timebox.id, {
          intention: intention !== timebox.intention ? intention : undefined,
          notes: notes !== (timebox.notes ?? '') ? (notes || null) : undefined,
          // Only update duration for fully editable timeboxes (not_started/paused)
          intended_duration: isFullyEditable && duration !== timebox.intended_duration ? duration : undefined,
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
  }, [isEditable, isFullyEditable, isArchived, intention, notes, duration, timebox, onUpdate, hasChanges]);

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

      // Sync Linear issue status to "In Progress" if issue exists
      if (timebox.linear_issue_id && timebox.linear_project_id) {
        try {
          // Fetch the project to get team_id (can't rely on activeProjects being loaded)
          const project = await commands.getLinearProjectById(timebox.linear_project_id);
          if (project) {
            const integration = await commands.getIntegrationByType('linear');
            if (integration) {
              const config = integration.connection_config as unknown as LinearConfig;
              const states = await commands.getLinearTeamStates(config.api_key, project.linear_team_id);
              const inProgressState = states.find(s => s.state_type === 'started');
              if (inProgressState) {
                await commands.updateLinearIssueState(config.api_key, timebox.linear_issue_id, inProgressState.id);
              }
            }
          }
        } catch (syncError) {
          console.error('Failed to sync Linear issue status:', syncError);
          // Don't fail the start operation
        }
      }

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

  const handleArchive = async () => {
    try {
      await commands.archiveTimebox(timebox.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to archive timebox:', error);
    }
  };

  const handleUnarchive = async () => {
    try {
      await commands.unarchiveTimebox(timebox.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to unarchive timebox:', error);
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

  const handleSelectProject = async (projectId: number | null) => {
    try {
      await commands.setTimeboxLinearProject(timebox.id, projectId);
      setIsProjectDropdownOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to set project:', error);
    }
  };

  const handleCreateIssue = async () => {
    if (!currentProject) return;

    setIsCreatingIssue(true);
    try {
      const integration = await commands.getIntegrationByType('linear');
      if (!integration) {
        console.error('No Linear integration configured');
        return;
      }

      const config = integration.connection_config as unknown as LinearConfig;
      const result = await commands.createLinearIssue(config.api_key, {
        title: timebox.intention,
        description: timebox.notes || undefined,
        project_id: currentProject.linear_project_id,
        team_id: currentProject.linear_team_id,
      });

      if (result.success && result.issue) {
        await commands.setTimeboxLinearIssue(timebox.id, result.issue.id, result.issue.url);
        onUpdate();
      } else if (result.error) {
        console.error('Failed to create Linear issue:', result.error);
      }
    } catch (error) {
      console.error('Failed to create Linear issue:', error);
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleOpenIssue = () => {
    if (timebox.linear_issue_url) {
      openLinearUrl(timebox.linear_issue_url, linearOpenInNativeApp);
    }
  };

  // Render archived card (read-only with unarchive option)
  if (isArchived) {
    return (
      <div
        ref={cardRef}
        className={`bg-[#0a0a0a]/50 border border-neutral-800/50 rounded-lg p-4 opacity-75 transition-all duration-500 ${
          isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative group/title flex-1">
              <p className="font-medium text-neutral-400 pr-6">{timebox.intention}</p>
              <CopyButton text={timebox.intention} className="absolute top-0 right-0 opacity-0 group-hover/title:opacity-100" />
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                statusColors[timebox.status] || statusColors.not_started
              }`}
            >
              {statusLabels[timebox.status] || timebox.status}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleUnarchive}
              className="px-3 py-1.5 bg-neutral-800 text-neutral-200 text-sm rounded hover:bg-neutral-700 transition-colors"
            >
              Unarchive
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 bg-red-600/70 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
        {timebox.notes && (
          <div className="text-sm text-neutral-500 line-clamp-2 mb-2 relative group/notes">
            <MarkdownEditor
              value={timebox.notes}
              onChange={() => {}}
              disabled
              className="text-neutral-500 pointer-events-none"
              minHeight="auto"
            />
            <CopyButton
              text={timebox.notes}
              className="absolute bottom-1 right-1 opacity-0 group-hover/notes:opacity-100"
            />
          </div>
        )}
        <p className="text-sm text-neutral-500">
          Target: {formatDuration(timebox.intended_duration)}
        </p>
      </div>
    );
  }

  // Render fully editable card for not_started or paused
  if (isFullyEditable) {
    return (
      <div
        ref={cardRef}
        className={`bg-[#0a0a0a] border border-neutral-800 rounded-lg p-4 transition-all duration-500 ${
          isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''
        }`}
      >
        {/* Header with drag handle, intention and status */}
        <div className="flex items-center gap-2 mb-2">
          {showDragHandle && (
            <div
              className="text-neutral-500 cursor-grab active:cursor-grabbing select-none touch-none"
              title="Drag to reorder"
              {...dragHandleProps}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="9" cy="6" r="2" />
                <circle cx="15" cy="6" r="2" />
                <circle cx="9" cy="12" r="2" />
                <circle cx="15" cy="12" r="2" />
                <circle cx="9" cy="18" r="2" />
                <circle cx="15" cy="18" r="2" />
              </svg>
            </div>
          )}
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
            <div className="flex-1 relative group/title">
              <p
                onClick={() => setIsEditingIntention(true)}
                className="font-medium text-white cursor-pointer hover:bg-neutral-900/50 px-2 py-1 -mx-2 rounded pr-6"
              >
                {intention || 'Click to add intention...'}
              </p>
              {intention && (
                <CopyButton text={intention} className="absolute top-1 right-0 opacity-0 group-hover/title:opacity-100" />
              )}
            </div>
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
        <div className="mb-3 relative group/notes">
          <MarkdownEditor
            value={notes}
            onChange={setNotes}
            placeholder="Add notes..."
            className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm rounded focus-within:ring-2 focus-within:ring-[#5E6AD2]"
            minHeight="60px"
          />
          <CopyButton
            text={notes}
            className="absolute bottom-2 right-2 opacity-0 group-hover/notes:opacity-100"
          />
        </div>

        {/* Linear Project Section */}
        {activeProjects.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            {/* Project Dropdown */}
            <div className="relative flex-1" ref={projectDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-sm rounded hover:bg-neutral-800 transition-colors"
              >
                <span className={currentProject ? 'text-white' : 'text-neutral-500'}>
                  {currentProject ? currentProject.name : 'Select project'}
                </span>
                <svg
                  className={`w-3 h-3 text-neutral-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isProjectDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-lg max-h-48 overflow-auto">
                  <button
                    type="button"
                    onClick={() => handleSelectProject(null)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-800 transition-colors ${
                      !timebox.linear_project_id ? 'bg-neutral-800 text-white' : 'text-neutral-400'
                    }`}
                  >
                    No project
                  </button>
                  {activeProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleSelectProject(project.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-800 transition-colors ${
                        timebox.linear_project_id === project.id ? 'bg-[#5E6AD2] text-white' : 'text-neutral-300'
                      }`}
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create Issue / Issue Link */}
            {timebox.linear_issue_url ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleOpenIssue}
                  className="px-3 py-1.5 bg-[#5E6AD2]/20 text-[#5E6AD2] text-sm rounded hover:bg-[#5E6AD2]/30 transition-colors flex items-center gap-1"
                  title="Open in Linear"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Linear
                </button>
                <CopyButton
                  text={timebox.linear_issue_url}
                  className="w-7 h-7 bg-[#5E6AD2]/20 text-[#5E6AD2] rounded hover:bg-[#5E6AD2]/30"
                />
              </div>
            ) : currentProject && (
              <button
                onClick={handleCreateIssue}
                disabled={isCreatingIssue}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-200 text-sm rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Create Linear issue"
              >
                {isCreatingIssue ? 'Creating...' : 'Create Issue'}
              </button>
            )}
          </div>
        )}

        {/* Duration and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">Duration:</span>
            <button
              onClick={() => handleDurationChange(duration - 5)}
              disabled={duration <= 5}
              className="w-7 h-7 bg-neutral-900 text-neutral-300 rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              -
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
              className="w-16 px-2 py-1 bg-neutral-900 border border-neutral-800 text-white text-center text-sm rounded focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]"
            />
            <button
              onClick={() => handleDurationChange(duration + 5)}
              className="w-7 h-7 bg-neutral-900 text-neutral-300 rounded hover:bg-neutral-800 transition-colors text-sm"
            >
              +
            </button>
            <span className="text-sm text-neutral-400">min</span>
          </div>

          <div className="flex items-center gap-2">
            {timebox.status === 'not_started' && (
              <>
                <button
                  onClick={handleArchive}
                  className="px-3 py-1.5 bg-neutral-800 text-neutral-200 text-sm rounded hover:bg-neutral-700 transition-colors"
                  title="Archive this timebox"
                >
                  Archive
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-red-600/70 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  title="Delete this timebox"
                >
                  Delete
                </button>
              </>
            )}
            <button
              onClick={handleStart}
              className="px-3 py-1.5 bg-[#4338ca] text-white text-sm rounded hover:bg-[#3730a3] transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render card for in_progress, completed, cancelled, stopped
  // Completed/stopped are editable (intention and notes), in_progress and cancelled are read-only
  return (
    <div
      ref={cardRef}
      className={`bg-[#0a0a0a] border border-neutral-800 rounded-lg p-4 transition-all duration-500 ${
        isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {isCompletedEditable && isEditingIntention ? (
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
            <div className="flex-1 relative group/title">
              <p
                onClick={isCompletedEditable ? () => setIsEditingIntention(true) : undefined}
                className={`font-medium text-white pr-6 ${
                  isCompletedEditable ? 'cursor-pointer hover:bg-neutral-900/50 px-2 py-1 -mx-2 rounded' : ''
                }`}
              >
                {intention}
              </p>
              <CopyButton text={intention} className="absolute top-0 right-0 opacity-0 group-hover/title:opacity-100" />
            </div>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              statusColors[timebox.status] || statusColors.not_started
            }`}
          >
            {statusLabels[timebox.status] || timebox.status}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Linear link for in_progress timeboxes */}
          {timebox.status === 'in_progress' && timebox.linear_issue_url && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenIssue}
                className="px-2 py-1 bg-[#5E6AD2]/20 text-[#5E6AD2] text-xs rounded hover:bg-[#5E6AD2]/30 transition-colors flex items-center gap-1"
                title="Open in Linear"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Linear
              </button>
              <CopyButton
                text={timebox.linear_issue_url}
                className="w-6 h-6 bg-[#5E6AD2]/20 text-[#5E6AD2] rounded hover:bg-[#5E6AD2]/30"
              />
            </div>
          )}
          {(timebox.status === 'completed' || timebox.status === 'cancelled' || timebox.status === 'stopped') && (
            <>
              {timebox.status === 'stopped' && (
                <button
                  onClick={handleStart}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  Restart
                </button>
              )}
              <button
                onClick={handleArchive}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-200 text-sm rounded hover:bg-neutral-700 transition-colors"
              >
                Archive
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600/70 text-white text-sm rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notes section - editable for completed, read-only for others */}
      {isCompletedEditable ? (
        <div className="mb-3 relative group/notes">
          <MarkdownEditor
            value={notes}
            onChange={setNotes}
            placeholder="Add notes..."
            className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm rounded focus-within:ring-2 focus-within:ring-[#5E6AD2]"
            minHeight="60px"
          />
          <CopyButton
            text={notes}
            className="absolute bottom-2 right-2 opacity-0 group-hover/notes:opacity-100"
          />
        </div>
      ) : (
        timebox.notes && (
          <div className="text-sm text-neutral-400 line-clamp-2 mb-2 relative group/notes">
            <MarkdownEditor
              value={timebox.notes}
              onChange={() => {}}
              disabled
              className="text-neutral-400 pointer-events-none"
              minHeight="auto"
            />
            <CopyButton
              text={timebox.notes}
              className="absolute bottom-1 right-1 opacity-0 group-hover/notes:opacity-100"
            />
          </div>
        )
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          Target: {formatDuration(timebox.intended_duration)} | Actual:{' '}
          {formatDuration(timebox.actual_duration)}
        </p>
        {timebox.linear_issue_url && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenIssue}
              className="px-2 py-1 bg-[#5E6AD2]/20 text-[#5E6AD2] text-xs rounded hover:bg-[#5E6AD2]/30 transition-colors flex items-center gap-1"
              title="Open in Linear"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Linear
            </button>
            <CopyButton
              text={timebox.linear_issue_url}
              className="w-6 h-6 bg-[#5E6AD2]/20 text-[#5E6AD2] rounded hover:bg-[#5E6AD2]/30"
            />
          </div>
        )}
      </div>
      {timebox.sessions.length > 0 && (
        <p className="text-xs text-neutral-500 mt-1">
          {timebox.sessions.length} session{timebox.sessions.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
