const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('members').select('id, email').limit(5);
  console.log("Members:", data);
  
  const authRes = await supabase.auth.admin.listUsers();
  console.log("Auth Users:", authRes.data.users.map(u => ({id: u.id, email: u.email})));
}
check();
