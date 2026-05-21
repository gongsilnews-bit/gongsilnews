import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const articleId = '90fd25b3-ce73-4c26-9474-1d253c56782a';
const thumbnailUrl = '/articles/seoul_apartment_tax_news.png';

async function updateThumbnail() {
  console.log(`🖼️ [Antigravity Editor Agent] Updating thumbnail for article ${articleId}...`);

  const { data, error } = await supabase
    .from('articles')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('id', articleId)
    .select('id, thumbnail_url')
    .single();

  if (error) {
    console.error("❌ Thumbnail update failed:", error);
  } else {
    console.log("✅ Thumbnail updated successfully!", data);
  }
}

updateThumbnail();
