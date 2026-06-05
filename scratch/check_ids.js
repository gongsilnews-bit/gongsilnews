const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const dotenvVars = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  if (line.includes('=')) {
    const parts = line.split('=');
    acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(dotenvVars.NEXT_PUBLIC_SUPABASE_URL, dotenvVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: v } = await supabase.from('vacancies').select('id').limit(1);
  if (v && v.length > 0) {
    console.log('Vacancy ID:', v[0].id, 'Type:', typeof v[0].id);
  } else {
    console.log('No vacancies found');
  }

  const { data: a } = await supabase.from('articles').select('id').limit(1);
  if (a && a.length > 0) {
    console.log('Article ID:', a[0].id, 'Type:', typeof a[0].id);
  } else {
    console.log('No articles found');
  }
}

check();
