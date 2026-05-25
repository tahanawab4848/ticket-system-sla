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
  const [similarTickets, setSimilarTickets] = useState<any[]>([]);
  const [suggestedAgents, setSuggestedAgents] = useState<any[]>([]);
  const [resolutionSuggestions, setResolutionSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Ticket>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');

  const fetchTicket = async () => {
    try {
      const [t, l, sim, sug, resSug] = await Promise.all([
        api.getTicket(ticketId),
        api.getAuditLog(ticketId),
        api.getSimilarTickets(ticketId).catch(() => ({ similar: [] })),
        api.suggestAgent(ticketId).catch(() => ({ suggestions: [] })),
        api.getResolutionSuggestions(ticketId).catch(() => ({ suggestions: [] })),
      ]);
      setTicket(t);
      setLogs(l);
      setSimilarTickets(sim.similar || []);
      setSuggestedAgents(sug.suggestions || []);
      setResolutionSuggestions(resSug.suggestions || []);
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

  const handleSmartAssign = async (agentId: number) => {
    setAssigningId(agentId);
    setError('');
    try {
      await api.updateTicket(ticketId, { assigned_to: agentId });
      await fetchTicket();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-500">
      <div className="inline-block w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-2" />
      <div>Loading ticket...</div>
    </div>
  );
  if (!ticket) return <div className="p-8 text-center text-red-400">{error}</div>;

  const canEdit = user.role !== 'agent' || ticket.assigned_to === user.id;
  const canClaim = ticket.status === 'open' && !ticket.assigned_to;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-200 transition-colors">
            ← Back
          </button>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400 font-mono text-sm">#{ticket.id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-indigo-500/10 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/20 font-medium">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Intelligence Co-Pilot Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Audit */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card">
            {/* Title bar */}
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {editMode ? (
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="input-glass text-xl font-bold"
                  />
                ) : (
                  <h1 className="text-xl font-bold text-gray-100">{ticket.title}</h1>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColor[ticket.priority]}`}>{ticket.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-500">Created {new Date(ticket.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {canClaim && (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-500 disabled:opacity-50 transition-colors"
                  >
                    {claiming ? '...' : 'Claim'}
                  </button>
                )}
                {canEdit && !editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn-secondary text-sm"
                  >
                    Edit
                  </button>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary text-sm"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 px-5 flex gap-4">
              {(['details', 'audit'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
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
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      {editMode ? (
                        <select
                          value={editForm.status || ''}
                          onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}
                          className="select-glass w-full text-sm"
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
                          className="select-glass w-full text-sm"
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
                      <div className="font-medium text-gray-200">{(ticket as any).creator_name || `User #${ticket.created_by}`}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Assigned to</div>
                      <div className="font-medium text-gray-200">{(ticket as any).assignee_name || <span className="text-gray-500">Unassigned</span>}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-2 font-medium">Description</div>
                    {editMode ? (
                      <textarea
                        value={editForm.description || ''}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        rows={6}
                        className="input-glass resize-none"
                      />
                    ) : (
                      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm border-t border-white/10 pt-4">
                    <div>
                      <div className="text-xs text-gray-500">Responded At</div>
                      <div className="text-gray-300">{ticket.responded_at ? new Date(ticket.responded_at).toLocaleString() : <span className="text-gray-600">—</span>}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Escalated At</div>
                      <div className="text-gray-300">{ticket.escalated_at ? new Date(ticket.escalated_at).toLocaleString() : <span className="text-gray-600">—</span>}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Resolved At</div>
                      <div className="text-gray-300">{ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : <span className="text-gray-600">—</span>}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && <AuditLog logs={logs} />}
            </div>
          </div>
        </div>

        {/* Right Column: Intelligence Engine Side Panel */}
        <div className="space-y-4">
          {/* Smart Routing / Suggested Agents */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                <span className="text-emerald-400">🤖</span> Smart Routing Recommendation
              </h3>
              <p className="text-[11px] text-gray-500">Suggested based on historical resolution speed and current ticket workload.</p>
              <div className="space-y-2">
                {suggestedAgents.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">No agent recommendations available.</div>
                ) : (
                  suggestedAgents.map(agent => (
                    <div key={agent.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                      <div>
                        <div className="font-semibold text-gray-200">{agent.name}</div>
                        <div className="text-gray-500 text-[10px]">{agent.department} · {agent.current_load} load</div>
                      </div>
                      <div className="text-right">
                        <button
                          onClick={() => handleSmartAssign(agent.id)}
                          disabled={assigningId !== null}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-medium transition-colors"
                        >
                          {assigningId === agent.id ? '...' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Similar Tickets */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              <span className="text-indigo-400">🧬</span> DNA Sibling Tickets (Similar)
            </h3>
            <p className="text-[11px] text-gray-500">Other active tickets identified with highly similar problem signatures.</p>
            <div className="space-y-2">
              {similarTickets.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No similar tickets found.</div>
              ) : (
                similarTickets.map(t => (
                  <div key={t.id} className="p-2 rounded-lg bg-white/5 border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-mono text-[10px]">#{t.id}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${statusColor[t.status]}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-200 truncate">{t.title}</div>
                    <div className="text-gray-500 text-[10px] truncate">Assignee: {t.assignee_name || 'Unassigned'}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resolution Suggestions */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              <span className="text-amber-400">💡</span> Solution Knowledge Base
            </h3>
            <p className="text-[11px] text-gray-500">Proactively retrieved resolutions from past sibling tickets.</p>
            <div className="space-y-2">
              {resolutionSuggestions.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No previous solutions recorded yet for this pattern.</div>
              ) : (
                resolutionSuggestions.map(t => (
                  <div key={t.id} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-emerald-400 font-medium font-mono">Resolved Sibling #{t.id}</span>
                      <span className="text-gray-500">by {t.resolved_by || 'Agent'}</span>
                    </div>
                    <div className="font-semibold text-gray-200">{t.title}</div>
                    <p className="text-gray-400 text-[10px] line-clamp-3 bg-black/10 p-1.5 rounded mt-1 font-mono">
                      {t.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
