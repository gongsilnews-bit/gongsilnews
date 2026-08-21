const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) {
    env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORY_MAPPING = {
  // 1. 공실현장
  '공실뉴스': '공실현장',
  '우리동네부동산': '공실현장',

  // 2. 정책시장
  '부동산·경제': '정책시장',
  '부동산경제': '정책시장',
  '부동산·주식·재테크': '정책시장',
  '정치·경제·사회': '정책시장',
  '부동산정책': '정책시장',
  '세무·법률': '정책시장',
  '시장동향': '정책시장',

  // 3. AI중개실무
  'AI마케팅': 'AI중개실무',
  'AI 마케팅': 'AI중개실무',

  // 4. 기타
  '라이프·오피니언': '기타',
  '여행·건강·생활': '기타',
  'IT·가전·가구': '기타',
  '스포츠·연예·CAR': '기타',
  '스포츠·연예·Car': '기타',
  '인물·미션·기타': '기타',
  '뉴스/칼럼': '기타',
  '뉴스/기사': '기타',
};

async function migrate() {
  console.log('🚀 Starting Articles 4-Category Migration...');

  // 1. 전체 백업 생성
  const { data: allArticles, error: fetchErr } = await supabase
    .from('articles')
    .select('*');

  if (fetchErr || !allArticles) {
    console.error('❌ Failed to fetch articles for backup:', fetchErr);
    return;
  }

  const backupPath = path.join(__dirname, `backup_articles_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(allArticles, null, 2), 'utf8');
  console.log(`✅ Complete Backup saved to: ${backupPath} (Total ${allArticles.length} articles)`);

  // 2. 마이그레이션 실행
  let updatedCount = 0;
  for (const article of allArticles) {
    const currentSection1 = article.section1 || '';
    const newSection1 = CATEGORY_MAPPING[currentSection1] || '기타';

    if (currentSection1 !== newSection1) {
      const { error: updateErr } = await supabase
        .from('articles')
        .update({ section1: newSection1 })
        .eq('id', article.id);

      if (updateErr) {
        console.error(`❌ Error updating article ${article.id}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`🎉 Migration Completed! Successfully updated ${updatedCount} articles.`);

  // 3. 마이그레이션 후 통계 검증
  const { data: verifiedArticles } = await supabase
    .from('articles')
    .select('id, section1');

  const finalStats = {};
  verifiedArticles?.forEach(a => {
    finalStats[a.section1] = (finalStats[a.section1] || 0) + 1;
  });

  console.log('📊 Final 4-Category Distribution in DB:', finalStats);
}

migrate();
