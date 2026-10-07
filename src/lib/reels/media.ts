// 릴스용 동영상: 브라우저가 원본을 서명 주소로 바로 올리고(서버를 거치지 않음),
// 샌드박스가 세로 1080p H.264 변환본 + 썸네일을 만든 뒤 원본은 바로 지운다.
// 미리보기와 완성 영상이 같은 변환본을 쓴다. 30일 동안 안 쓰면 변환본도 지운다.
import { Sandbox } from "@vercel/sandbox";
import { reelsAdminClient } from "./listing";
import { runDetached, SANDBOX_DL } from "./render";
import { VIDEO_LIMIT } from "./types";

const BUCKET = "reels";
const UNUSED_DAYS = 30;

export interface ReelMedia {
  id: string;
  status: "uploading" | "processing" | "ready" | "failed";
  fileName: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  error: string | null;
  url: string | null;     // 변환본 (서명 주소, 6시간)
  poster: string | null;  // 썸네일
  path: string | null;    // 버킷 안 경로 (서버용)
  vacancyId: string;
}

type Row = { id: string; vacancy_id: string; status: ReelMedia["status"]; file_name: string | null; duration: number | null; width: number | null; height: number | null; has_audio: boolean; error: string | null; path: string | null; poster_path: string | null };
const COLS = "id, vacancy_id, status, file_name, duration, width, height, has_audio, error, path, poster_path";

async function sign(path: string | null, seconds = 6 * 3600) {
  if (!path) return null;
  const { data } = await reelsAdminClient().storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl || null;
}

const toMedia = async (r: Row): Promise<ReelMedia> => ({
  id: r.id,
  status: r.status,
  fileName: r.file_name,
  duration: r.duration == null ? null : Number(r.duration),
  width: r.width,
  height: r.height,
  hasAudio: r.has_audio,
  error: r.error,
  url: r.status === "ready" ? await sign(r.path) : null,
  poster: r.status === "ready" ? await sign(r.poster_path) : null,
  path: r.path,
  vacancyId: r.vacancy_id,
});

export async function listMedia(vacancyId: string): Promise<ReelMedia[]> {
  const { data } = await reelsAdminClient().from("reel_media").select(COLS).eq("vacancy_id", vacancyId).order("created_at", { ascending: false }).limit(30);
  return Promise.all(((data || []) as Row[]).map(toMedia));
}

export async function getMedia(ids: string[]): Promise<Map<string, ReelMedia>> {
  if (!ids.length) return new Map();
  const { data } = await reelsAdminClient().from("reel_media").select(COLS).in("id", ids);
  const list = await Promise.all(((data || []) as Row[]).map(toMedia));
  return new Map(list.map((m) => [m.id, m]));
}

