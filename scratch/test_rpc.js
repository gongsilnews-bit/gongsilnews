const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceKey);

async function testRpc() {
  const rpcs = ['exec_sql', 'exec', 'execute_sql', 'sql', 'run_sql'];
  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc, { query: 'SELECT 1;' });
    if (!error) {
      console.log(`RPC [${rpc}]: Available!`);
    } else {
      console.log(`RPC [${rpc}]: ${error.message}`);
    }
  }
}

testRpc();
