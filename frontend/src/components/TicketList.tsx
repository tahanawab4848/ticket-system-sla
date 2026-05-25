import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Ticket, Pagination, User } from '../types';

const priorityBadge: Record<string, string> = {
  escalated: 'badge-escalated',
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

const statusBadge: Record<string, string> = {
  open: 'badge-open',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
  closed: 'badge-closed',
};

interface Props {
  user: User;
  onSelectTicket: (id: number) => void;
  onCreateTicket: () => void;
}

export default function TicketList({ user, onSelectTicket, onCreateTicket }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    search: '',
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;
      if (filters.search) params.search = filters.search;

      const res = await api.getTickets(params);
      setTickets(res.tickets);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleFilterChange = (key: string, val: string) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Tickets</h1>
        <button onClick={onCreateTicket} className="btn-primary text-sm">
          + New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search tickets..."
          value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)}
          className="input-glass flex-1 min-w-48"
        />
        <select
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
          className="select-glass"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.priority}
          onChange={e => handleFilterChange('priority', e.target.value)}
          className="select-glass"
        >
          <option value="">All Priorities</option>
          <option value="escalated">Escalated</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(user.role === 'admin' || user.role === 'manager') && (
          <select
            value={filters.assigned_to}
            onChange={e => handleFilterChange('assigned_to', e.target.value)}
            className="select-glass"
          >
            <option value="">All Agents</option>
            <option value="me">Mine</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-2" />
            <div>Loading tickets...</div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tickets found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left font-medium text-gray-400 text-xs uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 text-xs uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 text-xs uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 text-xs uppercase tracking-wider">Assignee</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 text-xs uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{t.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-200 max-w-xs">
                    <div className="truncate">{t.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityBadge[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{t.assignee_name || <span className="text-gray-600">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {pagination.total.toLocaleString()} tickets · page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="btn-secondary text-sm disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
