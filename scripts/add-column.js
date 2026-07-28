const { config } = require('dotenv');
const path = require('path');
const postgres = require('postgres');

config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("No DATABASE_URL");
        process.exit(1);
    }
    const sql = postgres(connectionString, { ssl: process.env.NODE_ENV === 'production' ? 'require' : false });
    console.log("Adding column...");
    await sql`ALTER TABLE salary_submissions ADD COLUMN IF NOT EXISTS source_url TEXT;`;
    console.log("Column added successfully");
    process.exit(0);
}
main().catch(console.error);
