"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";
import { StudyBenefitsHeroTabs } from "@/components/study/StudyBenefitsSubNav";

/**
 * 멤버십혜택 04 - 강의영상업로딩
 *
 * 상세 스토리보드:
 * 1. HERO 배너: 내 지역정보, 단지 정보 이제 유튜브 강의로!
 * 2. STATS BAR: 핵심 4대 지표
 * 3. REALITY: 왜 부동산에서 '임장료' 이야기가 나올까? (임장료 딜레마)
 * 4. PROBLEM: 하지만 임장료는 현실적으로 쉽지 않습니다 (중개사 VS 고객 비교)
 * 5. SOLUTION: 해결책은 지역정보를 콘텐츠로 만드는 것 (5대 콘텐츠 유형)
 * 6. STEP 01: 공실뉴스에서 새로운 시작을 제안합니다 (공실 20건 & 네트워크)
 * 7. STEP 02: 공실스터디는 부동산대표님이 배우고, 만들고, 개설하는 인강 플랫폼 (스튜디오 & 5대 프로세스)
 * 8. STEP 03: 부동산 대표님도 강사가 될 수 있습니다! (4분할 현장 촬영 사례)
 * 9. BLACK CTA & SUMMARY: 지역정보를 영상으로, 강의로, 기회로 바꾸세요
 */

const POINT = "#059669";
const POINT_DARK = "#047857";
const POINT_SOFT = "#ecfdf5";
const POINT_BORDER = "#a7f3d0";

