"use server";

import { revalidateTag } from "next/cache";
import { createNotification } from "@/app/actions/notification";
import { getLectureActor, getLectureAdmin, lectureDb, lectureQuotaFor, memberStudyLink } from "@/utils/lectureActor";

/**
 * 특강 승인·반려와 회원 본인 강의 목록.
 *
 * 회원이 올린 강의는 승인대기(PENDING)로 들어오고, 최고관리자가 승인해야
 * 판매중(ACTIVE)이 된다. 반려하면 사유를 남기고 회원에게 알린다.
 * 회의록: docs/2026-09-28_lecture_member_registration_settlement_meeting.md
 */

/** 로그인한 회원의 강의 등록 한도 (화면의 [+ 새 강의 등록] 버튼과 안내에 쓴다) */
export async function getMyLectureQuota() {
  const actor = await getLectureActor();
  if (!actor) return { success: false as const, error: "로그인이 필요합니다." };
  return { success: true as const, quota: await lectureQuotaFor(actor) };
}

/** 로그인한 회원이 올린 강의 (삭제한 것 빼고, 최신순) */
export async function getMyLectures() {
  const actor = await getLectureActor();
  if (!actor) return { success: false as const, error: "로그인이 필요합니다.", data: [] };
  const { data, error } = await lectureDb()
    .from("lectures")
    .select("*")
    .eq("author_id", actor.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (error) return { success: false as const, error: error.message, data: [] };
  return { success: true as const, data: data || [] };
}

/** 등록자 이름을 한 번에 붙인다 (최고관리자 목록의 "등록자" 칸) */
export async function getLectureAuthorNames(authorIds: string[]) {
  if (!(await getLectureAdmin())) return { success: false as const, names: {} as Record<string, string> };
  const ids = Array.from(new Set(authorIds.filter(Boolean)));
  if (ids.length === 0) return { success: true as const, names: {} as Record<string, string> };
  const { data } = await lectureDb().from("members").select("id, name, email").in("id", ids);
  const names: Record<string, string> = {};
  for (const m of data || []) names[m.id] = m.name || m.email || "회원";
  return { success: true as const, names };
}

/** 선택 승인 → 판매중. 승인된 회원에게 알린다 */
export async function approveLectures(lectureIds: string[]) {
  const admin = await getLectureAdmin();
  if (!admin) return { success: false, error: "최고관리자만 승인할 수 있습니다." };
  if (!lectureIds?.length) return { success: false, error: "승인할 강의를 선택해 주세요." };

  const db = lectureDb();
  const { data: lectures, error } = await db
    .from("lectures")
    .update({ status: "ACTIVE", reject_reason: null, updated_at: new Date().toISOString() })
    .in("id", lectureIds)
    .eq("is_deleted", false)
    .select("id, title, author_id");
  if (error) return { success: false, error: error.message };

  await notifyAuthors(lectures || [], admin.id, (title) => ({
    type: "lecture_approved",
    title: "강의가 승인되었습니다",
    body: `${title} · 이제 판매중입니다.`,
  }));

  revalidateTag("lectures", "max");
  return { success: true, count: lectures?.length || 0 };
}

/** 선택 반려 → 반려(REJECTED) + 사유. 회원이 고쳐서 다시 승인 요청할 수 있다 */
export async function rejectLectures(lectureIds: string[], reason: string) {
  const admin = await getLectureAdmin();
  if (!admin) return { success: false, error: "최고관리자만 반려할 수 있습니다." };
  if (!lectureIds?.length) return { success: false, error: "반려할 강의를 선택해 주세요." };
  const why = (reason || "").trim();
  if (!why) return { success: false, error: "반려 사유를 입력해 주세요." };

  const db = lectureDb();
  const { data: lectures, error } = await db
    .from("lectures")
    .update({ status: "REJECTED", reject_reason: why, updated_at: new Date().toISOString() })
    .in("id", lectureIds)
    .eq("is_deleted", false)
    .select("id, title, author_id");
  if (error) return { success: false, error: error.message };

  await notifyAuthors(lectures || [], admin.id, (title) => ({
    type: "lecture_rejected",
    title: "강의가 반려되었습니다",
    body: `${title} · 사유: ${why}`,
  }));

  revalidateTag("lectures", "max");
  return { success: true, count: lectures?.length || 0 };
}

/**
 * 강의를 올린 회원에게 알린다. 최고관리자 본인이 올린 강의는 알리지 않는다.
 * 같은 강의를 다시 승인·반려해도 알림이 되살아나도록 revive 를 켠다.
 */
async function notifyAuthors(
  lectures: { id: string; title: string | null; author_id: string | null }[],
  adminId: string,
  message: (title: string) => { type: "lecture_approved" | "lecture_rejected"; title: string; body: string }
) {
  const authorIds = Array.from(new Set(lectures.map((l) => l.author_id).filter((id): id is string => !!id && id !== adminId)));
  if (authorIds.length === 0) return;
  const { data: authors } = await lectureDb().from("members").select("id, role").in("id", authorIds);
  const roleOf = new Map((authors || []).map((a) => [a.id, a.role]));

  for (const lecture of lectures) {
    if (!lecture.author_id || lecture.author_id === adminId) continue;
    const m = message(lecture.title || "(제목 없음)");
    await createNotification({
      recipientId: lecture.author_id,
      type: m.type,
      title: m.title,
      body: m.body,
      link: memberStudyLink(roleOf.get(lecture.author_id)),
      sourceId: lecture.id,
      revive: true,
    });
  }
}
