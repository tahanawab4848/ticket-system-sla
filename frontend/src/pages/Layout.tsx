import { User } from '../types';
import { api } from '../api/client';

type View = 'dashboard' | 'tickets' | 'new-ticket' | 'ticket-detail';

interface Props {
  user: User;
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems = [
  { view: 'dashboard' as View, label: 'Dashboard', icon: '📊' },
  { view: 'tickets' as View, label: 'Tickets', icon: '🎫' },
];

export default function Layout({ user, currentView, onNavigate, onLogout, children }: Props) {
  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    onLogout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">ST</div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Support</div>
              <div className="text-xs text-gray-400">Ticket System</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
                currentView === item.view || (item.view === 'tickets' && currentView === 'ticket-detail')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t">
          <div className="px-3 py-2 text-xs space-y-0.5">
            <div className="font-medium text-gray-900 truncate">{user.name}</div>
            <div className="text-gray-400 capitalize">{user.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mt-1"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
