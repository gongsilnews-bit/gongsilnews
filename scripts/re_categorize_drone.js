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

function classify(title) {
  if (title.includes('아파트') || title.includes('파크') || title.includes('푸르지오') || title.includes('래미안') || title.includes('자이') || title.includes('힐스테이트')) return '아파트';
  if (title.includes('빌라') || title.includes('다가구') || title.includes('단독') || title.includes('주택')) return '단독/다가구/빌라';
  if (title.includes('빌딩') || title.includes('타워') || title.includes('센터') || title.includes('사옥') || title.includes('플라자') || title.includes('타운')) return '빌딩';
  if (title.includes('도로') || title.includes('사거리') || title.includes('대로') || title.includes('터널') || title.includes('톨게이트') || title.includes('나들목') || title.includes('IC') || title.includes('JC')) return '도로';
  return '드론';
}

async function run() {
  console.log('Fetching board details...');
  
  // 1. Update the tabs (categories) for 'drone' board in 'boards' table
  const newCategories = '드론,아파트,빌딩,단독/다가구/빌라,도로';
  const { error: boardErr } = await supabase.from('boards').update({ categories: newCategories }).eq('board_id', 'drone');
  if (boardErr) {
    console.error('Failed to update board categories:', boardErr);
  } else {
    console.log('Successfully updated board tabs to:', newCategories);
  }

  // 2. Fetch all posts in drone board
  const { data: posts, error } = await supabase.from('board_posts').select('id, title').eq('board_id', 'drone');
  if (error) {
    console.error('Failed to fetch posts:', error);
    return;
  }

  let updated = 0;
  for (const post of posts) {
    // Remove the previous [category] if it exists
    let cleanTitle = post.title.replace(/^\[.*?\]\s*/, '').trim();
    
    // Classify based on the contents of the clean title
    const newCat = classify(cleanTitle);
    
    // Create new title with new category
    const newTitle = `[${newCat}] ${cleanTitle}`;
    
    // Update if different
    if (post.title !== newTitle) {
      const { error: updErr } = await supabase.from('board_posts').update({ title: newTitle }).eq('id', post.id);
      if (updErr) {
        console.error('Failed to update post:', post.id, updErr);
      } else {
        updated++;
      }
    }
  }

  console.log(`Successfully re-categorized ${updated} drone posts!`);
}

run();
