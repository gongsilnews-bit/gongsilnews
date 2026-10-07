// 완성 영상은 회원 PC·휴대폰으로 받아 가는 것이 원칙. 서버에는 24시간만 두고 지운다 (2026-10-06 결정).
// 편집본과 성우 녹음은 남아 있어 [다시 만들기] 한 번이면 같은 영상이 다시 나온다.
import { reelsAdminClient } from "./listing";

export const KEEP_HOURS = 24;
const BUCKET = "reels";

/** 보관 시간이 지난 영상 파일을 지운다 (작업 기록은 남기고 video_path 만 비움). vacancyId 를 주면 그 매물만 */
export async function purgeExpiredReels(vacancyId?: string): Promise<number> {
  const db = reelsAdminClient();
  const cutoff = new Date(Date.now() - KEEP_HOURS * 3600_000).toISOString();
  let q = db.from("reel_jobs").select("id, video_path").not("video_path", "is", null).lt("finished_at", cutoff).limit(200);
  if (vacancyId) q = q.eq("vacancy_id", vacancyId);
  const { data } = await q;
  if (!data?.length) return 0;
  const { error } = await db.storage.from(BUCKET).remove(data.map((j) => j.video_path as string));
  if (error) throw new Error(`영상 삭제 실패: ${error.message}`);
  await db.from("reel_jobs").update({ video_path: null, updated_at: new Date().toISOString() }).in("id", data.map((j) => j.id));
  return data.length;
}

/** 삭제 예정 시각 */
export const expiresAt = (finishedAt: string | null) => (finishedAt ? new Date(new Date(finishedAt).getTime() + KEEP_HOURS * 3600_000).toISOString() : null);

/** 받을 파일 이름 (영문·숫자만: 브라우저·휴대폰마다 한글 파일명이 깨지는 경우가 있어서) */
export function reelFileName(vacancyNo: number | string | null, finishedAt: string | null) {
  const d = new Date(finishedAt || Date.now());
  const kst = new Date(d.getTime() + 9 * 3600_000).toISOString(); // 한국 시각
  const stamp = `${kst.slice(0, 10).replace(/-/g, "")}-${kst.slice(11, 16).replace(":", "")}`;
  return `gongsilnews-reel-${vacancyNo ?? "video"}-${stamp}.mp4`;
}
