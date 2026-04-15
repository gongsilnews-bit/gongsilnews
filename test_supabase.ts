import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

async function test() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
     console.log("No env"); return;
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
