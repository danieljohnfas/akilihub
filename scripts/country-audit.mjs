import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const SITE = "https://akilibrain.com";

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function hr(c="─",n=72){return c.repeat(n);}
function section(t){console.log("\n"+hr("═")+"\n  "+t+"\n"+hr("═"));}
function sub(t){console.log("\n"+hr("─",60)+"\n  "+t+"\n"+hr("─",60));}
function row(l,v){console.log("  "+String(l).padEnd(46)+" "+v);}

async function fw(path, label="") {
  const url = SITE + path;
  try {
    const r = await fetch(url, {
      headers: {"User-Agent":"AkilihubCountryAudit/1.0","Accept":"text/html,application/json,*/*"},
      signal: AbortSignal.timeout(30000)
    });
    return {ok:r.ok, status:r.status, text:await r.text(), url};
  } catch(e) {
    return {ok:false, status:0, text:"", url, error:e.message};
  }
}

// All East African country names in various forms
const COUNTRIES = [
  { name:"Kenya",                  code:"KE", variants:["Kenya","Kenyan","Nairobi","KSh","KES"] },
  { name:"Tanzania",               code:"TZ", variants:["Tanzania","Tanzanian","Dar es Salaam","Dodoma","TZS"] },
  { name:"Uganda",                 code:"UG", variants:["Uganda","Ugandan","Kampala","UGX"] },
  { name:"Rwanda",                 code:"RW", variants:["Rwanda","Rwandan","Kigali","RWF"] },
  { name:"Ethiopia",               code:"ET", variants:["Ethiopia","Ethiopian","Addis Ababa","ETB"] },
  { name:"Somalia",                code:"SO", variants:["Somalia","Somali","Mogadishu","SOS"] },
  { name:"South Sudan",            code:"SS", variants:["South Sudan","South Sudanese","Juba","SSP"] },
  { name:"Democratic Republic of the Congo", code:"CD", variants:["Democratic Republic of the Congo","DRC","Congo","Kinshasa","CDF","Congolese"] },
  { name:"Burundi",                code:"BI", variants:["Burundi","Burundian","Bujumbura","BIF"] },
  // Neighbouring/mentioned-in-content countries
  { name:"Sudan",                  code:"SD", variants:["Sudan","Sudanese","Khartoum"] },
  { name:"Djibouti",               code:"DJ", variants:["Djibouti","Djiboutian"] },
  { name:"Eritrea",                code:"ER", variants:["Eritrea","Eritrean","Asmara"] },
  { name:"South Africa",           code:"ZA", variants:["South Africa","South African","Johannesburg","ZAR"] },
  { name:"Nigeria",                code:"NG", variants:["Nigeria","Nigerian","Lagos","NGN"] },
  { name:"Ghana",                  code:"GH", variants:["Ghana","Ghanaian","Accra","GHS"] },
  { name:"Egypt",                  code:"EG", variants:["Egypt","Egyptian","Cairo","EGP"] },
  { name:"Cameroon",               code:"CM", variants:["Cameroon","Cameroonian","Yaoundé","XAF"] },
  { name:"Senegal",                code:"SN", variants:["Senegal","Senegalese","Dakar"] },
  { name:"Zambia",                 code:"ZM", variants:["Zambia","Zambian","Lusaka","ZMW"] },
  { name:"Mozambique",             code:"MZ", variants:["Mozambique","Mozambican","Maputo","MZN"] },
  { name:"Malawi",                 code:"MW", variants:["Malawi","Malawian","Lilongwe","MWK"] },
  { name:"Zimbabwe",               code:"ZW", variants:["Zimbabwe","Zimbabwean","Harare","ZWL"] },
  { name:"Angola",                 code:"AO", variants:["Angola","Angolan","Luanda","AOA"] },
  { name:"Chad",                   code:"TD", variants:["Chad","Chadian","N'Djamena","XAF"] },
  { name:"Central African Republic",code:"CF",variants:["Central African Republic","CAR","Bangui"] },
  { name:"Madagascar",             code:"MG", variants:["Madagascar","Malagasy","Antananarivo","MGA"] },
];

