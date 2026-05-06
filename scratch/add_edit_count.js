const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Try adding column via SQL RPC
  const { error } = await s.rpc('exec_sql', {
    query: 'ALTER TABLE articles ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0'
  });
  
  if (error) {
    console.log('RPC failed:', error.message);
    console.log('Please run this SQL manually in Supabase Dashboard > SQL Editor:');
    console.log('ALTER TABLE articles ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;');
  } else {
    console.log('Column added successfully!');
  }
  
  // Verify
  const { data, error: verifyError } = await s.from('articles').select('edit_count').limit(1);
  if (verifyError) {
    console.log('Verify failed:', verifyError.message);
  } else {
    console.log('Verify OK:', data);
  }
}

main();
