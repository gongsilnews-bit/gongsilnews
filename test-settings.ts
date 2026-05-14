import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkSettings() {
  const { data, error } = await supabase.from('agent_settings').select('*');
  console.log("Settings:", JSON.stringify(data, null, 2));
}
checkSettings();
