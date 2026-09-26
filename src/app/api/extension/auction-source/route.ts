import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { getVacancyDetail } from "@/app/actions/vacancy";
import { getExtensionMember } from "@/utils/extensionMember";
import { getAuctionInfo, formatAreaWithPy } from "@/app/(map)/gongsil/gongsilHelpers";

/**
 * 크롬 확장(공실뉴스 AI 경매기사작성기)용 경매·공매 물건 정보
 *
 * 공실열람 경매 상세는 세부정보·재산정보·입찰정보·인근시세 4개 탭으로 나뉘어 있어
 * 화면을 읽으면 열린 탭 하나만 잡힌다. 그래서 물건 정보를 여기서 한 번에 돌려준다.
 *
 * - 공실열람 경매 상세에 이미 공개된 값만 돌려준다.
 * - 정보제공처(온비드 고객센터 연락처)와 입찰 전 법적 주의사항 문구는 기사에 쓰지 않으므로 담지 않는다.
 * - 기사 작성(1·2단계)은 비회원도 쓰므로 막지 않는다. for=blog 로 부르면 블로그 권한을 확인한다.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

type Fact = { label: string; value: string };

const text = (value: unknown) => String(value ?? "").trim();
const pick = (meta: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = text(meta?.[key]);
    if (value && value !== "-") return value;
  }
  return "";
};
const toNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
/* formatAreaWithPy 는 문자열에서 단위 글자(㎡·m2)를 지우며 숫자 2 까지 지운다("2.8" → ".8").
   그래서 숫자로 바꿔 넘긴다. */
const area = (value: string) => {
  const n = parseFloat(String(value).replace(/,/g, "").replace(/(㎡|m²|m2|평)\s*$/i, ""));
  return Number.isFinite(n) && n > 0 ? formatAreaWithPy(n) : "";
};
const won = (n: number) => (n > 0 ? `${n.toLocaleString("ko-KR")}원` : "");

/* 1억 2,345만원 식 — 기사에서 읽기 쉽게 */
function manwon(n: number) {
  if (n <= 0) return "";
  const eok = Math.floor(n / 100000000);
  const man = Math.round((n % 100000000) / 10000);
  if (eok && man) return `${eok}억 ${man.toLocaleString("ko-KR")}만원`;
  if (eok) return `${eok}억원`;
  return `${man.toLocaleString("ko-KR")}만원`;
}

/* 날짜 문자열 중 "미정·보류"(2999년 등)는 일정이 없는 것으로 본다 */
const schedule = (value: string) => (!value || /2999|미정|보류/.test(value) ? "" : value);

