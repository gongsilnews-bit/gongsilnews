import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeStr(s: string) {
  return s
    .replace(/\[드론영상\]/g, '')
    .replace(/\[ 음악 \]/g, '')
    .replace(/\[음악\]/g, '')
    .replace(/\.mp4/gi, '')
    .replace(/\s+/g, '')
    .trim();
}

async function restoreLinks() {
  const linksPath = path.join(__dirname, 'drone_links.json');
  const linksData: {title: string, ytUrl: string, driveUrl: string}[] = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  const { data: posts, error } = await supabase
    .from('board_posts')
    .select('id, title, external_links')
    .eq('category', 'drone-video');

  if (error) {
    console.error('Failed to fetch posts:', error);
    return;
  }

  let matched = 0;
  let notFound = 0;

  for (const post of posts || []) {
    const normDbTitle = normalizeStr(post.title);
    
    // Find matching link
    const match = linksData.find(ld => {
      const normLdTitle = normalizeStr(ld.title);
      // Try to match flexibly
      return normDbTitle === normLdTitle || normDbTitle.includes(normLdTitle) || normLdTitle.includes(normDbTitle);
    });

    if (match) {
      if (!post.external_links) {
         // Create the object
         const extLinks = [];
         if (match.ytUrl) extLinks.push({ type: 'youtube', link: match.ytUrl });
         if (match.driveUrl) extLinks.push({ type: 'drive', link: match.driveUrl });

         console.log(`Updating ${post.id}: ${post.title}`);
         const { error: updateErr } = await supabase
           .from('board_posts')
           .update({ external_links: extLinks })
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
