import { useState, useEffect, useRef } from 'react';
import { commands } from '../lib/commands';
import type { LinearProject, LinearTeam, LinearApiProject, SelectedLinearProject } from '../lib/types';

interface LinearProjectPickerProps {
  apiKey: string;
  savedProjects: LinearProject[];
  selectedProject: SelectedLinearProject | null;
  onSelect: (project: SelectedLinearProject | null) => void;
  disabled?: boolean;
}

export function LinearProjectPicker({
  apiKey,
  savedProjects,
  selectedProject,
  onSelect,
  disabled = false,
}: LinearProjectPickerProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSavedProjectSelect = (project: LinearProject) => {
    onSelect({
      linearProjectId: project.linear_project_id,
      linearTeamId: project.linear_team_id,
      name: project.name,
      localDbId: project.id,
    });
    setIsDropdownOpen(false);
  };

  const handleApiProjectSelect = (project: LinearApiProject, teamId: string) => {
    // Check if this project is saved locally
    const savedProject = savedProjects.find(p => p.linear_project_id === project.id);
    onSelect({
      linearProjectId: project.id,
      linearTeamId: teamId,
      name: project.name,
      localDbId: savedProject?.id,
    });
    setIsModalOpen(false);
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          className="w-full flex items-center justify-between px-4 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className={selectedProject ? 'text-white' : 'text-neutral-500'}>
            {selectedProject ? selectedProject.name : 'Select Linear project (optional)'}
          </span>
          <svg
            className={`w-4 h-4 text-neutral-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-lg max-h-72 overflow-auto">
            {/* No project option */}
            <button
              type="button"
              onClick={handleClear}
              className={`w-full text-left px-4 py-2 hover:bg-neutral-800 transition-colors ${
                !selectedProject ? 'bg-neutral-800 text-white' : 'text-neutral-400'
              }`}
            >
              No project
            </button>

            {/* Saved/Active projects section */}
            {savedProjects.length > 0 && (
              <>
                <div className="px-4 py-1 text-xs text-neutral-500 uppercase tracking-wide border-t border-neutral-800 mt-1 pt-2">
                  Quick Access
                </div>
                {savedProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSavedProjectSelect(project)}
                    className={`w-full text-left px-4 py-2 hover:bg-neutral-800 transition-colors ${
                      selectedProject?.linearProjectId === project.linear_project_id
                        ? 'bg-[#5E6AD2] text-white'
                        : 'text-neutral-300'
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </>
            )}

            {/* Browse all projects option */}
            <div className="border-t border-neutral-800 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-[#5E6AD2] hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse All Projects...
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for browsing all projects */}
      {isModalOpen && (
        <LinearProjectModal
          apiKey={apiKey}
          onSelect={handleApiProjectSelect}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

// Modal component for browsing all Linear projects
interface LinearProjectModalProps {
  apiKey: string;
  onSelect: (project: LinearApiProject, teamId: string) => void;
  onClose: () => void;
}

function LinearProjectModal({ apiKey, onSelect, onClose }: LinearProjectModalProps) {
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [projects, setProjects] = useState<LinearApiProject[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  // Load teams on mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamsData = await commands.getLinearTeams(apiKey);
        setTeams(teamsData);
        // Auto-select first team if only one
        if (teamsData.length === 1) {
          setSelectedTeamId(teamsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load teams:', err);
        setError('Failed to load Linear teams');
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, [apiKey]);

  // Load projects when team is selected
  useEffect(() => {
    if (!selectedTeamId) {
      setProjects([]);
      return;
    }

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const projectsData = await commands.getLinearTeamProjects(apiKey, selectedTeamId);
        setProjects(projectsData);
        setError(null);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects');
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, [apiKey, selectedTeamId]);

  // Close team dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-lg font-medium text-white">Select Linear Project</h3>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-auto">
          {loadingTeams ? (
            <p className="text-neutral-500">Loading teams...</p>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : (
            <>
              {/* Team selector */}
              <div className="mb-4 relative" ref={teamDropdownRef}>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Team</label>
                <button
                  type="button"
                  onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                  className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]"
                >
                  <span className={selectedTeam ? 'text-white' : 'text-neutral-500'}>
                    {selectedTeam?.name ?? 'Select a team...'}
                  </span>
                  <svg
                    className={`w-4 h-4 text-neutral-500 transition-transform ${isTeamDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isTeamDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-lg max-h-40 overflow-auto">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setIsTeamDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left transition-colors ${
                          selectedTeamId === team.id
                            ? 'bg-[#5E6AD2] text-white'
                            : 'text-white hover:bg-neutral-800'
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Projects list */}
              {selectedTeamId && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Project</label>
                  {loadingProjects ? (
                    <p className="text-neutral-500 text-sm">Loading projects...</p>
                  ) : projects.length === 0 ? (
                    <p className="text-neutral-500 text-sm">No projects found in this team.</p>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-auto">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => onSelect(project, selectedTeamId)}
                          className="w-full text-left px-3 py-2 bg-neutral-900 border border-neutral-800 rounded hover:border-neutral-700 hover:bg-neutral-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-white">{project.name}</span>
                            {project.state && (
                              <span className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                                {project.state}
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-xs text-neutral-500 mt-1 truncate">{project.description}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
