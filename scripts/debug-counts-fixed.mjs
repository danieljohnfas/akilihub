import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data: countries } = await sb.from('countries').select('id, name, code');
  
  for (const c of countries) {
    const { count } = await sb.from('jobs').select('id', { count: 'exact', head: true }).eq('country_id', c.id);
    console.log(`${c.code} (${c.name}): ${count} jobs`);
  }
}
main();
