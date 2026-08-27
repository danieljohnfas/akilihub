import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const SITE = "https://akilibrain.com";

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function hr(c="─",n=72){return c.repeat(n);}
function section(t){console.log("\n"+hr("═")+"\n  "+t+"\n"+hr("═"));}
function sub(t){console.log("\n"+hr("─",60)+"\n  "+t+"\n"+hr("─",60));}
function row(l,v){console.log("  "+l.padEnd(46)+" "+v);}

// Count helper
async function count(table, filter="") {
  let q = sb.from(table).select("*", {count:"exact",head:true});
  if (filter) {
    const parts = filter.split(" AND ");
    for (const p of parts) {
      const m = p.match(/^(\w+)\s*(=|IS NOT NULL|IS NULL|<)\s*(.*)$/);
      if (!m) continue;
      const [,col,op,val] = m;
      if (op === "IS NOT NULL") q = q.not(col,"is",null);
      else if (op === "IS NULL") q = q.is(col,null);
      else if (op === "=") q = q.eq(col, val.replace(/'/g,""));
      else if (op === "<") q = q.lt(col, val);
    }
  }
  const {count:c, error} = await q;
  if (error) { console.error("count error on "+table+"/"+filter+":", error.message); return 0; }
  return c || 0;
}

// Fetch all rows of a table (up to 1000)
async function fetchAll(table, opts={}) {
  let q = sb.from(table).select(opts.select || "*").limit(opts.limit || 1000);
  if (opts.order) q = q.order(opts.order, {ascending: opts.asc !== false});
  const {data, error} = await q;
  if (error) { console.error("fetchAll error on "+table+":", error.message); return []; }
  return data || [];
}

async function fw(path) {
  const url = SITE+path;
  try {
    const r = await fetch(url, {headers:{"User-Agent":"AkilihubAuditBot/1.0"}, signal:AbortSignal.timeout(25000)});
    return {ok:r.ok, status:r.status, text:await r.text(), url};
  } catch(e) { return {ok:false, status:0, text:"", url, error:e.message}; }
}

// Group/count helper from array
function groupBy(arr, key) {
  const m = {};
  arr.forEach(r => { const k = r[key]||"(null)"; m[k]=(m[k]||0)+1; });
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}

async function main() {
  const t0 = Date.now();
  section("AKILIHUB — COMPREHENSIVE DB + WEBSITE AUDIT");
  console.log("  Run time: "+new Date().toISOString());
  console.log("  DB: Supabase REST API ("+SUPABASE_URL+")");
  console.log("  Website: "+SITE);

  // Connection test
  const {data:testD, error:testE} = await sb.from("countries").select("count",{count:"exact",head:true});
  if (testE) { console.error("  ✗ DB FAILED:", testE.message); process.exit(1); }
  row("\n  DB Connection:", "✓ Connected via Supabase REST");

  // ─── DATABASE AUDIT ───────────────────────────────────────────────────────
  section("DATABASE AUDIT");

  // COUNTRIES
  sub("COUNTRIES & REGIONS");
  const countries = await fetchAll("countries", {select:"name,code", order:"name"});
  const regionsCount = await count("regions");
  row("Total countries:", countries.length.toString());
  row("Total regions:", regionsCount.toString());
  console.log("\n  Countries:");
  countries.forEach(c=>console.log("    ["+c.code+"] "+c.name));

  // JOBS
  sub("JOBS TABLE");
  const now = new Date().toISOString();
  const sixtyDaysAgo = new Date(Date.now()-60*24*60*60*1000).toISOString();

  const [jobsTotal, jobsActive, jobsInactive, jobsNeedAI, jobsNoEmp, jobsWithSal] = await Promise.all([
    count("jobs"),
    count("jobs","is_active=true"),
    count("jobs","is_active=false"),
    count("jobs","needs_ai_extraction=true"),
    sb.from("jobs").select("*",{count:"exact",head:true}).is("employer_url",null).eq("is_aggregator_source",true).then(r=>r.count||0),
    sb.from("jobs").select("*",{count:"exact",head:true}).not("salary_min","is",null).then(r=>r.count||0),
  ]);

  // Expired active jobs
  const {count:jobsExpired} = await sb.from("jobs").select("*",{count:"exact",head:true}).eq("is_active",true).lt("deadline",now);
  // Old active jobs
  const {count:jobsOld} = await sb.from("jobs").select("*",{count:"exact",head:true}).eq("is_active",true).lt("created_at",sixtyDaysAgo);

  // By country join
  const allJobs = await fetchAll("jobs", {select:"country_id,job_type,sector,is_active,salary_min"});
  const countryMap = {};
  countries.forEach(c=>countryMap[c.id]=c);

  // Need to join country names - fetch with country details
  const {data: jobsWithCountry} = await sb.from("jobs").select("country_id, job_type, sector, is_active, salary_min, countries(name,code)").limit(5000);

  const jobsByCountry = {};
  const jobsByType = {};
  const jobsBySector = {};

  (jobsWithCountry||[]).forEach(j => {
    const cname = j.countries ? "["+j.countries.code+"] "+j.countries.name : "(unknown)";
    jobsByCountry[cname] = (jobsByCountry[cname]||0)+1;
    const t = j.job_type||"(null)";
    jobsByType[t] = (jobsByType[t]||0)+1;
    const s = j.sector||"(null)";
    jobsBySector[s] = (jobsBySector[s]||0)+1;
  });

  // Recent jobs
  const recentJobs = await fetchAll("jobs",{select:"title,company_name,created_at",order:"created_at",asc:false,limit:10});

  row("Total jobs:", jobsTotal.toString());
  row("Active:", jobsActive.toString());
  row("Inactive:", jobsInactive.toString());
  row("Needs AI extraction:", jobsNeedAI.toString());
  row("With salary data:", jobsWithSal.toString());
  row("Aggregator, no employer_url:", jobsNoEmp.toString());
  row("Active but deadline PAST:", (jobsExpired||0).toString());
  row("Active but older than 60 days:", (jobsOld||0).toString());
  console.log("\n  By Country:");
  Object.entries(jobsByCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(32)+" "+v));
  console.log("\n  By Job Type:");
  Object.entries(jobsByType).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(22)+" "+v));
  console.log("\n  By Sector (top 15):");
  Object.entries(jobsBySector).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log("    "+k.substring(0,35).padEnd(36)+" "+v));
  console.log("\n  10 Most Recent Jobs:");
  recentJobs.forEach(r=>console.log("    ["+r.created_at.substring(0,10)+"] "+r.title.substring(0,44).padEnd(45)+"— "+r.company_name.substring(0,28)));

  // TENDERS
  sub("TENDERS TABLE");
  const [tendTotal, tendOpen, tendClosed, tendSum, tendNodoc] = await Promise.all([
    count("tenders"),
    count("tenders","status=open"),
    count("tenders","status=closed"),
    sb.from("tenders").select("*",{count:"exact",head:true}).not("ai_summary","is",null).then(r=>r.count||0),
    sb.from("tenders").select("*",{count:"exact",head:true}).is("document_url",null).then(r=>r.count||0),
  ]);
  const {count:tendExpired} = await sb.from("tenders").select("*",{count:"exact",head:true}).eq("status","open").lt("deadline",now);

  const {data:tendWithCountry} = await sb.from("tenders").select("country_id, category, status, budget, countries(name,code)").limit(5000);
  const tendByCountry={}, tendByCategory={}, tendByStatus={};
  const budgets = [];
  (tendWithCountry||[]).forEach(t=>{
    const cn = t.countries?"["+t.countries.code+"] "+t.countries.name:"(unknown)";
    tendByCountry[cn]=(tendByCountry[cn]||0)+1;
    const cat=t.category||"(null)"; tendByCategory[cat]=(tendByCategory[cat]||0)+1;
    const st=t.status||"(null)"; tendByStatus[st]=(tendByStatus[st]||0)+1;
    if(t.budget) budgets.push(parseFloat(t.budget));
  });
  const recentTenders = await fetchAll("tenders",{select:"title,contracting_authority,created_at,status",order:"created_at",asc:false,limit:10});

  row("Total tenders:", tendTotal.toString());
  row("Open:", tendOpen.toString());
  row("Closed:", tendClosed.toString());
  row("With AI summary:", tendSum.toString());
  row("Open but deadline PAST:", (tendExpired||0).toString());
  row("Missing document_url:", tendNodoc.toString());
  row("With budget data:", budgets.length.toString());
  if(budgets.length>0){
    row("  Min budget:", "$"+Math.min(...budgets).toLocaleString());
    row("  Max budget:", "$"+Math.max(...budgets).toLocaleString());
    row("  Avg budget:", "$"+(budgets.reduce((a,b)=>a+b,0)/budgets.length).toFixed(0));
  }
  console.log("\n  By Country:");
  Object.entries(tendByCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(32)+" "+v));
  console.log("\n  By Category:");
  Object.entries(tendByCategory).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+(k).padEnd(22)+" "+v));
  console.log("\n  By Status:");
  Object.entries(tendByStatus).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(22)+" "+v));
  console.log("\n  10 Most Recent Tenders:");
  recentTenders.forEach(r=>console.log("    ["+r.created_at.substring(0,10)+"]["+r.status+"] "+r.title.substring(0,42).padEnd(43)+"— "+r.contracting_authority.substring(0,24)));

  // SALARIES
  sub("SALARIES TABLE");
  const [salTotal, salVerif, salAnon, empCount, catCount] = await Promise.all([
    count("salary_submissions"),
    count("salary_submissions","is_verified=true"),
    count("salary_submissions","is_anonymous=true"),
    count("employers"),
    count("job_categories"),
  ]);
  const {data:salData} = await sb.from("salary_submissions").select("country_id, experience_level, currency, gross_monthly_salary, job_title, countries(name,code)").limit(2000);
  const salByCountry={}, salByLevel={}, salByCur={}, salByJobTitle={};
  const salaries = [];
  (salData||[]).forEach(s=>{
    const cn=s.countries?"["+s.countries.code+"] "+s.countries.name:"(unknown)";
    salByCountry[cn]=(salByCountry[cn]||0)+1;
    const lv=s.experience_level||"(null)"; salByLevel[lv]=(salByLevel[lv]||0)+1;
    const cu=s.currency||"(null)"; salByCur[cu]=(salByCur[cu]||0)+1;
    const jt=s.job_title||"(null)"; salByJobTitle[jt]=(salByJobTitle[jt]||0)+1;
    if(s.gross_monthly_salary) salaries.push(parseFloat(s.gross_monthly_salary));
  });

  row("Total salary submissions:", salTotal.toString());
  row("Verified:", salVerif.toString());
  row("Anonymous:", salAnon.toString());
  row("Employers in DB:", empCount.toString());
  row("Job categories:", catCount.toString());
  if(salaries.length>0){
    const avg=(salaries.reduce((a,b)=>a+b,0)/salaries.length).toFixed(2);
    row("Avg gross monthly salary:", avg);
    row("Min:", Math.min(...salaries).toString());
    row("Max:", Math.max(...salaries).toString());
  }
  console.log("\n  By Country:");
  Object.entries(salByCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(32)+" "+v));
  console.log("\n  By Experience Level:");
  Object.entries(salByLevel).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(22)+" "+v));
  console.log("\n  By Currency:");
  Object.entries(salByCur).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(22)+" "+v));
  console.log("\n  Top 10 Job Titles:");
  Object.entries(salByJobTitle).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>console.log("    "+k.substring(0,38).padEnd(39)+" "+v));

  // COMPLIANCE
  sub("COMPLIANCE TABLE");
  const [compTotal, compActive, bizCount, bizTypeCount, compNoSrc] = await Promise.all([
    count("compliance_requirements"),
    count("compliance_requirements","is_active=true"),
    count("businesses"),
    count("business_types"),
    sb.from("compliance_requirements").select("*",{count:"exact",head:true}).is("source_url",null).then(r=>r.count||0),
  ]);
  const {data:compData} = await sb.from("compliance_requirements").select("country_id, category, resource_type, countries(name,code)").limit(2000);
  const compByCountry={}, compByCat={}, compByRT={};
  (compData||[]).forEach(c=>{
    const cn=c.countries?"["+c.countries.code+"] "+c.countries.name:"(unknown)";
    compByCountry[cn]=(compByCountry[cn]||0)+1;
    const cat=c.category||"(null)"; compByCat[cat]=(compByCat[cat]||0)+1;
    const rt=c.resource_type||"(null)"; compByRT[rt]=(compByRT[rt]||0)+1;
  });

  row("Total compliance requirements:", compTotal.toString());
  row("Active:", compActive.toString());
  row("Missing source_url:", compNoSrc.toString());
  row("Businesses in DB:", bizCount.toString());
  row("Business types:", bizTypeCount.toString());
  console.log("\n  By Country:");
  Object.entries(compByCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(32)+" "+v));
  console.log("\n  By Category:");
  Object.entries(compByCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(30)+" "+v));
  console.log("\n  By Resource Type:");
  Object.entries(compByRT).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(22)+" "+v));

  // HEALTH
  sub("HEALTH DATA TABLE");
  const [healthInds, healthPts] = await Promise.all([
    count("health_indicators"),
    count("health_data_points"),
  ]);
  const {data:healthByCountryData} = await sb.from("health_data_points").select("country_id, year, countries(name,code)").limit(5000);
  const {data:indicatorData} = await sb.from("health_indicators").select("code,name,unit,category").order("name").limit(100);

  const healthByCountry={}, healthByYear={}, healthByCat={};
  (healthByCountryData||[]).forEach(h=>{
    const cn=h.countries?"["+h.countries.code+"] "+h.countries.name:"(unknown)";
    healthByCountry[cn]=(healthByCountry[cn]||0)+1;
    const yr=h.year||"(null)"; healthByYear[yr]=(healthByYear[yr]||0)+1;
  });
  (indicatorData||[]).forEach(i=>{
    const cat=i.category||"(null)"; healthByCat[cat]=(healthByCat[cat]||0)+1;
  });

  row("Total health indicators:", healthInds.toString());
  row("Total data points:", healthPts.toString());
  console.log("\n  Data Points by Country:");
  Object.entries(healthByCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(32)+" "+v));
  console.log("\n  By Year (recent 10):");
  Object.entries(healthByYear).sort((a,b)=>b[0]-a[0]).slice(0,10).forEach(([k,v])=>console.log("    "+k+"  "+v));
  console.log("\n  Indicators by Category:");
  Object.entries(healthByCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(26)+" "+v));
  console.log("\n  Sample Indicators (first 20):");
  (indicatorData||[]).slice(0,20).forEach(r=>console.log("    ["+r.code+"] "+r.name.substring(0,46).padEnd(47)+" unit:"+(r.unit||"N/A")));

  // GUIDES
  sub("GUIDES TABLE");
  const [guidesTotal, guidesPub] = await Promise.all([
    count("guides"),
    count("guides","is_published=true"),
  ]);
  const {data:guidesData} = await sb.from("guides").select("title,category,view_count,is_published,published_at").order("view_count",{ascending:false}).limit(100);
  const guidesByCat={};
  (guidesData||[]).forEach(g=>{const cat=g.category||"(null)"; guidesByCat[cat]=(guidesByCat[cat]||0)+1;});
  const topViewed = [...(guidesData||[])].sort((a,b)=>b.view_count-a.view_count).slice(0,10);
  const recentGuides = [...(guidesData||[])].sort((a,b)=>new Date(b.published_at)-new Date(a.published_at)).slice(0,10);

  row("Total guides:", guidesTotal.toString());
  row("Published:", guidesPub.toString());
  console.log("\n  By Category:");
  Object.entries(guidesByCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(22)+" "+v));
  console.log("\n  Top 10 Most Viewed:");
  topViewed.forEach(r=>console.log("    ["+r.published_at.substring(0,10)+"] views:"+String(r.view_count).padStart(5)+"  "+r.title.substring(0,46).padEnd(47)+"["+r.category+"]"));
  console.log("\n  10 Most Recent:");
  recentGuides.forEach(r=>console.log("    ["+r.published_at.substring(0,10)+"] "+r.title.substring(0,52).padEnd(53)+"["+r.category+"]"));

  // USERS
  sub("USERS & AUTH TABLE");
  const [usersTotal, usersPro, usersEmail, usersSent, alertsTotal, alertsActive, bookmarksTotal] = await Promise.all([
    count("users"),
    count("users","is_pro=true"),
    count("users","email_updates=true"),
    count("users","welcome_email_sent=true"),
    count("user_alerts"),
    count("user_alerts","is_active=true"),
    count("bookmarks"),
  ]);
  const thirtyDaysAgo = new Date(Date.now()-30*24*60*60*1000).toISOString();
  const {count:users30} = await sb.from("users").select("*",{count:"exact",head:true}).gte("created_at",thirtyDaysAgo);
  const {data:alertModData} = await sb.from("user_alerts").select("module").limit(2000);
  const {data:usersCountryData} = await sb.from("users").select("country_id, countries(name,code)").not("country_id","is",null).limit(2000);
  const alertByMod={}, usersByCountry={};
  (alertModData||[]).forEach(a=>{const m=a.module||"(null)"; alertByMod[m]=(alertByMod[m]||0)+1;});
  (usersCountryData||[]).forEach(u=>{
    const cn=u.countries?"["+u.countries.code+"] "+u.countries.name:"(unknown)";
    usersByCountry[cn]=(usersByCountry[cn]||0)+1;
  });

  row("Total registered users:", usersTotal.toString());
  row("Pro users:", usersPro.toString());
  row("Email updates opted-in:", usersEmail.toString());
  row("Welcome email sent:", usersSent.toString());
  row("Signups last 30 days:", (users30||0).toString());
  row("Total user alerts:", alertsTotal.toString());
  row("Active alerts:", alertsActive.toString());
  row("Total bookmarks:", bookmarksTotal.toString());
  console.log("\n  Users by Country:");
  Object.entries(usersByCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(32)+" "+v));
  console.log("\n  Alerts by Module:");
  Object.entries(alertByMod).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    "+k.padEnd(22)+" "+v));

  // ─── WEBSITE AUDIT ────────────────────────────────────────────────────────
  section("WEBSITE — LIVE COMPARISON ("+SITE+")");
  const web={};

  // Jobs API
  sub("GET /api/jobs?limit=5");
  const jr=await fw("/api/jobs?limit=5");
  row("HTTP Status:", jr.status.toString());
  if(jr.error){row("Error:",jr.error);web.jobs={ok:false};}
  else{
    try{
      const j=JSON.parse(jr.text);
      const arr=j.jobs||j.data||(Array.isArray(j)?j:null);
      if(arr){row("Items returned:",arr.length.toString());row("Total reported:",(j.total||j.count||"N/A").toString());if(arr[0])console.log("  Keys: "+Object.keys(arr[0]).join(", "));web.jobs={ok:true,returned:arr.length,total:j.total};}
      else{console.log("  Top-level keys: "+Object.keys(j).join(", "));web.jobs={ok:true};}
    }catch(_){const m=jr.text.match(/<title[^>]*>([^<]+)<\/title>/i);row("Response type:","HTML");if(m)row("Page title:",m[1]);web.jobs={ok:jr.ok};}
  }

  // Tenders API
  sub("GET /api/tenders?limit=5");
  const tr=await fw("/api/tenders?limit=5");
  row("HTTP Status:", tr.status.toString());
  if(tr.error){row("Error:",tr.error);web.tenders={ok:false};}
  else{
    try{
      const t=JSON.parse(tr.text);
      const arr=t.tenders||t.data||(Array.isArray(t)?t:null);
      if(arr){row("Items returned:",arr.length.toString());row("Total reported:",(t.total||t.count||"N/A").toString());if(arr[0])console.log("  Keys: "+Object.keys(arr[0]).join(", "));web.tenders={ok:true,returned:arr.length,total:t.total};}
      else{console.log("  Top-level keys: "+Object.keys(t).join(", "));web.tenders={ok:true};}
    }catch(_){const m=tr.text.match(/<title[^>]*>([^<]+)<\/title>/i);row("Response type:","HTML");if(m)row("Page title:",m[1]);web.tenders={ok:tr.ok};}
  }

  // Health endpoint
  sub("GET /api/health");
  const hr2=await fw("/api/health");
  row("HTTP Status:", hr2.status.toString());
  if(!hr2.error){
    try{const h=JSON.parse(hr2.text);Object.entries(h).forEach(([k,v])=>{if(typeof v!=="object")row("  "+k+":",String(v).substring(0,70));});}
    catch(_){const m=hr2.text.match(/<title[^>]*>([^<]+)<\/title>/i);if(m)row("Title:",m[1]);}
  }
  web.health={ok:hr2.ok,status:hr2.status};

  // Sitemap
  sub("GET /sitemap.xml");
  const sm=await fw("/sitemap.xml");
  row("HTTP Status:", sm.status.toString());
  if(sm.ok){
    const locs=(sm.text.match(/<loc>/g)||[]).length;
    row("Total <loc> entries:", locs.toString());
    const paths=[...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>{
      try{const u=new URL(m[1]);return u.pathname.split("/").filter(Boolean)[0]||"/";}catch(_){return "?";}
    });
    const cnt={};paths.forEach(p=>cnt[p]=(cnt[p]||0)+1);
    console.log("  URL prefix breakdown:");
    Object.entries(cnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    /"+k.padEnd(26)+" "+v+" URLs"));
    web.sitemap={ok:true,urlCount:locs};
  } else { row("Error:", sm.error||"non-200"); web.sitemap={ok:false}; }

  // RSS
  sub("GET /feed.xml");
  const rss=await fw("/feed.xml");
  row("HTTP Status:", rss.status.toString());
  if(rss.ok){
    const items=(rss.text.match(/<item>/g)||[]).length;
    row("RSS <item> entries:", items.toString());
    web.rss={ok:true,items};
  } else { row("Error:", rss.error||"non-200"); web.rss={ok:false}; }

  // Page checks
  const pages = [
    {path:"/jobs", key:"jobs_page"},
    {path:"/tenders", key:"tenders_page"},
    {path:"/guides", key:"guides_page"},
    {path:"/salaries", key:"salaries_page"},
    {path:"/compliance", key:"compliance_page"},
    {path:"/countries", key:"countries_page"},
  ];
  for(const pg of pages){
    sub("GET "+pg.path+" (HTML page)");
    const r=await fw(pg.path);
    row("HTTP Status:", r.status.toString());
    if(r.ok){
      const m=r.text.match(/<title[^>]*>([^<]+)<\/title>/i);
      if(m)row("Page title:",m[1]);
      row("Response size:", r.text.length+" chars");
    } else row("Error:", r.error||"non-200");
    web[pg.key]={ok:r.ok};
  }

  // ─── CROSS COMPARISON ─────────────────────────────────────────────────────
  section("CROSS-COMPARISON: DATABASE ↔ WEBSITE");
  console.log("\n  Metric                                        Database       Website");
  console.log("  "+"-".repeat(74));
  const f=n=>n!=null?String(n):"N/A";

  const webStatus = (key, label) => web[key]?.ok ? "✓ "+label : "✗ "+label+" DOWN";
  
  console.log("  "+"Jobs (total in DB)".padEnd(46)+f(jobsTotal).padStart(8)+"    "+(web.jobs?.ok?"✓ /api/jobs responds":"✗ no JSON endpoint / SSR"));
  console.log("  "+"Jobs (active)".padEnd(46)+f(jobsActive).padStart(8));
  console.log("  "+"Jobs page live?".padEnd(46)+"DB only".padStart(8)+"    "+webStatus("jobs_page","/jobs page"));
  console.log("  "+"Tenders (total in DB)".padEnd(46)+f(tendTotal).padStart(8)+"    "+(web.tenders?.ok?"✓ /api/tenders responds":"✗ no JSON endpoint / SSR"));
  console.log("  "+"Tenders (open)".padEnd(46)+f(tendOpen).padStart(8));
  console.log("  "+"Tenders page live?".padEnd(46)+"DB only".padStart(8)+"    "+webStatus("tenders_page","/tenders page"));
  console.log("  "+"Salary submissions".padEnd(46)+f(salTotal).padStart(8)+"    "+webStatus("salaries_page","/salaries page"));
  console.log("  "+"Guides (total)".padEnd(46)+f(guidesTotal).padStart(8)+"    "+webStatus("guides_page","/guides page"));
  console.log("  "+"Guides (published)".padEnd(46)+f(guidesPub).padStart(8));
  console.log("  "+"Health indicators".padEnd(46)+f(healthInds).padStart(8));
  console.log("  "+"Health data points".padEnd(46)+f(healthPts).padStart(8));
  console.log("  "+"Compliance requirements".padEnd(46)+f(compTotal).padStart(8)+"    "+webStatus("compliance_page","/compliance page"));
  console.log("  "+"Compliance (active)".padEnd(46)+f(compActive).padStart(8));
  console.log("  "+"Registered users".padEnd(46)+f(usersTotal).padStart(8));
  console.log("  "+"Pro users".padEnd(46)+f(usersPro).padStart(8));
  console.log("  "+"User alerts (active)".padEnd(46)+f(alertsActive).padStart(8));
  console.log("  "+"Bookmarks".padEnd(46)+f(bookmarksTotal).padStart(8));
  console.log("  "+"Sitemap URLs".padEnd(46)+"N/A".padStart(8)+"    "+(web.sitemap?.ok?web.sitemap.urlCount+" URLs in sitemap":"✗ sitemap error"));
  console.log("  "+"RSS feed items".padEnd(46)+"N/A".padStart(8)+"    "+(web.rss?.ok?web.rss.items+" items in RSS":"✗ RSS error"));

  // ─── ISSUES SUMMARY ───────────────────────────────────────────────────────
  section("ISSUES & ANOMALIES DETECTED");
  const issues=[];
  if(!web.jobs?.ok)         issues.push("⚠  /api/jobs returns no JSON — listing is server-side rendered only");
  if(!web.tenders?.ok)      issues.push("⚠  /api/tenders returns no JSON — listing is server-side rendered only");
  if(!web.health?.ok)       issues.push("⚠  /api/health returned status "+web.health?.status+" — check app health");
  if(!web.sitemap?.ok)      issues.push("⚠  /sitemap.xml error — SEO impact");
  if(!web.rss?.ok)          issues.push("⚠  /feed.xml error — RSS subscribers affected");
  if(!web.jobs_page?.ok)    issues.push("⚠  /jobs page is DOWN or erroring");
  if(!web.tenders_page?.ok) issues.push("⚠  /tenders page is DOWN or erroring");
  if(!web.guides_page?.ok)  issues.push("⚠  /guides page is DOWN or erroring");
  if(!web.salaries_page?.ok)issues.push("⚠  /salaries page is DOWN or erroring");
  if((jobsExpired||0)>0)    issues.push("⚠  "+jobsExpired+" active jobs have past deadlines — need deactivation");
  if(jobsNeedAI>0)          issues.push("ℹ  "+jobsNeedAI+" jobs are pending AI extraction (needs_ai_extraction=true)");
  if(jobsNoEmp>0)           issues.push("ℹ  "+jobsNoEmp+" aggregator jobs still lack a direct employer_url");
  if((tendExpired||0)>0)    issues.push("⚠  "+tendExpired+" open tenders have past deadlines — should be marked 'closed'");
  if(compNoSrc>0)           issues.push("ℹ  "+compNoSrc+" compliance requirements are missing source_url");
  if(guidesPub<guidesTotal) issues.push("ℹ  "+(guidesTotal-guidesPub)+" guides exist but are NOT published (is_published=false)");
  if(usersSent<usersTotal)  issues.push("ℹ  "+(usersTotal-usersSent)+" users have not yet received a welcome email");
  if(salTotal===0)          issues.push("ℹ  Salary submissions table is EMPTY — no crowdsourced salary data yet");
  if(healthInds===0)        issues.push("ℹ  Health indicators table is empty");
  if(issues.length===0)     issues.push("✓  No major issues detected");
  issues.forEach(i=>console.log("  "+i));

  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  section("AUDIT COMPLETE — "+elapsed+"s");
}

main().catch(e=>{console.error("Fatal:",e.message||e);process.exit(1);});
