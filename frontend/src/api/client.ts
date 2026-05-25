const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: any }>('/auth/me'),

  // Tickets
  getTickets: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<{ tickets: any[]; pagination: any }>(`/tickets${qs}`);
  },

  getTicket: (id: number) => request<any>(`/tickets/${id}`),

  createTicket: (data: { title: string; description: string; priority: string }) =>
    request<any>('/tickets', { method: 'POST', body: JSON.stringify(data) }),

  updateTicket: (id: number, data: Partial<any>) =>
    request<any>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  claimTicket: (id: number) =>
    request<any>(`/tickets/${id}/claim`, { method: 'POST' }),

  deleteTicket: (id: number) =>
    request(`/tickets/${id}`, { method: 'DELETE' }),

  getAuditLog: (ticketId: number) =>
    request<any[]>(`/tickets/${ticketId}/audit`),

  // Agents
  getAgents: () => request<any[]>('/agents'),

  getAgentTickets: (agentId: number) =>
    request<any[]>(`/agents/${agentId}/tickets`),

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),
  getSlaReport: () => request<any[]>('/dashboard/sla'),

  // Intelligence Engine
  getSimilarTickets: (ticketId: number) =>
    request<{ similar: any[]; ticketId: number }>(`/intelligence/similar/${ticketId}`),

  getOutbreaks: () =>
    request<{ text_clusters: any[]; keyword_clusters: any[] }>('/intelligence/outbreaks'),

  getDynamicPriority: (limit = 20) =>
    request<any[]>(`/intelligence/dynamic-priority?limit=${limit}`),

  getAgentExpertise: () =>
    request<any[]>('/intelligence/expertise'),

  suggestAgent: (ticketId: number) =>
    request<{ suggestions: any[]; ticketId: number }>(`/intelligence/suggest-agent/${ticketId}`),

  getResolutionSuggestions: (ticketId: number) =>
    request<{ suggestions: any[]; ticketId: number }>(`/intelligence/resolution/${ticketId}`),
};
