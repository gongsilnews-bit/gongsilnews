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

async function deleteDroneYoutubeLinks() {
  console.log('Fetching drone posts...');
  
  // Get all posts in drone board
  const { data, error } = await supabase
    .from('board_posts')
    .select('id, title, youtube_url')
    .eq('board_id', 'drone');

  if (error) {
    console.error('Error fetching drone posts:', error);
    return;
  }

  const postsWithYoutube = data.filter(p => p.youtube_url && p.youtube_url.trim() !== '');

  console.log(`Found ${data.length} total drone posts. ${postsWithYoutube.length} of them have youtube_urls.`);

  if (postsWithYoutube.length === 0) {
    console.log('No youtube links to delete.');
    return;
  }

  const idsToUpdate = postsWithYoutube.map(p => p.id);

  console.log(`Deleting youtube links for ${idsToUpdate.length} posts...`);
  
  const { error: updateError } = await supabase
    .from('board_posts')
    .update({ youtube_url: null })
    .in('id', idsToUpdate);

  if (updateError) {
    console.error('Error updating posts:', updateError);
  } else {
    console.log(`Successfully deleted youtube links for ${idsToUpdate.length} posts.`);
  }
}

deleteDroneYoutubeLinks();
