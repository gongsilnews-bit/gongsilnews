import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ReelAgency, ReelFacts } from "./types";

export function reelsAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 서비스 키가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// 영상·AI 어디에도 넘기지 않는 칸: client_*, landlord_*, hosu, detail_addr, apt_dong, 중개보수 관련.
// 아래 SELECT 에 아예 넣지 않아 실수로 흘러갈 길을 막는다.
const SAFE_COLUMNS = [
  "id", "vacancy_no", "owner_id", "property_type", "sub_category", "trade_type",
  "deposit", "monthly_rent", "maintenance_fee", "exclusive_m2", "exclusive_py",
  "room_count", "bath_count", "direction", "current_floor", "total_floor", "parking",
  "move_in_date", "options", "sigungu", "dong", "description", "infrastructure", "status",
].join(",");

const PHONE_RE = /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g;

export interface ReelListing {
  vacancyId: string;
  ownerId: string;
  facts: ReelFacts;
  agency: ReelAgency | null;
  photoUrls: string[];
}

export async function loadReelListing(vacancyId: string): Promise<ReelListing> {
  const db = reelsAdminClient();
  const { data: v, error } = await db.from("vacancies").select(SAFE_COLUMNS).eq("id", vacancyId).single();
  if (error || !v) throw new Error("매물을 찾을 수 없습니다.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SAFE_COLUMNS 로 고른 동적 select 결과
  const row = v as unknown as Record<string, any>;

  const { data: photos } = await db
    .from("vacancy_photos")
    .select("url, sort_order")
    .eq("vacancy_id", vacancyId)
    .order("sort_order", { ascending: true });

  const { data: agencyRow } = await db
    .from("agencies")
    .select("name, ceo_name, reg_num, address, phone, cell, status")
    .eq("owner_id", row.owner_id)
    .eq("status", "APPROVED")
    .maybeSingle();

  const infra = (row.infrastructure || {}) as Record<string, string[]>;
  // "3" → "3층", "중층" 처럼 이미 층이 붙은 값은 그대로 ("중층층" 방지)
  const 층 = (v: unknown) => (/층$/.test(String(v).trim()) ? String(v).trim() : `${String(v).trim()}층`);
  const floor = row.current_floor ? `${층(row.current_floor)}${row.total_floor ? ` / ${층(row.total_floor)}` : ""}` : null;
  const isResidential = typeof row.room_count === "number" && row.room_count > 0;

  const facts: ReelFacts = {
    vacancyNo: row.vacancy_no,
    area: [row.sigungu, row.dong].filter(Boolean).join(" "),
    type: row.sub_category || row.property_type || "매물",
    trade: row.trade_type || "",
    deposit: Number(row.deposit) || 0,
    monthlyRent: Number(row.monthly_rent) || 0,
    maintenanceFee: Number(row.maintenance_fee) || 0,
    exclusiveM2: row.exclusive_m2 != null ? Number(row.exclusive_m2) : null,
    exclusivePy: row.exclusive_py != null ? Number(row.exclusive_py) : null,
    floor,
    rooms: isResidential ? `방 ${row.room_count} · 욕실 ${row.bath_count ?? 1}` : null,
    direction: row.direction || null,
    parking: row.parking && row.parking !== "없음" ? `주차 ${row.parking}` : null,
    moveIn: row.move_in_date ? (row.move_in_date.includes("입주") ? row.move_in_date : `${row.move_in_date} 입주`) : null,
    options: Array.isArray(row.options) ? row.options.filter(Boolean) : [],
    transit: (infra["지하철역"] || []).slice(0, 3), // 화면 역 이름표와 AI 대사가 같은 목록을 쓰도록 3개만
    description: String(row.description || "").replace(PHONE_RE, "").slice(0, 1500),
  };

  const agency: ReelAgency | null = agencyRow
    ? {
        name: agencyRow.name,
        ceo: agencyRow.ceo_name || null,
        regNum: agencyRow.reg_num || null,
        address: agencyRow.address || null,
        phone: agencyRow.phone || agencyRow.cell || null,
      }
    : null;

  return {
    vacancyId,
    ownerId: row.owner_id,
    facts,
    agency,
    photoUrls: (photos || []).map((p) => p.url).filter(Boolean),
  };
}
