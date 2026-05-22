import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const email = "gongsilmarketing@gmail.com";
  console.log(`Searching for member with email: ${email}`);
  
  const { data: member, error: memberErr } = await supabase
    .from("members")
    .select("id, name, email, role")
    .eq("email", email)
    .single();
    
  if (memberErr || !member) {
    console.error("Error finding member:", memberErr || "Member not found");
    return;
  }
  
  console.log("Found member:", member);
  
  const { data: vacancies, error: vacErr } = await supabase
    .from("vacancies")
    .select("id, vacancy_no, status, created_at")
    .eq("owner_id", member.id);
    
  if (vacErr) {
    console.error("Error finding vacancies:", vacErr);
    return;
  }
  
  console.log(`Total vacancies found: ${vacancies.length}`);
  
  const counts = {};
  vacancies.forEach(v => {
    counts[v.status] = (counts[v.status] || 0) + 1;
  });
  
  console.log("Vacancy status distribution:", counts);
  console.log("Vacancies details:", vacancies);
}

run();
