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

console.log('Using Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeStr(s) {
  if (!s) return '';
  return s
    .replace(/\[.*?\]/g, '') // remove all bracketed tags
    .replace(/\.mp4/gi, '') // remove extensions
    .replace(/\s+/g, '') // remove all spaces
    .replace(/문빌딩/g, '빌딩') // typo fix
    .trim();
}

// simple longest common substring or token overlap
function similarity(s1, s2) {
  let matches = 0;
  for (let i = 0; i < s1.length - 2; i++) {
    const bigram = s1.substr(i, 3);
    if (s2.includes(bigram)) matches++;
  }
  return matches / Math.max(s1.length, 1);
}

async function restoreLinks() {
  const linksPath = path.join(__dirname, 'drone_links.json');
  const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  const { data: posts, error } = await supabase
    .from('board_posts')
    .select('id, title, external_url, board_id')
    .in('board_id', ['drone', 'bbs_3'])
    .limit(1000);

  if (error) {
    console.error('Failed to fetch posts:', error);
    return;
  }

  let matched = 0;
  let notFound = 0;

  for (const post of posts || []) {
    const normDbTitle = normalizeStr(post.title);
    
    // Find matching link iteratively to find best match
    let bestMatch = null;
    let bestScore = 0;

    for (const ld of linksData) {
      const normLdTitle = normalizeStr(ld.title);
      let score = 0;
      if (normDbTitle === normLdTitle || normDbTitle.includes(normLdTitle) || normLdTitle.includes(normDbTitle)) {
        score = 1;
      } else {
        score = similarity(normDbTitle, normLdTitle);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = ld;
      }
    }

    // accept if score is reasonably high (> 0.6)
    if (bestMatch && bestScore > 0.6) {
      if (!post.external_url) {
         // Create the object
         const extLinks = [];
         if (bestMatch.ytUrl) extLinks.push({ id: `yt_${Date.now()}_${Math.random().toString(36).substring(7)}`, type: 'YOUTUBE', label: '유튜브 영상', url: bestMatch.ytUrl });
         if (bestMatch.driveUrl) extLinks.push({ id: `dr_${Date.now()}_${Math.random().toString(36).substring(7)}`, type: 'DRIVE', label: '구글 드라이브 다운로드', url: bestMatch.driveUrl });

         console.log(`Updating ${post.id}: ${post.title} -> Match: ${bestMatch.title}`);
         const { error: updateErr } = await supabase
           .from('board_posts')
           .update({ external_url: JSON.stringify(extLinks) })
           .eq('id', post.id);
         
         if (updateErr) console.error(`Error updating ${post.id}:`, updateErr);
         else matched++;
      } else {
         console.log(`Exists already for ${post.id}`);
      }
    } else {
      console.log(`No match for DB post: ${post.title}`);
      notFound++;
    }
  }

  console.log(`Matched and updated: ${matched}`);
  console.log(`Not found for DB posts: ${notFound}`);
}

restoreLinks();
