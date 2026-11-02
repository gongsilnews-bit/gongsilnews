/**
 * 경매·공매 물건 → 시세 지도 단지 (2026-11-02 사장님: 단지별로 경매 나온 것도 함께)
 *  경매 자료 좌표는 틀린 것이 있어(시흥 물건이 서울에 찍힘) 거리로 맞추지 않는다.
 *  주소 글 "서울특별시 강남구 압구정동 481 외 …"에서 구·동·지번을 읽어 단지 번호와 정확히 같을 때만 붙인다.
 *  도로명("구로구 경인로 233 …")이면 카카오 주소 검색으로 지번을 찾아 붙인다.
 *  맞춘 결과는 vacancies.complex_id 에 저장 — 새 물건만 다시 맞춘다 (크론 step=auctions)
 */
import { db } from "@/utils/aptMap";
import { LAWD_NAMES } from "@/utils/aptMapShared";

type Parsed = { lawd: string; gu: string; dong?: string; road?: string; jibun?: string; num?: string };

/** "서울특별시 강남구 압구정동 481 외 2필지 …" / "서울특별시 구로구 경인로 233 …" */
export function parseAuctionAddress(text: string): Parsed | null {
  const m = String(text || "").match(/^(\S+?(?:특별시|광역시|특별자치시|도))\s+(\S+[구군시])\s+(\S+)\s+(산\s*)?(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return null;
  const [, sido, gu, area, mountain, main, sub] = m;
  const lawd = Object.entries(LAWD_NAMES).find(([, name]) => name === `${sido} ${gu}`)?.[0];
  if (!lawd) return null;
  const number = `${Number(main)}${sub && Number(sub) ? `-${Number(sub)}` : ""}`;
  if (/(로|길)$/.test(area) && !/\d가$/.test(area)) return { lawd, gu, road: area, num: number };
  if (/(동|가|리)$/.test(area)) return { lawd, gu, dong: area, jibun: `${mountain ? "산" : ""}${number}` };
  return null;
}

/** 도로명 → 법정동·지번 (카카오). 못 찾으면 null */
async function roadToJibun(sidoGu: string, road: string, num: string) {
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(`${sidoGu} ${road} ${num}`)}&size=1`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, cache: "no-store",
  }).then((r) => r.json()).catch(() => null);
  const a = res?.documents?.[0]?.address;
  if (!a?.region_3depth_name || !a.main_address_no) return null;
  return {
    dong: String(a.region_3depth_name).trim(),
    jibun: `${a.mountain_yn === "Y" ? "산" : ""}${Number(a.main_address_no)}${a.sub_address_no && Number(a.sub_address_no) ? `-${Number(a.sub_address_no)}` : ""}`,
  };
}

/** 시군구 하나의 아파트·오피스텔 경매·공매 중 단지 번호가 없는 것을 맞춘다 */
export async function matchAuctions(lawd: string) {
  const name = LAWD_NAMES[lawd];
  if (!name) return { checked: 0, matched: 0, road: 0 };
  const supabase = db();
  const { data: rows } = await supabase.from("vacancies")
    .select("id, building_name")
    .eq("trade_type", "경매").eq("status", "ACTIVE").eq("property_type", "아파트·오피스텔")
    .is("complex_id", null).like("building_name", `${name} %`).limit(1000);
  const { data: cs } = await supabase.from("apt_complexes").select("id").eq("lawd_cd", lawd).limit(5000);
  const ids = new Set((cs || []).map((c) => c.id as string));
  const roadCache = new Map<string, { dong: string; jibun: string } | null>();
  let matched = 0, road = 0;
  for (const v of rows || []) {
    const p = parseAuctionAddress(v.building_name);
    if (!p) continue;
    let dong = p.dong, jibun = p.jibun;
    if (p.road) {
      const key = `${p.road} ${p.num}`;
      if (!roadCache.has(key)) roadCache.set(key, await roadToJibun(name, p.road, p.num!));
      const hit = roadCache.get(key);
      if (!hit) continue;
      dong = hit.dong; jibun = hit.jibun;
    }
    // 이름에 오피스텔·업무시설이 있으면 오피스텔 먼저 (주상복합은 같은 지번에 둘 다 있다)
    const offiFirst = /오피스텔|업무시설/.test(v.building_name);
    const order = offiFirst ? [`o:${lawd}:${dong}:${jibun}`, `${lawd}:${dong}:${jibun}`] : [`${lawd}:${dong}:${jibun}`, `o:${lawd}:${dong}:${jibun}`];
    const cid = order.find((x) => ids.has(x));
    if (!cid) continue;
    await supabase.from("vacancies").update({ complex_id: cid }).eq("id", v.id);
    matched++;
    if (p.road) road++;
  }
  return { checked: (rows || []).length, matched, road };
}
