const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// .env.local 환경 변수 로드
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function seedMockOnbid() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Supabase 환경 변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log("🔍 DB에서 유효한 관리자(ADMIN) ID를 조회하는 중...");
  
  // 1. 관리자 ID 획득 (gongsilnews@gmail.com 또는 첫 번째 관리자)
  let ownerId = null;
  const { data: adminUser } = await supabase
    .from("members")
    .select("id")
    .eq("email", "gongsilnews@gmail.com")
    .single();

  if (adminUser) {
    ownerId = adminUser.id;
  } else {
    // 대체 관리자 검색
    const { data: anyAdmin } = await supabase
      .from("members")
      .select("id")
      .eq("role", "SUPER_ADMIN")
      .limit(1)
      .single();
    
    if (anyAdmin) {
      ownerId = anyAdmin.id;
    } else {
      // 일반 회원이라도 획득
      const { data: anyUser } = await supabase
        .from("members")
        .select("id")
        .limit(1)
        .single();
      
      if (anyUser) {
        ownerId = anyUser.id;
      }
    }
  }

  if (!ownerId) {
    console.error("❌ DB에 등록된 회원이 한 명도 없습니다. 회원 가입을 먼저 진행해 주세요.");
    return;
  }

  console.log(`✅ 매칭된 소유자 ID: ${ownerId}`);

  // 2. 기존 모의 온비드 매물 삭제 (초기화)
  console.log("🧹 기존 온비드 모의 매물 청소 중...");
  await supabase
    .from("vacancies")
    .delete()
    .eq("trade_type", "경매")
    .like("building_name", "%[🔥 캠코공매]%");

  // 3. 역삼동 중심의 매혹적인 공매 매물 3건 생성
  const mockProperties = [
    {
      owner_id: ownerId,
      owner_role: "ADMIN",
      property_type: "아파트·오피스텔",
      trade_type: "경매",
      deposit: 148000, // 최저입찰가 14억 8천만 (만원 단위 대입 확인)
      monthly_rent: 0,
      maintenance_fee: 0,
      sido: "서울특별시",
      sigungu: "강남구",
      dong: "역삼동",
      detail_addr: "715-2 역삼 아이파크 101동 502호",
      building_name: "[🔥 캠코공매] 역삼 아이파크 101동 502호",
      lat: 37.5012,
      lng: 127.0425,
      description: `[📢 온비드 공매 추천 매물 - 모의 데이터]
* 공고번호: 2026-ONBID-9901
* 물건번호 (온비드 고유 ID): 9991234
* 감정평가액: 1,850,000,000원
* 최저입찰가격: 1,480,000,000원 (20% 단독 특별 할인!)
* 입찰 기간: 2026-06-01 ~ 2026-06-04

본 매물은 한국자산관리공사(KAMCO)에서 진행하는 공식 공매 아파트 물건입니다.
강남 명문 학군지 및 역삼역 초역세권에 위치하여 탁월한 주거 가치를 선사합니다.`,
      address_exposure: "지번공개",
      move_in_date: "즉시입주",
      consent: true,
      status: "ACTIVE"
    },
    {
      owner_id: ownerId,
      owner_role: "ADMIN",
      property_type: "아파트·오피스텔",
      trade_type: "경매",
      deposit: 20000, // 최저가 2억
      monthly_rent: 0,
      maintenance_fee: 0,
      sido: "서울특별시",
      sigungu: "강남구",
      dong: "역삼동",
      detail_addr: "824-25 역삼역 디오빌 오피스텔 303호",
      building_name: "[🔥 캠코공매] 역삼 디오빌 오피스텔 303호",
      lat: 37.4985,
      lng: 127.0315,
      description: `[📢 온비드 공매 추천 매물 - 모의 데이터]
* 공고번호: 2026-ONBID-9902
* 물건번호 (온비드 고유 ID): 9991235
* 감정평가액: 250,000,000원
* 최저입찰가격: 200,000,000원 (20% 파격 할인)
* 입찰 기간: 2026-06-05 ~ 2026-06-08

본 매물은 역삼역 도보 3분 초역세권에 위치한 고수익형 오피스텔입니다.
소액 투자자 분들께 강남 1인 가구 직장인 임대수익용으로 적극 추천드립니다.`,
      address_exposure: "지번공개",
      move_in_date: "즉시입주",
      consent: true,
      status: "ACTIVE"
    },
    {
      owner_id: ownerId,
      owner_role: "ADMIN",
      property_type: "상가·사무실·건물·공장·토지",
      trade_type: "경매",
      deposit: 360000, // 최저가 36억
      monthly_rent: 0,
      maintenance_fee: 0,
      sido: "서울특별시",
      sigungu: "강남구",
      dong: "삼성동",
      detail_addr: "157-3 테헤란 타워 빌딩 2층 전체",
      building_name: "[🔥 캠코공매] 삼성동 테헤란 타워 상가 2층",
      lat: 37.5095,
      lng: 127.0585,
      description: `[📢 온비드 공매 추천 매물 - 모의 데이터]
* 공고번호: 2026-ONBID-9903
* 물건번호 (온비드 고유 ID): 9991236
* 감정평가액: 4,500,000,000원
* 최저입찰가격: 3,600,000,000원 (9억 직통 할인!)
* 입찰 기간: 2026-06-10 ~ 2026-06-13

본 매물은 테헤란로 중심 업무 지구에 위치한 대로변 대형 상가 오피스입니다.
대형 병원, 프랜차이즈 카페, 본사 사무실 등 다양한 복합 상업 공간으로 강령 추천합니다.`,
      address_exposure: "지번공개",
      move_in_date: "즉시입주",
      consent: true,
      status: "ACTIVE"
    }
  ];

  console.log("📝 DB에 아름다운 온비드 모의 매물 3건 등록 중...");
  const { error } = await supabase.from("vacancies").insert(mockProperties);

  if (error) {
    console.error("❌ 모의 데이터 등록 중 오류 발생:", error.message);
  } else {
    console.log("🎉 완벽합니다! 온비드 모의 공매 매물 3건이 지도에 실시간 등록되었습니다!");
    console.log("💡 브라우저에서 '서울특별시 강남구 역삼동'을 검색하고 '원룸·투룸' 이나 전체보기를 하시면 보라색 마커들과 리스트가 바로 나타납니다!");
  }
}

seedMockOnbid();
