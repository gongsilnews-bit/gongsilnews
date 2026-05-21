import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const adminAuthor = {
  id: 'e1dcc122-f243-46cd-b5c4-e06db99f4b5f',
  name: '공실뉴스',
  email: 'gongsilnews@gmail.com'
};

const draftedArticle = {
  title: '다주택자 양도세 중과 부활... 서울 아파트 \'거래 절벽\' 심화',
  subtitle: '다주택자 양도세 유예 조치 공식 종료\n규제 강화 속 서울 아파트 공급 부족 장기화\n상급지 \'똘똘한 한 채\' 쏠림 현상 지속 전망',
  content: `<p>지난 5월 9일을 기점으로 다주택자에 대한 양도소득세 중과 유예 조치가 공식 종료되면서 서울 아파트 시장이 급격한 '거래 절벽' 국면으로 접어들고 있다. 규제지역 내 다주택자의 양도세율이 최고 82.5%까지 치솟으면서 다주택자들이 매물을 거두어들이고 관망세로 돌아서는 모양새다.</p>
<p><b>■ 다주택자 세금 폭탄 현실화... 최고 82.5% 세율 적용</b></p>
<p>이번 양도세 중과 유예 조치 종료로 인해 서울 등 조정대상지역 및 투기과열지구 내 다주택자들은 주택 처분 시 막대한 세금 부담을 안게 되었다. 기본 세율에 최대 30%포인트가 가산되는 중과세율이 적용되면서 사실상 매매를 통한 자산 회수가 어려워졌다는 분석이 지배적이다. 세무 전문가들은 보유세 부담보다 양도세 부담이 더 커지면서 매물이 잠기는 현상이 장기화될 것으로 보고 있다.</p>
<p><b>■ 공급 물량 56% 급감... 수요 억제책 속 가격 버티기</b></p>
<p>더욱이 올해 서울 아파트 입주 예정 물량은 인허가 감소와 공사비 급등 여파로 전년 대비 56%가량 급감했다. 수요는 세제 규제로 묶여 있으나, 시중에 유통되는 신규 공급 자체가 원천 차단되면서 시장 가격은 거래량 감소에도 불구하고 쉽게 떨어지지 않는 강한 하방 경직성을 유지하고 있다.</p>
<p><b>■ \'똘똘한 한 채\' 집중... 양극화 심화 우려</b></p>
<p>다주택 유지가 어려워진 자산가들이 외곽 주택을 처분하고 강남 3구와 한강변 등 핵심 상급지의 고가 아파트 한 채에 집중하는 \'똘똘한 한 채\' 현상이 더욱 공고해지고 있다. 이에 따라 상급지와 하급지 간의 가격 격차가 더욱 벌어지는 부동산 시장 양극화가 2026년 하반기 핵심 쟁점으로 부각될 전망이다.</p>
<p>정부의 수요 억제책과 만성적인 공급 부족이 겹치면서 서울 아파트 시장은 단기적으로 거래가 극도로 위축된 소강상태를 유지할 것으로 보인다. 다만 공급 가뭄이 해결되지 않는 한, 핵심 지역을 중심으로 한 대기 수요와 가격 상승 압력은 수면 아래에서 계속 지속될 것이라는 분석이 지배적이다.</p>
<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">📎 원문 참고: <a href="https://news.google.com" target="_blank" rel="noopener noreferrer">https://news.google.com</a></p>`,
  section1: '부동산·경제',
  section2: '부동산 정책/동향',
  status: 'DRAFT',
  author_id: adminAuthor.id,
  author_name: adminAuthor.name,
  author_email: adminAuthor.email,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const keywords = ['다주택자', '양도세중과', '서울아파트', '공급부족', '똘똘한한채', '부동산정책', '양도소득세'];

async function insertDraft() {
  console.log("✍️ [Antigravity Editor Agent] Inserting drafted article...");

  const { data: inserted, error } = await supabase
    .from('articles')
    .insert(draftedArticle)
    .select('id')
    .single();

  if (error) {
    console.error("❌ Insertion failed:", error);
    return;
  }

  console.log(`✅ Article inserted successfully! ID: ${inserted.id}`);

  if (keywords.length > 0) {
    const keywordRows = keywords.map(kw => ({
      article_id: inserted.id,
      keyword: kw
    }));

    const { error: kwError } = await supabase
      .from('article_keywords')
      .insert(keywordRows);

    if (kwError) {
      console.error("❌ Keywords insertion failed:", kwError);
    } else {
      console.log("✅ Keywords registered successfully!");
    }
  }
}

insertDraft();
