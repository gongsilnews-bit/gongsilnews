"use client";

import React from "react";
import StudioAppDownload from "./StudioAppDownload";

/**
 * 웹 관리 화면 [공실마케팅] 메뉴 (2026-10-26 사장님)
 *  - 웹 관리 화면은 일반회원과 같은 아이콘 메뉴(무료 관리 기능만). 만드는 기능은 공실마케팅(PC 앱)에서
 *  - 여기서 앱을 소개하고 받게 한다. 이미지제작만 설치 없이 웹에서 맛보기 (photo-editor-on-web)
 *  - 이용료는 아직 정하지 않아서 금액은 쓰지 않는다
 */
type Props = {
  theme: { cardBg: string; textPrimary: string; textSecondary: string; border: string };
  onTryPhoto: () => void;
};

const FEATURES = [
  { title: "뉴스·SNS발행", desc: "공실을 고르면 공실뉴스 기사·네이버 블로그·인스타그램·페이스북·스레드 글을 AI가 써서 채워 줍니다. 마지막 [발행]만 직접 누르세요." },
  { title: "동영상제작", desc: "공실 사진으로 릴스·유튜브 영상을 만들고, AI 성우 목소리와 자막을 넣습니다." },
  { title: "이미지제작", desc: "홍보 이미지·카드뉴스를 템플릿으로 만들고 AI로 고칩니다." },
  { title: "AI 매물보고서", desc: "공실 하나로 손님에게 보낼 매물 소개 보고서를 만듭니다." },
  { title: "화면캡처·녹화", desc: "화면을 캡처하고 녹화해서 바로 영상·이미지 작업에 씁니다." },
];

export default function StudioPromoSection({ theme, onTryPhoto }: Props) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
      <div style={{ maxWidth: 820, margin: "0 auto", background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "40px 36px", wordBreak: "keep-all" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800, color: theme.textPrimary }}>공실마케팅</h2>
        <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.7, color: theme.textSecondary }}>
          공실만 등록하면 뉴스·블로그·SNS·영상까지. 내 지역·단지 소식을 공실마케팅(PC 앱)로 만들어 알리세요.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12, marginBottom: 28 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: theme.textSecondary }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <StudioAppDownload />

        <div style={{ marginTop: 22, padding: "16px 18px", borderRadius: 10, border: `1px dashed ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: theme.textPrimary }}>
            <b>이미지제작</b>은 설치 없이 웹에서 먼저 써 볼 수 있어요. (AI 기능·PC 저장은 앱에서)
          </span>
          <button onClick={onTryPhoto} style={{ padding: "10px 18px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            설치 없이 맛보기 ›
          </button>
        </div>
      </div>
    </div>
  );
}
