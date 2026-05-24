export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'agent';
  department: string | null;
  is_active: boolean;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'escalated';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_by: number;
  creator_name?: string;
  assigned_to: number | null;
  assignee_name?: string | null;
  responded_at: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  ticket_id: number;
  user_id: number;
  actor_name?: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

export interface DashboardMetrics {
  open_tickets: number;
  in_progress_tickets: number;
  sla_breach_risk: number;
  avg_response_hours: number;
  avg_resolution_days: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  by_priority: { priority: string; count: string }[];
  by_agent: {
    id: number;
    name: string;
    department: string;
    open_tickets: string;
    critical_tickets: string;
  }[];
  sla_risk_tickets: (Ticket & { hours_open: number })[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