export default function StudyLectureUploadClient() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: "01",
      title: "지역·단지 정보 기획",
      desc: "내가 제일 잘 아는 우리 동네 학군, 교통, 재개발, 아파트 단지 분석 노하우를 주제로 선정합니다.",
      tag: "주제 선정 & 기획",
    },
    {
      step: "02",
      title: "스마트폰 영상 촬영",
      desc: "비싼 장비 없이 스마트폰과 핀마이크 하나로 현장 임장 또는 브리핑 영상을 쉽게 촬영합니다.",
      tag: "스마트폰 촬영",
    },
    {
      step: "03",
      title: "플랫폼 영상 업로딩",
      desc: "촬영된 영상을 공실스터디 플랫폼에 업로드하면, 대표님 전용 인강 강좌로 즉시 등록·개설됩니다.",
      tag: "인강 채널 개설",
    },
    {
      step: "04",
      title: "전국 11만 네트워크 노출",
      desc: "공실뉴스와 공실스터디를 방문하는 수많은 공인중개사와 고객에게 지역 1등 강사로 독점 브랜딩됩니다.",
      tag: "수익 & 브랜딩 창출",
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
      <StudyHeader />

      {/* ━━━ 1. HERO 섹션 (실사 배너 + 탭 네비게이션) ━━━ */}
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
              height: 400,
            }}
          >
            {/* 배경 이미지 — 전문 남성 중개사 삼각대 촬영 실사 배너 */}
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "62%" }}>
              <Image
                src="/images/study/benefit-lecture-upload-hero.png"
                alt="사무실에서 스마트폰과 삼각대로 강의 영상을 촬영 중인 전문 공인중개사 대표"
                fill
                priority
                sizes="(max-width: 1160px) 62vw, 700px"
                style={{ objectFit: "cover", objectPosition: "center 25%" }}
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
                  "linear-gradient(to right, rgba(244, 250, 247, 1) 0%, rgba(244, 250, 247, 0.98) 46%, rgba(244, 250, 247, 0.7) 64%, rgba(244, 250, 247, 0) 84%)",
              }}
            />

            {/* 왼쪽 글자 영역 격자무늬 */}
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
                flex: "1 1 520px",
                maxWidth: 760,
                minWidth: 300,
                padding: "36px 48px 96px",
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
                  marginBottom: 16,
                  letterSpacing: "0.2px",
                }}
              >
                <span>공실뉴스 × 공실스터디</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>MEMBERSHIP BENEFIT 04</span>
              </div>

              {/* 메인 헤드라인 */}
              <h1
                style={{
                  fontSize: "35px",
                  fontWeight: 900,
                  lineHeight: 1.25,
                  letterSpacing: "-1.4px",
                  margin: "0 0 12px 0",
                  color: "#111827",
                }}
              >
                내 지역정보, 단지 정보<br />
                <span style={{ color: POINT }}>
                  이제 유튜브 강의로!
                </span>
              </h1>

              {/* 서브 카피 */}
              <p
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#374151",
                  margin: "0 0 16px 0",
                  letterSpacing: "-0.5px",
                }}
              >
                부동산 대표님도 강사가 될 수 있습니다
              </p>

              {/* 태그 칩 3개 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "#ffffff",
                    border: `1px solid ${POINT_BORDER}`,
                    color: POINT_DARK,
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  공동중개 20건
                </span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "#ffffff",
                    border: `1px solid ${POINT_BORDER}`,
                    color: POINT_DARK,
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  유튜브 영상 제작 무료
                </span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: POINT_SOFT,
                    border: `1px solid ${POINT}`,
                    color: POINT_DARK,
                    fontSize: 13,
                    fontWeight: 800,
                    boxShadow: "0 2px 6px rgba(5,150,105,0.1)",
                  }}
                >
                  강의 영상 플랫폼 업로드
                </span>
              </div>
            </div>

            {/* 멤버십혜택 4개 탭 (카드 왼쪽 아래 고정 위치) */}
            <StudyBenefitsHeroTabs active="lecture-upload" />
          </div>
        </div>
      </section>

      {/* ━━━ 2. 핵심 지표 바 (Stats Bar) ━━━ */}
      <section style={{ padding: "16px 0 36px", backgroundColor: "#ffffff" }}>
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
              <div style={{ fontSize: 13, fontWeight: 700, color: POINT, marginBottom: 4 }}>
                정보의 자산화
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>
                지역 노하우 인강화
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                휘발되던 브리핑을 영구 콘텐츠 자산으로
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: POINT, marginBottom: 4 }}>
                대표님 강사 데뷔
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>
                단독 인강 채널 개설
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                공실스터디 공식 강사 등록 및 플랫폼 지원
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: POINT, marginBottom: 4 }}>
                촬영·업로드 지원
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>
                스마트폰 하나로 OK
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                영상 제작 가이드 &amp; 플랫폼 무료 업로드
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: POINT, marginBottom: 4 }}>
                전국 11만 네트워크
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>
                지역 1등 브랜딩
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                전국 중개사와 잠재 고객에게 독점 노출
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 3. REALITY: 왜 부동산에서 '임장료' 이야기가 나올까? ━━━ */}
      <section style={{ padding: "64px 0 72px", backgroundColor: "#fbfcfb", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 40,
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: "40px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
            }}
          >
            {/* 좌측 텍스트 */}
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 6,
                  background: POINT_SOFT,
                  color: POINT_DARK,
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                REAL ESTATE ISSUE
              </div>
              <h2
                style={{
                  fontSize: "30px",
                  fontWeight: 900,
                  color: "#111827",
                  lineHeight: 1.35,
                  letterSpacing: "-1px",
                  margin: "0 0 16px 0",
                }}
              >
                왜 부동산에서<br />
                <span style={{ color: POINT }}>'임장료'</span> 이야기가 나올까?
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "#4b5563",
                  lineHeight: 1.75,
                  margin: "0 0 20px 0",
                  wordBreak: "keep-all",
                }}
              >
                손님과 몇 시간씩 걷고, 단지별 장단점, 시세, 학군, 로얄동 정보까지 꼼꼼하게 브리핑했지만...
                정작 계약은 다른 부동산에서? 부동산 대표님이라면 누구나 한 번쯤 겪어본 허탈한 현실입니다.
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: POINT,
                  fontSize: "14px",
                  fontWeight: 800,
                }}
              >
                <span>임장료 딜레마, 과연 해결책은 없을까요?</span>
              </div>
            </div>

            {/* 우측 임장료 고민 실사 비주얼 */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 11",
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
              }}
            >
              <Image
                src="/images/study/recommend_real_teheran_man.jpg"
                alt="고객 응대와 임장 브리핑으로 고민하는 공인중개사 대표"
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                style={{ objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "auto 0 0 0",
                  padding: "16px 20px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                  color: "#ffffff",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800 }}>발품과 정성, 더 이상 무료로 날리지 마세요</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>부동산 전문 지식의 정당한 가치를 인정받는 방법</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 4. PROBLEM: 하지만 임장료는 현실적으로 쉽지 않습니다 ━━━ */}
      <section style={{ padding: "64px 0", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 6,
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              PROBLEM
            </span>
            <h2
              style={{
                fontSize: "30px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.35,
                letterSpacing: "-1px",
                margin: "0 0 12px 0",
              }}
            >
              하지만 임장료는 <span style={{ color: "#dc2626" }}>현실적으로 쉽지 않습니다</span>
            </h2>
            <p style={{ fontSize: 15.5, color: "#64748b", margin: 0 }}>
              고객과의 심리적 마찰과 시장 관행 때문에 현장에서 대놓고 임장료를 청구하기는 어렵습니다.
            </p>
          </div>

          {/* 중개사 VS 고객 비교 카드 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
              marginBottom: 40,
            }}
          >
            {/* 중개사의 입장 */}
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #fee2e2",
                borderRadius: 16,
                padding: "32px 28px",
                boxShadow: "0 4px 16px rgba(239, 68, 68, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  중개사의 입장
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>
                  수많은 시간과 발품의 손실
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 14, lineHeight: 1.8 }}>
                <li>단지별 동호수 특징, 학군, 시세 분석에 수년의 시간 축적</li>
                <li>무료로 1~2시간 브리핑만 듣고 다른 부동산에서 계약하는 고객</li>
                <li>정당한 정보 가치를 인정받고 싶지만 마찰이 두려운 현실</li>
              </ul>
            </div>

            {/* 고객의 입장 */}
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: 16,
                padding: "32px 28px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  고객의 입장
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>
                  계약 전 상담료는 부담스러운 심리
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 14, lineHeight: 1.8 }}>
                <li>아직 매수 여부도 결정하지 못한 초기 탐색 단계</li>
                <li>단순 문의나 현장 동행에 비용을 지불하는 문화의 부재</li>
                <li>유료 상담 요구 시 다른 부동산으로 쉽게 이탈해 버림</li>
              </ul>
            </div>
          </div>

          {/* 중앙 강조 배너 */}
          <div
            style={{
              background: `linear-gradient(135deg, ${POINT} 0%, #047857 100%)`,
              borderRadius: 16,
              padding: "28px 32px",
              color: "#ffffff",
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(5, 150, 105, 0.25)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#a7f3d0", marginBottom: 6 }}>
              KEY SOLUTION
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 6 }}>
              해결책은 '정보의 자산화'입니다!
            </div>
            <div style={{ fontSize: 15, color: "#ecfdf5", maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>
              무료로 브리핑해주고 허탈해할 필요가 없습니다. 머릿속 지역 정보를 <strong>'온라인 강의 영상'</strong>으로 만들어 플랫폼에 등록하면 영구적인 콘텐츠 자산이 됩니다.
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 5. SOLUTION: 해결책은 지역정보를 콘텐츠로 만드는 것 ━━━ */}
      <section style={{ padding: "64px 0", backgroundColor: "#fbfcfb", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 6,
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              SOLUTION
            </span>
            <h2
              style={{
                fontSize: "30px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.35,
                letterSpacing: "-1px",
                margin: "0 0 10px 0",
              }}
            >
              해결책은 <span style={{ color: POINT }}>지역정보를 콘텐츠로 만드는 것</span>
            </h2>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
              내가 가장 잘 아는 우리 동네의 5대 핵심 주제를 강의 영상으로 패키징하세요.
            </p>
          </div>

          {/* 5대 콘텐츠 유형 그리드 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {[
              { num: "01", title: "동네 정보", desc: "상권, 교통, 재개발 호재 분석" },
              { num: "02", title: "단지 분석", desc: "동별 로얄동, 조망, 평면 특징" },
              { num: "03", title: "시세 동향", desc: "실거래가 추이, 급매물 분석" },
              { num: "04", title: "학군·환경", desc: "초품아, 학원가, 생활 인프라" },
              { num: "05", title: "매물 브리핑", desc: "전속 매물 영상 쇼케이스" },
            ].map((c) => (
              <div
                key={c.num}
                style={{
                  background: "#ffffff",
                  border: "1px solid #dce9e5",
                  borderRadius: 14,
                  padding: "20px 18px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900, color: POINT, marginBottom: 6 }}>
                  {c.num}
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#111827", marginBottom: 6 }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 6. STEP 01: 공실뉴스에서 새로운 시작을 제안합니다 ━━━ */}
      <section style={{ padding: "64px 0", backgroundColor: "#ffffff", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: POINT_SOFT,
                  color: POINT_DARK,
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                STEP 01
              </span>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#111827",
                  lineHeight: 1.35,
                  letterSpacing: "-1px",
                  margin: "0 0 16px 0",
                }}
              >
                <span style={{ color: POINT }}>공실뉴스</span>에서<br />
                새로운 시작을 제안합니다
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: POINT_SOFT, color: POINT_DARK, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>✓</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>공실 20건 무료 광고 등록</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>전국 11만 공인중개사가 매일 무료로 열람하는 플랫폼 노출</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: POINT_SOFT, color: POINT_DARK, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>✓</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>단독 물건접수 웹페이지 무료 제공</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>등록한 매물과 기사가 대표님 전용 홈페이지에 100% 자동 진열</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: POINT_SOFT, color: POINT_DARK, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>✓</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>AI 매매보고서 &amp; 유리창 전단지 1초 출력</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>브리핑용 보고서와 워크인 고객용 쇼윈도 홍보물 즉시 완성</div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 11",
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                background: "#f8fafc",
              }}
            >
              <Image
                src="/images/study/partner-webpage-sample.png"
                alt="공실뉴스 플랫폼 매물 연동 화면"
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                style={{ objectFit: "contain", padding: 12 }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 7. STEP 02: 공실스터디는 부동산대표님이 배우고, 만들고, 개설하는 인강 플랫폼 ━━━ */}
      <section style={{ padding: "64px 0", backgroundColor: "#fbfcfb", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 6,
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              STEP 02
            </span>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.35,
                letterSpacing: "-1px",
                margin: "0 0 10px 0",
              }}
            >
              <span style={{ color: POINT }}>공실스터디</span>는 부동산대표님이<br />
              배우고, 만들고, 개설하는 인강 플랫폼입니다
            </h2>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
              단순 수강생에 머물지 않고, 직접 강사가 되어 나만의 인강 채널을 오픈할 수 있습니다.
            </p>
          </div>

          {/* 중앙 스튜디오 촬영 실사 비주얼 */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "21 / 9",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid #dce9e5",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              marginBottom: 24,
            }}
          >
            <Image
              src="/images/study/study-real-corp-filming.webp"
              alt="사무실에서 강의 영상을 촬영하고 플랫폼에 업로드하는 중개사"
              fill
              sizes="(max-width: 1040px) 100vw, 1040px"
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* 5대 플랫폼 프로세스 칩 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { title: "강의 개설", desc: "대표님 단독 인강 채널" },
              { title: "영상 제작", desc: "스마트폰 하나로 쉽게" },
              { title: "플랫폼 등록", desc: "공실스터디 VOD 연동" },
              { title: "수강생 관리", desc: "전국 공인중개사 연결" },
              { title: "수익 창출", desc: "지역 전문가 독점 브랜딩" },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "16px 14px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 900, color: POINT, marginBottom: 4 }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 8. STEP 03: 부동산 대표님도 강사가 될 수 있습니다! (4분할 현장 사례) ━━━ */}
      <section style={{ padding: "64px 0", backgroundColor: "#ffffff", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 6,
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              STEP 03
            </span>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.35,
                letterSpacing: "-1px",
                margin: "0 0 10px 0",
              }}
            >
              부동산 대표님도 <span style={{ color: POINT }}>강사가 될 수 있습니다!</span>
            </h2>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
              고가의 장비나 스튜디오 없이도 누구나 손쉽게 촬영할 수 있는 4가지 실전 방식
            </p>
          </div>

          {/* 4분할 촬영 사례 그리드 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                title: "스마트폰 임장 라이브",
                desc: "단지 앞을 직접 걸으며 스마트폰으로 실시간 임장 영상 촬영",
                img: "/images/study/recommend_real_villa.jpg",
              },
              {
                title: "핀마이크 단지 브리핑",
                desc: "사무실 책상에서 단지 조감도와 지도를 보며 핵심 정보 강의",
                img: "/images/study/recommend_real_apartment.jpg",
              },
              {
                title: "쇼츠·릴스 1분 꿀팁",
                desc: "세무, 학군, 로얄동 선택법 등 핵심 정보만 1분 숏폼으로 제작",
                img: "/images/study/study-real-corp-sns.webp",
              },
              {
                title: "현장 임장 투어 영상",
                desc: "단지 내부 커뮤니티와 주변 상권을 소개하는 가이드 영상",
                img: "/images/study/recommend_real_teheran_man.jpg",
              },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  background: "#ffffff",
                  border: "1px solid #dce9e5",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3" }}>
                  <Image
                    src={c.img}
                    alt={c.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 250px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div style={{ padding: "16px 14px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
                    {c.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 9. 4단계 로드맵 인터랙션 카드 ━━━ */}
      <section style={{ padding: "64px 0", backgroundColor: "#fbfcfb", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 6,
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              PROCESS
            </span>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.35,
                letterSpacing: "-1px",
                margin: "0 0 10px 0",
              }}
            >
              강의 개설 &amp; 업로드 4단계 진행 과정
            </h2>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
              촬영 경험이 전혀 없으셔도 공실스터디가 전 과정을 밀착 지원합니다.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 14,
            }}
          >
            {steps.map((st, idx) => {
              const isSel = activeStep === idx;
              return (
                <div
                  key={st.step}
                  onClick={() => setActiveStep(idx)}
                  style={{
                    padding: "22px 18px",
                    borderRadius: 14,
                    background: isSel ? POINT_SOFT : "#ffffff",
                    border: isSel ? `2px solid ${POINT}` : "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    transform: isSel ? "translateY(-3px)" : "none",
                    boxShadow: isSel ? "0 8px 20px rgba(5,150,105,0.12)" : "0 2px 8px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: isSel ? POINT : "#94a3b8" }}>
                      {st.step}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: isSel ? POINT : "#e2e8f0",
                        color: isSel ? "#ffffff" : "#475569",
                      }}
                    >
                      {st.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                    {st.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>
                    {st.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ 10. 하단 블랙 최종 CTA 섹션 ━━━ */}
      <section
        style={{
          padding: "70px 24px",
          background: "linear-gradient(135deg, #0d2824 0%, #061917 100%)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: 20,
              background: "rgba(5, 150, 105, 0.25)",
              border: "1px solid rgba(5, 150, 105, 0.5)",
              color: "#6ee7b7",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 18,
            }}
          >
            START NOW
          </span>
          <h2
            style={{
              fontSize: "34px",
              fontWeight: 900,
              letterSpacing: "-1.2px",
              lineHeight: 1.3,
              margin: "0 0 16px 0",
            }}
          >
            지역정보를 영상으로,<br />
            <span style={{ color: "#34d399" }}>강의로, 기회로 바꾸세요!</span>
          </h2>
          <p
            style={{
              fontSize: "15.5px",
              color: "#a7f3d0",
              lineHeight: 1.7,
              margin: "0 0 36px 0",
              wordBreak: "keep-all",
            }}
          >
            지금 공실뉴스멤버십을 신청하시고,<br />
            <strong>영상제작부터, 강의개설까지 함께 하시죠!</strong>
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link
              href="/study/apply"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 36px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 900,
                color: "#ffffff",
                background: POINT,
                boxShadow: "0 8px 24px rgba(5, 150, 105, 0.4)",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              공실뉴스멤버십 신청하기 &gt;&gt;
            </Link>
            <Link
              href="/study/lectures"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 30px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 800,
                color: "#ffffff",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                textDecoration: "none",
              }}
            >
              개설된 강의 둘러보기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
