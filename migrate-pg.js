const postgres = require('postgres');

async function migrate() {
  const sql = postgres('postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb%21Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

  try {
    console.log('Connected to DB!');
    await sql`
      CREATE TABLE IF NOT EXISTS "admin_config" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "password_hash" text NOT NULL,
        "totp_secret" text NOT NULL,
        "is_setup" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log('Table created!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
