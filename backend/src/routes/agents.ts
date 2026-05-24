import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/agents - list all agents (admin/manager)
router.get('/', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.is_active,
              COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as active_tickets,
              COUNT(t.id) FILTER (WHERE t.status IN ('open', 'in_progress')) as total_open
       FROM users u
       LEFT JOIN tickets t ON u.id = t.assigned_to
       WHERE u.role = 'agent'
       GROUP BY u.id
       ORDER BY u.name`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id/tickets - get tickets assigned to an agent
router.get('/:id/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.id);

    // Agents can only see their own, managers/admins can see all
    if (req.user!.role === 'agent' && req.user!.id !== agentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query(
      `SELECT t.*, u.name as creator_name
       FROM tickets t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.assigned_to = $1
       ORDER BY 
         CASE t.priority WHEN 'escalated' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.created_at DESC
       LIMIT 200`,
      [agentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agent tickets' });
  }
});

// PATCH /api/agents/:id - update agent (admin only)
router.patch('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { is_active, department } = req.body;
    const agentId = parseInt(req.params.id);

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
    if (department !== undefined) { updates.push(`department = $${idx++}`); values.push(department); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} AND role = 'agent' RETURNING id, name, email, role, department, is_active`,
      [...values, agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

export default router;
