import { useState, useEffect, useCallback } from 'react';
import { commands } from './lib/commands';
import type { TimeboxWithSessions } from './lib/types';
import { TimeboxForm } from './components/TimeboxForm';
import { TimeboxList } from './components/TimeboxList';
import { ActiveTimeboxes } from './components/ActiveTimeboxes';
import { useTimers } from './hooks/useTimers';
import './App.css';

function App() {
  const [timeboxes, setTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [archivedTimeboxes, setArchivedTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [activeTimeboxes, setActiveTimeboxes] = useState<TimeboxWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

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
  }, [refreshData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-100">timeboxd</h1>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600 transition-colors"
          >
            {showCompleted ? 'Hide Completed' : 'View Completed'}
          </button>
        </div>

        <TimeboxForm onCreated={refreshData} />

        <ActiveTimeboxes
          timeboxes={activeTimeboxes}
          getTimer={getTimer}
          formatTime={formatTime}
          onUpdate={refreshData}
        />

        <TimeboxList
          timeboxes={timeboxes}
          archivedTimeboxes={archivedTimeboxes}
          onUpdate={refreshData}
          showCompleted={showCompleted}
        />
      </div>
    </div>
  );
}

export default App;
