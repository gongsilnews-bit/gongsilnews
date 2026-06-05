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

async function test() {
  console.log("Testing execute_sql RPC...");
  const { data: d1, error: e1 } = await supabase.rpc('execute_sql', { sql: 'SELECT 1' });
  console.log('d1:', d1, 'e1:', e1?.message);

  console.log("Testing run_sql RPC...");
  const { data: d2, error: e2 } = await supabase.rpc('run_sql', { sql: 'SELECT 1' });
  console.log('d2:', d2, 'e2:', e2?.message);
}

test();
