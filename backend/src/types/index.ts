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
  assigned_to: number | null;
  responded_at: Date | null;
  escalated_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: number;
  ticket_id: number;
  user_id: number;
  action: string;
  old_data: any;
  new_data: any;
  created_at: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
