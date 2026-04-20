const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envText.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
  const { data, error } = await supabase.from('board_posts').select('*').limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log('Keys:', Object.keys(data[0]));
    console.log('Sample Data:');
    console.log({
       id: data[0].id,
       post_no: data[0].post_no,
       board_id: data[0].board_id
    });
  }

  // Get max post_no for drone board? Wait, maybe post_no is global or per board
  const { data: maxPost } = await supabase
    .from('board_posts')
    .select('post_no')
    .order('post_no', { ascending: false })
    .limit(1);
  console.log('Max post_no in all boards:', maxPost && maxPost.length > 0 ? maxPost[0].post_no : 'undefined');

  const { data: maxPostDrone } = await supabase
    .from('board_posts')
    .select('post_no')
    .eq('board_id', 'drone')
    .order('post_no', { ascending: false })
    .limit(1);
  console.log('Max post_no in drone board:', maxPostDrone && maxPostDrone.length > 0 ? maxPostDrone[0].post_no : 'undefined');
}
checkCols();
