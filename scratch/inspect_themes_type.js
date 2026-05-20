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
    .select("id, themes")
    .not("themes", "is", null)
    .limit(5);

  if (error) {
    console.error("Error fetching themes:", error);
  } else {
    console.log("Fetched rows with non-null themes:", data);
  }
}

inspect();
