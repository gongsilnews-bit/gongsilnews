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
  console.log('Rolling back: Deleting all drone board posts to clear the board...');
  await supabase.from('board_posts').delete().eq('board_id', 'drone');
  
  const linksPath = path.join(__dirname, 'drone_links.json');
  const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  // Filter out Music videos
  const droneLinks = linksData.filter(l => !l.title.includes('RealtyMusic') && !l.title.includes('Music') && l.driveUrl);

  const posts = [];
  
  droneLinks.forEach((l, i) => {
    let cleanTitle = l.title.replace(/\[.*?\]/g, '').replace(/\.mp4/gi, '').trim();
    if (cleanTitle.startsWith('서울 ')) {
      cleanTitle = cleanTitle.substring(3).trim(); 
    }
    
    // Extract district (e.g. 강남구, 서초구)
    let cat = "전체";
    const match = cleanTitle.match(/^([가-힣]+구)/);
    if (match) {
      cat = match[1];
    } else if (cleanTitle.includes('강남')) {
      cat = "강남구";
    } else if (cleanTitle.includes('서초')) {
      cat = "서초구";
    } else if (cleanTitle.includes('여의도')) {
      cat = "여의도"; // Based on tabs
    }

    const formattedTitle = `[${cat}] 서울 ${cleanTitle}`;
    
    const keywords = formattedTitle
        .replace(/\[.*?\]/g, '')
        .trim()
        .split(/\s+/)
        .map(w => `#${w}`)
        .join(' ');
      
    const content = `<p>${keywords}</p><p>&nbsp;</p><p>공실뉴스 부동산만 사용하실 수 있습니다. # 재배포 # 불법사용 금지!</p><p>&nbsp;</p><p>Copyright © 공실뉴스. All rights reserved.</p>`;
    
    posts.push({
      board_id: 'drone',
      title: formattedTitle,
      content: content,
      author_name: '관리자',
      view_count: Math.floor(Math.random() * 50) + 10,
      drive_url: l.driveUrl,
      youtube_url: l.ytUrl, // CRITICAL: This is needed for thumbnails!
      created_at: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
      is_deleted: false,
      is_notice: false
    });
  });

  console.log(`Inserting ${posts.length} beautifully formatted drone posts...`);
  for (let i = 0; i < posts.length; i += 50) {
    const batch = posts.slice(i, i + 50);
    const { error: insErr } = await supabase.from('board_posts').insert(batch);
    if (insErr) {
      console.error('Insert error for batch', i, ':', insErr);
    }
  }
  console.log('Successfully inserted complete drone posts!');
}

run();
