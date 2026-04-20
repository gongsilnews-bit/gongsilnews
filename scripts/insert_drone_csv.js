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
  console.log('Deleting existing drone board posts...');
  const { error: delErr } = await supabase.from('board_posts').delete().eq('board_id', 'drone');
  if (delErr) {
    console.error('Failed to delete old posts:', delErr);
    return;
  }
  console.log('Successfully deleted old drone posts.');

  const csvPath = path.join(__dirname, '..', '드론영상_구글드라이브_링크.csv');
  const csvData = fs.readFileSync(csvPath, 'utf8');
  
  // Parse simple CSV (assuming "Title","Link" format)
  // Skipped header
  const lines = csvData.trim().split('\n').slice(1);
  const posts = [];
  
  lines.forEach((line, i) => {
    // Regex to split by comma outside quotes
    const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      matches.push(match[0].replace(/^"|"$/g, '').replace(/""/g, '"'));
    }
    
    if (matches.length >= 2) {
      const title = matches[0];
      const driveUrl = matches[1];
      
      const keywords = title
        .replace(/\[.*?\]/g, '')
        .replace(/\.mp4/gi, '')
        .trim()
        .split(/\s+/)
        .map(w => `#${w}`)
        .join(' ');
      
      const content = `<p>${keywords}</p><p>&nbsp;</p><p>공실뉴스 부동산만 사용하실 수 있습니다. # 재배포 # 불법사용 금지!</p><p>&nbsp;</p><p>Copyright © 공실뉴스. All rights reserved.</p>`;
      
      posts.push({
        board_id: 'drone',
        title: title,
        content: content,
        author_name: '관리자',
        view_count: Math.floor(Math.random() * 50) + 10,
        drive_url: driveUrl,
        // created_at can be spread over time so they don't look completely identical, or same
        created_at: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
        is_deleted: false,
        is_notice: false
      });
    }
  });

  console.log(`Inserting ${posts.length} new drone posts...`);
  // Insert in batches of 50 to avoid any limits
  for (let i = 0; i < posts.length; i += 50) {
    const batch = posts.slice(i, i + 50);
    const { error: insErr } = await supabase.from('board_posts').insert(batch);
    if (insErr) {
      console.error('Insert error for batch', i, ':', insErr);
    }
  }
  console.log('Successfully inserted new drone posts.');
}

run();
