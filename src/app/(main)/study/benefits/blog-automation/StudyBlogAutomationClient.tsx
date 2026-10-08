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
 * 1. 블로그 & SNS 포스팅 1분 자동 완성
 * 2. 공실 등록 후 크롬 확장 프로그램 무료 연동
 * 3. 인스타, 쓰레드, 페이스북 SNS 자동 포스팅
 * 4. 건물 외관 & 실내 AI 인테리어 Before/After 예측기
 * 5. 별도의 API 요금 없이 내가 가입한 챗GPT·제미나이 사용 & 프로그램 지속 업데이트
 * 6. 이제 블로그 포스팅 원클릭으로 쉽고 빠르게!
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
        color: "#261f1b",
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
              backgroundColor: "#f4faf7",
              border: "1px solid #dce9e5",
              color: "#111827",
              borderRadius: 16,
              overflow: "hidden",
              // 강의목록 히어로와 같은 높이로 고정. 세 혜택 페이지가 같은 높이라 탭 위치도 그대로 있다
              height: 400,
            }}
          >
            {/* 배경 이미지 */}
            {/* 4:3 실사라 카드 오른쪽 칸에만 놓고, 얼굴과 SNS 게시 화면이 보이게 자른다 */}
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "58%" }}>
              <Image
                src="/images/study/benefit-blog-hero-real.webp"
                alt="모니터에 SNS 게시물을 올리고 스마트폰을 보며 기뻐하는 남성 공인중개사"
                fill
                priority
                sizes="(max-width: 1160px) 58vw, 650px"
                style={{ objectFit: "cover", objectPosition: "center 30%" }}
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
                <span>MEMBERSHIP BENEFIT 02</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>블로그 포스팅 자동화 프로그램</span>
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
                내가 등록한 공실로<br />
                <span style={{ color: "#059669" }}>
                  블로그 & SNS 포스팅, 1분 자동 완성!~
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
                공실뉴스에 공실을 등록하고, 제공하는 툴을 사용하면, 블로그 포스팅, SNS 를 쉽고 빠르게 포스팅 할 수 있습니다.
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
                블로그포스팅
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                자동화 프로그램
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                등록된 공실이 자동으로 포스팅!
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                SNS 포스팅
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                인스타, 페북, 쓰레드
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                등록된 공실이 자동으로 포스팅!
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                Before, After 비교
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                AI 인테리어 프로그램
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                건물외관, 아파트 내부 인테리어 예측!
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                프로그램 추가 요금 없음
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#241d19", letterSpacing: "-0.5px" }}>
                0원 (내 AI 연동)
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                무료로 활용하는 다양한 프로그램
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
                color: "#1c1917",
                letterSpacing: "-0.8px",
                lineHeight: 1.35,
                margin: "0 0 14px 0",
              }}
            >
              매일 1시간씩 걸리던 블로그 포스팅,<br />
              이제 클릭 한 번으로 끝내세요!
            </h2>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              공실 등록을 활용해, 제공하는 프로그램으로 블로그 글 및 SNS 포스팅! 1분만에 빠르게 작성합니다. 작성자의 팩트체크만 거치면 네이버 상위 노출 준비 끝!
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>

            {/* ── POINT 01: 매물 정보 AI 분석 & 네이버 상위 노출 블로그 글 자동 작성 ── */}
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
                  기능 01 · 블로그 자동 포스팅
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
                  매물 정보를 AI가 분석해<br />
                  <span style={{ color: POINT }}>네이버 상위 노출 블로그 글을 1초 만에 자동 작성</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 12px 0" }}>
                  매물 등록 후 1시간씩 머리를 쥐어짜며 블로그 포스팅을 고민할 필요가 없습니다. 등록된 데이터를 AI가 스스로 분석하여 네이버 검색 로직에 최적화된 포스팅을 1초 만에 작성해 줍니다.
                </p>
                <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: 1.65, margin: "0 0 24px 0" }}>
                  지역명과 업종 키워드가 타겟팅된 소제목 구조, 자연스러운 본문 스토리라인, 연관 해시태그까지 한 번에 완성되어 복사 후 등록만 하면 끝납니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>스마트블록 알고리즘 반영</strong> — 검색 유입을 끌어오는 체계적 소제목과 키워드 밀도
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>원클릭 복사 & 보도자료 기사</strong> — 블로그 붙여넣기 및 언론사 기사 초안 동시 생성
                    </span>
                  </div>
                </div>
              </div>

              {/* 시각화 카드: 네이버 블로그 에디터 화면 */}
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
                  alt="공실뉴스 AI 네이버 블로그 자동 포스팅 및 스마트에디터 실시간 작성 화면"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                />
              </div>
            </div>

            {/* ── POINT 02: SNS 자동 포스팅 (인스타, 쓰레드, 페북) ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: 40,
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #fce7f3",
                borderRadius: 20,
                padding: "44px 40px",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.03)",
              }}
            >
              {/* SNS 포스팅 프리뷰 박스 */}
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: 14,
                  padding: "24px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, borderBottom: "1px solid #ffe4e6", paddingBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "linear-gradient(135deg, #e1306c 0%, #c13584 100%)", color: "#ffffff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                      SNS 자동 포스팅
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>인스타 · 쓰레드 · 페북</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#e1306c", fontWeight: 700 }}>1분 자동 생성 완료</span>
                </div>

                <h5 style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                  🏢 [강남역 도보 3분] 통유리 채광 맛집! 인테리어 무상 승계 프리미엄 오피스 ✨
                </h5>

                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.65, margin: 0, background: "#ffffff", padding: "14px 16px", borderRadius: 8, border: "1px solid #fecdd3", whiteSpace: "pre-line" }}>
                  📍 강남구 테헤란로 핵심 업무권역 전용 148㎡(45평){"\n"}
                  💡 통유리 외관 + 회의실 3실 완비로 초기 인테리어 비용 0원!{"\n"}
                  🚀 빠른 입주 협의 가능 & 즉시 업무 스타트!{"\n\n"}
                  👉 프로필 링크에서 상세 사진 확인 & DM/전화 문의 환영!{"\n\n"}
                  <span style={{ color: "#2563eb", fontWeight: 600 }}>
                    #강남사무실 #강남역오피스 #인테리어완비 #사무실임대 #공실뉴스 #부동산마케팅
                  </span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "linear-gradient(135deg, #e1306c 0%, #c13584 100%)",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  기능 02 · SNS 자동 포스팅
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
                  클릭 한 번으로 내 매물이<br />
                  <span style={{ color: "#e1306c" }}>인스타 · 쓰레드 · 페북 포스팅으로 완성!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  인스타그램 캡션, 쓰레드 피드, 페이스북 카드뉴스용 소개글까지 클릭 한 번으로 최적화 작성됩니다.
                  매물의 핵심 장점 요약부터 감성적인 톤앤매너, 타깃 맞춤 해시태그까지 전자동으로 완성되어
                  복사해서 바로 SNS에 업로드할 수 있습니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#e1306c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>인스타 · 쓰레드 · 페북 최적화 톤</strong> — 각 SNS 감성에 맞는 감각적인 문구와 이모지 자동 구성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#e1306c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>인기 해시태그 자동 추출</strong> — 지역명, 역세권, 매물 용도 등 검색 유입이 높은 태그 자동 생성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#e1306c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>1분 초고속 멀티 채널 업로드</strong> — 카피라이팅 고민 없이 바로 복사해서 피드에 등록 완료
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── POINT 03: 건물외관 & 실내 AI 인테리어 예측기 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 40,
                alignItems: "center",
                background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
                border: "1px solid #c7d2fe",
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
                    background: "#4f46e5",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  기능 03 · AI 인테리어 예측기
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
                  건물 외관 & 아파트 실내<br />
                  <span style={{ color: "#4f46e5" }}>AI 인테리어 예측기 제공!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  건물 외관 인테리어와 아파트 실내 인테리어 예측기를 제공합니다.
                  Before & After 인테리어 예측도를 통해 중개에 적극 활용하여 고객과 신뢰도 높은 상담을 진행할 수 있으며,
                  유튜브 쇼츠나 인스타그램 숏폼 영상을 만들기에도 최적입니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#4f46e5", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>Before & After 인테리어 예측도</strong> — 건물 외관 및 실내의 리모델링 후 모습을 실사급으로 시각화
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#4f46e5", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>중개 상담 & 브리핑 파워 UP</strong> — &ldquo;리모델링 후 이렇게 바뀝니다&rdquo; 고객의 계약 의사결정 촉진
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#4f46e5", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>쇼츠 · 릴스 숏폼 제작에 최적</strong> — 전후 극적 대비로 SNS에서 높은 조회수와 매물 문의 확보
                    </span>
                  </div>
                </div>
              </div>

              {/* Before & After 시각화 카드 */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #c7d2fe",
                  boxShadow: "0 10px 25px rgba(79, 70, 229, 0.08)",
                  padding: "24px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, borderBottom: "1px solid #e0e7ff", paddingBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "#4f46e5", color: "#ffffff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                      AI 리모델링 시뮬레이션
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>외관 · 실내 예측기</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700 }}>Before & After</span>
                </div>

                {/* Before / After 비교 박스 2단 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "14px 12px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    <div style={{ display: "inline-block", background: "#64748b", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, marginBottom: 8 }}>
                      BEFORE
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>노후 외관 / 기존 실내</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.4 }}>
                      오래된 타일 외벽 및 답답한 기본 인테리어
                    </div>
                  </div>

                  <div style={{ background: "#eef2ff", borderRadius: 10, padding: "14px 12px", border: "1px solid #a5b4fc", textAlign: "center" }}>
                    <div style={{ display: "inline-block", background: "#4f46e5", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, marginBottom: 8 }}>
                      AFTER ✨
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1e1b4b", marginBottom: 4 }}>AI 모던 리모델링 예측</div>
                    <div style={{ fontSize: 11.5, color: "#4338ca", lineHeight: 1.4 }}>
                      트렌디한 통유리 파사드 & 호텔식 인테리어
                    </div>
                  </div>
                </div>

                <div style={{ background: "#faf5ff", border: "1px dashed #d8b4fe", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#7e22ce" }}>
                    🎬 쇼츠 · 릴스 숏폼 영상 제작 및 고객 계약 브리핑에 즉시 활용!
                  </span>
                </div>
              </div>
            </div>

            {/* ── POINT 04: 내 챗GPT · 제미나이 계정 사용 & 지속적인 프로그램 업데이트 ── */}
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
              {/* 내 AI 계정 연동 & 업데이트 안내 카드 UI */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
                  border: "1px solid #93c5fd",
                  borderRadius: 16,
                  padding: "26px 22px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid #dbeafe", paddingBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "#2563eb", color: "#ffffff", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 4 }}>
                      AI 계정 연동
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#1e3a8a" }}>
                      내 챗GPT · 제미나이 활용
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#059669", fontWeight: 800 }}>추가 API 요금 0원</span>
                </div>

                {/* 챗GPT & 제미나이 2단 뱃지 박스 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #a7f3d0", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#047857", marginBottom: 2 }}>
                      ChatGPT
                    </div>
                    <div style={{ fontSize: 11.5, color: "#4b5563" }}>
                      내가 가입한 챗GPT 사용
                    </div>
                  </div>
                  <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: 10, border: "1px solid #bfdbfe", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#1d4ed8", marginBottom: 2 }}>
                      Gemini
                    </div>
                    <div style={{ fontSize: 11.5, color: "#4b5563" }}>
                      내가 가입한 제미나이 사용
                    </div>
                  </div>
                </div>

                <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#1e3a8a", marginBottom: 4 }}>
                    <span>🔄</span>
                    <span>프로그램 지속 업데이트</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.55 }}>
                    공실뉴스 자동화 프로그램은 대표님들의 현장 피드백을 반영하여 더 편리하고 강력한 기능으로 지속적으로 업데이트될 예정입니다.
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
                    color: "#1c1917",
                    lineHeight: 1.35,
                    letterSpacing: "-0.5px",
                    margin: "0 0 16px 0",
                  }}
                >
                  별도의 API 요금 부담 없이<br />
                  <span style={{ color: "#2563eb" }}>내가 가입한 챗GPT · 제미나이 바로 사용!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  별도의 프로그램 이용료나 추가 API 요금이 들지 않습니다.
                  대표님께서 이미 가입하여 사용 중이신 챗GPT나 제미나이를 그대로 활용하여
                  비용 부담 없이 마음껏 콘텐츠를 생성하실 수 있습니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#2563eb", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>별도의 추가 API 요금 없음</strong> — 매월 나가는 프로그램 결제나 건당 요금 부담 제로
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#2563eb", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>내가 가입한 챗GPT · 제미나이 활용</strong> — 기존에 쓰시던 AI 계정을 그대로 연결해 즉시 생성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#2563eb", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>프로그램 지속 업데이트 예정</strong> — 대표님들의 업무 편의를 위한 새로운 기능 지속 업그레이드
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━ 4. INTERACTIVE 5-STEP WORKFLOW SUMMARY (중개사 실무 5단계 사이클) ━━━ */}
      <section style={{ backgroundColor: "#1c1917", color: "#ffffff", padding: "70px 0 80px" }}>
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

