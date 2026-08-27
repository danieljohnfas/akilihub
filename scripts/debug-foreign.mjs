import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data: countries } = await sb.from('countries').select('id, name');
  const cMap = {};
  countries.forEach(c => cMap[c.id] = c.name);

  // Get jobs containing 'Senegal' or 'Nigeria' in the title or description
  const { data: jobs, error } = await sb.from('jobs')
    .select('title, country_id')
    .ilike('title', '%Nigeria%')
    .limit(10);
    
  console.log("Jobs with Nigeria in title:", jobs.map(j => `${j.title} (Country: ${cMap[j.country_id] || j.country_id})`));
}
main();
