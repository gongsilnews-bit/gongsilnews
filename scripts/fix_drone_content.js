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

async function run() {
  console.log('Fetching drone posts to fix content formatting...');
  const { data: posts, error } = await supabase.from('board_posts').select('id, title, content').eq('board_id', 'drone');
  
  if (error) {
    console.error('Failed to fetch posts:', error);
    return;
  }

  let updated = 0;
  for (const post of posts) {
    let cleanTitle = post.title.replace(/\[.*?\]/g, '').replace(/\.mp4/gi, '').trim();
    if (cleanTitle.startsWith('서울 ')) {
      cleanTitle = cleanTitle.substring(3).trim(); 
    }
    
    const keywords = post.title
        .replace(/\[.*?\]/g, '')
        .trim()
        .split(/\s+/)
        .map(w => `#${w}`)
        .join(' ');
      
    // Use plain text with newlines (\n) instead of HTML tags
    const newContent = `${keywords}\n\n공실뉴스 부동산만 사용하실 수 있습니다. # 재배포 # 불법사용 금지!\n\nCopyright © 공실뉴스. All rights reserved.`;
    
    // Only update if it contains HTML
    if (post.content && post.content.includes('<p>')) {
      const { error: updErr } = await supabase.from('board_posts').update({ content: newContent }).eq('id', post.id);
      if (updErr) console.error('Failed to update:', post.id);
      else updated++;
    }
  }

  console.log(`Successfully fixed content for ${updated} drone posts!`);
}

run();
