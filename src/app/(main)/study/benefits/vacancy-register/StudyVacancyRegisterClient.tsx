"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";
import { StudyBenefitsHeroTabs } from "@/components/study/StudyBenefitsSubNav";

/**
 * 멤버십혜택 - 공실20건, 기사4건
 *
 * 5대 핵심 가치:
 * 1. 11만 부동산 누구나 열람하는 공실뉴스에 공실 등록 -> 실무 바로 활용
 * 2. 내가 작성한 블로그/유튜브 영상으로 기사 4편 매월 작성 -> 실전 연습 & 포털 송고 브랜딩
 * 3. 등록한 공실이 매물보고서 바로 작성 -> 보고서 출력 및 카톡/문자로 손님에게 즉시 전달
 * 4. 부동산 유리창 전단지 홍보물로 바로 만들어짐 (쇼윈도 워크인 마케팅)
 * 5. 등록한 공실과 기사가 실시간으로 내 물건접수 웹페이지에 자동 연동 -> 유튜브/블로그 링크 홍보 & 카톡 홈페이지 활용
 */

const POINT = "#059669";
const POINT_DARK = "#047857";
const POINT_SOFT = "#ecfdf5";
const POINT_BORDER = "#a7f3d0";

export default function StudyVacancyRegisterClient() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflows = [
    {
      step: "01",
      title: "콘텐츠 제작",
      desc: "스터디에서 배운 대로 블로그 글을 쓰거나 유튜브 영상을 업로드합니다.",
      tag: "블로그 · 유튜브",
    },
    {
      step: "02",
      title: "공실등록 & 기사발행",
      desc: "11만 부동산 공실뉴스에 공실 20건을 등록하고, 내 콘텐츠로 기사 4편을 발행합니다.",
      tag: "월 20건 · 월 4편",
    },
    {
      step: "03",
      title: "보고서 & 전단지 출력",
      desc: "등록 즉시 생성된 AI 매물보고서와 쇼윈도 유리창 전단지를 1초 만에 인쇄합니다.",
      tag: "보고서 출력 · 전단지",
    },
    {
      step: "04",
      title: "내 웹페이지 자동 연동",
      desc: "등록한 공실과 기사가 나만의 단독 물건접수 웹페이지에 실시간 자동 진열됩니다.",
      tag: "100% 자동 동기화",
    },
    {
      step: "05",
      title: "카톡 전달 & 매물접수",
      desc: "손님에게 카톡 문자로 홈페이지 링크를 보내고, 유튜브·블로그로 매물을 접수받습니다.",
      tag: "계약 체결 & 고객 유입",
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
              src="/images/study/benefit_vacancy_hero_panoramic.jpg"
              alt="공실20건 기사4건 멤버십 혜택"
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
                <span>MEMBERSHIP BENEFIT</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>11만 부동산 무료 열람 공동중개</span>
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
                공실등록 20건!<br />
                <span style={{ color: "#34d399" }}>
                  AI매매보고서, 유리창홍보지, 웹페이지 무료
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
                공실만 등록하면, AI 매물보고서, 유리창 홍보지, 나만의 접수 웹페이지까지 원클릭으로 자동 완성됩니다.
              </p>

            </div>

            {/* 멤버십혜택 3개 탭 (카드 왼쪽 아래 고정 위치) */}
            <StudyBenefitsHeroTabs active="vacancy-register" />
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
                부동산 네트워크 마케팅
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                공실 20건 광고 등록
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                전국 11만 부동산 무료 열람 공실
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                부동산 뉴스 기사
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                매월 4편 발행
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                꾸준히 내기사 축적
              </div>
            </div>

            <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                1초 자동 초안 완성
              </div>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.6px", whiteSpace: "nowrap" }}>
                매물보고서 & 유리창홍보지
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                수십가지 디자인을 내맘대로 선택
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                단독 접수 홈페이지
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0f2e28", letterSpacing: "-0.5px" }}>
                100% 무료 연동
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                공실·기사 자동 동기화 & 링크 홍보
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 3. DETAILED 5 BENEFITS SECTION (상세 5대 실무 혜택) ━━━ */}
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
              5 IN 1 REALTY WORKFLOW
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
              공실 등록에서 계약까지,<br />
              손 하나 까딱 않고 실무에 바로 쓰이는 5가지 무기
            </h2>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              교육만 듣고 끝나는 일반 강의와 다릅니다. 배우면서 바로 내 공실을 올리고,
              기사를 발행하며, 매물보고서와 전단지, 나만의 홈페이지까지 즉시 운영합니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>

            {/* ── BENEFIT 01: 공실 20건 등록 ── */}
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
                  혜택 01 · 실무 직결 공실망
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
                  11만 부동산 누구나 열람하는 공실뉴스에 공실 등록,<br />
                  <span style={{ color: POINT }}>실무에 바로 활용된다!</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  전국 11만 공인중개사와 부동산 관계자, 투자자가 매일 접속하는 &lsquo;공실뉴스&rsquo; 플랫폼에
                  매달 20건의 공실 매물을 무료로 등록할 수 있습니다. 지도 기반 위치 노출과 상권 분석이 결합되어
                  공동중개 매칭과 임차인 유치가 획기적으로 빨라집니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>전국 11만 부동산 포털 실시간 노출</strong> — 지도 검색 및 카테고리별 다이렉트 매칭
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>임대인(건물주) 안심 브리핑</strong> — &ldquo;국내 최대 공실뉴스에 정식 등록해드립니다&rdquo;
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>전속 매물 유치 경쟁력</strong> — 타 부동산보다 월등한 미디어 파워로 전속 계약 성사
                    </span>
                  </div>
                </div>
              </div>

              {/* 시각화 카드: 공동중개 계약 체결 및 계약완료 */}
              <div
                style={{
                  position: "relative",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.06)",
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

            {/* ── BENEFIT 02: 기사 4편 작성 ── */}
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
              {/* 이미지 샘플 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
                  minHeight: 280,
                  backgroundColor: "#f1f5f9",
                }}
              >
                <Image
                  src="/images/study/naver-blog-editor-sample.png"
                  alt="블로그 및 유튜브 기반 기사 4편 작성"
                  fill
                  style={{ objectFit: "cover", objectPosition: "top center" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(15, 23, 42, 0.85)",
                    padding: "10px 16px",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>내 블로그/유튜브 ➔ 정식 보도 기사 변환</span>
                  <span style={{ color: "#34d399" }}>매월 4편 포털 송고</span>
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
                  혜택 02 · 언론 브랜딩 & 포털 송고
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
                  내가 작성한 블로그, 유튜브 영상으로 기사 4편을 매월 작성!<br />
                  <span style={{ color: "#0284c7" }}>연습이 바로 실전 브랜딩이 된다</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  강의를 들으며 배운 지식으로 블로그 글을 쓰거나 유튜브 영상을 올리셨나요?
                  해당 콘텐츠를 바탕으로 공실뉴스 정식 보도 기사 4편을 매달 손쉽게 작성할 수 있습니다.
                  포털 뉴스에 내 이름과 중개사무소가 기사로 보도되어 압도적인 신뢰도가 쌓입니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>블로그·유튜브 링크로 손쉬운 기사화</strong> — 복잡한 작성 없이 내 콘텐츠로 즉시 기사 구성
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>네이버/포털 뉴스 송고</strong> — 언론사 바이라인으로 전문가 권위 획득
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0284c7", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>실전 연습의 힘</strong> — 매달 4건씩 쓰다 보면 글쓰기와 마케팅 실력이 저절로 성장
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BENEFIT 03: 등록한 공실이 매물보고서 바로 작성 ── */}
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
                  혜택 03 · AI 프리미엄 브리핑
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
                  등록한 공실이 매물보고서 바로 작성!<br />
                  <span style={{ color: "#0f766e" }}>보고서 출력 및 카톡·문자로 손님에게 바로 전달</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  공실 정보를 등록하면 대기업 부동산 컨설팅 수준의 &lsquo;AI 매물보고서&rsquo;가 단 1초 만에 자동 완성됩니다.
                  사무실 방문 손님에게는 깔끔하게 A4 컬러 출력물로 건네고,
                  이동 중인 고객에게는 카카오톡이나 문자 메시지로 모바일 최적화 링크를 즉시 발송하세요.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>원클릭 고화질 보고서 출력</strong> — 대면 상담 시 고객 신뢰를 사로잡는 프리미엄 브리핑
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>카카오톡 / 문자 메시지 즉시 전송</strong> — 스마트폰 터치 한 번으로 깔끔한 모바일 보고서 열람
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#0f766e", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>스펙·임대료·도면 완벽 정리</strong> — 귀찮은 편집 작업 0초, 공실 데이터로 전자동 생성
                    </span>
                  </div>
                </div>
              </div>

              {/* 매물보고서 샘플 이미지 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                  minHeight: 320,
                  backgroundColor: "#ffffff",
                }}
              >
                <Image
                  src="/images/study/property-report-sample.png"
                  alt="등록 공실 AI 매물보고서 샘플"
                  fill
                  style={{ objectFit: "contain", objectPosition: "center", padding: 8 }}
                />
              </div>
            </div>

            {/* ── BENEFIT 04: 부동산 유리창 전단지 홍보물 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: 40,
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #fed7aa",
                borderRadius: 20,
                padding: "44px 40px",
                boxShadow: "0 6px 20px rgba(251, 146, 60, 0.06)",
              }}
            >
              {/* 유리창 전단지 실사 이미지 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #fdba74",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                  minHeight: 320,
                  backgroundColor: "#fff7ed",
                }}
              >
                <Image
                  src="/images/study/benefit_window_flyer.jpg"
                  alt="부동산 유리창 쇼윈도 전단지 홍보물 실사"
                  fill
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(30, 41, 59, 0.9)",
                    padding: "10px 16px",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>쇼윈도 부착용 맞춤 포스터</span>
                  <span style={{ color: "#fb923c" }}>QR코드 자동 내장</span>
                </div>
              </div>

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
                  혜택 04 · 쇼윈도 워크인 마케팅
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
                  부동산 유리창 전단지 홍보물로 바로 만들어짐!<br />
                  <span style={{ color: "#ea580c" }}>디자인 걱정 없이 원클릭 인쇄</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  포토샵이나 디자인 프로그램 필요 없이, 등록한 공실 매물 데이터로
                  부동산 쇼윈도(유리창)에 딱 맞는 홍보 전단지가 원클릭으로 생성됩니다.
                  매물 사진, 가격(보증금/월세), 핵심 입지와 함께 상세 페이지로 즉시 연결되는 QR코드까지
                  완벽하게 배치되어 지나가는 손님의 발길을 멈추게 합니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#ea580c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>쇼윈도 가독성 극대화</strong> — 멀리서도 한눈에 들어오는 타이포그래피 & 핵심 스펙 요약
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#ea580c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>스마트 QR코드 자동 탑재</strong> — 스마트폰 카메라를 대면 내 모바일 매물 페이지로 즉시 연결
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#ea580c", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>사무실 프린터로 즉시 출력</strong> — 비싼 인쇄소 외주 비용 0원, A4 원클릭 인쇄
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BENEFIT 05: 등록한 공실과 기사가 실시간으로 내 물건접수 웹페이지 연동 ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: 40,
                alignItems: "center",
                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)",
                border: "1px solid #bbf7d0",
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
                  혜택 05 · 나만의 공식 웹사이트
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
                  등록한 공실과 기사가 실시간으로 내 물건접수 웹페이지에 연동!<br />
                  <span style={{ color: POINT }}>유튜브·블로그 링크 홍보 & 카톡 홈페이지 활용</span>
                </h3>
                <p style={{ fontSize: "15.5px", color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>
                  멤버십 회원에게는 나만의 독립된 &lsquo;물건접수 웹페이지(공인중개사 홈페이지)&rsquo;가 무료로 제공됩니다.
                  등록한 20건의 공실과 작성한 4편의 기사가 내 홈페이지에 실시간으로 자동 동기화되어 채워집니다.
                  유튜브 영상 더보기란이나 블로그 프로필에 링크만 걸어두면 매물 접수와 문의가 저절로 쏟아지며,
                  손님에게도 명함 대신 &ldquo;저희 공식 홈페이지입니다&rdquo; 하고 카톡/문자로 공유할 수 있습니다.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>수백만 원대 홈페이지 제작비 0원</strong> — 공실 등록과 기사 작성이 실시간으로 자동 연동
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>유튜브·블로그 자동 접수창구</strong> — 링크만 달아두면 임대인이 알아서 매물을 접수
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: "#059669", fontSize: 18, lineHeight: 1 }}>✔</span>
                    <span style={{ fontSize: 14.5, color: "#1e293b", fontWeight: 600 }}>
                      <strong>손님에게 카톡 문자로 전송</strong> — 종이 명함을 넘어 내 전문성을 입증하는 모바일 홈페이지
                    </span>
                  </div>
                </div>
              </div>

              {/* 물건접수 웹페이지 샘플 */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #86efac",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                  minHeight: 320,
                  backgroundColor: "#ffffff",
                }}
              >
                <Image
                  src="/images/study/partner-webpage-sample.png"
                  alt="나만의 물건접수 웹페이지 샘플"
                  fill
                  style={{ objectFit: "contain", objectPosition: "center", padding: 8 }}
                />
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
              COMPLETE AUTOMATION CYCLE
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
              어떻게 내 실무 매출로 연결되나요?
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
              학습에서 끝나는 교육이 아니라, 매월 20건의 공실과 4편의 기사가 내 전용 홈페이지와 보고서로
              즉시 전환되는 5단계 성공 사이클입니다.
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
              1년 연간 특강 VOD 무제한 + 5대 실무 무기 풀패키지
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
              공실등록 20건 · 기사작성 4편 · AI 매물보고서<br />
              전단지 · 나만의 웹페이지까지 월 3만원대로 시작하세요
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
              공실스터디 멤버십 하나로 1년 365일 모든 VOD 특강 시청과 실무 마케팅 도구를
              제한 없이 누리실 수 있습니다.
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
