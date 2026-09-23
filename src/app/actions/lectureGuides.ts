"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";

export type LectureGuide = {
  id: string;
  name: string;
  title: string;
  body: string;
  is_active: boolean;
  sort_order: number;
  usage_count?: number;
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: member } = await getAdminClient()
    .from("members")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return isAdminRole(member?.role) ? user : null;
}

function cleanGuide(input: { name: string; title: string; body: string; is_active?: boolean; sort_order?: number }) {
  return {
    name: input.name.trim(),
    title: input.title.trim(),
    body: input.body.trim(),
    is_active: input.is_active ?? true,
    sort_order: Number.isFinite(input.sort_order) ? Number(input.sort_order) : 0,
  };
}

export async function getLectureGuides(): Promise<{ success: boolean; data: LectureGuide[]; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, data: [], error: "최고관리자 권한이 필요합니다." };

  const supabase = getAdminClient();
  const [{ data, error }, { data: lectures, error: usageError }] = await Promise.all([
    supabase.from("lecture_guides").select("id,name,title,body,is_active,sort_order").order("sort_order").order("created_at"),
    supabase.from("lectures").select("lecture_guide_id").not("lecture_guide_id", "is", null).eq("is_deleted", false),
  ]);
  if (error) return { success: false, data: [], error: error.message };
  if (usageError) return { success: false, data: [], error: usageError.message };

  const counts = new Map<string, number>();
  for (const lecture of lectures || []) {
    const id = lecture.lecture_guide_id as string;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return {
    success: true,
    data: (data || []).map((guide) => ({ ...guide, usage_count: counts.get(guide.id) || 0 })),
  };
}

export async function saveLectureGuide(input: {
  id?: string;
  name: string;
  title: string;
  body: string;
  is_active?: boolean;
  sort_order?: number;
}): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "최고관리자 권한이 필요합니다." };

  const guide = cleanGuide(input);
  if (!guide.name || !guide.title || !guide.body) {
    return { success: false, error: "관리용 이름, 노출 제목, 안내 내용을 모두 입력해 주세요." };
  }

  const supabase = getAdminClient();
  const payload = { ...guide, updated_at: new Date().toISOString() };
  const { error } = input.id
    ? await supabase.from("lecture_guides").update(payload).eq("id", input.id)
    : await supabase.from("lecture_guides").insert({ ...payload, created_by: admin.id });
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/study_read");
  return { success: true };
}

export async function deleteLectureGuide(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "최고관리자 권한이 필요합니다." };
  if (!id) return { success: false, error: "삭제할 수강안내가 없습니다." };

  const supabase = getAdminClient();
  const { count, error: countError } = await supabase
    .from("lectures")
    .select("id", { count: "exact", head: true })
    .eq("lecture_guide_id", id)
    .eq("is_deleted", false);
  if (countError) return { success: false, error: countError.message };
  if ((count || 0) > 0) {
    return { success: false, error: `이 수강안내를 사용 중인 강의가 ${count}개 있어 삭제할 수 없습니다. 먼저 사용 중지하거나 강의 연결을 변경해 주세요.` };
  }

  const { error } = await supabase.from("lecture_guides").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin");
  return { success: true };
}
