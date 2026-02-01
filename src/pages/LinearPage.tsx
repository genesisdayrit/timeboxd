import { useState, useEffect, useCallback, useMemo } from 'react';
import { commands } from '../lib/commands';
import type { LinearTeam, LinearApiProject, LinearProject, LinearConfig } from '../lib/types';
import { ProjectIssuesView } from '../components/ProjectIssuesView';
import { LinearTeamPicker } from '../components/LinearTeamPicker';

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
  const [selectedProject, setSelectedProject] = useState<SelectedProject | null>(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');

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

    // Clear search when team changes
    setProjectSearchTerm('');

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

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm.trim()) {
      return apiProjects;
    }
    const term = projectSearchTerm.toLowerCase().trim();
    return apiProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        (project.description && project.description.toLowerCase().includes(term))
    );
  }, [apiProjects, projectSearchTerm]);

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
        {apiKey && (
          <LinearTeamPicker
            apiKey={apiKey}
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelect={setSelectedTeamId}
          />
        )}
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
            <>
              {/* Search Input */}
              <div className="relative mb-4">
                <svg
                  className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-8 py-2 bg-[#0a0a0a] border border-neutral-800 rounded-lg text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] focus:border-transparent"
                />
                {projectSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setProjectSearchTerm('')}
                    className="absolute right-2 top-2 p-0.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filtered Projects List */}
              {filteredProjects.length === 0 ? (
                <p className="text-neutral-500">No projects match your search.</p>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map((project) => {
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
                            <p className="text-sm text-neutral-500 mt-1 truncate">
                              {project.description}
                            </p>
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
            </>
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
