import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTables() {
  const { data, error } = await supabase.from('site_config').select('*').limit(1);
  console.log("site_config:", data ? "exists" : "not found");
  
  const { data: d2, error: e2 } = await supabase.from('agent_settings').select('*').limit(1);
  console.log("agent_settings:", d2 ? "exists" : "not found");
}
checkTables();
