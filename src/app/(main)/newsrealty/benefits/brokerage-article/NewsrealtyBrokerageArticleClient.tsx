"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";

/**
 * 공실뉴스부동산 멤버십 혜택 상세
 * - 공실등록 20건 & 매월 언론기사 4건
 * - AI 매매보고서 · 유리창홍보지 · 전용 웹페이지 무료 제공
 *
 * 공실뉴스부동산 시그니처 디자인 시스템:
 * - 비비드 오렌지 (#ea580c, #ff8e15)
 * - 딥 차콜/블랙 (#181411, #0f172a)
 * - 소프트 웜 클린 화이트/아이보리 (#ffffff, #fffaf5, #fff7ed, #fed7aa)
 * - 모던 라운디드 카드 시스템 (border-radius: 20px~24px)
 */

const POINT = "#ea580c";
const POINT_DARK = "#c2410c";
const POINT_SOFT = "#fff7ed";
const POINT_BORDER = "#fed7aa";

function NewsrealtyBenefitsHeroTabs({ active }: { active: string }) {
  const tabs = [
    { slug: "vacancy-register", label: "공실등록 20건 & 기사 4건", href: "/newsrealty/benefits/brokerage-article" },
    { slug: "report-window", label: "AI 매매보고서 · 유리창홍보지", href: "/newsrealty/benefits/brokerage-article#workflow" },
    { slug: "homepage-sync", label: "부동산 전용 웹페이지 무료", href: "/newsrealty/benefits/brokerage-article#workflow" },
  ];
  return (
    <nav
      aria-label="멤버십혜택 내비게이션"
      style={{
        position: "absolute",
        left: 40,
        bottom: 24,
        zIndex: 3,
        display: "flex",
        gap: 6,
        padding: "6px 8px",
        borderRadius: 14,
        background: "#ffffff",
        border: "1.5px solid #fed7aa",
        boxShadow: "0 6px 20px rgba(234, 88, 12, 0.12)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.slug === active;
        return (
          <Link
            key={tab.slug}
            href={tab.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: isActive ? 850 : 650,
              color: isActive ? "#ffffff" : "#475569",
              background: isActive ? "#ea580c" : "transparent",
              textDecoration: "none",
              transition: "all 0.18s ease",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function NewsrealtyBrokerageArticleClient() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflows = [
    {
      step: "01",
      title: "공실등록 20건",
      desc: "전국 11만 부동산이 실시간 무료 열람하는 공실뉴스에 매월 공실 매물 20건을 우선 등록합니다.",
      tag: "월 20건 무료",
    },
    {
      step: "02",
      title: "AI 매매보고서",
      desc: "등록한 공실 데이터 기반으로 고품질 분석 리포트가 10초 만에 전자동 완성됩니다.",
      tag: "1초 자동 초안",
    },
    {
      step: "03",
      title: "유리창 홍보지",
      desc: "지나가는 고객의 발길을 멈추게 하는 쇼윈도 홍보지를 즉시 출력하여 워크인 손님을 유치합니다.",
      tag: "쇼윈도 마케팅",
    },
    {
      step: "04",
      title: "웹페이지 무료 연동",
      desc: "등록한 공실 매물이 내 단독 물건접수 웹페이지에 실시간으로 자동 진열되고 문의가 연동됩니다.",
      tag: "100% 자동 동기화",
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
        color: "#1c1917",
        minHeight: "100vh",
      }}
    >
      <NewsrealtyHeader />

      {/* ━━━ 1. HERO SECTION (공실뉴스부동산 시그니처 웜 클린 라운드 카드) ━━━ */}
      <section style={{ backgroundColor: "#ffffff", padding: "28px 0 20px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              backgroundColor: "#fffaf5",
              border: "1.5px solid #fed7aa",
              color: "#1c1917",
              borderRadius: 24,
              overflow: "hidden",
              minHeight: 440,
              boxShadow: "0 16px 40px -12px rgba(234, 88, 12, 0.12)",
            }}
          >
            {/* 배경 이미지 & 자연스러운 우측 배치 */}
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "56%", zIndex: 1 }}>
              <Image
                src="/images/study/benefit-vacancy-hero-real.webp"
                alt="부동산 사무소 앞에서 AI 매매보고서를 들고 웃는 여성 공인중개사"
                fill
                priority
                sizes="(max-width: 1200px) 56vw, 680px"
                style={{ objectFit: "cover", objectPosition: "center 32%" }}
              />
            </div>

            {/* 좌측 와이드 가독성 페이드 그라디언트 */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
                pointerEvents: "none",
                background:
                  "linear-gradient(to right, #fffaf5 0%, #fffaf5 42%, rgba(255, 250, 245, 0.88) 56%, rgba(255, 250, 245, 0) 78%)",
              }}
            />

            {/* 좌측 카피 */}
            <div
              style={{
                position: "relative",
                zIndex: 3,
                flex: "1 1 540px",
                maxWidth: 760,
                minWidth: 300,
                padding: "44px 44px 108px",
              }}
            >
              {/* 상단 뱃지 */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: POINT,
                  border: "1px solid #ea580c",
                  padding: "6px 16px",
                  borderRadius: 24,
                  fontSize: 13,
                  fontWeight: 850,
                  color: "#ffffff",
                  marginBottom: 18,
                  letterSpacing: "-0.2px",
                  boxShadow: "0 4px 14px rgba(234, 88, 12, 0.28)",
                }}
              >
                <span>MEMBERSHIP BENEFIT</span>
                <span style={{ opacity: 0.6 }}>|</span>
                <span>전국 11만 부동산 무료 열람 공동중개망</span>
              </div>

              {/* 메인 헤드라인 */}
              <h1
                style={{
                  fontSize: "clamp(30px, 3.2vw, 42px)",
                  fontWeight: 950,
                  lineHeight: 1.26,
                  letterSpacing: "-1.5px",
                  margin: "0 0 18px 0",
                  color: "#0f172a",
                  wordBreak: "keep-all",
                }}
              >
                공실등록 20건 & 매월 기사 4건!<br />
                <span style={{ color: POINT }}>
                  AI매매보고서 · 유리창홍보지 · 홈페이지 무료
                </span>
              </h1>

              {/* 서브 설명 */}
              <p
                style={{
                  fontSize: "16.5px",
                  color: "#475569",
                  lineHeight: 1.68,
                  margin: "0 0 28px 0",
                  wordBreak: "keep-all",
                  maxWidth: 620,
                }}
              >
                전국 11만 부동산이 매일 열람하는 공실뉴스에 공실만 등록하세요.
                AI 매매보고서, 유리창 홍보지, 부동산 전용 홈페이지까지 원클릭으로 자동 완성됩니다.
              </p>
            </div>

            {/* 멤버십혜택 플로팅 탭 */}
            <NewsrealtyBenefitsHeroTabs active="vacancy-register" />
          </div>
        </div>
      </section>

      {/* ━━━ 2. QUICK METRIC STATS BAR (4대 핵심 지표 카드) ━━━ */}
      <section style={{ padding: "24px 0 44px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
              background: "#ffffff",
              border: "1.5px solid #fed7aa",
              borderRadius: 20,
              padding: "28px 32px",
              boxShadow: "0 10px 30px rgba(234, 88, 12, 0.05)",
            }}
          >
            <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: POINT, marginBottom: 6, letterSpacing: "-0.2px" }}>
                11만 부동산망 노출
              </div>
              <div style={{ fontSize: 24, fontWeight: 950, color: "#1c1917", letterSpacing: "-0.6px" }}>
                공실 20건 무료 등록
              </div>
              <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
                전국 중개사가 무료 열람하는 실시간 매물망
              </div>
            </div>

            <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: POINT, marginBottom: 6, letterSpacing: "-0.2px" }}>
                10초 자동 완성 초안
              </div>
              <div style={{ fontSize: 24, fontWeight: 950, color: "#1c1917", letterSpacing: "-0.6px" }}>
                AI 매매보고서
              </div>
              <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
                A4 출력 & 카카오톡 즉시 발송용 브리핑
              </div>
            </div>

            <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: POINT, marginBottom: 6, letterSpacing: "-0.2px" }}>
                쇼윈도 워크인 마케팅
              </div>
              <div style={{ fontSize: 24, fontWeight: 950, color: "#1c1917", letterSpacing: "-0.6px" }}>
                유리창 홍보지
              </div>
              <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
                QR코드 탑재 쇼윈도 매물 포스터 즉시 인쇄
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: POINT, marginBottom: 6, letterSpacing: "-0.2px" }}>
                단독 접수창구 제공
              </div>
              <div style={{ fontSize: 24, fontWeight: 950, color: "#1c1917", letterSpacing: "-0.6px" }}>
                전용 웹페이지 무료
              </div>
              <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
                등록 공실 실시간 자동 연동 & 링크 홍보
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 3. DETAILED 4 IN 1 WORKFLOW (상세 4대 실무 혜택 카드) ━━━ */}
      <section id="workflow" style={{ padding: "30px 0 90px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          
          {/* 섹션 서두 카피 */}
          <div style={{ textAlign: "center", maxWidth: 780, margin: "0 auto 60px" }}>
            <span
              style={{
                display: "inline-block",
                background: POINT_SOFT,
                color: POINT,
                fontSize: "13px",
                fontWeight: 900,
                padding: "6px 18px",
                borderRadius: "24px",
                marginBottom: "16px",
                border: "1.5px solid #fed7aa",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              4 IN 1 REALTY WORKFLOW
            </span>
            <h2
              style={{
                fontSize: "clamp(28px, 3vw, 38px)",
                fontWeight: 950,
                color: "#1c1917",
                letterSpacing: "-1px",
                lineHeight: 1.32,
                margin: "0 0 16px 0",
              }}
            >
              공실만 등록했는데,<br />
              중개실무에 필요한 마케팅이 저절로 완성됩니다!
            </h2>
            <p style={{ fontSize: "16.5px", color: "#64748b", margin: 0, lineHeight: 1.68 }}>
              어렵게 마케팅을 배울 필요가 없습니다. 내 지역 공실 매물만 올려두면,
              AI 매매보고서와 쇼윈도 유리창 홍보지, 나만의 접수 홈페이지까지 시스템이 알아서 운영합니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 54 }}>

            {/* ── BENEFIT 01: 공실 20건 등록 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 44,
                alignItems: "center",
                background: "#ffffff",
                border: "1.5px solid #fed7aa",
                borderRadius: 24,
                padding: "48px 44px",
                boxShadow: "0 14px 34px rgba(234, 88, 12, 0.05)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: POINT,
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 850,
                    padding: "5px 14px",
                    borderRadius: 8,
                    marginBottom: 18,
                  }}
                >
                  혜택 01 · 실무 직결 공실망
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 950,
                    color: "#1c1917",
                    lineHeight: 1.35,
                    letterSpacing: "-0.6px",
                    margin: "0 0 16px 0",
                  }}
                >
                  11만 부동산 누구나 열람할 수 있는 무료 공동중개!<br />
                  <span style={{ color: POINT }}>공실등록 매월 20건 무료!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 26px 0" }}>
                  전국 11만 공인중개사와 부동산 관계자, 투자자가 매일 접속하는 &lsquo;공실뉴스&rsquo; 플랫폼에
                  매달 20건의 공실 매물을 무료로 등록할 수 있습니다. 지도 기반 위치 노출과 상권 분석이 결합되어
                  공동중개 매칭과 임차인 유치가 획기적으로 빨라집니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>전국 11만 부동산 포털 실시간 노출</strong> — 지도 검색 및 카테고리별 다이렉트 매칭
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>임대인(건물주) 안심 브리핑</strong> — &ldquo;국내 최대 공실뉴스에 정식 등록해드립니다&rdquo;
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>전속 매물 유치 경쟁력</strong> — 타 부동산보다 월등한 미디어 파워로 전속 계약 성사
                    </span>
                  </div>
                </div>
              </div>

              {/* 시각화 카드: 공동중개 계약 체결 */}
              <div
                style={{
                  position: "relative",
                  background: "#ffffff",
                  border: "1.5px solid #fed7aa",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.06)",
                }}
              >
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3" }}>
                  <Image
                    src="/images/study/benefit_joint_contract_stamp_v2.jpg"
                    alt="여성 공인중개사와 남성 공인중개사의 공동중개 계약 체결 및 계약완료 빨간 도장 날인 현장"
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    style={{ objectFit: "cover" }}
                    priority
                  />
                </div>
              </div>
            </div>

            {/* ── BENEFIT 02: 등록한 공실이 매물보고서 바로 작성 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 44,
                alignItems: "center",
                background: "#ffffff",
                border: "1.5px solid #fed7aa",
                borderRadius: 24,
                padding: "48px 44px",
                boxShadow: "0 14px 34px rgba(234, 88, 12, 0.05)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: POINT,
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 850,
                    padding: "5px 14px",
                    borderRadius: 8,
                    marginBottom: 18,
                  }}
                >
                  혜택 02 · AI 프리미엄 매물보고서
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 950,
                    color: "#1c1917",
                    lineHeight: 1.35,
                    letterSpacing: "-0.6px",
                    margin: "0 0 16px 0",
                  }}
                >
                  등록한 공실이 매물보고서로 즉시 자동 완성!<br />
                  <span style={{ color: POINT }}>출력 브리핑 및 카톡·문자로 손님에게 1초 전송</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 26px 0" }}>
                  공실 정보를 등록하면 대기업 부동산 컨설팅 수준의 &lsquo;AI 매물보고서&rsquo;가 단 1초 만에 자동 완성됩니다.
                  사무실 방문 손님에게는 깔끔하게 A4 컬러 출력물로 건네고,
                  이동 중인 고객에게는 카카오톡이나 문자 메시지로 모바일 최적화 링크를 즉시 발송하세요.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>원클릭 고화질 보고서 출력</strong> — 대면 상담 시 고객 신뢰를 사로잡는 프리미엄 브리핑
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>카카오톡 / 문자 메시지 즉시 전송</strong> — 스마트폰 터치 한 번으로 깔끔한 모바일 보고서 열람
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>스펙·임대료·도면 완벽 정리</strong> — 귀찮은 편집 작업 0초, 공실 데이터로 전자동 생성
                    </span>
                  </div>
                </div>
              </div>

              {/* 매물보고서 샘플 이미지 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1.5px solid #fed7aa",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.08)",
                  minHeight: 340,
                  backgroundColor: "#ffffff",
                }}
              >
                <Image
                  src="/images/study/property-report-sample.png"
                  alt="등록 공실 AI 매물보고서 샘플"
                  fill
                  style={{ objectFit: "contain", objectPosition: "center", padding: 12 }}
                />
              </div>
            </div>

            {/* ── BENEFIT 03: 부동산 유리창 홍보물 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: 44,
                alignItems: "center",
                background: "#ffffff",
                border: "1.5px solid #fed7aa",
                borderRadius: 24,
                padding: "48px 44px",
                boxShadow: "0 14px 34px rgba(234, 88, 12, 0.05)",
              }}
            >
              {/* 유리창 홍보지 실사 이미지 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1.5px solid #fed7aa",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.1)",
                  minHeight: 340,
                  backgroundColor: "#fff7ed",
                }}
              >
                <Image
                  src="/images/study/benefit_window_flyer.jpg"
                  alt="부동산 유리창 쇼윈도 홍보물 실사"
                  fill
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(24, 20, 17, 0.92)",
                    padding: "12px 18px",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 750,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>쇼윈도 부착용 맞춤 포스터</span>
                  <span style={{ color: "#ff8e15" }}>QR코드 자동 내장</span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: POINT,
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 850,
                    padding: "5px 14px",
                    borderRadius: 8,
                    marginBottom: 18,
                  }}
                >
                  혜택 03 · 1층 유리창 홍보지
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 950,
                    color: "#1c1917",
                    lineHeight: 1.35,
                    letterSpacing: "-0.6px",
                    margin: "0 0 16px 0",
                  }}
                >
                  부동산 유리창 홍보물로 바로 인쇄 완성!<br />
                  <span style={{ color: POINT }}>디자인 고민 끝! 원클릭 출력 쇼윈도 마케팅</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 26px 0" }}>
                  포토샵이나 디자인 프로그램 필요 없이, 등록한 공실 매물 데이터로
                  부동산 쇼윈도(유리창)에 딱 맞는 홍보지가 원클릭으로 생성됩니다.
                  매물 사진, 가격(보증금/월세), 핵심 입지와 함께 상세 페이지로 즉시 연결되는 QR코드까지
                  완벽하게 배치되어 지나가는 손님의 발길을 멈추게 합니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>쇼윈도 가독성 극대화</strong> — 멀리서도 한눈에 들어오는 타이포그래피 & 핵심 스펙 요약
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>스마트 QR코드 자동 탑재</strong> — 스마트폰 카메라를 대면 내 모바일 매물 페이지로 즉시 연결
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>다양한 레이아웃 제공</strong> — 아파트, 원룸, 상가/사무실에 최적화된 템플릿 지원
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BENEFIT 04: 등록한 공실이 실시간으로 내 물건접수 웹페이지 연동 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 44,
                alignItems: "center",
                background: "#fffaf5",
                border: "2px solid #ea580c",
                borderRadius: 24,
                padding: "48px 44px",
                boxShadow: "0 14px 34px rgba(234, 88, 12, 0.08)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: POINT,
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 850,
                    padding: "5px 14px",
                    borderRadius: 8,
                    marginBottom: 18,
                  }}
                >
                  혜택 04 · 나만의 공식 웹사이트
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 950,
                    color: "#1c1917",
                    lineHeight: 1.35,
                    letterSpacing: "-0.6px",
                    margin: "0 0 16px 0",
                  }}
                >
                  등록한 공실이 내 단독 홈페이지에 실시간 자동 진열!<br />
                  <span style={{ color: POINT }}>유튜브·블로그 링크 홍보 & 카톡 명함 홈페이지 활용</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 26px 0" }}>
                  공실뉴스부동산 파트너에게는 나만의 독립된 &lsquo;물건접수 웹페이지(공인중개사 전용 홈페이지)&rsquo;가 무료로 제공됩니다.
                  등록한 공실이 내 홈페이지에 실시간으로 자동 동기화되며,
                  유튜브 영상 더보기란이나 블로그 프로필에 링크만 걸어두면 매물 접수와 손님 문의가 24시간 자동으로 수집됩니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>홈페이지 제작비 0원</strong> — 수백만 원대 전문 반응형 부동산 웹페이지 무료 연동
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>유튜브·블로그 전용 접수 창구</strong> — 프로필 링크 한 번으로 손님이 매물을 직접 등록
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: POINT, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 15, color: "#1e293b", fontWeight: 650 }}>
                      <strong>임대인 카카오톡 공유</strong> — 정돈된 내 홈페이지 링크를 보내어 전속 계약 신뢰도 극대화
                    </span>
                  </div>
                </div>
              </div>

              {/* 물건접수 웹페이지 샘플 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1.5px solid #fed7aa",
                  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.08)",
                  minHeight: 340,
                  backgroundColor: "#ffffff",
                }}
              >
                <Image
                  src="/images/study/partner-webpage-sample.png"
                  alt="나만의 물건접수 웹페이지 샘플"
                  fill
                  style={{ objectFit: "contain", objectPosition: "center", padding: 12 }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━ 4. INTERACTIVE AUTOMATION WORKFLOW (딥 차콜 & 비비드 오렌지 테마) ━━━ */}
      <section style={{ backgroundColor: "#181411", color: "#ffffff", padding: "80px 0 90px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 52px" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "#ff8e15",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              COMPLETE AUTOMATION CYCLE
            </span>
            <h2
              style={{
                fontSize: "clamp(28px, 3vw, 36px)",
                fontWeight: 950,
                color: "#ffffff",
                margin: "10px 0 16px 0",
                letterSpacing: "-0.8px",
                lineHeight: 1.3,
              }}
            >
              공실만 등록하세요!<br />
              매매보고서부터 홈페이지까지~ 알아서 다 해드립니다
            </h2>
            <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: 1.68, margin: 0 }}>
              내가 등록한 공실이 내 전용 웹페이지와 보고서, 홍보지로 즉시 전환되어
              부동산마케팅이 자동으로 연동됩니다.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            {workflows.map((item, idx) => {
              const isSelected = activeWorkflowStep === idx;
              return (
                <div
                  key={item.step}
                  onClick={() => setActiveWorkflowStep(idx)}
                  style={{
                    background: isSelected ? "rgba(234, 88, 12, 0.22)" : "rgba(255, 255, 255, 0.04)",
                    border: isSelected ? "2px solid #ff8e15" : "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 18,
                    padding: "26px 22px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 10px 28px rgba(234, 88, 12, 0.3)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 950,
                        color: isSelected ? "#ff8e15" : "#64748b",
                      }}
                    >
                      {item.step}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: isSelected ? "#ea580c" : "rgba(255,255,255,0.12)",
                        color: "#ffffff",
                        padding: "4px 10px",
                        borderRadius: 14,
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 17, fontWeight: 900, color: "#ffffff", margin: "0 0 10px 0" }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ━━━ 5. BOTTOM CTA BANNER (프리미엄 딥 차콜 & 오렌지 그라디언트) ━━━ */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 0 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #ea580c 0%, #181411 100%)",
              borderRadius: 24,
              padding: "60px 44px",
              textAlign: "center",
              color: "#ffffff",
              boxShadow: "0 24px 48px -10px rgba(234, 88, 12, 0.35)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: "rgba(255, 255, 255, 0.2)",
                fontSize: 13,
                fontWeight: 850,
                padding: "6px 20px",
                borderRadius: 24,
                marginBottom: 22,
                border: "1px solid rgba(255, 255, 255, 0.35)",
                letterSpacing: "0.2px",
              }}
            >
              공실뉴스부동산 정식 파트너십
            </div>

            <h3
              style={{
                fontSize: "clamp(26px, 3.2vw, 36px)",
                fontWeight: 950,
                letterSpacing: "-0.8px",
                lineHeight: 1.32,
                margin: "0 0 18px 0",
              }}
            >
              공실등록 20건 · AI 매매보고서 · 유리창 홍보지<br />
              나만의 웹페이지까지 스마트하게 시작하세요
            </h3>

            <p
              style={{
                fontSize: "16.5px",
                color: "#f1f5f9",
                maxWidth: 680,
                margin: "0 auto 38px",
                lineHeight: 1.68,
              }}
            >
              공실뉴스부동산 멤버가 되시면, 온·오프라인 부동산 마케팅을 번거로움 없이 전자동으로 손쉽게 운영하실 수 있습니다.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link
                href="/newsrealty/apply"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "16px 36px",
                  background: "#ffffff",
                  color: "#181411",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 950,
                  textDecoration: "none",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.18)",
                  transition: "transform 0.15s ease",
                }}
              >
                멤버십 신청하기 &gt;&gt;
              </Link>
              <Link
                href="/newsrealty"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "16px 30px",
                  background: "rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  borderRadius: 12,
                  fontSize: 15.5,
                  fontWeight: 800,
                  textDecoration: "none",
                  border: "1.5px solid rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(4px)",
                }}
              >
                뉴스리얼티 홈으로 &gt;&gt;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
