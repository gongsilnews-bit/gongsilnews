import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpamZrdHpxdG53aGZvdGZ3Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4ODY3NywiZXhwIjoyMDkxMjY0Njc3fQ.LAjlpvT8Tl6QZ9Ja3A-388FE9fZxtTOxC0otjRDq_yM";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLocalAdmins() {
  const { data, error } = await supabase.from('members').select('id, email, name, role').order('created_at', { ascending: false }).limit(5);
  console.log("최근 가입자 5명:", JSON.stringify(data, null, 2));
}
checkLocalAdmins();
