import { useState, useEffect, useRef, useMemo } from 'react';
import type { LinearProject, LinearSearchProject, SelectedLinearProject } from '../lib/types';
import { useProjectSearch } from '../hooks/useProjectSearch';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    error,
    clearSearch,
  } = useProjectSearch({ apiKey });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        clearSearch();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSearch]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  // Group search results by team
  const groupedResults = useMemo(() => {
    const grouped = new Map<string, { teamName: string; projects: LinearSearchProject[] }>();
    results.forEach(project => {
      // A project can belong to multiple teams, but usually just one
      const team = project.teams.nodes[0];
      if (team) {
        if (!grouped.has(team.id)) {
          grouped.set(team.id, { teamName: team.name, projects: [] });
        }
        grouped.get(team.id)!.projects.push(project);
      }
    });
    return grouped;
  }, [results]);

  const handleSavedProjectSelect = (project: LinearProject) => {
    onSelect({
      linearProjectId: project.linear_project_id,
      linearTeamId: project.linear_team_id,
      name: project.name,
      localDbId: project.id,
    });
    setIsDropdownOpen(false);
    clearSearch();
  };

  const handleSearchResultSelect = (project: LinearSearchProject) => {
    const team = project.teams.nodes[0];
    if (!team) return;

    // Check if this project is saved locally
    const savedProject = savedProjects.find(p => p.linear_project_id === project.id);
    onSelect({
      linearProjectId: project.id,
      linearTeamId: team.id,
      name: project.name,
      localDbId: savedProject?.id,
    });
    setIsDropdownOpen(false);
    clearSearch();
  };

  const handleClear = () => {
    onSelect(null);
    setIsDropdownOpen(false);
    clearSearch();
  };

  const isShowingSearchResults = searchTerm.length >= 2;

  return (
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
        <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b border-neutral-800">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-2.5 w-4 h-4 text-neutral-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search all projects..."
                className="w-full pl-8 pr-8 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] focus:border-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-2 p-0.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable results area */}
          <div className="overflow-auto flex-1">
            {isShowingSearchResults ? (
              // Search Results View
              <>
                {isSearching ? (
                  <div className="px-4 py-3 text-neutral-500 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </div>
                ) : error ? (
                  <div className="px-4 py-3 text-red-400 text-sm">{error}</div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-3 text-neutral-500 text-sm">No projects found</div>
                ) : (
                  Array.from(groupedResults.entries()).map(([teamId, { teamName, projects }]) => (
                    <div key={teamId}>
                      <div className="px-4 py-1.5 text-xs text-neutral-500 uppercase tracking-wide bg-neutral-900/50 sticky top-0">
                        {teamName}
                      </div>
                      {projects.map(project => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => handleSearchResultSelect(project)}
                          className="w-full text-left px-4 py-2 hover:bg-neutral-800 transition-colors"
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
                            <p className="text-xs text-neutral-500 mt-0.5 truncate">{project.description}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </>
            ) : (
              // Default View: No project + Quick Access
              <>
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

                {/* Hint to search */}
                {savedProjects.length === 0 && (
                  <div className="px-4 py-3 text-neutral-500 text-sm border-t border-neutral-800 mt-1">
                    Type to search all Linear projects
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
