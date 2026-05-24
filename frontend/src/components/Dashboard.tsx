import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardData } from '../types';

const priorityColor: Record<string, string> = {
  escalated: 'text-purple-700 bg-purple-50',
  critical: 'text-red-700 bg-red-50',
  high: 'text-orange-700 bg-orange-50',
  medium: 'text-yellow-700 bg-yellow-50',
  low: 'text-green-700 bg-green-50',
};

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 border ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;
  if (!data) return null;

  const { metrics, by_priority, by_agent, sla_risk_tickets } = data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Open Tickets" value={metrics.open_tickets} color="border-blue-200 bg-blue-50 text-blue-900" />
        <MetricCard label="In Progress" value={metrics.in_progress_tickets} color="border-indigo-200 bg-indigo-50 text-indigo-900" />
        <MetricCard label="SLA Risk" value={metrics.sla_breach_risk} sub="critical, no response" color="border-red-200 bg-red-50 text-red-900" />
        <MetricCard label="Avg Response" value={`${Number(metrics.avg_response_hours).toFixed(1)}h`} color="border-emerald-200 bg-emerald-50 text-emerald-900" />
        <MetricCard label="Avg Resolution" value={`${Number(metrics.avg_resolution_days).toFixed(1)}d`} color="border-amber-200 bg-amber-50 text-amber-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Priority */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Open Tickets by Priority</h2>
          <div className="space-y-2">
            {by_priority.map(p => (
              <div key={p.priority} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${priorityColor[p.priority] || 'text-gray-700 bg-gray-50'}`}>
                  {p.priority}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (Number(p.count) / 100) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Workload */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Agent Workload</h2>
          <div className="space-y-2">
            {by_agent.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-medium text-xs flex-shrink-0">
                  {a.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.department}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{a.open_tickets} open</div>
                  {Number(a.critical_tickets) > 0 && (
                    <div className="text-xs text-red-600">{a.critical_tickets} critical</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SLA Risk Tickets */}
      {sla_risk_tickets.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            SLA Risk — Critical Unresponded Tickets
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Hours Open</th>
                </tr>
              </thead>
              <tbody>
                {sla_risk_tickets.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 text-gray-500">#{t.id}</td>
                    <td className="py-2 font-medium max-w-xs truncate">{t.title}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${priorityColor[t.priority]}`}>{t.priority}</span>
                    </td>
                    <td className="py-2 capitalize">{t.status.replace('_', ' ')}</td>
                    <td className="py-2 font-medium text-red-600">{Number(t.hours_open).toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