function yesNo(value: string, yes: string) {
  if (!value) return "";
  return /^(y|yes|true|1)$/i.test(value) ? yes : "";
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ success: false, error: "물건 ID가 올바르지 않습니다." }, { status: 400, headers: corsHeaders });
  }

  // 블로그 작성은 기존 기사작성기와 같은 권한(공실뉴스부동산·공실스터디부동산·최고관리자)만 쓴다.
  if (req.nextUrl.searchParams.get("for") === "blog") {
    const requester = await getExtensionMember(req);
    if (!requester?.canBlog) {
      return NextResponse.json(
        {
          success: false,
          error: requester
            ? "블로그 작성은 공실뉴스부동산·공실스터디부동산 회원만 사용할 수 있습니다."
            : "공실뉴스에 로그인한 뒤 다시 시도해 주세요.",
        },
        { status: requester ? 403 : 401, headers: corsHeaders }
      );
    }
  }

  const res = await getVacancyDetail(id);
  if (!res.success || !res.data) {
    return NextResponse.json({ success: false, error: "물건을 찾을 수 없습니다." }, { status: 404, headers: corsHeaders });
  }

  const v: any = res.data;
  if (v.trade_type !== "경매") {
    return NextResponse.json(
      { success: false, error: "경매·공매 물건이 아닙니다. 공실열람 [경매/공매] 메뉴에서 물건을 열어 주세요." },
      { status: 400, headers: corsHeaders }
    );
  }

  let meta: any = v.metadata || {};
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }

  // 온비드 관리번호·공고번호가 있으면 공매, 없으면 법원 경매로 본다
  const isPublicSale = Boolean(pick(meta, "cltrMngNo", "cltr_mng_no", "onbidPbancNo", "pbctNo", "onbidCltrNm"));
  const saleKind = isPublicSale ? "공매" : "경매";
  const info = getAuctionInfo(v);

  const appraisal = toNumber(meta.appraisal_price) || toNumber(meta.apslEvlAmt);
  const lowest = toNumber(meta.lowest_bid_price) || toNumber(meta.lowstBidPrcIndctCont);
  const ratio = appraisal > 0 && lowest > 0 ? Math.round((lowest / appraisal) * 100) : 0;
  const failCount = pick(meta, "fail_count", "usbdNft", "pbctCnt", "pbct_cnt");
  const depositRate = pick(meta, "dpstRt", "dpst_rt");
  const depositRateNum = toNumber(depositRate);
  const landArea = pick(meta, "landSqms", "ldSqms", "ld_sqms");
  const buildingArea = pick(meta, "bldSqms", "bld_sqms");
  const usage = [meta.cltrUsgLclsCtgrNm, meta.cltrUsgMclsCtgrNm, meta.cltrUsgSclsCtgrNm].map(text).filter(Boolean).join(" > ");
  const address = [v.sido, v.sigungu, v.dong, v.detail_addr].map(text).filter(Boolean).join(" ");
  const roadAddress = [pick(meta, "lctnRoadNmAdr"), pick(meta, "lctnDtlAdr")].filter(Boolean).join(" ");
  const evict = pick(meta, "evctRspbYn", "evct_rspb_yn");

  const facts: Fact[] = [];
  const push = (label: string, value: string) => {
    if (value && value !== "-") facts.push({ label, value });
  };

  // 기본
  push("구분", isPublicSale ? "공매 (온비드)" : "법원 경매");
  push("물건명", pick(meta, "onbidCltrNm") || text(v.title));
  push("물건종류", info.category || text(v.property_type));
  push("용도분류", usage);
  push("소재지(지번)", address);
  push("소재지(도로명)", roadAddress);
  // 가격
  push("감정가", appraisal ? `${won(appraisal)} (${manwon(appraisal)})` : "");
  push("최저입찰가", lowest ? `${won(lowest)} (${manwon(lowest)})` : "");
  push("감정가 대비 최저입찰가", ratio ? `${ratio}% (감정가보다 ${100 - ratio}% 낮음)` : "");
  push("유찰 횟수", failCount ? `${failCount}회` : "");
  // 면적
  push("토지면적", landArea && area(landArea) ? `${area(landArea)}${pick(meta, "ldKnd", "ld_knd") ? ` · 지목 ${pick(meta, "ldKnd", "ld_knd")}` : ""}` : "");
  push("건물면적", buildingArea ? area(buildingArea) : "");
  // 현황
  push("위치·주변환경", pick(meta, "lcnPsitnEnvn", "lcn_psitn_envn"));
  push("이용상태", pick(meta, "cltrUsgStts", "cltr_usg_stts"));
  push("기타사항", pick(meta, "etcCntn", "etc_cntn"));
  push("명도책임", evict ? (/^y/i.test(evict) ? "매수인 부담" : /^n/i.test(evict) ? "매도인 부담" : evict) : "");
  push("명도 대상", pick(meta, "evcRsbyTrgtCont"));
  push("재산구분", pick(meta, "prptDivNm", "prpt_div_nm"));
  push("물건상태", pick(meta, "cltrSttsNm", "cltr_stts_nm", "pbctStatNm"));
  // 입찰
  push("입찰 시작", schedule(pick(meta, "bid_start_date")));
  push("입찰 마감", schedule(pick(meta, "bid_end_date")));
  push("개찰일시", schedule(pick(meta, "opbdDt", "opbd_dt")));
  push("개찰장소", pick(meta, "opbdPlc", "opbd_plc"));
  push("입찰방법", pick(meta, "bidMtd", "bid_mtd", "bidMthodNm"));
  push("처분방식", pick(meta, "dspsMthodNm"));
  push("낙찰자 결정방법", pick(meta, "cptnMthodNm"));
  push("입찰보증금률", depositRate ? `${depositRate.replace(/%$/, "")}%` : "");
  push("입찰보증금", lowest && depositRateNum ? `${won(Math.round((lowest * depositRateNum) / 100))} (최저입찰가의 ${depositRateNum}%)` : "");
  push("대금납부", pick(meta, "totalamtUnpcDivNm"));
  push("채무정리기한", pick(meta, "dtbtRqrEdtmCont"));
  push("공동입찰", yesNo(pick(meta, "collbBidPsblYn"), "가능"));
  push("대리입찰", yesNo(pick(meta, "subtBidPsblYn"), "가능"));
  // 공고기관 — 정보제공처(온비드 고객센터 연락처)는 담지 않는다
  push(isPublicSale ? "관리번호" : "사건번호", pick(meta, "cltrMngNo", "cltr_mng_no", "case_no", "caseNo"));
  push("공고번호", pick(meta, "onbidPbancNo", "pbctNo"));
  push(isPublicSale ? "집행기관" : "관할법원", pick(meta, "orgNm", "org_nm", "court", "court_name"));
  push("의뢰기관", pick(meta, "rqstOrgNm"));
  push("담당부점", pick(meta, "sbOfcNm", "sb_ofc_nm"));

  // 인근 시세 — 공실열람 인근시세 탭과 같은 범위(반경 500m, 경매 제외 공실뉴스 매물).
  // 금액은 원 단위로 저장돼 있고, 매매가·보증금이 한 칸에 섞이지 않게 거래 유형별로 나눠 평균을 낸다.
  const nearbyLines: string[] = [];
  if (v.lat && v.lng) {
    try {
      const admin = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const dLat = 500 / 111000;
      const dLng = 500 / (111000 * Math.cos((v.lat * Math.PI) / 180));
      const { data } = await admin
        .from("vacancies")
        .select("lat, lng, deposit, monthly_rent, trade_type")
        .eq("status", "ACTIVE")
        .gte("lat", v.lat - dLat).lte("lat", v.lat + dLat)
        .gte("lng", v.lng - dLng).lte("lng", v.lng + dLng)
        .neq("trade_type", "경매")
        .limit(500);
      const within = (data || []).filter((row: any) => {
        if (!row.lat || !row.lng) return false;
        const y = (row.lat - v.lat) * 111000;
        const x = (row.lng - v.lng) * 111000 * Math.cos((v.lat * Math.PI) / 180);
        return Math.sqrt(x * x + y * y) <= 500;
      });
      const avg = (rows: any[], key: string) => Math.round(rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0) / rows.length);
      for (const trade of ["매매", "전세", "월세"]) {
        const rows = within.filter((r: any) => r.trade_type === trade && Number(r.deposit) > 0);
        if (!rows.length) continue;
        if (trade === "매매") nearbyLines.push(`매매 ${rows.length}건 평균 ${manwon(avg(rows, "deposit"))}`);
        if (trade === "전세") nearbyLines.push(`전세 ${rows.length}건 평균 보증금 ${manwon(avg(rows, "deposit"))}`);
        if (trade === "월세") nearbyLines.push(`월세 ${rows.length}건 평균 보증금 ${manwon(avg(rows, "deposit"))} · 월세 ${manwon(avg(rows, "monthly_rent"))}`);
      }
    } catch (e) {
      console.warn("[auction-source] 인근 시세 계산 실패", e);
    }
  }
  push("인근 공실뉴스 등록 매물(반경 500m, 종류 무관)", nearbyLines.join(" / "));

  const images = (Array.isArray(v.images) && v.images.length
    ? v.images
    : (v.vacancy_photos || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((p: any) => p.url)
  ).filter(Boolean);

  return NextResponse.json(
    {
      success: true,
      id: v.id,
      saleKind,
      title: pick(meta, "onbidCltrNm") || text(v.title) || address,
      priceText: lowest ? `최저입찰가 ${manwon(lowest)}${appraisal ? ` (감정가 ${manwon(appraisal)})` : ""}` : "",
      detailPath: `/gongsil/detail/${v.id}`,
      location: [v.sido, v.sigungu, v.dong].map(text).filter(Boolean).join(" "),
      propertyType: info.category || text(v.property_type),
      facts,
      images,
    },
    { headers: { ...corsHeaders, "Cache-Control": "no-store" } }
  );
}
