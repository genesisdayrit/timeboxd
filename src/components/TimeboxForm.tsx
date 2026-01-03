import { useState, useEffect, useRef } from 'react';
import { commands } from '../lib/commands';
import { MarkdownEditor } from './MarkdownEditor';
import type { LinearProject, LinearConfig } from '../lib/types';

interface TimeboxFormProps {
  onCreated: () => void;
  linearProjectId?: number;
  // When provided, auto-create Linear issue on timebox creation (for ProjectIssuesView context)
  linearProjectDetails?: {
    linearProjectId: string;
    linearTeamId: string;
  };
}

const PRESET_DURATIONS = [5, 15, 45];

export function TimeboxForm({ onCreated, linearProjectId, linearProjectDetails }: TimeboxFormProps) {
  const [intention, setIntention] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Linear project state
  const [activeProjects, setActiveProjects] = useState<LinearProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Load active projects on mount
  useEffect(() => {
    commands.getActiveTimeboxProjects().then(setActiveProjects).catch(console.error);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProject = activeProjects.find(p => p.id === selectedProjectId);

  const handlePresetClick = (duration: number) => {
    setSelectedDuration(duration);
    setIsCustom(false);
    setCustomDuration('');
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    setSelectedDuration(null);
  };

  const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomDuration(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedDuration(parsed);
    } else {
      setSelectedDuration(null);
    }
  };

  const incrementCustomDuration = (delta: number) => {
    const current = parseInt(customDuration, 10) || 0;
    const newValue = Math.max(5, current + delta);
    setCustomDuration(String(newValue));
    setSelectedDuration(newValue);
  };

  const handleSubmit = async () => {
    if (!intention.trim() || selectedDuration === null) return;

    setIsSubmitting(true);
    try {
      // Use the passed linearProjectId prop if provided, otherwise use the dropdown selection
      const projectIdToUse = linearProjectId ?? selectedProjectId ?? undefined;
      const timebox = await commands.createTimebox({
        intention: intention.trim(),
        intended_duration: selectedDuration,
        notes: notes.trim() || undefined,
        linear_project_id: projectIdToUse,
      });

      // Auto-create Linear issue if project is selected (from dropdown or from ProjectIssuesView context)
      const projectToCreateIssueFor = selectedProjectId && selectedProject
        ? { linearProjectId: selectedProject.linear_project_id, linearTeamId: selectedProject.linear_team_id }
        : linearProjectDetails;

      if (projectToCreateIssueFor) {
        try {
          const integration = await commands.getIntegrationByType('linear');
          if (integration) {
            const config = integration.connection_config as unknown as LinearConfig;
            const result = await commands.createLinearIssue(config.api_key, {
              title: intention.trim(),
              description: notes.trim() || undefined,
              project_id: projectToCreateIssueFor.linearProjectId,
              team_id: projectToCreateIssueFor.linearTeamId,
            });
            if (result.success && result.issue) {
              await commands.setTimeboxLinearIssue(
                timebox.id,
                result.issue.id,
                result.issue.url
              );
            }
          }
        } catch (issueError) {
          console.error('Failed to create Linear issue:', issueError);
          // Don't fail the whole operation, timebox is still created
        }
      }

      setIntention('');
      setNotes('');
      setSelectedDuration(null);
      setCustomDuration('');
      setIsCustom(false);
      setSelectedProjectId(null);
      onCreated();
    } catch (error) {
      console.error('Failed to create timebox:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = intention.trim() && selectedDuration !== null && !isSubmitting;

  return (
    <div className="bg-[#0a0a0a] rounded-lg shadow p-4 mb-6">
      <input
        type="text"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        placeholder="What are you working on?"
        className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]"
        disabled={isSubmitting}
      />

      <div className="flex flex-wrap gap-2 items-center mb-4">
        {PRESET_DURATIONS.map((duration) => (
          <button
            key={duration}
            onClick={() => handlePresetClick(duration)}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedDuration === duration && !isCustom
                ? 'bg-[#5E6AD2] text-white'
                : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {duration} min
          </button>
        ))}

        <div className="flex gap-1 items-center">
          <button
            onClick={() => incrementCustomDuration(-5)}
            disabled={isSubmitting || !isCustom}
            className="px-2 py-2 bg-neutral-900 text-neutral-300 rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            -
          </button>
          <input
            type="number"
            value={customDuration}
            onChange={handleCustomDurationChange}
            onFocus={handleCustomClick}
            placeholder="Custom"
            min="1"
            step="5"
            className={`w-20 px-2 py-2 bg-neutral-900 border text-white placeholder-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] ${
              isCustom ? 'border-[#5E6AD2]' : 'border-neutral-800'
            }`}
            disabled={isSubmitting}
          />
          <button
            onClick={() => incrementCustomDuration(5)}
            disabled={isSubmitting || !isCustom}
            className="px-2 py-2 bg-neutral-900 text-neutral-300 rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +
          </button>
          <span className="text-neutral-400 text-sm ml-1">min</span>
        </div>
      </div>

      <div className="mb-4">
        <MarkdownEditor
          value={notes}
          onChange={setNotes}
          placeholder="Notes (optional)"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg focus-within:ring-2 focus-within:ring-[#5E6AD2] focus-within:border-[#5E6AD2]"
          minHeight="100px"
        />
      </div>

      {/* Linear Project Dropdown */}
      {activeProjects.length > 0 && (
        <div className="mb-4 relative" ref={projectDropdownRef}>
          <button
            type="button"
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            disabled={isSubmitting}
            className="w-full flex items-center justify-between px-4 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className={selectedProject ? 'text-white' : 'text-neutral-500'}>
              {selectedProject ? selectedProject.name : 'Select Linear project (optional)'}
            </span>
            <svg
              className={`w-4 h-4 text-neutral-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isProjectDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId(null);
                  setIsProjectDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-neutral-800 transition-colors ${
                  !selectedProjectId ? 'bg-neutral-800 text-white' : 'text-neutral-400'
                }`}
              >
                No project
              </button>
              {activeProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setIsProjectDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-neutral-800 transition-colors ${
                    selectedProjectId === project.id ? 'bg-[#5E6AD2] text-white' : 'text-neutral-300'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full px-4 py-2 bg-[#5E6AD2] text-white rounded-lg hover:bg-[#4f5ab8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        Add Timebox
      </button>
    </div>
  );
}
