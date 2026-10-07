// 영상 만들기: 저장된 프로젝트로 작업을 만들고, 응답 후 뒤에서(after) 성우 확인·렌더를 진행한다 (약 1분).
import { after, NextRequest, NextResponse } from "next/server";
import { checkReelAccess } from "@/lib/reels/access";
import { rebuildForRender } from "@/lib/reels/draft";
import { loadReelListing, reelsAdminClient } from "@/lib/reels/listing";
import { runReelJob } from "@/lib/reels/pipeline";
import { getProject } from "@/lib/reels/project";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { vacancyId } = await request.json().catch(() => ({}));
  if (!vacancyId) return NextResponse.json({ success: false, error: "vacancyId 가 필요합니다." }, { status: 400 });

  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const project = await getProject(vacancyId);
    if (!project) throw new Error("프로젝트가 없습니다. 먼저 초안을 만들어 주세요.");
    // 매물 사실은 DB 에서 새로, 가격·마무리 장면은 DB 숫자로 다시 만든다 (저장본 숫자를 믿지 않음)
    const listing = await loadReelListing(vacancyId);
    const { script, warnings } = rebuildForRender(listing, project.script, project.script.scenes);

    const { data: job, error } = await reelsAdminClient()
      .from("reel_jobs")
      .insert({ vacancy_id: vacancyId, member_id: access.memberId, script: { ...script, music: project.music }, voice: project.voice, warnings })
      .select("id")
      .single();
    if (error || !job) throw new Error(`작업 등록 실패: ${error?.message}`);

    after(() => runReelJob(job.id));
    return NextResponse.json({ success: true, jobId: job.id, warnings });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
