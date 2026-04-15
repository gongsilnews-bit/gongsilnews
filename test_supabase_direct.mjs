import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpamZrdHpxdG53aGZvdGZ3Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4ODY3NywiZXhwIjoyMDkxMjY0Njc3fQ.LAjlpvT8Tl6QZ9Ja3A-388FE9fZxtTOxC0otjRDq_yM";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, agencies(name, phone)), vacancy_photos(url, sort_order)')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Direct Error:", error);
  } else {
    console.log("Direct Success:", data.length);
  }
}
test();
