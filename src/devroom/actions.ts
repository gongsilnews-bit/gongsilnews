"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import type { DevTask, DevTaskType } from "./types";

const BUCKET = "devroom";
const MAX_SHOTS = 5;
const MAX_SHOT_BYTES = 5 * 1024 * 1024;
const TYPES: DevTaskType[] = ["bug", "feature", "design", "urgent"];

function devroomDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

/**
 * 서버 함수는 브라우저에서 누구나 부를 수 있으므로, 게시글이 곧 코드 수정 명령이 되는
 * AI 개발실은 매번 로그인한 사람이 관리자인지 다시 확인한다.
 */
async function requireAdmin(): Promise<string | null> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: member } = await devroomDb().from("members").select("role").eq("id", user.id).single();
  return isAdminRole(member?.role) ? user.id : null;
}

/** 작업 목록 (최근 100건) + 스크린샷 임시 주소 */
export async function listDevTasks(): Promise<{ success: boolean; data: DevTask[]; error?: string }> {
  if (!(await requireAdmin())) return { success: false, data: [], error: "권한이 없습니다." };
  const db = devroomDb();
  const { data, error } = await db
    .from("dev_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { success: false, data: [], error: error.message };

  const tasks = (data || []) as DevTask[];
  const paths = tasks.flatMap((t) => t.attachments || []);
  if (paths.length > 0) {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
    const urlOf = new Map((signed || []).map((s) => [s.path, s.signedUrl]));
    for (const t of tasks) t.attachment_urls = (t.attachments || []).map((p) => urlOf.get(p) || "").filter(Boolean);
  }
  return { success: true, data: tasks };
}

/** 작업 등록. 스크린샷은 devroom 비공개 버킷에 올린다. */
export async function createDevTask(formData: FormData): Promise<{ success: boolean; error?: string; task_no?: string }> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "권한이 없습니다." };

  const type = String(formData.get("type") || "bug") as DevTaskType;
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const pageUrl = String(formData.get("page_url") || "").trim();
  const reproSteps = String(formData.get("repro_steps") || "").trim();
  if (!TYPES.includes(type)) return { success: false, error: "작업 종류가 올바르지 않습니다." };
  if (!title) return { success: false, error: "제목을 입력해 주세요." };
  if (!description) return { success: false, error: "내용을 입력해 주세요." };

  const shots = formData.getAll("screenshots").filter((f): f is File => f instanceof File && f.size > 0);
  if (shots.length > MAX_SHOTS) return { success: false, error: `스크린샷은 ${MAX_SHOTS}장까지 올릴 수 있습니다.` };
  for (const f of shots) {
    if (!f.type.startsWith("image/")) return { success: false, error: "스크린샷은 이미지 파일만 올릴 수 있습니다." };
    if (f.size > MAX_SHOT_BYTES) return { success: false, error: "스크린샷은 한 장에 5MB까지입니다." };
  }

  const db = devroomDb();
  const attachments: string[] = [];
  for (const f of shots) {
    const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (error) {
      if (attachments.length) await db.storage.from(BUCKET).remove(attachments);
      return { success: false, error: "스크린샷 업로드 실패: " + error.message };
    }
    attachments.push(path);
  }

  const { data, error } = await db
    .from("dev_tasks")
    .insert({
      type, title, description,
      page_url: pageUrl || null,
      repro_steps: reproSteps || null,
      attachments,
      created_by: userId,
    })
    .select("task_no")
    .single();
  if (error) {
    if (attachments.length) await db.storage.from(BUCKET).remove(attachments);
    return { success: false, error: error.message };
  }
  return { success: true, task_no: data.task_no };
}

/** [승인] 승인대기 작업을 승인됨으로. PC 에이전트가 PR 을 main 에 병합하면 반영완료가 된다. */
export async function approveDevTask(id: number): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "권한이 없습니다." };
  const { data, error } = await devroomDb()
    .from("dev_tasks")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "review")
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: "승인대기 상태인 작업만 승인할 수 있습니다." };
  return { success: true };
}

/**
 * [반려] 피드백을 남기면 PC 에이전트가 같은 브랜치에서 피드백을 반영해 다시 작업한다.
 * 승인대기뿐 아니라 실패한 작업도 피드백을 붙여 다시 맡길 수 있다.
 */
export async function rejectDevTask(id: number, reason: string): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "권한이 없습니다." };
  const text = reason.trim();
  if (!text) return { success: false, error: "피드백 내용을 입력해 주세요." };
  const { data, error } = await devroomDb()
    .from("dev_tasks")
    .update({ status: "rejected", reject_reason: text })
    .eq("id", id)
    .in("status", ["review", "failed"])
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: "승인대기·실패 상태인 작업만 반려할 수 있습니다." };
  return { success: true };
}

/** 아직 에이전트가 가져가지 않은(접수) 작업만 삭제할 수 있다. */
export async function deleteDevTask(id: number): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "권한이 없습니다." };
  const db = devroomDb();
  const { data, error } = await db
    .from("dev_tasks")
    .delete()
    .eq("id", id)
    .eq("status", "waiting")
    .select("attachments");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: "이미 에이전트가 가져간 작업은 삭제할 수 없습니다." };
  const paths = (data[0].attachments || []) as string[];
  if (paths.length) await db.storage.from(BUCKET).remove(paths);
  return { success: true };
}
