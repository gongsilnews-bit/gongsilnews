"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HelpCenterData } from "@/app/actions/helpCenter";
import InquiryModal from "./InquiryModal";

/**
 * 고객센터 화면 (PC /help · 모바일 /m/help 공용).
 * 상단 배너에 FAQ 검색과 1:1 문의 / 내 문의내역 버튼, 그 아래 FAQ 목록.
 * 고객이 답을 먼저 찾아보고 없을 때만 문의로 넘어가게 한다.
 * 내 문의내역은 고객센터에 목록을 두지 않고 각자의 관리자 페이지로 보낸다.
 */

const NAVY = "#1a2e50";
const ORANGE = "#ff8e15";

export default function HelpCenterClient({ data, mobile = false, autoOpenInquiry = false }: { data: HelpCenterData; mobile?: boolean; autoOpenInquiry?: boolean }) {
  const { categories, faqs, myInquiryUrl, isAdmin, member, inquiryMaxPhotos } = data;
  const [activeCat, setActiveCat] = useState("전체");
  const [inquiryOpen, setInquiryOpen] = useState(autoOpenInquiry);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const prefix = mobile ? "/m" : "";
  const tabs = ["전체", ...categories];

  const visibleFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((f) => {
      if (activeCat !== "전체" && f.category !== activeCat) return false;
      if (!q) return true;
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    });
  }, [faqs, activeCat, query]);

  const pad = mobile ? "0 16px" : "0";
  // 모바일엔 관리자 페이지 1:1문의 메뉴가 없어 본인 글만 보이는 모바일 문의 목록으로 보낸다
  const myInquiryHref = myInquiryUrl && (mobile ? "/m/board?id=inquiry" : myInquiryUrl);

  // 비회원도 문의할 수 있다. 창 안에서 로그인하면 이 화면으로 돌아와 창을 다시 연다
  const openInquiry = () => setInquiryOpen(true);
  const loginHref = `/login?returnTo=${encodeURIComponent("/help?inquiry=1")}`;

  // 로그인하고 돌아온 주소(?inquiry=1)는 창을 연 뒤 주소에서 지운다
  useEffect(() => {
    if (!autoOpenInquiry) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("inquiry");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [autoOpenInquiry]);

  const searchBox = (
    <div style={{ display: "flex", alignItems: "center", width: "100%", borderRadius: 8, background: "#fff", padding: "0 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpenId(null); }}
        placeholder="궁금한 내용을 검색하세요 (예: 가입, 공실 등록)"
        aria-label="자주 묻는 질문 검색"
        style={{ flex: 1, border: "none", outline: "none", fontSize: mobile ? 14 : 15, padding: "10px 10px", background: "transparent", minWidth: 0, color: "#111827" }}
      />
    </div>
  );

  const contactButtons = (
    <div style={{ display: "flex", flexDirection: "row", gap: 8, width: mobile ? "100%" : "auto", flexShrink: 0 }}>
      <button
        onClick={openInquiry}
        style={{ flex: mobile ? 1 : undefined, padding: "10px 16px", borderRadius: 8, border: "none", background: ORANGE, color: "#fff", fontSize: 14, fontWeight: 800, textAlign: "center", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        1:1 문의 남기기
      </button>
      {myInquiryHref && (
        <Link
          href={myInquiryHref}
          style={{ flex: mobile ? 1 : undefined, padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, fontWeight: 800, textAlign: "center", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          내 문의내역
        </Link>
      )}
    </div>
  );

  return (
    <div style={{ paddingBottom: mobile ? 48 : 80 }}>
      {/* ── 상단 슬림 배너 (높이 대폭 축소 및 군더더기 텍스트 삭제) ── */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0f1d36 100%)`, color: "#fff" }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: mobile ? "14px 16px" : "18px 20px",
          display: "flex", flexDirection: mobile ? "column" : "row", alignItems: "center", justifyContent: "space-between", gap: mobile ? 10 : 20,
        }}>
          <h1 style={{ fontSize: mobile ? 18 : 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", whiteSpace: "nowrap", flexShrink: 0 }}>
            고객센터
          </h1>
          <div style={{ flex: 1, maxWidth: mobile ? "100%" : 560, width: mobile ? "100%" : "auto" }}>
            {searchBox}
          </div>
          {contactButtons}
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "4px 0 0" : "16px 20px 0" }}>
      {/* ── 분류 ── */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex", gap: 8, marginTop: 18, padding: pad,
          overflowX: mobile ? "auto" : "visible", flexWrap: mobile ? "nowrap" : "wrap", whiteSpace: "nowrap",
        }}
      >
        {tabs.map((t) => {
          const sel = t === activeCat;
          return (
            <button
              key={t}
              onClick={() => { setActiveCat(t); setOpenId(null); }}
              style={{
                flexShrink: 0, padding: mobile ? "7px 14px" : "9px 18px", borderRadius: 999, cursor: "pointer",
                fontSize: mobile ? 13.5 : 14.5, fontWeight: sel ? 700 : 500,
                color: sel ? "#fff" : "#475569", background: sel ? NAVY : "#fff",
                border: `1px solid ${sel ? NAVY : "#e2e8f0"}`,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* ── FAQ 목록 ── */}
      <section style={{ marginTop: 22, padding: pad }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: mobile ? 17 : 19, fontWeight: 800, color: "#111827", margin: 0 }}>자주 묻는 질문</h2>
          {isAdmin && (
            <Link
              href={`${prefix}/board_write?board_id=faq`}
              style={{ fontSize: 13, fontWeight: 700, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 6, padding: "5px 10px", textDecoration: "none" }}
            >
              + FAQ 추가
            </Link>
          )}
        </div>

        <div style={{ borderTop: `2px solid ${NAVY}` }}>
          {visibleFaqs.length === 0 ? (
            <div style={{ padding: "48px 16px", textAlign: "center", color: "#94a3b8", fontSize: 14.5, borderBottom: "1px solid #e5e7eb" }}>
              {query.trim()
                ? <>&lsquo;{query.trim()}&rsquo;에 맞는 질문이 없습니다.<br />아래에서 상담을 남겨 주세요.</>
                : "등록된 질문이 아직 없습니다."}
            </div>
          ) : (
            visibleFaqs.map((f) => {
              const open = openId === f.id;
              return (
                <div key={f.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <button
                    onClick={() => setOpenId(open ? null : f.id)}
                    aria-expanded={open}
                    style={{
                      width: "100%", display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
                      background: open ? "#f8fafc" : "#fff", border: "none", cursor: "pointer",
                      padding: mobile ? "16px 4px" : "20px 12px",
                    }}
                  >
                    <span style={{ color: NAVY, fontWeight: 800, fontSize: mobile ? 16 : 17, lineHeight: 1.5 }}>Q</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {f.category && (
                        <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: ORANGE, marginBottom: 2 }}>{f.category}</span>
                      )}
                      <span style={{ fontSize: mobile ? 15 : 16, fontWeight: 600, color: "#1e293b", lineHeight: 1.5 }}>{f.question}</span>
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true"
                      style={{ flexShrink: 0, marginTop: 4, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {open && (
                    <div style={{ display: "flex", gap: 10, padding: mobile ? "4px 4px 18px" : "4px 12px 22px", background: "#f8fafc" }}>
                      <span style={{ color: ORANGE, fontWeight: 800, fontSize: mobile ? 16 : 17, lineHeight: 1.7 }}>A</span>
                      <div style={{ flex: 1, fontSize: mobile ? 14.5 : 15.5, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
                        {f.answer}
                        {isAdmin && (
                          <div style={{ marginTop: 10 }}>
                            <Link href={`${prefix}/board_write?board_id=faq&post_id=${f.id}`} style={{ fontSize: 12.5, color: "#64748b" }}>수정</Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── 목록 끝까지 본 고객용 짧은 안내 ── */}
      <div style={{ margin: mobile ? "22px 16px 0" : "28px 0 0", padding: mobile ? "16px" : "18px 24px", background: "#f1f5f9", borderRadius: 12, display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: mobile ? 14 : 15, fontWeight: 700, color: "#1e293b" }}>원하는 답을 찾지 못하셨나요?</span>
        <button onClick={openInquiry} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: NAVY, color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", cursor: "pointer" }}>1:1 문의 남기기</button>
      </div>
      </div>

      {inquiryOpen && (
        <InquiryModal
          member={member}
          loginHref={loginHref}
          categories={categories}
          maxPhotos={inquiryMaxPhotos}
          myInquiryHref={myInquiryHref || `${prefix}/board?id=inquiry`}
          mobile={mobile}
          onClose={() => setInquiryOpen(false)}
        />
      )}
    </div>
  );
}
