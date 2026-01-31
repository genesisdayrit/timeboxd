import type { AutoStoppedInfo } from '../hooks/useIdleDetection';

interface IdleReturnBannerProps {
  info: AutoStoppedInfo;
  onDismiss: () => void;
}

export function IdleReturnBanner({ info, onDismiss }: IdleReturnBannerProps) {
  const timeAgo = getTimeAgo(info.stoppedAt);
  const count = info.timeboxes.length;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              {count === 1 ? 'Timebox auto-stopped' : `${count} timeboxes auto-stopped`}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Stopped {timeAgo} due to inactivity
            </p>
            {count <= 3 && (
              <ul className="mt-2 space-y-1">
                {info.timeboxes.map((t) => (
                  <li key={t.id} className="text-xs text-neutral-300 truncate">
                    • {t.intention}
                  </li>
                ))}
              </ul>
            )}
            {count > 3 && (
              <p className="text-xs text-neutral-400 mt-2">
                Including: {info.timeboxes.slice(0, 2).map(t => t.intention).join(', ')}
                {count > 2 && ` and ${count - 2} more`}
              </p>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
