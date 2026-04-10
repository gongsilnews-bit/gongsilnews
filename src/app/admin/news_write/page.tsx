"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveArticle } from "@/app/actions/article";
import { createClient } from "@/utils/supabase/client";

/* ─── 타입 ─── */
type StatusType = "작성중" | "승인신청" | "반려";
type FormType = "일반" | "카드뉴스" | "갤러리";

import AdminSidebar from "@/components/admin/AdminSidebar";

export default function NewsWritePage() {
  const router = useRouter();

  /* ─── 상태 ─── */
  const [status, setStatus] = useState<StatusType>("작성중");
  const [formType, setFormType] = useState<FormType>("일반");
  const [publishDate, setPublishDate] = useState("2026-03-24");
  const [publishTime, setPublishTime] = useState("00:00");
  const [section1, setSection1] = useState("");
  const [section2, setSection2] = useState("");
  const [series, setSeries] = useState("");
  const [reporterName, setReporterName] = useState("김미숙");
  const [reporterEmail, setReporterEmail] = useState("gongsilnews@gmail.com");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isShortsRatio, setIsShortsRatio] = useState(false);
  const [photoCollapsed, setPhotoCollapsed] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const [fileCollapsed, setFileCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /* ── 현재 로그인 사용자 ID 가져오기 ── */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  /* ─── 키워드 추가 ─── */
  const handleKeywordAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && keyword.trim()) {
      e.preventDefault();
      const newKeywords = keyword.split(",").map(k => k.trim()).filter(k => k);
      setKeywords(prev => [...prev, ...newKeywords]);
      setKeyword("");
    }
  };

  const removeKeyword = (idx: number) => {
    setKeywords(prev => prev.filter((_, i) => i !== idx));
  };

  /* ── 기사 저장 ── */
  const handleSave = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!section1) {
      alert("1차 섹션을 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      // 노출시간 조합
      let publishedAt: string | null = null;
      if (publishDate) {
        publishedAt = `${publishDate}T${publishTime || "00:00"}:00`;
      }

      const result = await saveArticle({
        author_id: currentUserId || undefined,
        author_name: reporterName,
        author_email: reporterEmail,
        status: status,
        form_type: formType,
        section1,
        section2,
        series,
        title,
        subtitle,
        content,
        youtube_url: youtubeUrl,
        is_shorts: isShortsRatio,
        published_at: publishedAt,
        keywords,
        location_name: location,
      });

      if (result.success) {
        alert("✅ 기사가 저장되었습니다!");
        router.push("/admin");
      } else {
        alert("❌ 저장 실패: " + result.error);
      }
    } catch (err: any) {
      alert("❌ 오류 발생: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─── 공통 스타일 변수 ─── */
  const pageBg = "#f4f5f7";
  const cardBg = "#ffffff";
  const border = "#e1e4e8";
  const textPrimary = "#1f2937";
  const textSecondary = "#6b7280";
  const textMuted = "#9ca3af";
  const inputBg = "#fafafa";
  const accentBlue = "#3b82f6";
  const headerBg = "#ffffff";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: pageBg, overflow: "hidden" }}>
      <AdminSidebar activeMenu="article" />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: pageBg, overflow: "hidden" }}>
        {/* ═══ 상단 헤더 ═══ */}
      <header style={{
        height: 56, background: cardBg, borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between",
        flexShrink: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* 로고 */}
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>기사쓰기</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* 다크모드 토글 */}
          <button style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${border}`, background: "none", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: textSecondary }}>🌙</button>
          {/* 로그아웃 */}
          <button style={{ padding: "8px 16px", background: textPrimary, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>로그아웃</button>
          {/* 공실페이지 가기 */}
          <button onClick={() => router.push("/")} style={{ padding: "8px 16px", background: cardBg, color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 14 }}>⚙</span> 공실페이지 가기
          </button>
        </div>
      </header>

      {/* 컨텐츠 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* ═══ 3컬럼 레이아웃 ═══ */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px", display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ═══ 좌측 사이드바: 글쓰기도구 ═══ */}
        <aside style={{ width: 220, minWidth: 220, position: "sticky", top: 80, flexShrink: 0 }}>
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px 16px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: "0 0 16px 0" }}>글쓰기도구</h3>

            {/* 6개 아이콘 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 20 }}>
              {/* 사진 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6" }}>사진</span>
              </button>
              {/* 영상 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>영상</span>
              </button>
              {/* 파일 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>파일</span>
              </button>
              {/* 포토DB */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>포토DB</span>
              </button>
              {/* 임시보관함 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7L2 7"/><path d="M10 12h4"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>임시보관함</span>
              </button>
              {/* 사진편집 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>사진편집</span>
              </button>
            </div>

            {/* AI 마법사 카드 */}
            <div style={{ border: "2px solid #f59e0b", borderRadius: 12, padding: "18px 16px", background: "linear-gradient(135deg, #fffbeb, #fef3c7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#d97706" }}>AI 마법사</span>
              </div>
              <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6, margin: "0 0 14px 0" }}>
                매물 정보만 한 번 입력하면 기사, 블로그, 쇼츠 대본까지 5가지 콘텐츠를 AI가 한 번에 완성해 줍니다!
              </p>
              <button style={{
                width: "100%", padding: "12px 0", background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}>
                <span>✨</span> 실행하기
              </button>
            </div>
          </div>
        </aside>

        {/* ═══ 중앙 메인 폼: 기사쓰기 ═══ */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "32px 36px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 28px 0" }}>기사쓰기</h2>

            {/* ── 기사검토 상태 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, display: "flex", alignItems: "center", gap: 4 }}>
                기사검토
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: `1px solid ${textMuted}`, fontSize: 10, color: textMuted, cursor: "help" }}>ⓘ</span>
              </label>
              <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
                {(["작성중", "승인신청", "반려"] as StatusType[]).map(s => (
                  <button key={s} onClick={() => setStatus(s)} style={{
                    padding: "8px 18px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: status === s ? "#1f2937" : "transparent",
                    color: status === s ? "#fff" : textSecondary,
                    transition: "all 0.15s",
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* ── 형태 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "16px 20px", background: inputBg, borderRadius: 8, border: `1px solid ${border}` }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 60, display: "flex", alignItems: "center", gap: 4 }}>
                형태
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: `1px solid ${textMuted}`, fontSize: 10, color: textMuted, cursor: "help" }}>ⓘ</span>
              </label>
              <div style={{ display: "flex", gap: 0, background: "#e5e7eb", borderRadius: 6, padding: 2 }}>
                {(["일반", "카드뉴스", "갤러리"] as FormType[]).map(ft => (
                  <button key={ft} onClick={() => setFormType(ft)} style={{
                    padding: "7px 16px", border: "none", borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: formType === ft ? "#374151" : "transparent",
                    color: formType === ft ? "#fff" : textSecondary,
                    transition: "all 0.15s",
                  }}>{ft}</button>
                ))}
              </div>
            </div>

            {/* ── 노출시간 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, display: "flex", alignItems: "center", gap: 4 }}>
                노출시간
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: `1px solid ${textMuted}`, fontSize: 10, color: textMuted, cursor: "help" }}>ⓘ</span>
              </label>
              <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)}
                style={{ padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 12, fontSize: 13, color: textMuted }}>오전</span>
                <input type="time" value={publishTime} onChange={e => setPublishTime(e.target.value)}
                  style={{ padding: "10px 14px 10px 40px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
              </div>
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 섹션 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>섹션</label>
              <select value={section1} onChange={e => { setSection1(e.target.value); setSection2(""); }}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: section1 ? textPrimary : textMuted, background: cardBg, outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                <option value="">1차섹션 선택</option>
                <option value="우리동네부동산">우리동네부동산</option>
                <option value="뉴스/칼럼">뉴스/칼럼</option>
              </select>
              <select value={section2} onChange={e => setSection2(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: section2 ? textPrimary : textMuted, background: cardBg, outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                <option value="">2차섹션 전체</option>
                {section1 === "우리동네부동산" && (
                  <>
                    <option value="아파트·오피스텔">아파트·오피스텔</option>
                    <option value="빌라·주택">빌라·주택</option>
                    <option value="원룸·투룸">원룸·투룸</option>
                    <option value="상가·업무·공장·토지">상가·업무·공장·토지</option>
                    <option value="분양">분양</option>
                  </>
                )}
                {section1 === "뉴스/칼럼" && (
                  <>
                    <option value="부동산·주식·재테크">부동산·주식·재테크</option>
                    <option value="정치·경제·사회">정치·경제·사회</option>
                    <option value="세무·법률">세무·법률</option>
                    <option value="여행·건강·생활">여행·건강·생활</option>
                    <option value="IT·가전·가구">IT·가전·가구</option>
                    <option value="스포츠·연예·Car">스포츠·연예·Car</option>
                    <option value="인물·미션·기타">인물·미션·기타</option>
                  </>
                )}
              </select>
              <select value={series} onChange={e => setSeries(e.target.value)}
                style={{ width: 120, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: series ? textPrimary : textMuted, background: cardBg, outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                <option value="">연재</option>
              </select>
            </div>

            {/* ── 기자명 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>기자명</label>
              <input type="text" value={reporterName} onChange={e => setReporterName(e.target.value)}
                style={{ width: 140, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
              <input type="email" value={reporterEmail} onChange={e => setReporterEmail(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 제목 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>제목</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목을 입력하세요"
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
            </div>

            {/* ── 부제목 ── */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, paddingTop: 10 }}>부제목</label>
              <textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="부제목을 입력하세요(여러 줄 입력도 가능합니다.)" rows={3}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 0 0" }} />

            {/* ── 에디터 툴바 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "8px 12px", borderBottom: `1px solid ${border}`, background: "#fafafa", flexWrap: "wrap" }}>
              {/* 폰트 */}
              <select style={{ padding: "6px 8px", border: `1px solid ${border}`, borderRadius: 4, fontSize: 13, color: textPrimary, background: cardBg, cursor: "pointer", fontFamily: "inherit" }}>
                <option>sans-serif</option>
                <option>serif</option>
                <option>monospace</option>
              </select>
              {/* 크기 */}
              <select style={{ padding: "6px 8px", border: `1px solid ${border}`, borderRadius: 4, fontSize: 13, color: textPrimary, background: cardBg, cursor: "pointer", marginLeft: 4 }}>
                <option>16</option>
                <option>12</option>
                <option>14</option>
                <option>18</option>
                <option>20</option>
                <option>24</option>
              </select>
              <div style={{ width: 1, height: 20, background: border, margin: "0 6px" }} />
              {/* B I U S */}
              {["B", "I", "U"].map(btn => (
                <button key={btn} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: btn === "B" ? 800 : 400, fontStyle: btn === "I" ? "italic" : "normal", textDecoration: btn === "U" ? "underline" : "none", color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>{btn}</button>
              ))}
              {/* 취소선 */}
              <button style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "line-through" }}>S</button>
              {/* 지우개 */}
              <button style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2"><path d="M20 20H7L3 16l10-10 7 7-6 7"/><path d="M6 11l7 7"/></svg>
              </button>
              <div style={{ width: 1, height: 20, background: border, margin: "0 6px" }} />
              {/* 글자색 A▼ */}
              <button style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, fontWeight: 800, color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                A<span style={{ fontSize: 8, marginLeft: 1 }}>▼</span>
              </button>
              {/* 배경색 A▼ */}
              <button style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#f59e0b", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                A<span style={{ fontSize: 8, marginLeft: 1, color: textSecondary }}>▼</span>
              </button>
              <div style={{ width: 1, height: 20, background: border, margin: "0 6px" }} />
              {/* 정렬 */}
              <button style={{ padding: "6px 8px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: textSecondary, borderRadius: 4, display: "flex", alignItems: "center", gap: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
                <span style={{ fontSize: 8 }}>▼</span>
              </button>
              {/* 링크 */}
              <button style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
            </div>

            {/* ── 에디터 본문 영역 ── */}
            <div
              contentEditable
              suppressContentEditableWarning
              style={{
                minHeight: 360, padding: "20px 16px", border: `1px solid ${border}`, borderTop: "none",
                fontSize: 15, lineHeight: 1.8, color: textPrimary, outline: "none", background: cardBg,
                borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
              }}
              onInput={(e) => setContent(e.currentTarget.textContent || "")}
            />

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "28px 0 24px 0" }} />

            {/* ── 키워드 ── */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, paddingTop: 10 }}>키워드</label>
              <div style={{ flex: 1 }}>
                {keywords.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {keywords.map((kw, idx) => (
                      <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#f3f4f6", borderRadius: 20, fontSize: 13, color: textPrimary }}>
                        #{kw}
                        <button onClick={() => removeKeyword(idx)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: textMuted, padding: 0, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleKeywordAdd}
                  placeholder="키워드 입력 후 엔터 (콤마, 띄어쓰기로 여러 개 붙여넣기 가능)"
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 관련기사 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>관련기사</label>
              <button style={{ padding: "8px 14px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ 관련기사추가</button>
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 위치등록 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>위치등록</label>
              <button style={{ padding: "8px 14px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>지도검색</button>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="예: 37.490416, 127.518709"
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
              <button style={{ padding: "8px 14px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>#위도 경도 넣는법</button>
            </div>

            {/* ── 저장완료 버튼 ── */}
            <button 
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%", padding: "16px 0", 
                background: saving ? "#9ca3af" : accentBlue, 
                color: "#fff",
                border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, 
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.2s",
                opacity: saving ? 0.7 : 1,
              }}
              onMouseOver={e => { if (!saving) e.currentTarget.style.background = "#2563eb"; }}
              onMouseOut={e => { if (!saving) e.currentTarget.style.background = accentBlue; }}
            >
              {saving ? "⏳ 저장 중..." : "✓ 저장완료"}
            </button>
          </div>
        </main>

        {/* ═══ 우측 사이드바: 라이브러리 ═══ */}
        <aside style={{ width: 280, minWidth: 280, position: "sticky", top: 80, flexShrink: 0 }}>
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px 18px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: "0 0 16px 0" }}>라이브러리</h3>

            {/* 포토DB 간편검색 */}
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input type="text" placeholder="포토DB 간편검색"
                style={{ width: "100%", padding: "10px 36px 10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            {/* ── 사진 섹션 ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>사진</span>
                <button onClick={() => setPhotoCollapsed(!photoCollapsed)} style={{ width: 24, height: 24, border: `1px solid ${border}`, borderRadius: 4, background: cardBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: textMuted }}>
                  {photoCollapsed ? "+" : "−"}
                </button>
              </div>
              {!photoCollapsed && (
                <div style={{
                  border: `2px dashed #d1d5db`, borderRadius: 8, padding: "24px 16px",
                  textAlign: "center", color: textMuted, fontSize: 12, lineHeight: 1.6, cursor: "pointer",
                  background: "#fdfdfd",
                }}>
                  📷 마우스로 이미지를 끌어오거나, 클릭해주세요.<br />
                  <span style={{ fontSize: 11, color: "#b0b0b0" }}>(허용용량 10MB)</span>
                </div>
              )}
            </div>

            {/* ── 영상 섹션 ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>영상</span>
                <button onClick={() => setVideoCollapsed(!videoCollapsed)} style={{ width: 24, height: 24, border: `1px solid ${border}`, borderRadius: 4, background: cardBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: textMuted }}>
                  {videoCollapsed ? "+" : "−"}
                </button>
              </div>
              {!videoCollapsed && (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="YouTube영상링크입력"
                      style={{ flex: 1, padding: "8px 10px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
                    <button style={{ padding: "8px 12px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>입력하기</button>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: textSecondary, cursor: "pointer" }}>
                    <input type="checkbox" checked={isShortsRatio} onChange={e => setIsShortsRatio(e.target.checked)} style={{ accentColor: accentBlue }} />
                    쇼츠(세로) 영상으로 크기 맞춤
                  </label>
                </div>
              )}
            </div>

            {/* ── 파일 섹션 ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>파일</span>
                <button onClick={() => setFileCollapsed(!fileCollapsed)} style={{ width: 24, height: 24, border: `1px solid ${border}`, borderRadius: 4, background: cardBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: textMuted }}>
                  {fileCollapsed ? "+" : "−"}
                </button>
              </div>
              {!fileCollapsed && (
                <div style={{
                  border: `2px dashed #d1d5db`, borderRadius: 8, padding: "24px 16px",
                  textAlign: "center", color: textMuted, fontSize: 12, lineHeight: 1.6, cursor: "pointer",
                  background: "#fdfdfd",
                }}>
                  📎 마우스로 파일을 끌어오거나, 클릭해주세요.<br />
                  <span style={{ fontSize: 11, color: "#b0b0b0" }}>(허용용량 2MB)</span>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>
      </div>
      </main>
    </div>
  );
}
