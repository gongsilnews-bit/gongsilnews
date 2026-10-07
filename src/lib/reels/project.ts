// 릴스 프로젝트 저장소: 매물마다 편집 중인 대본 하나. 처음 열 때만 AI 초안, 이후엔 저장본을 연다.
import { buildDraft, buildFromScript, ctaScene, priceScene, reviewScript, splitScript } from "./draft";
import { loadReelListing, reelsAdminClient } from "./listing";
import { cleanFx, cleanSettings, cleanVideo, REEL_STYLES, type ReelScene, type ReelScript, type ReelStyle } from "./types";
import { REEL_VOICES } from "./voice";
import { touchMedia } from "./media";
import { getMyMusic } from "./music";
import { isBasicMusic, isLibraryMusic, isMyMusic } from "./music-catalog";

// 배경음악 값 확인: 음악 없음 · 기본 2곡 · 무료 음악 · 이 매물에 올린 내 음악
async function validMusic(vacancyId: string, music: string) {
  if (music === "none" || isBasicMusic(music) || isLibraryMusic(music)) return true;
  return isMyMusic(music) && !!(await getMyMusic(vacancyId, music));
}

export interface ReelProject {
  vacancyId: string;
  script: ReelScript;
  voice: string;
  music: string;
  updatedAt: string;
}

const row = (r: { vacancy_id: string; script: ReelScript; voice: string; music: string; updated_at: string }): ReelProject => ({
  vacancyId: r.vacancy_id,
  script: r.script,
  voice: r.voice,
  music: r.music,
  updatedAt: r.updated_at,
});

export async function getProject(vacancyId: string): Promise<ReelProject | null> {
  const { data } = await reelsAdminClient().from("reel_projects").select("vacancy_id, script, voice, music, updated_at").eq("vacancy_id", vacancyId).maybeSingle();
  return data ? row(data) : null;
}

/** 프로젝트 새로 시작: AI 자동 초안, 또는 회원이 쓴 대본 (처음 열 때, 또는 [대본 다시 시작]) */
export async function createProject(vacancyId: string, memberId: string, start: { mode: "auto" } | { mode: "script"; text: string; withAuto: boolean } = { mode: "auto" }) {
  const listing = await loadReelListing(vacancyId);
  const built = start.mode === "script" ? await buildFromScript(listing, start.text, start.withAuto) : await buildDraft(listing);
  const warnings = built.warnings;
  // AI 초안은 먼저 초안 화면에서 글을 다듬고 성우·스타일·음악을 고른 뒤 클립으로 만든다
  const script: ReelScript = { ...built.script, draft: start.mode === "auto" };
  const prev = await getProject(vacancyId);
  const { data, error } = await reelsAdminClient()
    .from("reel_projects")
    .upsert({ vacancy_id: vacancyId, member_id: memberId, script, voice: prev?.voice || "Aoede", music: prev?.music || "upbeat", updated_at: new Date().toISOString() })
    .select("vacancy_id, script, voice, music, updated_at")
    .single();
  if (error || !data) throw new Error(`프로젝트 저장 실패: ${error?.message}`);
  return { project: row(data), warnings };
}

/** 편집 저장: 장면(대사·강조·스티커·사진·순서)과 목소리·음악만 받는다. 매물 사실·사진 검사 결과는 서버 저장본 유지 */
export async function saveProject(vacancyId: string, memberId: string, scenes: ReelScene[], voice: string, music: string, settings?: unknown) {
  const prev = await getProject(vacancyId);
  if (!prev) throw new Error("프로젝트가 없습니다. 먼저 초안을 만들어 주세요.");
  const allowed = new Set(prev.script.photos.filter((p) => p.keep).map((p) => p.url));
  const byLocked = new Map(prev.script.scenes.filter((s) => s.locked).map((s) => [s.kind, s]));
  const clean: ReelScene[] = scenes.slice(0, 10).map((s, i) => {
    const locked = byLocked.get(s.kind) || (s.kind === "price" ? priceScene(prev.script.facts, null) : s.kind === "cta" ? ctaScene(prev.script.facts, null) : undefined);
    const photo = s.photo && allowed.has(s.photo) ? s.photo : null;
    const caption = s.caption ? String(s.caption).slice(0, 80) : null;
    if (locked && (s.kind === "price" || s.kind === "cta")) {
      const base = { ...locked, id: `s${i + 1}`, photo: photo ?? locked.photo, fx: cleanFx(s.fx), caption, highlight: Array.isArray(s.highlight) ? s.highlight.filter(Number.isInteger).slice(0, 6) : locked.highlight };
      // 회원이 직접 고친 문장 (숫자는 reviewScript 가 등록 정보와 대조해 경고)
      if (s.custom && String(s.tts || "").trim()) return { ...base, custom: true, units: undefined, tts: String(s.tts).slice(0, 80) };
      // 되돌리기: 등록 정보로 문장을 다시 만든다
      const fresh = s.kind === "price" ? priceScene(prev.script.facts, base.photo) : ctaScene(prev.script.facts, base.photo);
      return { ...base, ...fresh, id: base.id, fx: base.fx, caption, custom: false };
    }
    return {
      id: `s${i + 1}`,
      kind: i === 0 ? "hook" : "photo",
      photo,
      tts: String(s.tts || "").slice(0, 80),
      highlight: Array.isArray(s.highlight) ? s.highlight.filter(Number.isInteger).slice(0, 4) : [],
      sticker: s.sticker ? String(s.sticker).slice(0, 10) : null,
      caption,
      fx: cleanFx(s.fx),
      video: cleanVideo(s.video),
    };
  });
  const { data, error } = await reelsAdminClient()
    .from("reel_projects")
    .update({
      member_id: memberId,
      script: { ...prev.script, scenes: clean, settings: settings === undefined ? prev.script.settings : cleanSettings(settings) },
      voice: (REEL_VOICES as readonly string[]).includes(voice) ? voice : prev.voice,
      music: (await validMusic(vacancyId, music)) ? music : prev.music,
      updated_at: new Date().toISOString(),
    })
    .eq("vacancy_id", vacancyId)
    .select("vacancy_id, script, voice, music, updated_at")
    .single();
  if (error || !data) throw new Error(`저장 실패: ${error?.message}`);
  await touchMedia([...new Set(clean.map((s) => s.video?.media).filter(Boolean) as string[])]).catch(() => {});
  return row(data);
}

