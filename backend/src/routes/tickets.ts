import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateTicket, validateTicketUpdate } from '../middleware/validation';
import { claimTicket } from '../services/assignment-lock';

const router = Router();

// GET /api/tickets - paginated list with filters
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const offset = (page - 1) * limit;

    const { status, priority, assigned_to, search } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status) { conditions.push(`t.status = $${idx++}`); values.push(status); }
    if (priority) { conditions.push(`t.priority = $${idx++}`); values.push(priority); }
    if (assigned_to === 'me') {
      conditions.push(`t.assigned_to = $${idx++}`);
      values.push(req.user!.id);
    } else if (assigned_to) {
      conditions.push(`t.assigned_to = $${idx++}`);
      values.push(assigned_to);
    }
    if (search) {
      conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [ticketsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT t.*, 
                u1.name as creator_name, 
                u2.name as assignee_name
         FROM tickets t
         LEFT JOIN users u1 ON t.created_by = u1.id
         LEFT JOIN users u2 ON t.assigned_to = u2.id
         ${where}
         ORDER BY 
           CASE t.priority WHEN 'escalated' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           t.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM tickets t ${where}`,
        values
      ),
    ]);

    res.json({
      tickets: ticketsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /api/tickets/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              u1.name as creator_name, 
              u2.name as assignee_name
       FROM tickets t
       LEFT JOIN users u1 ON t.created_by = u1.id
       LEFT JOIN users u2 ON t.assigned_to = u2.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// POST /api/tickets
router.post('/', requireAuth, validateTicket, async (req: Request, res: Response) => {
  try {
    const { title, description, priority } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_user_id = '${req.user!.id}'`);

      const result = await client.query(
        `INSERT INTO tickets (title, description, priority, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [title.trim(), description.trim(), priority, req.user!.id]
      );

      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', requireAuth, validateTicketUpdate, async (req: Request, res: Response) => {
  try {
    const { status, priority, assigned_to, title, description } = req.body;
    const ticketId = parseInt(req.params.id);

    const existing = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = existing.rows[0];

    // Agents can only update their own assigned tickets (unless admin/manager)
    if (req.user!.role === 'agent' && ticket.assigned_to !== req.user!.id) {
      return res.status(403).json({ error: 'You can only update tickets assigned to you' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (status !== undefined) {
      updates.push(`status = $${idx++}`); values.push(status);
      if (status === 'resolved' && !ticket.resolved_at) {
        updates.push(`resolved_at = NOW()`);
      }
    }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(priority); }
    if (assigned_to !== undefined) { updates.push(`assigned_to = $${idx++}`); values.push(assigned_to || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_user_id = '${req.user!.id}'`);

      const result = await client.query(
        `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        [...values, ticketId]
      );

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// POST /api/tickets/:id/claim - atomic claim with pessimistic lock
router.post('/:id/claim', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    const agentId = req.user!.id;

    const ticket = await claimTicket(ticketId, agentId);

    if (!ticket) {
      return res.status(409).json({ error: 'Ticket is no longer available (already claimed)' });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to claim ticket' });
  }
});

// DELETE /api/tickets/:id - admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM tickets WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// GET /api/tickets/:id/audit - audit trail
router.get('/:id/audit', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.name as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.ticket_id = $1
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
