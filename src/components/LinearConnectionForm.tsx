import { useState } from 'react';
import { commands } from '../lib/commands';

interface LinearConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function LinearConnectionForm({ onSuccess, onCancel }: LinearConnectionFormProps) {
  const [connectionName, setConnectionName] = useState('Linear');
  const [apiKey, setApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<{ userName: string; userEmail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setTestStatus('testing');
    setError(null);
    setTestResult(null);

    try {
      const result = await commands.testLinearConnection(apiKey.trim());

      if (result.success && result.user_name && result.user_email) {
        setTestStatus('success');
        setTestResult({
          userName: result.user_name,
          userEmail: result.user_email,
        });
      } else {
        setTestStatus('error');
        setError(result.error || 'Failed to verify API key');
      }
    } catch (err) {
      console.error('Failed to test connection:', err);
      setTestStatus('error');
      setError('Failed to connect to Linear. Please check your internet connection.');
    }
  };

  const handleSave = async () => {
    if (testStatus !== 'success') return;

    setIsSaving(true);
    setError(null);

    try {
      await commands.createIntegration({
        connection_name: connectionName.trim() || 'Linear',
        integration_type: 'linear',
        connection_config: {
          api_key: apiKey.trim(),
        },
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to save integration:', err);
      setError('Failed to save integration. Please try again.');
      setIsSaving(false);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    // Reset test status when API key changes
    if (testStatus !== 'idle') {
      setTestStatus('idle');
      setTestResult(null);
      setError(null);
    }
  };

  const isDisabled = testStatus === 'testing' || isSaving;

  return (
    <div className="max-w-md">
      <h3 className="text-xl font-semibold text-white mb-2">Connect Linear</h3>
      <p className="text-neutral-400 text-sm mb-6">
        Enter your Linear API key to connect your account. You can create one at{' '}
        <a
          href="https://linear.app/settings/account/security"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5E6AD2] hover:underline"
        >
          Linear Settings &rarr; Security & Access
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
          placeholder="Linear"
          className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]"
          disabled={isDisabled}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="apiKey" className="block text-sm font-medium text-neutral-300 mb-2">
          API Key
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="lin_api_..."
          className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]"
          disabled={isDisabled}
        />
      </div>

      {/* Test result success message */}
      {testStatus === 'success' && testResult && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400 text-sm font-medium">Connection verified</span>
          </div>
          <p className="text-neutral-300 text-sm">
            Connected as <span className="font-medium">{testResult.userName}</span> ({testResult.userEmail})
          </p>
        </div>
      )}

      {/* Error message */}
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
            disabled={isDisabled || !apiKey.trim()}
            className="flex-1 px-4 py-2 bg-[#5E6AD2] text-white rounded-lg hover:bg-[#4f5ab8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
