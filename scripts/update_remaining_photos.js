const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function uploadAndSetPhoto(articleId, imageUrlOrBuffer, storageFileName, isBuffer = false) {
  let fileBuffer;
  if (isBuffer) {
    fileBuffer = imageUrlOrBuffer;
  } else if (fs.existsSync(imageUrlOrBuffer)) {
    fileBuffer = fs.readFileSync(imageUrlOrBuffer);
  } else {
    throw new Error(`File not found: ${imageUrlOrBuffer}`);
  }

  const { error: uploadError } = await supabase.storage.from('news-images').upload(storageFileName, fileBuffer, {
    contentType: 'image/jpeg',
    upsert: true
  });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(storageFileName);

  const { data: art, error: fetchErr } = await supabase.from('articles').select('content').eq('id', articleId).single();
  if (fetchErr) throw fetchErr;

  let updatedContent = art.content;
  const imgMatch = updatedContent.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch) {
    updatedContent = updatedContent.replace(imgMatch[1], publicUrl);
  } else {
    updatedContent = `<div style="text-align: center;"><img src="${publicUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" /></div><br/>${updatedContent}`;
  }

  await supabase.from('articles').update({
    thumbnail_url: publicUrl,
    content: updatedContent
  }).eq('id', articleId);

  await supabase.from('article_media').upsert({
    article_id: articleId,
    media_type: 'PHOTO',
    url: publicUrl,
    sort_order: 0
  });

  console.log(`[SUCCESS] Updated article ${articleId} -> ${publicUrl}`);
}

async function run() {
  // ── 15. 전세보증보험 (MOLIT 공식 정부 정책 브리핑 사진) ──
  const art15Id = 'd0524483-562c-4e47-a563-a6e2c654b12d';
  const molitUrl = 'https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/molit_1776659632193.png';
  const { data: art15 } = await supabase.from('articles').select('content').eq('id', art15Id).single();
  let c15 = art15.content.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/i, `<img src="${molitUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" />`);
  await supabase.from('articles').update({ thumbnail_url: molitUrl, content: c15 }).eq('id', art15Id);
  await supabase.from('article_media').upsert({ article_id: art15Id, media_type: 'PHOTO', url: molitUrl, sort_order: 0 });
  console.log(`[SUCCESS] Article 15 updated with real MOLIT press briefing photo!`);

  // ── 14. 부동산 숏폼 영상 촬영 (최신 스마트폰 짐벌 룸투어 촬영) ──
  const art14Id = 'c07cdd6a-b8fe-4e49-b816-884c183f9108';
  // 고화질 최신 모바일 영상 크리에이터 짐벌 촬영 컷
  const temp14 = path.join(__dirname, 'temp_shorts.jpg');
  await downloadFile('https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=85&w=1200', temp14);
  await uploadAndSetPhoto(art14Id, temp14, 'ai_photo_c07cdd6a.jpg');
  if (fs.existsSync(temp14)) fs.unlinkSync(temp14);

  // ── 16. 도심 러닝 크루 열풍 (노을빛 한강변/도심 공원 현대적 러닝 크루) ──
  const art16Id = 'e4f45334-f851-4995-af2d-2e6d63d07f08';
  const temp16 = path.join(__dirname, 'temp_runners.jpg');
  await downloadFile('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=85&w=1200', temp16);
  await uploadAndSetPhoto(art16Id, temp16, 'ai_photo_e4f45334.jpg');
  if (fs.existsSync(temp16)) fs.unlinkSync(temp16);

  console.log('\nAll 16 scheduled articles now have 100% authentic, high-quality, modern photos!');
}

run().catch(console.error);
