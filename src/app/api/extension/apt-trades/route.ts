import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getExtensionMember } from "@/utils/extensionMember";
import {
  localMonths, parseError, parseRents, parseTotalCount, parseTrades, recentMonths, sameComplexName,
  summarizeComplex, summarizeLocal, type AptRent, type AptTrade,
} from "@/utils/aptTrades";

/**
 * 뉴스메이커(크롬 확장) — 국토부 아파트 실거래가로 "단지 시세" · "우리동네 시세" 자료 만들기
 *
 * GET ?mode=complex&q=대치 은마[&pick=1]   단지 이름 → 카카오로 위치·법정동 → 최근 12개월 매매 + 6개월 전월세
 * GET ?mode=local&q=대치동[&pick=1]        동 이름   → 카카오로 법정동·중심 좌표 → 최근 6개월 매매 + 3개월 전월세
 *
 * - 후보가 여러 개면 candidates 로 돌려주고 pick 번째를 계산한다 (작업창에서 바꿔 고른다).
 * - 숫자는 서버가 계산한다 (src/utils/aptTrades.ts). AI 는 이 숫자로 문장만 쓴다.
 * - 공공데이터 하루 호출 한도가 있어 "시군구·월" 단위로 캐시한다 — 같은 구의 다른 단지는 다시 부르지 않는다.
 * - 로그인 회원만 (호출 한도 보호).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: corsHeaders });

export async function OPTIONS() {
  return json({});
}

type Candidate = {
  name: string;        // 표시 이름 (단지명 또는 "서울 강남구 대치동")
  address: string;     // 지번 주소
  lawdCd: string;      // 시군구 5자리
  dong: string;        // 법정동 이름 (실거래 umdNm 과 같다)
  jibun: string;       // 단지 지번 (단지만)
  lat: number;
  lng: number;
};

/* ── 카카오 ── */
type KakaoAddress = {
  b_code?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
  main_address_no?: string;
  sub_address_no?: string;
};
type KakaoDoc = {
  x: string;
  y: string;
  place_name?: string;
  address_name?: string;
  category_name?: string;
  address?: KakaoAddress | null;
};

async function kakao(path: string, query: string) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("서버에 카카오 키가 없습니다 (KAKAO_REST_API_KEY).");
  const response = await fetch(`https://dapi.kakao.com/v2/local/search/${path}.json?query=${encodeURIComponent(query)}&size=10`, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`카카오 위치 검색 오류 (${response.status})`);
  return (await response.json()) as { documents: KakaoDoc[] };
}

/* 지번 주소 → 법정동 코드·지번 */
async function addressInfo(address: string) {
  const { documents } = await kakao("address", address);
  const doc = documents[0];
  const a = doc?.address;
  if (!a?.b_code) return null;
  return {
    lawdCd: String(a.b_code).slice(0, 5),
    dong: a.region_3depth_name || "",
    jibun: a.main_address_no ? `${a.main_address_no}${a.sub_address_no && a.sub_address_no !== "0" ? `-${a.sub_address_no}` : ""}` : "",
    lat: Number(doc.y),
    lng: Number(doc.x),
  };
}

const findComplexCandidates = unstable_cache(async (query: string): Promise<Candidate[]> => {
  const tries = /아파트/.test(query) ? [query] : [`${query} 아파트`, query];
  let places: KakaoDoc[] = [];
  for (const q of tries) {
    const { documents } = await kakao("keyword", q);
    places = documents.filter((d) => /아파트/.test(d.category_name || ""));
    if (places.length) break;
  }
  const out: Candidate[] = [];
  for (const place of places.slice(0, 5)) {
    if (!place.address_name) continue;
    const info = await addressInfo(place.address_name);
    if (!info) continue;
    out.push({ name: place.place_name || query, address: place.address_name, ...info, lat: Number(place.y), lng: Number(place.x) });
  }
  return out;
}, ["apt-complex-candidates"], { revalidate: 60 * 60 * 24 * 30 });

const findDongCandidates = unstable_cache(async (query: string): Promise<Candidate[]> => {
  const { documents } = await kakao("address", query);
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const doc of documents) {
    const a = doc.address;
    if (!a?.b_code || !a.region_3depth_name) continue;
    const name = [a.region_1depth_name, a.region_2depth_name, a.region_3depth_name].filter(Boolean).join(" ");
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, address: name, lawdCd: String(a.b_code).slice(0, 5), dong: a.region_3depth_name, jibun: "", lat: Number(doc.y), lng: Number(doc.x) });
  }
  return out.slice(0, 5);
}, ["apt-dong-candidates"], { revalidate: 60 * 60 * 24 * 30 });

