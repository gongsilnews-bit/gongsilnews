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
  console.log('Fetching drone posts from database...');
  const { data: posts, error } = await supabase
    .from('board_posts')
    .select('*')
    .eq('board_id', 'drone')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Found ${posts.length} posts.`);

  let csvContent = '\uFEFF'; // BOM for Excel
  csvContent += '게시물제목,구분,내용,구글드라이브 URL\n';

  posts.forEach(post => {
    const title = post.title || '';
    
    // Extract category: [강남구] 서울 역삼동 ... -> Category: 강남구
    let category = '';
    const catMatch = title.match(/^\[(.*?)\]/);
    if (catMatch) {
      category = catMatch[1];
    }
    
    // Strip HTML from content
    let content = post.content || '';
    content = content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    
    const driveUrl = post.drive_url || '';

    const safeTitle = `"${title.replace(/"/g, '""')}"`;
    const safeCat = `"${category.replace(/"/g, '""')}"`;
    const safeContent = `"${content.replace(/"/g, '""')}"`;
    const safeUrl = `"${driveUrl.replace(/"/g, '""')}"`;

    csvContent += `${safeTitle},${safeCat},${safeContent},${safeUrl}\n`;
  });

  const outPath = path.join(__dirname, '..', '드론영상_DB백업.csv');
  fs.writeFileSync(outPath, csvContent, 'utf8');
  console.log(`Successfully exported to ${outPath}`);
}

run();
