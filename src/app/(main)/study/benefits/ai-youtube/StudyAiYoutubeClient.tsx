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
 * 8. 인스타 릴스 · 유튜브 쇼츠 숏폼 제작 실전 노하우 전수
 * 9. 드론 항공 영상 상업적 저작권 무료 제공
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
      title: "프리미어 & 드론 영상",
      desc: "무료 제공되는 드론 항공 영상을 프리미어 프로로 편집해 대형 임장 전문 채널 수준의 영상을 만듭니다.",
      tag: "드론 영상 · 프리미어",
    },
    {
      step: "04",
      period: "10~12개월차",
      title: "고급 쇼츠 · 릴스 실전 마케팅",
      desc: "AI 툴을 활용해 숏폼 영상을 빠르게 제작하고, 계약으로 연결되는 채널 브랜딩을 완성합니다.",
      tag: "쇼츠·릴스 실습",
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
        color: "#261f1b",
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
              backgroundColor: "#f4faf7",
              border: "1px solid #dce9e5",
              color: "#111827",
              borderRadius: 16,
              overflow: "hidden",
              // 강의목록 히어로와 같은 높이로 고정. 세 혜택 페이지가 같은 높이라 탭 위치도 그대로 있다
              height: 400,
            }}
          >
            {/* 배경 이미지 — 유튜브 편집 화면 앞의 여성 중개사 (/study 무료 혜택 사진 원본, 오른쪽 아래 워터마크만 잘라냄) */}
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "62%" }}>
              <Image
                src="/images/study/benefit-youtube-hero-woman.webp"
                alt="유튜브 영상 편집 화면 앞에서 웃고 있는 여성 공인중개사"
                fill
                priority
                sizes="(max-width: 1160px) 62vw, 690px"
                style={{ objectFit: "cover", objectPosition: "70% center" }}
              />
            </div>

            {/* 좌측 가독성 그라디언트 오버레이 */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(to right, rgba(244, 250, 247, 1) 0%, rgba(244, 250, 247, 0.97) 44%, rgba(244, 250, 247, 0.6) 64%, rgba(244, 250, 247, 0) 84%)",
              }}
            />

            {/* 왼쪽 글자 영역에만 옅은 격자무늬 (/study 히어로와 같은 바탕) */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                backgroundImage:
                  "linear-gradient(rgba(5, 150, 105, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(5, 150, 105, 0.05) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
                WebkitMaskImage: "linear-gradient(to right, #000 45%, transparent 72%)",
                maskImage: "linear-gradient(to right, #000 45%, transparent 72%)",
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
                  backgroundColor: POINT,
                  border: `1px solid ${POINT}`,
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: 18,
                  letterSpacing: "0.2px",
                }}
              >
                <span>MEMBERSHIP BENEFIT 03</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>유튜브 · 릴스 영상 제작 온라인 강의</span>
              </div>

              {/* 메인 헤드라인 */}
              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  lineHeight: 1.28,
                  letterSpacing: "-1.4px",
                  margin: "0 0 16px 0",
                  color: "#1c1917",
                }}
              >
                유튜브 &amp; 릴스 영상 제작 실전 강의!<br />
                <span style={{ color: "#059669" }}>
                  온라인 강의로 내 사무실에서 반복 수강
                </span>
              </h1>

              {/* 서브 설명 */}
              <p
                style={{
                  fontSize: "15.5px",
                  color: "#57534e",
                  lineHeight: 1.65,
                  margin: "0 0 28px 0",
                  wordBreak: "keep-all",
                }}
              >
                바쁜 시간 쪼개어 오프라인 학원에 갈 필요 없이, 내 사무실에서 언제든 편하게 반복해서 들을 수 있습니다!
                유튜브 롱폼 영상부터 인스타그램 릴스·쇼츠 숏폼 제작까지, 방송국 PD 출신 직강으로
                손님의 문의 콜(Call)로 연결되는 실전 영상 제작법을 100% 온라인으로 마스터하세요.
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
                손님의 Call 연결
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                유튜브 제작강의
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                방송국 PD출신 부동산마케팅 직강
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                VOD 강의
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                무제한 반복 가능
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                내 사무실에서 시간 날 때마다 반복 수강 가능
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                강의 범위
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                유튜브 &amp; 릴스 제작
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                매물 롱폼부터 숏폼 릴스까지 완벽 실습
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                영상 리소스 제공
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                드론 영상 저작권 무료
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                서울 주요 랜드마크 드론 영상 상업적 무제한 활용
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
                color: "#1c1917",
                letterSpacing: "-0.8px",
                lineHeight: 1.35,
                margin: "0 0 14px 0",
              }}
            >
              단순 조회수가 아닌 &lsquo;손님의 문의 전화&rsquo;를 부르는 영상,<br />
              12개월 동안 마케팅 능력이 완전히 달라집니다!
            </h2>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              기초 영상 툴부터 인스타 릴스, 유튜브 롱폼, 최신 생성형 AI 활용법까지!
              강남·서초 상위 1% 중개사들이 검증한 실전 온라인 커리큘럼을 소개합니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>

            {/* ── BENEFIT 01: 서울벤처대학원대학교 유튜브 콘텐츠 제작 실습 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 40,
                alignItems: "center",
                background: "linear-gradient(135deg, #fbf7f2 0%, #ffffff 100%)",
                border: "1px solid #d1fae5",
                borderRadius: 20,
                padding: "44px 40px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  minHeight: 340,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#e2e8f0",
                }}
              >
                <Image
                  src="/images/study/seoul-venture-lecture-2025-blur.png"
                  alt="2025년 서울벤처대학원대학교 강의 현장 단체사진 (개인정보 보호 모자이크 적용)"
                  fill
                  sizes="(max-width: 1160px) 55vw, 608px"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", marginBottom: 8 }}>
                  2025 서울벤처대학원대학교
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: "#241d19", margin: "0 0 16px 0", letterSpacing: "-0.5px" }}>
                  유튜브 콘텐츠 제작 실습 교육
                </h3>
                <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, margin: "0 0 20px 0" }}>
                  나이와 IT 경험에 상관없이 화면을 보며 하나씩 따라 하고,
                  수업이 끝날 때 직접 만든 결과물을 남기는 방식으로 진행했습니다.
                </p>
                <strong style={{ fontSize: 15, fontWeight: 800, color: "#047857" }}>
                  이제 같은 과정을 온라인에서 배울 수 있습니다.
                </strong>
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
                    color: "#1c1917",
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
                background: "linear-gradient(135deg, #f8fafc 0%, #fbf5f0 100%)",
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
                    background: "#047857",
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
                    color: "#1c1917",
                    lineHeight: 1.35,
                    letterSpacing: "-0.5px",
                    margin: "0 0 16px 0",
                  }}
                >
                  브루, 캡컷, 포토샵, 프리미어프로부터<br />
                  <span style={{ color: "#047857" }}>챗GPT · 제미나이 · 클로드 실무 활용법까지!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  부동산 마케팅에 꼭 필요한 프로그램만 쏙쏙 골라 가르쳐드립니다.
                  브루(Vrew)로 음성을 자동 자막으로 변환하고, 캡컷(CapCut)으로 1분 숏폼을 뚝딱 만들며,
                  포토샵과 프리미어프로로 고품격 썸네일과 영상을 완성합니다.
                  여기에 챗GPT, 제미나이, 클로드 3대 AI를 활용해 시장 분석과 대본을 1분 만에 뽑아냅니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#047857", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>영상 편집 사총사</strong> — Vrew(자막 자동화), 캡컷(숏폼), 포토샵(썸네일), 프리미어(고화질 영상)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#047857", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>생성형 AI 삼총사</strong> — 챗GPT · Google 제미나이 · Anthropic 클로드 실무 프롬프트 제공
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#047857", fontSize: 18, lineHeight: 1 }}>✔</span>
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
                <div style={{ fontSize: 14, fontWeight: 800, color: "#241d19", marginBottom: 14, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
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

            {/* ── BENEFIT 04: 드론 항공 영상 저작권 무료 제공 ── */}
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
                  핵심 04 · 드론 영상 저작권 무료
                </div>
                <h3
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    color: "#1c1917",
                    lineHeight: 1.35,
                    letterSpacing: "-0.5px",
                    margin: "0 0 16px 0",
                  }}
                >
                  비싼 드론 살 필요 없습니다!<br />
                  <span style={{ color: "#ea580c" }}>서울·수도권 드론 영상 상업적 저작권 무상 제공</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  드론 기기 구입비 수백만 원, 위험한 비행 허가와 촬영 승인 절차 때문에 포기하셨나요?
                  공실스터디 멤버십 회원에게는 서울 강남, 여의도, 테헤란로, 한강변 등 주요 상권과 랜드마크의
                  고화질 항공 드론 촬영 원본 소스를 상업적 저작권 걱정 없이 무료로 제공합니다.
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
                      <strong>서울·수도권 핵심 랜드마크 드론 원본</strong> — 테헤란로, 여의도 금융가, 한강 조망 등
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
                  src="/images/study/benefit-youtube-hero-drone.webp"
                  alt="드론으로 촬영한 한강변 아파트 단지와 도로 전경 (상업적 저작권 무료 제공 샘플)"
                  fill
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━ [NEW] 방송국 PD 출신 마케팅 이사 직강 & 오프라인 검증 섹션 ━━━ */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 0 90px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#059669",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            방송국 PD 출신 편집장 직강
          </p>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 900,
              color: "#241d19",
              lineHeight: 1.4,
              letterSpacing: "-0.8px",
              margin: "0 0 16px 0",
            }}
          >
            방송국 PD 출신, 공실뉴스편집장이<br />
            <span style={{ color: "#059669" }}>강남/서초 100여명의 부동산과 함께 했던 실전 강의!</span>
          </h2>
          <p style={{ fontSize: "16px", color: "#64748b", lineHeight: 1.7, margin: "0 auto 48px", maxWidth: 640 }}>
            강남·서초 100여 개 부동산 실무자와 오프라인에서 함께 했던 생생한 경험을<br />
            이제 온라인에서 누구나 쉽고 빠르게 따라 할 수 있도록 알려드립니다.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              borderTop: "1px solid #e2e8f0",
              borderBottom: "1px solid #e2e8f0",
              marginBottom: 50,
            }}
          >
            <div style={{ padding: "24px 16px", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 6 }}>
              <strong style={{ fontSize: 26, fontWeight: 900, color: "#059669" }}>2025</strong>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>강남구청</span>
              <small style={{ fontSize: 13, color: "#64748b" }}>ChatGPT·AI 실무특강</small>
            </div>
            <div style={{ padding: "24px 16px", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 6 }}>
              <strong style={{ fontSize: 26, fontWeight: 900, color: "#059669" }}>2025</strong>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>서울벤처대학원대학교</span>
              <small style={{ fontSize: 13, color: "#64748b" }}>유튜브 콘텐츠 제작 실습</small>
            </div>
            <div style={{ padding: "24px 16px", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 6 }}>
              <strong style={{ fontSize: 26, fontWeight: 900, color: "#059669" }}>11만</strong>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>부동산 네트워크</span>
              <small style={{ fontSize: 13, color: "#64748b" }}>공실뉴스 회원·독자 기준</small>
            </div>
            <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <strong style={{ fontSize: 26, fontWeight: 900, color: "#059669" }}>1년</strong>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>온라인 실무 스터디</span>
              <small style={{ fontSize: 13, color: "#64748b" }}>맞춤형 피드백 제공</small>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ 4. 12-MONTH ROADMAP SECTION (12개월 마케팅 능력 확! 도약 로드맵) ━━━ */}
      <section style={{ backgroundColor: "#1c1917", color: "#ffffff", padding: "70px 0 80px" }}>
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
        <div className="container px-20" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #059669 0%, #3a2c22 100%)",
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
              유튜브 대본부터 편집, 릴스·쇼츠 제작, 드론 저작권까지!<br />
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
              방송국 PD 직강과 매월 4회 업데이트되는 신규 특강, 드론 영상까지
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
                  color: "#3a2c22",
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

