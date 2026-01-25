import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { ask } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

export function UpdateChecker() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    try {
      const update = await check();
      if (update) {
        const confirmed = await ask(
          `Version ${update.version} is available. Would you like to update now?\n\n${update.body || ''}`,
          { title: 'Update Available', kind: 'info' }
        );

        if (confirmed) {
          setDownloading(true);
          let contentLength = 0;
          let downloaded = 0;

          await update.downloadAndInstall((event) => {
            if (event.event === 'Started') {
              contentLength = event.data.contentLength || 0;
            } else if (event.event === 'Progress') {
              downloaded += event.data.chunkLength;
              if (contentLength > 0) {
                setProgress(Math.round((downloaded / contentLength) * 100));
              }
            }
          });

          await relaunch();
        }
      }
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setDownloading(false);
    }
  }

  if (downloading) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-50">
        Downloading update... {progress}%
      </div>
    );
  }

  return null;
}
