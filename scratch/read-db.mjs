import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".", ".env.local") });

const ADMIN_EMAIL = "gongsilnews@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data, error } = await supabase
    .from('members')
    .select('sns_links')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  console.log("sns_links in DB:", JSON.stringify(data.sns_links, null, 2));
}

main().catch(console.error);
