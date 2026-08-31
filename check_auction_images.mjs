import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// .env.local 파일 수동으로 파싱
const envPath = '.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && key.trim()) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL 또는 SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkAuctionImages() {
  console.log('🔍 경매 매물 사진 확인 시작...\n');

  // 1. 경매 매물 전체 개수 조회
  const { count: auctionCount } = await supabase
    .from('vacancies')
    .select('id', { count: 'exact', head: true })
    .eq('trade_type', '경매')
    .eq('status', 'ACTIVE');

  console.log(`📊 경매 매물 총 개수: ${auctionCount}`);

  // 2. 경매 매물 중 사진이 있는 것과 없는 것 분류
  const { data: auctionWithPhotos } = await supabase
    .from('vacancies')
    .select('id, title, trade_type, created_at, vacancy_photos(id, url)')
    .eq('trade_type', '경매')
    .eq('status', 'ACTIVE')
    .limit(100);

  if (!auctionWithPhotos) {
    console.error('❌ 쿼리 실패');
    return;
  }

  const withImages = auctionWithPhotos.filter(v => v.vacancy_photos && v.vacancy_photos.length > 0);
  const withoutImages = auctionWithPhotos.filter(v => !v.vacancy_photos || v.vacancy_photos.length === 0);

  console.log(`\n✅ 사진 있는 경매 매물: ${withImages.length}개`);
  console.log(`❌ 사진 없는 경매 매물: ${withoutImages.length}개`);

  // 3. 사진이 있는 경매 매물 샘플 출력
  if (withImages.length > 0) {
    console.log('\n📸 사진 있는 경매 매물 샘플 (최대 3개):');
    withImages.slice(0, 3).forEach((v, idx) => {
      console.log(`  ${idx + 1}. ID: ${v.id}`);
      console.log(`     제목: ${v.title}`);
      console.log(`     사진 개수: ${v.vacancy_photos.length}`);
      if (v.vacancy_photos[0]) {
        console.log(`     첫 사진 URL: ${v.vacancy_photos[0].url}`);
      }
    });
  }

  // 4. 사진이 없는 경매 매물 샘플 출력
  if (withoutImages.length > 0) {
    console.log('\n❌ 사진 없는 경매 매물 샘플 (최대 3개):');
    withoutImages.slice(0, 3).forEach((v, idx) => {
      console.log(`  ${idx + 1}. ID: ${v.id} | 제목: ${v.title} | 생성일: ${v.created_at}`);
    });
  }

  // 5. 전체 vacancy_photos 통계
  const { data: photoStats } = await supabase
    .rpc('get_auction_photo_stats');

  console.log('\n📈 DB 통계:');
  console.log(`   - vacancy_photos 테이블 전체 행 개수 조회 중...`);

  // 대신 직접 조회
  const { count: totalPhotos } = await supabase
    .from('vacancy_photos')
    .select('id', { count: 'exact', head: true });

  const { count: auctionPhotos } = await supabase
    .from('vacancy_photos')
    .select('id', { count: 'exact', head: true })
    .eq('vacancy_id', (await supabase.from('vacancies').select('id').eq('trade_type', '경매').limit(1)).data?.[0]?.id || '');

  console.log(`   - 전체 사진: ${totalPhotos}개`);
  console.log(`\n✅ 분석 완료!`);
}

checkAuctionImages().catch((err) => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
