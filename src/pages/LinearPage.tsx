import { useState, useEffect, useCallback, useRef } from 'react';
import { commands } from '../lib/commands';
import type { LinearTeam, LinearApiProject, LinearProject, LinearConfig } from '../lib/types';
import { ProjectIssuesView } from '../components/ProjectIssuesView';

interface SelectedProject {
  projectId: string;
  projectName: string;
  localProjectId?: number;
  teamId: string;
}

interface LinearPageProps {
  onTimeboxCreated?: () => void;
  onNavigateToTimebox?: (issueId: string) => void;
}

export function LinearPage({ onTimeboxCreated, onNavigateToTimebox }: LinearPageProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [teams, setTeams] = useState<LinearTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [apiProjects, setApiProjects] = useState<LinearApiProject[]>([]);
  const [savedProjects, setSavedProjects] = useState<LinearProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);

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

  // Load API key from integration
  const loadApiKey = useCallback(async () => {
    try {
      const integration = await commands.getIntegrationByType('linear');
      if (integration) {
        const config = integration.connection_config as unknown as LinearConfig;
        setApiKey(config.api_key);
        return config.api_key;
      }
      return null;
    } catch (err) {
      console.error('Failed to load Linear integration:', err);
      setError('Failed to load Linear integration');
      return null;
    }
  }, []);

  // Load teams from Linear API
  const loadTeams = useCallback(async (key: string) => {
    try {
      const teamsData = await commands.getLinearTeams(key);
      setTeams(teamsData);
      setError(null);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError('Failed to load teams from Linear');
    }
  }, []);

  // Load saved projects from local DB
  const loadSavedProjects = useCallback(async () => {
    try {
      const projects = await commands.getLinearProjects();
      setSavedProjects(projects);
    } catch (err) {
      console.error('Failed to load saved projects:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const key = await loadApiKey();
      if (key) {
        await Promise.all([loadTeams(key), loadSavedProjects()]);
      }
      setLoading(false);
    };
    init();
  }, [loadApiKey, loadTeams, loadSavedProjects]);

  // Load projects when team is selected
  useEffect(() => {
    if (!selectedTeamId || !apiKey) return;

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const projects = await commands.getLinearTeamProjects(apiKey, selectedTeamId);
        setApiProjects(projects);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects from Linear');
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, [selectedTeamId, apiKey]);

  const handleSaveProject = async (project: LinearApiProject) => {
    if (!selectedTeamId) return;
    try {
      await commands.saveLinearProject({
        linear_project_id: project.id,
        linear_team_id: selectedTeamId,
        name: project.name,
        description: project.description ?? undefined,
        state: project.state ?? undefined,
      });
      await loadSavedProjects();
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleToggleActive = async (project: LinearProject) => {
    try {
      await commands.toggleLinearProjectActive(
        project.linear_project_id,
        !project.is_active_timebox_project
      );
      await loadSavedProjects();
    } catch (err) {
      console.error('Failed to toggle project:', err);
    }
  };

  const getSavedProject = (linearProjectId: string) => {
    return savedProjects.find((p) => p.linear_project_id === linearProjectId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Linear</h2>
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (error && !teams.length) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Linear</h2>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const activeProjects = savedProjects.filter((p) => p.is_active_timebox_project);

  // Show issues sub-view if a project is selected
  if (selectedProject && apiKey) {
    return (
      <ProjectIssuesView
        apiKey={apiKey}
        projectId={selectedProject.projectId}
        projectName={selectedProject.projectName}
        localProjectId={selectedProject.localProjectId}
        teamId={selectedProject.teamId}
        onBack={() => setSelectedProject(null)}
        onTimeboxCreated={onTimeboxCreated}
        onNavigateToTimebox={onNavigateToTimebox}
      />
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Linear</h2>

      {/* Active Timebox Projects Section */}
      {activeProjects.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-neutral-300 mb-4">Active Timebox Projects</h3>
          <div className="space-y-2">
            {activeProjects.map((project) => (
              <div
                key={project.id}
                onClick={() =>
                  setSelectedProject({
                    projectId: project.linear_project_id,
                    projectName: project.name,
                    localProjectId: project.id,
                    teamId: project.linear_team_id,
                  })
                }
                className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-4 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-neutral-500 mt-1">{project.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(project);
                  }}
                  className="px-3 py-1 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-300 mb-2">Select Team</label>
        <div className="relative max-w-md" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-neutral-800 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] focus:border-transparent"
          >
            <span className={selectedTeamId ? 'text-white' : 'text-neutral-500'}>
              {selectedTeamId
                ? teams.find((t) => t.id === selectedTeamId)?.name ?? 'Choose a team...'
                : 'Choose a team...'}
            </span>
            <svg
              className={`w-4 h-4 text-neutral-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamId(null);
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                Choose a team...
              </button>
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setIsDropdownOpen(false);
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
      </div>

      {/* Projects List */}
      {selectedTeamId && (
        <div>
          <h3 className="text-lg font-medium text-neutral-300 mb-4">Projects</h3>
          {loadingProjects ? (
            <p className="text-neutral-500">Loading projects...</p>
          ) : apiProjects.length === 0 ? (
            <p className="text-neutral-500">No projects found for this team.</p>
          ) : (
            <div className="space-y-3">
              {apiProjects.map((project) => {
                const saved = getSavedProject(project.id);
                const isSaved = !!saved;
                const isActive = saved?.is_active_timebox_project ?? false;

                return (
                  <div
                    key={project.id}
                    onClick={() =>
                      setSelectedProject({
                        projectId: project.id,
                        projectName: project.name,
                        localProjectId: saved?.id,
                        teamId: selectedTeamId!,
                      })
                    }
                    className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-4 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{project.name}</p>
                        {project.state && (
                          <span className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                            {project.state}
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-neutral-500 mt-1 truncate">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!isSaved ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveProject(project);
                          }}
                          className="px-3 py-1.5 text-sm bg-neutral-800 text-white rounded hover:bg-neutral-700 transition-colors"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(saved);
                          }}
                          className={`px-3 py-1.5 text-sm rounded transition-colors ${
                            isActive
                              ? 'bg-[#5E6AD2] text-white hover:bg-[#4f5ab8]'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                        >
                          {isActive ? 'Active' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Saved Projects Summary */}
      {savedProjects.length > 0 && !selectedTeamId && (
        <div>
          <h3 className="text-lg font-medium text-neutral-300 mb-4">Saved Projects</h3>
          <div className="space-y-2">
            {savedProjects.map((project) => (
              <div
                key={project.id}
                onClick={() =>
                  setSelectedProject({
                    projectId: project.linear_project_id,
                    projectName: project.name,
                    localProjectId: project.id,
                    teamId: project.linear_team_id,
                  })
                }
                className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-4 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors"
              >
                <div>
                  <p className="font-medium text-white">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-neutral-500 mt-1">{project.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(project);
                  }}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    project.is_active_timebox_project
                      ? 'bg-[#5E6AD2] text-white hover:bg-[#4f5ab8]'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {project.is_active_timebox_project ? 'Active' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
