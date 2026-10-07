// 회원이 직접 올린 배경음악 (서버 전용). 브라우저가 서명 주소로 바로 올리고, 렌더 때 샌드박스가 바로 받는다.
// 올릴 때 저작권 동의를 받는다. 30일 동안 안 쓰면 지운다.
import { reelsAdminClient } from "./listing";

const BUCKET = "reels";
const UNUSED_DAYS = 30;
export const MY_MUSIC_LIMIT = { maxBytes: 20 * 1024 * 1024, maxSeconds: 600 } as const;

export interface MyMusic {
  id: string;            // 화면·저장에서는 "my-<id>"
  title: string;
  duration: number | null;
  url: string | null;    // 서명 주소 (6시간)
  path: string;
}

async function sign(path: string, seconds = 6 * 3600) {
  const { data } = await reelsAdminClient().storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl || null;
}

export async function listMyMusic(vacancyId: string): Promise<MyMusic[]> {
  const { data } = await reelsAdminClient().from("reel_music").select("id, title, duration, path").eq("vacancy_id", vacancyId).eq("status", "ready").order("created_at", { ascending: false }).limit(30);
  return Promise.all((data || []).map(async (m) => ({ id: m.id, title: m.title || "내 음악", duration: m.duration == null ? null : Number(m.duration), path: m.path, url: await sign(m.path) })));
}

/** 저장·렌더 때: "my-<id>" 가 이 매물의 음악인지 확인하고 파일 정보를 준다 */
export async function getMyMusic(vacancyId: string, musicId: string): Promise<MyMusic | null> {
  const id = musicId.replace(/^my-/, "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data: m } = await reelsAdminClient().from("reel_music").select("id, title, duration, path").eq("id", id).eq("vacancy_id", vacancyId).eq("status", "ready").maybeSingle();
  if (!m) return null;
  await reelsAdminClient().from("reel_music").update({ last_used_at: new Date().toISOString() }).eq("id", id);
  return { id: m.id, title: m.title || "내 음악", duration: m.duration == null ? null : Number(m.duration), path: m.path, url: await sign(m.path, 3600) };
}

export async function startMusicUpload(vacancyId: string, memberId: string, fileName: string, size: number, duration: number, agreed: boolean) {
  if (!agreed) throw new Error("저작권 동의가 필요합니다.");
  if (!(size > 0) || size > MY_MUSIC_LIMIT.maxBytes) throw new Error("음악 파일은 20MB까지 올릴 수 있습니다.");
  if (duration > MY_MUSIC_LIMIT.maxSeconds) throw new Error("음악은 10분까지 올릴 수 있습니다.");
  const ext = (fileName.split(".").pop() || "mp3").toLowerCase();
  if (!["mp3", "m4a", "aac", "wav", "ogg"].includes(ext)) throw new Error("mp3·m4a·wav·ogg 파일만 올릴 수 있습니다.");
  const db = reelsAdminClient();
  const id = crypto.randomUUID();
  const path = `music/${vacancyId}/${id}.${ext}`;
  const title = fileName.replace(/\.[^.]+$/, "").slice(0, 60) || "내 음악";
  const { error } = await db.from("reel_music").insert({ id, vacancy_id: vacancyId, member_id: memberId, title, path, duration: duration || null, size_bytes: size, agreed_at: new Date().toISOString() });
  if (error) throw new Error(`음악 기록 실패: ${error.message}`);
  const { data: up, error: upErr } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (upErr || !up) throw new Error(`올리기 주소를 만들지 못했습니다: ${upErr?.message}`);
  return { id, uploadUrl: up.signedUrl };
}

export async function finishMusicUpload(vacancyId: string, id: string) {
  const { error } = await reelsAdminClient().from("reel_music").update({ status: "ready" }).eq("id", id).eq("vacancy_id", vacancyId);
  if (error) throw new Error(error.message);
}

export async function deleteMyMusic(vacancyId: string, id: string) {
  const db = reelsAdminClient();
  const { data: m } = await db.from("reel_music").select("path").eq("id", id).eq("vacancy_id", vacancyId).single();
  if (!m) throw new Error("음악을 찾을 수 없습니다.");
  await db.storage.from(BUCKET).remove([m.path]);
  await db.from("reel_music").delete().eq("id", id);
}

/** 정리: 30일 안 쓴 음악, 하루 넘게 '올리는 중'에 멈춘 기록 */
export async function purgeUnusedMusic(): Promise<number> {
  const db = reelsAdminClient();
  const old = new Date(Date.now() - UNUSED_DAYS * 86400_000).toISOString();
  const stuck = new Date(Date.now() - 86400_000).toISOString();
  const { data } = await db.from("reel_music").select("id, path").or(`last_used_at.lt.${old},and(status.eq.uploading,created_at.lt.${stuck})`).limit(200);
  if (!data?.length) return 0;
  await db.storage.from(BUCKET).remove(data.map((m) => m.path));
  await db.from("reel_music").delete().in("id", data.map((m) => m.id));
  return data.length;
}
