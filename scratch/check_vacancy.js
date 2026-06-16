require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing DB credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testSelect() {
  const { data, error } = await supabase
      .from('vacancies')
      .select('id, property_type, sub_category, trade_type, metadata, created_at')
      .eq('sub_category', '토지')
      .order('created_at', { ascending: false })
      .limit(5);

  if (error) {
    console.error("SUPABASE ERROR:", error.message);
  } else {
    console.log("SUCCESS!", JSON.stringify(data, null, 2));
  }
}

testSelect();
