"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";
import { StudyBenefitsHeroTabs } from "@/components/study/StudyBenefitsSubNav";

/**
 * 멤버십혜택 - 유튜브 강의 + 드론 저작권
 *
 * 핵심 가치:
 * 1. 유튜브 대본을 손님의 콜(전화/문의)로 연결되는 영상으로 만드는 강의를 온라인으로 수강
 * 2. 방송국 PD 출신 공실뉴스 편집장이 직접 강의한 실전 영상
 * 3. 강남/서초 부동산이 오프라인에서 수백만 원에 교육받은 내용을 온라인에서 편안하게 수강
 * 4. 초보자부터 고급자까지 12개월 동안 단계적으로 수강
 * 5. AI 시대, 콘텐츠 제작 능력까지 전방위 성장
 * 6. 새로운 강의는 매월 4회 꾸준히 무료로 업데이트
 * 7. 브루(Vrew), 캡컷(CapCut), 포토샵(Photoshop), 프리미어프로(Premiere Pro) 강의부터
 *    챗GPT, 제미나이, 클로드 실무 활용법까지
 * 8. 부동산 홈페이지를 내 맘대로 만드는 '바이브코딩' 실습까지
 * 9. 4K 드론 항공 영상 상업적 저작권 무료 제공
 * 10. 12개월 동안 마케팅 능력이 확! 늘어난다
 */

const POINT = "#059669";
const POINT_DARK = "#047857";
const POINT_SOFT = "#ecfdf5";
const POINT_BORDER = "#a7f3d0";

