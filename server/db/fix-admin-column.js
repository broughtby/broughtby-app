const db = require('../config/database');

async function fixAdminColumn() {
  const client = await db.pool.connect();

  try {
    console.log('Checking and fixing is_admin column...');

    // Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_admin';
    `);

    if (checkColumn.rows.length === 0) {
      console.log('❌ is_admin column does NOT exist. Adding it now...');

      // Add the column
      await client.query('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;');
      console.log('✓ Added is_admin column');

      // Create index
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);');
      console.log('✓ Created index on is_admin');

      // Set team@luxewellness.com as admin
      const updateResult = await client.query(
        "UPDATE users SET is_admin = TRUE WHERE email = 'team@luxewellness.com' RETURNING email, is_admin;"
      );

      if (updateResult.rows.length > 0) {
        console.log('✓ Set team@luxewellness.com as admin:', updateResult.rows[0]);
      } else {
        console.log('⚠️  Warning: team@luxewellness.com user not found in database');
        console.log('   You may need to run: npm run db:seed');
      }
    } else {
      console.log('✓ is_admin column already exists');

      // Check if team@luxewellness.com is set as admin
      const checkAdmin = await client.query(
        "SELECT email, is_admin FROM users WHERE email = 'team@luxewellness.com';"
      );

      if (checkAdmin.rows.length > 0) {
        const user = checkAdmin.rows[0];
        console.log(`Current status for team@luxewellness.com: is_admin = ${user.is_admin}`);

        if (!user.is_admin) {
          console.log('Setting as admin...');
          await client.query("UPDATE users SET is_admin = TRUE WHERE email = 'team@luxewellness.com';");
          console.log('✓ Set team@luxewellness.com as admin');
        } else {
          console.log('✓ Already set as admin');
        }
      } else {
        console.log('⚠️  Warning: team@luxewellness.com user not found');
        console.log('   Run: npm run db:seed');
      }
    }

    console.log('\n✓ All checks complete!');
    console.log('\nNow try logging in with:');
    console.log('  Email: team@luxewellness.com');
    console.log('  Password: password123');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await db.pool.end();
  }
}

fixAdminColumn()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
