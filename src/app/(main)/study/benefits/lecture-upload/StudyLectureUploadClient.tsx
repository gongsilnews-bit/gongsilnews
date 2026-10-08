"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";
import { StudyBenefitsHeroTabs } from "@/components/study/StudyBenefitsSubNav";

/**
 * 멤버십혜택 04 - 강의영상업로딩
 *
 * 핵심 가치:
 * 1. 내 지역정보, 단지 정보를 '유튜브 강의'와 '공실스터디 인강'으로 자산화
 * 2. 부동산 대표님도 강사가 될 수 있는 플랫폼 시스템 제공
 * 3. 스마트폰/촬영 장비로 제작한 강의 영상을 플랫폼에 무료 업로드 및 채널 개설 지원
 * 4. 전국 11만 부동산 네트워크와 고객에게 실시간 노출되어 지역 1등 전문가 브랜딩
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

      {/* ━━━ 1. HERO 섹션 ━━━ */}
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
            {/* 배경 이미지 — 첨부해주신 전문 남성 중개사 삼각대 촬영 실사 배너 */}
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

      {/* ━━━ 3. 문제의식: 왜 부동산에서 '임장료' 이야기가 나올까? ━━━ */}
      <section style={{ padding: "60px 0 70px", backgroundColor: "#fbfcfb", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 20,
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 14,
              }}
            >
              REALITY &amp; SOLUTION
            </span>
            <h2
              style={{
                fontSize: "34px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.35,
                letterSpacing: "-1.2px",
                margin: "0 0 16px 0",
              }}
            >
              왜 부동산에서 <span style={{ color: POINT }}>'임장료'</span> 이야기가 나올까?
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "#64748b",
                lineHeight: 1.7,
                maxWidth: 680,
                margin: "0 auto",
                wordBreak: "keep-all",
              }}
            >
              손님에게 수없이 발품 팔아 쌓은 단지 분석, 학군, 개발 호재 정보를 열심히 브리핑하지만,
              계약으로 이어지지 않으면 모든 시간과 땀이 허공으로 날아갑니다.
              하지만 현실적으로 손님에게 '임장료'를 요구하기는 쉽지 않습니다.
            </p>
          </div>

          {/* 중개사 VS 고객의 딜레마 카드 */}
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
                  중개사의 고민
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>
                  수많은 시간과 발품의 허탈함
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", fontSize: 14.5, lineHeight: 1.8 }}>
                <li>동네 단지별 장단점, 시세, 학군 분석에 수년의 시간 소요</li>
                <li>무료로 1~2시간 브리핑만 받고 다른 부동산에서 계약하는 고객</li>
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
              <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", fontSize: 14.5, lineHeight: 1.8 }}>
                <li>아직 어떤 매물을 살지 결정하지 못한 탐색 단계</li>
                <li>단순 문의나 현장 동행에 비용을 지불하는 문화의 부재</li>
                <li>전문성 있는 정보를 원하지만 별도 지출에는 저항감 발생</li>
              </ul>
            </div>
          </div>

          {/* 해결책 배너 */}
          <div
            style={{
              background: `linear-gradient(135deg, ${POINT} 0%, #047857 100%)`,
              borderRadius: 16,
              padding: "32px 36px",
              color: "#ffffff",
              textAlign: "center",
              boxShadow: "0 12px 28px rgba(5, 150, 105, 0.25)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: "#a7f3d0", marginBottom: 6 }}>
              THE ONLY SOLUTION
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 8 }}>
              해결책은 '정보의 자산화'입니다!
            </div>
            <div style={{ fontSize: 15.5, color: "#ecfdf5", maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>
              대표님의 머릿속에만 있던 지역 정보와 단지 브리핑 노하우를
              <strong>'온라인 강의 영상'</strong>으로 만들어 공실스터디에 등록하세요.
              지식이 자산이 되고, 전국 고객이 대표님을 찾아옵니다.
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 4. 4단계 로드맵 프로세스 (탭 전환 인터랙션) ━━━ */}
      <section style={{ padding: "80px 0", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 20,
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 14,
              }}
            >
              STEP BY STEP
            </span>
            <h2
              style={{
                fontSize: "34px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.35,
                letterSpacing: "-1.2px",
                margin: "0 0 16px 0",
              }}
            >
              어떻게 강의를 개설하고 업로드하나요?
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>
              촬영 경험이 전혀 없는 초보 대표님도 순서대로 따라 하시면 쉽게 강사로 데뷔하실 수 있습니다.
            </p>
          </div>

          {/* 4단계 카드 그리드 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginBottom: 36,
            }}
          >
            {steps.map((st, idx) => {
              const isSel = activeStep === idx;
              return (
                <div
                  key={st.step}
                  onClick={() => setActiveStep(idx)}
                  style={{
                    padding: "24px 20px",
                    borderRadius: 14,
                    background: isSel ? POINT_SOFT : "#f8fafc",
                    border: isSel ? `2px solid ${POINT}` : "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    transform: isSel ? "translateY(-3px)" : "none",
                    boxShadow: isSel ? "0 8px 20px rgba(5,150,105,0.15)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: isSel ? POINT : "#94a3b8" }}>
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
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
                    {st.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                    {st.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ 5. 상세 랜딩페이지 비주얼 섹션 (첨부된 이미지 2 활용) ━━━ */}
      <section style={{ padding: "60px 0 80px", backgroundColor: "#fbfcfb", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 20,
                background: POINT_SOFT,
                color: POINT_DARK,
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              OFFICIAL GUIDE
            </span>
            <h2
              style={{
                fontSize: "30px",
                fontWeight: 900,
                color: "#111827",
                letterSpacing: "-1px",
                margin: "0 0 12px 0",
              }}
            >
              공실스터디 강사 개설 &amp; 영상 업로드 안내서
            </h2>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
              배우고, 만들고, 직접 개설하는 대한민국 1위 부동산 중개 에듀테크 플랫폼
            </p>
          </div>

          {/* 세로 상세 가이드 뷰어 (모바일/태블릿 최적화 목업 스타일) */}
          <div
            style={{
              maxWidth: 480,
              margin: "0 auto",
              position: "relative",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid #dce9e5",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.08)",
              background: "#ffffff",
            }}
          >
            <div style={{ position: "relative", width: "100%", aspectRatio: "153 / 1024" }}>
              <Image
                src="/images/study/benefit-lecture-upload-detail.png"
                alt="공실스터디 강의영상업로딩 상세 안내 페이지"
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                style={{ objectFit: "contain", objectPosition: "top center" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 6. 하단 최종 CTA 블랙 배너 ━━━ */}
      <section
        style={{
          padding: "70px 24px",
          background: "linear-gradient(135deg, #0f2926 0%, #061f1c 100%)",
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
              background: "rgba(5, 150, 105, 0.2)",
              border: "1px solid rgba(5, 150, 105, 0.4)",
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
              fontSize: "36px",
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
              fontSize: "16px",
              color: "#94a3b8",
              lineHeight: 1.7,
              margin: "0 0 36px 0",
              wordBreak: "keep-all",
            }}
          >
            지금 공실스터디 멤버십을 신청하시고,
            공동중개 20건부터 블로그 포스팅 전자동화, AI 유튜브 제작 강의,
            그리고 내 강의를 직접 등록하는 <strong>'강의 영상 플랫폼 업로드'</strong> 혜택까지 모두 누려보세요.
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
              공실스터디 멤버십 신청하기 &gt;&gt;
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
