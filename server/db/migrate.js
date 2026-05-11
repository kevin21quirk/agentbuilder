import pool from './connection.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  try {
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'integrations_name_key'
        ) THEN
          ALTER TABLE integrations ADD CONSTRAINT integrations_name_key UNIQUE (name);
        END IF;
      END $$;
    `);
    console.log('Migration complete');
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

migrate();
