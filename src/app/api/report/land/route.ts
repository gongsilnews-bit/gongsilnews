import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";

/**
 * AI 매물보고서 — 지적도 · 건축물대장 쪽 (2026-10-24 사장님: 로드맵 뒤에 넣기)
 *  GET ?lat=&lng=  (공실 좌표)
 *   1) 카카오로 그 자리의 지번(본번·부번·산)과 법정동 코드
 *   2) 공공데이터포털 건축물대장 표제부 (DATA_GO_KR_API_KEY) — 실제 값만, 없는 칸은 비운다
 *   3) 브이월드 연속지적도 (VWORLD_API_KEY 가 있을 때만) — 그 필지와 둘레 필지 경계·지번
 *  로그인한 회원만 (키를 남이 쓰지 못하게).
 */
export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !lat || !lng) return NextResponse.json({ ok: false, error: "공실 위치(좌표)가 없어요." }, { status: 400 });

  // 1) 지번 · 법정동 코드
  const kakao = (path: string) =>
    fetch(`https://dapi.kakao.com/v2/local/geo/${path}?x=${lng}&y=${lat}`, { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } }).then((r) => r.json());
  const [addr, region] = await Promise.all([kakao("coord2address.json"), kakao("coord2regioncode.json")]).catch(() => [null, null]);
  const a = addr?.documents?.[0]?.address;
  const road = addr?.documents?.[0]?.road_address?.address_name || "";
  const bcode: string = (region?.documents || []).find((d: { region_type: string }) => d.region_type === "B")?.code || "";
  if (!a || bcode.length !== 10) return NextResponse.json({ ok: false, error: "이 위치의 지번을 찾지 못했어요." });
  const mountain = a.mountain_yn === "Y";
  const bun = String(a.main_address_no || 0).padStart(4, "0");
  const ji = String(a.sub_address_no || 0).padStart(4, "0");
  const pnu = `${bcode}${mountain ? "2" : "1"}${bun}${ji}`;
  const jibunAddr = a.address_name || "";

  // 아파트·오피스텔인가 (화면이 공실 종류·동·호를 함께 보낸다)
  const multiUnit = /아파트|오피스텔/.test(`${sp.get("sub") || ""} ${sp.get("type") || ""}`);
  const unitDong = String(sp.get("dong") || ""), unitHo = String(sp.get("ho") || "");
  let complex: Record<string, unknown> | null = null;
  let unit: Record<string, unknown> | null = null;

  // 2) 건축물대장 표제부 (여러 동이면 주건축물 먼저)
  let buildings: Record<string, unknown>[] = [];
  let buildingError = "";
  const key = process.env.DATA_GO_KR_API_KEY;
  if (key) {
    try {
      const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${key}&sigunguCd=${bcode.slice(0, 5)}&bjdongCd=${bcode.slice(5)}&platGbCd=${mountain ? 1 : 0}&bun=${bun}&ji=${ji}&numOfRows=100&pageNo=1&_type=json`;
      const j = await fetch(url).then((r) => r.json());
      const items = j?.response?.body?.items?.item;
      const list = (Array.isArray(items) ? items : items ? [items] : []) as Record<string, unknown>[];
      const s = (v: unknown) => String(v ?? "").trim();
      const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
      buildings = list
        .sort((x, y) => Number(s(x.mainAtchGbCd) !== "0") - Number(s(y.mainAtchGbCd) !== "0"))
        .map((b) => ({
          name: s(b.bldNm) || s(b.dongNm),
          dong: s(b.dongNm), // 아파트 동 (예: 101동)
          kind: s(b.regstrKindCdNm), // 일반건축물 · 집합건축물
          mainAtch: s(b.mainAtchGbCdNm), // 주건축물 · 부속건축물
          purpose: s(b.mainPurpsCdNm),
          etcPurpose: s(b.etcPurps),
          structure: s(b.strctCdNm),
          roof: s(b.roofCdNm),
          platArea: n(b.platArea), // 대지면적
          archArea: n(b.archArea), // 건축면적
          totArea: n(b.totArea), // 연면적
          bcRat: n(b.bcRat), // 건폐율
          vlRat: n(b.vlRat), // 용적률
          height: n(b.heit),
          grndFlr: n(b.grndFlrCnt),
          ugrndFlr: n(b.ugrndFlrCnt),
          households: n(b.hhldCnt),
          families: n(b.fmlyCnt),
          elevators: (n(b.rideUseElvtCnt) || 0) + (n(b.emgenUseElvtCnt) || 0),
          parking: ["indrMechUtcnt", "oudrMechUtcnt", "indrAutoUtcnt", "oudrAutoUtcnt"].reduce((t, k) => t + (Number(b[k]) || 0), 0),
          permitDay: s(b.pmsDay),
          useAprDay: s(b.useAprDay),
        }));
      if (!buildings.length) buildingError = "이 지번에 등록된 건축물대장이 없어요 (나대지이거나 대장이 다른 지번에 있을 수 있어요).";
    } catch {
      buildingError = "건축물대장을 가져오지 못했어요. 잠시 뒤 다시 눌러 주세요.";
    }
    // 아파트·오피스텔 (2026-10-24 사장님) — 단지 전체(총괄표제부) + 이 매물 호실(전유·공용 면적)
    if (multiUnit) {
      const q = `serviceKey=${key}&sigunguCd=${bcode.slice(0, 5)}&bjdongCd=${bcode.slice(5)}&platGbCd=${mountain ? 1 : 0}&bun=${bun}&ji=${ji}&_type=json`;
      const list = async (op: string, extra = "") => {
        const j = await fetch(`https://apis.data.go.kr/1613000/BldRgstHubService/${op}?${q}${extra}&numOfRows=100&pageNo=1`).then((r) => r.json());
        const it = j?.response?.body?.items?.item;
        return (Array.isArray(it) ? it : it ? [it] : []) as Record<string, unknown>[];
      };
      const s = (v: unknown) => String(v ?? "").trim();
      const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
      try {
        const r = (await list("getBrRecapTitleInfo"))[0];
        if (r) complex = {
          name: s(r.bldNm), households: n(r.hhldCnt), families: n(r.fmlyCnt), units: n(r.hoCnt), dongs: n(r.mainBldCnt),
          platArea: n(r.platArea), archArea: n(r.archArea), totArea: n(r.totArea), bcRat: n(r.bcRat), vlRat: n(r.vlRat),
          parking: n(r.totPkngCnt), purpose: s(r.mainPurpsCdNm), useAprDay: s(r.useAprDay),
        };
      } catch { /* 없으면 동 대장만 */ }
      // 이 매물 호실 — 공실등록의 동·호 (예: "101" · "406" → 101동 406)
      const dongNo = unitDong.replace(/[^0-9A-Za-z가-힣]/g, "").replace(/동$/, "");
      const hoNo = unitHo.replace(/[^0-9A-Za-z]/g, "");
      if (hoNo) {
        try {
          // 호 이름 적는 방식이 건물마다 다르다 (예: "2601" · "B동805호") → 마지막 숫자 묶음으로 맞추고, 동은 동 칸이나 호 이름 앞부분으로
          const hoDigits = (h: string) => ((h.match(/\d+/g) || []).pop() || "");
          const sameUnit = (x: Record<string, unknown>) => {
            const hn = s(x.hoNm);
            if (hoDigits(hn) !== hoDigits(hoNo)) return false;
            if (!dongNo) return true;
            const dn = s(x.dongNm).replace(/동$/, "");
            const inHo = (hn.match(/^([0-9A-Za-z가-힣]+)동/) || [])[1] || "";
            return dn === dongNo || inHo === dongNo;
          };
          const tries: (() => Promise<Record<string, unknown>[]>)[] = [
            ...(dongNo ? [`${dongNo}동`, dongNo] : []).map((d) => () => list("getBrExposPubuseAreaInfo", `&dongNm=${encodeURIComponent(d)}&hoNm=${encodeURIComponent(hoDigits(hoNo))}`)),
            // 동 없이·이름이 달라 못 찾으면 — 건물 전체를 훑는다 (최대 3,000줄)
            async () => {
              const all: Record<string, unknown>[] = [];
              for (let page = 1; page <= 3; page++) {
                const j = await fetch(`https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?${q}&numOfRows=1000&pageNo=${page}`).then((r) => r.json());
                const it = j?.response?.body?.items?.item;
                const rows = (Array.isArray(it) ? it : it ? [it] : []) as Record<string, unknown>[];
                all.push(...rows);
                if (rows.length < 1000) break;
              }
              return all;
            },
          ];
          for (const run of tries) {
            const mine = (await run()).filter(sameUnit);
            // 같은 번호가 여러 동에 있으면(A동·B동 1406호) 어느 것인지 몰라 넣지 않는다
            if (!mine.length || new Set(mine.map((x) => `${s(x.dongNm)}|${s(x.hoNm)}`)).size > 1) continue;
            const ex = mine.filter((x) => s(x.exposPubuseGbCdNm) === "전유");
            const pub = mine.filter((x) => s(x.exposPubuseGbCdNm) === "공용");
            const sum = (xs: Record<string, unknown>[]) => Math.round(xs.reduce((t, x) => t + (Number(x.area) || 0), 0) * 100) / 100;
            unit = {
              dong: s(mine[0].dongNm), ho: s(mine[0].hoNm), floor: s(ex[0]?.flrNoNm || mine[0].flrNoNm),
              purpose: s(ex[0]?.mainPurpsCdNm), etcPurpose: s(ex[0]?.etcPurps), structure: s(ex[0]?.strctCdNm),
              exclusive: ex.length ? sum(ex) : null, common: pub.length ? sum(pub) : null,
            };
            break;
          }
        } catch { /* 호실 없이 */ }
      }
      // 매물이 있는 동을 맨 앞에
      if (dongNo) buildings.sort((a, b) => Number(String(b.dong).replace(/동$/, "") === dongNo) - Number(String(a.dong).replace(/동$/, "") === dongNo));
    }
  } else buildingError = "건축물대장 키(DATA_GO_KR_API_KEY)가 서버에 없어요.";

  // 3) 연속지적도 — 그 필지 둘레 약 120m 안 필지들 (경계 · 지번)
  let parcels: { pnu: string; jibun: string; rings: number[][][] }[] = [];
  let cadastralError = "";
  let zones: { name: string; rings: number[][][] }[] = [];
  let landChar: { year: string; jimok: string; area: number | null; zoning: string; price: number | null; road: string; terrain: string; use: string } | null = null;
  const vkey = process.env.VWORLD_API_KEY;
  if (vkey) {
    try {
      const dLat = 0.0011, dLng = 0.0014;
      const box = `BOX(${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat})`;
      const domain = process.env.VWORLD_DOMAIN ? `&domain=${encodeURIComponent(process.env.VWORLD_DOMAIN)}` : "";
      const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${vkey}${domain}&geomFilter=${encodeURIComponent(box)}&size=1000&page=1&format=json&crs=EPSG:4326&geometry=true&attribute=true`;
      const j = await fetch(url).then((r) => r.json());
      if (j?.response?.status !== "OK") throw new Error(j?.response?.error?.text || "지적도 응답 없음");
      const feats = j.response.result?.featureCollection?.features || [];
      parcels = feats.map((f: { properties: Record<string, string>; geometry: { type: string; coordinates: number[][][] | number[][][][] } }) => ({
        pnu: String(f.properties.pnu || ""),
        jibun: String(f.properties.jibun || ""),
        rings: f.geometry.type === "MultiPolygon" ? (f.geometry.coordinates as number[][][][]).flat() : (f.geometry.coordinates as number[][][]),
      }));
    } catch (e) {
      cadastralError = `지적도를 가져오지 못했어요 (${e instanceof Error ? e.message : String(e)}).`;
    }
    // 용도지역 경계 — 지적편집도처럼 필지 아래 색을 칠한다 (주거=노랑, 상업=분홍, 공업=보라, 녹지=초록 · 2026-10-24 사장님)
    try {
      const dLat = 0.0011, dLng = 0.0014;
      const box = `BOX(${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat})`;
      const domain = process.env.VWORLD_DOMAIN ? `&domain=${encodeURIComponent(process.env.VWORLD_DOMAIN)}` : "";
      const j = await fetch(`https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_UQ111&key=${vkey}${domain}&geomFilter=${encodeURIComponent(box)}&size=200&page=1&format=json&crs=EPSG:4326&geometry=true&attribute=true`).then((r) => r.json());
      if (j?.response?.status === "OK") {
        zones = (j.response.result?.featureCollection?.features || []).map((f: { properties: Record<string, string>; geometry: { type: string; coordinates: number[][][] | number[][][][] } }) => ({
          name: String(f.properties.uname || ""),
          rings: f.geometry.type === "MultiPolygon" ? (f.geometry.coordinates as number[][][][]).flat() : (f.geometry.coordinates as number[][][]),
        }));
      }
    } catch { /* 색 없이 경계만 */ }
    // 토지 특성 — 용도지역 · 개별공시지가 · 도로 접면 · 지형 · 이용 상황 (최근 해부터)
    try {
      const domain = process.env.VWORLD_DOMAIN ? `&domain=${encodeURIComponent(process.env.VWORLD_DOMAIN)}` : "";
      const y = new Date().getFullYear();
      for (const yr of [y, y - 1, y - 2]) {
        const j = await fetch(`https://api.vworld.kr/ned/data/getLandCharacteristics?key=${vkey}${domain}&pnu=${pnu}&stdrYear=${yr}&format=json&numOfRows=10&pageNo=1`).then((r) => r.json());
        const f = (j?.landCharacteristicss?.field || []).find((x: Record<string, string>) => x.pnu === pnu) || j?.landCharacteristicss?.field?.[0];
        if (!f) continue;
        const s = (v: unknown) => { const t = String(v ?? "").trim(); return t === "지정되지않음" ? "" : t; };
        landChar = {
          year: s(f.stdrYear), jimok: s(f.lndcgrCodeNm), area: Number(f.lndpclAr) || null,
          zoning: [s(f.prposArea1Nm), s(f.prposArea2Nm)].filter(Boolean).join(" · "),
          price: Number(f.pblntfPclnd) || null, road: s(f.roadSideCodeNm),
          terrain: [s(f.tpgrphHgCodeNm), s(f.tpgrphFrmCodeNm)].filter(Boolean).join(" · "), use: s(f.ladUseSittnNm),
        };
        break;
      }
    } catch { /* 표에서 빼고 넘어간다 */ }
  } else cadastralError = "지적도는 브이월드 인증키(VWORLD_API_KEY)를 넣으면 나와요.";

  return NextResponse.json({
    ok: true,
    pnu,
    jibunAddr,
    roadAddr: road,
    center: [lng, lat],
    buildings,
    multiUnit,
    complex,
    unit,
    buildingError,
    parcels,
    zones,
    landChar,
    cadastralError,
    fetchedAt: new Date().toISOString(),
  });
}
