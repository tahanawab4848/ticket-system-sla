import { useState } from 'react';
import { api } from '../api/client';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'manager' | 'agent') => {
    const creds: Record<string, string> = {
      admin: 'admin@pakmail.com',
      manager: 'manager@pakmail.com',
      agent: 'ahmed@pakmail.com',
    };
    setEmail(creds[role]);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="glass-card w-full max-w-md p-8 animate-fadeInUp relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/5">
            <svg className="w-10 h-10 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-wider">ZETASENTRY</h1>
          <p className="text-indigo-400/80 text-xs font-semibold uppercase tracking-widest mt-1">Intelligence Support Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-glass"
              placeholder="you@pakmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-glass"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs text-gray-500 text-center mb-3">Demo accounts (password: password123)</p>
          <div className="flex gap-2">
            {(['admin', 'manager', 'agent'] as const).map(role => (
              <button
                key={role}
                onClick={() => fillDemo(role)}
                className="flex-1 text-xs py-2 px-2 rounded-lg border border-white/10 text-gray-400 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/20 transition-all duration-200 capitalize"
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
