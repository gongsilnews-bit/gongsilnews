import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function update() {
  const { data, error } = await supabase
    .from("vacancies")
    .update({ status: "ACTIVE" })
    .eq("id", "218510fa-5888-4e39-958d-4368bf1193d4")
    .select();

  if (error) {
    console.error("Error activating vacancy:", error);
  } else {
    console.log("Vacancy activated successfully!", data);
  }
}

update();
