const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('*, members!vacancies_owner_id_fkey(name, email, role, phone, agency_name), vacancy_photos(url, sort_order)')
    .order('created_at', { ascending: false })
    .eq('owner_id', 'bc81fa3c-88eb-4a5b-b515-3f14bf7ed7db');
    
  if (error) console.error("Error:", error);
  else console.log("Success! Data length:", data.length);
}
run();
