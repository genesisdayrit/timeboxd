import { useState, useEffect, useCallback } from 'react';
import { commands } from './lib/commands';
import type { TimeboxWithSessions } from './lib/types';
import { useTimers } from './hooks/useTimers';
import { LeftNav, type Page } from './components/LeftNav';
import { SessionsPage } from './pages/SessionsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { LinearPage } from './pages/LinearPage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('sessions');
  const [timeboxes, setTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [archivedTimeboxes, setArchivedTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [activeTimeboxes, setActiveTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLinearConnected, setIsLinearConnected] = useState(false);

  const checkLinearConnection = useCallback(async () => {
    try {
      const integration = await commands.getIntegrationByType('linear');
      setIsLinearConnected(!!integration);
    } catch (error) {
      console.error('Failed to check Linear connection:', error);
      setIsLinearConnected(false);
    }
  }, []);

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
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getTimer, formatTime } = useTimers(activeTimeboxes, refreshData);

  useEffect(() => {
    refreshData();
    checkLinearConnection();
  }, [refreshData, checkLinearConnection]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      <LeftNav currentPage={currentPage} onNavigate={setCurrentPage} isLinearConnected={isLinearConnected} />
      <main className="flex-1 overflow-auto">
        {currentPage === 'sessions' && (
          <SessionsPage
            timeboxes={timeboxes}
            archivedTimeboxes={archivedTimeboxes}
            activeTimeboxes={activeTimeboxes}
            getTimer={getTimer}
            formatTime={formatTime}
            onUpdate={refreshData}
          />
        )}
        {currentPage === 'integrations' && <IntegrationsPage onLinearConnectionChange={checkLinearConnection} />}
        {currentPage === 'linear' && <LinearPage onTimeboxCreated={refreshData} />}
      </main>
    </div>
  );
}

export default App;
