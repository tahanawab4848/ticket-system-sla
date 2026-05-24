CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status 
ON tickets(assigned_to, status) WHERE status IN ('open', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_critical_unresponded 
ON tickets(created_at) WHERE priority = 'critical' AND responded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_created_at 
ON tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_ticket_created 
ON audit_logs(ticket_id, created_at DESC);

DROP MATERIALIZED VIEW IF EXISTS dashboard_metrics;

CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
    COUNT(*) FILTER (WHERE priority = 'critical' AND responded_at IS NULL) as sla_breach_risk,
    COALESCE(AVG(EXTRACT(epoch FROM (responded_at - created_at))/3600), 0) as avg_response_hours,
    COALESCE(AVG(EXTRACT(epoch FROM (resolved_at - created_at))/24), 0) as avg_resolution_days
FROM tickets 
WHERE created_at > NOW() - INTERVAL '30 days';

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW dashboard_metrics;
END;
$$ LANGUAGE plpgsql;