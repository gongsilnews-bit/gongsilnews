// 릴스 제작 작업 1건: 성우(저장본 재사용) → 숫자 검사 → 구성 → 샌드박스 렌더 → 저장. reel_jobs 에 단계별 진행을 기록한다.
import { verifySpeech } from "./gemini";
import { reelsAdminClient } from "./listing";
import { getMedia, touchMedia } from "./media";
import { getMyMusic } from "./music";
import { isMyMusic, musicAsset } from "./music-catalog";
import { renderInSandbox } from "./render";
import { buildReel, type TemplateScene } from "./template";
import { sceneWords, spokenText, type ReelScript } from "./types";
import { getVoice, revoice } from "./voice";

const BUCKET = "reels";

export async function runReelJob(jobId: string) {
  const db = reelsAdminClient();
  const timings: Record<string, number> = {};
  const warnings: string[] = [];
  const update = (patch: Record<string, unknown>) => db.from("reel_jobs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", jobId);
  const step = async <T>(stage: string, fn: () => Promise<T>) => {
    await update({ status: "running", stage });
    const t = Date.now();
    const r = await fn();
    timings[stage] = Math.round((Date.now() - t) / 100) / 10;
    return r;
  };

  try {
    const { data: job, error } = await db.from("reel_jobs").select("id, vacancy_id, script, voice, warnings").eq("id", jobId).single();
    if (error || !job) throw new Error("작업을 찾을 수 없습니다.");
    const script = job.script as ReelScript & { music?: string };
    warnings.push(...((job.warnings as string[]) || []));

    const voiced = await step("voice", () => Promise.all(script.scenes.map((s) => getVoice(job.vacancy_id, spokenText(s), job.voice))));

    // 숫자가 들어간 장면(가격·매물번호)은 들어 보고, 다르게 들리면 한 번 다시 녹음한다
    // 숫자 확인은 안전장치: 제미나이가 혼잡해 확인을 못 해도 영상은 계속 만든다 (2026-10-06 혼잡으로 두 번 실패한 뒤)
    await step("verify", async () => {
      for (const [i, s] of script.scenes.entries()) {
        if (!s.locked) continue;
        try {
          let check = await verifySpeech(voiced[i].wav, spokenText(s));
          if (!check.match) {
            voiced[i] = { ...(await revoice(job.vacancy_id, spokenText(s), job.voice)), cached: false };
            check = await verifySpeech(voiced[i].wav, spokenText(s));
          }
          if (!check.match) warnings.push(`${i + 1}번 클립 성우 확인 필요: "${check.heard}" 로 들립니다.`);
        } catch {
          warnings.push(`${i + 1}번 클립 숫자 발음 확인을 건너뛰었어요 (AI 서버 혼잡). 완성 영상에서 가격·매물번호를 한 번 들어 봐 주세요.`);
        }
      }
    });

    const photoUrls = [...new Set(script.scenes.map((s) => s.photo).filter(Boolean) as string[])];
    const photoFile = (url: string) => `media/p${photoUrls.indexOf(url)}.${(url.split("?")[0].split(".").pop() || "jpg").toLowerCase()}`;
    // 영상 클립: 이 매물의 준비된 영상만 쓴다 (아니면 사진으로 대신)
    const mediaIds = [...new Set(script.scenes.map((s) => s.video?.media).filter(Boolean) as string[])];
    const mediaRows = await getMedia(mediaIds);
    const ok = (id?: string) => {
      const m = id ? mediaRows.get(id) : undefined;
      return m && m.status === "ready" && m.url && m.vacancyId === job.vacancy_id ? m : null;
    };
    const usedMedia = mediaIds.filter((id) => ok(id));
    await touchMedia(usedMedia).catch(() => {});
    const scenes: TemplateScene[] = script.scenes.map((s, i) => ({
      id: s.id,
      kind: s.kind,
      photo: s.photo,
      ...sceneWords(s),
      highlight: s.highlight || [],
      sticker: s.sticker,
      fx: s.fx,
      audioSrc: `media/${s.id}.wav`,
      duration: voiced[i].duration,
      video: (() => {
        const m = ok(s.video?.media);
        if (!m || !s.video) return null;
        const k = usedMedia.indexOf(m.id);
        return { ...s.video, src: `media/v${k}.mp4`, poster: m.poster ? `media/v${k}.jpg` : null, dur: m.duration || 0, hasAudio: m.hasAudio, speed: s.video.speed ?? "auto", sound: s.video.sound ?? "off", fit: s.video.fit ?? "cover" };
      })(),
    }));
    // 배경음악: 기본·무료 음악은 스냅샷 안 파일, 내 음악은 샌드박스가 저장소에서 바로 받는다
    const musicId = script.music || "upbeat";
    const mine = isMyMusic(musicId) ? await getMyMusic(job.vacancy_id, musicId) : null;
    const musicFile = mine?.url ? `media/mymusic.${mine.path.split(".").pop()}` : musicAsset(musicId) ? `assets/${musicAsset(musicId)}` : null;
    const music = musicFile ? { file: musicFile, start: script.settings?.musicStart || 0 } : null;
    const { html, plan } = buildReel({
      facts: script.facts,
      agency: script.agency,
      scenes,
      photoSize: Object.fromEntries(script.photos.map((p) => [p.url, { w: p.w, h: p.h }])),
      photoSrc: photoFile,
      assetBase: "assets/",
      bgmSrc: music ? "media/bed.wav" : null,
      settings: script.settings,
    });

    const media = [
      ...(await Promise.all(photoUrls.map(async (url) => ({ path: photoFile(url), content: Buffer.from(await (await fetch(url)).arrayBuffer()) })))),
      ...script.scenes.map((s, i) => ({ path: `media/${s.id}.wav`, content: voiced[i].wav })),
    ];

    const downloads = [
      ...usedMedia.flatMap((id, k) => {
        const m = mediaRows.get(id)!;
        return [{ path: `media/v${k}.mp4`, url: m.url! }, ...(m.poster ? [{ path: `media/v${k}.jpg`, url: m.poster }] : [])];
      }),
      ...(mine?.url && musicFile ? [{ path: musicFile, url: mine.url }] : []),
    ];
    const { mp4 } = await step("render", () => renderInSandbox({ jobId, html, media, downloads, totalSeconds: plan.total, music }));

    const path = `${job.vacancy_id}/${jobId}.mp4`;
    await step("upload", async () => {
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, mp4, { contentType: "video/mp4", upsert: true });
      if (upErr) throw new Error(`영상 저장 실패: ${upErr.message}`);
    });

    await update({ status: "done", stage: null, video_path: path, duration_s: plan.total, warnings, timings, finished_at: new Date().toISOString() });
  } catch (e) {
    await update({ status: "failed", error: e instanceof Error ? e.message : String(e), warnings, timings, finished_at: new Date().toISOString() });
  }
}

/** 재생용 주소. download 에 파일 이름을 주면 누르는 즉시 PC·휴대폰에 저장되는 주소 */
export async function signedReelUrl(path: string, expiresIn = 60 * 60, download?: string) {
  const { data } = await reelsAdminClient().storage.from(BUCKET).createSignedUrl(path, expiresIn, download ? { download } : undefined);
  return data?.signedUrl || null;
}
