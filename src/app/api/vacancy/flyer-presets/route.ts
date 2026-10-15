import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/*
 * 유리창홍보지 "내 디자인" 3칸 — 회원 계정(members.flyer_presets)에 저장·불러오기.
 * 본인 것만 읽고 쓴다. 칸 하나는 홍보지 배치(디자인·색·방향·요소 위치/크기/색/폰트·넣은 글자/이미지)이고
 * 매물마다 다른 값(금액·면적 등)은 담지 않는다 — 불러오면 그 매물의 실제 값으로 채워진다.
 */
const SLOTS = 3;
const MAX_BYTES = 200_000; // 한 칸 크기 상한 (이미지는 주소만 담는다)

const admin = () =>
  createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase.from("members").select("role").eq("id", user.id).single();
  const role = (member?.role || "").toUpperCase();
  if (!["ADMIN", "최고관리자", "REALTOR", "부동산회원"].includes(role)) return null;
  return user.id;
}

const slots = (v: unknown) => {
  const arr = Array.isArray(v) ? v : [];
  return Array.from({ length: SLOTS }, (_, i) => arr[i] ?? null);
};

export async function GET() {
  const uid = await me();
  if (!uid) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  const { data, error } = await admin().from("members").select("flyer_presets").eq("id", uid).single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, presets: slots(data?.flyer_presets) });
}

/* { slot: 0~2, preset: {...} | null } — null 이면 그 칸을 비운다 */
export async function POST(request: NextRequest) {
  const uid = await me();
  if (!uid) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  const { slot, preset } = await request.json().catch(() => ({}));
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS) {
    return NextResponse.json({ success: false, error: "칸 번호가 올바르지 않습니다." }, { status: 400 });
  }
  if (preset !== null && (typeof preset !== "object" || JSON.stringify(preset).length > MAX_BYTES)) {
    return NextResponse.json({ success: false, error: "저장할 디자인이 너무 큽니다." }, { status: 400 });
  }
  const db = admin();
  const { data, error } = await db.from("members").select("flyer_presets").eq("id", uid).single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  const next = slots(data?.flyer_presets);
  next[slot] = preset ? { ...preset, savedAt: new Date().toISOString() } : null;
  const { error: upErr } = await db.from("members").update({ flyer_presets: next }).eq("id", uid);
  if (upErr) return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
  return NextResponse.json({ success: true, presets: next });
}
