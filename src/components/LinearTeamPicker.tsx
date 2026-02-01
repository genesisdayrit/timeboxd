import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { LinearTeam } from '../lib/types';
import { useTeamSearch } from '../hooks/useTeamSearch';

interface LinearTeamPickerProps {
  apiKey: string;
  teams: LinearTeam[];
  selectedTeamId: string | null;
  onSelect: (teamId: string | null) => void;
  disabled?: boolean;
}

export function LinearTeamPicker({
  apiKey,
  teams,
  selectedTeamId,
  onSelect,
  disabled = false,
}: LinearTeamPickerProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const {
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    error,
    clearSearch,
  } = useTeamSearch({ apiKey });

  const isShowingSearchResults = searchTerm.length >= 2;

  // Build the list of items for keyboard navigation
  const items = useMemo(() => {
    if (isShowingSearchResults) {
      if (isSearching || error || results.length === 0) {
        return [];
      }
      return results.map(team => ({ type: 'team' as const, id: team.id, name: team.name }));
    } else {
      const list: Array<{ type: 'clear' | 'team'; id: string | null; name: string }> = [
        { type: 'clear', id: null, name: 'Choose a team...' },
      ];
      teams.forEach(team => {
        list.push({ type: 'team', id: team.id, name: team.name });
      });
      return list;
    }
  }, [isShowingSearchResults, isSearching, error, results, teams]);

  // Reset highlighted index when items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [items]);

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

  // Scroll highlighted item into view
  useEffect(() => {
    const itemEl = itemRefs.current.get(highlightedIndex);
    if (itemEl && listRef.current) {
      itemEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleTeamSelect = useCallback((teamId: string) => {
    onSelect(teamId);
    setIsDropdownOpen(false);
    clearSearch();
  }, [onSelect, clearSearch]);

  const handleClear = useCallback(() => {
    onSelect(null);
    setIsDropdownOpen(false);
    clearSearch();
  }, [onSelect, clearSearch]);

  const handleSelectHighlighted = useCallback(() => {
    const item = items[highlightedIndex];
    if (!item) return;

    if (item.type === 'clear') {
      handleClear();
    } else {
      handleTeamSelect(item.id!);
    }
  }, [items, highlightedIndex, handleClear, handleTeamSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < items.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : prev
        );
        break;
      case 'Enter':
        e.preventDefault();
        handleSelectHighlighted();
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        clearSearch();
        break;
    }
  }, [isDropdownOpen, items.length, handleSelectHighlighted, clearSearch]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="relative max-w-md" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border border-neutral-800 text-white rounded-lg hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] focus:border-transparent"
      >
        <span className={selectedTeamId ? 'text-white' : 'text-neutral-500'}>
          {selectedTeam ? selectedTeam.name : 'Choose a team...'}
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
                placeholder="Search teams..."
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
          <div className="overflow-auto flex-1" ref={listRef}>
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
                  <div className="px-4 py-3 text-neutral-500 text-sm">No teams found</div>
                ) : (
                  results.map((team, index) => (
                    <button
                      key={team.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(index, el);
                        else itemRefs.current.delete(index);
                      }}
                      type="button"
                      onClick={() => handleTeamSelect(team.id)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full text-left px-4 py-2 transition-colors ${
                        highlightedIndex === index
                          ? 'bg-[#5E6AD2] text-white'
                          : selectedTeamId === team.id
                          ? 'bg-neutral-800 text-white'
                          : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))
                )}
              </>
            ) : (
              // Default View: All teams
              <>
                {/* Clear selection option */}
                <button
                  ref={(el) => {
                    if (el) itemRefs.current.set(0, el);
                    else itemRefs.current.delete(0);
                  }}
                  type="button"
                  onClick={handleClear}
                  onMouseEnter={() => setHighlightedIndex(0)}
                  className={`w-full text-left px-4 py-2 transition-colors ${
                    highlightedIndex === 0
                      ? 'bg-[#5E6AD2] text-white'
                      : 'text-neutral-500 hover:bg-neutral-800'
                  }`}
                >
                  Choose a team...
                </button>

                {/* All teams */}
                {teams.map((team, index) => {
                  const itemIndex = index + 1; // +1 because of "Choose a team..." option
                  return (
                    <button
                      key={team.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(itemIndex, el);
                        else itemRefs.current.delete(itemIndex);
                      }}
                      type="button"
                      onClick={() => handleTeamSelect(team.id)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      className={`w-full text-left px-4 py-2 transition-colors ${
                        highlightedIndex === itemIndex
                          ? 'bg-[#5E6AD2] text-white'
                          : selectedTeamId === team.id
                          ? 'bg-neutral-800 text-white'
                          : 'text-white hover:bg-neutral-800'
                      }`}
                    >
                      {team.name}
                    </button>
                  );
                })}

                {teams.length === 0 && (
                  <div className="px-4 py-3 text-neutral-500 text-sm">
                    No teams available
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
