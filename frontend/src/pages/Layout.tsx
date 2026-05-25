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
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Sidebar */}
      <aside className="w-60 glass-card rounded-none border-r border-white/10 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <div className="text-sm font-bold text-gray-100 tracking-wider bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text">ZETASENTRY</div>
              <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-widest">Intelligence Hub</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-all duration-200 ${
                currentView === item.view || (item.view === 'tickets' && currentView === 'ticket-detail')
                  ? 'bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs space-y-0.5">
            <div className="font-medium text-gray-200 truncate">{user.name}</div>
            <div className="text-gray-500 capitalize">{user.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 mt-1"
          >
            Sign out
          </button>
          <div className="mt-3 px-3 py-2 text-center">
            <span className="text-[10px] text-gray-600">Built by </span>
            <span className="text-[10px] font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Taha Nawab</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-900">
        {children}
      </main>
    </div>
  );
}
