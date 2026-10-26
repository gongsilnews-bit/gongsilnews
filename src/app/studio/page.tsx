import React from "react";
import Link from "next/link";
import StudioAppDownload from "@/components/admin/sections/StudioAppDownload";

export const metadata = {
  title: "공실스튜디오 | 공실만 등록하면 뉴스·블로그·SNS·영상까지",
  description: "공실스튜디오(PC 앱)로 내 지역·단지 소식을 뉴스·블로그·SNS·영상으로 만들어 알리세요. 월 3만원 · 1년 36만원.",
};

/**
 * 공실스튜디오 소개 페이지 (2026-10-26 사장님) — 디자인은 클로드 디자인 시안이 오면 바꾼다 (초안: design/studio/brief.md)
 * 지금은 내용·순서만 맞춘 첫 판. 앱 화면 캡처가 오기 전이라 그림 자리는 비워 둔다 (가짜 화면·숫자 넣지 않음)
 * 메인 헤더 없이 공실뉴스부동산처럼 왼쪽 공실뉴스 로고 + 제목, 오른쪽 로그인 · 앱 받기
 */
const NAVY = "#1a3a6b";

const FEATURES = [
  { title: "뉴스·SNS발행", desc: "공실을 고르면 공실뉴스 기사·네이버 블로그·인스타그램·페이스북·스레드 글을 AI가 써서 채워 줍니다. 마지막 [발행]만 직접 누르세요." },
  { title: "동영상제작", desc: "공실 사진으로 릴스·유튜브 영상을 만들고 AI 성우 목소리와 자막을 넣습니다." },
  { title: "이미지제작", desc: "홍보 이미지·카드뉴스를 템플릿으로 만들고 AI로 고칩니다." },
  { title: "AI 매물보고서", desc: "공실 하나로 손님에게 보낼 매물 소개 보고서를 만듭니다." },
  { title: "화면캡처·녹화", desc: "화면을 캡처하고 녹화해서 바로 영상·이미지 작업에 씁니다." },
];

const STEPS = [
  { n: "1", t: "공실 고르기", d: "공실뉴스에 등록한 내 공실을 고릅니다." },
  { n: "2", t: "AI가 채우기", d: "뉴스·블로그·SNS 글과 영상·이미지를 AI가 만들어 채웁니다." },
  { n: "3", t: "내가 발행", d: "확인하고 고친 뒤 [발행]은 대표님이 직접 누릅니다. 계정이 안전합니다." },
];

const FAQ = [
  { q: "어떤 컴퓨터에서 쓰나요?", a: "윈도우 10·11 PC에서 씁니다." },
  { q: "설치할 때 파란 \"Windows의 PC 보호\" 화면이 떠요.", a: "[추가 정보]를 누르고 아래에 생긴 [실행]을 누르면 설치됩니다." },
  { q: "설치 없이 써 볼 수 있나요?", a: "이미지제작은 웹에서 설치 없이 먼저 써 볼 수 있습니다. AI 기능과 PC 저장은 앱에서 됩니다." },
];

export default function StudioPage() {
  return (
    <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#111827", background: "#ffffff", wordBreak: "keep-all" }}>
      {/* 위쪽 줄 */}
      <div style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" title="공실뉴스 홈" style={{ display: "inline-flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="공실뉴스" style={{ height: 40 }} />
          </Link>
          <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px" }}>공실스튜디오</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <Link href={"/login?returnTo=" + encodeURIComponent("/studio")} style={{ fontSize: 14, fontWeight: 700, color: "#374151", textDecoration: "none" }}>로그인</Link>
            <a href="#download" style={{ padding: "8px 16px", borderRadius: 8, background: NAVY, color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>앱 받기</a>
          </div>
        </div>
      </div>

      {/* ① 첫 화면 */}
      <section style={{ background: "linear-gradient(180deg, #f3f6fb 0%, #ffffff 100%)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 24px 64px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: NAVY }}>공실스튜디오 · PC 앱</p>
          <h1 style={{ margin: "0 0 18px", fontSize: 44, lineHeight: 1.3, fontWeight: 900, letterSpacing: "-1px" }}>
            공실만 등록하면<br />뉴스·블로그·SNS·영상까지
          </h1>
          <p style={{ margin: "0 0 30px", fontSize: 18, lineHeight: 1.7, color: "#4b5563" }}>
            내 지역·단지 소식을 공실스튜디오로 만들어 알리세요.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#download" style={{ padding: "14px 26px", borderRadius: 10, background: NAVY, color: "#fff", fontSize: 16, fontWeight: 800, textDecoration: "none" }}>앱 받기</a>
            <a href="#price" style={{ padding: "14px 26px", borderRadius: 10, border: "1px solid #cbd5e1", color: "#1f2937", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>이용료 보기</a>
          </div>
        </div>
      </section>

      {/* ② 무엇이 되나 */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ margin: "0 0 28px", fontSize: 30, fontWeight: 900 }}>공실스튜디오로 할 수 있는 일</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px 24px" }}>
              <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: "#4b5563" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ③ 이렇게 씁니다 */}
      <section style={{ background: "#f8fafc" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
          <h2 style={{ margin: "0 0 28px", fontSize: 30, fontWeight: 900 }}>이렇게 씁니다</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: NAVY, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{s.n}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{s.t}</div>
                <div style={{ fontSize: 15, lineHeight: 1.7, color: "#4b5563" }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ 이용료 */}
      <section id="price" style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ margin: "0 0 28px", fontSize: 30, fontWeight: 900 }}>이용료</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, maxWidth: 720 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#4b5563", marginBottom: 8 }}>월 이용</div>
            <div style={{ fontSize: 34, fontWeight: 900 }}>월 3만원</div>
          </div>
          <div style={{ border: `2px solid ${NAVY}`, borderRadius: 14, padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>1년 이용</div>
            <div style={{ fontSize: 34, fontWeight: 900 }}>1년 36만원</div>
          </div>
        </div>
      </section>

      {/* 받기 */}
      <section id="download" style={{ background: "#f3f6fb" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 30, fontWeight: 900 }}>공실스튜디오 받기</h2>
          <StudioAppDownload />
        </div>
      </section>

      {/* ⑦ 자주 묻는 질문 */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ margin: "0 0 24px", fontSize: 30, fontWeight: 900 }}>자주 묻는 질문</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 820 }}>
          {FAQ.map((f) => (
            <div key={f.q} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "18px 22px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Q. {f.q}</div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: "#4b5563" }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ⑧ 마지막 */}
      <section style={{ background: NAVY, color: "#fff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "56px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.4 }}>내 지역·단지 소식,<br />공실스튜디오로 시작하세요</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#download" style={{ padding: "14px 26px", borderRadius: 10, background: "#fff", color: NAVY, fontSize: 16, fontWeight: 800, textDecoration: "none" }}>앱 받기</a>
            <Link href="/newsrealty" style={{ padding: "14px 26px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.6)", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>공실뉴스부동산 알아보기</Link>
          </div>
        </div>
      </section>

      <div style={{ textAlign: "center", padding: "22px 0", fontSize: 13, color: "#9ca3af" }}>
        © {new Date().getFullYear()} 공실뉴스 · <Link href="/terms" style={{ color: "#9ca3af" }}>이용약관</Link> · <Link href="/com/privacy.html" style={{ color: "#9ca3af" }}>개인정보 처리방침</Link>
      </div>
    </div>
  );
}
