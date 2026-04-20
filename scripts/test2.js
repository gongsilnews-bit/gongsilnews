const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const envText = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envText.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
});
const supabase = createClient(supabaseUrl, supabaseKey);
supabase.from('board_posts').select('id, title, external_url').in('board_id', ['drone', 'bbs_3']).limit(3).then(({data}) => {
  console.log(JSON.stringify(data, null, 2));
});
