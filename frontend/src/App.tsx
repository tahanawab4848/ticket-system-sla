import { useEffect, useState } from 'react';
import { User } from './types';
import { api } from './api/client';
import Login from './components/Login';
import Layout from './pages/Layout';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import TicketForm from './components/TicketForm';
import TicketDetail from './components/TicketDetail';

type View = 'dashboard' | 'tickets' | 'new-ticket' | 'ticket-detail';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Check existing session on load
  useEffect(() => {
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleSelectTicket = (id: number) => {
    setSelectedTicketId(id);
    setView('ticket-detail');
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'tickets':
        return (
          <TicketList
            user={user}
            onSelectTicket={handleSelectTicket}
            onCreateTicket={() => setView('new-ticket')}
          />
        );
      case 'new-ticket':
        return (
          <TicketForm
            onCreated={() => setView('tickets')}
            onCancel={() => setView('tickets')}
          />
        );
      case 'ticket-detail':
        return selectedTicketId ? (
          <TicketDetail
            ticketId={selectedTicketId}
            user={user}
            onBack={() => setView('tickets')}
          />
        ) : null;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      user={user}
      currentView={view}
      onNavigate={setView}
      onLogout={() => setUser(null)}
    >
      {renderView()}
    </Layout>
  );
}
