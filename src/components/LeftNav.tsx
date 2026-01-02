type Page = 'sessions' | 'integrations' | 'linear';

interface LeftNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isLinearConnected: boolean;
}

export function LeftNav({ currentPage, onNavigate, isLinearConnected }: LeftNavProps) {
  const baseNavItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    {
      page: 'sessions',
      label: 'Sessions',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const linearNavItem: { page: Page; label: string; icon: React.ReactNode } = {
    page: 'linear',
    label: 'Linear',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  };

  const integrationsNavItem: { page: Page; label: string; icon: React.ReactNode } = {
    page: 'integrations',
    label: 'Integrations',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  };

  const navItems = [
    ...baseNavItems,
    ...(isLinearConnected ? [linearNavItem] : []),
    integrationsNavItem,
  ];

  return (
    <nav className="w-48 min-h-screen bg-neutral-950 border-r border-neutral-800 p-4 flex flex-col">
      <h1 className="text-xl font-extrabold text-white tracking-tight mb-8 px-2">
        timeboxd
      </h1>
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.page}>
            <button
              onClick={() => onNavigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === item.page
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type { Page };
