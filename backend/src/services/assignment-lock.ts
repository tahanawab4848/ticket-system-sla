import { pool } from '../db/pool';

// PESSIMISTIC LOCKING with SKIP LOCKED - prevents double-claim
export async function claimTicket(
  ticketId: number,
  agentId: number
): Promise<any | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_user_id = '${agentId}'`);

    const result = await client.query(
      `UPDATE tickets 
       SET assigned_to = $1, 
           status = 'in_progress', 
           updated_at = NOW(),
           responded_at = COALESCE(responded_at, NOW())
       WHERE id = $2 
       AND status = 'open'
       AND id IN (
           SELECT id FROM tickets WHERE id = $2 FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [agentId, ticketId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseTicket(ticketId: number): Promise<void> {
  await pool.query(
    `UPDATE tickets 
     SET assigned_to = NULL, 
         status = 'open',
         updated_at = NOW()
     WHERE id = $1`,
    [ticketId]
  );
}

export async function getAvailableTickets(): Promise<any[]> {
  const result = await pool.query(
    `SELECT t.*, u.name as creator_name
     FROM tickets t
     LEFT JOIN users u ON t.created_by = u.id
     WHERE t.status = 'open' AND t.assigned_to IS NULL
     ORDER BY 
         CASE t.priority 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             ELSE 4 
         END,
         t.created_at ASC
     LIMIT 100`
  );
  return result.rows;
}
