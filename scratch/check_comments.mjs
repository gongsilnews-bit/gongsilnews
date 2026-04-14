import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig('C:\\Users\\user\\Desktop\\gongsilnews');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('vacancy_comments').select('*').limit(1);
  console.log("Table check error:", error);
  console.log("Data:", data);
}
check();
