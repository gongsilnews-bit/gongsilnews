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

async function deletePromptPosts() {
  // Get all posts ordered by created_at ascending
  const { data, error } = await supabase
    .from('board_posts')
    .select('id, title')
    .eq('board_id', 'prompt')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  // Slice first 23 posts
  const postsToDelete = data.slice(0, 23);
  const idsToDelete = postsToDelete.map(p => p.id);

  console.log(`Deleting ${idsToDelete.length} posts...`);
  
  const { error: deleteError } = await supabase
    .from('board_posts')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting posts:', deleteError);
  } else {
    console.log(`Successfully deleted ${idsToDelete.length} posts.`);
    postsToDelete.forEach((p, idx) => {
      console.log(`Deleted: [${idx + 1}] ${p.title}`);
    });
  }
}

deletePromptPosts();
