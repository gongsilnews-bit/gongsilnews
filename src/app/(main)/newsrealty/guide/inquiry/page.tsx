"use client";

import React, { useState } from "react";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function GuideInquiryPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    category: "입점 및 가입 문의",
    brokerName: "",
    phone: "",
    email: "",
    title: "",
    content: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 직방 호갱노노 CEO 1:1 동일 4분할 탭 ━━━ */}
      <GuideTabs activeTab="inquiry" />

      {/* ━━━ 본문 영역 ━━━ */}
      <main style={{ maxWidth: "800px", margin: "0 auto 100px", padding: "0 20px" }}>
        {/* 타이틀 */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            1:1문의
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            시스템 이용 중 궁금하신 점이나 제휴 관련 문의를 남겨주시면 담당자가 신속히 답변해 드립니다.
          </p>
        </div>

        {/* 문의 폼 (직방 스타일 상단 굵은 실선) */}
        <div style={{ borderTop: "2px solid #111827", paddingTop: "32px" }}>
          {submitted ? (
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                padding: "48px 24px",
                textAlign: "center",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                1:1 문의가 정상적으로 접수되었습니다
              </h3>
              <p style={{ fontSize: "14.5px", color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.6 }}>
                남겨주신 연락처로 담당 매니저가 확인 후 신속히 안내해 드리겠습니다.<br />
                (운영시간: 평일 10:00 ~ 18:00)
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#ff8e15",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                추가 문의 작성하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* 문의 유형 */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  문의 유형 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: "100%",
                    height: "46px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    color: "#1f2937",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="입점 및 가입 문의">입점 및 가입 문의</option>
                  <option value="매물 기사 송출 문의">매물 기사 송출 문의</option>
                  <option value="공동중개망 이용 문의">공동중개망 이용 문의</option>
                  <option value="뉴스 광고 영업 수익 문의">뉴스 광고 영업 수익 문의</option>
                  <option value="결제 및 세금계산서 문의">결제 및 세금계산서 문의</option>
                  <option value="기타 일반 문의">기타 일반 문의</option>
                </select>
              </div>

              {/* 중개업소명 & 연락처 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                    중개업소명 / 성함 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 공실부동산 김대표"
                    value={formData.brokerName}
                    onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                    style={{
                      width: "100%",
                      height: "46px",
                      padding: "0 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                    휴대전화 번호 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="예: 010-1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: "100%",
                      height: "46px",
                      padding: "0 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  문의 제목 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="문의하실 내용을 간략히 입력해 주세요"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: "100%",
                    height: "46px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 내용 */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  문의 내용 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="궁금하신 사항을 자세히 적어주시면 더욱 정확한 상담이 가능합니다."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* 제출 버튼 */}
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <button
                  type="submit"
                  style={{
                    padding: "14px 44px",
                    backgroundColor: "#ff8e15",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: 800,
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(255, 142, 21, 0.3)",
                  }}
                >
                  1:1 문의 접수하기
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
