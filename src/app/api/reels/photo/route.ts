// 릴스용 새 사진 올리기: 공개 사진 저장소에 올리고 자동 검사를 거쳐 프로젝트 사진 목록에 추가한다.
// 매물 등록 사진(vacancy_photos)은 건드리지 않는다.
import { NextRequest, NextResponse } from "next/server";
import { checkReelAccess } from "@/lib/reels/access";
import { checkPhotos } from "@/lib/reels/draft";
import { reelsAdminClient } from "@/lib/reels/listing";
import { addProjectPhotos, getProject } from "@/lib/reels/project";

export const maxDuration = 120;
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const vacancyId = String(form?.get("vacancyId") || "");
  const file = form?.get("file");
  if (!vacancyId || !(file instanceof File)) return NextResponse.json({ success: false, error: "vacancyId 와 사진 파일이 필요합니다." }, { status: 400 });
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return NextResponse.json({ success: false, error: "JPG·PNG·WEBP 사진만 올릴 수 있습니다." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: "사진은 10MB 이하만 올릴 수 있습니다." }, { status: 400 });

  const access = await checkReelAccess(vacancyId);
  if (!access.ok) return NextResponse.json({ success: false, error: access.error }, { status: access.status });

  try {
    const project = await getProject(vacancyId);
    if (!project) throw new Error("프로젝트가 없습니다.");
    const db = reelsAdminClient();
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${vacancyId}/reel_${Date.now()}.${ext}`;
    const { error } = await db.storage.from("vacancy_images").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (error) throw new Error(`사진 저장 실패: ${error.message}`);
    const url = db.storage.from("vacancy_images").getPublicUrl(path).data.publicUrl;
    const [checked] = await checkPhotos([url], `${project.script.facts.area} ${project.script.facts.type}`);
    const photos = await addProjectPhotos(vacancyId, [checked]);
    return NextResponse.json({ success: true, photo: checked, photos });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
