const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = `
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_headline BOOLEAN DEFAULT false;
    UPDATE articles SET is_important = true WHERE article_type = 'IMPORTANT';
    UPDATE articles SET is_headline = true WHERE article_type = 'HEADLINE';
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.log("No exec_sql RPC, creating it...");
    // Fallback: Just print the SQL for the user to run if RPC fails
    console.log("Please run this SQL in Supabase:");
    console.log(query);
  } else {
    console.log("Migration successful", data);
  }
}
run();
