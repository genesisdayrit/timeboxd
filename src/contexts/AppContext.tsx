import { createContext, useContext, useCallback, useState, useEffect, useMemo, type ReactNode } from 'react';
import { commands } from '../lib/commands';
import type { TimeboxWithSessions, Integration, LinearConfig, IntegrationType } from '../lib/types';
import type { Page } from '../components/LeftNav';

// ============================================
// TYPE DEFINITIONS
// ============================================

// Integration subsection types
interface LinearSettings {
  isConnected: boolean;
  openInNativeApp: boolean;
  apiKey: string | null;
}

interface TodoistSettings {
  isConnected: boolean;
  apiToken: string | null;
}

interface IntegrationsState {
  linear: LinearSettings;
  todoist: TodoistSettings;
  integrations: Integration[];
  loading: boolean;
}

interface IntegrationsActions {
  refreshIntegrations: () => Promise<void>;
  updateLinearOpenInNativeApp: (value: boolean) => Promise<void>;
  checkConnection: (type: IntegrationType) => Promise<boolean>;
}

// Navigation subsection types
interface NavigationState {
  currentPage: Page;
  highlightedIssueId: string | null;
}

interface NavigationActions {
  navigateTo: (page: Page) => void;
  highlightIssue: (issueId: string) => void;
  clearHighlight: () => void;
  navigateToTimebox: (issueId: string) => void;
}

// Timebox subsection types
interface TimeboxState {
  timeboxes: TimeboxWithSessions[];
  activeTimeboxes: TimeboxWithSessions[];
  archivedTimeboxes: TimeboxWithSessions[];
  loading: boolean;
}

interface TimeboxActions {
  refreshData: () => Promise<void>;
}

// Combined App Context
interface AppContextValue {
  integrations: IntegrationsState & IntegrationsActions;
  navigation: NavigationState & NavigationActions;
  timeboxes: TimeboxState & TimeboxActions;
  isInitializing: boolean;
  refreshAll: () => Promise<void>;
}

// Default values
const defaultLinearSettings: LinearSettings = {
  isConnected: false,
  openInNativeApp: false,
  apiKey: null,
};

const defaultTodoistSettings: TodoistSettings = {
  isConnected: false,
  apiToken: null,
};

