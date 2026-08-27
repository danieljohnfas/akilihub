import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const foreignCountries = [
    'Senegal', 'Nigeria', 'Ghana', 'Malawi', 'Cameroon', 'Eritrea', 
    'Madagascar', 'Angola', 'Zambia', 'Mozambique', 'Zimbabwe', 
    'South Africa', 'Egypt', 'Chad', 'Central African Republic', 'Djibouti', 'Sudan'
  ];
  
  let totalDeactivated = 0;
  
  for (const fCountry of foreignCountries) {
    const { data: jobs, error } = await sb.from('jobs')
      .select('id, title')
      .ilike('title', `%${fCountry}%`)
      .eq('is_active', true);
      
    if (jobs && jobs.length > 0) {
      console.log(`Found ${jobs.length} jobs for ${fCountry}`);
      
      const ids = jobs.map(j => j.id);
      await sb.from('jobs').update({ is_active: false }).in('id', ids);
      totalDeactivated += jobs.length;
    }
  }
  
  // Also check description for exact whole-word matches of these countries, but maybe that's too aggressive.
  // We'll stick to titles for now as that's where the obvious ones are.
  
  console.log(`Deactivated ${totalDeactivated} foreign jobs.`);
}
main();
