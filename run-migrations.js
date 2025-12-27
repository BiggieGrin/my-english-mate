// Migration script to run SQL files against Supabase database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Connection details
const supabaseUrl = 'https://ynzwbttkyjhrqeloquhu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluendidHRreWpocnFlbG9xdWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzEzOTYsImV4cCI6MjA0ODU0NzM5Nn0.gBmGWZKXrRkqfY9a8e7zQ3VzcEBIpjEWfS8rqCgS6aI'; // Using service_role key from env

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath) {
  console.log(`\n📄 Running migration: ${path.basename(filePath)}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Execute the SQL using Supabase's RPC to raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error(`❌ Error in ${path.basename(filePath)}:`, error);
      return false;
    }

    console.log(`✅ Successfully executed ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to read or execute ${path.basename(filePath)}:`, err.message);
    return false;
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const migrationDir = path.join(__dirname, 'supabase', 'migrations');

  const migrations = [
    '20251214000001_add_onboarding_completed.sql',
    '20251214000002_make_profile_fields_nullable.sql',
    '20251214000003_update_handle_new_user_trigger.sql'
  ];

  let allSuccess = true;

  for (const migration of migrations) {
    const filePath = path.join(migrationDir, migration);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${migration}`);
      allSuccess = false;
      continue;
    }

    const success = await runMigration(filePath);
    if (!success) {
      allSuccess = false;
    }

    // Wait a bit between migrations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  if (allSuccess) {
    console.log('✅ All migrations completed successfully!');
  } else {
    console.log('⚠️  Some migrations failed. Please check the errors above.');
  }
  console.log('='.repeat(50) + '\n');
}

// Note: Supabase doesn't have a direct exec_sql RPC by default
// We'll need to use the REST API instead
async function runMigrationViaRest(filePath) {
  console.log(`\n📄 Running migration: ${path.basename(filePath)}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Use fetch to call Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return false;
    }

    console.log(`✅ Successfully executed ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to execute ${path.basename(filePath)}:`, err.message);
    return false;
  }
}

console.log('⚠️  Note: This script requires direct database access.');
console.log('Please run migrations manually via Supabase Dashboard → SQL Editor\n');
console.log('Or use the Supabase CLI if installed.\n');

// Display migration files for manual execution
const migrationDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = [
  '20251214000001_add_onboarding_completed.sql',
  '20251214000002_make_profile_fields_nullable.sql',
  '20251214000003_update_handle_new_user_trigger.sql'
];

console.log('Migration files to run in order:\n');
migrations.forEach((file, index) => {
  const filePath = path.join(migrationDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`${index + 1}. ${file}`);
  }
});

console.log('\n📋 Copy the SQL content from each file and paste into Supabase SQL Editor.');
