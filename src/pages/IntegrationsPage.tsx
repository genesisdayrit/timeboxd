import { useState, useEffect } from 'react';
import { commands } from '../lib/commands';
import { TodoistConnectionForm } from '../components/TodoistConnectionForm';
import type { Integration } from '../lib/types';

type ViewState = 'list' | 'connect-todoist' | 'success';

export function IntegrationsPage() {
  const [view, setView] = useState<ViewState>('list');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadIntegrations = async () => {
    try {
      const data = await commands.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleDisconnect = async (id: number) => {
    try {
      await commands.deleteIntegration(id);
      await loadIntegrations();
    } catch (err) {
      console.error('Failed to disconnect integration:', err);
    }
  };

  const handleConnectionSuccess = () => {
    setView('success');
    loadIntegrations();
  };

  const isTodoistConnected = integrations.some(i => i.integration_type === 'todoist');

  if (view === 'connect-todoist') {
    return (
      <div className="p-6">
        <TodoistConnectionForm
          onSuccess={handleConnectionSuccess}
          onCancel={() => setView('list')}
        />
      </div>
    );
  }

  if (view === 'success') {
    return (
      <div className="p-6">
        <div className="max-w-md">
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Integration Added!</h3>
            </div>
            <p className="text-neutral-300 text-sm">
              Your Todoist account has been connected successfully.
            </p>
          </div>
          <button
            onClick={() => setView('list')}
            className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Back to Integrations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Integrations</h2>

      {isLoading ? (
        <p className="text-neutral-400">Loading integrations...</p>
      ) : (
        <>
          {integrations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Connected</h3>
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {integration.integration_type === 'todoist' && (
                        <div className="w-10 h-10 bg-[#E44332] rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-1 16H4V6h16v13z"/>
                            <path d="M6 8h12v2H6zM6 12h12v2H6zM6 16h8v2H6z"/>
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{integration.connection_name}</p>
                        <p className="text-neutral-500 text-sm capitalize">{integration.integration_type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Available Integrations</h3>
            <div className="space-y-3">
              {!isTodoistConnected && (
                <div className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E44332] rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-1 16H4V6h16v13z"/>
                        <path d="M6 8h12v2H6zM6 12h12v2H6zM6 16h8v2H6z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">Todoist</p>
                      <p className="text-neutral-500 text-sm">Connect your Todoist account to sync tasks</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setView('connect-todoist')}
                    className="px-4 py-2 bg-[#E44332] text-white rounded-lg hover:bg-[#c93a2b] transition-colors font-medium"
                  >
                    Connect
                  </button>
                </div>
              )}

              {isTodoistConnected && (
                <p className="text-neutral-500 text-sm">All available integrations are connected.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
