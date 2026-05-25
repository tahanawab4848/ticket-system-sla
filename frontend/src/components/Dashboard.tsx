import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardData } from '../types';

const priorityColor: Record<string, string> = {
  escalated: 'text-purple-300 bg-purple-500/20',
  critical: 'text-red-300 bg-red-500/20',
  high: 'text-orange-300 bg-orange-500/20',
  medium: 'text-yellow-300 bg-yellow-500/20',
  low: 'text-green-300 bg-green-500/20',
};

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`glass-card p-5 ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="font-medium mt-0.5 text-sm">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [outbreaks, setOutbreaks] = useState<{ text_clusters: any[]; keyword_clusters: any[] } | null>(null);
  const [dynamicPriority, setDynamicPriority] = useState<any[]>([]);
  const [agentExpertise, setAgentExpertise] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getDashboard(),
      api.getOutbreaks(),
      api.getDynamicPriority(5),
      api.getAgentExpertise()
    ])
      .then(([dbData, obData, dpData, aeData]) => {
        setData(dbData);
        setOutbreaks(obData);
        setDynamicPriority(dpData);
        setAgentExpertise(aeData);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 text-center text-gray-500">
      <div className="inline-block w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-2" />
      <div>Loading dashboard...</div>
    </div>
  );
  if (error) return <div className="p-8 text-red-400 text-center">{error}</div>;
  if (!data) return null;

  const { metrics, by_priority, by_agent } = data;

  // Filter out any outbreaks that are actual incidents
  const activeOutbreaks = outbreaks?.text_clusters.filter(c => c.cluster_size >= 3) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fadeInUp">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <div className="flex items-center gap-2 text-xs bg-indigo-500/10 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/20 font-medium">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Intelligence Engine Active
        </div>
      </div>

      {/* Outbreak / Incident Alerts */}
      {activeOutbreaks.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-3 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="font-semibold text-red-300 text-sm tracking-wide uppercase">Outbreak Incident Alerts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOutbreaks.slice(0, 2).map((c, i) => (
              <div key={i} className="glass-card bg-red-950/20 border-red-500/10 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-200 capitalize truncate max-w-[200px]">"{c.cluster_text}"</span>
                  <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold">{c.cluster_size} tickets</span>
                </div>
                <div className="text-gray-400">
                  Detected over {Number(c.span_hours).toFixed(1)} hours. Potential system issue.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Open Tickets" value={metrics.open_tickets} color="text-blue-300" />
        <MetricCard label="In Progress" value={metrics.in_progress_tickets} color="text-indigo-300" />
        <MetricCard label="SLA Risk" value={metrics.sla_breach_risk} sub="critical, no response" color="text-red-300" />
        <MetricCard label="Avg Response" value={`${Number(metrics.avg_response_hours).toFixed(1)}h`} color="text-emerald-300" />
        <MetricCard label="Avg Resolution" value={`${Number(metrics.avg_resolution_days).toFixed(1)}d`} color="text-amber-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Priority */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-gray-100 mb-4">Open Tickets by Priority</h2>
          <div className="space-y-3">
            {by_priority.map(p => (
              <div key={p.priority} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${priorityColor[p.priority] || 'text-gray-400 bg-gray-500/20'}`}>
                  {p.priority}
                </span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (Number(p.count) / 100) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-300 w-12 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Expertise Radar */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-gray-100 mb-4">Agent Expertise Radar</h2>
          <div className="space-y-4">
            {agentExpertise.length === 0 ? (
              <div className="text-sm text-gray-500 italic p-4 text-center">No expertise data loaded yet. Resolve tickets to track.</div>
            ) : (
              agentExpertise.slice(0, 5).map(agent => (
                <div key={agent.id} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-200">{agent.name}</span>
                    <span className="text-gray-500 text-xs">{agent.department} · {agent.total_resolved} resolved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${agent.speed_score}%` }} />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold w-16 text-right">Speed: {Number(agent.speed_score).toFixed(0)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.expertise_keywords?.map((kw: string, i: number) => (
                      <span key={i} className="bg-indigo-500/10 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/15">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Urgency Queue */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
          Dynamic Urgency Queue (Time Decay)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-400">
                <th className="pb-2 font-medium text-xs uppercase tracking-wider">ID</th>
                <th className="pb-2 font-medium text-xs uppercase tracking-wider">Title</th>
                <th className="pb-2 font-medium text-xs uppercase tracking-wider">Original Priority</th>
                <th className="pb-2 font-medium text-xs uppercase tracking-wider">Hours Open</th>
                <th className="pb-2 font-medium text-xs uppercase tracking-wider">Dynamic Urgency Score</th>
              </tr>
            </thead>
            <tbody>
              {dynamicPriority.map(t => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="py-2.5 text-gray-400 font-mono">#{t.id}</td>
                  <td className="py-2.5 font-medium text-gray-200 max-w-xs truncate">{t.title}</td>
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${priorityColor[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-300">{Number(t.hours_open).toFixed(1)}h</td>
                  <td className="py-2.5 font-bold text-indigo-400">{t.dynamic_urgency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
