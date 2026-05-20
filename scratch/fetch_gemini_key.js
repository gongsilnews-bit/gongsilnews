const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Read .env.local in root
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceKey) {
  console.error("Supabase credentials not found in root .env.local!");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_EMAIL = "gongsilnews@gmail.com";

async function main() {
  console.log("Fetching Gemini API key from DB...");
  const { data: adminUser, error } = await supabaseAdmin
    .from('members')
    .select('sns_links')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (error) {
    console.error("DB query failed:", error);
    process.exit(1);
  }

  const apiList = adminUser?.sns_links?.api_list || [];
  const geminiApi = apiList.find((api) => 
    api.provider === "구글 (Gemini)" || api.provider === "구글"
  );

  if (!geminiApi || !geminiApi.key_value) {
    console.error("Gemini API key not found in admin's sns_links.api_list!");
    process.exit(1);
  }

  const apiKey = geminiApi.key_value.trim();
  console.log("Found Gemini API key in DB! Writing to marketing/apartment/.env.local...");

  const targetEnvPath = path.join(__dirname, '../marketing/apartment/.env.local');
  fs.writeFileSync(targetEnvPath, `GEMINI_API_KEY=${apiKey}\n`, 'utf8');
  console.log("Success! .env.local created successfully in marketing/apartment/.");
}

main();
