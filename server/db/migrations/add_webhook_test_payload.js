import pool from '../connection.js';

async function migrate() {
  try {
    console.log('Adding webhook_test_payload column to workflows table...');
    
    await pool.query(`
      ALTER TABLE workflows 
      ADD COLUMN IF NOT EXISTS webhook_test_payload JSONB
    `);
    
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
