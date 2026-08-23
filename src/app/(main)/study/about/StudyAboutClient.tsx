"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FAQS = [
  {
    q: "컴퓨터나 AI를 잘 모르는 초보 공인중개사도 따라할 수 있나요?",
    a: "네, 100% 가능합니다. 복잡한 코딩이나 어려운 이론 없이, 클릭 몇 번으로 매물 쇼츠 영상을 만들고 ChatGPT로 매물 설명글을 뽑아내는 실습 위주로 진행됩니다. 컴퓨터를 잘 다루지 못하셔도 순서대로만 따라 하시면 됩니다.",
  },
  {
    q: "1년 연간 스터디는 언제부터 참여할 수 있나요?",
    a: "상시 가입하여 즉시 수강을 시작할 수 있습니다. 가입한 날로부터 1년(365일) 동안 모든 VOD 강의 무제한 시청 및 매달 새롭게 업데이트되는 신규 특강과 실무 서식을 모두 이용하실 수 있습니다.",
  },
  {
    q: "강의 자료와 계약서 양식, AI 프롬프트는 어떻게 다운받나요?",
    a: "각 강의실 본문 내 [강의자료 다운로드] 탭 및 공실뉴스 [자료실] 메뉴에서 한글(HWP), 엑셀, PDF 및 프롬프트 텍스트 파일 원본을 횟수 제한 없이 자유롭게 다운로드받으실 수 있습니다.",
  },
  {
    q: "스마트폰(모바일)에서도 강의를 들을 수 있나요?",
    a: "네, PC는 물론 스마트폰, 태블릿 등 모든 기기에서 최적화된 모바일 전용 뷰어로 언제 어디서나 끊김 없이 이어보기가 가능합니다.",
  },
  {
    q: "공실뉴스 회원에게 주어지는 추가 혜택이 있나요?",
    a: "공실뉴스 가입 회원은 기초 실무 특강 및 AI 맛보기 과정을 무료로 수강할 수 있으며, 공실 등록 및 전국 법원 경공매 정보 열람 혜택이 함께 제공됩니다.",
  },
];

