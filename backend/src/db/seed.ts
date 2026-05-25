import { pool } from './pool';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  await pool.query('TRUNCATE audit_logs, tickets, users RESTART IDENTITY CASCADE');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, department) VALUES
      ('admin@pakmail.com', $1, 'Taha Nawab', 'admin', NULL),
      ('manager@pakmail.com', $1, 'Sara Ahmed', 'manager', 'Support'),
      ('ahmed@pakmail.com', $1, 'Ahmed Ali', 'agent', 'Support'),
      ('bilal@pakmail.com', $1, 'Bilal Hussain', 'agent', 'Support'),
      ('fatima@pakmail.com', $1, 'Fatima Raza', 'agent', 'Support'),
      ('zeeshan@pakmail.com', $1, 'Zeeshan Malik', 'agent', 'Sales'),
      ('nadia@pakmail.com', $1, 'Nadia Sheikh', 'agent', 'Support')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, name, role`,
    [hashedPassword]
  );

  console.log(`✅ Created ${users.rows.length} users`);

  const agents = await pool.query(`SELECT id FROM users WHERE role = 'agent'`);
  const agentIds = agents.rows.map((a: any) => a.id);

  if (agentIds.length === 0) {
    console.log('❌ No agents found');
    process.exit(1);
  }

  console.log('📝 Generating 10,000 tickets...');

  for (let batch = 0; batch < 10; batch++) {
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < 1000; i++) {
      const ticketNum = batch * 1000 + i + 1;

      const priorityRand = Math.random() * 100;
      let priority = 'low';
      if (priorityRand < 60) priority = 'low';
      else if (priorityRand < 85) priority = 'medium';
      else if (priorityRand < 95) priority = 'high';
      else priority = 'critical';

      const statusRand = Math.random() * 100;
      let status = 'open';
      if (statusRand < 30) status = 'open';
      else if (statusRand < 50) status = 'in_progress';
      else if (statusRand < 75) status = 'resolved';
      else status = 'closed';

      const assignedTo = Math.random() < 0.7 ? agentIds[Math.floor(Math.random() * agentIds.length)] : null;

      const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);

      let respondedAt = null;
      if (status !== 'open' && assignedTo) {
        respondedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      }

      let resolvedAt = null;
      if (status === 'resolved') {
        resolvedAt = new Date((respondedAt || createdAt).getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      }

      const offset = values.length;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`);

      values.push(
        `Issue #${ticketNum}: Customer reported problem`,
        `Auto-generated seed ticket for testing purposes.`,
        priority,
        status,
        assignedTo,
        1,  // created_by (admin user ID 1)
        createdAt,
        respondedAt,
        resolvedAt
      );
    }

    await pool.query(
      `INSERT INTO tickets (title, description, priority, status, assigned_to, created_by, created_at, responded_at, resolved_at)
       VALUES ${placeholders.join(', ')}`,
      values
    );

    console.log(`   Batch ${batch + 1}/10 complete (${(batch + 1) * 1000} tickets)`);
  }

  await pool.query('REFRESH MATERIALIZED VIEW dashboard_metrics');

  console.log('🎉 Seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Login credentials:');
  console.log('   Admin:    admin@pakmail.com / password123');
  console.log('   Manager:  manager@pakmail.com / password123');
  console.log('   Agent:    ahmed@pakmail.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});