"use client";

import React, { useState } from "react";
import Link from "next/link";
import StudyHeader from "@/components/study/StudyHeader";

/**
 * 공실스터디 소개 랜딩 (/gongsilstudy)
 * 기존 소개 페이지의 내용을 /study 의 디자인 언어(딥 포레스트 + 에메랄드)로 옮긴 페이지.
 * 이미지는 아직 없어서 자리만 잡아두었다. 파일이 정해지면 ImageSlot 내용만 교체하면 된다.
 */
const POINT = "#059669";
const POINT_DARK = "#047857";
const DEEP = "#062326";

const INTRO_CHECKS = [
  "부동산 마케팅 AI 실전 활용법",
  "AI 부동산 유튜브 영상 제작법",
  "매주 1회, 트렌드에 맞는 온라인 강의",
  "AI App 무료 제공",
  "드론 영상·사진 저작권 무료",
  "실무에 바로 쓰는 매매보고서 제작",
];

const FEATURES = [
  {
    tags: ["공유리업", "매매보고서"],
    title: "AI 매매보고서, 아파트 웹페이지 제작",
    lead: "아파트 홍보에 필요한 웹페이지부터 매매보고서까지,",
    leadStrong: "부동산 실무에 필요한 AI 강의를 제공합니다.",
    bullets: [
      "AI 프롬프트로 매물 소개글 작성법",
      "아파트·원룸 매물 웹페이지 완성",
      "AI 부동산 홍보물 만들기",
      "AI 이미지로 매물 보고서 제작",
    ],
    hashtags: ["#매매보고서", "#매물홍보", "#웹페이지제작"],
    imageCaption: "AI 매매보고서 화면",
    imageFirst: true,
  },
  {
    tags: ["유튜브", "영상편집"],
    title: "AI 부동산 유튜브 쉽게 만드세요!",
    lead: "촬영 장비 없이도 부동산 쇼츠·릴스를 만들 수 있습니다.",
    leadStrong: "AI가 대본부터 편집까지 도와줍니다.",
    bullets: [
      "AI로 만드는 매물 쇼츠 촬영법",
      "유튜브·블로그 채널 만들기",
      "부동산 영상 편집 기초",
      "AI 글쓰기·더빙·영상 제작 앱",
    ],
    hashtags: ["#부동산쇼츠", "#부동산유튜브", "#영상편집"],
    imageCaption: "부동산 유튜브 모바일 화면",
    imageFirst: false,
  },
  {
    tags: ["AI App", "무료제공"],
    title: "12가지 AI App 무료 제공",
    lead: "매매보고서, 홍보물, 아파트 웹페이지까지",
    leadStrong: "실전에서 바로 활용하는 App을 무료로 드립니다!",
    bullets: [
      "매물 소개글 자동 생성 App",
      "아파트 웹페이지 제작 App",
      "부동산 홍보물 디자인 App",
      "영상 대본·자막 제작 App",
    ],
    hashtags: ["#매매보고서", "#부동산홍보물", "#무료제공"],
    imageCaption: "AI App 목록 화면",
    imageFirst: true,
  },
  {
    tags: ["드론", "저작권무료"],
    title: "드론 영상/사진 저작권 무료",
    lead: "부동산 유튜브, 쇼츠, 블로그까지",
    leadStrong: "마케팅에 필요한 항공 영상·사진을 무료로 활용하세요.",
    bullets: [
      "전국 주요 단지 항공 드론 영상",
      "상권·입지 조망 촬영본",
      "아파트·상가 드론 영상/사진",
      "저작권 걱정 없이 상업 이용",
    ],
    hashtags: ["#드론영상", "#항공촬영", "#저작권무료"],
    imageCaption: "드론 항공 영상",
    imageFirst: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "“3일이면 다 된 것 같은데 영상까지 넣으니 매물 문의가 확 늘었어요.”",
    author: "아파트 전문 부동산 대표",
  },
  {
    quote: "“어려운 줄 알았는데 따라만 해도 결과물이 나옵니다.”",
    author: "공실뉴스 강의 수강생 대표",
  },
  {
    quote: "“혼자 하던 홍보를 이제 매주 꾸준히 하게 됐습니다.”",
    author: "상가 오피스텔 부동산 대표",
  },
];

const FAQS = [
  {
    q: "수강료 외에 다른 비용이 있나요?",
    a: "없습니다. 월 30,000원(VAT 포함) 외에 가입비·교재비는 받지 않습니다.",
  },
  {
    q: "강의는 언제, 어떻게 진행되나요?",
    a: "매주 1회 온라인으로 진행되며, 놓친 강의는 다시보기로 언제든 복습할 수 있습니다.",
  },
  {
    q: "컴퓨터를 잘 다루지 못해도 따라갈 수 있나요?",
    a: "가능합니다. 실습은 화면을 그대로 따라 하는 방식으로 진행되며, 막히는 부분은 Q&A게시판에서 답변해 드립니다.",
  },
  {
    q: "AI App은 어떻게 받나요?",
    a: "수강 신청 후 나의 강의실에서 바로 내려받을 수 있습니다.",
  },
  {
    q: "드론 영상은 정말 무료로 써도 되나요?",
    a: "네. 수강 기간 중에는 저작권 걱정 없이 상업적으로 활용하실 수 있습니다.",
  },
  {
    q: "중도에 해지할 수 있나요?",
    a: "위약금 없이 언제든 해지하실 수 있습니다.",
  },
];

