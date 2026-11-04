"use client";
/**
 * 자동화 도우미(공실뉴스 작성기 확장) 설치 안내 (2026-11-04 사장님)
 *  [자동화 도우미 설치]를 누르면 — 크롬 · 엣지 · 웨일 탭, 탭마다 설치하는 법
 *   크롬·웨일: 웹스토어에서 자동 설치 + 파일 받아 직접 설치
 *   엣지: 파일 받아 직접 설치 (사장님: "엣지는 아까 알려준 대로 직접 설치")
 *  설치 파일: public/downloads/gongsilnews-helper.zip (작성기 4.1.0 — 스토어에 새 판을 올리면 같이 바꾼다)
 */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

export const HELPER_STORE_URL = "https://chromewebstore.google.com/detail/opoimbbagnpmhlblgbpophbigakilofc?utm_source=item-share-cb";
export const HELPER_ZIP_URL = "/downloads/gongsilnews-helper.zip";

type Browser = "chrome" | "edge" | "whale";
const B: Record<Browser, { name: string; page: string; dev: string; load: string; store: boolean }> = {
  chrome: { name: "크롬", page: "chrome://extensions", dev: "오른쪽 위 [개발자 모드]를 켜요", load: "[압축해제된 확장 프로그램을 로드합니다]", store: true },
  edge: { name: "엣지", page: "edge://extensions", dev: "왼쪽 메뉴 아래 [개발자 모드]를 켜요", load: "[압축 풀린 항목 로드]", store: false },
  whale: { name: "웨일", page: "whale://extensions", dev: "오른쪽 위 [개발자 모드]를 켜요", load: "[압축해제된 확장 프로그램을 로드합니다]", store: true },
};
const NAVY = "#1a3a6b";

function guessBrowser(): Browser {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Edg\//.test(ua)) return "edge";
  if (/Whale\//.test(ua)) return "whale";
  return "chrome";
}

function Guide({ close }: { close: () => void }) {
  const [tab, setTab] = useState<Browser>(guessBrowser());
  const [copied, setCopied] = useState(false);
  const b = B[tab];
  const step = (n: number, t: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
      <span style={{ lineHeight: 1.55, fontSize: 13.5 }}>{t}</span>
    </div>
  );
  const btn = (solid: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 42, padding: "0 18px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none", cursor: "pointer", fontFamily: "inherit", border: solid ? 0 : `1px solid ${NAVY}`, background: solid ? NAVY : "#fff", color: solid ? "#fff" : NAVY });
  const copyPage = async () => { try { await navigator.clipboard.writeText(b.page); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ } };

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 10020, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Pretendard Variable',-apple-system,sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: "100%", maxHeight: "calc(100vh - 40px)", overflowY: "auto", background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 20px 50px rgba(0,0,0,.25)", color: "#111827" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 6 }}>자동화 도우미 설치</div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          도우미를 설치하면 네이버 블로그 · 인스타그램 · 스레드 · 페이스북 글쓰기 칸을 자동으로 채워 드려요. 설치한 브라우저에서 공실뉴스를 열어 쓰세요.
        </div>

        {/* 브라우저 고르기 — AI 설정의 고르기 카드와 같은 모양 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>브라우저</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>지금 쓰는 브라우저를 골라요</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {(Object.keys(B) as Browser[]).map((k) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  border: `1px solid ${tab === k ? NAVY : "#e5e7eb"}`, background: tab === k ? "rgba(26,58,107,0.06)" : "#fff", color: "#111827" }}>
                <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: "50%", border: `2px solid ${tab === k ? NAVY : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {tab === k && <span style={{ width: 8, height: 8, borderRadius: "50%", background: NAVY }} />}
                </span>
                {B[k].name}
              </button>
            ))}
          </div>
        </div>

        {b.store && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>방법 1 · 자동 설치 (웹스토어)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {step(1, <>아래 <b>[웹스토어에서 설치]</b>를 눌러요</>)}
              {step(2, tab === "whale" ? <>[Chrome에 추가] (웨일은 [Whale에 추가]일 수 있어요) → [확장 프로그램 추가]를 눌러요</> : <><b>[Chrome에 추가]</b> → <b>[확장 프로그램 추가]</b>를 눌러요</>)}
              {step(3, <>공실뉴스 화면을 <b>새로 고침(F5)</b> 하면 연결돼요</>)}
            </div>
            <a href={HELPER_STORE_URL} target="_blank" rel="noreferrer" style={{ ...btn(true), marginTop: 12 }}>웹스토어에서 설치</a>
          </div>
        )}

        <div style={{ marginTop: 22, paddingTop: b.store ? 18 : 0, borderTop: b.store ? "1px dashed #e5e7eb" : "none" }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{b.store ? "방법 2 · 파일 받아 직접 설치" : "파일 받아 직접 설치"}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {step(1, <>아래 <b>[설치 파일 받기]</b>로 파일을 받고, 받은 파일을 오른쪽 클릭 → <b>[압축 풀기]</b> 해요 (폴더가 생겨요)</>)}
            {step(2, <>{b.name} 주소창에 <b>{b.page}</b> 를 넣고 열어요 <button onClick={copyPage} style={{ marginLeft: 4, border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, padding: "1px 8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{copied ? "복사했어요" : "주소 복사"}</button></>)}
            {step(3, <>{b.dev}</>)}
            {step(4, <><b>{b.load}</b>를 누르고, 1번에서 압축을 푼 <b>폴더</b>를 골라 [폴더 선택]</>)}
            {step(5, <>공실뉴스 화면을 <b>새로 고침(F5)</b> 하면 연결돼요</>)}
          </div>
          <a href={HELPER_ZIP_URL} download style={{ ...btn(!b.store), marginTop: 12 }}>설치 파일 받기</a>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8, lineHeight: 1.5 }}>직접 설치한 도우미는 저절로 새 판으로 바뀌지 않아요. 새 판이 나오면 파일을 다시 받아 같은 방법으로 바꿔 주세요. 압축을 푼 폴더는 지우지 말고 그대로 두세요.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={close} style={{ padding: "9px 18px", borderRadius: 8, border: 0, background: NAVY, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>확인</button>
        </div>
      </div>
    </div>
  );
}

/** 설치 안내 창 열기 */
export function showHelperGuide() {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const close = () => { root.unmount(); host.remove(); };
  root.render(<Guide close={close} />);
}