// ============================================
// CONTEXT CREATION
// ============================================

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // ========================================
  // INITIALIZATION STATE
  // ========================================
  const [isInitializing, setIsInitializing] = useState(true);

  // ========================================
  // INTEGRATIONS STATE
  // ========================================
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [linearSettings, setLinearSettings] = useState<LinearSettings>(defaultLinearSettings);
  const [todoistSettings, setTodoistSettings] = useState<TodoistSettings>(defaultTodoistSettings);

  // ========================================
  // NAVIGATION STATE
  // ========================================
  const [currentPage, setCurrentPage] = useState<Page>('sessions');
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);

  // ========================================
  // TIMEBOX STATE
  // ========================================
  const [timeboxes, setTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [activeTimeboxes, setActiveTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [archivedTimeboxes, setArchivedTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [timeboxLoading, setTimeboxLoading] = useState(true);

  // ========================================
  // INTEGRATION ACTIONS
  // ========================================
  const refreshIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    try {
      const data = await commands.getIntegrations();
      setIntegrations(data);

      // Extract Linear settings
      const linearIntegration = data.find(i => i.integration_type === 'linear');
      if (linearIntegration) {
        const config = linearIntegration.connection_config as unknown as LinearConfig;
        setLinearSettings({
          isConnected: true,
          openInNativeApp: config.open_in_native_app ?? false,
          apiKey: config.api_key,
        });
      } else {
        setLinearSettings(defaultLinearSettings);
      }

      // Extract Todoist settings
      const todoistIntegration = data.find(i => i.integration_type === 'todoist');
      if (todoistIntegration) {
        const config = todoistIntegration.connection_config as Record<string, unknown>;
        setTodoistSettings({
          isConnected: true,
          apiToken: (config.api_token as string) ?? null,
        });
      } else {
        setTodoistSettings(defaultTodoistSettings);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  const updateLinearOpenInNativeApp = useCallback(async (value: boolean) => {
    // Get fresh integration data to avoid stale closure issues
    const currentIntegrations = await commands.getIntegrations();
    const linearIntegration = currentIntegrations.find(i => i.integration_type === 'linear');
    if (!linearIntegration) return;

    const currentConfig = linearIntegration.connection_config as unknown as LinearConfig;

    try {
      await commands.updateIntegrationConfig(linearIntegration.id, {
        ...currentConfig,
        open_in_native_app: value,
      });

      // Update local state only - no need to refresh everything
      setLinearSettings(prev => ({ ...prev, openInNativeApp: value }));
    } catch (error) {
      console.error('Failed to update Linear setting:', error);
      throw error;
    }
  }, []);

  const checkConnection = useCallback(async (type: IntegrationType): Promise<boolean> => {
    try {
      const integration = await commands.getIntegrationByType(type);
      return !!integration;
    } catch {
      return false;
    }
  }, []);

  // ========================================
  // NAVIGATION ACTIONS
  // ========================================
  const navigateTo = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);

  const highlightIssue = useCallback((issueId: string) => {
    setHighlightedIssueId(issueId);
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedIssueId(null);
  }, []);

  const navigateToTimebox = useCallback((issueId: string) => {
    setHighlightedIssueId(issueId);
    setCurrentPage('sessions');
    // Auto-clear highlight after animation
    setTimeout(() => setHighlightedIssueId(null), 2000);
  }, []);

  // ========================================
  // TIMEBOX ACTIONS
  // ========================================
  const refreshData = useCallback(async () => {
    try {
      const [todayBoxes, active, archived] = await Promise.all([
        commands.getTodayTimeboxes(),
        commands.getActiveTimeboxes(),
        commands.getArchivedTimeboxes(),
      ]);
      setTimeboxes(todayBoxes);
      setActiveTimeboxes(active);
      setArchivedTimeboxes(archived);
    } catch (error) {
      console.error('Failed to fetch timebox data:', error);
    } finally {
      setTimeboxLoading(false);
    }
  }, []);

  // ========================================
  // GLOBAL ACTIONS
  // ========================================
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshIntegrations(),
      refreshData(),
    ]);
  }, [refreshIntegrations, refreshData]);

  // ========================================
  // INITIALIZATION
  // ========================================
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      await Promise.all([
        refreshIntegrations(),
        refreshData(),
      ]);
      setIsInitializing(false);
    };
    initialize();
  }, [refreshIntegrations, refreshData]);

  // ========================================
  // MEMOIZED CONTEXT VALUE
  // ========================================
  const value = useMemo<AppContextValue>(() => ({
    integrations: {
      linear: linearSettings,
      todoist: todoistSettings,
      integrations,
      loading: integrationsLoading,
      refreshIntegrations,
      updateLinearOpenInNativeApp,
      checkConnection,
    },
    navigation: {
      currentPage,
      highlightedIssueId,
      navigateTo,
      highlightIssue,
      clearHighlight,
      navigateToTimebox,
    },
    timeboxes: {
      timeboxes,
      activeTimeboxes,
      archivedTimeboxes,
      loading: timeboxLoading,
      refreshData,
    },
    isInitializing,
    refreshAll,
  }), [
    linearSettings,
    todoistSettings,
    integrations,
    integrationsLoading,
    refreshIntegrations,
    updateLinearOpenInNativeApp,
    checkConnection,
    currentPage,
    highlightedIssueId,
    navigateTo,
    highlightIssue,
    clearHighlight,
    navigateToTimebox,
    timeboxes,
    activeTimeboxes,
    archivedTimeboxes,
    timeboxLoading,
    refreshData,
    isInitializing,
    refreshAll,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================
// CUSTOM HOOKS
// ============================================

/**
 * Main hook to access the full AppContext
 * @throws Error if used outside AppProvider
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

/**
 * Convenience hook for integration-related state and actions
 */
export function useIntegrations() {
  const { integrations } = useAppContext();
  return integrations;
}

/**
 * Convenience hook specifically for Linear settings
 * Most common use case for the linearOpenInNativeApp setting
 */
export function useLinear() {
  const { integrations } = useAppContext();
  return {
    ...integrations.linear,
    updateOpenInNativeApp: integrations.updateLinearOpenInNativeApp,
    refresh: integrations.refreshIntegrations,
  };
}

/**
 * Convenience hook for navigation state and actions
 */
export function useNavigation() {
  const { navigation } = useAppContext();
  return navigation;
}

/**
 * Convenience hook for timebox data and refresh
 */
export function useTimeboxes() {
  const { timeboxes } = useAppContext();
  return timeboxes;
}
