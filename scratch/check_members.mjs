import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase
    .from("members")
    .select("id, email, name, role")
    .limit(5);

  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log("Sample Members:", data);
  }
}

check();
