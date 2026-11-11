"use server";
// 최고관리자 MD지침서 — 문서 읽기·쓰기·카테고리 관리 (2026-11-11)
// 실제 사이트(Vercel)에서도 쓰게 문서는 Supabase Storage(비공개 버킷 md-docs)에 둔다 — Vercel 은 파일을 고칠 수 없어서 (2026-11-11 사장님)
//  처음 문서는 저장소 docs/ 를 한 번 옮겨 담았다. 함수마다 최고관리자인지 확인한다 (서버 액션은 누구나 부를 수 있어서)
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";

const BUCKET = "md-docs";
const MAP_KEY = "_category_map.json";
const META_KEY = "_file_meta.json";
const DIR = "f"; // 문서는 f/<주소 이름을 base64url>.md — Storage 이름에 한글을 못 써서

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function isAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return false;
  const { data: m } = await db().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(m?.role);
}
const NO = "최고관리자만 쓸 수 있어요.";
const keyOf = (rel: string) => `${DIR}/${Buffer.from(rel, "utf8").toString("base64url")}.md`;
const relOf = (name: string) => Buffer.from(name.replace(/\.md$/, ""), "base64url").toString("utf8");
/** 문서 주소 이름 다듬기 — 앞뒤 / 빼고, .. 같은 것 막기 */
const cleanRel = (rel: string) => {
  const r = String(rel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").trim();
  if (!r || r.split("/").some((x) => !x || x === "." || x === "..")) return "";
  return r;
};
async function readText(key: string): Promise<string | null> {
  const { data, error } = await db().storage.from(BUCKET).download(key);
  if (error || !data) return null;
  return await data.text();
}
async function writeText(key: string, text: string, type = "text/markdown; charset=utf-8") {
  const { error } = await db().storage.from(BUCKET).upload(key, new Blob([text], { type }), { upsert: true, contentType: type });
  if (error) throw new Error(error.message);
}

// 1차 → 2차 → 파일 경로 목록
export type CategoryMap = Record<string, Record<string, string[]>>;

const DEFAULT_MAP: CategoryMap = {
  공실뉴스: {
    기사작성: [],
    기사관리: [],
    회원관리: [],
    "AI에이전트": [],
    "경매·공실등록": [],
    공인중개사: [],
  },
  공실마케팅스튜디오: {
    동영상제작: [],
    "쇼츠·릴스": [],
    포토스튜디오: [],
    SNS발행: [],
    "보고서·홍보지": [],
    도우미확장: [],
    "AI설정·성우": [],
    "회원·결제": [],
  },
  "개발·기술": {
    아키텍처: [],
    개발로그: [],
    "성능·보안": [],
  },
  "운영·기획": {
    서비스기획: [],
    최고관리자: [],
    "FAQ·매뉴얼": [],
  },
};

/** 카테고리 맵 불러오기 (없으면 기본값) */
export async function getMdCategoryMap(): Promise<{ success: boolean; map: CategoryMap }> {
  if (!(await isAdmin())) return { success: false, map: {} };
  try {
    const data = await readText(MAP_KEY);
    if (!data) return { success: true, map: DEFAULT_MAP };
    const saved = JSON.parse(data) as CategoryMap;
    // 기본값의 카테고리는 항상 포함 (새 카테고리가 기본값에 추가돼도 유지)
    const merged: CategoryMap = JSON.parse(JSON.stringify(DEFAULT_MAP));
    for (const [c1, subs] of Object.entries(saved)) {
      if (!merged[c1]) merged[c1] = {};
      for (const [c2, files] of Object.entries(subs)) merged[c1][c2] = files;
    }
    return { success: true, map: merged };
  } catch {
    return { success: true, map: DEFAULT_MAP };
  }
}

/** 카테고리 맵 저장 */
export async function saveMdCategoryMap(map: CategoryMap): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdmin())) return { success: false, error: NO };
  try {
    await writeText(MAP_KEY, JSON.stringify(map, null, 2), "application/json");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** 모든 문서 목록 */
export async function listMdFiles(): Promise<{ success: boolean; files: string[] }> {
  if (!(await isAdmin())) return { success: false, files: [] };
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db().storage.from(BUCKET).list(DIR, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error || !data) return { success: false, files };
    for (const o of data) if (o.name.endsWith(".md")) files.push(relOf(o.name));
    if (data.length < 1000) break;
  }
  files.sort((a, b) => a.localeCompare(b));
  return { success: true, files };
}

/** 문서 읽기 */
export async function readMdFile(relPath: string): Promise<{ success: boolean; content: string }> {
  if (!(await isAdmin())) return { success: false, content: NO };
  const rel = cleanRel(relPath);
  if (!rel) return { success: false, content: "잘못된 경로입니다." };
  const t = await readText(keyOf(rel));
  return t == null ? { success: false, content: "파일을 읽지 못했습니다." } : { success: true, content: t };
}

/** 문서 저장 (없으면 생성, 있으면 덮어쓰기) */
export async function saveMdFile(relPath: string, content: string): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdmin())) return { success: false, error: NO };
  const rel = cleanRel(relPath);
  if (!rel) return { success: false, error: "잘못된 경로입니다." };
  try {
    await writeText(keyOf(rel), content);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** 문서 삭제 */
export async function deleteMdFile(relPath: string): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdmin())) return { success: false, error: NO };
  const rel = cleanRel(relPath);
  if (!rel) return { success: false, error: "잘못된 경로입니다." };
  const { error } = await db().storage.from(BUCKET).remove([keyOf(rel)]);
  return error ? { success: false, error: error.message } : { success: true };
}

/* ── 문서 작성자·날짜 ───────────────────────── */

export type FileMeta = { author: string; createdAt: string; updatedAt: string; updatedBy?: string };
export type FileMetaMap = Record<string, FileMeta>;

/** 작성자·날짜 맵 불러오기 */
export async function getFileMetaMap(): Promise<{ success: boolean; map: FileMetaMap }> {
  if (!(await isAdmin())) return { success: false, map: {} };
  try {
    const data = await readText(META_KEY);
    return { success: true, map: data ? (JSON.parse(data) as FileMetaMap) : {} };
  } catch {
    return { success: true, map: {} };
  }
}

/** 특정 문서의 작성자·날짜 갱신 (새로 만들거나 고친 뒤) */
export async function updateFileMeta(relPath: string, update: { author?: string; isNew?: boolean }): Promise<{ success: boolean }> {
  if (!(await isAdmin())) return { success: false };
  try {
    const { map } = await getFileMetaMap();
    const now = new Date().toISOString();
    const existing = map[relPath];
    map[relPath] = !existing || update.isNew
      ? { author: update.author || "관리자", createdAt: now, updatedAt: now, updatedBy: update.author }
      : { ...existing, updatedAt: now, updatedBy: update.author || existing.updatedBy };
    await writeText(META_KEY, JSON.stringify(map, null, 2), "application/json");
    return { success: true };
  } catch {
    return { success: false };
  }
}

/** 문서 이름 변경 */
export async function renameMdFile(oldRelPath: string, newRelPath: string): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdmin())) return { success: false, error: NO };
  const a = cleanRel(oldRelPath), z = cleanRel(newRelPath);
  if (!a || !z) return { success: false, error: "잘못된 경로입니다." };
  const { error } = await db().storage.from(BUCKET).move(keyOf(a), keyOf(z));
  return error ? { success: false, error: error.message } : { success: true };
}
