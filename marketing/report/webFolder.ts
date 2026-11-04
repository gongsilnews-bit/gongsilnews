/**
 * 웹 PC 폴더 저장 — 관리자 왼쪽 [저장 폴더]에서 정한 공실뉴스 폴더에 보고서·홍보지 파일을 쓴다 (2026-11-04 사장님: "우리 웹과 맞춰서")
 *  공실뉴스\02 보고서홍보지\오늘 날짜(20261104)\파일
 *  폴더 손잡이는 웹 관리자(src/components/admin/studio-web/folder.ts)가 같은 사이트의 IndexedDB "gs-web-folder"에 넣어 둔 것을 읽는다
 *  폴더를 안 정했거나 허락이 없으면 false → 부르는 쪽이 지금처럼 다운로드로 받는다
 *  marketing/report/webFolder.ts 와 marketing/ai-detail/webFolder.ts 는 같은 내용 (둘 다 고칠 것)
 */
const DB = "gs-web-folder";
const SUB = "02 보고서홍보지"; // folder.ts 의 F.mkt 와 같게

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
    const day = ymd();
    const dir = await (await root.getDirectoryHandle(SUB, { create: true })).getDirectoryHandle(day, { create: true });
    const blob = await (await fetch(dataUrl)).blob();
    const w = await (await dir.getFileHandle(fileName, { create: true })).createWritable();
    await w.write(blob);
    await w.close();
    toast(`${root.name}\\${SUB}\\${day} 에 저장했어요 — ${fileName}`);
    return true;
  } catch { return false; }
}
