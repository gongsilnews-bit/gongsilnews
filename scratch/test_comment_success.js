const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: vdata } = await supabase.from('vacancies').select('id').limit(1);
  const { data: mdata } = await supabase.from('members').select('id, name').limit(1);
  
  const insertRes = await supabase.from('vacancy_comments').insert({
    vacancy_id: vdata[0]?.id,
    author_id: mdata[0]?.id,
    author_name: mdata[0]?.name || "Test",
    content: "Test comment",
    is_secret: false
  }).select();
  
  console.log("Insert result:", insertRes.error || insertRes.data);
}
check();
