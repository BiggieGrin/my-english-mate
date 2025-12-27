// Database migration script for Supabase
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read from .env file
const supabaseUrl = "https://ynzwbttkyjhrqeloquhu.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYXZza2VtaWVqc2pnc25haGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NjA1MTQsImV4cCI6MjA3NjIzNjUxNH0.g9E0ApbgRkLwEQUhg2vCH4C7CVcyOOkmmv8JBOqZfeg";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log("🔗 Testing connection to Supabase...\n");

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      console.error("❌ Connection failed:", error.message);
      return false;
    }

    console.log("✅ Connection successful!\n");
    return true;
  } catch (err) {
    console.error("❌ Connection error:", err.message);
    return false;
  }
}

async function checkIfColumnExists() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .limit(1);

    // If no error, column exists
    if (!error) {
      console.log('⚠️  Column "onboarding_completed" already exists!');
      return true;
    }

    return false;
  } catch (err) {
    return false;
  }
}

async function runMigrations() {
  console.log("🚀 Starting database migrations for onboarding feature...\n");
  console.log("=".repeat(60) + "\n");

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.log("\n❌ Cannot proceed without database connection.");
    console.log("\n📋 Manual Migration Instructions:");
    console.log(
      "1. Go to: https://supabase.com/dashboard/project/ynzwbttkyjhrqeloquhu/editor"
    );
    console.log("2. Open SQL Editor");
    console.log("3. Run each migration file in order:\n");

    const migrations = [
      "20251214000001_add_onboarding_completed.sql",
      "20251214000002_make_profile_fields_nullable.sql",
      "20251214000003_update_handle_new_user_trigger.sql",
    ];

    migrations.forEach((file, i) => {
      console.log(`   ${i + 1}. supabase/migrations/${file}`);
    });

    return;
  }

  // Check if migration already ran
  const exists = await checkIfColumnExists();
  if (exists) {
    console.log("\n✅ Migrations appear to have already been run!");
    console.log(
      "The onboarding_completed column exists in the profiles table.\n"
    );
    return;
  }

  console.log("❌ Direct SQL execution via Supabase JS client is limited.\n");
  console.log("📋 MANUAL MIGRATION REQUIRED:\n");
  console.log("Please follow these steps:\n");
  console.log(
    "1. Open Supabase Dashboard: https://supabase.com/dashboard/project/ynzwbttkyjhrqeloquhu"
  );
  console.log("2. Navigate to: SQL Editor");
  console.log("3. Run each SQL file in this order:\n");

  const migrationDir = path.join(__dirname, "supabase", "migrations");
  const migrations = [
    "20251214000001_add_onboarding_completed.sql",
    "20251214000002_make_profile_fields_nullable.sql",
    "20251214000003_update_handle_new_user_trigger.sql",
  ];

  migrations.forEach((file, index) => {
    const filePath = path.join(migrationDir, file);
    console.log(`\n${"─".repeat(60)}`);
    console.log(`Migration ${index + 1}: ${file}`);
    console.log("─".repeat(60));

    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, "utf8");
      console.log(sql);
    } else {
      console.log(`❌ File not found: ${filePath}`);
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("📋 After running all migrations, the system will be ready!");
  console.log("=".repeat(60) + "\n");
}

runMigrations().catch(console.error);
