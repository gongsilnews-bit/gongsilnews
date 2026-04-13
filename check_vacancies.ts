import { createClient } from "@supabase/supabase-js"
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase.from('vacancies').select('id, lat, lng, display_status, status, expose_status, exposure_type');
  console.log(data);
}
check();
