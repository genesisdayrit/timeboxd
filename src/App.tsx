import { AppProvider, useAppContext } from './contexts/AppContext';
import { useTimers } from './hooks/useTimers';
import { LeftNav } from './components/LeftNav';
import { SessionsPage } from './pages/SessionsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { LinearPage } from './pages/LinearPage';
import { UpdateChecker } from './components/UpdateChecker';
import './App.css';

function AppContent() {
  const { navigation, timeboxes, integrations, isInitializing } = useAppContext();
  const { getTimer, formatTime } = useTimers(timeboxes.activeTimeboxes, timeboxes.refreshData);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      <LeftNav
        currentPage={navigation.currentPage}
        onNavigate={navigation.navigateTo}
        isLinearConnected={integrations.linear.isConnected}
      />
      <main className="flex-1 overflow-auto">
        {navigation.currentPage === 'sessions' && (
          <SessionsPage
            timeboxes={timeboxes.timeboxes}
            archivedTimeboxes={timeboxes.archivedTimeboxes}
            activeTimeboxes={timeboxes.activeTimeboxes}
            getTimer={getTimer}
            formatTime={formatTime}
            onUpdate={timeboxes.refreshData}
            highlightedIssueId={navigation.highlightedIssueId}
          />
        )}
        {navigation.currentPage === 'integrations' && (
          <IntegrationsPage onLinearConnectionChange={integrations.refreshIntegrations} />
        )}
        {navigation.currentPage === 'linear' && (
          <LinearPage
            onTimeboxCreated={timeboxes.refreshData}
            onNavigateToTimebox={navigation.navigateToTimebox}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <UpdateChecker />
      <AppContent />
    </AppProvider>
  );
}

export default App;
