import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
  const { data, error } = await supabase
    .from("vacancies")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching vacancies column names:", error);
  } else if (data && data.length > 0) {
    console.log("Vacancies columns:", Object.keys(data[0]));
  } else {
    console.log("No data returned or vacancies table is empty, trying to query schema from information_schema...");
  }
}

inspect();
