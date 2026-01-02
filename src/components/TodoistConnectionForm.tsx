import { useState } from 'react';
import { commands } from '../lib/commands';

interface TodoistConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function TodoistConnectionForm({ onSuccess, onCancel }: TodoistConnectionFormProps) {
  const [connectionName, setConnectionName] = useState('Todoist');
  const [apiToken, setApiToken] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<{ userName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestConnection = async () => {
    if (!apiToken.trim()) {
      setError('API token is required');
      return;
    }

    setTestStatus('testing');
    setError(null);
    setTestResult(null);

    try {
      const result = await commands.testTodoistConnection(apiToken.trim());

      if (result.success && result.user_name) {
        setTestStatus('success');
        setTestResult({
          userName: result.user_name,
        });
      } else {
        setTestStatus('error');
        setError(result.error || 'Failed to verify API token');
      }
    } catch (err) {
      console.error('Failed to test connection:', err);
      setTestStatus('error');
      setError('Failed to connect to Todoist. Please check your internet connection.');
    }
  };

  const handleSave = async () => {
    if (testStatus !== 'success') return;

    setIsSaving(true);
    setError(null);

    try {
      await commands.createIntegration({
        connection_name: connectionName.trim() || 'Todoist',
        integration_type: 'todoist',
        connection_config: {
          api_token: apiToken.trim(),
        },
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to save integration:', err);
      setError('Failed to save integration. Please try again.');
      setIsSaving(false);
    }
  };

  const handleApiTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiToken(e.target.value);
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestResult(null);
      setError(null);
    }
  };

  const isDisabled = testStatus === 'testing' || isSaving;

  return (
    <div className="max-w-md">
      <h3 className="text-xl font-semibold text-white mb-2">Connect Todoist</h3>
      <p className="text-neutral-400 text-sm mb-6">
        Enter your Todoist API token to connect your account. You can find it at{' '}
        <a
          href="https://todoist.com/app/settings/integrations/developer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#E44332] hover:underline"
        >
          Todoist Settings &rarr; Integrations &rarr; Developer
        </a>
      </p>

      <div className="mb-4">
        <label htmlFor="connectionName" className="block text-sm font-medium text-neutral-300 mb-2">
          Connection Name
        </label>
        <input
          type="text"
          id="connectionName"
          value={connectionName}
          onChange={(e) => setConnectionName(e.target.value)}
          placeholder="Todoist"
          className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E44332]"
          disabled={isDisabled}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="apiToken" className="block text-sm font-medium text-neutral-300 mb-2">
          API Token
        </label>
        <input
          type="password"
          id="apiToken"
          value={apiToken}
          onChange={handleApiTokenChange}
          placeholder="Enter your Todoist API token"
          className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E44332]"
          disabled={isDisabled}
        />
      </div>

      {testStatus === 'success' && testResult && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400 text-sm font-medium">Connection verified</span>
          </div>
          <p className="text-neutral-300 text-sm">
            Connected as <span className="font-medium">{testResult.userName}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDisabled}
          className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>

        {testStatus !== 'success' ? (
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isDisabled || !apiToken.trim()}
            className="flex-1 px-4 py-2 bg-[#E44332] text-white rounded-lg hover:bg-[#c93a2b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {testStatus === 'testing' ? 'Testing Connection...' : 'Test Connection'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSaving ? 'Saving...' : 'Add Integration'}
          </button>
        )}
      </div>
    </div>
  );
}
