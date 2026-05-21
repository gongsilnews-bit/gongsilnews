"use client";

import React, { useState, useEffect } from "react";
import { submitInquiry } from "@/app/actions/inquiry";

export default function GlobalInquiryWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState("AI온라인전단지");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [agree, setAgree] = useState(true);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 전화번호 자동 포맷터
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;

    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  // 빠른 질문 태그 매핑
  const getQuickTags = () => {
    switch (category) {
      case "AI온라인전단지":
        return [
          "전단지 제작 단가와 기간이 궁금해요.",
          "매물 주소만 알려드리면 제작해 주시나요?",
          "블로그나 카카오톡 전송용으로 쓰고 싶어요."
        ];
      case "매물 등록":
        return [
          "우리동네 공실 매물 대량 등록 문의드립니다.",
          "등록 시 광고 노출 범위와 혜택을 알고 싶어요.",
          "매물 업로드 대행 서비스가 가능한가요?"
        ];
      case "제휴/제안":
        return [
          "공실뉴스 플랫폼 광고 제휴 제안합니다.",
          "중개업소 솔루션 연동 제휴를 맺고 싶습니다.",
          "미디어나 보도자료 배포 제휴 문의합니다."
        ];
      default:
        return [
          "사용 중 오류/불편 사항이 있어 조치 부탁드립니다.",
          "기타 기능 개선 건의사항입니다."
        ];
    }
  };

  const handleTagClick = (tagText: string) => {
    setContent(tagText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("성함 또는 상호명을 입력해 주세요.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      alert("올바른 연락처를 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      alert("문의 내용을 입력해 주세요.");
      return;
    }
    if (!agree) {
      alert("개인정보 수집 및 이용 동의가 필요합니다.");
      return;
    }

    setLoading(true);
    const res = await submitInquiry({
      name,
      phone,
      email: email || undefined,
      category,
      content
    });

    if (res.success) {
      setSubmitted(true);
      // 입력 초기화
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setName("");
        setPhone("");
        setEmail("");
        setContent("");
      }, 3000); // 3초 뒤 자동 닫힘
    } else {
      alert("문의 등록에 실패했습니다: " + res.message);
    }
    setLoading(false);
  };

  return (
    <>
      {/* ── CSS 애니메이션 스타일 선언 ── */}
      <style>{`
        /* 맥동(Pulse) 애니메이션 */
        @keyframes inquiryPulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5), 0 10px 25px rgba(37, 99, 235, 0.3); }
          70% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0), 0 10px 25px rgba(37, 99, 235, 0.3); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0), 0 10px 25px rgba(37, 99, 235, 0.3); }
        }

        /* 위젯 등장 애니메이션 (PC) */
        @keyframes widgetFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* 바텀 시트 등장 애니메이션 (모바일) */
        @keyframes bottomSheetSlide {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        /* 성공 마크 드로잉 애니메이션 */
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }

        .floating-inquiry-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 10000;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #fff;
          border: none;
          padding: 14px 22px;
          border-radius: 30px;
          font-family: 'Pretendard', sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
          animation: inquiryPulse 2.5s infinite;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .floating-inquiry-btn:hover {
          transform: translateY(-4px) scale(1.03);
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        }

        /* 모바일 최적화 미디어쿼리 */
        @media (max-width: 768px) {
          .floating-inquiry-btn {
            bottom: 20px;
            right: 20px;
            padding: 12px 18px;
            font-size: 13px;
          }
          .inquiry-panel-pc {
            display: none !important;
          }
          .inquiry-panel-mobile {
            display: flex !important;
          }
        }
      `}</style>

      {/* ── 1. 우측 하단 플로팅 버튼 ── */}
      {!isOpen && (
        <button className="floating-inquiry-btn" onClick={() => setIsOpen(true)}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span>1:1 간편 문의하기</span>
        </button>
      )}

      {/* ── 2. 문의 양식 모달 (배경 오버레이) ── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(8px)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setIsOpen(false)}
        >
          {/* [A] PC용 모달 디자인 (배경 클릭 전파 차단) */}
          <div
            className="inquiry-panel-pc"
            style={{
              display: "flex",
              flexDirection: "column",
              width: 520,
              maxHeight: "90vh",
              background: "#ffffff",
              borderRadius: 24,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              animation: "widgetFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              fontFamily: "'Pretendard', sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e3b8b 0%, #2563eb 100%)",
                padding: "24px 28px",
                position: "relative",
                color: "#fff"
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
                ⚡ 공실뉴스 신속 문의
              </h3>
              <p style={{ fontSize: 13, color: "#bfdbfe", margin: 0, lineHeight: 1.4 }}>
                궁금증을 남겨주시면 1:1 담당자가 빠르게 연락해 드립니다.
              </p>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  position: "absolute",
                  top: 24,
                  right: 24,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* 본문 컨테이너 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              {submitted ? (
                /* 성공 화면 */
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ margin: "0 auto 20px" }}>
                    <circle cx="40" cy="40" r="38" fill="none" stroke="#10b981" strokeWidth="4" />
                    <path
                      d="M23 41l11 11 23-23"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="60"
                      strokeDashoffset="60"
                      style={{ animation: "drawCheck 0.4s ease-out 0.2s forwards" }}
                    />
                  </svg>
                  <h4 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: "0 0 10px 0" }}>
                    문의가 성공적으로 전달되었습니다!
                  </h4>
                  <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                    담당자가 내용을 접수 후 적어주신 연락처로<br />
                    최대한 신속하게 답변 연락드리겠습니다. 감사합니다.
                  </p>
                </div>
              ) : (
                /* 입력 폼 */
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* 카테고리 태그 */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
                      어떤 문의이신가요?
                    </label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["AI온라인전단지", "매물 등록", "제휴/제안", "기타"].map((cat) => {
                        const isSel = category === cat;
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              setCategory(cat);
                              setContent(""); // 다른 카테고리로 변경 시 본문 초기화
                            }}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 18,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              border: `1.5px solid ${isSel ? "#2563eb" : "#cbd5e1"}`,
                              background: isSel ? "#eff6ff" : "#fff",
                              color: isSel ? "#2563eb" : "#475569",
                              transition: "all 0.15s"
                            }}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 정보 인풋 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                        성함 / 상호 <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="홍길동"
                        required
                        style={{
                          width: "100%",
                          height: 42,
                          padding: "0 12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          fontSize: 13,
                          outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                        연락처 <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="010-0000-0000"
                        required
                        maxLength={13}
                        style={{
                          width: "100%",
                          height: 42,
                          padding: "0 12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          fontSize: 13,
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  {/* 빠른 질문 선택 태그 (이탈방지 꿀팁) */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                      ⚡ 추천 문의 (클릭 시 자동 입력)
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {getQuickTags().map((tag, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleTagClick(tag)}
                          style={{
                            textAlign: "left",
                            padding: "8px 12px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            fontSize: 12,
                            color: "#475569",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#2563eb";
                            e.currentTarget.style.background = "#eff6ff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.background = "#f8fafc";
                          }}
                        >
                          📍 {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 문의 내용 */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                      상세 문의 내용 <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="궁금한 내용을 구체적으로 작성해 주실수록 명쾌한 답변이 가능합니다."
                      required
                      style={{
                        width: "100%",
                        height: 90,
                        padding: "10px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        fontSize: 13,
                        outline: "none",
                        resize: "none",
                        lineHeight: 1.5
                      }}
                    />
                  </div>

                  {/* 약관 동의 */}
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <input
                      type="checkbox"
                      id="widget-agree"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: "#2563eb", cursor: "pointer" }}
                    />
                    <label htmlFor="widget-agree" style={{ fontSize: 11, color: "#475569", fontWeight: 600, cursor: "pointer" }}>
                      개인정보 수집 및 동의 (답변 및 연락 목적) [필수]
                    </label>
                  </div>

                  {/* 전송 버튼 */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      height: 46,
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
                    }}
                  >
                    {loading ? "전송 처리 중..." : "문의하기 전송 완료"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* [B] 모바일용 바텀 시트 (PC 모달과 동일한 로직, 디자인만 다름) */}
          <div
            className="inquiry-panel-mobile"
            style={{
              display: "none",
              flexDirection: "column",
              width: "100%",
              maxHeight: "85vh",
              background: "#ffffff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              boxShadow: "0 -10px 30px rgba(0, 0, 0, 0.15)",
              overflow: "hidden",
              position: "absolute",
              bottom: 0,
              left: 0,
              animation: "bottomSheetSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              fontFamily: "'Pretendard', sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 바텀시트 손잡이(드래그 인디케이터) */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px 0" }}>
              <div style={{ width: 40, height: 4, background: "#cbd5e1", borderRadius: 2 }}></div>
            </div>

            {/* 헤더 */}
            <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", margin: 0 }}>⚡ 플랫폼 신속 1:1문의</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  color: "#64748b",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            {/* 바텀시트 본문 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 30px 20px" }}>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 8px 0" }}>
                    문의 접수가 완료되었습니다!
                  </h4>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.4 }}>
                    담당자가 번호 확인 후 친절하고 신속하게<br />
                    안내 전화를 드리도록 하겠습니다.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* 카테고리 */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                      문의 카테고리
                    </label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["AI온라인전단지", "매물 등록", "제휴/제안", "기타"].map((cat) => {
                        const isSel = category === cat;
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              setCategory(cat);
                              setContent("");
                            }}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 15,
                              fontSize: 11,
                              fontWeight: 700,
                              border: `1.5px solid ${isSel ? "#2563eb" : "#e2e8f0"}`,
                              background: isSel ? "#eff6ff" : "#fff",
                              color: isSel ? "#2563eb" : "#475569"
                            }}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 인풋 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
                        성함 / 상호 <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="이름 또는 공인중개사명"
                        required
                        style={{
                          width: "100%",
                          height: 40,
                          padding: "0 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 12,
                          outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
                        연락처 <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="010-0000-0000"
                        required
                        maxLength={13}
                        style={{
                          width: "100%",
                          height: 40,
                          padding: "0 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 12,
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  {/* 빠른 질문 */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
                      ⚡ 간편 문의 자동 작성 (선택)
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {getQuickTags().map((tag, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleTagClick(tag)}
                          style={{
                            textAlign: "left",
                            padding: "6px 10px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                            fontSize: 11,
                            color: "#475569",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          📍 {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 내용 */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
                      상세 내용 <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="내용을 채워주세요."
                      required
                      style={{
                        width: "100%",
                        height: 70,
                        padding: "8px 10px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: 12,
                        outline: "none",
                        resize: "none",
                        lineHeight: 1.4
                      }}
                    />
                  </div>

                  {/* 전송 */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      height: 44,
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 800,
                      boxShadow: "0 4px 10px rgba(37,99,235,0.15)"
                    }}
                  >
                    {loading ? "보내는 중..." : "간편 문의 완료"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