/** 새 사진을 프로젝트에 추가 (검사 결과 포함). 매물 등록 사진 목록은 건드리지 않는다 */
export async function addProjectPhotos(vacancyId: string, photos: ReelScript["photos"]) {
  const prev = await getProject(vacancyId);
  if (!prev) throw new Error("프로젝트가 없습니다.");
  const script = { ...prev.script, photos: [...prev.script.photos, ...photos] };
  await reelsAdminClient().from("reel_projects").update({ script, updated_at: new Date().toISOString() }).eq("vacancy_id", vacancyId);
  return script.photos;
}

/**
 * 초안 화면 [이대로 클립 만들기]: 다듬은 대본(한 줄 = 클립 하나)과 성우·스타일·음악으로 클립을 만든다.
 * 글이 그대로인 줄은 기존 클립(사진·스티커·강조·효과)을 그대로 쓰고, 고친 줄은 같은 자리의 사진·스티커를 이어받는다.
 * 가격·마무리 클립은 등록 정보로 항상 끝에 붙는다.
 */
export async function confirmDraft(vacancyId: string, memberId: string, text: string, voice: string, music: string, style: ReelStyle) {
  const prev = await getProject(vacancyId);
  if (!prev) throw new Error("초안이 없습니다. 먼저 초안을 만들어 주세요.");
  const lines = splitScript(text).slice(0, 8);
  if (!lines.length) throw new Error("대본이 비어 있습니다.");
  const f = prev.script.facts;
  const kept = prev.script.photos.filter((p) => p.keep).map((p) => p.url);
  if (!kept.length) throw new Error("릴스에 쓸 수 있는 사진이 없습니다.");
  const pool = prev.script.scenes.filter((s) => !s.locked);
  const taken = new Set<number>();
  const usedPhotos = new Set<string>();
  const scenes: ReelScene[] = lines.map((tts, i) => {
    const same = pool.findIndex((s, k) => !taken.has(k) && s.tts.trim() === tts);
    if (same >= 0) {
      taken.add(same);
      if (pool[same].photo) usedPhotos.add(pool[same].photo!);
      return { ...pool[same], kind: i === 0 ? "hook" : "photo" };
    }
    const near = pool[i];
    const photo = near?.photo || kept.find((u) => !usedPhotos.has(u)) || kept[i % kept.length];
    usedPhotos.add(photo);
    return {
      id: "",
      kind: i === 0 ? "hook" : "photo",
      photo,
      tts,
      highlight: tts.split(/\s+/).map((w, k) => (/\d/.test(w) ? k : -1)).filter((k) => k >= 0).slice(0, 2),
      sticker: near?.sticker ?? null,
      fx: near?.fx,
    };
  });
  const price = prev.script.scenes.find((s) => s.kind === "price") || priceScene(f, (kept[1] || kept[0]));
  const cta = prev.script.scenes.find((s) => s.kind === "cta") || ctaScene(f, kept[0]);
  const all = [...scenes, price, cta].map((s, i) => ({ ...s, id: `s${i + 1}` }));
  const known = REEL_STYLES.find((x) => x.id === style);
  const script: ReelScript = { ...prev.script, scenes: all, draft: false, settings: { ...cleanSettings(prev.script.settings), style: known ? known.id : "lively" } };
  const { data, error } = await reelsAdminClient()
    .from("reel_projects")
    .update({
      member_id: memberId,
      script,
      voice: (REEL_VOICES as readonly string[]).includes(voice) ? voice : prev.voice,
      music: (await validMusic(vacancyId, music)) ? music : prev.music,
      updated_at: new Date().toISOString(),
    })
    .eq("vacancy_id", vacancyId)
    .select("vacancy_id, script, voice, music, updated_at")
    .single();
  if (error || !data) throw new Error(`저장 실패: ${error?.message}`);
  return { project: row(data), warnings: reviewScript(script) };
}
