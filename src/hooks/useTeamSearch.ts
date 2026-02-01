import { useState, useCallback, useRef, useEffect } from 'react';
import { commands } from '../lib/commands';
import type { LinearTeam } from '../lib/types';

interface UseTeamSearchOptions {
  apiKey: string;
  debounceMs?: number;
  minSearchLength?: number;
}

interface UseTeamSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: LinearTeam[];
  isSearching: boolean;
  error: string | null;
  clearSearch: () => void;
}

export function useTeamSearch({
  apiKey,
  debounceMs = 300,
  minSearchLength = 2,
}: UseTeamSearchOptions): UseTeamSearchReturn {
  const [searchTerm, setSearchTermState] = useState('');
  const [results, setResults] = useState<LinearTeam[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search for very short terms
    if (term.trim().length < minSearchLength) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const searchResults = await commands.searchLinearTeams(apiKey, term.trim());

        // Check if this request was aborted
        if (controller.signal.aborted) return;

        setResults(searchResults);
        setError(null);
      } catch (err) {
        // Check if this request was aborted
        if (controller.signal.aborted) return;

        console.error('Team search failed:', err);
        setError('Search failed');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, debounceMs);
  }, [apiKey, debounceMs, minSearchLength]);

  const clearSearch = useCallback(() => {
    setSearchTermState('');
    setResults([]);
    setError(null);
    setIsSearching(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { searchTerm, setSearchTerm, results, isSearching, error, clearSearch };
}
