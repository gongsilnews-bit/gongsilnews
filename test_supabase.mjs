import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
