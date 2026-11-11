"use server";
// 최고관리자 MD지침서 — docs/ 폴더 파일 읽기·쓰기·카테고리 관리 (2026-11-11)
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "docs");
const MAP_FILE = path.join(DOCS_DIR, ".category_map.json");

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

/** 카테고리 맵 불러오기 (파일 없으면 기본값) */
export async function getMdCategoryMap(): Promise<{ success: boolean; map: CategoryMap }> {
  try {
    const data = await fs.readFile(MAP_FILE, "utf-8");
    const saved = JSON.parse(data) as CategoryMap;
    // 기본값의 카테고리는 항상 포함 (새 카테고리가 기본값에 추가돼도 유지)
    const merged: CategoryMap = JSON.parse(JSON.stringify(DEFAULT_MAP));
    for (const [c1, subs] of Object.entries(saved)) {
      if (!merged[c1]) merged[c1] = {};
      for (const [c2, files] of Object.entries(subs)) {
        merged[c1][c2] = files;
      }
    }
    return { success: true, map: merged };
  } catch {
    return { success: true, map: DEFAULT_MAP };
  }
}

/** 카테고리 맵 저장 */
export async function saveMdCategoryMap(map: CategoryMap): Promise<{ success: boolean; error?: string }> {
  try {
    await fs.writeFile(MAP_FILE, JSON.stringify(map, null, 2), "utf-8");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** docs/ 아래 모든 .md 파일 목록 (재귀, .으로 시작하는 파일·폴더 제외) */
export async function listMdFiles(): Promise<{ success: boolean; files: string[] }> {
  async function walk(dir: string, base: string): Promise<string[]> {
    let entries: fsSync.Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const results: string[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(base, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        results.push(...(await walk(fullPath, relPath)));
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".MD")) {
        results.push(relPath);
      }
    }
    return results;
  }
  try {
    const files = await walk(DOCS_DIR, "");
    return { success: true, files };
  } catch (e: any) {
    return { success: false, files: [] };
  }
}

/** MD 파일 내용 읽기 */
export async function readMdFile(relPath: string): Promise<{ success: boolean; content: string }> {
  try {
    const fullPath = path.resolve(DOCS_DIR, relPath);
    // 경로 탈출 방지
    if (!fullPath.startsWith(DOCS_DIR + path.sep) && fullPath !== DOCS_DIR) {
      return { success: false, content: "잘못된 경로입니다." };
    }
    const content = await fs.readFile(fullPath, "utf-8");
    return { success: true, content };
  } catch (e: any) {
    return { success: false, content: `파일을 읽지 못했습니다: ${e.message}` };
  }
}

/** MD 파일 저장 (없으면 생성, 있으면 덮어쓰기) */
export async function saveMdFile(relPath: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fullPath = path.resolve(DOCS_DIR, relPath);
    if (!fullPath.startsWith(DOCS_DIR + path.sep) && fullPath !== DOCS_DIR) {
      return { success: false, error: "잘못된 경로입니다." };
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** MD 파일 삭제 */
export async function deleteMdFile(relPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fullPath = path.resolve(DOCS_DIR, relPath);
    if (!fullPath.startsWith(DOCS_DIR + path.sep) && fullPath !== DOCS_DIR) {
      return { success: false, error: "잘못된 경로입니다." };
    }
    await fs.unlink(fullPath);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ── 파일 메타데이터 (작성자·날짜) ───────────────────────── */

export type FileMeta = { author: string; createdAt: string; updatedAt: string; updatedBy?: string };
export type FileMetaMap = Record<string, FileMeta>;

const META_FILE = path.join(DOCS_DIR, ".file_meta.json");

/** 파일 메타데이터 맵 불러오기 */
export async function getFileMetaMap(): Promise<{ success: boolean; map: FileMetaMap }> {
  try {
    const data = await fs.readFile(META_FILE, "utf-8");
    return { success: true, map: JSON.parse(data) as FileMetaMap };
  } catch {
    return { success: true, map: {} };
  }
}

/** 특정 파일의 메타데이터 갱신 (신규 생성 또는 편집 후 호출) */
export async function updateFileMeta(
  relPath: string,
  update: { author?: string; isNew?: boolean }
): Promise<{ success: boolean }> {
  try {
    const { map } = await getFileMetaMap();
    const now = new Date().toISOString();
    const existing = map[relPath];
    if (!existing || update.isNew) {
      map[relPath] = {
        author: update.author || "관리자",
        createdAt: now,
        updatedAt: now,
        updatedBy: update.author,
      };
    } else {
      map[relPath] = {
        ...existing,
        updatedAt: now,
        updatedBy: update.author || existing.updatedBy,
      };
    }
    await fs.writeFile(META_FILE, JSON.stringify(map, null, 2), "utf-8");
    return { success: true };
  } catch {
    return { success: false };
  }
}

/** MD 파일 이름 변경 */
export async function renameMdFile(oldRelPath: string, newRelPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const oldFull = path.resolve(DOCS_DIR, oldRelPath);
    const newFull = path.resolve(DOCS_DIR, newRelPath);
    if (!oldFull.startsWith(DOCS_DIR + path.sep) || !newFull.startsWith(DOCS_DIR + path.sep)) {
      return { success: false, error: "잘못된 경로입니다." };
    }
    await fs.mkdir(path.dirname(newFull), { recursive: true });
    await fs.rename(oldFull, newFull);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