/** 올리기 시작: 기록을 만들고 브라우저가 원본을 바로 올릴 서명 주소를 준다 (2시간 유효) */
export async function startUpload(vacancyId: string, memberId: string, fileName: string, size: number, duration: number) {
  if (!(size > 0) || size > VIDEO_LIMIT.maxBytes) throw new Error("영상이 너무 큽니다 (1.5GB까지).");
  if (!(duration > 0) || duration > VIDEO_LIMIT.maxSeconds + 5) throw new Error("영상은 3분까지 올릴 수 있습니다. 휴대폰 사진 앱에서 필요한 부분만 잘라 올려 주세요.");
  const db = reelsAdminClient();
  const ext = (fileName.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
  const { data: row, error } = await db.from("reel_media").insert({ vacancy_id: vacancyId, member_id: memberId, file_name: fileName.slice(0, 120) }).select("id").single();
  if (error || !row) throw new Error(`영상 기록 실패: ${error?.message}`);
  const originalPath = `upload/${vacancyId}/${row.id}.${ext}`;
  const { data: up, error: upErr } = await db.storage.from(BUCKET).createSignedUploadUrl(originalPath, { upsert: true });
  if (upErr || !up) throw new Error(`올리기 주소를 만들지 못했습니다: ${upErr?.message}`);
  await db.from("reel_media").update({ original_path: originalPath }).eq("id", row.id);
  return { id: row.id as string, uploadUrl: up.signedUrl };
}

/** 원본이 다 올라오면: 샌드박스에서 변환 → 변환본·썸네일 저장 → 원본 삭제 */
export async function processMedia(id: string) {
  const db = reelsAdminClient();
  const update = (patch: Record<string, unknown>) => db.from("reel_media").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  const { data: m } = await db.from("reel_media").select("id, vacancy_id, original_path").eq("id", id).single();
  if (!m?.original_path) throw new Error("원본을 찾을 수 없습니다.");
  await update({ status: "processing", error: null });

  const path = `media/${m.vacancy_id}/${id}.mp4`;
  const posterPath = `media/${m.vacancy_id}/${id}.jpg`;
  try {
    const src = await sign(m.original_path, 3600);
    const upVideo = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    const upPoster = await db.storage.from(BUCKET).createSignedUploadUrl(posterPath, { upsert: true });
    if (!src || !upVideo.data || !upPoster.data) throw new Error("저장소 주소를 만들지 못했습니다.");

    const snapshotId = process.env.REELS_SANDBOX_SNAPSHOT_ID;
    if (!snapshotId) throw new Error("REELS_SANDBOX_SNAPSHOT_ID 가 설정되지 않았습니다.");
    const sb = await Sandbox.create({ source: { type: "snapshot", snapshotId }, resources: { vcpus: 8 }, timeout: 10 * 60 * 1000 });
    try {
      const dir = `/vercel/media/${id}`;
      await sb.writeFiles([
        { path: `${dir}/dl.mjs`, content: Buffer.from(SANDBOX_DL) },
        { path: `${dir}/ul.mjs`, content: Buffer.from(UL) },
        { path: `${dir}/urls.json`, content: Buffer.from(JSON.stringify({ src, video: upVideo.data.signedUrl, poster: upPoster.data.signedUrl })) },
      ]);
      // 짧은 변(세로 영상은 가로, 가로 영상은 세로)을 1080 으로. 1초마다 키프레임(구간 이동이 빠르게), 웹 재생용 faststart
      const script = [
        `cd ${dir}`,
        `node dl.mjs src in.bin`,
        `ffmpeg -v error -y -i in.bin -t ${VIDEO_LIMIT.maxSeconds + 5} -vf "scale=w='if(lt(iw,ih),1080,-2)':h='if(lt(iw,ih),-2,1080)',fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 25 -g 30 -keyint_min 30 -sc_threshold 0 -movflags +faststart -c:a aac -b:a 96k -ac 2 out.mp4`,
        `rm -f in.bin`,
        `ffmpeg -v error -y -ss 0.5 -i out.mp4 -frames:v 1 -vf scale=480:-2 -q:v 4 poster.jpg`,
        `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json out.mp4 > probe.json`,
        `node ul.mjs video out.mp4 video/mp4`,
        `node ul.mjs poster poster.jpg image/jpeg`,
      ].join(" && ");
      await runDetached(sb, script, 8 * 60 * 1000);
      const probe = JSON.parse((await sb.readFileToBuffer({ path: `${dir}/probe.json` }))?.toString() || "{}") as { streams?: { codec_type: string; width?: number; height?: number }[]; format?: { duration?: string } };
      const v = probe.streams?.find((s) => s.codec_type === "video");
      const size = Number((await (await sb.runCommand("bash", ["-lc", `stat -c %s ${dir}/out.mp4`])).stdout()).trim()) || null;
      await update({
        status: "ready",
        path,
        poster_path: posterPath,
        duration: Math.round(Number(probe.format?.duration || 0) * 100) / 100,
        width: v?.width ?? null,
        height: v?.height ?? null,
        has_audio: !!probe.streams?.some((s) => s.codec_type === "audio"),
        size_bytes: size,
        last_used_at: new Date().toISOString(),
      });
    } finally {
      await sb.stop().catch(() => {});
    }
  } catch (e) {
    await update({ status: "failed", error: e instanceof Error ? e.message.slice(0, 400) : String(e) });
  } finally {
    // 원본은 성공·실패와 상관없이 바로 지운다 (용량·개인 영상 보관 최소화)
    await db.storage.from(BUCKET).remove([m.original_path]).catch(() => {});
    await update({ original_path: null });
  }
}

/** 편집 저장·영상 만들기 때: 쓰고 있는 영상은 정리 대상에서 빠지도록 */
export async function touchMedia(ids: string[]) {
  if (!ids.length) return;
  await reelsAdminClient().from("reel_media").update({ last_used_at: new Date().toISOString() }).in("id", ids);
}

export async function deleteMedia(vacancyId: string, id: string) {
  const db = reelsAdminClient();
  const { data: m } = await db.from("reel_media").select("path, poster_path, original_path").eq("id", id).eq("vacancy_id", vacancyId).single();
  if (!m) throw new Error("영상을 찾을 수 없습니다.");
  await db.storage.from(BUCKET).remove([m.path, m.poster_path, m.original_path].filter(Boolean) as string[]);
  await db.from("reel_media").delete().eq("id", id);
}

/** 정리: 30일 안 쓴 영상, 하루 넘게 '올리는 중'에 멈춘 기록 */
export async function purgeUnusedMedia(): Promise<number> {
  const db = reelsAdminClient();
  const old = new Date(Date.now() - UNUSED_DAYS * 86400_000).toISOString();
  const stuck = new Date(Date.now() - 86400_000).toISOString();
  const { data } = await db
    .from("reel_media")
    .select("id, path, poster_path, original_path")
    .or(`last_used_at.lt.${old},and(status.in.(uploading,processing,failed),created_at.lt.${stuck})`)
    .limit(200);
  if (!data?.length) return 0;
  const files = data.flatMap((m) => [m.path, m.poster_path, m.original_path]).filter(Boolean) as string[];
  if (files.length) await db.storage.from(BUCKET).remove(files);
  await db.from("reel_media").delete().in("id", data.map((m) => m.id));
  return data.length;
}

// 샌드박스 안에서 올리기 (내려받기는 render.ts 의 SANDBOX_DL)
const UL = `import { readFileSync } from "node:fs";
const [key, file, type] = process.argv.slice(2);
const url = JSON.parse(readFileSync("urls.json", "utf8"))[key];
const r = await fetch(url, { method: "PUT", headers: { "content-type": type, "x-upsert": "true" }, body: readFileSync(file) });
if (!r.ok) throw new Error("upload " + r.status + " " + (await r.text()).slice(0, 200));
`;
