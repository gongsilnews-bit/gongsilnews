"use client";

import React, { useState } from "react";
import { InstallGuideModal, SmartScreenPictures, useStudioInstaller } from "./StudioInstallGuide";

/**
 * 공실마케팅(PC 앱) 받기 + 설치 안내 (2026-10-23 사장님)
 *  - 설치 파일 주소·파란 "Windows의 PC 보호" 화면 그림은 StudioInstallGuide 에 있다
 *  - 단추를 누르면 받기는 그대로 되고, [추가 정보] → [실행] 큰 안내 창이 뜬다 (2026-10-27 사장님)
 */
export default function StudioAppDownload() {
  const { href, ready, ver } = useStudioInstaller();
  const [guide, setGuide] = useState(false);

  const step = (n: number, text: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.6, color: "#1f2937" }}>
      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{n}</span>
      <span>{text}</span>
    </div>
  );

  if (!ready) return <div style={{ fontSize: 13, color: "#3b5bdb" }}>{ready === null ? "앱 정보를 확인하는 중…" : "앱 다운로드는 곧 열립니다."}</div>;

  return (
    <div style={{ padding: "18px 20px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", wordBreak: "keep-all" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <a href={href} onClick={() => setGuide(true)} style={{ padding: "12px 22px", background: "#16a34a", color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
          ⬇ 공실마케팅 PC 앱 받기{ver ? ` (v${ver})` : ""}
        </a>
        <span style={{ fontSize: 13, color: "#64748b" }}>윈도우 10·11 · 받은 파일을 두 번 누르면 바로 설치되고 앱이 열려요.</span>
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {step(1, <>받은 <b>GongsilStudio-Setup 파일</b>을 두 번 눌러요.</>)}
        {step(2, <>파란 <b>&quot;Windows의 PC 보호&quot;</b> 화면이 뜨면 <b style={{ color: "#dc2626" }}>[추가 정보]</b>를 누르고, 아래에 생긴 <b style={{ color: "#dc2626" }}>[실행]</b>을 눌러요.</>)}
        {step(3, <>묻는 것 없이 바로 설치되고 앱이 열려요. 바탕화면에 <b>공실마케팅</b> 아이콘도 생겨요.</>)}
      </div>

      <div style={{ marginTop: 14 }}><SmartScreenPictures ver={ver} /></div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: "#64748b", lineHeight: 1.6 }}>
        새로 나온 프로그램이라 윈도우가 처음 한 번 확인하는 화면이에요. 공실뉴스가 만든 공식 앱이니 안심하고 [실행]을 눌러 주세요.
      </div>
      {guide && <InstallGuideModal ver={ver} onClose={() => setGuide(false)} />}
    </div>
  );
}
