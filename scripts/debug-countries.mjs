import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data: countries } = await sb.from('countries').select('*');
  console.log("Countries in DB:", countries.map(c => `${c.code}: ${c.name} (${c.id})`));

  const { data: jobCounts } = await sb.from('jobs').select('country_id');
  const counts = {};
  for (const j of jobCounts || []) {
    counts[j.country_id] = (counts[j.country_id] || 0) + 1;
  }
  console.log("Job counts by country_id:", counts);
}
main();
