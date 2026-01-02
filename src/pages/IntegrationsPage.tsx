import { useState, useEffect } from 'react';
import { commands } from '../lib/commands';
import { LinearConnectionForm } from '../components/LinearConnectionForm';
import type { Integration } from '../lib/types';

type View = 'list' | 'connect-linear' | 'success';

interface IntegrationsPageProps {
  onLinearConnectionChange?: () => void;
}

export function IntegrationsPage({ onLinearConnectionChange }: IntegrationsPageProps) {
  const [view, setView] = useState<View>('list');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIntegrations = async () => {
    try {
      const data = await commands.getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleConnectionSuccess = () => {
    setView('success');
    loadIntegrations();
    onLinearConnectionChange?.();
  };

  const handleDeleteIntegration = async (id: number) => {
    try {
      await commands.deleteIntegration(id);
      loadIntegrations();
      onLinearConnectionChange?.();
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Integrations</h2>
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  // Success view after connecting
  if (view === 'success') {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Integrations</h2>
        <div className="max-w-md bg-[#0a0a0a] rounded-lg p-6 border border-neutral-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Successfully connected to Linear</h3>
              <p className="text-neutral-400 text-sm">Your Linear integration is now active.</p>
            </div>
          </div>
          <button
            onClick={() => setView('list')}
            className="w-full px-4 py-2 bg-[#5E6AD2] text-white rounded-lg hover:bg-[#4f5ab8] transition-colors font-medium"
          >
            Return to Integrations
          </button>
        </div>
      </div>
    );
  }

  // Connect Linear form view
  if (view === 'connect-linear') {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Integrations</h2>
        <div className="bg-[#0a0a0a] rounded-lg p-6 border border-neutral-800">
          <LinearConnectionForm
            onSuccess={handleConnectionSuccess}
            onCancel={() => setView('list')}
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Integrations</h2>

      {/* Connected integrations */}
      {integrations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-neutral-300 mb-4">Connected</h3>
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-4 border border-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#5E6AD2]/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#5E6AD2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7zm9 10l7-3.5V8.5L12 12v5zm-7-3.5l7 3.5v-5L5 8.5v5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">{integration.connection_name}</p>
                    <p className="text-sm text-neutral-500 capitalize">{integration.integration_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteIntegration(integration.id)}
                  className="px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available integrations */}
      <div>
        <h3 className="text-lg font-medium text-neutral-300 mb-4">
          {integrations.length > 0 ? 'Add More' : 'Available Integrations'}
        </h3>
        <div className="grid gap-4">
          <button
            onClick={() => setView('connect-linear')}
            className="flex items-center gap-4 bg-[#0a0a0a] rounded-lg p-4 border border-neutral-800 hover:border-neutral-700 transition-colors text-left"
          >
            <div className="w-12 h-12 bg-[#5E6AD2]/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#5E6AD2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 7l9-4 9 4v10l-9 4-9-4V7zm9 10l7-3.5V8.5L12 12v5zm-7-3.5l7 3.5v-5L5 8.5v5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Linear</p>
              <p className="text-sm text-neutral-500">Connect your Linear workspace to sync issues</p>
            </div>
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
