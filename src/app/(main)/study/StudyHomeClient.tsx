"use client";

import React, { useState } from "react";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";

const PRACTICE_LOOP = [
  {
    step: "STEP 1",
    title: "배운다",
    desc: "AI·유튜브·블로그 실무 강의를 봅니다. 이론이 아니라 오늘 바로 쓰는 방법만 다룹니다",
  },
  {
    step: "STEP 2",
    title: "해본다",
    desc: "그날 배운 걸로 내 공실을 등록하고, 기사도 직접 써봅니다. 남의 사례가 아닌 내 매물로 합니다",
  },
  {
    step: "STEP 3",
    title: "남는다",
    desc: "등록한 공실은 11만 중개망에, 쓴 기사는 뉴스 포털에 노출됩니다. 연습이 곧 실전이 됩니다",
  },
  {
    step: "STEP 4",
    title: "또 돈다",
    desc: "매달 새 강의가 올라오고, 또 내 매물로 연습합니다. 1년이면 몸에 붙습니다",
  },
];


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

export default function StudyHomeClient() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#132e27", minHeight: "100vh" }}>
      <StudyHeader />

      {/* ━━━ 1. HERO (센터 정렬 딥 포레스트) ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "80px 0 70px", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.14)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "6px 14px", borderRadius: 24, fontSize: 13, fontWeight: 700, color: "#6ee7b7", marginBottom: 28 }}>
            <span>🌿</span>
            <span>1년(12개월) 부동산 실무 &amp; AI 마스터마인드</span>
          </div>

          <h1 style={{ fontSize: "44px", fontWeight: 900, lineHeight: 1.35, letterSpacing: "-1px", margin: "0 auto 20px", color: "#ffffff" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
                fontSize: "44px",
                fontWeight: 900,
                color: "#6ee7b7",
                letterSpacing: "-1px",
                marginBottom: 10,
              }}
            >
              {/* AI 아이콘 (반짝임) */}
              <svg width="38" height="38" viewBox="0 0 24 24" fill="#6ee7b7" aria-hidden style={{ flexShrink: 0 }}>
                <path d="M11 2.5l1.75 5.15 5.15 1.75-5.15 1.75L11 16.3l-1.75-5.15L4.1 9.4l5.15-1.75L11 2.5z" />
                <path d="M18.5 14l.85 2.4 2.4.85-2.4.85-.85 2.4-.85-2.4-2.4-.85 2.4-.85.85-2.4z" opacity="0.75" />
              </svg>
              <span>AI</span>

              {/* 유튜브 아이콘 */}
              <svg width="46" height="33" viewBox="0 0 28 20" aria-hidden style={{ flexShrink: 0 }}>
                <rect width="28" height="20" rx="5.5" fill="#FF0000" />
                <path d="M11.2 5.8l6.6 4.2-6.6 4.2V5.8z" fill="#ffffff" />
              </svg>
              <span>유튜브 시대</span>
            </span>
            대표님 부동산 실무에는<br />
            <span style={{ color: "#34d399" }}>어떻게 활용하고 계신가요?</span>
          </h1>

          <p style={{ fontSize: "17.5px", color: "#a7f3d0", opacity: 0.9, lineHeight: 1.7, maxWidth: 660, margin: "0 auto 32px", wordBreak: "keep-all" }}>
            정보를 주고 받는 부동산에게<br />
            유튜브 콘텐츠 제작은 선택이 아니라 필수입니다.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/study/lectures"
              style={{
                display: "inline-block",
                padding: "16px 36px",
                background: "#059669",
                color: "#ffffff",
                borderRadius: 12,
                fontSize: 16.5,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 8px 24px rgba(5, 150, 105, 0.35)",
              }}
            >
              강의 바로가기 →
            </Link>
            <Link
              href="/study/pricing"
              style={{
                display: "inline-block",
                padding: "16px 30px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "#d1fae5",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              금액안내 ›
            </Link>
          </div>

          {/* 소개 영상 */}
          <div style={{ maxWidth: 720, margin: "44px auto 0" }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#000000",
              }}
            >
              <iframe
                src="https://www.youtube-nocookie.com/embed/QyClYIjPzao?rel=0"
                title="공실스터디 안내 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ 2. WHY 1-YEAR STUDY ━━━ */}
      <section style={{ padding: "75px 0 70px", backgroundColor: "#f2f9f6", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              WHY 1-YEAR STUDY
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#062828", margin: "8px 0 12px 0", letterSpacing: "-0.5px" }}>
              들을 때만 알겠고, 실무활용 못하는 강의는 이제 그만!!
            </h2>
            <p style={{ fontSize: "16px", color: "#475569", margin: 0 }}>
              공실등록을 통해 내 실무에 바로 활용할 수 있습니다.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {/* 수백만 원짜리 오프라인 강의 */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "32px 28px" }}>
              <div style={{ display: "inline-block", background: "#fee2e2", color: "#dc2626", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ❌ 수백만 원짜리 오프라인 강의
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: "#334155", margin: "0 0 16px 0" }}>들을 때만 알겠고, 실무는 그대로</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15, color: "#64748b", lineHeight: 2.0 }}>
                <li>· 수백만 원을 일시불로 먼저 결제</li>
                <li>· 들을 때만 고개 끄덕, 덮으면 백지</li>
                <li>· 이론과 교재뿐, 내 매물에는 못 씀</li>
                <li>· 강의는 끝났는데 달라진 건 없음</li>
              </ul>
            </div>

            {/* 공실뉴스 1년 스터디 */}
            <div style={{ background: "#ffffff", border: "2px solid #059669", borderRadius: 16, padding: "32px 28px", boxShadow: "0 10px 30px rgba(5, 150, 105, 0.1)" }}>
              <div style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 6, marginBottom: 18 }}>
                ✅ 월 3만 원 공실스터디
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: "#062828", margin: "0 0 16px 0" }}>듣고 끝이 아니라, 바로 써먹습니다</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15, color: "#064e3b", fontWeight: 600, lineHeight: 2.0 }}>
                <li>· 1년 내내 무제한 반복 수강</li>
                <li>· 매주 새로운 실전 특강 추가</li>
                <li>· 공실등록 한 번으로 전국 공동중개까지</li>
                <li>· 매물보고서·유튜브·블로그 글까지 손쉽게 작성</li>
              </ul>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 36 }}>
            <Link
              href="/study/benefits/ai-youtube"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 26px",
                background: "#ffffff",
                border: "1px solid #059669",
                color: "#047857",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              <span>멤버십혜택 자세히 보기</span>
              <span>→</span>
            </Link>
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
              <span style={{ color: "#059669" }}>AI 시대 컴맹도 유튜브를 만들 수 있습니다</span>
            </h2>
            <p style={{ fontSize: "16px", color: "#475569", lineHeight: 1.6, margin: "0 0 4px 0" }}>
              그 걱정, 이제 내려놓으셔도 됩니다.
            </p>
            <p style={{ fontSize: "14.5px", color: "#64748b", margin: 0 }}>
              나이도, IT 지식도 상관없이 전부 하실 수 있어요. 공실스터디와 함께 하시면,<br />
              대표님도 분명 아래와 같이 하실 수 있습니다.
            </p>
          </div>

          {/* 5대 3D 아바타 교차 카드 리스트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
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
                    borderRadius: 20,
                    padding: "44px 52px",
                    display: "flex",
                    alignItems: "center",
                    gap: 48,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* 이미지 좌측 배치 */}
                  {isLeftImage && (
                    <div style={{ width: 230, height: 230, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img
                        src={item.image}
                        alt={item.role}
                        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                      />
                    </div>
                  )}

                  {/* 본문 텍스트 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "inline-block", background: "#ecfdf5", color: "#047857", fontSize: 14, fontWeight: 800, padding: "7px 16px", borderRadius: 20, marginBottom: 18 }}>
                      {item.role}
                    </div>
                    <p style={{ fontSize: 23, fontWeight: 800, color: "#062828", lineHeight: 1.6, margin: "0 0 18px 0", letterSpacing: "-0.4px", wordBreak: "keep-all" }}>
                      {item.quote}
                    </p>
                    <span style={{ fontSize: 14.5, color: "#64748b", fontWeight: 600 }}>
                      {item.author}
                    </span>
                  </div>

                  {/* 이미지 우측 배치 */}
                  {!isLeftImage && (
                    <div style={{ width: 230, height: 230, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

      {/* ━━━ 4. 실습 순환 (강의 → 내 매물로 실습 → 노출로 남음 → 반복) ━━━ */}
      <section style={{ padding: "75px 0 70px", backgroundColor: "#f2f9f6", borderTop: "1px solid #d1fae5", borderBottom: "1px solid #d1fae5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669", letterSpacing: "1px", textTransform: "uppercase" }}>
              PRACTICE, NOT JUST LECTURES
            </span>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#062828", margin: "8px 0 12px 0", letterSpacing: "-0.5px", lineHeight: 1.4 }}>
              강의만 듣고 끝나지 않습니다.<br />
              <span style={{ color: "#059669" }}>공실뉴스에 공실을 등록하세요!</span>
            </h2>
            <p style={{ fontSize: "15.5px", color: "#64748b", margin: 0, lineHeight: 1.7, wordBreak: "keep-all" }}>
              공실뉴스가 곧 연습장입니다. 배운 그날 공실을 등록하고 기사를 써보면,<br />
              그게 연습으로 끝나지 않고 실제 노출로 남습니다.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
            {PRACTICE_LOOP.map((step, i) => (
              <div
                key={step.title}
                style={{
                  position: "relative",
                  background: "#ffffff",
                  border: "1px solid #d1fae5",
                  borderRadius: 16,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {/* 다음 단계로 이어지는 화살표 (마지막 칸 제외) */}
                {i < PRACTICE_LOOP.length - 1 && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      right: -16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 18,
                      fontWeight: 900,
                      color: "#6ee7b7",
                      lineHeight: 1,
                    }}
                  >
                    →
                  </span>
                )}

                <span style={{ fontSize: 13, fontWeight: 900, color: "#059669", letterSpacing: "0.5px" }}>{step.step}</span>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: "#062828", margin: 0, letterSpacing: "-0.3px" }}>{step.title}</h3>
                <p style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.7, margin: 0, wordBreak: "keep-all" }}>{step.desc}</p>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", marginTop: 40, marginBottom: 0, fontSize: "19px", fontWeight: 800, color: "#062828", letterSpacing: "-0.3px", wordBreak: "keep-all" }}>
            연습장이 따로 없습니다. <span style={{ color: "#059669" }}>내 실제 매물이 교재입니다.</span>
          </p>

        </div>
      </section>

      {/* ━━━ 5. FAQ ━━━ */}
      <section style={{ padding: "70px 0 75px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>

          <div style={{ textAlign: "center", marginBottom: 36 }}>
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
                    backgroundColor: "#ffffff",
                    border: isOpen ? "1.5px solid #059669" : "1px solid #e2e8f0",
                    borderRadius: 12,
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    boxShadow: isOpen ? "0 4px 16px rgba(5, 150, 105, 0.08)" : "none",
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
                      backgroundColor: "#ffffff",
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
                        padding: "16px 24px 22px 24px",
                        fontSize: 14.5,
                        color: "#334155",
                        lineHeight: 1.7,
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link href="/study/qna" style={{ fontSize: 14.5, fontWeight: 700, color: "#047857", textDecoration: "none" }}>
              더 궁금한 점은 Q&amp;A게시판에 남겨주세요 ›
            </Link>
          </div>

        </div>
      </section>

      {/* ━━━ 6. BOTTOM CTA ━━━ */}
      <section style={{ backgroundColor: "#062326", color: "#ffffff", padding: "64px 0", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 14px 0", color: "#ffffff" }}>
            지역 1등 부동산으로 성장하는 가장 확실한 1년
          </h2>
          <p style={{ fontSize: 15.5, color: "#a7f3d0", margin: "0 0 28px 0", lineHeight: 1.7 }}>
            지금 가입하고 1년 동안 제공되는 모든 AI 실무 특강과 자료를 무제한으로 누리세요.
          </p>
          <Link
            href="/study/lectures"
            style={{
              display: "inline-block",
              padding: "15px 36px",
              background: "#059669",
              color: "#ffffff",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 8px 24px rgba(5, 150, 105, 0.4)",
            }}
          >
            1년 스터디 지금 시작하기 →
          </Link>
        </div>
      </section>

    </div>
  );
}
