"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GuideTabs from "@/components/newsrealty/GuideTabs";

export default function MobileGuideInquiryPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ category: "입점 및 가입 문의", brokerName: "", phone: "", title: "", content: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: "70px" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button type="button" onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: "18px", color: "#475569", cursor: "pointer", padding: "4px" }}>‹</button>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 800, color: "#111827", textDecoration: "none" }}>공실뉴스부동산</Link>
        </div>
        <Link href="/m/newsrealty/apply" style={{ fontSize: "12.5px", fontWeight: 800, color: "#ffffff", backgroundColor: "#ff8e15", padding: "5px 12px", borderRadius: "6px", textDecoration: "none" }}>입점신청</Link>
      </header>

      <GuideTabs activeTab="inquiry" isMobile={true} />

      <div style={{ padding: "0 16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 16px 0" }}>1:1문의</h1>

        <div style={{ borderTop: "2px solid #111827", paddingTop: "20px" }}>
          {submitted ? (
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "36px 16px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
              <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>1:1 문의가 접수되었습니다</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 18px 0", lineHeight: 1.5 }}>담당 매니저가 확인 후 연락드리겠습니다.</p>
              <button type="button" onClick={() => setSubmitted(false)} style={{ padding: "8px 18px", backgroundColor: "#ff8e15", color: "#ffffff", fontSize: "13px", fontWeight: 700, border: "none", borderRadius: "6px" }}>추가 작성</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>문의 유형</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ width: "100%", height: "42px", padding: "0 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}>
                  <option value="입점 및 가입 문의">입점 및 가입 문의</option>
                  <option value="매물 기사 송출 문의">매물 기사 송출 문의</option>
                  <option value="공동중개망 이용 문의">공동중개망 이용 문의</option>
                  <option value="기타 문의">기타 문의</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>중개업소명 / 성함</label>
                <input type="text" required placeholder="예: 공실부동산 김대표" value={formData.brokerName} onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })} style={{ width: "100%", height: "42px", padding: "0 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>휴대전화 번호</label>
                <input type="tel" required placeholder="예: 010-1234-5678" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: "100%", height: "42px", padding: "0 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>문의 내용</label>
                <textarea required rows={5} placeholder="문의하실 내용을 입력해 주세요." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>

              <button type="submit" style={{ width: "100%", height: "46px", backgroundColor: "#ff8e15", color: "#ffffff", fontSize: "15px", fontWeight: 800, border: "none", borderRadius: "8px", marginTop: "8px" }}>1:1 문의 접수하기</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
