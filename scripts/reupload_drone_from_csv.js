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
  console.log('Reading CSV backup file...');
  const csvPath = path.join(__dirname, '..', '드론영상_DB백업.csv');
  let csvText = fs.readFileSync(csvPath, 'utf8');
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.substring(1); // Remove BOM
  }

  const lines = csvText.split('\n');
  const posts = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let inQuote = false;
    let currentField = '';
    const fields = [];
    for (let char of line) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField);

    if (fields.length >= 4) {
      const title = fields[0].replace(/^"|"$/g, '').replace(/""/g, '"');
      const category = fields[1].replace(/^"|"$/g, '').replace(/""/g, '"');
      
      // Recreate nice HTML content
      const cleanTitle = title.replace(/\[.*?\]/g, '').trim();
      const keywords = cleanTitle
        .split(/\s+/)
        .filter(w => w)
        .map(w => `#${w}`)
        .join(' ');
      
      const content = `<p>${keywords}</p><p>&nbsp;</p><p>공실뉴스 부동산만 사용하실 수 있습니다. # 재배포 # 불법사용 금지!</p><p>&nbsp;</p><p>Copyright © 공실뉴스. All rights reserved.</p>`;
      
      const driveUrl = fields[3].replace(/^"|"$/g, '').replace(/""/g, '"');

      posts.push({
        board_id: 'drone',
        title: title,
        content: content,
        author_name: '관리자',
        view_count: Math.floor(Math.random() * 50) + 10,
        drive_url: driveUrl,
        youtube_url: null, // NO YOUTUBE URL!
        created_at: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
        is_deleted: false,
        is_notice: false
      });
    }
  }

  console.log(`Prepared ${posts.length} posts to insert.`);

  for (let i = 0; i < posts.length; i += 50) {
    const batch = posts.slice(i, i + 50);
    const { error: insErr } = await supabase.from('board_posts').insert(batch);
    if (insErr) {
      console.error('Insert error for batch', i, ':', insErr);
    }
  }
  console.log('Successfully re-uploaded all drone posts!');
}

run();
