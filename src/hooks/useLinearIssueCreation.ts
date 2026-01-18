import { useState, useCallback } from 'react';
import type { LinearProject, LinearConfig, TimeboxWithSessions } from '../lib/types';
import { commands } from '../lib/commands';

interface UseLinearIssueCreationOptions {
  timebox: TimeboxWithSessions;
  currentProject: LinearProject | undefined;
  onSuccess?: () => void;
  syncToInProgress?: boolean;
}

interface UseLinearIssueCreationReturn {
  isCreatingIssue: boolean;
  createIssue: () => Promise<void>;
}

export function useLinearIssueCreation({
  timebox,
  currentProject,
  onSuccess,
  syncToInProgress = false,
}: UseLinearIssueCreationOptions): UseLinearIssueCreationReturn {
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  const createIssue = useCallback(async () => {
    if (!currentProject) return;

    setIsCreatingIssue(true);
    try {
      const integration = await commands.getIntegrationByType('linear');
      if (!integration) {
        console.error('No Linear integration configured');
        return;
      }

      const config = integration.connection_config as unknown as LinearConfig;
      const result = await commands.createLinearIssue(config.api_key, {
        title: timebox.intention,
        description: timebox.notes || undefined,
        project_id: currentProject.linear_project_id,
        team_id: currentProject.linear_team_id,
      });

      if (result.success && result.issue) {
        await commands.setTimeboxLinearIssue(timebox.id, result.issue.id, result.issue.url);

        // Sync to In Progress state if requested (for active timeboxes)
        if (syncToInProgress) {
          const states = await commands.getLinearTeamStates(config.api_key, currentProject.linear_team_id);
          const inProgressState = states.find(s => s.state_type === 'started');
          if (inProgressState) {
            await commands.updateLinearIssueState(config.api_key, result.issue.id, inProgressState.id);
          }
        }

        onSuccess?.();
      } else if (result.error) {
        console.error('Failed to create Linear issue:', result.error);
      }
    } catch (error) {
      console.error('Failed to create Linear issue:', error);
    } finally {
      setIsCreatingIssue(false);
    }
  }, [timebox, currentProject, onSuccess, syncToInProgress]);

  return { isCreatingIssue, createIssue };
}
