import postgres from "postgres";
const sql = postgres({
  host: "aws-1-eu-central-1.pooler.supabase.com",
  port: 6543, database: "postgres",
  username: "postgres.pywienffahvmylssnorr",
  password: "6g3kJKx9u@Sb!Xn",
  ssl: "require", max: 1, connect_timeout: 15
});

try {
  // Get all tables
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log("=== ALL TABLES ===");
  tables.forEach(t => console.log("  " + t.table_name));

  // Get salary_submissions columns
  const salaryCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='salary_submissions' ORDER BY ordinal_position`;
  console.log("\n=== SALARY_SUBMISSIONS COLUMNS ===");
  salaryCols.forEach(c => console.log("  " + c.column_name));

  // Data quality checks on jobs
  const [nullCompany] = await sql`SELECT COUNT(*) as cnt FROM jobs WHERE is_active=true AND (deadline IS NULL OR deadline > NOW()) AND (company_name IS NULL OR TRIM(company_name)='')`;
  const [withDeadline] = await sql`SELECT COUNT(*) as cnt FROM jobs WHERE is_active=true AND deadline IS NOT NULL AND deadline > NOW()`;
  const [noDeadline] = await sql`SELECT COUNT(*) as cnt FROM jobs WHERE is_active=true AND deadline IS NULL`;
  const [aggr] = await sql`SELECT COUNT(*) FILTER (WHERE is_aggregator_source=true) as aggregator, COUNT(*) FILTER (WHERE is_aggregator_source=false OR is_aggregator_source IS NULL) as direct FROM jobs WHERE is_active=true AND (deadline IS NULL OR deadline > NOW())`;
  const [salaryFilled] = await sql`SELECT COUNT(*) as cnt FROM jobs WHERE is_active=true AND (deadline IS NULL OR deadline > NOW()) AND salary_min IS NOT NULL`;
  const [needsAI] = await sql`SELECT COUNT(*) as cnt FROM jobs WHERE needs_ai_extraction=true AND is_active=true`;

  // Job type breakdown
  const byType = await sql`SELECT job_type, COUNT(*) as cnt FROM jobs WHERE is_active=true AND (deadline IS NULL OR deadline > NOW()) GROUP BY job_type ORDER BY cnt DESC`;

  // Top companies
  const topCompanies = await sql`SELECT company_name, COUNT(*) as cnt FROM jobs WHERE is_active=true AND (deadline IS NULL OR deadline > NOW()) GROUP BY company_name ORDER BY cnt DESC LIMIT 10`;

  // Tenders by category
  const tenderCats = await sql`SELECT category, COUNT(*) as cnt FROM tenders WHERE status='open' GROUP BY category ORDER BY cnt DESC LIMIT 8`;

  // Guides by category
  const guidesByCat = await sql`SELECT category, COUNT(*) as cnt FROM guides WHERE is_published=true GROUP BY category ORDER BY cnt DESC`;

  // Countries table
  const countryList = await sql`SELECT c.name, COUNT(j.id) FILTER (WHERE j.is_active=true AND (j.deadline IS NULL OR j.deadline > NOW())) as live_jobs FROM countries c LEFT JOIN jobs j ON j.country_id=c.id GROUP BY c.name ORDER BY live_jobs DESC`;

  console.log("\n=== JOBS DATA QUALITY (822 live) ===");
  console.log(`  Empty company name:  ${nullCompany.cnt}`);
  console.log(`  Has deadline:        ${withDeadline.cnt} | No deadline: ${noDeadline.cnt}`);
  console.log(`  Aggregator source:   ${aggr.aggregator} | Direct: ${aggr.direct}`);
  console.log(`  Has salary data:     ${salaryFilled.cnt}`);
  console.log(`  Needs AI extraction: ${needsAI.cnt}`);

  console.log("\n=== LIVE JOBS BY TYPE ===");
  byType.forEach(r => console.log(`  ${r.job_type}: ${r.cnt}`));

  console.log("\n=== COUNTRIES (with live job count) ===");
  countryList.forEach(r => console.log(`  ${r.name}: ${r.live_jobs}`));

  console.log("\n=== TOP 10 EMPLOYERS ===");
  topCompanies.forEach(r => console.log(`  ${r.company_name}: ${r.cnt}`));

  console.log("\n=== OPEN TENDERS BY CATEGORY ===");
  tenderCats.forEach(r => console.log(`  ${r.category || 'Unknown'}: ${r.cnt}`));

  console.log("\n=== GUIDES BY CATEGORY ===");
  guidesByCat.forEach(r => console.log(`  ${r.category}: ${r.cnt}`));

} catch(e) { console.error("ERROR:", e.message, e.stack); }
await sql.end();