function countMentions(text, variants) {
  let total = 0;
  const found = [];
  for (const v of variants) {
    const regex = new RegExp("\\b" + v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\b", "gi");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      total += matches.length;
      found.push(v + "×" + matches.length);
    }
  }
  return {total, found};
}

async function analyzePageForCountries(path, label) {
  const res = await fw(path);
  if (!res.ok) return {label, status:res.status, error:res.error||"non-200", mentions:{}};
  const text = res.text.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&#x27;/g,"'");
  const mentions = {};
  for (const c of COUNTRIES) {
    const r = countMentions(text, c.variants);
    if (r.total > 0) mentions[c.name] = {count:r.total, found:r.found, code:c.code};
  }
  return {label, path, status:res.status, size:res.text.length, mentions};
}

async function main() {
  const t0 = Date.now();
  section("AKILIHUB — COMPREHENSIVE COUNTRY COVERAGE AUDIT");
  console.log("  Run time: "+new Date().toISOString());

  // ── 1. DATABASE: Countries table ─────────────────────────────────────────
  section("1. DATABASE — countries TABLE");
  const {data:dbCountries, error:dce} = await sb.from("countries").select("*").order("name");
  if (dce) { console.error("  DB error:", dce.message); }
  else {
    row("Countries in DB:", dbCountries.length.toString());
    console.log("\n  Full list:");
    dbCountries.forEach(c=>console.log("    ["+c.code+"] "+c.name+"  (id: "+c.id+")  created: "+c.created_at.substring(0,10)));
  }

  // ── 2. DATABASE: Which countries have data in each table ─────────────────
  section("2. DATABASE — Country Coverage per Table");

  const tables = [
    { table:"jobs",                    label:"Jobs" },
    { table:"tenders",                 label:"Tenders" },
    { table:"salary_submissions",      label:"Salary Submissions" },
    { table:"compliance_requirements", label:"Compliance Requirements" },
    { table:"health_data_points",      label:"Health Data Points" },
    { table:"users",                   label:"Users" },
    { table:"regions",                 label:"Regions" },
  ];

  const tableResults = {};
  for (const t of tables) {
    const {data, error} = await sb.from(t.table).select("country_id, countries(name,code)").limit(5000);
    if (error) { console.log("  Error on "+t.table+": "+error.message); continue; }
    const byCountry = {};
    (data||[]).forEach(r => {
      const cn = r.countries ? "["+r.countries.code+"] "+r.countries.name : "(no country)";
      byCountry[cn] = (byCountry[cn]||0)+1;
    });
    tableResults[t.label] = byCountry;
    sub(t.label + " — countries with data");
    const sorted = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]);
    if (sorted.length === 0) console.log("  (empty)");
    sorted.forEach(([k,v])=>console.log("    "+k.padEnd(44)+" "+v+" records"));
    console.log("  Countries with data: "+sorted.length+"/"+dbCountries.length);
  }

  // ── 3. SITEMAP — Country URLs ─────────────────────────────────────────────
  section("3. WEBSITE — Sitemap Country Analysis");
  const smRes = await fw("/sitemap.xml");
  if (!smRes.ok) { console.log("  ✗ Sitemap error: "+smRes.status); }
  else {
    const allLocs = [...smRes.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    console.log("  Total sitemap URLs: "+allLocs.length);

    // Check which countries appear in sitemap URLs
    const sitemapCountryMentions = {};
    for (const c of COUNTRIES.slice(0,9)) { // only DB countries
      const regex = new RegExp(c.name.toLowerCase().replace(/ /g,"-")+"|-"+c.code.toLowerCase()+"/","gi");
      const matches = allLocs.filter(u=>u.toLowerCase().includes(c.name.toLowerCase().replace(/ /g,"-"))||u.includes("/"+c.code+"/"));
      if (matches.length > 0) sitemapCountryMentions[c.name] = matches.length;
    }

    // Parse country-specific jobs from sitemap
    sub("Jobs in sitemap by inferred country (URL pattern)");
    // Jobs URLs: /jobs/[slug] — check for country name in slug
    const jobUrls = allLocs.filter(u=>u.includes("/jobs/"));
    const tenderUrls = allLocs.filter(u=>u.includes("/tenders/"));
    const guideUrls = allLocs.filter(u=>u.includes("/guides/"));
    const compUrls = allLocs.filter(u=>u.includes("/compliance/"));
    row("Job URLs in sitemap:", jobUrls.length.toString());
    row("Tender URLs in sitemap:", tenderUrls.length.toString());
    row("Guide URLs in sitemap:", guideUrls.length.toString());
    row("Compliance URLs in sitemap:", compUrls.length.toString());

    // Country mentions in job slugs
    console.log("\n  Country name mentions in /jobs/ URL slugs:");
    for (const c of COUNTRIES.slice(0,9)) {
      const term = c.name.toLowerCase().replace(/\s+/g,"-");
      const matches = jobUrls.filter(u=>u.toLowerCase().includes(term));
      if (matches.length>0) console.log("    "+c.name.padEnd(38)+" "+matches.length+" job URLs");
    }
    console.log("\n  Country name mentions in /tenders/ URL slugs:");
    for (const c of COUNTRIES.slice(0,9)) {
      const term = c.name.toLowerCase().replace(/\s+/g,"-");
      const matches = tenderUrls.filter(u=>u.toLowerCase().includes(term));
      if (matches.length>0) console.log("    "+c.name.padEnd(38)+" "+matches.length+" tender URLs");
    }
    console.log("\n  Country name mentions in /guides/ URL slugs:");
    for (const c of COUNTRIES.slice(0,9)) {
      const term = c.name.toLowerCase().replace(/\s+/g,"-");
      const matches = guideUrls.filter(u=>u.toLowerCase().includes(term));
      if (matches.length>0) console.log("    "+c.name.padEnd(38)+" "+matches.length+" guide URLs");
    }
    console.log("\n  Country name mentions in /compliance/ URL slugs:");
    for (const c of COUNTRIES.slice(0,9)) {
      const term = c.name.toLowerCase().replace(/\s+/g,"-");
      const matches = compUrls.filter(u=>u.toLowerCase().includes(term));
      if (matches.length>0) console.log("    "+c.name.padEnd(38)+" "+matches.length+" compliance URLs");
    }

    // List ALL unique paths
    sub("Sample sitemap URLs per section (first 5 each)");
    console.log("  Jobs (first 5):");
    jobUrls.slice(0,5).forEach(u=>console.log("    "+u));
    console.log("  Tenders (first 5):");
    tenderUrls.slice(0,5).forEach(u=>console.log("    "+u));
    console.log("  Guides (first 5):");
    guideUrls.slice(0,5).forEach(u=>console.log("    "+u));
    console.log("  Compliance (first 5):");
    compUrls.slice(0,5).forEach(u=>console.log("    "+u));
  }

  // ── 4. LIVE PAGES — Country mentions ────────────────────────────────────
  section("4. WEBSITE — Country Mentions on Live Pages");

  const pagesToCheck = [
    { path:"/",           label:"Homepage" },
    { path:"/jobs",       label:"Jobs listing" },
    { path:"/tenders",    label:"Tenders listing" },
    { path:"/guides",     label:"Guides listing" },
    { path:"/salaries",   label:"Salaries page" },
    { path:"/compliance", label:"Compliance page" },
    { path:"/about",      label:"About page" },
    { path:"/feed.xml",   label:"RSS Feed" },
  ];

  const allPageResults = [];
  for (const pg of pagesToCheck) {
    console.log("\n  Checking: "+pg.label+" ("+pg.path+")...");
    const result = await analyzePageForCountries(pg.path, pg.label);
    allPageResults.push(result);

    if (result.error) { row("  Status:", result.status+" ERROR: "+result.error); continue; }
    row("  Status:", result.status+" ("+Math.round(result.size/1024)+"KB)");
    const mentions = Object.entries(result.mentions).sort((a,b)=>b[1].count-a[1].count);
    if (mentions.length === 0) { console.log("  No country mentions detected."); continue; }
    console.log("  Countries mentioned ("+mentions.length+" unique):");
    mentions.forEach(([name,data])=>{
      console.log("    ["+data.code+"] "+name.padEnd(38)+" "+data.count+"× ("+data.found.slice(0,4).join(", ")+")");
    });
  }

  // ── 5. CONSOLIDATION: Which countries appear WHERE ──────────────────────
  section("5. CONSOLIDATED — Country Presence Map");
  console.log("\n  Country                  | DB | Jobs | Tenders | Salaries | Compliance | Health | Users | Website pages");
  console.log("  "+"-".repeat(110));

  const dbCountryNames = (dbCountries||[]).map(c=>c.name);
  for (const c of COUNTRIES.slice(0,9)) {
    const inDB       = dbCountryNames.includes(c.name) ? "✓" : "✗";
    const inJobs     = tableResults["Jobs"]?.[`[${c.code}] ${c.name}`]>0 ? "✓" : "✗";
    const inTenders  = tableResults["Tenders"]?.[`[${c.code}] ${c.name}`]>0 ? "✓" : "✗";
    const inSalaries = tableResults["Salary Submissions"]?.[`[${c.code}] ${c.name}`]>0 ? "✓" : "✗";
    const inComp     = tableResults["Compliance Requirements"]?.[`[${c.code}] ${c.name}`]>0 ? "✓" : "✗";
    const inHealth   = tableResults["Health Data Points"]?.[`[${c.code}] ${c.name}`]>0 ? "✓" : "✗";
    const inUsers    = tableResults["Users"]?.[`[${c.code}] ${c.name}`]>0 ? "✓" : "✗";

    // Count page mentions
    let pageMentions = 0;
    for (const pr of allPageResults) {
      if (pr.mentions && pr.mentions[c.name]) pageMentions++;
    }

    console.log("  ["+c.code+"] "+c.name.padEnd(24)+
      "| "+inDB+" | "+inJobs.padEnd(4)+" | "+inTenders.padEnd(7)+" | "+
      inSalaries.padEnd(8)+" | "+inComp.padEnd(10)+" | "+inHealth.padEnd(6)+" | "+
      inUsers.padEnd(5)+" | "+pageMentions+"/"+pagesToCheck.length+" pages");
  }

  // ── 6. NON-DB COUNTRIES mentioned on website ────────────────────────────
  section("6. OTHER (non-DB) Countries Mentioned on Website");
  console.log("  Checking whether any other countries appear in website content...\n");

  const allPagesText = allPageResults.map(p=>p.mentions||{});
  const nonDbCountries = COUNTRIES.slice(9); // everything after the 9 EA countries
  const foundNonDb = [];
  for (const c of nonDbCountries) {
    let total = 0;
    for (const pg of allPageResults) {
      if (pg.mentions && pg.mentions[c.name]) total += pg.mentions[c.name].count;
    }
    if (total > 0) foundNonDb.push({name:c.name, code:c.code, total});
  }
  if (foundNonDb.length === 0) {
    console.log("  ✓ No non-DB countries detected in website content.");
  } else {
    foundNonDb.sort((a,b)=>b.total-a.total).forEach(c=>{
      console.log("  ["+c.code+"] "+c.name.padEnd(34)+" "+c.total+"× across pages");
    });
  }

  // ── 7. SOURCE CODE — hardcoded country references ───────────────────────
  section("7. SOURCE CODE — Country References Check");
  console.log("  Checking live pages for UI labels like dropdowns, filters, headings...");

  // Check homepage specifically for nav/filter country options
  const homeRes = await fw("/");
  if (homeRes.ok) {
    const homeText = homeRes.text;
    // Look for select/option patterns, links with country names
    const optionMatches = homeText.match(/option[^>]*>([^<]{3,30})<\/option>/gi)||[];
    const countryOptions = optionMatches.filter(opt=>
      COUNTRIES.some(c=>c.variants.some(v=>opt.toLowerCase().includes(v.toLowerCase())))
    );
    if (countryOptions.length>0) {
      console.log("  Country <option> tags found on homepage:");
      countryOptions.slice(0,20).forEach(o=>console.log("    "+o.replace(/<[^>]+>/g,"").trim()));
    } else {
      console.log("  No <option> country tags on homepage (likely uses JS rendering).");
    }

    // Check for country filter links
    const linkMatches = [...homeText.matchAll(/href="([^"]*(?:kenya|tanzania|uganda|rwanda|ethiopia|somalia|south-sudan|congo|burundi)[^"]*)"/gi)];
    if (linkMatches.length>0) {
      console.log("\n  Country-specific href links on homepage:");
      [...new Set(linkMatches.map(m=>m[1]))].slice(0,15).forEach(l=>console.log("    "+l));
    }
  }

  // Check jobs page for filter country links
  const jobsRes = await fw("/jobs");
  if (jobsRes.ok) {
    const linkMatches = [...jobsRes.text.matchAll(/href="([^"]*(?:kenya|tanzania|uganda|rwanda|ethiopia|somalia|south-sudan|congo|burundi)[^"]*)"/gi)];
    const uniqueLinks = [...new Set(linkMatches.map(m=>m[1]))];
    if (uniqueLinks.length>0) {
      sub("Country-specific href links on /jobs page ("+uniqueLinks.length+" unique)");
      uniqueLinks.slice(0,30).forEach(l=>console.log("    "+l));
    }

    // Count select options mentioning countries
    const selectOpts = jobsRes.text.match(/>([A-Z][a-z]+ ?(?:[A-Z][a-z]+)?)</g)||[];
    const countryOpts = [...new Set(selectOpts.filter(o=>
      COUNTRIES.some(c=>c.name.toLowerCase()===o.replace(/[><]/g,"").trim().toLowerCase())
    ))];
    if (countryOpts.length>0) {
      console.log("  Country labels in HTML on /jobs:");
      countryOpts.forEach(o=>console.log("    "+o.replace(/[><]/g,"").trim()));
    }
  }

  // ── 8. RSS Feed countries ────────────────────────────────────────────────
  section("8. RSS FEED — Country Coverage");
  const rssRes = await fw("/feed.xml");
  if (rssRes.ok) {
    const items = [...rssRes.text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>m[1]);
    console.log("  Total RSS items: "+items.length);
    const rssCountryCounts = {};
    for (const item of items) {
      const text = item.replace(/<[^>]+>/g," ");
      for (const c of COUNTRIES.slice(0,9)) {
        const r = countMentions(text, c.variants);
        if (r.total>0) rssCountryCounts[c.name]=(rssCountryCounts[c.name]||0)+r.total;
      }
    }
    console.log("  Country mentions in RSS items:");
    Object.entries(rssCountryCounts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>
      console.log("    "+k.padEnd(38)+" "+v+"×"));
  }

  // ── Final Summary ────────────────────────────────────────────────────────
  section("FINAL SUMMARY");
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  console.log("  DB countries (official):        9");
  console.log("  Countries with jobs data:       "+Object.keys(tableResults["Jobs"]||{}).filter(k=>k!=="(no country)").length);
  console.log("  Countries with tender data:     "+Object.keys(tableResults["Tenders"]||{}).filter(k=>k!=="(no country)").length);
  console.log("  Countries with salary data:     "+Object.keys(tableResults["Salary Submissions"]||{}).filter(k=>k!=="(no country)").length);
  console.log("  Countries with compliance data: "+Object.keys(tableResults["Compliance Requirements"]||{}).filter(k=>k!=="(no country)").length);
  console.log("  Countries with health data:     "+Object.keys(tableResults["Health Data Points"]||{}).filter(k=>k!=="(no country)").length);
  console.log("  Countries with user signups:    "+Object.keys(tableResults["Users"]||{}).filter(k=>k!=="(no country)").length);
  console.log("  Non-DB countries on website:    "+foundNonDb.length);
  console.log("\n  Completed in "+elapsed+"s");
}

main().catch(e=>{console.error("Fatal:",e.message||e);process.exit(1);});
