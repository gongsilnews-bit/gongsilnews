"use client";
/**
 * 자유 글쓰기 [저장하기]·[불러오기] (2026-11-07 사장님: "자유글쓰기는 저장하기 불러오기를 넣었으면 좋겠어" → "그렇게 해줘")
 *  쓰는 중인 글(제목·본문·사진)을 회원 PC 작업 파일로 — 01 뉴스SNS발행 바로 밑 "20261107 제목.gsn"
 *  같은 .gsn 이지만 안쪽 kind 가 달라서 칼럼·공실 작업 되살리기(gongsil.ts restoreFromFolder)는 건너뛴다
 *  서버에는 올리지 않는다 (만든 글은 로컬). 폴더를 아직 안 정했으면 그 자리에서 고르게, 크롬·엣지가 아니면 내려받기·파일 고르기로
 */
import { allowFolder, folderState, folderSupported, listFolder, pickFolder, pickFromFolder, saveToFolder } from "./folder";
import { safeName, ymd } from "./core";

export const FREE_KIND = "gongsilnews-web-freewrite";
export type FreeDraft = { id: string; title: string; body: string; photos: { url: string; caption: string }[]; savedAt: string };
export type FreeFile = { name: string; title: string; savedAt: string; chars: number; draft: FreeDraft };

const parse = (text: string): FreeDraft | null => {
  try {
    const d = JSON.parse(text);
    if (!d || d.kind !== FREE_KIND || !d.draft) return null;
    const x = d.draft;
    return { id: String(x.id || ""), title: String(x.title || ""), body: String(x.body || ""), photos: Array.isArray(x.photos) ? x.photos.filter((p: { url?: string }) => p && p.url) : [], savedAt: String(x.savedAt || d.savedAt || "") };
  } catch { return null; }
};

/** 폴더를 쓸 수 있게 — 단추를 누른 그 순간에 불러야 한다 (허락·폴더 고르기 창) */
async function ensureFolder(): Promise<boolean> {
  if (!folderSupported()) return false;
  const st = await folderState();
  if (st.set && st.granted) return true;
  if (st.set) return allowFolder();
  const r = await pickFolder();
  return Boolean(r.set && r.granted && !r.aborted);
}

/** 저장 — 처음이면 새 이름(같은 이름이 있으면 (2)…), 다음부터는 같은 파일에 덮어쓴다. 저장한 파일 이름을 돌려준다 */
export async function saveFreeDraft(d: Omit<FreeDraft, "savedAt">, name: string): Promise<{ name: string; where: "folder" | "download" }> {
  const savedAt = new Date().toISOString();
  const data = JSON.stringify({ kind: FREE_KIND, version: 1, savedAt, draft: { ...d, savedAt } });
  const blob = new Blob([data], { type: "application/json" });
  let file = name;
  if (await ensureFolder()) {
    if (!file) {
      const base = `${ymd()} ${safeName(d.title) || "무제"}`;
      const taken = new Set((await listFolder("sns", [], ".gsn")).filter((f) => !f.path.length).map((f) => f.name));
      file = `${base}.gsn`;
      for (let n = 2; taken.has(file); n++) file = `${base} (${n}).gsn`;
    }
    if (await saveToFolder("sns", [], file, blob)) return { name: file, where: "folder" };
  }
  // 폴더를 못 쓰면 (다른 브라우저·폴더 고르기를 닫음) 내려받기
  file ||= `${ymd()} ${safeName(d.title) || "무제"}.gsn`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return { name: file, where: "download" };
}

/** 저장 폴더의 쓰던 글 목록 — 새로 저장한 것부터. 폴더를 못 쓰면 null (부르는 쪽이 파일 고르기로) */
export async function listFreeDrafts(): Promise<FreeFile[] | null> {
  if (!(await ensureFolder())) return null;
  const out: FreeFile[] = [];
  for (const f of await listFolder("sns", [], ".gsn")) {
    if (f.path.length) continue; // 01 뉴스SNS발행 바로 밑만
    const d = parse(await f.file.text().catch(() => ""));
    if (d) out.push({ name: f.name, title: d.title || f.name.replace(/\.gsn$/i, ""), savedAt: d.savedAt, chars: d.body.length, draft: d });
  }
  return out.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

/** 다른 곳에 있는 파일 고르기 — 저장 폴더에서 창이 열린다. 고른 글 · 닫았으면 null */
export async function pickFreeDraft(): Promise<{ name: string; draft: FreeDraft } | null> {
  let file: File | null | undefined = await pickFromFolder("sns", ".gsn", "공실뉴스 작업 파일");
  if (file === undefined) {
    // 폴더 창을 못 열면 (크롬·엣지가 아님) 보통 파일 고르기
    file = await new Promise<File | null>((ok) => {
      const i = document.createElement("input");
      i.type = "file";
      i.accept = ".gsn";
      i.onchange = () => ok(i.files?.[0] || null);
      i.click();
    });
  }
  if (!file) return null;
  const d = parse(await file.text());
  if (!d) throw new Error("자유 글쓰기로 저장한 파일이 아니에요.");
  return { name: file.name, draft: d };
}
