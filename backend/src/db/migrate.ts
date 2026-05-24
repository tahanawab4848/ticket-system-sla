import { pool } from './pool';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running: ${file}`);
    await pool.query(sql);
    console.log(`✅ Completed: ${file}`);
  }

  console.log('🎉 All migrations complete');
  await pool.end();
  process.exit(0);
}

migrate().catch(console.error);
