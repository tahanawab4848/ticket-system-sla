import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/dashboard - aggregated metrics from materialized view
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const [metricsResult, byPriorityResult, byAgentResult, slaRiskResult] = await Promise.all([
      // From materialized view - fast
      pool.query('SELECT * FROM dashboard_metrics LIMIT 1'),

      // Priority breakdown
      pool.query(
        `SELECT priority, COUNT(*) as count
         FROM tickets
         WHERE status IN ('open', 'in_progress')
         GROUP BY priority
         ORDER BY CASE priority WHEN 'escalated' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`
      ),

      // Per-agent workload
      pool.query(
        `SELECT u.id, u.name, u.department,
                COUNT(t.id) FILTER (WHERE t.status IN ('open','in_progress')) as open_tickets,
                COUNT(t.id) FILTER (WHERE t.priority IN ('critical','escalated') AND t.status IN ('open','in_progress')) as critical_tickets
         FROM users u
         LEFT JOIN tickets t ON u.id = t.assigned_to
         WHERE u.role = 'agent' AND u.is_active = true
         GROUP BY u.id
         ORDER BY open_tickets DESC`
      ),

      // SLA breach risk tickets
      pool.query(
        `SELECT id, title, priority, status, created_at,
                EXTRACT(epoch FROM (NOW() - created_at))/3600 as hours_open
         FROM tickets
         WHERE priority IN ('critical', 'escalated')
         AND status IN ('open', 'in_progress')
         AND responded_at IS NULL
         ORDER BY created_at ASC
         LIMIT 20`
      ),
    ]);

    const metrics = metricsResult.rows[0] || {
      open_tickets: 0,
      in_progress_tickets: 0,
      sla_breach_risk: 0,
      avg_response_hours: 0,
      avg_resolution_days: 0,
    };

    res.json({
      metrics,
      by_priority: byPriorityResult.rows,
      by_agent: byAgentResult.rows,
      sla_risk_tickets: slaRiskResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/dashboard/sla - detailed SLA report
router.get('/sla', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
         priority,
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as responded,
         COUNT(*) FILTER (WHERE responded_at IS NULL AND status IN ('open','in_progress')) as awaiting_response,
         ROUND(AVG(EXTRACT(epoch FROM (COALESCE(responded_at, NOW()) - created_at))/3600)::numeric, 2) as avg_hours_to_respond,
         COUNT(*) FILTER (WHERE 
           priority = 'critical' AND responded_at IS NULL 
           AND created_at < NOW() - INTERVAL '4 hours'
           AND status IN ('open','in_progress')
         ) as breached_sla
       FROM tickets
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY priority`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch SLA data' });
  }
});

export default router;
