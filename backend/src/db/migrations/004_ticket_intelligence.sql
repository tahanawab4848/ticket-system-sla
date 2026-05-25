-- ============================================
-- TICKET INTELLIGENCE ENGINE - Database Layer
-- ============================================

-- 1. Add full-text search vector column (Ticket DNA)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. GIN index for fast similarity lookups
CREATE INDEX IF NOT EXISTS idx_tickets_search_vector ON tickets USING GIN(search_vector);

-- 3. Trigger: auto-update search_vector on INSERT or UPDATE
CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_search_vector_trigger ON tickets;
CREATE TRIGGER ticket_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_search_vector();

-- 4. Backfill existing tickets with search vectors
UPDATE tickets SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- 5. Agent expertise tracking table
CREATE TABLE IF NOT EXISTS agent_expertise (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  topic_keywords TEXT NOT NULL,
  tickets_resolved INTEGER DEFAULT 0,
  avg_resolution_hours NUMERIC(10,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, topic_keywords)
);

-- 6. Outbreak detection: materialized view for recent ticket clusters
DROP MATERIALIZED VIEW IF EXISTS ticket_clusters;
CREATE MATERIALIZED VIEW ticket_clusters AS
SELECT 
  -- Extract the top 3 words from each ticket's title as a cluster key
  regexp_replace(
    lower(title), 
    '[^a-z\s]', '', 'g'
  ) as cluster_text,
  array_agg(id ORDER BY created_at DESC) as ticket_ids,
  COUNT(*) as cluster_size,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  EXTRACT(epoch FROM (MAX(created_at) - MIN(created_at)))/3600 as span_hours
FROM tickets
WHERE created_at > NOW() - INTERVAL '48 hours'
  AND status IN ('open', 'in_progress')
GROUP BY cluster_text
HAVING COUNT(*) >= 2
ORDER BY cluster_size DESC;

-- 7. Dynamic priority view (decay formula)
CREATE OR REPLACE VIEW ticket_dynamic_priority AS
SELECT 
  t.id,
  t.title,
  t.priority,
  t.status,
  t.created_at,
  t.assigned_to,
  u.name as assignee_name,
  EXTRACT(epoch FROM (NOW() - t.created_at))/3600 as hours_open,
  ROUND((
    CASE t.priority
      WHEN 'escalated' THEN 5
      WHEN 'critical' THEN 4
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      ELSE 1
    END * LN(GREATEST(EXTRACT(epoch FROM (NOW() - t.created_at))/3600, 1) + 1)
  )::numeric, 2) as dynamic_urgency
FROM tickets t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.status IN ('open', 'in_progress')
ORDER BY dynamic_urgency DESC;
