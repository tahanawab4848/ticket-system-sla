import { pool } from '../db/pool';

// =============================================
// LAYER 1: Ticket DNA — Find Similar Tickets
// =============================================
export async function findSimilarTickets(ticketId: number, limit = 5) {
  const result = await pool.query(
    `WITH target AS (
      SELECT search_vector FROM tickets WHERE id = $1
    )
    SELECT t.id, t.title, t.status, t.priority, t.assigned_to,
           u.name as assignee_name,
           t.resolved_at,
           ts_rank(t.search_vector, target.search_vector::tsquery) as similarity_score
    FROM tickets t, target
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.id != $1
      AND t.search_vector @@ to_tsquery(
        'english',
        regexp_replace(
          plainto_tsquery('english', (SELECT title || ' ' || description FROM tickets WHERE id = $1))::text,
          '&', '|', 'g'
        )
      )
    ORDER BY similarity_score DESC
    LIMIT $2`,
    [ticketId, limit]
  );

  // Fallback: if tsvector matching returns nothing, try simpler ILIKE approach
  if (result.rows.length === 0) {
    const fallback = await pool.query(
      `SELECT t.id, t.title, t.status, t.priority, t.assigned_to,
              u.name as assignee_name, t.resolved_at,
              0.5 as similarity_score
       FROM tickets t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id != $1
         AND (
           t.title ILIKE '%' || (SELECT regexp_replace(title, 'Issue #[0-9]+: ', '') FROM tickets WHERE id = $1) || '%'
         )
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [ticketId, limit]
    );
    return fallback.rows;
  }

  return result.rows;
}

// =============================================
// LAYER 1b: Outbreak Detection
// =============================================
export async function detectOutbreaks() {
  // Refresh the cluster materialized view
  try {
    await pool.query('REFRESH MATERIALIZED VIEW ticket_clusters');
  } catch {
    // View might not exist yet if migration hasn't run
  }

  // Find clusters of 3+ similar tickets in the last 24 hours
  const result = await pool.query(
    `SELECT 
       cluster_text,
       cluster_size,
       ticket_ids,
       first_seen,
       last_seen,
       span_hours
     FROM ticket_clusters
     WHERE cluster_size >= 3
       AND last_seen > NOW() - INTERVAL '24 hours'
     ORDER BY cluster_size DESC
     LIMIT 10`
  );

  // Also do a smarter keyword-based detection
  const keywordClusters = await pool.query(
    `SELECT 
       word,
       COUNT(*) as mention_count,
       array_agg(t.id ORDER BY t.created_at DESC) as ticket_ids,
       MIN(t.created_at) as first_seen,
       MAX(t.created_at) as last_seen
     FROM tickets t,
       LATERAL unnest(
         tsvector_to_array(
           to_tsvector('english', t.title)
         )
       ) as word
     WHERE t.created_at > NOW() - INTERVAL '24 hours'
       AND t.status IN ('open', 'in_progress')
       AND length(word) > 3
     GROUP BY word
     HAVING COUNT(*) >= 5
     ORDER BY mention_count DESC
     LIMIT 10`
  );

  return {
    text_clusters: result.rows,
    keyword_clusters: keywordClusters.rows,
  };
}

// =============================================
// LAYER 2: Dynamic Priority (Time Decay)
// =============================================
export async function getDynamicPriorityList(limit = 20) {
  const result = await pool.query(
    `SELECT * FROM ticket_dynamic_priority
     ORDER BY dynamic_urgency DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// =============================================
// LAYER 3: Agent Expertise Radar
// =============================================
export async function getAgentExpertise() {
  const result = await pool.query(
    `SELECT 
       u.id,
       u.name,
       u.department,
       COUNT(t.id) as total_resolved,
       ROUND(AVG(EXTRACT(epoch FROM (t.resolved_at - t.created_at))/3600)::numeric, 1) as avg_hours_to_resolve,
       -- Top keywords this agent resolves
       (
         SELECT array_agg(DISTINCT word ORDER BY word)
         FROM (
           SELECT unnest(tsvector_to_array(to_tsvector('english', t2.title))) as word
           FROM tickets t2
           WHERE t2.assigned_to = u.id AND t2.status = 'resolved'
           LIMIT 50
         ) sub
         WHERE length(word) > 3
         LIMIT 8
       ) as expertise_keywords,
       -- Speed score (lower is better, normalized 0-100)
       ROUND(
         100 - LEAST(100, 
           AVG(EXTRACT(epoch FROM (t.resolved_at - t.created_at))/3600)::numeric / 
           NULLIF((SELECT AVG(EXTRACT(epoch FROM (resolved_at - created_at))/3600) FROM tickets WHERE status = 'resolved'), 0) * 100
         ),
       1) as speed_score
     FROM users u
     LEFT JOIN tickets t ON u.id = t.assigned_to AND t.status = 'resolved' AND t.resolved_at IS NOT NULL
     WHERE u.role = 'agent' AND u.is_active = true
     GROUP BY u.id
     HAVING COUNT(t.id) > 0
     ORDER BY avg_hours_to_resolve ASC`
  );
  return result.rows;
}

// Best agent suggestion for a specific ticket
export async function suggestBestAgent(ticketId: number) {
  const result = await pool.query(
    `WITH ticket_words AS (
       SELECT unnest(tsvector_to_array(search_vector)) as word
       FROM tickets WHERE id = $1
     ),
     agent_scores AS (
       SELECT 
         u.id,
         u.name,
         u.department,
         COUNT(DISTINCT t.id) as relevant_resolved,
         ROUND(AVG(EXTRACT(epoch FROM (t.resolved_at - t.created_at))/3600)::numeric, 1) as avg_hours,
         COUNT(t.id) FILTER (WHERE t.status IN ('open','in_progress')) as current_load
       FROM users u
       LEFT JOIN tickets t ON u.id = t.assigned_to 
         AND t.status = 'resolved' 
         AND t.resolved_at IS NOT NULL
         AND t.search_vector @@ to_tsquery('english',
           (SELECT string_agg(word, ' | ') FROM ticket_words WHERE length(word) > 3)
         )
       WHERE u.role = 'agent' AND u.is_active = true
       GROUP BY u.id
     )
     SELECT *,
       ROUND(
         (COALESCE(relevant_resolved, 0) * 10.0) / GREATEST(COALESCE(avg_hours, 100), 1) / GREATEST(current_load + 1, 1),
       2) as match_score
     FROM agent_scores
     ORDER BY match_score DESC
     LIMIT 5`,
    [ticketId]
  );
  return result.rows;
}

// =============================================
// LAYER 4: Resolution Suggestions
// =============================================
export async function getResolutionSuggestions(ticketId: number) {
  // Find resolved tickets most similar to this one
  const result = await pool.query(
    `WITH target AS (
       SELECT title, description, search_vector FROM tickets WHERE id = $1
     )
     SELECT 
       t.id,
       t.title,
       t.description,
       t.priority,
       t.resolved_at,
       u.name as resolved_by,
       EXTRACT(epoch FROM (t.resolved_at - t.created_at))/3600 as resolution_hours
     FROM tickets t
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.status IN ('resolved', 'closed')
       AND t.id != $1
       AND t.resolved_at IS NOT NULL
       AND t.title ILIKE '%' || regexp_replace((SELECT title FROM target), 'Issue #[0-9]+: ', '') || '%'
     ORDER BY t.resolved_at DESC
     LIMIT 5`,
    [ticketId]
  );
  return result.rows;
}
