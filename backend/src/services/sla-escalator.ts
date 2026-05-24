import cron from 'node-cron';
import { pool } from '../db/pool';

export function startSlaEscalator() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running SLA escalator check...');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE tickets 
         SET priority = 'escalated', 
             escalated_at = NOW(),
             updated_at = NOW()
         WHERE priority = 'critical' 
         AND status IN ('open', 'in_progress')
         AND responded_at IS NULL
         AND escalated_at IS NULL
         AND created_at < NOW() - INTERVAL '4 hours'
         RETURNING id, title, assigned_to`
      );

      if (result.rows.length > 0) {
        console.log(`⚠️ Escalated ${result.rows.length} stale tickets`);

        const ticketIds = result.rows.map((r: any) => r.id);
        await client.query(
          `INSERT INTO audit_logs (ticket_id, user_id, action, new_data)
           SELECT unnest($1::int[]), 1, 'escalated', jsonb_build_object('priority', 'escalated')`,
          [ticketIds]
        );
      } else {
        console.log('✅ No tickets need escalation');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ SLA escalator failed:', error);
    } finally {
      client.release();
    }
  });

  console.log('🚀 SLA escalator started (runs every 5 minutes)');
}

export function startMetricsRefresher() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics');
      console.log('📊 Dashboard metrics refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh metrics:', error);
    }
  });
}
