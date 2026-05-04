const fs = require('fs');
const dotenvVars = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  if (line.includes('=')) {
    const parts = line.split('=');
    acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(dotenvVars.NEXT_PUBLIC_SUPABASE_URL, dotenvVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('members').select('*').limit(1);
  if (data && data.length > 0) {
      console.log('members columns:', Object.keys(data[0]));
  }
}

check();
