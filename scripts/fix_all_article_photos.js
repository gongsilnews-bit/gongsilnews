const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const UPDATES = [
  // 1. [1035호] 오바마 사진 전격 퇴출 -> 대한민국 은행 주담대 창구 실사 교체
  {
    articleNo: 1035,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_02_bank_mortgage.jpg",
    newCaption: "▲ 시중은행 창구에서 고객들이 주택담보대출 상담을 받고 있다. 2단계 스트레스 DSR 시행으로 수도권 대출 한도가 대폭 축소됐다."
  },
  // 2. [966호] 오바마 사진 전격 퇴출 -> 국토부·금융당국 정책 브리핑 사진 교체
  {
    articleNo: 966,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/molit_2nd_1776659937491.png",
    newCaption: "▲ 정부 관계부처 가계부채 관리 및 정책금융 브리핑 현장 전경."
  },
  // 3. [1038호] 서양인 흑백 인물사진 전격 퇴출 -> 법무법인 상가임대차 계약·판례 검토 실사 교체
  {
    articleNo: 1038,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_08_legal_contract.jpg",
    newCaption: "▲ 법무법인 변호사와 의뢰인이 상가건물 임대차보호법 계약서 및 대법원 판례 자료를 정밀 검토하고 있다."
  },
  // 4. [982호] 서양인 흑백 인물사진 퇴출 -> 세무·법률 계약 검토 실사 교체
  {
    articleNo: 982,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_08_legal_contract.jpg",
    newCaption: "▲ 임대사업자 세무 실태 및 종부세 법률 검토 현장."
  },
  // 5. [969호] 서양인 흑백 인물사진 퇴출 -> 세무·법률 계약 검토 실사 교체
  {
    articleNo: 969,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_08_legal_contract.jpg",
    newCaption: "▲ 세법 개정안 및 종부세 개편 법률 쟁점 검토 회의."
  },
  // 6. [956호] 서양인 흑백 인물사진 퇴출 -> 세무·법률 계약 검토 실사 교체
  {
    articleNo: 956,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_08_legal_contract.jpg",
    newCaption: "▲ 상가 임대차 계약서 및 권리금 분쟁 관련 법률 검토 현장."
  },

  // ── 오늘 발행 10편 중 추가 고도화 (한국형 맞춤 1:1 실사 전면 적용) ──
  // 7. [1030호] 단순 3D 글자 그래픽 -> 프롭테크 3D Virtual Twin 도면 시연 실사 교체
  {
    articleNo: 1030,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_04_proptech_virtual.jpg",
    newCaption: "▲ 프롭테크 기업 전문가가 태블릿 PC를 통해 실시간 생성된 3D 가상투어 평면도(Virtual Twin)를 시연하고 있다."
  },
  // 8. [1032호] 엉뚱한 거실 사진 -> 공인중개사 스마트폰 짐벌 숏폼 촬영 실사 교체
  {
    articleNo: 1032,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_10_realtor_shortform.jpg",
    newCaption: "▲ 공인중개사가 스마트폰 짐벌을 이용해 매물 현장에서 숏폼 영상 콘텐츠를 촬영하고 있다."
  },
  // 9. [1033호] 일반 서양식 카페 -> 한국 구도심 붉은벽돌 골목 베이커리 앵커 테넌트 실사 교체
  {
    articleNo: 1033,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_12_local_alley_cafe.jpg",
    newCaption: "▲ 낡은 구도심 골목에 들어선 베이커리 앵커 테넌트. 개성 넘치는 공간 경험으로 골목 전체 상권 부활을 견인하고 있다."
  },
  // 10. [1034호] 어두운 외국 야경 빌딩 -> 강남 테헤란로 GS타워 상업용 빌딩가 실사 교체
  {
    articleNo: 1034,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/gangnam_commercial_street_2026.jpg",
    newCaption: "▲ 서울 강남 테헤란로 일대 상업용 빌딩 거리. 자산가들의 꼬마빌딩 엑시트 및 포트폴리오 재편이 활발하게 이뤄지고 있다."
  },
  // 11. [1036호] 휑한 복도 사진 -> 현대 테라타워 지식산업센터 전경 실사 교체
  {
    articleNo: 1036,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_03_knowledge_center.jpg",
    newCaption: "▲ 수도권 주요 지식산업센터 전경. 공급 과잉 여파로 공실과 마이너스 프리미엄 매물이 잇따르고 있다."
  },
  // 12. [1039호] 아마존 물류창고 사진 -> 서울 도심 24시간 IoT 무인 스마트 공유창고 실사 교체
  {
    articleNo: 1039,
    newUrl: "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/news-images/article_20260922_07_self_storage.jpg",
    newCaption: "▲ 상가 지하 유휴 공간에 마련된 24시간 스마트 공유창고. 이용자가 스마트폰 앱으로 사물함을 원격 제어하고 있다."
  }
];

async function fixPhotos() {
  console.log("=== 기사 사진 정밀 점검 및 교체 작업 시작 ===");

  for (const item of UPDATES) {
    const { data: article, error: fetchErr } = await supabase
      .from('articles')
      .select('id, article_no, title, content')
      .eq('article_no', item.articleNo)
      .single();

    if (fetchErr || !article) {
      console.warn(`[Skip] 기사 번호 ${item.articleNo} 조회 실패:`, fetchErr?.message);
      continue;
    }

    let updatedContent = article.content;

    // 본문 맨 앞의 이미지 배너 교체 (기존 <div ...><img .../><p ...>...</p></div> 또는 <img> 태그)
    const bannerRegex = /<div style="text-align: center[^"]*">[\s\S]*?<img[^>]*>[\s\S]*?<\/div>/i;
    const singleImgRegex = /<img[^>]*src=["'][^"']+["'][^>]*>/i;

    const newBannerHtml = `<div style="text-align: center; margin-bottom: 24px;">
  <img src="${item.newUrl}" alt="${article.title.replace(/"/g, '&quot;')}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);" />
  <p style="margin-top: 8px; font-size: 13px; color: #64748b;">${item.newCaption}</p>
</div>`;

    if (bannerRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(bannerRegex, newBannerHtml);
    } else if (singleImgRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(singleImgRegex, newBannerHtml);
    } else {
      updatedContent = `${newBannerHtml}\n${updatedContent}`;
    }

    // 1. articles 테이블 갱신
    const { error: updateErr } = await supabase
      .from('articles')
      .update({
        thumbnail_url: item.newUrl,
        content: updatedContent
      })
      .eq('id', article.id);

    if (updateErr) {
      console.error(`[Error] 기사 ${item.articleNo} 업데이트 실패:`, updateErr.message);
      continue;
    }

    // 2. article_media 테이블 갱신
    await supabase.from('article_media').delete().eq('article_id', article.id);
    await supabase.from('article_media').insert({
      article_id: article.id,
      media_type: 'PHOTO',
      url: item.newUrl,
      sort_order: 0
    });

    console.log(`[완료] 기사 #${item.articleNo} ("${article.title.slice(0, 25)}...") 사진 교체 성공!`);
  }

  console.log("\n=== 모든 부적절/스톡 사진 교체 및 1:1 맞춤 실사 적용 완료 ===");
}

fixPhotos().catch(console.error);
