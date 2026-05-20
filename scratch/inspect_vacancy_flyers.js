import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase
    .from("vacancy_flyers")
    .select("*")
    .limit(1);

  if (error) {
    console.log("Table vacancy_flyers does not exist or error occurred:", error.message);
  } else {
    console.log("Table vacancy_flyers exists! Columns:", data.length > 0 ? Object.keys(data[0]) : "Empty table");
  }
}

check();