export default function StudyAboutClient() {
  const router = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#132e27", minHeight: "100vh" }}>
      
      {/* ━━━ 1. HERO SECTION ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "72px 0 60px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          {/* Breadcrumb / Top Tag */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Link
              href="/study"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                color: "#d1fae5",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <span>‹</span>
              <span>특강 목록으로 돌아가기</span>
            </Link>
            
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "6px 14px", borderRadius: 24, fontSize: 13, fontWeight: 700, color: "#6ee7b7" }}>
              <span>🌿</span>
              <span>ABOUT 공실스터디</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 30 }}>
            <div style={{ maxWidth: 760 }}>
              <h1 style={{ fontSize: "40px", fontWeight: 900, lineHeight: 1.3, letterSpacing: "-1px", margin: "0 0 18px 0" }}>
                배우고, 바로 써먹고, 실전 계약까지!<br />
                <span style={{ color: "#34d399" }}>공실뉴스 AI 부동산 실전 스터디</span>란?
              </h1>
              <p style={{ fontSize: "17px", color: "#a7f3d0", opacity: 0.95, lineHeight: 1.7, margin: "0 0 28px 0", wordBreak: "keep-all" }}>
                공실스터디는 단순한 온라인 동영상 강의가 아닙니다. 1년 365일 동안 최신 AI 마케팅 도구, 공실 해결 임대 실무, 법원 경공매 권리분석을 실제 현장에 접목하여 <strong>지역 1등 공인중개사와 성공적인 임대인</strong>으로 성장하도록 돕는 실전 마스터마인드 커뮤니티입니다.
              </p>

              {/* 4대 안심 포인트 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", fontSize: "14px", color: "#d1fae5", fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  365일 무제한 수강 & 복습
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  매월 신규 실무 VOD 업데이트
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  계약서·특약·쇼츠 원본 100% 제공
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  전국 11만 중개사 스터디 크루
                </span>
              </div>
            </div>

            {/* Quick CTA Button */}
            <div>
              <Link
                href="/study"
                style={{
                  padding: "16px 32px",
                  background: "#059669",
                  color: "#ffffff",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 800,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 6px 20px rgba(5, 150, 105, 0.4)",
                  transition: "all 0.2s",
                }}
              >
                <span>특강 둘러보기</span>
                <span>→</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ 2. WHY 1-YEAR STUDY? (비교 & 필요성 섹션) ━━━ */}
      <section style={{ padding: "75px 0 70px", backgroundColor: "#f2f9f6", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              WHY 1-YEAR STUDY
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#062828", margin: "8px 0 12px 0", letterSpacing: "-0.5px" }}>
              혼자 보다가 작심삼일로 끝나는 온라인 강의는 이제 그만.
            </h2>
            <p style={{ fontSize: "16px", color: "#475569", margin: 0 }}>
              AI 기술과 부동산 정책은 매달 빠르게 변합니다. 1년 동안 곁에서 함께 뛰는 든든한 파트너가 필요합니다.
            </p>
          </div>

          {/* 2열 비교 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {/* 기존 단발성 강의 */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "32px 28px" }}>
              <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ❌ 기존 단발성 강의
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: "#334155", margin: "0 0 16px 0" }}>혼자 듣다가 흐지부지 포기</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15, color: "#64748b", lineHeight: 2.0 }}>
                <li>· 1회성 결제 후 방치되어 수강 기한 만료</li>
                <li>· 6개월만 지나도 쓸 수 없는 옛날 AI/정책 정보</li>
                <li>· 막히는 부분이 생겨도 질문할 곳이 없음</li>
                <li>· 강의는 들었지만 내 실무에 적용하지 못함</li>
              </ul>
            </div>

            {/* 공실뉴스 1년 스터디 */}
            <div style={{ background: "#ffffff", border: "2px solid #059669", borderRadius: 16, padding: "32px 28px", boxShadow: "0 10px 30px rgba(5, 150, 105, 0.1)" }}>
              <div style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ✅ 공실뉴스 1년 스터디
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: "#062828", margin: "0 0 16px 0" }}>365일 실전 동행 마스터마인드</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15, color: "#064e3b", fontWeight: 600, lineHeight: 2.0 }}>
                <li>· 1년(365일) 내내 무제한 반복 시청 및 복습</li>
                <li>· 매달 변화하는 최신 AI 툴과 정책 특강 자동 추가</li>
                <li>· 계약서 특약, AI 프롬프트, 영상 템플릿 원본 제공</li>
                <li>· 전국 11만 부동산 스터디 크루와 공동중개 네트워킹</li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ 3. 3D PASTEL AVATARS: 나이가 많아서요? 코딩/컴퓨터를 못해서요? (증명 섹션) ━━━ */}
      <section style={{ padding: "85px 0 80px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px" }}>
          
          {/* 섹션 헤딩 */}
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <h2 style={{ fontSize: "32px", fontWeight: 900, color: "#062828", margin: "0 0 12px 0", letterSpacing: "-0.5px", lineHeight: 1.35 }}>
              나이가 많아서요? 컴퓨터를 잘 못 다뤄서요?<br />
              <span style={{ color: "#059669" }}>비전공자·초보라서 못 할 것 같다고요?</span>
            </h2>
            <p style={{ fontSize: "16px", color: "#475569", lineHeight: 1.6, margin: "0 0 4px 0" }}>
              그 걱정, 이제 내려놓으셔도 됩니다.
            </p>
            <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>
              나이도, IT 지식도 상관없이 전부 하실 수 있어요. 먼저 해내신 분들이 증명했거든요.
            </p>
          </div>

          {/* 5대 3D 아바타 교차 카드 리스트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              {
                role: "소속공인중개사 1년차",
                quote: "“블로그 글 1개 쓰는데 반나절 걸리던 제가, 공실뉴스 AI 프롬프트 쓰고 5분 만에 상위노출 글 3개를 뚝딱 완성했어요.”",
                author: "마포구 소속공인중개사 이OO 실장",
                image: "/images/study/avatar_realtor_female.jpg",
                imagePosition: "left",
              },
              {
                role: "50대 개업공인중개사",
                quote: "“컴맹이라 AI는 남 이야기인 줄 알았는데, 클릭 몇 번으로 매물 쇼츠 만들었더니 유튜브 보고 젊은 임차인 문의가 3배 폭증했네요.”",
                author: "강남구 개업공인중개사 박OO 대표",
                image: "/images/study/avatar_realtor_male.jpg",
                imagePosition: "right",
              },
              {
                role: "상가 건물주 / 임대인",
                quote: "“1년 넘게 공실이던 3층 통상가, 공실스터디에서 배운 타깃 마케팅과 AI 제안서로 2주 만에 우량 프랜차이즈 임대 맞췄습니다.”",
                author: "판교 상가 건물주 정OO 대표",
                image: "/images/study/avatar_landlord_male.jpg",
                imagePosition: "left",
              },
              {
                role: "부동산 유튜버 크리에이터",
                quote: "“고가 카메라 장비 없이 스마트폰과 AI 음성으로 부동산 브리핑 채널 시작해 구독자 1만 명 돌파하고 전속 매물 쏟아집니다.”",
                author: "유튜브 부동산 채널 운영자 김OO 대표",
                image: "/images/study/avatar_creator_male.jpg",
                imagePosition: "right",
              },
              {
                role: "경매 & 특수물건 실무자",
                quote: "“어려운 유찰 물건 권리분석부터 특약 작성까지, 1년 스터디 실무 서식 원본 덕분에 실수 없이 안전하게 계약 체결했어요.”",
                author: "경기 분당구 공인중개사 최OO 대표",
                image: "/images/study/avatar_senior_female.jpg",
                imagePosition: "left",
              },
            ].map((item, idx) => {
              const isLeftImage = item.imagePosition === "left";
              return (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: "26px 32px",
                    display: "flex",
                    alignItems: "center",
                    gap: 32,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* 이미지 좌측 배치 */}
                  {isLeftImage && (
                    <div style={{ width: 150, height: 150, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img
                        src={item.image}
                        alt={item.role}
                        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                      />
                    </div>
                  )}

                  {/* 본문 텍스트 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 12.5, fontWeight: 800, padding: "4px 10px", borderRadius: 6, marginBottom: 10 }}>
                      {item.role}
                    </div>
                    <p style={{ fontSize: 16.5, fontWeight: 800, color: "#062828", lineHeight: 1.55, margin: "0 0 10px 0", letterSpacing: "-0.2px" }}>
                      {item.quote}
                    </p>
                    <span style={{ fontSize: 13.5, color: "#64748b", fontWeight: 600 }}>
                      {item.author}
                    </span>
                  </div>

                  {/* 이미지 우측 배치 */}
                  {!isLeftImage && (
                    <div style={{ width: 150, height: 150, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img
                        src={item.image}
                        alt={item.role}
                        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ━━━ 4. 12-MONTH ANNUAL ROADMAP (1년 4단계 성장 로드맵) ━━━ */}
      <section style={{ padding: "75px 0 70px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              12-MONTH ROADMAP
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#062828", margin: "8px 0 10px 0", letterSpacing: "-0.5px" }}>
              1년 12개월 실전 마스터 플랜
            </h2>
            <p style={{ fontSize: "15.5px", color: "#64748b", margin: 0 }}>
              기초 AI 도구 장착부터 지역 1등 브랜드 구축까지, 단계별로 차근차근 완성합니다.
            </p>
          </div>

          {/* 4단계 스텝 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            
            {/* STEP 1 */}
            <div style={{ background: "#ffffff", border: "1px solid #d1fae5", borderRadius: 14, padding: "26px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#059669", marginBottom: 8 }}>Q1 (1~3개월차)</div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 12px 0" }}>🤖 AI 무기 장착기</h4>
              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                · 1분 완성 매물 쇼츠/릴스 제작<br />
                · ChatGPT 매물 설명문 10배 작성<br />
                · 블로그 상위 노출 자동화 기본기
              </p>
            </div>

            {/* STEP 2 */}
            <div style={{ background: "#ffffff", border: "1px solid #d1fae5", borderRadius: 14, padding: "26px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#059669", marginBottom: 8 }}>Q2 (4~6개월차)</div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 12px 0" }}>🏢 실전 공실 해결기</h4>
              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                · 상가·원룸 공실 채우는 임대 마케팅<br />
                · AI 물건보고서로 고객 즉시 클로징<br />
                · 임대인·임차인 설득 브리핑 기법
              </p>
            </div>

            {/* STEP 3 */}
            <div style={{ background: "#ffffff", border: "1px solid #d1fae5", borderRadius: 14, padding: "26px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#059669", marginBottom: 8 }}>Q3 (7~9개월차)</div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 12px 0" }}>🔨 경공매 & 수익 극대화</h4>
              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                · 법원 경·공매 권리분석 실전<br />
                · 돈 되는 유찰 물건 정밀 발굴<br />
                · 특수물건 중개 및 절세 세무 전략
              </p>
            </div>

            {/* STEP 4 */}
            <div style={{ background: "#ffffff", border: "1px solid #d1fae5", borderRadius: 14, padding: "26px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#059669", marginBottom: 8 }}>Q4 (10~12개월차)</div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 12px 0" }}>🏆 지역 1등 브랜드 안착</h4>
              <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                · 나만의 유튜브/블로그 채널 완성<br />
                · 전국 11만 공동중개망 연계<br />
                · 지속 가능한 자동 고객 유입 시스템
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ━━━ 5. 4대 연간 멤버십 혜택 ━━━ */}
      <section style={{ padding: "75px 0", backgroundColor: "#f2f9f6", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              MEMBERSHIP BENEFITS
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#062828", margin: "8px 0 0 0", letterSpacing: "-0.5px" }}>
              1년 스터디 멤버십 4대 핵심 혜택
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            
            <div style={{ background: "#ffffff", padding: "28px 24px", borderRadius: 14, border: "1px solid #d1fae5", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>
                🎬
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>365일 무제한 VOD</h4>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.55, margin: 0 }}>
                1년 내내 언제 어디서나 PC와 스마트폰으로 반복 수강할 수 있습니다.
              </p>
            </div>

            <div style={{ background: "#ffffff", padding: "28px 24px", borderRadius: 14, border: "1px solid #d1fae5", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>
                🔄
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>매월 신규 실무 업데이트</h4>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.55, margin: 0 }}>
                변화하는 AI 기술과 최신 부동산 정책을 매달 새 특강으로 반영합니다.
              </p>
            </div>

            <div style={{ background: "#ffffff", padding: "28px 24px", borderRadius: 14, border: "1px solid #d1fae5", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>
                📂
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>실무 서식 원본 제공</h4>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.55, margin: 0 }}>
                계약서 특약, AI 프롬프트 템플릿, 쇼츠 제작 원본 파일을 100% 드립니다.
              </p>
            </div>

            <div style={{ background: "#ffffff", padding: "28px 24px", borderRadius: 14, border: "1px solid #d1fae5", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>
                🤝
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 800, color: "#062828", margin: "0 0 8px 0" }}>전국 스터디 크루 연계</h4>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.55, margin: 0 }}>
                전국 11만 부동산 회원과 매물 정보 및 공동중개를 활발히 교류합니다.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ━━━ 6. FAQ (자주 묻는 질문 아코디언) ━━━ */}
      <section style={{ padding: "75px 0 80px", backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              FAQ
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#062828", margin: "6px 0 0 0" }}>
              자주 묻는 질문
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: isOpen ? "#f4fbf7" : "#ffffff",
                    border: isOpen ? "1.5px solid #059669" : "1px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                  }}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    style={{
                      width: "100%",
                      padding: "20px 24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      gap: 16,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: isOpen ? "#064e3b" : "#1e293b", lineHeight: 1.4 }}>
                      Q. {faq.q}
                    </span>
                    <span
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        color: isOpen ? "#059669" : "#94a3b8",
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: "0 24px 22px 24px",
                        fontSize: 14.5,
                        color: "#475569",
                        lineHeight: 1.7,
                        borderTop: "1px solid rgba(5, 150, 105, 0.1)",
                        paddingTop: 16,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ━━━ 7. BOTTOM CTA SECTION ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "64px 0", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 14px 0", color: "#ffffff" }}>
            지금 바로 1년 스터디 특강을 시작하세요!
          </h2>
          <p style={{ fontSize: "16px", color: "#a7f3d0", margin: "0 0 28px 0", lineHeight: 1.6 }}>
            원하는 과목을 선택하고, 현장에서 바로 적용할 수 있는 실전 노하우를 만나보세요.
          </p>
          <Link
            href="/study"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 36px",
              background: "#059669",
              color: "#ffffff",
              borderRadius: 12,
              fontSize: 16.5,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(5, 150, 105, 0.4)",
              transition: "all 0.2s",
            }}
          >
            <span>전체 특강 라인업 보러가기</span>
            <span>→</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
