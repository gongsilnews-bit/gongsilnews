import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// .env.local 파일 수동 파싱
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && key.trim()) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkAuctionImages() {
  console.log('🔍 경매 매물 사진 확인 중...\n');

  // 경매 매물 조회 (사진 포함)
  const { data: auctionData, error } = await supabase
    .from('vacancies')
    .select('id, building_name, dong, trade_type, status, created_at, vacancy_photos(id, url, sort_order)')
    .eq('trade_type', '경매')
    .eq('status', 'ACTIVE')
    .limit(50);

  if (error) {
    console.error('❌ 쿼리 오류:', error.message);
    return;
  }

  if (!auctionData || auctionData.length === 0) {
    console.log('❌ 경매 매물이 없습니다.');
    return;
  }

  console.log(`📊 조회된 경매 매물: ${auctionData.length}개\n`);

  // 사진 있는/없는 분류
  const withPhotos = auctionData.filter(v => v.vacancy_photos && v.vacancy_photos.length > 0);
  const withoutPhotos = auctionData.filter(v => !v.vacancy_photos || v.vacancy_photos.length === 0);

  console.log(`✅ 사진 있는 경매: ${withPhotos.length}개`);
  console.log(`❌ 사진 없는 경매: ${withoutPhotos.length}개\n`);

  if (withPhotos.length > 0) {
    console.log('📸 사진 있는 경매 매물 (최대 5개):');
    withPhotos.slice(0, 5).forEach((v, idx) => {
      const title = v.building_name || [v.dong].filter(Boolean).join(' ') || 'N/A';
      console.log(`\n  ${idx + 1}. ${title}`);
      console.log(`     ID: ${v.id}`);
      console.log(`     사진 개수: ${v.vacancy_photos.length}`);
      console.log(`     첫 사진: ${v.vacancy_photos[0]?.url || 'N/A'}`);
    });
  }

  if (withoutPhotos.length > 0) {
    console.log('\n\n❌ 사진 없는 경매 매물 (최대 5개):');
    withoutPhotos.slice(0, 5).forEach((v, idx) => {
      const title = v.building_name || [v.dong].filter(Boolean).join(' ') || 'N/A';
      console.log(`  ${idx + 1}. ${title} (ID: ${v.id})`);
    });
  }

  console.log('\n✅ 분석 완료!');
}

checkAuctionImages().catch(err => {
  console.error('❌ 에러:', err.message);
  process.exit(1);
});
