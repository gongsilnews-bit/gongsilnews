"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";
import { StudyBenefitsHeroTabs } from "@/components/study/StudyBenefitsSubNav";

/**
 * 멤버십혜택 - 블로그 포스팅 자동화
 *
 * 핵심 가치:
 * 1. 블로그 포스팅! 원클릭으로 OK~
 * 2. 공실뉴스에 공실을 등록하고 크롬웹스토어에서 기사 작성기 다운
 * 3. 원클릭으로 내 부동산 매물이 뉴스 기사 초안이 작성됨
 * 4. 뉴스 기사가 블로그 포스팅으로 다양하게 작성됨
 * 5. 초안이기 때문에 꼭!! 작성자의 검토 및 확인이 필요함
 * 6. 내 AI 계정을 사용해서 별도의 요금이 발생하지 않음 (단, 사용량에 따라 유료 요구 가능 / 무료 사용자는 제미나이 추천)
 * 7. 이제 블로그 포스팅 원클릭으로 쉽고 빠르게!
 */

const POINT = "#059669";
const POINT_DARK = "#047857";
const POINT_SOFT = "#ecfdf5";
const POINT_BORDER = "#a7f3d0";

export default function StudyBlogAutomationClient() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflows = [
    {
      step: "01",
      title: "공실 매물 등록",
      desc: "공실뉴스에 내 부동산 매물의 기본 정보(위치, 면적, 가격, 사진)를 등록합니다.",
      tag: "공실뉴스 등록",
    },
    {
      step: "02",
      title: "크롬 작성기 실행",
      desc: "크롬 웹스토어에서 다운로드한 '공실뉴스 기사 작성기' 확장 프로그램을 클릭합니다.",
      tag: "원클릭 확장프로그램",
    },
    {
      step: "03",
      title: "기사 & 블로그 생성",
      desc: "버튼 한 번으로 전문 언론 기사 초안과 다양한 톤의 블로그 글이 3초 만에 완성됩니다.",
      tag: "초안 전자동 작성",
    },
    {
      step: "04",
      title: "작성자 검토 & 확인",
      desc: "중요! AI가 작성한 초안의 금액, 면적, 연락처 등 핵심 팩트를 1분간 가볍게 확인합니다.",
      tag: "필수 팩트체크",
    },
    {
      step: "05",
      title: "블로그 발행 & 유입",
      desc: "네이버 블로그에 복사-붙여넣기하여 즉시 발행하고, 잠재 고객의 매물 문의를 받습니다.",
      tag: "발행 & 고객 유입",
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
        color: "#132e27",
        minHeight: "100vh",
      }}
    >
      <StudyHeader />

      {/* ━━━ 1. HERO (강의목록과 동일한 라운드 카드 + 헤드라인 + 이미지 스타일) ━━━ */}
      <section style={{ backgroundColor: "#ffffff", padding: "18px 0 16px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              backgroundColor: "#112127",
              color: "#ffffff",
              borderRadius: 16,
              overflow: "hidden",
              // 강의목록 히어로와 같은 높이로 고정. 세 혜택 페이지가 같은 높이라 탭 위치도 그대로 있다
              height: 400,
            }}
          >
            {/* 배경 이미지 */}
            <Image
              src="/images/study/benefit_blog_hero.jpg"
              alt="블로그 포스팅 자동화 멤버십 혜택"
              fill
              priority
              sizes="(max-width: 1160px) 100vw, 1112px"
              style={{ objectFit: "cover", objectPosition: "center right" }}
            />

            {/* 좌측 가독성 그라디언트 오버레이 */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(to right, rgba(17,33,39,0.95) 0%, rgba(17,33,39,0.88) 55%, rgba(17,33,39,0.35) 80%, rgba(17,33,39,0) 100%)",
              }}
            />

            {/* 좌측 카피 */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                flex: "1 1 500px",
                maxWidth: 760,
                minWidth: 300,
                padding: "36px 48px 104px",
              }}
            >
              {/* 상단 뱃지 */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(5, 150, 105, 0.25)",
                  border: "1px solid rgba(52, 211, 153, 0.4)",
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#34d399",
                  marginBottom: 18,
                  letterSpacing: "0.2px",
                }}
              >
                <span>MEMBERSHIP BENEFIT 02</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>블로그 포스팅 자동화 프로그램</span>
              </div>

              {/* 메인 헤드라인 */}
              <h1
                style={{
                  fontSize: "33px",
                  fontWeight: 900,
                  lineHeight: 1.32,
                  letterSpacing: "-0.8px",
                  margin: "0 0 16px 0",
                  color: "#ffffff",
                }}
              >
                블로그 포스팅! 원클릭으로 OK~<br />
                <span style={{ color: "#34d399" }}>
                  내 매물이 기사 초안과 블로그 글로 3초 만에 완성
                </span>
              </h1>

              {/* 서브 설명 */}
              <p
                style={{
                  fontSize: "15.5px",
                  color: "#cbd5e1",
                  lineHeight: 1.65,
                  margin: "0 0 28px 0",
                  wordBreak: "keep-all",
                }}
              >
                공실뉴스에 공실을 등록하고 크롬 웹스토어 확장 프로그램 클릭 한 번이면 끝!
                내 부동산 매물이 전문 언론 기사 초안과 다채로운 블로그 포스팅으로 자동 작성됩니다.
                이제 블로그 포스팅, 쉽고 빠르게 해결하세요.
              </p>

            </div>

            {/* 멤버십혜택 3개 탭 (카드 왼쪽 아래 고정 위치) */}
            <StudyBenefitsHeroTabs active="blog-automation" />
          </div>
        </div>
      </section>

      {/* ━━━ 2. QUICK METRIC STATS BAR (4대 핵심 지표) ━━━ */}
      <section style={{ padding: "20px 0 40px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "24px 28px",
            }}
          >
            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                작성 방식
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                원클릭 OK
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                공실 매물 데이터로 3초 자동 완성
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                확장 프로그램
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                크롬웹스토어 무료
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                클릭 한 번으로 간편 설치 & 연동
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                콘텐츠 다변화
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                기사 + 블로그 글
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                뉴스 포맷부터 감성 블로그 포스팅까지
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                프로그램 추가 요금
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                0원 (내 AI 연동)
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                무료 사용자는 Google 제미나이 추천
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 3. DETAILED BENEFITS SECTION (상세 5대 핵심 가이드) ━━━ */}
      <section style={{ padding: "20px 0 80px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          {/* 섹션 서두 카피 */}
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}>
            <span
              style={{
                display: "inline-block",
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: "13px",
                fontWeight: 800,
                padding: "6px 16px",
                borderRadius: "20px",
                marginBottom: "14px",
                border: `1px solid ${POINT_BORDER}`,
              }}
            >
              ONE-CLICK BLOG AUTOMATION
            </span>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 900,
                color: "#062828",
                letterSpacing: "-0.8px",
                lineHeight: 1.35,
                margin: "0 0 14px 0",
              }}
            >
              매일 1시간씩 걸리던 블로그 포스팅,<br />
              이제 클릭 한 번으로 끝내세요!
            </h2>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              공실 등록 한 번이면 크롬 익스텐션이 언론사 기사 초안과 다채로운 블로그 글을
              알아서 작성합니다. 작성자의 1분 팩트체크만 거치면 네이버 상위 노출 준비 끝!
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>

            {/* ── POINT 01: 공실등록 & 크롬웹스토어 다운로드 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 40,
                alignItems: "center",
                background: "linear-gradient(135deg, #f0fdf9 0%, #ffffff 100%)",
                border: "1px solid #d1fae5",
                borderRadius: 20,
                padding: "44px 40px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#059669",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  기능 01 · 원클릭 설치 환경
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#062828",
                    lineHeight: 1.35,
                    letterSpacing: "-0.5px",
                    margin: "0 0 16px 0",
                  }}
                >
                  공실뉴스에 공실을 등록하고<br />
                  <span style={{ color: POINT }}>크롬웹스토어에서 기사 작성기 다운로드!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  공실뉴스에 내 공실 매물을 등록한 뒤, 크롬 웹스토어(Chrome Web Store)에서
                  &lsquo;공실뉴스 AI 기사 작성기&rsquo; 확장 프로그램을 무료로 다운받으세요.
                  별도의 복잡한 프로그램 설치 없이 크롬 브라우저 상단에서 언제든 원클릭으로 바로 작동합니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>크롬 웹스토어 무료 제공</strong> — 크롬 브라우저에 3초 만에 확장 프로그램 추가
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>공실뉴스 완벽 연동</strong> — 내가 등록한 공실 매물 데이터를 즉시 불러와 인식
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>원클릭 실행 팝업</strong> — 블로그 작성 창 옆에 띄워두고 편리하게 작업
                    </span>
                  </div>
                </div>
              </div>

              {/* 시각화 카드: 크롬 익스텐션 목업 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                  minHeight: 310,
                  backgroundColor: "#ffffff",
                }}
              >
                <Image
                  src="/images/study/benefit_chrome_extension.jpg"
                  alt="크롬 웹스토어 공실뉴스 기사 작성기 확장 프로그램"
                  fill
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            </div>

            {/* ── POINT 02: 원클릭 뉴스 기사 초안 작성 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: 40,
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                padding: "44px 40px",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.03)",
              }}
            >
              {/* 기사 초안 프리뷰 박스 */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: 14,
                  padding: "24px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "#0284c7", color: "#ffffff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                      뉴스 기사 초안
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>공실뉴스 보도국</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>3초 만에 생성 완료</span>
                </div>

                <h5 style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                  [단독] 강남역 도보 3분 초역세권 대형 오피스, 인테리어 무상 승계 파격 조건 등장
                </h5>

                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0, background: "#ffffff", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  【공실뉴스=김대표 기자】 서울 강남구 테헤란로 핵심 업무권역에 위치한 전용 148㎡ 규모의 고급 사무실이 신규 임차인을 맞이한다.
                  해당 매물은 채광이 우수한 통유리 외관과 회의실 3실이 기시공되어 있어 초기 시설 투자비용을 획기적으로 절감할 수 있다...
                </p>
              </div>

              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#0284c7",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  기능 02 · 전문 언론 기사화
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#062828",
                    lineHeight: 1.35,
                    letterSpacing: "-0.5px",
                    margin: "0 0 16px 0",
                  }}
                >
                  원클릭으로 내 부동산 매물이<br />
                  <span style={{ color: "#0284c7" }}>뉴스 기사 초안으로 바로 작성됨!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  매물 정보만 있으면 전문 부동산 기자가 쓴 것처럼 객관적이고 신뢰도 높은 언론사 기사 초안이 완성됩니다.
                  위치, 면적, 층수, 임대조건, 입지 분석까지 일목요연하게 정리되어
                  포털 뉴스 송고는 물론 임대인 및 고객 브리핑 자료로도 완벽합니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>3초 원클릭 초안 완성</strong> — 긴 글 작성을 고민할 필요 없이 헤드라인과 본문 자동 구성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>언론사 보도체 구조화</strong> — 6하 원칙에 입각한 전문성 높은 문장력
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>임대인 감동 브리핑</strong> — &ldquo;대표님 매물을 언론 기사로 다뤄 드립니다&rdquo;
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── POINT 03: 다양한 블로그 포스팅으로 변환 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 40,
                alignItems: "center",
                background: "linear-gradient(135deg, #f8fafc 0%, #edfafd 100%)",
                border: "1px solid #cbd5e1",
                borderRadius: 20,
                padding: "44px 40px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#0f766e",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  기능 03 · 다채로운 블로그 글감
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#062828",
                    lineHeight: 1.35,
                    letterSpacing: "-0.5px",
                    margin: "0 0 16px 0",
                  }}
                >
                  뉴스 기사가 블로그 포스팅으로<br />
                  <span style={{ color: "#0f766e" }}>다양하게 변환되어 작성됨!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  딱딱한 기사 문체 그대로 블로그에 올리면 방문자들이 지루해합니다.
                  공실뉴스 기사 작성기는 작성된 기사를 네이버 블로그에 딱 맞는 다양한 톤앤매너로 변환해 줍니다.
                  친근한 현장 브리핑형, 투자 가치 집중 분석형, 감성 스토리텔링형 등 골라 쓰는 재미가 있습니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>네이버 스마트에디터 최적화</strong> — 소제목, 본문 글머리, 강조 서식까지 완벽 대응
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>상위 노출 태그 자동 추천</strong> — 네이버 검색 알고리즘 맞춤형 해시태그 10종 자동 생성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>다양한 관점 포스팅</strong> — 1개 공실 매물로 3~4개의 서로 다른 블로그 콘텐츠 양산 가능
                    </span>
                  </div>
                </div>
              </div>

              {/* 네이버 블로그 에디터 샘플 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                  minHeight: 310,
                  backgroundColor: "#ffffff",
                }}
              >
                <Image
                  src="/images/study/naver-blog-editor-sample.png"
                  alt="네이버 블로그 포스팅 에디터 샘플"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                />
              </div>
            </div>

            {/* ── POINT 04: ★ 중요! 작성자의 검토 및 확인 필수 ── */}
            <div
              style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                border: "2px solid #f59e0b",
                borderRadius: 20,
                padding: "40px 36px",
                boxShadow: "0 8px 24px rgba(245, 158, 11, 0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                <div
                  style={{
                    background: "#d97706",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: 52,
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  !
                </div>

                <div style={{ flex: "1 1 500px" }}>
                  <div
                    style={{
                      display: "inline-block",
                      background: "#b45309",
                      color: "#ffffff",
                      fontSize: 12.5,
                      fontWeight: 800,
                      padding: "4px 12px",
                      borderRadius: 6,
                      marginBottom: 10,
                    }}
                  >
                    필수 주의사항 · FACT CHECK
                  </div>

                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: 900,
                      color: "#78350f",
                      lineHeight: 1.35,
                      letterSpacing: "-0.5px",
                      margin: "0 0 12px 0",
                    }}
                  >
                    초안이기 때문에 꼭!! 작성자의 검토 및 확인이 필요합니다
                  </h3>

                  <p
                    style={{
                      fontSize: "15px",
                      color: "#92400e",
                      lineHeight: 1.7,
                      margin: "0 0 20px 0",
                      wordBreak: "keep-all",
                    }}
                  >
                    AI는 대표님의 소중한 시간을 아껴주는 가장 든든한 조수입니다.
                    하지만 부동산 거래는 보증금, 권리금, 관리비, 면적, 중개대상물 확인사항 등
                    <strong> 100% 정확한 팩트가 가장 중요합니다.</strong>
                    AI가 90% 이상 훌륭하게 초안을 작성해주면, 발행 전 반드시 대표님께서
                    세부 숫자와 연락처를 1분간 검토·확인하신 후 최종 발행해 주세요!
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                      background: "#ffffff",
                      padding: "16px 20px",
                      borderRadius: 12,
                      border: "1px solid #fde68a",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#d97706", fontWeight: 900 }}>1.</span>
                      <span style={{ fontSize: 13.5, color: "#451a03", fontWeight: 700 }}>
                        임대료 및 관리비 변동사항 확인
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#d97706", fontWeight: 900 }}>2.</span>
                      <span style={{ fontSize: 13.5, color: "#451a03", fontWeight: 700 }}>
                        전용 면적 및 층수 표기 재확인
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#d97706", fontWeight: 900 }}>3.</span>
                      <span style={{ fontSize: 13.5, color: "#451a03", fontWeight: 700 }}>
                        중개사무소 상호 및 등록번호 체크
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── POINT 05: 내 AI 계정 사용으로 별도 요금 없음 & 제미나이 추천 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: 40,
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #bfdbfe",
                borderRadius: 20,
                padding: "44px 40px",
                boxShadow: "0 6px 20px rgba(59, 130, 246, 0.06)",
              }}
            >
              {/* 제미나이 추천 카드 UI */}
              <div
                style={{
                  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  border: "1px solid #93c5fd",
                  borderRadius: 16,
                  padding: "28px 24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "#2563eb",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 18,
                    }}
                  >
                    G
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#1e3a8a" }}>
                      Google Gemini (제미나이)
                    </div>
                    <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 700 }}>
                      무료 사용자 강력 추천 AI
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 13.5, color: "#1e40af", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                  구글 제미나이 API는 개인 사용자에게 매일 넉넉한 <strong>무료 사용량(Free Tier)</strong>을
                  제공합니다. 별도 결제 등록 없이도 매일 수십 편의 포스팅을 무료로 생성하실 수 있습니다.
                </p>

                <div style={{ background: "#ffffff", padding: "12px 16px", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a", marginBottom: 4 }}>
                    💡 API 키 발급이 어렵지 않나요?
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    스터디 강의에서 구글 계정으로 1분 만에 API 키를 복사해 프로그램에 붙여넣는 방법을
                    친절하게 화면 영상으로 알려드립니다.
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  기능 04 · 경제적이고 투명한 시스템
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#062828",
                    lineHeight: 1.35,
                    letterSpacing: "-0.5px",
                    margin: "0 0 16px 0",
                  }}
                >
                  내 AI 계정을 사용해서<br />
                  <span style={{ color: "#2563eb" }}>별도의 프로그램 요금이 발생하지 않음!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  프로그램 월 사용료나 글 작성 건당 수수료를 요구하지 않습니다.
                  회원님 개인의 AI API 키(Google Gemini 또는 OpenAI 등)를 직접 입력하여 사용하므로
                  프로그램 이용에 따른 별도의 추가 요금이 없습니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#2563eb", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>소프트웨어 추가 과금 0원</strong> — 멤버십 회원이라면 평생 무료 이용
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#2563eb", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>무료 사용자는 제미나이 추천</strong> — 넉넉한 일일 무료 할당량으로 비용 부담 제로
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#2563eb", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>투명한 공식 API 연동</strong> — 대량 사용 시에도 중간 마진 없는 공식 원가 적용
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━ 4. INTERACTIVE 5-STEP WORKFLOW SUMMARY (중개사 실무 5단계 사이클) ━━━ */}
      <section style={{ backgroundColor: "#062828", color: "#ffffff", padding: "70px 0 80px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 44px" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#34d399",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              5-STEP BLOG AUTOMATION
            </span>
            <h2
              style={{
                fontSize: "30px",
                fontWeight: 900,
                color: "#ffffff",
                margin: "8px 0 12px 0",
                letterSpacing: "-0.8px",
              }}
            >
              클릭 한 번으로 끝나는 블로그 포스팅 순서
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              원클릭 설치부터 초안 생성, 1분 팩트체크 후 최종 발행까지 — 대표님의 시간을 획기적으로 줄여드립니다.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {workflows.map((item, idx) => {
              const isSelected = activeWorkflowStep === idx;
              return (
                <div
                  key={item.step}
                  onClick={() => setActiveWorkflowStep(idx)}
                  style={{
                    background: isSelected ? "rgba(5, 150, 105, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: isSelected ? "2px solid #34d399" : "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 14,
                    padding: "24px 20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: isSelected ? "#34d399" : "#64748b",
                      }}
                    >
                      {item.step}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: isSelected ? "#059669" : "rgba(255,255,255,0.1)",
                        color: "#ffffff",
                        padding: "3px 8px",
                        borderRadius: 12,
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>

                  <h4 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", margin: "0 0 8px 0" }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.55, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ━━━ 5. BOTTOM CTA BANNER ━━━ */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 0 100px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
              borderRadius: 20,
              padding: "56px 40px",
              textAlign: "center",
              color: "#ffffff",
              boxShadow: "0 20px 40px rgba(5, 150, 105, 0.25)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: "rgba(255, 255, 255, 0.18)",
                fontSize: 13,
                fontWeight: 800,
                padding: "6px 18px",
                borderRadius: 20,
                marginBottom: 20,
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              이제 블로그 포스팅, 원클릭으로 쉽고 빠르게 하세요!
            </div>

            <h3
              style={{
                fontSize: "32px",
                fontWeight: 900,
                letterSpacing: "-0.8px",
                lineHeight: 1.35,
                margin: "0 0 16px 0",
              }}
            >
              블로그 작성 고민 끝!<br />
              공실 등록하고 원클릭으로 기사와 블로그를 완성하세요
            </h3>

            <p
              style={{
                fontSize: "16px",
                color: "#e2e8f0",
                maxWidth: 640,
                margin: "0 auto 36px",
                lineHeight: 1.6,
              }}
            >
              공실스터디 멤버십 하나로 블로그 포스팅 자동화 프로그램과 크롬 확장 프로그램,
              공실 20건, 기사 4편 및 1년 연간 특강 VOD를 모두 누리실 수 있습니다.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link
                href="/study/apply"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "14px 34px",
                  background: "#ffffff",
                  color: "#064e3b",
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 900,
                  textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  transition: "transform 0.15s ease",
                }}
              >
                멤버십 신청하기 &gt;&gt;
              </Link>
              <Link
                href="/study/lectures"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "14px 28px",
                  background: "transparent",
                  color: "#ffffff",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 800,
                  textDecoration: "none",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                }}
              >
                1년 연간 특강 라인업 둘러보기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
