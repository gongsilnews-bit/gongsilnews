"use client";

import React, { useEffect, useState } from "react";

/**
 * 공실스튜디오(PC 앱) 받기 + 설치 안내 (2026-10-23 사장님)
 *  - 설치 파일은 앱 자동 업데이트와 같은 자리(Supabase 저장소 studio-app/win)에 올린다. 최신 파일 이름은 latest.yml 에서 읽는다
 *  - 처음 설치할 때 윈도우가 파란 "Windows의 PC 보호" 화면을 띄운다 (코드 서명 인증서를 사기 전까지).
 *    설치 파일 설정으로 끌 수 없어서, [추가 정보] → [실행] 두 번 누르는 법을 그림으로 보여 준다
 */
const BASE = "https://aijfktzqtnwhfotfwcka.supabase.co/storage/v1/object/public/studio-app/win";
const FALLBACK = "GongsilStudio-Setup-0.1.13.exe";

export default function StudioAppDownload() {
  const [file, setFile] = useState(FALLBACK);
  const [ready, setReady] = useState<boolean | null>(null); // 저장소에 설치 파일이 올라가 있나 (latest.yml 이 있어야) — 없으면 단추를 안 보인다
  useEffect(() => {
    fetch(`${BASE}/latest.yml`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => { const m = /^path:\s*(\S+\.exe)\s*$/m.exec(t); if (m) setFile(m[1]); setReady(Boolean(m)); })
      .catch(() => setReady(false));
  }, []);
  const ver = (/(\d+\.\d+\.\d+)/.exec(file) || [])[1] || "";

  const step = (n: number, text: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.6, color: "#1f2937" }}>
      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{n}</span>
      <span>{text}</span>
    </div>
  );
  const mark = (n: number) => (
    <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 800, alignItems: "center", justifyContent: "center", marginRight: 6 }}>{n}</span>
  );

  if (!ready) return <div style={{ fontSize: 13, color: "#3b5bdb" }}>{ready === null ? "앱 정보를 확인하는 중…" : "앱 다운로드는 곧 열립니다."}</div>;

  return (
    <div style={{ padding: "18px 20px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", wordBreak: "keep-all" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <a href={`${BASE}/${file}`} style={{ padding: "12px 22px", background: "#16a34a", color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
          ⬇ 공실스튜디오 PC 앱 받기{ver ? ` (v${ver})` : ""}
        </a>
        <span style={{ fontSize: 13, color: "#64748b" }}>윈도우 10·11 · 받은 파일을 두 번 누르면 바로 설치되고 앱이 열려요.</span>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {step(1, <>받은 <b>GongsilStudio-Setup 파일</b>을 두 번 눌러요.</>)}
        {step(2, <>파란 <b>&quot;Windows의 PC 보호&quot;</b> 화면이 뜨면 <b style={{ color: "#dc2626" }}>[추가 정보]</b>를 누르고, 아래에 생긴 <b style={{ color: "#dc2626" }}>[실행]</b>을 눌러요.</>)}
        {step(3, <>묻는 것 없이 바로 설치되고 앱이 열려요. 바탕화면에 <b>공실스튜디오</b> 아이콘도 생겨요.</>)}
      </div>

      {/* 파란 화면 그림 — 어디를 누르는지 */}
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", background: "#0063b1", color: "#fff", borderRadius: 6, padding: "16px 18px", fontSize: 13, lineHeight: 1.6, position: "relative" }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Windows의 PC 보호</div>
          <div style={{ opacity: 0.9 }}>Microsoft Defender SmartScreen에서 인식할 수 없는 앱의 시작을 차단했습니다…</div>
          <div style={{ marginTop: 8 }}>{mark(1)}<span style={{ textDecoration: "underline", fontWeight: 700, outline: "2px solid #fde047", outlineOffset: 2 }}>추가 정보</span></div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <span style={{ padding: "5px 18px", border: "1px solid #fff", fontSize: 13 }}>실행 안 함</span>
          </div>
        </div>
        <div style={{ flex: "1 1 260px", background: "#0063b1", color: "#fff", borderRadius: 6, padding: "16px 18px", fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Windows의 PC 보호</div>
          <div style={{ opacity: 0.9 }}>앱: GongsilStudio-Setup{ver ? `-${ver}` : ""}.exe<br />게시자: 알 수 없는 게시자</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, alignItems: "center" }}>
            {mark(2)}
            <span style={{ padding: "5px 18px", border: "1px solid #fff", fontSize: 13, fontWeight: 700, outline: "2px solid #fde047", outlineOffset: 2 }}>실행</span>
            <span style={{ padding: "5px 18px", border: "1px solid #fff", fontSize: 13 }}>실행 안 함</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: "#64748b", lineHeight: 1.6 }}>
        새로 나온 프로그램이라 윈도우가 처음 한 번 확인하는 화면이에요. 공실뉴스가 만든 공식 앱이니 안심하고 [실행]을 눌러 주세요.
      </div>
    </div>
  );
}
