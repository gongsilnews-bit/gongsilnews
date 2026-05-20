import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase
    .from("vacancies")
    .select("id, building_name, status")
    .limit(10);

  if (error) {
    console.error("Error fetching vacancies:", error);
  } else {
    console.log("Existing Vacancies in Supabase:", data);
  }
}

check();
