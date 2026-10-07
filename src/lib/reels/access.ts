// 릴스 기능 권한. 1차(관리자 시험판)는 최고관리자만. REELS_REALTOR_ENABLED=1 이면 승인된 부동산회원이 본인 매물에 한해 사용.
// 기존 공실 조회 액션은 호출자를 확인하지 않으므로, 릴스는 여기서 매물 소유를 직접 확인한다.
import { createClient } from "@/utils/supabase/server";
import { getEffectiveMemberRole, isAdminRole } from "@/utils/permissionCheck";
import { reelsAdminClient } from "./listing";

export type ReelAccess = { ok: true; memberId: string; isAdmin: boolean } | { ok: false; status: number; error: string };

export async function checkReelAccess(vacancyId?: string): Promise<ReelAccess> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "로그인이 필요합니다." };

  const db = reelsAdminClient();
  const { data: member } = await db.from("members").select("id, role").eq("id", user.id).single();
  if (!member) return { ok: false, status: 401, error: "회원 정보를 찾을 수 없습니다." };

  if (isAdminRole(member.role)) return { ok: true, memberId: member.id, isAdmin: true };

  if (process.env.REELS_REALTOR_ENABLED !== "1") return { ok: false, status: 403, error: "릴스 만들기는 준비 중입니다." };

  const { data: agency } = await db.from("agencies").select("status").eq("owner_id", member.id).maybeSingle();
  if (getEffectiveMemberRole(member.role, agency?.status) !== "REALTOR") {
    return { ok: false, status: 403, error: "승인된 부동산회원만 사용할 수 있습니다." };
  }
  if (vacancyId) {
    const { data: v } = await db.from("vacancies").select("owner_id").eq("id", vacancyId).single();
    if (!v || v.owner_id !== member.id) return { ok: false, status: 403, error: "본인이 등록한 공실만 릴스로 만들 수 있습니다." };
  }
  return { ok: true, memberId: member.id, isAdmin: false };
}
