const { pool } = require('../config/database');

async function fixAdminColumn() {
  const client = await pool.connect();

  try {
    console.log('Starting admin column fix...');

    // Start transaction
    await client.query('BEGIN');

    // Add isAdmin column if it doesn't exist
    console.log('Adding isAdmin column to users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    `);

    // Set team@luxewellness.com as admin
    console.log('Setting team@luxewellness.com as admin...');
    const result = await client.query(`
      UPDATE users
      SET is_admin = TRUE
      WHERE email = $1
      RETURNING id, email, name, is_admin;
    `, ['team@luxewellness.com']);

    if (result.rows.length === 0) {
      console.log('⚠️  Warning: User team@luxewellness.com not found. Make sure to run seed first.');
    } else {
      console.log('✓ Admin user updated:', result.rows[0]);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('✓ Admin column fix completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing admin column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAdminColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to fix admin column:', error);
    process.exit(1);
  });
