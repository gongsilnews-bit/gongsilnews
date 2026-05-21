import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpamZrdHpxdG53aGZvdGZ3Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4ODY3NywiZXhwIjoyMDkxMjY0Njc3fQ.LAjlpvT8Tl6QZ9Ja3A-388FE9fZxtTOxC0otjRDq_yM";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*')
    .limit(1);

  if (error) {
    console.log("Error:", error.message);
  } else if (data && data.length > 0) {
    console.log("Vacancy Row Example:", Object.keys(data[0]));
    console.log("ID field value:", data[0].id, "Type of ID:", typeof data[0].id);
  } else {
    console.log("No vacancies found!");
  }
}

check();
