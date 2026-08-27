import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data: jobCounts } = await sb.from('jobs').select('country_id');
  const counts = {};
  for (const j of jobCounts || []) {
    const cid = j.country_id === null ? 'NULL' : j.country_id;
    counts[cid] = (counts[cid] || 0) + 1;
  }
  console.log("All distinct country_ids in jobs table (from 1000 rows):", counts);
  
  const { data: totalNull } = await sb.from('jobs').select('id', { count: 'exact' }).is('country_id', null);
  console.log("Total jobs with NULL country_id:", totalNull.length);
}
main();
