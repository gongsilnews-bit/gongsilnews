const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateArticlePhoto(articleId, localFilePath, storageFileName) {
  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const { error: uploadError } = await supabase.storage.from('news-images').upload(storageFileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (uploadError) {
      console.error(`Upload error for ${articleId}:`, uploadError.message);
      return false;
    }

    const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(storageFileName);

    const { data: art, error: artErr } = await supabase.from('articles').select('content').eq('id', articleId).single();
    if (artErr || !art) {
      console.error(`Article fetch error for ${articleId}:`, artErr);
      return false;
    }

    let updatedContent = art.content;
    const imgMatch = updatedContent.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch) {
      updatedContent = updatedContent.replace(imgMatch[1], publicUrl);
    } else {
      updatedContent = `<div style="text-align: center;"><img src="${publicUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" /></div><br/>${updatedContent}`;
    }

    const { error: updateErr } = await supabase.from('articles').update({
      thumbnail_url: publicUrl,
      content: updatedContent
    }).eq('id', articleId);

    if (updateErr) {
      console.error(`Article update error for ${articleId}:`, updateErr.message);
      return false;
    }

    await supabase.from('article_media').upsert({
      article_id: articleId,
      media_type: 'PHOTO',
      url: publicUrl,
      sort_order: 0
    });

    console.log(`[OK] Updated article ${articleId} with new AI photo: ${publicUrl}`);
    return true;
  } catch (err) {
    console.error(`Error updating photo for ${articleId}:`, err);
    return false;
  }
}

if (process.argv[2] && process.argv[3] && process.argv[4]) {
  updateArticlePhoto(process.argv[2], process.argv[3], process.argv[4]);
}

module.exports = { updateArticlePhoto };
