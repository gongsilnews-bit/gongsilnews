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
    .select("id, building_name, infrastructure")
    .eq("id", "218510fa-5888-4e39-958d-4368bf1193d4")
    .single();

  if (error) {
    console.error("Error fetching vacancy:", error);
  } else {
    console.log("Vacancy infrastructure:", JSON.stringify(data.infrastructure, null, 2));
  }
}

check();
