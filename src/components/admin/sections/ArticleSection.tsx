"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import { getArticles, deleteArticle, adminUpdateArticleStatus, adminUpdateArticleFlags } from "@/app/actions/article";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import NewsWriteForm from "@/components/admin/NewsWriteForm";
import ArticleDetailPanel from "./ArticleDetailPanel";

const REJECT_REASONS = [
  "사진 화질 불량 또는 이미지 누락",
  "제목 및 본문 오타 수정 요망",
  "사실 확인 필요 (내용 불충분)",
  "기타 사유 (직접 입력)"
];

export default function ArticleSection({ theme, initialData }: AdminSectionProps & { initialData?: any[] }) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [dbArticles, setDbArticles] = useState<any[]>(initialData || []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [articleFilter, setArticleFilter] = useState("전체");
  const [checkedArticleIds, setCheckedArticleIds] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedArticleIdsForReject, setSelectedArticleIdsForReject] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const editId = searchParams.get("id");
  const showWriteForm = action === "write";

  const [searchArticleNo, setSearchArticleNo] = useState("");
  const [searchSection, setSearchSection] = useState("전체");
  const [searchSection2, setSearchSection2] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilters, setActiveFilters] = useState({ articleNo: "", section: "전체", section2: "전체", keyword: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [sortBy, setSortBy] = useState("published_at");
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ 전체: 0, 승인대기: 0, 발행됨: 0, 예약됨: 0, 작성중: 0, 반려: 0, 헤드라인: 0, 중요: 0 });

  const loadData = async () => {
    const params: any = {
      page: currentPage,
      limit: pageSize,
      orderBy: sortBy,
    };

    if (articleFilter === "승인대기") params.status = "PENDING";
    else if (articleFilter === "발행됨") params.status = "APPROVED";
    else if (articleFilter === "예약됨") params.status = "SCHEDULED";
    else if (articleFilter === "작성중") params.status = "DRAFT";
    else if (articleFilter === "반려") params.status = "REJECTED";

    if (activeFilters.articleNo) params.articleNo = activeFilters.articleNo;
    if (activeFilters.section !== "전체") params.section1 = activeFilters.section;
    if (activeFilters.section2 !== "전체") params.section2 = activeFilters.section2;
    if (activeFilters.keyword) params.searchKeyword = activeFilters.keyword;

    if (exposureFilter === "일반") {
      params.is_important = false;
      params.is_headline = false;
    } else if (exposureFilter === "중요") {
      params.is_important = true;
    } else if (exposureFilter === "헤드라인") {
      params.is_headline = true;
    }

    const res = await getArticles(params);
    if (res.success) {
      setDbArticles(res.data || []);
      setTotalCount(res.count || 0);
    }

    // Fetch tab counts via server action (admin client, bypasses RLS)
    const [allRes, pendingRes, approvedRes, scheduledRes, draftRes, rejectedRes, headlineRes, importantRes] = await Promise.all([
      getArticles({ limit: 1 }),
      getArticles({ status: "PENDING", limit: 1 }),
      getArticles({ status: "APPROVED", limit: 1 }),
      getArticles({ status: "SCHEDULED", limit: 1 }),
      getArticles({ status: "DRAFT", limit: 1 }),
      getArticles({ status: "REJECTED", limit: 1 }),
      getArticles({ is_headline: true, limit: 1 }),
      getArticles({ is_important: true, limit: 1 }),
    ]);
    setCounts({
      전체: allRes.count || 0,
      승인대기: pendingRes.count || 0,
      발행됨: approvedRes.count || 0,
      예약됨: scheduledRes.count || 0,
      작성중: draftRes.count || 0,
      반려: rejectedRes.count || 0,
      헤드라인: headlineRes.count || 0,
      중요: importantRes.count || 0,
    });
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [currentPage, articleFilter, exposureFilter, activeFilters, pageSize, sortBy]);

  // 최고관리자 기사관리: AI 에이전트 초안 포함 모든 기사 표시
  const baseArticles = dbArticles;
  const filtered = dbArticles;

  if (action === "detail" && editId) {
    return <ArticleDetailPanel articleId={editId} onBack={() => router.push('?menu=article')} onEdit={() => router.push(`?menu=article&action=write&id=${editId}`)} />;
  }

  if (showWriteForm) {
    return <NewsWriteForm />;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>기사관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 승인대기 {counts.승인대기}건 / 전체 {counts.전체}건 )
        </span>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", background: "#fef2f2", padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca" }}>
            📌 헤드라인: {counts.헤드라인}건
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", background: "#fffbeb", padding: "4px 10px", borderRadius: 6, border: "1px solid #fde68a" }}>
            ⭐ 중요기사: {counts.중요}건
          </span>
        </div>
      </div>

      {/* 필터 검색 바 (상단으로 분리) */}
      <div style={{ padding: "16px 24px", background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>기사번호</label>
          <input type="text" value={searchArticleNo} onChange={e => setSearchArticleNo(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { setActiveFilters({ articleNo: searchArticleNo, section: searchSection, section2: searchSection2, keyword: searchKeyword }); if (searchArticleNo || searchKeyword || searchSection !== "전체" || searchSection2 !== "전체") setArticleFilter("전체"); setCurrentPage(1); } }} placeholder="번호 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 130 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>1차섹션</label>
          <select value={searchSection} onChange={e => { setSearchSection(e.target.value); setSearchSection2("전체"); }} style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 120 }}>
            <option value="전체">전체</option>
            <option value="공실뉴스">공실뉴스</option>
            <option value="부동산·경제">부동산·경제</option>
            <option value="AI마케팅">AI마케팅</option>
            <option value="라이프·오피니언">라이프·오피니언</option>
            <option value="우리동네부동산">우리동네부동산</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>2차섹션</label>
          <select value={searchSection2} onChange={e => setSearchSection2(e.target.value)} style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 150 }}>
            <option value="전체">전체</option>
            {searchSection === "공실뉴스" && (<><option value="아파트/오피스텔">아파트/오피스텔</option><option value="빌라/주택">빌라/주택</option><option value="원룸/투룸(풀옵션)">원룸/투룸(풀옵션)</option><option value="상가/사무실/공장/토지">상가/사무실/공장/토지</option><option value="신축/분양/경매">신축/분양/경매</option></>)}
            {searchSection === "부동산·경제" && (<><option value="부동산 정책/동향">부동산 정책/동향</option><option value="경제/재테크/주식">경제/재테크/주식</option><option value="법률/세무 지식">법률/세무 지식</option></>)}
            {searchSection === "AI마케팅" && (<><option value="AI/NEWS">AI/NEWS</option><option value="부동산유튜브/블로그">부동산유튜브/블로그</option><option value="공실/임대관리">공실/임대관리</option></>)}
            {searchSection === "라이프·오피니언" && (<><option value="인물/인터뷰">인물/인터뷰</option><option value="부동산/인테리어 꿀팁">부동산/인테리어 꿀팁</option><option value="맛집/여행/건강">맛집/여행/건강</option><option value="자유 에세이">자유 에세이</option></>)}
            {searchSection === "우리동네부동산" && (<><option value="아파트/오피스텔">아파트/오피스텔</option><option value="빌라/주택">빌라/주택</option><option value="원룸/투룸(풀옵션)">원룸/투룸(풀옵션)</option><option value="상가/사무실/공장/토지">상가/사무실/공장/토지</option><option value="신축/분양/경매">신축/분양/경매</option></>)}
          </select>
        </div>
        <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { setActiveFilters({ articleNo: searchArticleNo, section: searchSection, section2: searchSection2, keyword: searchKeyword }); if (searchArticleNo || searchKeyword || searchSection !== "전체" || searchSection2 !== "전체") setArticleFilter("전체"); setCurrentPage(1); } }} placeholder="기사 제목 또는 기자명 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>정렬</label>
          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }} style={{ height: 36, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 110 }}>
            <option value="published_at">발행일 최신순</option>
            <option value="updated_at">수정일 최신순</option>
            <option value="created_at">작성일 최신순</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>보기</label>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ height: 36, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 90 }}>
            <option value={10}>10개씩</option>
            <option value={20}>20개씩</option>
            <option value={30}>30개씩</option>
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
          </select>
        </div>
        <button onClick={() => { setActiveFilters({ articleNo: searchArticleNo, section: searchSection, section2: searchSection2, keyword: searchKeyword }); if (searchArticleNo || searchKeyword || searchSection !== "전체" || searchSection2 !== "전체") setArticleFilter("전체"); setCurrentPage(1); }} style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
        <button onClick={() => { setSearchArticleNo(""); setSearchSection("전체"); setSearchSection2("전체"); setSearchKeyword(""); setActiveFilters({ articleNo: "", section: "전체", section2: "전체", keyword: "" }); setArticleFilter("전체"); setCurrentPage(1); }} style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          <div style={{ display: "flex" }}>
            {["전체", "승인대기", "발행됨", "예약됨", "작성중", "반려"].map(tab => {
              let count = counts[tab as keyof typeof counts] || 0;

              return (
                <button key={tab} onClick={() => {
                  setArticleFilter(tab);
                  setCheckedArticleIds([]);
                  setActiveFilters({ articleNo: "", section: "전체", section2: "전체", keyword: "" });
                  setSearchArticleNo(""); setSearchSection("전체"); setSearchSection2("전체"); setSearchKeyword("");
                  setCurrentPage(1);
                }}
                  style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: articleFilter === tab ? 800 : 600, color: articleFilter === tab ? "#3b82f6" : textSecondary, borderBottom: articleFilter === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  {tab}
                  <span style={{ 
                    background: tab === "전체" ? "#e5e7eb" : tab === "승인대기" ? "#8b5cf6" : tab === "발행됨" ? "#10b981" : tab === "예약됨" ? "#f59e0b" : tab === "작성중" ? "#9ca3af" : "#ef4444",
                    color: tab === "전체" ? "#4b5563" : "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>노출필터:</span>
            <select value={exposureFilter} onChange={e => { setExposureFilter(e.target.value); setCurrentPage(1); }} style={{ height: 30, padding: "0 8px", border: `1px solid ${border}`, borderRadius: 4, fontSize: 12, color: textPrimary, background: darkMode ? "#1e293b" : "#fff", outline: "none", fontWeight: 600, cursor: "pointer" }}>
              <option value="전체">전체보기</option>
              <option value="일반">일반기사</option>
              <option value="중요">⭐ 중요기사 [중]</option>
              <option value="헤드라인">📌 헤드라인 [해]</option>
            </select>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => router.push("?menu=article&action=write")} style={{ display: "flex", alignItems: "center", height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", gap: 6 }}>+ 새 기사 작성</button>
          <button onClick={async () => {
            if (checkedArticleIds.length === 0) { alert("승인할 기사를 선택하세요."); return; }
            if (confirm(`선택한 ${checkedArticleIds.length}건의 기사를 일괄 승인(발행)하시겠습니까?`)) {
              // 낙관적 업데이트
              setDbArticles(prev => prev.map(a => checkedArticleIds.includes(a.id) ? { ...a, status: 'APPROVED' } : a));
              const res = await adminUpdateArticleStatus(checkedArticleIds, 'APPROVED');
              if (res.success) { setCheckedArticleIds([]); }
              else { alert("오류가 발생했습니다: " + res.error); getArticles().then(r => setDbArticles(r.data || [])); }
            }
          }} style={{ height: 36, padding: "0 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ 선택 승인</button>
          <button onClick={() => {
            if (checkedArticleIds.length === 0) { alert("반려할 기사를 선택하세요."); return; }
            setSelectedArticleIdsForReject(checkedArticleIds);
            setShowRejectModal(true);
          }} style={{ height: 36, padding: "0 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🚫 선택 반려</button>
          <button onClick={async () => {
            if (checkedArticleIds.length === 0) { alert("삭제할 기사를 선택하세요."); return; }
            if (confirm(`선택한 ${checkedArticleIds.length}건의 기사를 삭제하시겠습니까?`)) {
              setDbArticles(prev => prev.filter(a => !checkedArticleIds.includes(a.id)));
              for (const id of checkedArticleIds) { await deleteArticle(id); }
              setCheckedArticleIds([]);
            }
          }} style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            선택삭제
          </button>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6" }} onChange={(e) => setCheckedArticleIds(e.target.checked ? filtered.map(a => a.id) : [])} />
                </th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 60 }}>번호</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>상태</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>광고</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>섹션</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>기사 제목</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>기자명</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>작성일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>발행일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>수정일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 150 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: textSecondary }}>조회된 기사가 없습니다.</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <input type="checkbox" style={{ accentColor: "#3b82f6" }} checked={checkedArticleIds.includes(a.id)} onChange={(e) => {
                      if (e.target.checked) setCheckedArticleIds(prev => [...prev, a.id]);
                      else setCheckedArticleIds(prev => prev.filter(id => id !== a.id));
                    }} />
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>
                    {a.article_no || '-'}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    {a.status === 'PENDING' && <span style={{ padding: "4px 8px", background: "#8b5cf6", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>승인대기</span>}
                    {a.status === 'APPROVED' && <span style={{ padding: "4px 8px", background: "#10b981", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>발행됨</span>}
                    {a.status === 'REJECTED' && <span style={{ padding: "4px 8px", background: "#ef4444", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>반려됨</span>}
                    {a.status === 'DRAFT' && <span style={{ padding: "4px 8px", background: "#9ca3af", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>작성중</span>}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <button 
                        onClick={async () => {
                          setDbArticles(prev => prev.map(p => p.id === a.id ? { ...p, is_important: false, is_headline: false } : p));
                          await adminUpdateArticleFlags(a.id, false, false);
                        }}
                        title="일반 기사"
                        style={{ width: 24, height: 24, padding: 0, border: "1px solid #ddd", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", background: (!a.is_important && !a.is_headline) ? "#3b82f6" : "#fff", color: (!a.is_important && !a.is_headline) ? "#fff" : "#888", transition: "all 0.2s" }}
                      >일</button>
                      <button 
                        onClick={async () => {
                          const newImportant = !a.is_important;
                          setDbArticles(prev => prev.map(p => p.id === a.id ? { ...p, is_important: newImportant } : p));
                          await adminUpdateArticleFlags(a.id, newImportant, !!a.is_headline);
                        }}
                        title="중요 기사 (카테고리 상단 노출)"
                        style={{ width: 24, height: 24, padding: 0, border: "1px solid #ddd", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", background: a.is_important ? "#f59e0b" : "#fff", color: a.is_important ? "#fff" : "#888", transition: "all 0.2s" }}
                      >중</button>
                      <button 
                        onClick={async () => {
                          const newHeadline = !a.is_headline;
                          setDbArticles(prev => prev.map(p => p.id === a.id ? { ...p, is_headline: newHeadline } : p));
                          await adminUpdateArticleFlags(a.id, !!a.is_important, newHeadline);
                        }}
                        title="헤드라인 기사 (메인 영역 노출)"
                        style={{ width: 24, height: 24, padding: 0, border: "1px solid #ddd", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", background: a.is_headline ? "#ef4444" : "#fff", color: a.is_headline ? "#fff" : "#888", transition: "all 0.2s" }}
                      >해</button>
                    </div>
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12, minWidth: 100 }}>
                    <div>{a.section1 || '-'}</div>
                    {a.section2 && <div style={{ color: darkMode ? "#9ca3af" : "#6b7280", fontSize: 11, marginTop: 2 }}>{a.section2}</div>}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "left", verticalAlign: "middle" }}>
                    <button onClick={() => router.push(`?menu=article&action=detail&id=${a.id}`)} 
                      style={{ background: "none", border: "none", fontWeight: 700, fontSize: 15, color: textPrimary, textDecoration: "none", cursor: "pointer", padding: 0, textAlign: "left", wordBreak: "keep-all" }}>
                      {a.title || "(제목 없음)"}
                    </button>
                    {a.status === "REJECTED" && a.reject_reason && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>반려 사유: {a.reject_reason}</div>
                    )}
                    {a.status === "APPROVED" && a.reject_reason && a.reject_reason.includes("[AI 승인") && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#10b981", fontWeight: 600 }}>심사 피드백: {a.reject_reason}</div>
                    )}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textPrimary }}>{a.author_name || '-'}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>{a.created_at ? (() => { const d = new Date(a.created_at); return <><div>{d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}</div><div style={{color:'#9ca3af'}}>{d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}</div></>; })() : '-'}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>{a.published_at ? (() => { const d = new Date(a.published_at); return <><div>{d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}</div><div style={{color:'#9ca3af'}}>{d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}</div></>; })() : '-'}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>{a.updated_at ? (() => { const d = new Date(a.updated_at); return <><div>{d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}</div><div style={{color:'#9ca3af'}}>{d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}</div></>; })() : '-'}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button onClick={() => window.open(`/news/${a.article_no || a.id}`, '_blank')} style={{ width: 76, height: 32, padding: 0, justifyContent: "center", background: darkMode ? "#1e293b" : "#fff", color: darkMode ? "#93c5fd" : "#2563eb", border: `1px solid ${darkMode ? "#334155" : "#bfdbfe"}`, borderRadius: 4, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        미리보기
                      </button>
                      <button onClick={() => router.push(`?menu=article&action=write&id=${a.id}`)} style={{ width: 76, height: 32, padding: 0, justifyContent: "center", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        수정
                      </button>
                      <button onClick={async () => {
                        if (confirm("기사를 삭제하시겠습니까?")) {
                          setDbArticles(prev => prev.filter(p => p.id !== a.id));
                          const res = await deleteArticle(a.id);
                          if (!res.success) { alert("삭제 실패: " + res.error); getArticles().then(r => setDbArticles(r.data || [])); }
                        }
                      }} style={{ width: 76, height: 32, padding: 0, justifyContent: "center", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 페이징 컴포넌트 */}
        {totalCount > pageSize && (
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{ padding: "6px 12px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              이전
            </button>
            {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => {
              const pageNum = i + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: 32,
                    height: 32,
                    border: isCurrent ? "none" : `1px solid ${border}`,
                    borderRadius: 6,
                    background: isCurrent ? "#3b82f6" : (darkMode ? "#2c2d31" : "#fff"),
                    color: isCurrent ? "#fff" : textPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s"
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button 
              disabled={currentPage === Math.ceil(totalCount / pageSize)}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
              style={{ padding: "6px 12px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 13, fontWeight: 600, cursor: currentPage === Math.ceil(totalCount / pageSize) ? "not-allowed" : "pointer", opacity: currentPage === Math.ceil(totalCount / pageSize) ? 0.5 : 1 }}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 반려 사유 모달 */}
      {showRejectModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: darkMode ? "#1f2937" : "#fff", width: 420, borderRadius: 12, padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, color: textPrimary, fontWeight: 800 }}>기사 반려 사유 입력</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: textSecondary }}>선택한 기사를 반려 상태로 변경합니다. 작성자에게 전달할 반려 사유를 선택하거나 기입해주세요.</p>
            <select value={REJECT_REASONS.includes(rejectReason) ? rejectReason : "기타 사유 (직접 입력)"} onChange={(e) => setRejectReason(e.target.value === "기타 사유 (직접 입력)" ? "" : e.target.value)}
              style={{ width: "100%", padding: "12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, marginBottom: 12, outline: "none", color: textPrimary, background: darkMode ? "#374151" : "#fff" }}>
              {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {(!REJECT_REASONS.includes(rejectReason) || rejectReason === "기타 사유 (직접 입력)") && (
              <textarea value={rejectReason === "기타 사유 (직접 입력)" ? "" : rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="상세 반려 사유를 직접 입력하세요."
                style={{ width: "100%", height: 80, padding: 12, border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, resize: "none", outline: "none", color: textPrimary, background: darkMode ? "#374151" : "#fff", boxSizing: "border-box" }} />
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: "10px 18px", background: darkMode ? "#4b5563" : "#f3f4f6", color: darkMode ? "#fff" : "#4b5563", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button onClick={async () => {
                setDbArticles(prev => prev.map(a => selectedArticleIdsForReject.includes(a.id) ? { ...a, status: 'REJECTED' } : a));
                const res = await adminUpdateArticleStatus(selectedArticleIdsForReject, 'REJECTED', rejectReason);
                if (res.success) { setCheckedArticleIds([]); setShowRejectModal(false); }
                else { alert("처리 실패: " + res.error); getArticles().then(r => setDbArticles(r.data || [])); }
              }} style={{ padding: "10px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>반려 처리</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
