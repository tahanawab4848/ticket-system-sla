import { AuditLog as AuditLogType } from '../types';

interface Props {
  logs: AuditLogType[];
}

function diffData(oldData: any, newData: any): string[] {
  if (!oldData || !newData) return [];
  const changes: string[] = [];
  const keys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  keys.forEach(k => {
    if (['updated_at', 'id'].includes(k)) return;
    if (JSON.stringify(oldData?.[k]) !== JSON.stringify(newData?.[k])) {
      changes.push(`${k}: ${oldData?.[k] ?? 'null'} → ${newData?.[k] ?? 'null'}`);
    }
  });
  return changes;
}

export default function AuditLog({ logs }: Props) {
  if (logs.length === 0) {
    return <p className="text-gray-500 text-sm italic">No audit history yet.</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const changes = log.action === 'UPDATE' ? diffData(log.old_data, log.new_data) : [];
        return (
          <div key={log.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-medium text-indigo-300 flex-shrink-0 mt-0.5">
              {log.actor_name ? log.actor_name.split(' ').map((n: string) => n[0]).join('') : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-200">{log.actor_name || 'System'}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase ${
                  log.action === 'INSERT' ? 'bg-green-500/20 text-green-300' :
                  log.action === 'UPDATE' ? 'bg-blue-500/20 text-blue-300' :
                  log.action === 'escalated' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {log.action}
                </span>
                <span className="text-gray-600 text-xs ml-auto">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              {changes.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {changes.map((c, i) => (
                    <div key={i} className="text-xs text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded">{c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
