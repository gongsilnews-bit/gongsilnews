import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { lectureQuotaOf, type LectureQuota } from "@/utils/lectureQuota";

/**
 * 강의 서버 함수들이 같이 쓰는 "지금 누가 요청했나".
 *
 * 서버 함수는 브라우저에서 누구나 부를 수 있다. 화면에서 버튼을 숨기는 것으로는
 * 막히지 않으므로, 승인·반려·삭제·무료등급 같은 일은 전부 여기서 로그인한
 * 사람을 다시 확인한다.
 */

export function lectureDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

export type LectureActor = {
  id: string;
  name: string | null;
  role: string | null;
  isAdmin: boolean;
  member: { role: string | null; plan_type: string | null; plan_end_date: string | null; max_lectures: number | null } | null;
};

/** 로그인한 회원. 로그인하지 않았으면 null */
export async function getLectureActor(): Promise<LectureActor | null> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  type Row = { name: string | null; role: string | null; plan_type: string | null; plan_end_date: string | null; max_lectures?: number | null };
  const db = lectureDb();
  const first = await db
    .from("members")
    .select("name, role, plan_type, plan_end_date, max_lectures")
    .eq("id", user.id)
    .maybeSingle<Row>();
  let member = first.data;
  // max_lectures 칸을 만드는 SQL 이 아직 안 들어갔어도 최고관리자는 막히지 않게 한다
  if (first.error) {
    const retry = await db
      .from("members")
      .select("name, role, plan_type, plan_end_date")
      .eq("id", user.id)
      .maybeSingle<Row>();
    member = retry.data;
  }
  return {
    id: user.id,
    name: member?.name ?? null,
    role: member?.role ?? null,
    isAdmin: isAdminRole(member?.role),
    member: member
      ? { role: member.role, plan_type: member.plan_type, plan_end_date: member.plan_end_date, max_lectures: member.max_lectures ?? null }
      : null,
  };
}

/** 최고관리자만. 아니면 null */
export async function getLectureAdmin(): Promise<LectureActor | null> {
  const actor = await getLectureActor();
  return actor?.isAdmin ? actor : null;
}

/** 이 회원이 강의를 하나 더 올릴 수 있는가 (삭제한 강의는 세지 않는다) */
export async function lectureQuotaFor(actor: LectureActor): Promise<LectureQuota> {
  const { count } = await lectureDb()
    .from("lectures")
    .select("id", { count: "exact", head: true })
    .eq("author_id", actor.id)
    .eq("is_deleted", false);
  return lectureQuotaOf(actor.member, count || 0);
}

/** 회원이 강의를 관리하는 화면 주소. 부동산회원은 realty_admin, 나머지는 user_admin */
export function memberStudyLink(role?: string | null) {
  return role === "REALTOR" || role === "부동산회원" ? "/realty_admin?menu=study" : "/user_admin?menu=study";
}
