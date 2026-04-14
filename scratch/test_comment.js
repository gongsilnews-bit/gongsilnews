const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('vacancies').select('id').limit(1);
  console.log("Vacancies id type:", typeof data[0]?.id, data[0]?.id);
  
  const insertRes = await supabase.from('vacancy_comments').insert({
    vacancy_id: data[0]?.id,
    author_id: "00000000-0000-0000-0000-000000000000",
    author_name: "Test",
    content: "Test comment",
    is_secret: false
  }).select();
  
  console.log("Insert result:", insertRes.error || insertRes.data);
}
check();
