"use client";

import React, { useEffect, useState } from "react";

/**
 * 공실스튜디오 설치 파일 주소 + [다운로드]를 누르면 뜨는 큰 설치 안내 (2026-10-27 사장님)
 *  - 설치 파일은 앱 자동 업데이트와 같은 자리(Supabase 저장소 studio-app/win). 최신 파일 이름은 latest.yml 에서 읽는다
 *  - 처음 설치할 때 윈도우가 파란 "Windows의 PC 보호" 화면을 띄운다 (코드 서명 인증서를 사기 전까지).
 *    그 화면의 문구·단추는 바꿀 수 없어서, 받는 순간 [추가 정보] → [실행] 을 크게 알려 준다
 */
export const STUDIO_INSTALLER_BASE = "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/studio-app/win";
const FALLBACK = "GongsilStudio-Setup-0.1.14.exe";

/** ready: 저장소에 설치 파일이 올라가 있나 (latest.yml 이 있어야) — null 은 확인 중 */
export function useStudioInstaller() {
  const [file, setFile] = useState(FALLBACK);
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    fetch(`${STUDIO_INSTALLER_BASE}/latest.yml`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => { const m = /^path:\s*(\S+\.exe)\s*$/m.exec(t); if (m) setFile(m[1]); setReady(Boolean(m)); })
      .catch(() => setReady(false));
  }, []);
  const ver = (/(\d+\.\d+\.\d+)/.exec(file) || [])[1] || "";
  return { href: `${STUDIO_INSTALLER_BASE}/${file}`, ready, ver };
}

const mark = (n: number) => (
  <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 800, alignItems: "center", justifyContent: "center", marginRight: 6, flexShrink: 0 }}>{n}</span>
);

/** 파란 화면 그림 — 어디를 누르는지 */
export function SmartScreenPictures({ ver }: { ver: string }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 260px", background: "#0063b1", color: "#fff", borderRadius: 6, padding: "16px 18px", fontSize: 13, lineHeight: 1.6, textAlign: "left" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Windows의 PC 보호</div>
        <div style={{ opacity: 0.9 }}>Microsoft Defender SmartScreen에서 인식할 수 없는 앱의 시작을 차단했습니다…</div>
        <div style={{ marginTop: 8 }}>{mark(1)}<span style={{ textDecoration: "underline", fontWeight: 700, outline: "2px solid #fde047", outlineOffset: 2 }}>추가 정보</span></div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <span style={{ padding: "5px 18px", border: "1px solid #fff", fontSize: 13 }}>실행 안 함</span>
        </div>
      </div>
      <div style={{ flex: "1 1 260px", background: "#0063b1", color: "#fff", borderRadius: 6, padding: "16px 18px", fontSize: 13, lineHeight: 1.6, textAlign: "left" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Windows의 PC 보호</div>
        <div style={{ opacity: 0.9 }}>앱: GongsilStudio-Setup{ver ? `-${ver}` : ""}.exe<br />게시자: 알 수 없는 게시자</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, alignItems: "center" }}>
          {mark(2)}
          <span style={{ padding: "5px 18px", border: "1px solid #fff", fontSize: 13, fontWeight: 700, outline: "2px solid #fde047", outlineOffset: 2 }}>실행</span>
          <span style={{ padding: "5px 18px", border: "1px solid #fff", fontSize: 13 }}>실행 안 함</span>
        </div>
      </div>
    </div>
  );
}

/** [다운로드]를 누르면 뜨는 큰 안내 — 받기는 그대로 진행되고, 창만 위에 뜬다 */
export function InstallGuideModal({ ver, onClose }: { ver: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const step = (n: number, text: React.ReactNode) => (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 16, lineHeight: 1.6, color: "#1f2937", textAlign: "left" }}>
      <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 0 }}>{n}</span>
      <span>{text}</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 99999999, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, wordBreak: "keep-all" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 640, maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: 16, padding: "28px 28px 24px", boxShadow: "0 24px 60px rgba(0,0,0,.3)", position: "relative", fontFamily: "inherit" }}>
        <button type="button" onClick={onClose} aria-label="닫기" style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, border: "none", background: "transparent", fontSize: 22, color: "#64748b", cursor: "pointer" }}>✕</button>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginBottom: 6 }}>설치 파일을 받고 있어요</div>
        <div style={{ fontSize: 14.5, color: "#64748b", marginBottom: 20 }}>받기가 끝나면 아래 순서대로 눌러 주세요.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {step(1, <>브라우저의 다운로드 목록에서 <b>GongsilStudio-Setup 파일</b>을 눌러 열어요.</>)}
          {step(2, <>파란 <b>&quot;Windows의 PC 보호&quot;</b> 화면이 뜨면 <b style={{ color: "#dc2626" }}>[추가 정보]</b>를 눌러요.</>)}
          {step(3, <>아래에 생긴 <b style={{ color: "#dc2626" }}>[실행]</b>을 누르면 바로 설치되고 앱이 열려요.</>)}
        </div>

        <div style={{ marginTop: 18 }}><SmartScreenPictures ver={ver} /></div>

        <div style={{ marginTop: 14, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
          새로 나온 프로그램이라 윈도우가 처음 한 번 확인하는 화면이에요. 공실뉴스가 만든 공식 앱이니 안심하고 [실행]을 눌러 주세요.
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{ padding: "12px 36px", background: "#1a3a6b", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>알겠어요</button>
        </div>
      </div>
    </div>
  );
}
