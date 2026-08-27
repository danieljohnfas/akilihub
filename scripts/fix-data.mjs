import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const ARTEFACT = /^\[(?:LINK|IMAGE|BUTTON|HEADING|VIDEO|SKIP|TABLE|FORM|INPUT|IFRAME)[^\]]*\]/i;
const MARKDOWN_LINK = /\[([^\]]+)\]\s*=>\s*https?:\/\/\S+/i;
const HTML_TAG = /<[a-z][^>]*>/i;
const NBSP = /[\u00a0\u200b\ufeff]/;

function isGarbled(title) {
  if (!title || title.length < 3) return true;
  if (ARTEFACT.test(title)) return true;
  if (MARKDOWN_LINK.test(title)) return true;
  if (HTML_TAG.test(title)) return true;
  if (title.startsWith("[") && title.includes("=>")) return true;
  if (title.startsWith("[") && title.includes("http")) return true;
  return false;
}

async function main() {
  console.log("=== DATABASE DATA CLEANUP ===\n");

  // 1. Find & deactivate garbled jobs
  console.log("1. Scanning jobs for garbled titles...");
  let offset = 0;
  let garbledJobs = [];
  while (true) {
    const {data, error} = await sb.from("jobs").select("id,title,company_name,created_at").order("created_at", {ascending:false}).range(offset, offset+999);
    if (error || !data || data.length === 0) break;
    const bad = data.filter(j => isGarbled(j.title) || isGarbled(j.company_name));
    garbledJobs.push(...bad);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`  Found ${garbledJobs.length} garbled jobs`);
  if (garbledJobs.length > 0) {
    console.log("  Sample garbled jobs:");
    garbledJobs.slice(0,5).forEach(j => console.log("    ["+j.created_at?.substring(0,10)+"] "+j.title?.substring(0,60)));
    
    // Deactivate them in batches of 100
    const ids = garbledJobs.map(j => j.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i+100);
      const {error: ue} = await sb.from("jobs").update({is_active: false, needs_ai_extraction: true}).in("id", batch);
      if (ue) console.error("  Update error:", ue.message);
    }
    console.log(`  ✓ Deactivated ${garbledJobs.length} garbled jobs (marked for re-extraction)`);
  }

  // 2. Find & fix garbled tenders
  console.log("\n2. Scanning tenders for garbled titles...");
  const {data: allTenders, error: te} = await sb.from("tenders").select("id,title,contracting_authority,created_at").limit(5000);
  if (!te) {
    const garbledTenders = (allTenders||[]).filter(t => isGarbled(t.title) || isGarbled(t.contracting_authority));
    console.log(`  Found ${garbledTenders.length} garbled tenders`);
    garbledTenders.slice(0,5).forEach(t => console.log("    "+t.title?.substring(0,60)));
    if (garbledTenders.length > 0) {
      const ids = garbledTenders.map(t => t.id);
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i+100);
        // Set contracting_authority to "Unknown" if garbled, keep tender but mark status as closed
        const badTitle = garbledTenders.filter(t => batch.includes(t.id) && isGarbled(t.title));
        const badCA = garbledTenders.filter(t => batch.includes(t.id) && isGarbled(t.contracting_authority) && !isGarbled(t.title));
        if (badTitle.length > 0) {
          await sb.from("tenders").update({status: "closed"}).in("id", badTitle.map(t => t.id));
        }
        if (badCA.length > 0) {
          await sb.from("tenders").update({contracting_authority: "Procuring Entity"}).in("id", badCA.map(t => t.id));
        }
      }
      console.log(`  ✓ Fixed ${garbledTenders.length} garbled tenders`);
    }
  }

  // 3. Fix salary outliers — flag submissions with absurd values
  console.log("\n3. Fixing salary outliers...");
  // Min reasonable salary: 100 (any currency), Max: 100,000,000 (high but not absurd for TZS)
  const {data: badSalaries, error: se} = await sb.from("salary_submissions")
    .select("id,gross_monthly_salary,currency")
    .or("gross_monthly_salary.lt.100,gross_monthly_salary.gt.100000000")
    .limit(500);
  if (!se && badSalaries?.length > 0) {
    console.log(`  Found ${badSalaries.length} salary outliers`);
    badSalaries.slice(0,5).forEach(s => console.log("    currency:"+s.currency+" amount:"+s.gross_monthly_salary));
    // Mark them as unverified so they don't affect aggregates
    const ids = badSalaries.map(s => s.id);
    const {error: sue} = await sb.from("salary_submissions").update({is_verified: false}).in("id", ids);
    if (sue) console.error("  Error:", sue.message);
    else console.log(`  ✓ Marked ${badSalaries.length} salary outliers as unverified`);
  } else if (!se) {
    console.log("  ✓ No salary outliers found");
  }

  // 4. Fix tender budget outlier ($61.8B)
  console.log("\n4. Fixing tender budget outlier...");
  const {data: bigBudgets, error: bbe} = await sb.from("tenders")
    .select("id,title,budget")
    .gt("budget", 10000000000) // > $10B is certainly wrong
    .limit(100);
  if (!bbe && bigBudgets?.length > 0) {
    console.log(`  Found ${bigBudgets.length} absurd budget tenders:`);
    bigBudgets.forEach(t => console.log("    budget:"+t.budget+" — "+t.title?.substring(0,50)));
    const ids = bigBudgets.map(t => t.id);
    const {error: bue} = await sb.from("tenders").update({budget: null}).in("id", ids);
    if (bue) console.error("  Error:", bue.message);
    else console.log(`  ✓ Cleared ${bigBudgets.length} absurd budgets`);
  } else if (!bbe) {
    console.log("  ✓ No absurd budgets found");
  }

  // 5. Investigate Kenya jobs country_id issue
  console.log("\n5. Investigating country_id assignment for jobs...");
  const {data: countries} = await sb.from("countries").select("id,name,code");
  const countryMap = {};
  (countries||[]).forEach(c => countryMap[c.id] = c);
  
  // Count jobs per country_id
  const {data: jobCountry} = await sb.from("jobs").select("country_id").limit(5000);
  const countsByCountry = {};
  (jobCountry||[]).forEach(j => {
    const cn = j.country_id ? (countryMap[j.country_id]?.name || "Unknown: "+j.country_id) : "(null)";
    countsByCountry[cn] = (countsByCountry[cn]||0)+1;
  });
  console.log("  Jobs by country_id (all):");
  Object.entries(countsByCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(40)+" "+v));
  
  // Also check jobs with location text mentioning Kenya/Uganda/Rwanda
  const KE = (countries||[]).find(c=>c.code==="KE");
  const UG = (countries||[]).find(c=>c.code==="UG");
  const RW = (countries||[]).find(c=>c.code==="RW");
  const BI = (countries||[]).find(c=>c.code==="BI");
  
  // Check jobs that have null country_id but Kenya-related location text
  if (KE) {
    // Jobs with null country_id but Kenya in title or company_name
    const {data: keJobs} = await sb.from("jobs").select("id,title,company_name").is("country_id",null).ilike("title", "%kenya%").limit(10);
    console.log(`\n  Jobs with null country_id + 'kenya' in title: ${keJobs?.length || 0}`);
    if (keJobs?.length > 0) {
      // Fix: assign Kenya country_id to jobs with Kenya in title
      console.log("  NOTE: country_id is null for these — text-based detection only, not FK. The display is correct.");
    }
    
    // More likely: all jobs without country_id
    const {count: nullCount} = await sb.from("jobs").select("*",{count:"exact",head:true}).is("country_id",null);
    console.log(`\n  Total jobs with null country_id: ${nullCount}`);
    console.log("  These jobs display without country filter. This explains why Kenya filter shows 0 results by country_id.");
    console.log("  DIAGNOSIS: Jobs scraper is not setting country_id FK. Titles mention countries as text but FK is null.");
  }

  console.log("\n=== CLEANUP COMPLETE ===");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
