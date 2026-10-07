// 내 배경음악: GET 목록 / POST start(동의 + 올리기 주소) · uploaded(다 올렸음) / DELETE 지우기
import { NextRequest, NextResponse } from "next/server";
import { checkReelAccess } from "@/lib/reels/access";
import { deleteMyMusic, finishMusicUpload, listMyMusic, startMusicUpload } from "@/lib/reels/music";

const fail = (error: unknown, status = 500) => NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status });
// 저장소 경로는 화면에 내보내지 않는다
const publicList = async (vacancyId: string) => (await listMyMusic(vacancyId)).map((m) => ({ id: `my-${m.id}`, title: m.title, duration: m.duration, url: m.url }));

export async function GET(request: NextRequest) {
  const vacancyId = request.nextUrl.searchParams.get("vacancyId");
  if (!vacancyId) return fail("vacancyId 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    return NextResponse.json({ success: true, music: await publicList(vacancyId) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: NextRequest) {
  const { vacancyId, action, fileName = "music.mp3", size = 0, duration = 0, agreed = false, id } = await request.json().catch(() => ({}));
  if (!vacancyId) return fail("vacancyId 가 필요합니다.", 400);
  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return fail(access.error, access.status);
  try {
    if (action === "start") return NextResponse.json({ success: true, ...(await startMusicUpload(vacancyId, access.memberId, String(fileName), Number(size), Number(duration), agreed === true)) });
    if (action === "uploaded") {
      await finishMusicUpload(vacancyId, String(id));
      return NextResponse.json({ success: true, music: await publicList(vacancyId) });
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
    await deleteMyMusic(vacancyId, String(id).replace(/^my-/, ""));
    return NextResponse.json({ success: true, music: await publicList(vacancyId) });
  } catch (e) {
    return fail(e);
  }
}
