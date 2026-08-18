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

async function checkCols() {
  const { data: drafts } = await supabase.from('ai_drafts').select('*').limit(1);
  console.log("ai_drafts sample:", drafts);

  const { data: flyers } = await supabase.from('vacancy_flyers').select('*').limit(1);
  console.log("vacancy_flyers sample:", flyers);
}

checkCols();