/** 이미지 자리. 파일이 정해지면 이 컴포넌트 내부만 <Image> 로 바꾸면 된다 */
function ImageSlot({ caption, ratio = "4/3", dark = false }: { caption: string; ratio?: string; dark?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: ratio,
        borderRadius: 16,
        border: dark ? "1px dashed rgba(255,255,255,0.28)" : "1px dashed #a7f3d0",
        background: dark ? "rgba(255,255,255,0.05)" : "#f2f9f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: dark ? "rgba(255,255,255,0.4)" : "#94a3b8",
        fontSize: 13.5,
        fontWeight: 700,
      }}
    >
      {caption}
    </div>
  );
}

function SubscribeButton({ large = false }: { large?: boolean }) {
  return (
    <Link
      href="/study/pricing"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: large ? "18px 44px" : "14px 34px",
        background: POINT,
        color: "#ffffff",
        borderRadius: 12,
        fontSize: large ? 18 : 16,
        fontWeight: 800,
        textDecoration: "none",
        boxShadow: "0 8px 22px rgba(5, 150, 105, 0.32)",
        letterSpacing: "-0.3px",
      }}
    >
      <span>공실 스터디 구독 신청</span>
      <span>》</span>
    </Link>
  );
}

export default function GongsilStudyClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#132e27", minHeight: "100vh" }}>
      <StudyHeader />

      {/* ━━━ 1. HERO ━━━ */}
      <section style={{ backgroundColor: DEEP, color: "#ffffff", padding: "70px 0 0" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 460px", minWidth: 300 }}>
              <h1 style={{ margin: "0 0 18px 0", letterSpacing: "-1px", lineHeight: 1.3 }}>
                <span style={{ display: "block", fontSize: 26, fontWeight: 800, color: "#d1fae5", marginBottom: 10 }}>
                  유튜브로 고객을 만나는 시대!
                </span>
                <span style={{ display: "block", fontSize: 38, fontWeight: 900, color: "#34d399", wordBreak: "keep-all" }}>
                  대표님은 어떤 공부를 하고 계시나요?
                </span>
              </h1>

              <p style={{ fontSize: 15.5, color: "#a7f3d0", opacity: 0.9, lineHeight: 1.8, margin: "0 0 30px 0", wordBreak: "keep-all" }}>
                AI 매매보고서 · 아파트 부동산홍보물 · 영상편집 · AI인테리어 · 드론영상
              </p>

              <SubscribeButton large />
            </div>

            <div style={{ flex: "1 1 420px", minWidth: 280, paddingBottom: 70 }}>
              <ImageSlot caption="노트북 강의 화면" ratio="16/10" dark />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ 2. 강의 소개 ━━━ */}
      <section style={{ padding: "76px 0 70px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 46 }}>
            <p style={{ fontSize: 16, color: "#64748b", margin: "0 0 10px 0" }}>매일 쏟아져 나오는 AI 강의…</p>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "#062828", margin: 0, letterSpacing: "-0.6px", lineHeight: 1.45, wordBreak: "keep-all" }}>
              부동산 마케팅에 꼭 필요한 실무 강의만<br />
              <span style={{ color: POINT }}>매주 온라인으로 쉽게!</span>
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 56, flexWrap: "wrap", marginBottom: 46 }}>
            <ul style={{ flex: "1 1 400px", minWidth: 300, listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {INTRO_CHECKS.map((c) => (
                <li key={c} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 17, fontWeight: 700, color: "#0f2e28" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                  {c}
                </li>
              ))}
            </ul>
            <div style={{ flex: "1 1 420px", minWidth: 280 }}>
              <ImageSlot caption="공실스터디 현장 사진" ratio="16/10" />
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <SubscribeButton />
          </div>
        </div>
      </section>

      {/* ━━━ 3. 기능 블록 4종 ━━━ */}
      {FEATURES.map((f, i) => {
        const soft = i % 2 === 0;
        const copy = (
          <div style={{ flex: "1 1 420px", minWidth: 300 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {f.tags.map((t) => (
                <span key={t} style={{ fontSize: 12.5, fontWeight: 800, background: "#ecfdf5", color: POINT_DARK, padding: "5px 13px", borderRadius: 20 }}>
                  {t}
                </span>
              ))}
            </div>

            <h3 style={{ fontSize: 28, fontWeight: 900, color: "#062828", margin: "0 0 14px 0", letterSpacing: "-0.6px", lineHeight: 1.4, wordBreak: "keep-all" }}>
              {f.title}
            </h3>

            <p style={{ fontSize: 15.5, color: "#475569", lineHeight: 1.75, margin: "0 0 20px 0", wordBreak: "keep-all" }}>
              {f.lead}<br />
              <strong style={{ color: POINT }}>{f.leadStrong}</strong>
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              {f.bullets.map((b) => (
                <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14.5, color: "#334155", lineHeight: 1.6 }}>
                  <span style={{ color: POINT, fontWeight: 900, flexShrink: 0 }}>✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {f.hashtags.map((h) => (
                <span key={h} style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>{h}</span>
              ))}
            </div>
          </div>
        );
        const image = (
          <div style={{ flex: "1 1 440px", minWidth: 280 }}>
            <ImageSlot caption={f.imageCaption} ratio="4/3" />
          </div>
        );

        return (
          <section
            key={f.title}
            style={{
              padding: "70px 0",
              backgroundColor: soft ? "#fdf9f2" : "#ffffff",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 64, flexWrap: "wrap" }}>
                {f.imageFirst ? <>{image}{copy}</> : <>{copy}{image}</>}
              </div>
            </div>
          </section>
        );
      })}

      {/* ━━━ 4. 추천사 ━━━ */}
      <section style={{ padding: "76px 0", backgroundColor: DEEP, color: "#ffffff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 900, margin: "0 0 44px 0", letterSpacing: "-0.5px", lineHeight: 1.45, wordBreak: "keep-all" }}>
            아파트·오피스텔 입점<br />
            <span style={{ color: "#34d399" }}>부동산 대표님께 강력 추천!</span>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.author} style={{ background: "#ffffff", borderRadius: 16, padding: "30px 26px", display: "flex", flexDirection: "column", gap: 14, minHeight: 190 }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#062828", lineHeight: 1.65, margin: 0, wordBreak: "keep-all", flex: 1 }}>
                  {t.quote}
                </p>
                <span style={{ fontSize: 13.5, color: "#64748b", fontWeight: 600 }}>{t.author}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ 5. 매주 1회 온라인 강의 + CTA ━━━ */}
      <section style={{ padding: "76px 0", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ textAlign: "center", fontSize: 30, fontWeight: 900, color: "#062828", margin: "0 0 44px 0", letterSpacing: "-0.6px" }}>
            매주 1회, <span style={{ color: POINT }}>트렌드에 맞는 온라인 강의</span>
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: 56, flexWrap: "wrap", marginBottom: 46 }}>
            <div style={{ flex: "1 1 420px", minWidth: 300 }}>
              <p style={{ fontSize: 16.5, color: "#475569", lineHeight: 1.8, margin: "0 0 22px 0", wordBreak: "keep-all" }}>
                매일 쏟아지는 AI 콘텐츠, 무엇부터 해야 할지 막막하셨죠.<br />
                지난 강의뿐 아니라 <strong style={{ color: POINT }}>새로운 강의를 매달 새롭게 제공</strong>합니다.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {["AI 부동산 콘텐츠 제작", "매매보고서·부동산 웹페이지 제작"].map((b) => (
                  <li key={b} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700, color: "#0f2e28" }}>
                    <span style={{ color: POINT, fontWeight: 900 }}>✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: "1 1 420px", minWidth: 280 }}>
              <ImageSlot caption="온라인 강의 현장" ratio="16/10" />
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <SubscribeButton large />
          </div>
        </div>
      </section>

      {/* ━━━ 6. FAQ ━━━ */}
      <section style={{ padding: "0 0 90px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: isOpen ? "#f8fafc" : "#ffffff" }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: "100%",
                      padding: "18px 22px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 15.5,
                      fontWeight: 700,
                      color: isOpen ? POINT : "#1e293b",
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: 17, transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</span>
                  </button>
                  {isOpen && (
                    <p style={{ margin: 0, padding: "0 22px 20px 22px", fontSize: 14.5, color: "#475569", lineHeight: 1.7, wordBreak: "keep-all" }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ 7. CONTACT US ━━━ */}
      <footer style={{ backgroundColor: DEEP, color: "#94a3b8", padding: "56px 0 44px", textAlign: "center" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", letterSpacing: "2px", marginBottom: 16 }}>CONTACT US</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.9, margin: "0 0 20px 0" }}>
            서울특별시 강남구 논현로115길 31, 105호 (논현동)<br />
            고객센터 1555-5343 (평일 10:00~17:00) · master@gongsilnews.com
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 13, fontWeight: 600 }}>
            <Link href="/" style={{ color: "#a7f3d0", textDecoration: "none" }}>공실뉴스</Link>
            <span style={{ color: "#334155" }}>|</span>
            <Link href="/terms" style={{ color: "#a7f3d0", textDecoration: "none" }}>개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