export default function StudyAiYoutubeClient() {
  const [activeRoadmapStep, setActiveRoadmapStep] = useState(0);

  const roadmapSteps = [
    {
      step: "01",
      period: "1~3개월차",
      title: "기초 영상 & 숏폼 마스터",
      desc: "브루(Vrew) 자막 자동 추출과 캡컷(CapCut)으로 스마트폰 하나로 3분 만에 첫 숏폼 영상을 완성합니다.",
      tag: "Vrew · 캡컷 숏폼",
    },
    {
      step: "02",
      period: "4~6개월차",
      title: "콜 부르는 대본 & AI 기획",
      desc: "챗GPT와 제미나이로 고객 심리를 파고드는 대본을 쓰고, 포토샵으로 클릭률 2배 썸네일을 제작합니다.",
      tag: "챗GPT · 썸네일",
    },
    {
      step: "03",
      period: "7~9개월차",
      title: "프리미어 & 4K 드론 영상",
      desc: "무료 제공되는 4K 드론 항공 영상을 프리미어 프로로 편집해 대형 임장 전문 채널 수준의 영상을 만듭니다.",
      tag: "4K 드론 · 프리미어",
    },
    {
      step: "04",
      period: "10~12개월차",
      title: "바이브코딩 홈페이지 제작",
      desc: "코딩 없이 AI 바이브코딩으로 내 부동산 전용 접수 홈페이지를 내 마음대로 직접 구축합니다.",
      tag: "바이브코딩 실습",
    },
    {
      step: "05",
      period: "수료 후",
      title: "상위 1% 부동산 마케터 완성",
      desc: "유튜브, 블로그, AI 툴, 전용 웹사이트까지 모두 다루는 압도적 지역 1등 공인중개사로 도약합니다.",
      tag: "매출 폭증 & 브랜딩",
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

      {/* ━━━ 1. HERO (동일한 컴팩트 라운드 카드 + 헤드라인 + 이미지 스타일) ━━━ */}
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
              src="/images/study/benefit_youtube_hero.jpg"
              alt="유튜브 강의와 드론 저작권 멤버십 혜택"
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
                <span>MEMBERSHIP BENEFIT 03</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>유튜브 실전 강의 + 4K 드론 저작권</span>
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
                손님의 콜(Call)로 연결되는 유튜브 영상!<br />
                <span style={{ color: "#34d399" }}>
                  방송국 PD 출신 직강 & 4K 드론 저작권 무료
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
                강남·서초 상위 1% 부동산이 오프라인에서 수백만 원에 배운 특급 커리큘럼을 온라인으로!
                브루·캡컷·포토샵·프리미어부터 챗GPT·제미나이·클로드, 내 맘대로 만드는 바이브코딩까지
                12개월간 내 마케팅 능력이 확! 늘어납니다.
              </p>

            </div>

            {/* 멤버십혜택 3개 탭 (카드 왼쪽 아래 고정 위치) */}
            <StudyBenefitsHeroTabs active="ai-youtube" />
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
                강사진 신뢰도
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                방송국 PD 직강
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                공실뉴스 편집장이 직접 전수하는 실전 대본
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                수강 방식
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                12개월 무제한
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                강남/서초 오프라인 특강을 온라인으로 수강
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                특강 업데이트
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                매월 4회 무료 추가
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                최신 AI 툴 & 바이브코딩 특강 지속 업로드
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                영상 리소스 제공
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                4K 드론 저작권 무료
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                서울 주요 랜드마크 영상 상업적 무제한 활용
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 3. DETAILED BENEFITS SECTION (상세 실무 혜택 카드들) ━━━ */}
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
              BROADCASTING PD CURRICULUM
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
              단순 조회수가 아닌 &lsquo;손님의 문의 전화&rsquo;를 부르는 영상,<br />
              12개월 동안 마케팅 능력이 완전히 달라집니다!
            </h2>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              기초 영상 툴부터 생성형 AI, 코딩 없이 내 홈페이지를 만드는 바이브코딩까지!
              강남·서초 상위 1% 중개사들이 검증한 실전 온라인 커리큘럼을 소개합니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>

            {/* ── BENEFIT 01: 방송국 PD 출신 편집장 직강 & 손님 콜 연결 대본 ── */}
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
                  핵심 01 · 방송국 PD 실전 노하우
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
                  유튜브 대본을 손님의 콜(Call)로 연결되는 영상으로!<br />
                  <span style={{ color: POINT }}>방송국 PD 출신 공실뉴스 편집장 직강</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  조회수만 높고 계약 전화 한 통 안 오는 껍데기 영상은 이제 그만!
                  방송국 PD 출신 공실뉴스 편집장이 직접 기획한 강의로,
                  손님이 영상을 끝까지 보고 자연스럽게 문의 전화를 걸게 만드는
                  심리적 후킹과 부동산 전문 대본 작성법을 100% 온라인으로 전수합니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>문의 전화 유도 대본 기획</strong> — 첫 5초 시선 고정부터 마지막 CTA 클로징 공식
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>방송국 현장 연출 비법</strong> — 앵글, 조명, 목소리 전달력까지 프로의 연출법 전수
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>부동산 실무 밀착형 사례</strong> — 원룸부터 대형 상가·빌딩까지 실거래 직결 강의
                    </span>
                  </div>
                </div>
              </div>

              {/* 시각화 카드 */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 26,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0f2e28" }}>PD 직강: 손님 콜 부르는 3단계 공식</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 8px", borderRadius: 4 }}>
                    실전 VOD
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#059669" }}>STEP 1 · 3초 시선 후킹</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                      &ldquo;강남 테헤란로 보증금 5,000만원에 이 평수 실화인가요?&rdquo;
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0284c7" }}>STEP 2 · 객관적 가치 브리핑</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                      면적·임대료·인테리어 무상 승계 등 임차인 관점 핵심 혜택 나열
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#ea580c" }}>STEP 3 · 즉시 상담 콜 연결</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                      &ldquo;선착순 1팀 마감! 지금 아래 번호로 문의주시면 현장 안내 도와드립니다&rdquo;
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BENEFIT 02: 강남/서초 오프라인 교육을 온라인에서 편안하게 ── */}
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
              {/* 오프라인 강연 현장 사진 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
                  minHeight: 300,
                  backgroundColor: "#f1f5f9",
                }}
              >
                <Image
                  src="/images/study/gangnam-ai-lecture-2025.png"
                  alt="강남 서초 부동산 오프라인 특강 현장"
                  fill
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(15, 23, 42, 0.88)",
                    padding: "10px 16px",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>수백만 원대 강남/서초 오프라인 실무 특강</span>
                  <span style={{ color: "#34d399" }}>온라인 1년 무제한 수강</span>
                </div>
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
                  핵심 02 · 오프라인 고액 과외의 온라인화
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
                  강남·서초 부동산이 오프라인에서 배운 내용,<br />
                  <span style={{ color: "#0284c7" }}>이제 안방과 사무실에서 온라인으로 수강!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  강남과 서초의 상위 1% 공인중개사들이 수백만 원씩 지불하며 현장에서 들었던
                  고밀도 부동산 실무 특강의 모든 핵심을 고스란히 온라인 VOD로 담았습니다.
                  초보자부터 고급자까지 12개월 동안 내 진도에 맞춰 언제든 복습하며 수강하실 수 있습니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>12개월 365일 무제한 다시보기</strong> — PC·스마트폰·태블릿 어디서나 자유롭게 학습
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>초보부터 고급까지 단계별 로드맵</strong> — 컴맹도 마우스 클릭만 따라 하면 완성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>교육비 90% 이상 절감</strong> — 수백만 원짜리 학원비 대신 월 3만원대로 완전 정복
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BENEFIT 03: 실전 편집 툴 & 생성형 AI 3대장 마스터 ── */}
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
                  핵심 03 · 영상 툴 & AI 마스터
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
                  브루, 캡컷, 포토샵, 프리미어프로부터<br />
                  <span style={{ color: "#0f766e" }}>챗GPT · 제미나이 · 클로드 실무 활용법까지!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  부동산 마케팅에 꼭 필요한 프로그램만 쏙쏙 골라 가르쳐드립니다.
                  브루(Vrew)로 음성을 자동 자막으로 변환하고, 캡컷(CapCut)으로 1분 숏폼을 뚝딱 만들며,
                  포토샵과 프리미어프로로 고품격 썸네일과 영상을 완성합니다.
                  여기에 챗GPT, 제미나이, 클로드 3대 AI를 활용해 시장 분석과 대본을 1분 만에 뽑아냅니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>영상 편집 사총사</strong> — Vrew(자막 자동화), 캡컷(숏폼), 포토샵(썸네일), 프리미어(고화질 영상)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>생성형 AI 삼총사</strong> — 챗GPT · Google 제미나이 · Anthropic 클로드 실무 프롬프트 제공
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>매월 4회 신규 강의 무료 추가</strong> — 빠르게 바뀌는 최신 AI 기술을 매달 무료로 업데이트
                    </span>
                  </div>
                </div>
              </div>

              {/* 툴 그리드 카드 */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f2e28", marginBottom: 14, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                  스터디에서 완벽 마스터하는 실전 툴
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#0284c7" }}>Vrew (브루)</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>음성 인식 자동 자막 생성</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>CapCut (캡컷)</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>3분 컷 부동산 숏폼 제작</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#3b82f6" }}>Photoshop</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>시선 강탈 유튜브 썸네일</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#9333ea" }}>Premiere Pro</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>고품격 부동산 임장 영상</div>
                  </div>
                  <div style={{ background: "#ecfdf5", padding: "12px", borderRadius: 10, border: "1px solid #a7f3d0" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#059669" }}>ChatGPT & Gemini</div>
                    <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>부동산 대본 & 시황 분석</div>
                  </div>
                  <div style={{ background: "#fff7ed", padding: "12px", borderRadius: 10, border: "1px solid #fed7aa" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#ea580c" }}>Claude (클로드)</div>
                    <div style={{ fontSize: 12, color: "#c2410c", marginTop: 2 }}>고난도 리서치 & 매물 브리핑</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BENEFIT 04: 내 맘대로 만드는 부동산 홈페이지 '바이브코딩' 실습 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: 40,
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #d8b4fe",
                borderRadius: 20,
                padding: "44px 40px",
                boxShadow: "0 6px 20px rgba(168, 85, 247, 0.06)",
              }}
            >
              {/* 바이브코딩 특강 썸네일/화면 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #c084fc",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                  minHeight: 310,
                  backgroundColor: "#faf5ff",
                }}
              >
                <Image
                  src="/images/study/partner-webpage-sample.png"
                  alt="바이브코딩으로 부동산 홈페이지 직접 제작"
                  fill
                  style={{ objectFit: "contain", objectPosition: "center", padding: 8 }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(88, 28, 135, 0.9)",
                    padding: "10px 16px",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>비개발자 바이브코딩 실습</span>
                  <span style={{ color: "#f0abfc" }}>내 입맛대로 웹페이지 제작</span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#9333ea",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  핵심 04 · 최신 AI 바이브코딩 실습
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
                  부동산 홈페이지를 내 맘대로 만드는<br />
                  <span style={{ color: "#9333ea" }}>&lsquo;바이브코딩(Vibe Coding)&rsquo; 실습까지!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  코딩을 전혀 몰라도 괜찮습니다. 최신 AI에게 말로 지시해
                  내 부동산 전용 랜딩페이지, 매물 접수 페이지를 내 마음대로 직접 뚝딱 만드는
                  &lsquo;바이브 코딩&rsquo; 실무 과정을 함께합니다. 외주 개발비 수백만 원을 아끼고,
                  원하는 디자인과 기능을 대표님 손으로 실시간 수정할 수 있습니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#9333ea", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>코딩 0줄, 비개발자 완벽 적응</strong> — AI와 대화하며 원하는 페이지 즉시 생성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#9333ea", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>홈페이지 제작 외주비 0원</strong> — 200~300만 원 상당의 개발비 완벽 세이브
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#9333ea", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>AI 시대 최고의 생존 무기</strong> — 콘텐츠 제작을 넘어 디지털 자산을 직접 통제
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BENEFIT 05: 4K 드론 항공 영상 저작권 무료 제공 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 40,
                alignItems: "center",
                background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
                border: "1px solid #fed7aa",
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
                    background: "#ea580c",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  핵심 05 · 4K 드론 영상 저작권 무료
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
                  비싼 드론 살 필요 없습니다!<br />
                  <span style={{ color: "#ea580c" }}>서울·수도권 4K 드론 영상 상업적 저작권 무상 제공</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  드론 기기 구입비 수백만 원, 위험한 비행 허가와 촬영 승인 절차 때문에 포기하셨나요?
                  공실스터디 멤버십 회원에게는 서울 강남, 여의도, 테헤란로, 한강변 등 주요 상권과 랜드마크의
                  고화질 4K 항공 드론 촬영 원본 소스를 상업적 저작권 걱정 없이 무료로 제공합니다.
                  내 유튜브 영상 도입부에 넣기만 해도 대형 방송국 수준의 시네마틱 퀄리티가 완성됩니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#ea580c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>상업적 이용 100% 합법</strong> — 유튜브 수익 창출 채널, 블로그, 인스타 무제한 삽입
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#ea580c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>서울·수도권 핵심 랜드마크 4K 원본</strong> — 테헤란로, 여의도 금융가, 한강 조망 등
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#ea580c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>저작권 경고(Copyright Strike) 안심 보장</strong> — 공실뉴스가 직접 보유한 공식 저작권
                    </span>
                  </div>
                </div>
              </div>

              {/* 드론 실사 샘플 카드 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #fdba74",
                  boxShadow: "0 10px 25px rgba(234, 88, 12, 0.12)",
                  minHeight: 310,
                  backgroundColor: "#fff7ed",
                }}
              >
                <Image
                  src="/images/study/benefit_drone_sample.jpg"
                  alt="4K 드론 상업적 항공 영상 저작권 무료 제공"
                  fill
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━ 4. 12-MONTH ROADMAP SECTION (12개월 마케팅 능력 확! 도약 로드맵) ━━━ */}
      <section style={{ backgroundColor: "#062828", color: "#ffffff", padding: "70px 0 80px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ textAlign: "center", maxWidth: 740, margin: "0 auto 44px" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#34d399",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              12-MONTH GROWTH ROADMAP
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
              12개월 동안 내 마케팅 능력이 확! 늘어난다
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              초보자부터 고급자까지 단계별로 차근차근 따라오면, 1년 뒤 유튜브, 블로그, AI, 홈페이지까지
              모두 스스로 다루는 지역 상위 1% 공인중개사로 완성됩니다.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {roadmapSteps.map((item, idx) => {
              const isSelected = activeRoadmapStep === idx;
              return (
                <div
                  key={item.step}
                  onClick={() => setActiveRoadmapStep(idx)}
                  style={{
                    background: isSelected ? "rgba(5, 150, 105, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: isSelected ? "2px solid #34d399" : "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 14,
                    padding: "24px 20px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: isSelected ? "#34d399" : "#a7f3d0",
                      }}
                    >
                      {item.period}
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
              12개월 연간 멤버십 하나로 모든 특강 & 드론 저작권 무제한
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
              유튜브 대본부터 편집, AI 바이브코딩, 드론 저작권까지!<br />
              월 3만원대로 내 중개업의 마케팅 체급을 바꾸세요
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
              방송국 PD 직강과 매월 4회 업데이트되는 신규 특강, 4K 드론 영상까지
              공실스터디 멤버십에서 모두 제공합니다.
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
