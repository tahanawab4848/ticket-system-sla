import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Ticket, AuditLog as AuditLogType, User } from '../types';
import AuditLog from './AuditLog';

const priorityColor: Record<string, string> = {
  escalated: 'badge-escalated',
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};
const statusColor: Record<string, string> = {
  open: 'badge-open',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
  closed: 'badge-closed',
};

interface Props {
  ticketId: number;
  user: User;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, user, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Ticket>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');

  const fetchTicket = async () => {
    try {
      const [t, l] = await Promise.all([
        api.getTicket(ticketId),
        api.getAuditLog(ticketId),
      ]);
      setTicket(t);
      setLogs(l);
      setEditForm({ status: t.status, priority: t.priority, title: t.title, description: t.description });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateTicket(ticketId, editForm);
      await fetchTicket();
      setEditMode(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    setError('');
    try {
      await api.claimTicket(ticketId);
      await fetchTicket();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading ticket...</div>;
  if (!ticket) return <div className="p-8 text-center text-red-500">{error}</div>;

  const canEdit = user.role !== 'agent' || ticket.assigned_to === user.id;
  const canClaim = ticket.status === 'open' && !ticket.assigned_to;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700 transition-colors">
          ← Back
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500 font-mono text-sm">#{ticket.id}</span>
      </div>

      <div className="bg-white rounded-xl border">
        {/* Title bar */}
        <div className="p-5 border-b flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editMode ? (
              <input
                type="text"
                value={editForm.title || ''}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="w-full text-xl font-bold border-b-2 border-indigo-400 focus:outline-none pb-1"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColor[ticket.priority]}`}>{ticket.priority}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
              <span className="text-xs text-gray-400">Created {new Date(ticket.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {canClaim && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {claiming ? '...' : 'Claim'}
              </button>
            )}
            {canEdit && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-5 flex gap-4">
          {(['details', 'audit'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'audit' ? `Audit Log (${logs.length})` : 'Details'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  {editMode ? (
                    <select
                      value={editForm.status || ''}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[ticket.status]}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Priority</div>
                  {editMode ? (
                    <select
                      value={editForm.priority || ''}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as any }))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColor[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Created by</div>
                  <div className="font-medium">{(ticket as any).creator_name || `User #${ticket.created_by}`}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Assigned to</div>
                  <div className="font-medium">{(ticket as any).assignee_name || <span className="text-gray-400">Unassigned</span>}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2 font-medium">Description</div>
                {editMode ? (
                  <textarea
                    value={editForm.description || ''}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
                <div>
                  <div className="text-xs text-gray-500">Responded At</div>
                  <div>{ticket.responded_at ? new Date(ticket.responded_at).toLocaleString() : <span className="text-gray-400">—</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Escalated At</div>
                  <div>{ticket.escalated_at ? new Date(ticket.escalated_at).toLocaleString() : <span className="text-gray-400">—</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Resolved At</div>
                  <div>{ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : <span className="text-gray-400">—</span>}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && <AuditLog logs={logs} />}
        </div>
      </div>
    </div>
  );
}
