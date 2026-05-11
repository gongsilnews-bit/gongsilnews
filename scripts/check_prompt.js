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

async function checkPromptPosts() {
  const { data, error } = await supabase
    .from('board_posts')
    .select('id, title, created_at')
    .eq('board_id', 'prompt')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching posts:', error);
  } else {
    console.log(`Found ${data.length} posts in prompt board:`);
    data.forEach((p, idx) => {
      console.log(`${idx + 1}. [${p.id}] ${p.title}`);
    });
  }
}

checkPromptPosts();