/* ── 국토부 실거래가 (시군구·월 단위 캐시) ── */
async function molit(service: "Trade" | "Rent", lawdCd: string, ym: string): Promise<string[]> {
  const key = process.env.DATA_GO_KR_API_KEY;
  if (!key) throw new Error("서버에 공공데이터 키가 없습니다 (DATA_GO_KR_API_KEY).");
  const serviceKey = key.includes("%") ? key : encodeURIComponent(key);
  const pages: string[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = `https://apis.data.go.kr/1613000/RTMSDataSvcApt${service}/getRTMSDataSvcApt${service}` +
      `?serviceKey=${serviceKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
    const response = await fetch(url, { cache: "no-store" });
    const xml = await response.text();
    const error = parseError(xml);
    if (error) throw new Error(`국토부 실거래가 조회 오류: ${error}`);
    pages.push(xml);
    if (parseTotalCount(xml) <= page * 1000) break;
  }
  return pages;
}

/* 지난 달들은 거의 안 바뀐다 — 최근 2개월만 하루, 그 전은 1주일 */
const cachedMonth = (service: "Trade" | "Rent", lawdCd: string, ym: string, fresh: boolean) =>
  unstable_cache(() => molit(service, lawdCd, ym), [`molit-${service}-${lawdCd}-${ym}`], {
    revalidate: fresh ? 60 * 60 * 24 : 60 * 60 * 24 * 7,
  })();

async function loadMonths<T>(service: "Trade" | "Rent", lawdCd: string, months: string[], parse: (xml: string) => T[]) {
  const fresh = new Set(months.slice(0, 2));
  const results = await Promise.all(months.map((ym) => cachedMonth(service, lawdCd, ym, fresh.has(ym))));
  return results.flat().flatMap(parse);
}

/* 단지 거래 고르기 — 같은 법정동 + 지번이 같으면 확실, 지번이 없으면 이름으로 */
function pickComplex<T extends AptTrade | AptRent>(list: T[], c: Candidate): T[] {
  const inDong = list.filter((item) => item.dong === c.dong);
  const byJibun = c.jibun ? inDong.filter((item) => item.jibun === c.jibun) : [];
  return byJibun.length ? byJibun : inDong.filter((item) => sameComplexName(item.name, c.name));
}

export async function GET(req: NextRequest) {
  try {
    const member = await getExtensionMember(req);
    if (!member) return json({ success: false, error: "공실뉴스에 로그인하면 실거래가 자료를 불러올 수 있습니다." }, 401);

    const params = req.nextUrl.searchParams;
    const mode = params.get("mode") === "local" ? "local" : "complex";
    const query = String(params.get("q") || "").trim().slice(0, 60);
    const pick = Math.max(0, Number(params.get("pick") || 0) || 0);
    if (query.length < 2) {
      return json({ success: false, error: mode === "local" ? "동 이름을 입력해 주세요 (예: 대치동, 강남구 대치동)." : "단지 이름을 입력해 주세요 (예: 대치 은마)." }, 400);
    }

    const candidates = mode === "local" ? await findDongCandidates(query) : await findComplexCandidates(query);
    if (!candidates.length) {
      return json({ success: false, error: mode === "local" ? `"${query}" 동을 찾지 못했습니다. 구 이름과 함께 입력해 보세요 (예: 강남구 대치동).` : `"${query}" 아파트를 찾지 못했습니다. 동 이름과 함께 입력해 보세요 (예: 대치동 은마).` }, 404);
    }
    const target = candidates[Math.min(pick, candidates.length - 1)];

    if (mode === "complex") {
      const [allTrades, allRents] = await Promise.all([
        loadMonths("Trade", target.lawdCd, recentMonths(12), parseTrades),
        loadMonths("Rent", target.lawdCd, recentMonths(6), parseRents),
      ]);
      const trades = pickComplex(allTrades, target);
      const rents = pickComplex(allRents, target);
      return json({
        success: true,
        mode,
        candidates,
        picked: candidates.indexOf(target),
        target,
        complexName: trades[0]?.name || target.name,
        period: "최근 12개월 매매 · 6개월 전월세 (국토교통부 실거래가 신고 기준)",
        summary: summarizeComplex(trades, rents),
      });
    }

    const months = localMonths();
    const [allTrades, allRents] = await Promise.all([
      loadMonths("Trade", target.lawdCd, months.all, parseTrades),
      loadMonths("Rent", target.lawdCd, months.recent, parseRents),
    ]);
    const trades = allTrades.filter((t) => t.dong === target.dong);
    const rents = allRents.filter((r) => r.dong === target.dong);
    return json({
      success: true,
      mode,
      candidates,
      picked: candidates.indexOf(target),
      target,
      period: "신고가 끝난 최근 3개월과 그 전 3개월 비교 — 이번 달·지난달은 신고 진행 중이라 뺌 (국토교통부 실거래가 신고 기준)",
      summary: summarizeLocal(trades, rents),
    });
  } catch (err) {
    console.error("실거래가 자료 오류:", err);
    return json({ success: false, error: err instanceof Error ? err.message : "실거래가 자료를 불러오지 못했습니다." }, 500);
  }
}
