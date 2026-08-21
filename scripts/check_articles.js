const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) {
    env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, count, error } = await supabase
    .from('articles')
    .select('id, section1, section2, status', { count: 'exact' });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total articles count in DB:', count);
  const s1 = {};
  const s2 = {};
  data.forEach(a => {
    s1[a.section1] = (s1[a.section1] || 0) + 1;
    s2[a.section2] = (s2[a.section2] || 0) + 1;
  });
  console.log('Section1 counts:', s1);
  console.log('Section2 counts:', s2);
}

check();
