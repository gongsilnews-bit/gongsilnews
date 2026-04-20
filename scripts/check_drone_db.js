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

async function checkDb() {
  console.log('Fetching 1 item to check columns...');
  const { data: cols, error: colErr } = await supabase.from('board_posts').select('*').limit(1);
  if (colErr) console.error('Column check error:', colErr);
  else if (cols.length > 0) {
    console.log('Columns in board_posts:', Object.keys(cols[0]));
  }
  
  console.log('\nChecking existing "drone" board posts count:');
  const { count, error: countErr } = await supabase.from('board_posts').select('*', { count: 'exact', head: true }).eq('board_id', 'drone');
  if (countErr) console.error('Count error:', countErr);
  else console.log(`Current drone posts count: ${count}`);

  const { count: bbs3Count } = await supabase.from('board_posts').select('*', { count: 'exact', head: true }).eq('board_id', 'bbs_3');
  console.log(`Current bbs_3 posts count: ${bbs3Count}`);

  // Read a sample from the original JSON
  const linksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'drone_links.json'), 'utf8'));
  const droneLink = linksData.find(l => l.driveUrl && !l.title.includes('Music'));
  
  console.log('\nSample Content Generation:');
  const title = droneLink.title;
  // 제목을 띄어쓰기 기준으로 쪼개서 해시태그화
  const keywords = title
    .replace(/\[.*?\]/g, '')
    .replace(/\.mp4/gi, '')
    .trim()
    .split(/\s+/)
    .map(w => `#${w}`)
    .join(' ');
    
  const content = `<p>${keywords}</p>\n<br/>\n<p>공실뉴스 부동산만 사용하실 수 있습니다. # 재배포 # 불법사용 금지!</p>\n<br/>\n<p>Copyright © 공실뉴스. All rights reserved.</p>`;
  
  console.log('Original Title:', title);
  console.log('Generated Content:\n', content);
}
checkDb();
