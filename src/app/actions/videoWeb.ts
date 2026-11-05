"use server";

/**
 * 웹 동영상studio — 공실 하나를 영상 재료로 (2026-11-05 사장님: "공실 사진과 정보로 쉽고 빠르게")
 *  사진 주소 + 화면에 넣을 글(자막) + 마지막 사무소 화면(법정 표시)
 *  호수·상세주소·의뢰인·임대인 연락처는 SELECT 에 넣지 않는다 (영상·AI 어디에도 흘러가지 않게)
 *  본인 공실만 (최고관리자는 모두)
 */
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";

const SAFE = [
  "id", "vacancy_no", "owner_id", "property_type", "sub_category", "trade_type", "building_name",
  "deposit", "monthly_rent", "maintenance_fee", "exclusive_m2", "room_count", "bath_count",
  "direction", "current_floor", "total_floor", "parking", "move_in_date", "options", "themes",
  "sido", "sigungu", "dong",
].join(",");

export type VideoVacancy = {
  id: string;
  title: string;
  photos: string[];
  /** 첫 장면 — 동네·종류 / 거래·가격 */
  intro: { place: string; kind: string; price: string };
  /** 사진마다 넣을 자막 (사진보다 적으면 남는 사진은 자막 없이) */
  captions: string[];
  /** 마지막 화면 — 사무소 (공인중개사법 표시·광고 항목) */
  outro: { name: string; lines: string[] } | null;
  /** 끝 장면 부동산 표시광고 칸 — 상호·대표·등록번호·소재지·연락처 (빈 값은 빈칸, 지어내지 않음) */
  agency: { name: string; ceo: string; regNum: string; address: string; phone: string } | null;
  /** 표시광고 매물 정보 (엔터로 줄) */
  listing: string;
  /** 동 이름 — 그 동네 드론 영상 찾기 */
  dong: string;
};

/** 원 → "5억 3,000만" · "5,000만" · "100만" (DB 금액은 원 단위) */
function won(v: number) {
  const m = Math.round((Number(v) || 0) / 10000); // 만원
  if (!m) return "";
  const eok = Math.floor(m / 10000), man = m % 10000;
  return eok ? `${eok}억${man ? ` ${man.toLocaleString("ko-KR")}만` : ""}` : `${man.toLocaleString("ko-KR")}만`;
}
const floorOf = (v: unknown) => (/층$/.test(String(v).trim()) ? String(v).trim() : `${String(v).trim()}층`);

export async function getVideoVacancy(vacancyId: string): Promise<{ success: true; data: VideoVacancy } | { success: false; error: string }> {
  if (!/^[\w-]{8,64}$/.test(String(vacancyId || ""))) return { success: false, error: "공실을 다시 골라 주세요." };
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const db = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: v } = await db.from("vacancies").select(SAFE).eq("id", vacancyId).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 동적 select
  const row = v as unknown as Record<string, any> | null;
  if (!row) return { success: false, error: "공실을 찾지 못했어요." };
  if (row.owner_id !== user.id) {
    const { data: me } = await db.from("members").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "ADMIN") return { success: false, error: "내 공실만 영상으로 만들 수 있어요." };
  }

  const { data: ph } = await db.from("vacancy_photos").select("url, sort_order").eq("vacancy_id", vacancyId).order("sort_order", { ascending: true });
  const photos = (ph || []).map((p) => p.url as string).filter(Boolean);

  const kind = String(row.sub_category || row.property_type || "매물");
  const trade = String(row.trade_type || "");
  const dep = Number(row.deposit) || 0, rent = Number(row.monthly_rent) || 0;
  const price = trade === "월세" || trade === "단기임대" ? `${trade} ${won(dep)} / ${won(rent)}` : `${trade} ${won(dep)}`.trim();
  const place = [row.sigungu, row.dong].filter(Boolean).join(" ");

  const caps: string[] = [];
  if (row.exclusive_m2) caps.push(`전용 ${Number(row.exclusive_m2)}㎡ (${Math.round(Number(row.exclusive_m2) / 3.3058)}평)`);
  if (typeof row.room_count === "number" && row.room_count > 0) caps.push(`방 ${row.room_count} · 욕실 ${row.bath_count ?? 1}`);
  // 층 — 0·빈 값은 빼고 ("중층 / 0층" 이 나오던 것)
  const okFloor = (v: unknown) => v != null && String(v).trim() !== "" && String(v).trim() !== "0";
  if (okFloor(row.current_floor)) caps.push(`${floorOf(row.current_floor)}${okFloor(row.total_floor) ? ` / ${floorOf(row.total_floor)}` : ""}${row.direction ? ` · ${row.direction}` : ""}`);
  else if (row.direction) caps.push(String(row.direction));
  if (Number(row.maintenance_fee)) caps.push(`관리비 ${won(Number(row.maintenance_fee))}원`);
  if (row.parking && row.parking !== "없음") caps.push(`주차 ${row.parking}`);
  if (row.move_in_date) caps.push(String(row.move_in_date).includes("입주") ? String(row.move_in_date) : `${row.move_in_date} 입주`);
  const opts = (Array.isArray(row.options) ? row.options : []).filter(Boolean).slice(0, 4);
  if (opts.length) caps.push(opts.join(" · "));
  const themes = (Array.isArray(row.themes) ? row.themes : []).filter(Boolean).slice(0, 3).map((t: string) => (t.startsWith("#") ? t : `#${t}`));
  if (themes.length) caps.push(themes.join(" "));

  const { data: ag } = await db.from("agencies").select("name, ceo_name, reg_num, address, phone, cell").eq("owner_id", row.owner_id).eq("status", "APPROVED").maybeSingle();
  const outro = ag
    ? {
        name: String(ag.name || ""),
        lines: [
          [ag.ceo_name && `대표 ${ag.ceo_name}`, ag.reg_num && `등록번호 ${ag.reg_num}`].filter(Boolean).join(" · "),
          String(ag.address || ""),
          String(ag.phone || ag.cell || ""),
        ].filter(Boolean),
      }
    : null;

  const area = row.exclusive_m2 ? `${Number(row.exclusive_m2)}㎡` : "";
  const fl = okFloor(row.current_floor) ? `${floorOf(row.current_floor)}${okFloor(row.total_floor) ? `/총 ${floorOf(row.total_floor)}` : ""}` : "";
  const listing = [
    [row.dong, kind, price, area].filter(Boolean).join(" · "),
    [fl, row.direction, row.move_in_date ? (String(row.move_in_date).includes("입주") ? String(row.move_in_date) : `${row.move_in_date} 입주`) : ""].filter(Boolean).join(" · "),
  ].filter(Boolean).join("\n");
  const agency = ag ? { name: String(ag.name || ""), ceo: String(ag.ceo_name || ""), regNum: String(ag.reg_num || ""), address: String(ag.address || ""), phone: String(ag.phone || ag.cell || "") } : null;

  return {
    success: true,
    data: {
      id: String(row.id),
      title: `${place} ${row.building_name || kind}`.trim(),
      photos,
      intro: { place, kind, price },
      captions: caps,
      outro,
      agency,
      listing,
      dong: String(row.dong || ""),
    },
  };
}
