const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database URL from command line or environment
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is required');
  console.log('Usage: node run-migrations.js <DATABASE_URL>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // For Render PostgreSQL
  }
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Connecting to database...');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 Running database schema...');
    await client.query(schemaSQL);
    
    console.log('✅ Database schema created successfully!');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Some tables already exist. This is okay if you\'re re-running migrations.');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('\n🎉 Migrations completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
