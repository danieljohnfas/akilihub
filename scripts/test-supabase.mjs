import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pywienffahvmylssnorr.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d2llbmZmYWh2bXlsc3Nub3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg5Mzk5MywiZXhwIjoyMDk4NDY5OTkzfQ.KodqDQCzp4WruUhq8IbBu_eL5HkPESsJilsLGIgUTc0";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log("Testing Supabase JS client (REST over HTTPS)...\n");

// Test basic query
const { data, error } = await supabase.from("jobs").select("count", { count: "exact", head: true });
if (error) {
  console.log("jobs count error:", error.message, error.code, error.details);
} else {
  console.log("✓ Jobs count:", data);
}

// Test countries
const { data: countries, error: ce } = await supabase.from("countries").select("name, code").order("name");
if (ce) console.log("countries error:", ce.message);
else console.log("✓ Countries:", countries.map(c => "["+c.code+"] "+c.name).join(", "));

await supabase.auth.signOut().catch(()=>{});
