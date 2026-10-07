// 릴스 프로젝트: GET 저장본 열기(+이 매물로 만든 영상 목록) / POST 새로 시작(AI 초안·직접 쓴 대본) 또는 초안 확정(confirm) / PUT 편집 저장
import { NextRequest, NextResponse } from "next/server";
import { checkReelAccess } from "@/lib/reels/access";
import { reelsAdminClient } from "@/lib/reels/listing";
import { signedReelUrl } from "@/lib/reels/pipeline";
import { confirmDraft, createProject, getProject, saveProject } from "@/lib/reels/project";
import { reviewScript } from "@/lib/reels/draft";
import { expiresAt, purgeExpiredReels, reelFileName } from "@/lib/reels/retention";

export const maxDuration = 300;

const fail = (error: unknown, status = 500) => NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status });

// 완성 영상은 24시간만 보관 (회원이 PC·휴대폰으로 받아 감). 열 때마다 이 매물의 지난 영상부터 정리
async function recentVideos(vacancyId: string, vacancyNo: number | null) {
  await purgeExpiredReels(vacancyId).catch(() => 0);
  const { data } = await reelsAdminClient()
    .from("reel_jobs")
    .select("id, status, stage, video_path, duration_s, error, created_at, finished_at")
    .eq("vacancy_id", vacancyId)
    .order("created_at", { ascending: false })
    .limit(8);
  return Promise.all(
    (data || []).map(async ({ video_path, ...j }) => {
      const live = j.status === "done" && !!video_path;
      return {
        ...j,
        videoUrl: live ? await signedReelUrl(video_path!) : null,
        downloadUrl: live ? await signedReelUrl(video_path!, 60 * 60, reelFileName(vacancyNo, j.finished_at)) : null,
        expiresAt: live ? expiresAt(j.finished_at) : null,
        expired: j.status === "done" && !video_path,
      };
    }),
  );
}

export async function GET(request: NextRequest) {
  const vacancyId = request.nextUrl.searchParams.get("vacancyId");
  if (!vacancyId) return fail("vacancyId 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    const project = await getProject(vacancyId);
    return NextResponse.json({ success: true, project, warnings: project ? reviewScript(project.script) : [], videos: await recentVideos(vacancyId, project?.script.facts.vacancyNo ?? null) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: NextRequest) {
  const { vacancyId, mode = "auto", text = "", withAuto = true, voice = "", music = "", style = "lively" } = await request.json().catch(() => ({}));
  if ((mode === "script" || mode === "confirm") && !String(text).trim()) return fail("대본을 입력해 주세요.", 400);
  if (!vacancyId) return fail("vacancyId 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    // 초안 화면에서 다듬은 대본 + 성우·스타일·음악으로 클립 만들기
    if (mode === "confirm") {
      const { project, warnings } = await confirmDraft(vacancyId, access.memberId, String(text).slice(0, 2000), String(voice), String(music), style);
      return NextResponse.json({ success: true, project, warnings });
    }
    const start = mode === "script" ? { mode: "script" as const, text: String(text).slice(0, 2000), withAuto: withAuto !== false } : { mode: "auto" as const };
    const { project, warnings } = await createProject(vacancyId, access.memberId, start);
    return NextResponse.json({ success: true, project, warnings });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(request: NextRequest) {
  const { vacancyId, scenes, voice, music, settings } = await request.json().catch(() => ({}));
  if (!vacancyId || !Array.isArray(scenes)) return fail("vacancyId 와 scenes 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    const project = await saveProject(vacancyId, access.memberId, scenes, voice, music, settings);
    return NextResponse.json({ success: true, updatedAt: project.updatedAt, warnings: reviewScript(project.script) });
  } catch (e) {
    return fail(e);
  }
}
