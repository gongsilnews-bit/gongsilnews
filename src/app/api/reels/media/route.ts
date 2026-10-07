// 릴스용 동영상: GET 목록 / POST start(올리기 주소 받기) · uploaded(다 올렸음 → 뒤에서 변환) / DELETE 지우기
import { after, NextRequest, NextResponse } from "next/server";
import { checkReelAccess } from "@/lib/reels/access";
import { reelsAdminClient } from "@/lib/reels/listing";
import { deleteMedia, listMedia, processMedia, startUpload } from "@/lib/reels/media";

export const maxDuration = 600; // 3분 4K 변환까지 (뒤에서 after 로)

const fail = (error: unknown, status = 500) => NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status });
// 저장소 경로는 화면에 내보내지 않는다
const publicList = async (vacancyId: string) =>
  (await listMedia(vacancyId)).map((m) => ({ id: m.id, status: m.status, fileName: m.fileName, duration: m.duration, width: m.width, height: m.height, hasAudio: m.hasAudio, error: m.error, url: m.url, poster: m.poster }));

export async function GET(request: NextRequest) {
  const vacancyId = request.nextUrl.searchParams.get("vacancyId");
  if (!vacancyId) return fail("vacancyId 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    return NextResponse.json({ success: true, media: await publicList(vacancyId) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: NextRequest) {
  const { vacancyId, action, fileName = "video.mp4", size = 0, duration = 0, id } = await request.json().catch(() => ({}));
  if (!vacancyId) return fail("vacancyId 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    if (action === "start") {
      const up = await startUpload(vacancyId, access.memberId, String(fileName), Number(size), Number(duration));
      return NextResponse.json({ success: true, ...up });
    }
    if (action === "uploaded") {
      const { data: m } = await reelsAdminClient().from("reel_media").select("id, status").eq("id", id).eq("vacancy_id", vacancyId).single();
      if (!m) return fail("영상을 찾을 수 없습니다.", 404);
      if (m.status !== "uploading") return NextResponse.json({ success: true });
      await reelsAdminClient().from("reel_media").update({ status: "processing" }).eq("id", id);
      after(() => processMedia(id));
      return NextResponse.json({ success: true });
    }
    return fail("알 수 없는 요청입니다.", 400);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request: NextRequest) {
  const { vacancyId, id } = await request.json().catch(() => ({}));
  if (!vacancyId || !id) return fail("vacancyId 와 id 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    await deleteMedia(vacancyId, id);
    return NextResponse.json({ success: true, media: await publicList(vacancyId) });
  } catch (e) {
    return fail(e);
  }
}
