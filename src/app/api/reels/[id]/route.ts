// 릴스 작업 상태 조회 (화면에서 몇 초마다 확인). 완료되면 1시간짜리 재생·다운로드 주소를 준다 (영상은 24시간 뒤 삭제).
import { NextRequest, NextResponse } from "next/server";
import { checkReelAccess } from "@/lib/reels/access";
import { reelsAdminClient } from "@/lib/reels/listing";
import { signedReelUrl } from "@/lib/reels/pipeline";
import { expiresAt, reelFileName } from "@/lib/reels/retention";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: job } = await reelsAdminClient()
    .from("reel_jobs")
    .select("id, vacancy_id, member_id, status, stage, video_path, duration_s, warnings, error, timings, created_at, finished_at, vacancy_no:script->facts->vacancyNo")
    .eq("id", id)
    .single();
  if (!job) return NextResponse.json({ success: false, error: "작업을 찾을 수 없습니다." }, { status: 404 });

  const access = await checkReelAccess(job.vacancy_id);
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  if (!access.isAdmin && job.member_id !== access.memberId) return NextResponse.json({ success: false, error: "본인 작업만 볼 수 있습니다." }, { status: 403 });

  const live = job.status === "done" && !!job.video_path;
  const videoUrl = live ? await signedReelUrl(job.video_path!) : null;
  // 완성되면 화면이 이 주소로 바로 PC·휴대폰에 저장한다 (서버 보관은 24시간)
  const downloadUrl = live ? await signedReelUrl(job.video_path!, 60 * 60, reelFileName(job.vacancy_no as number | null, job.finished_at)) : null;
  const rest = { id: job.id, vacancy_id: job.vacancy_id, status: job.status, stage: job.stage, duration_s: job.duration_s, warnings: job.warnings, error: job.error, timings: job.timings, created_at: job.created_at, finished_at: job.finished_at };
  return NextResponse.json({ success: true, job: rest, videoUrl, downloadUrl, expiresAt: live ? expiresAt(job.finished_at) : null });
}
