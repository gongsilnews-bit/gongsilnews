import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from("banners").select("*").limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    // try to insert an empty record to get schema error, or it just works
    console.log("No data, trying to get schema via RPC or rest");
    const { error: e2 } = await supabase.from("banners").select("target_categories").limit(1);
    if (e2) console.log("target_categories column does NOT exist");
    else console.log("target_categories column EXISTS");
  }
}
check();
