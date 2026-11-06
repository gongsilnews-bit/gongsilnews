/**
 * 웹 PC 폴더 저장 — 관리자 왼쪽 [저장 폴더]에서 정한 공실뉴스 폴더에 보고서·홍보지 파일을 쓴다 (2026-11-04 사장님: "우리 웹과 맞춰서")
 *  공실뉴스\02 매물보고서\20261106 매물보고서_잠원동_….pdf (2026-11-06 사장님: 보고서·홍보지 폴더 따로) — 날짜 폴더 없이, 이름 앞에 날짜 (2026-11-06 사장님: "폴더가 너무 많아")
 *  폴더 손잡이는 웹 관리자(src/components/admin/studio-web/folder.ts)가 같은 사이트의 IndexedDB "gs-web-folder"에 넣어 둔 것을 읽는다
 *  폴더를 안 정했거나 허락이 없으면 false → 부르는 쪽이 지금처럼 다운로드로 받는다
 *  marketing/report/webFolder.ts 와 marketing/ai-detail/webFolder.ts 는 같은 내용 (둘 다 고칠 것)
 */
const DB = "gs-web-folder";
const SUB = "02 매물보고서"; // folder.ts 의 F.mkt 와 같게

/* eslint-disable @typescript-eslint/no-explicit-any */
function rootHandle(): Promise<any | null> {
  return new Promise((resolve) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("h");
      r.onerror = () => resolve(null);
      r.onsuccess = () => {
        try {
          const q = r.result.transaction("h", "readonly").objectStore("h").get("root");
          q.onsuccess = () => resolve(q.result || null);
          q.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
    } catch { resolve(null); }
  });
}

const ymd = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; };

function toast(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:100001;background:#1a3a6b;color:#fff;padding:11px 18px;border-radius:10px;font-size:13.5px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw;font-family:'Pretendard Variable',-apple-system,sans-serif";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/** dataUrl(이미지·PDF)을 폴더에 쓴다 — 됐으면 true */
export async function saveToWebFolder(fileName: string, dataUrl: string): Promise<boolean> {
  try {
    const root = await rootHandle();
    if (!root || (await root.queryPermission({ mode: "readwrite" })) !== "granted") return false;
    const dir = await root.getDirectoryHandle(SUB, { create: true });
    // "매물보고서_잠원동_….pdf" → "20261106 매물보고서_잠원동_….pdf" (사장님이 보내 준 모양 그대로) · 같은 이름이 있으면 (2), (3)…
    const dot = fileName.lastIndexOf(".");
    const stem = `${ymd()} ${(dot > 0 ? fileName.slice(0, dot) : fileName).trim()}`, ext = dot > 0 ? fileName.slice(dot) : "";
    let name = `${stem}${ext}`;
    for (let n = 2; n < 100; n++) {
      try { await dir.getFileHandle(name); } catch { break; } // 없으면 이 이름
      name = `${stem} (${n})${ext}`;
    }
    const blob = await (await fetch(dataUrl)).blob();
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await w.write(blob);
    await w.close();
    toast(`${root.name}\\${SUB} 에 저장했어요 — ${name}`);
    return true;
  } catch { return false; }
}

/** [📁] 내보낸 파일 보기 (2026-11-06 사장님: "버튼 옆에 파일 이미지, 누르면 바로 연결") — 웹은 탐색기를 못 연다.
 *  그 폴더에서 파일 고르기 창을 열고, 고른 파일을 새 탭에서 연다. 폴더를 안 정했으면 "nofolder" */
export async function openFromWebFolder(): Promise<"ok" | "nofolder" | "cancel"> {
  const root = await rootHandle();
  if (!root) return "nofolder";
  try {
    let perm = await root.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") perm = await root.requestPermission({ mode: "readwrite" }); // 누른 순간이라 물어볼 수 있다
    if (perm !== "granted") return "nofolder";
    const dir = await root.getDirectoryHandle(SUB, { create: true });
    const [h] = await (window as any).showOpenFilePicker({ startIn: dir, multiple: false });
    const f: File = await h.getFile();
    const url = URL.createObjectURL(f);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "ok";
  } catch (e: any) {
    return e && e.name === "AbortError" ? "cancel" : "nofolder";
  }
}
export const WEB_FOLDER_NAME = SUB;