"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import { getMyArticles, adminUpdateArticleStatus, checkArticleWritePermission, deleteArticle } from "@/app/actions/article";
import { getAuthorArticlesAdSettingsMap, updateArticlesAdSettings, AuthorBanner } from "@/app/actions/articleAd";
import { getAuthorEligibleVacancies, getAuthorArticlesVacancyMap, updateArticleAttachedVacancy, updateMultipleArticlesAttachedVacancy } from "@/app/actions/articleVacancy";
import ArticleVacancyDropdown from "@/components/admin/ArticleVacancyDropdown";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// ⚡ 5,566줄 대형 에디터를 지연 로딩하여 목록 화면 번들 용량을 80% 이상 절감
const NewsWriteForm = React.lazy(() => import("@/components/admin/NewsWriteForm"));
const ArticleDetailPanel = React.lazy(() => import("@/components/admin/sections/ArticleDetailPanel"));

interface MemberArticleSectionProps extends AdminSectionProps {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  /** 'realtor' | 'user' – 저장 후 돌아갈 admin 경로 판별용 */
  role?: string;
  initialData?: any[];
  initialAdSettings?: Record<string, { ad_type: string; custom_banner_id: string | null; banner_name: string | null }>;
  initialBanners?: AuthorBanner[];
}

export default function MemberArticleSection({
  theme,
  memberId,
  memberName,
  memberEmail,
  role,
  initialData,
  initialAdSettings,
  initialBanners,
}: MemberArticleSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [articles, setArticles] = useState<any[]>(initialData || []);
  const [filter, setFilter] = useState("전체");
  const [sortBy, setSortBy] = useState("published_at");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!initialData || initialData.length === 0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [writePermission, setWritePermission] = useState<{ checked: boolean; allowed: boolean; error?: string }>({ checked: false, allowed: false });

  // 배너광고 상태 및 일괄적용 state
  const [adSettingsMap, setAdSettingsMap] = useState<Record<string, { ad_type: string; custom_banner_id: string | null; banner_name: string | null }>>(initialAdSettings || {});
  const [authorBanners, setAuthorBanners] = useState<AuthorBanner[]>(initialBanners || []);
  const [activeDropdownArticleId, setActiveDropdownArticleId] = useState<string | null>(null);
  const [isBulkAdModalOpen, setIsBulkAdModalOpen] = useState(false);
  const [bulkSelectedBannerId, setBulkSelectedBannerId] = useState<string>("DEFAULT");
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  // 공실 연결 (유료 부동산 전용) state
  const [eligibleVacancies, setEligibleVacancies] = useState<any[]>([]);
  const [isPaidRealtor, setIsPaidRealtor] = useState(false);
  const [vacancySettingsMap, setVacancySettingsMap] = useState<Record<string, { vacancy_id: string; title: string; snapshot: any }>>({});
  const [isBulkVacancyModalOpen, setIsBulkVacancyModalOpen] = useState(false);
  const [bulkSelectedVacancyId, setBulkSelectedVacancyId] = useState<string>("NONE");
  const [isBulkVacancyApplying, setIsBulkVacancyApplying] = useState(false);
  
  const [searchArticleNo, setSearchArticleNo] = useState("");
  const [searchSection, setSearchSection] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilters, setActiveFilters] = useState({ articleNo: "", section: "전체", keyword: "" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const editId = searchParams.get("id");
  const showWriteForm = action === "write";
  const showDetail = action === "detail" && editId;

  const checkWritePermission = async () => {
    const result = await checkArticleWritePermission(memberId);
    if (!result.allowed) {
      alert(result.error || "기사 작성 권한이 없습니다.");
      return false;
    }
    return true;
  };

  // ⚡ 사전 로딩(Prefetch) 데이터가 도착하면 즉시 화면에 반영하여 로딩 스피너 제거
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setArticles(initialData);
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    if (initialAdSettings && Object.keys(initialAdSettings).length > 0) {
      setAdSettingsMap(initialAdSettings);
    }
  }, [initialAdSettings]);

  useEffect(() => {
    if (initialBanners && initialBanners.length > 0) {
      setAuthorBanners(initialBanners);
    }
  }, [initialBanners]);

  useEffect(() => {
    if (!showWriteForm || !memberId) return;
    checkArticleWritePermission(memberId).then(result => {
      setWritePermission({ checked: true, allowed: result.allowed, error: result.error });
    });
  }, [showWriteForm, memberId]);

  useEffect(() => {
    if (!memberId) return;
    getAuthorEligibleVacancies(memberId).then(res => {
      if (res.success) {
        setEligibleVacancies(res.vacancies || []);
        setIsPaidRealtor(res.isPaid);
      }
    });
    getAuthorArticlesVacancyMap(memberId).then(res => {
      if (res.success) {
        setVacancySettingsMap(res.vacancyMap || {});
      }
    });
  }, [memberId]);

  const fetchArticles = async () => {
    setLoading(true);
    const [res, adRes, vacRes, vacMapRes] = await Promise.all([
      getMyArticles(memberId),
      getAuthorArticlesAdSettingsMap(memberId),
      getAuthorEligibleVacancies(memberId),
      getAuthorArticlesVacancyMap(memberId),
    ]);
    if (res.success) setArticles(res.data || []);
    if (adRes.success) {
      setAdSettingsMap(adRes.settingsMap || {});
      setAuthorBanners(adRes.banners || []);
    }
    if (vacRes.success) {
      setEligibleVacancies(vacRes.vacancies || []);
      setIsPaidRealtor(vacRes.isPaid);
    }
    if (vacMapRes.success) {
      setVacancySettingsMap(vacMapRes.vacancyMap || {});
    }
    setLoading(false);
  };

  // 개별 기사 연결 공실 즉시 변경
  const handleSelectVacancy = async (articleId: string, vacancyId: string | null) => {
    const res = await updateArticleAttachedVacancy(articleId, vacancyId);
    if (res.success) {
      const selected = eligibleVacancies.find((v) => v.id === vacancyId);
      const title = selected ? (selected.building_name || selected.dong || "공실") : "";
      setVacancySettingsMap((prev) => ({
        ...prev,
        [articleId]: { vacancy_id: vacancyId || "", title, snapshot: selected || null },
      }));
      setToastMessage({
        text: vacancyId ? "기사에 공실 매물이 연결되었습니다." : "공실 연결이 해제되었습니다.",
        type: "success",
      });
    } else {
      setToastMessage({ text: res.error || "공실 설정 변경 실패", type: "error" });
    }
  };

  // 개별 기사 배너 즉시 변경
  const handleQuickChangeBanner = async (articleId: string, bannerVal: string) => {
    setActiveDropdownArticleId(null);
    let targetType: "DEFAULT" | "BANNER" | "NONE" = "DEFAULT";
    let customId: string | null = null;
    let sDate: string | null = null;
    let eDate: string | null = null;

    if (bannerVal === "NONE") {
      targetType = "NONE";
    } else if (bannerVal === "DEFAULT") {
      targetType = "DEFAULT";
    } else {
      targetType = "BANNER";
      customId = bannerVal;
      const bObj = authorBanners.find((b) => b.id === bannerVal);
      if (bObj) {
        sDate = bObj.start_date || null;
        eDate = bObj.end_date || null;
      }
    }

    const res = await updateArticlesAdSettings([articleId], memberId, {
      ad_type: targetType,
      custom_banner_id: customId,
      start_date: sDate,
      end_date: eDate,
    });
    if (res.success) {
      setToastMessage({ text: "기사 배너가 변경되었습니다.", type: "success" });
      fetchArticles();
    } else {
      setToastMessage({ text: res.error || "변경 실패", type: "error" });
    }
  };

  // 선택한 기사들 배너 일괄 적용
  const handleApplyBulkBanner = async () => {
    if (checkedIds.length === 0) {
      alert("배너를 적용할 기사를 1개 이상 선택해주세요.");
      return;
    }
    setIsBulkApplying(true);
    let targetType: "DEFAULT" | "BANNER" | "NONE" = "DEFAULT";
    let customId: string | null = null;
    let sDate: string | null = null;
    let eDate: string | null = null;

    if (bulkSelectedBannerId === "NONE") {
      targetType = "NONE";
    } else if (bulkSelectedBannerId === "DEFAULT") {
      targetType = "DEFAULT";
    } else {
      targetType = "BANNER";
      customId = bulkSelectedBannerId;
      const bObj = authorBanners.find((b) => b.id === bulkSelectedBannerId);
      if (bObj) {
        sDate = bObj.start_date || null;
        eDate = bObj.end_date || null;
      }
    }

    const res = await updateArticlesAdSettings(checkedIds, memberId, {
      ad_type: targetType,
      custom_banner_id: customId,
      start_date: sDate,
      end_date: eDate,
    });
    if (res.success) {
      setToastMessage({ text: `${checkedIds.length}개 기사에 배너가 일괄 적용되었습니다!`, type: "success" });
      setIsBulkAdModalOpen(false);
      setCheckedIds([]);
      fetchArticles();
    } else {
      setToastMessage({ text: res.error || "일괄 적용 실패", type: "error" });
    }
    setIsBulkApplying(false);
  };

  // 선택한 기사들 공실 일괄 적용 (유료 부동산 전용)
  const handleApplyBulkVacancy = async () => {
    if (checkedIds.length === 0) {
      alert("공실을 적용할 기사를 1개 이상 선택해주세요.");
      return;
    }
    setIsBulkVacancyApplying(true);
    const targetVacId = bulkSelectedVacancyId === "NONE" ? null : bulkSelectedVacancyId;
    const res = await updateMultipleArticlesAttachedVacancy(checkedIds, targetVacId);
    if (res.success) {
      setToastMessage({
        text: targetVacId
          ? `${checkedIds.length}개 기사에 공실 매물이 일괄 연결되었습니다!`
          : `${checkedIds.length}개 기사의 공실 연결이 일괄 해제되었습니다!`,
        type: "success",
      });
      setIsBulkVacancyModalOpen(false);
      setCheckedIds([]);
      fetchArticles();
    } else {
      setToastMessage({ text: res.error || "공실 일괄 적용 실패", type: "error" });
    }
    setIsBulkVacancyApplying(false);
  };

  useEffect(() => {
    if (!memberId) return;
    if (!initialData || initialData.length === 0) {
      fetchArticles();
    } else {
      // ⚡ 사전 로딩된 데이터가 있으면 화면은 즉시 띄우고 백그라운드에서 조용히 동기화
      getMyArticles(memberId).then(res => { if (res.success) setArticles(res.data || []); });
      getAuthorArticlesAdSettingsMap(memberId).then(adRes => {
        if (adRes.success) {
          setAdSettingsMap(adRes.settingsMap || {});
          setAuthorBanners(adRes.banners || []);
        }
      });
    }

    // Supabase Realtime Subscription for Toast Notifications
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const channel = supabase.channel(`articles_updates_\${memberId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "articles",
        filter: `author_id=eq.\${memberId}`
      }, (payload: any) => {
        const { old: oldData, new: newData } = payload;
        
        // 상태가 변경되었을 때만 알림 발생
        if (oldData && newData && oldData.status !== newData.status) {
          if (newData.status === "APPROVED") {
            setToastMessage({ text: `🎉 작성하신 기사가 승인 및 발행되었습니다!`, type: "success" });
          } else if (newData.status === "REJECTED") {
            setToastMessage({ text: `⚠️ 작성하신 기사가 반려되었습니다. 사유를 확인해주세요.`, type: "error" });
          } else if (newData.status === "PENDING") {
            setToastMessage({ text: `⏳ 기사 승인 심사가 시작되었습니다.`, type: "info" });
          }
          
          // 알림 후 데이터 새로고침
          fetchArticles();
          
          // 5초 뒤 토스트 닫기
          setTimeout(() => setToastMessage(null), 5000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId]);

  const filtered = articles.filter(a => {
    const isFuture = a.published_at && new Date(a.published_at).getTime() > new Date().getTime();
    if (filter === "승인대기" && a.status !== "PENDING") return false;
    if (filter === "발행됨" && (a.status !== "APPROVED" || isFuture)) return false;
    if (filter === "예약됨" && (a.status !== "APPROVED" || !isFuture)) return false;
    if (filter === "작성중" && a.status !== "DRAFT") return false;
    if (filter === "반려" && a.status !== "REJECTED") return false;

    if (activeFilters.articleNo && String(a.article_no) !== activeFilters.articleNo) return false;
    if (activeFilters.section !== "전체" && a.section1 !== activeFilters.section) return false;
    if (activeFilters.keyword) {
      const k = activeFilters.keyword.toLowerCase();
      if (!(a.title && a.title.toLowerCase().includes(k)) && 
          !(a.author_name && a.author_name.toLowerCase().includes(k))) return false;
    }
    return true;
  });

  const sortedArticles = [...filtered].sort((a, b) => {
    if (sortBy === "updated_at") return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    if (sortBy === "created_at") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    return new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime();
  });

  /* 승인신청: DRAFT → PENDING */
  const handleRequestApproval = async () => {
    console.log("[DEBUG] handleRequestApproval called, checkedIds:", checkedIds);
    if (checkedIds.length === 0) { alert("승인신청할 기사를 선택하세요."); return; }
    const drafts = checkedIds.filter(id => {
      const a = articles.find(x => x.id === id);
      return a && (a.status === "DRAFT" || a.status === "REJECTED");
    });
    if (drafts.length === 0) { alert("작성중 또는 반려된 기사만 승인신청할 수 있습니다."); return; }
    if (!confirm(`선택한 ${drafts.length}건의 기사를 승인신청하시겠습니까?`)) return;
    try {
      const res = await adminUpdateArticleStatus(drafts, "PENDING");
      if (res.success) { 
        setArticles(prev => prev.map(a => drafts.includes(a.id) ? { ...a, status: "PENDING" } : a));
        fetch('/api/agents/article-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleIds: drafts }) }).catch(console.error); 
        setCheckedIds([]);
        alert("승인신청이 완료되었습니다. AI 심사가 진행됩니다.");
      }
      else alert("승인신청 오류: " + (res.error || "알 수 없는 오류"));
    } catch (err: any) {
      alert("승인신청 중 예외 발생: " + err.message);
    }
  };

  /* 삭제 */
  const handleDelete = async (id: string) => {
    const a = articles.find(x => x.id === id);
    if (!a) return;
    if (!confirm("기사를 삭제하시겠습니까?")) return;
    const res = await deleteArticle(id);
    if (res.success) await fetchArticles();
    else alert("삭제 실패: " + res.error);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      PENDING: { bg: "#f59e0b", label: "승인대기" },
      APPROVED: { bg: "#10b981", label: "발행됨" },
      REJECTED: { bg: "#ef4444", label: "반려됨" },
      DRAFT: { bg: "#9ca3af", label: "작성중" },
    };
    const s = map[status] || { bg: "#9ca3af", label: status };
    return <span style={{ padding: "4px 8px", background: s.bg, color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{s.label}</span>;
  };

  if (showDetail && editId) {
    return (
      <React.Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: textSecondary }}>기사 상세 내용을 불러오는 중입니다...</div>}>
        <ArticleDetailPanel
          articleId={editId}
          onBack={() => router.push("?menu=article")}
          onEdit={() => router.push(`?menu=article&action=write&id=${editId}`)}
          role={role}
        />
      </React.Suspense>
    );
  }

  if (showWriteForm) {
    if (!writePermission.checked) {
      return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: textSecondary }}>기사 작성 권한을 확인하는 중입니다...</div>;
    }
    if (!writePermission.allowed) {
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: textSecondary }}>
          <div>{writePermission.error || "기사 작성 권한이 없습니다."}</div>
          <button type="button" onClick={() => router.push("?menu=article")} style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#374151", color: "#fff", cursor: "pointer" }}>기사관리로 돌아가기</button>
        </div>
      );
    }
    return (
      <React.Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: textSecondary }}>기사 에디터를 불러오는 중입니다...</div>}>
        <NewsWriteForm />
      </React.Suspense>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>기사관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 승인대기 {articles.filter(a => a.status === "PENDING").length}건 / 전체 {articles.length}건 )
        </span>
      </div>

      {/* 필터 검색 바 */}
      <div style={{ padding: "16px 24px", background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>기사번호</label>
          <input type="text" value={searchArticleNo} onChange={e => setSearchArticleNo(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { setActiveFilters({ articleNo: searchArticleNo, section: searchSection, keyword: searchKeyword }); if (searchArticleNo || searchKeyword || searchSection !== "전체") setFilter("전체"); } }} placeholder="번호 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 130 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>섹션</label>
          <select value={searchSection} onChange={e => setSearchSection(e.target.value)} style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 100 }}>
            <option value="전체">전체</option><option value="부동산뉴스">부동산뉴스</option><option value="분양정보">분양정보</option><option value="지역소식">지역소식</option><option value="인테리어">인테리어</option>
          </select>
        </div>
        <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { setActiveFilters({ articleNo: searchArticleNo, section: searchSection, keyword: searchKeyword }); if (searchArticleNo || searchKeyword || searchSection !== "전체") setFilter("전체"); } }} placeholder="기사 제목 또는 기자명 검색" style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>정렬</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 36, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 110 }}>
            <option value="published_at">발행일 최신순</option>
            <option value="updated_at">수정일 최신순</option>
            <option value="created_at">작성일 최신순</option>
          </select>
        </div>
        <button onClick={() => { setActiveFilters({ articleNo: searchArticleNo, section: searchSection, keyword: searchKeyword }); if (searchArticleNo || searchKeyword || searchSection !== "전체") setFilter("전체"); }} style={{ height: 36, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
        <button onClick={() => { setSearchArticleNo(""); setSearchSection("전체"); setSearchKeyword(""); setActiveFilters({ articleNo: "", section: "전체", keyword: "" }); setFilter("전체"); }} style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "승인대기", "발행됨", "예약됨", "작성중", "반려"].map(tab => {
            let count = 0;
            if (tab === "전체") count = articles.length;
            else if (tab === "승인대기") count = articles.filter(a => a.status === "PENDING").length;
            else if (tab === "발행됨") count = articles.filter(a => a.status === "APPROVED" && !(a.published_at && new Date(a.published_at).getTime() > new Date().getTime())).length;
            else if (tab === "예약됨") count = articles.filter(a => a.status === "APPROVED" && (a.published_at && new Date(a.published_at).getTime() > new Date().getTime())).length;
            else if (tab === "작성중") count = articles.filter(a => a.status === "DRAFT").length;
            else if (tab === "반려") count = articles.filter(a => a.status === "REJECTED").length;

            return (
              <button key={tab} onClick={() => { 
                setFilter(tab); 
                setCheckedIds([]); 
                setActiveFilters({ articleNo: "", section: "전체", keyword: "" });
                setSearchArticleNo(""); setSearchSection("전체"); setSearchKeyword("");
              }}
                style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: filter === tab ? 800 : 600, color: filter === tab ? "#3b82f6" : textSecondary, borderBottom: filter === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {tab}
                <span style={{ 
                  background: tab === "전체" ? "#e5e7eb" : tab === "승인대기" ? "#f59e0b" : tab === "발행됨" ? "#10b981" : tab === "예약됨" ? "#f59e0b" : tab === "작성중" ? "#9ca3af" : "#ef4444",
                  color: tab === "전체" ? "#4b5563" : "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 액션 버튼 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={async () => { if (await checkWritePermission()) router.push("?menu=article&action=write"); }} style={{ display: "flex", alignItems: "center", height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", gap: 6 }}>+ 새 기사 작성</button>
          <button onClick={() => { handleRequestApproval(); }}
            style={{ height: 36, padding: "0 16px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            📋 승인신청
          </button>
          <button
            onClick={() => {
              if (checkedIds.length === 0) {
                alert("배너를 일괄 적용할 기사를 먼저 체크박스로 선택해주세요.");
                return;
              }
              setIsBulkAdModalOpen(true);
            }}
            style={{
              height: 36,
              padding: "0 16px",
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            🏷️ 배너 일괄적용
          </button>
          <button
            onClick={() => {
              if (checkedIds.length === 0) {
                alert("공실을 일괄 적용할 기사를 먼저 체크박스로 선택해주세요.");
                return;
              }
              if (!isPaidRealtor) {
                alert("공실뉴스부동산 / 공실등록부동산 유료 회원 전용 기능입니다.");
                return;
              }
              setBulkSelectedVacancyId("NONE");
              setIsBulkVacancyModalOpen(true);
            }}
            style={{
              height: 36,
              padding: "0 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: isPaidRealtor ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
              opacity: isPaidRealtor ? 1 : 0.6,
            }}
            title={!isPaidRealtor ? "공실뉴스부동산 / 공실등록부동산 유료 회원 전용 기능입니다." : undefined}
          >
            🏢 공실 일괄적용
          </button>
          <span style={{ fontSize: 12, color: textSecondary, marginLeft: 4 }}>
            ※ 작성중/반려 기사만 승인신청 가능
          </span>
        </div>

        {/* 안내 배너 */}
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: darkMode ? "#1e293b" : "#eff6ff", borderRadius: 8, border: `1px solid ${darkMode ? "#334155" : "#bfdbfe"}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span style={{ fontSize: 13, color: darkMode ? "#93c5fd" : "#1d4ed8", fontWeight: 600 }}>
            기사를 작성 후 &quot;승인신청&quot;을 하면 최고관리자 검토 후 발행됩니다. 반려된 기사는 수정 후 재신청할 수 있습니다.
          </span>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto", padding: "0 0 8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 950 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6" }} onChange={(e) => setCheckedIds(e.target.checked ? filtered.map(a => a.id) : [])} checked={filtered.length > 0 && checkedIds.length === filtered.length} />
                </th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 60 }}>번호</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>상태</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>섹션</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>기사 제목</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>작성일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>발행일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>수정일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>배너광고</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>공실선택</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 150 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: textSecondary }}>불러오는 중...</td></tr>
              ) : sortedArticles.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: textSecondary }}>
                  {filter === "전체" ? "작성한 기사가 없습니다. '새 기사 작성' 버튼을 클릭하여 시작하세요." : "조회된 기사가 없습니다."}
                </td></tr>
              ) : sortedArticles.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <input type="checkbox" style={{ accentColor: "#3b82f6" }} checked={checkedIds.includes(a.id)} onChange={(e) => {
                      if (e.target.checked) setCheckedIds(prev => [...prev, a.id]);
                      else setCheckedIds(prev => prev.filter(id => id !== a.id));
                    }} />
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>
                    {a.article_no || '-'}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    {statusBadge(a.status)}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary }}>{a.section1 || "-"}</td>
                  <td style={{ padding: "16px 10px", textAlign: "left", verticalAlign: "middle" }}>
                    <button onClick={() => router.push(`?menu=article&action=detail&id=${a.id}`)}
                      style={{ background: "none", border: "none", fontWeight: 700, fontSize: 15, color: textPrimary, textDecoration: "none", cursor: "pointer", padding: 0 }}>
                      {a.title || "(제목 없음)"}
                    </button>
                    {a.status === "REJECTED" && a.reject_reason && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                        반려 사유: {a.reject_reason}
                      </div>
                    )}
                    {a.status === "APPROVED" && a.reject_reason && a.reject_reason.includes("[AI 승인") && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                        심사 피드백: {a.reject_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>
                    {a.created_at ? (() => { const d = new Date(a.created_at); return <><div>{d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}</div><div style={{color:'#9ca3af'}}>{d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}</div></>; })() : '-'}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>
                    {a.published_at ? (() => { const d = new Date(a.published_at); return <><div>{d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}</div><div style={{color:'#9ca3af'}}>{d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}</div></>; })() : '-'}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary, fontSize: 12 }}>
                    {a.updated_at ? (() => { const d = new Date(a.updated_at); return <><div>{d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}</div><div style={{color:'#9ca3af'}}>{d.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}</div></>; })() : '-'}
                  </td>

                  {/* 배너광고 상태 버튼 */}
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    {(() => {
                      const adInfo = adSettingsMap[a.id];
                      const adType = adInfo?.ad_type || "DEFAULT";
                      const bannerName = adInfo?.banner_name;
                      const isOpen = activeDropdownArticleId === a.id;

                      let label = "업체프로필";
                      let btnBg = darkMode ? "#1e293b" : "#eff6ff";
                      let btnColor = "#2563eb";
                      let btnBorder = darkMode ? "#334155" : "#bfdbfe";

                      if (adType === "NONE") {
                        label = "배너없음";
                        btnBg = darkMode ? "#2c2d31" : "#f3f4f6";
                        btnColor = "#9ca3af";
                        btnBorder = darkMode ? "#444" : "#d1d5db";
                      } else if (adType === "BANNER" && bannerName) {
                        label = bannerName;
                        btnBg = darkMode ? "#064e3b" : "#ecfdf5";
                        btnColor = "#059669";
                        btnBorder = darkMode ? "#065f46" : "#a7f3d0";
                      }

                      return (
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownArticleId(isOpen ? null : a.id);
                            }}
                            style={{
                              height: 28,
                              padding: "0 10px",
                              background: btnBg,
                              color: btnColor,
                              border: `1px solid ${btnBorder}`,
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              whiteSpace: "nowrap",
                              maxWidth: 110,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              transition: "all 0.15s",
                            }}
                            title={`클릭하여 배너 변경 (현재: ${label})`}
                          >
                            {label}
                            <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
                          </button>

                          {/* 빠른 변경 드롭다운 메뉴 */}
                          {isOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                marginTop: 4,
                                background: darkMode ? "#1e293b" : "#ffffff",
                                border: `1px solid ${border}`,
                                borderRadius: 8,
                                boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
                                zIndex: 100,
                                minWidth: 140,
                                padding: "6px 0",
                                textAlign: "left",
                              }}
                            >
                              <div style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, color: textSecondary, borderBottom: `1px solid ${border}` }}>
                                배너 변경
                              </div>
                              <button
                                type="button"
                                onClick={() => handleQuickChangeBanner(a.id, "DEFAULT")}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: adType === "DEFAULT" ? (darkMode ? "#334155" : "#eff6ff") : "transparent",
                                  color: adType === "DEFAULT" ? "#2563eb" : textPrimary,
                                  fontSize: 12,
                                  fontWeight: adType === "DEFAULT" ? 700 : 500,
                                  textAlign: "left",
                                  cursor: "pointer",
                                  display: "block",
                                }}
                              >
                                👤 업체프로필
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickChangeBanner(a.id, "NONE")}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: adType === "NONE" ? (darkMode ? "#334155" : "#eff6ff") : "transparent",
                                  color: adType === "NONE" ? "#ef4444" : textPrimary,
                                  fontSize: 12,
                                  fontWeight: adType === "NONE" ? 700 : 500,
                                  textAlign: "left",
                                  cursor: "pointer",
                                  display: "block",
                                }}
                              >
                                🚫 배너없음
                              </button>
                              {authorBanners.length > 0 && (
                                <div style={{ borderTop: `1px solid ${border}`, margin: "4px 0" }} />
                              )}
                              {authorBanners.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => handleQuickChangeBanner(a.id, b.id)}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    border: "none",
                                    background: adType === "BANNER" && adInfo?.custom_banner_id === b.id ? (darkMode ? "#334155" : "#ecfdf5") : "transparent",
                                    color: adType === "BANNER" && adInfo?.custom_banner_id === b.id ? "#059669" : textPrimary,
                                    fontSize: 12,
                                    fontWeight: adType === "BANNER" && adInfo?.custom_banner_id === b.id ? 700 : 500,
                                    textAlign: "left",
                                    cursor: "pointer",
                                    display: "block",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  🏷️ {b.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* 기사 연결 공실 선택 드롭다운 (유료 부동산 전용) */}
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <ArticleVacancyDropdown
                      articleId={a.id}
                      currentVacancyId={vacancySettingsMap[a.id]?.vacancy_id || null}
                      currentVacancyTitle={vacancySettingsMap[a.id]?.title || null}
                      vacanciesList={eligibleVacancies}
                      isPaidRealtor={isPaidRealtor}
                      onSelect={handleSelectVacancy}
                      darkMode={darkMode}
                    />
                  </td>

                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button onClick={() => window.open(`/news/${a.article_no || a.id}`, '_blank')} style={{ height: 30, padding: "0 12px", background: darkMode ? "#1e293b" : "#eff6ff", color: darkMode ? "#93c5fd" : "#2563eb", border: `1px solid ${darkMode ? "#334155" : "#bfdbfe"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        미리보기
                      </button>
                      <button onClick={() => router.push(`?menu=article&action=write&id=${a.id}`)}
                        style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        수정
                      </button>
                      <button onClick={() => handleDelete(a.id)}
                        style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 배너 일괄적용 모달 */}
      {isBulkAdModalOpen && (
        <div
          onClick={() => setIsBulkAdModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: 14,
              padding: "24px 28px",
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              border: `1px solid ${border}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: 0 }}>
                🏷️ 기사 배너 일괄적용
              </h3>
              <button
                onClick={() => setIsBulkAdModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: textSecondary }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: textSecondary, marginBottom: 18, lineHeight: 1.5 }}>
              선택하신 <strong style={{ color: "#3b82f6" }}>{checkedIds.length}개</strong>의 기사에 일괄 적용할 배너를 선택해주세요.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>
                적용할 배너
              </label>
              <select
                value={bulkSelectedBannerId}
                onChange={(e) => setBulkSelectedBannerId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: `1.5px solid #3b82f6`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: textPrimary,
                  background: darkMode ? "#1e293b" : "#f8fafc",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <optgroup label="── 등록된 내 배너 ──">
                  {authorBanners.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏷️ {b.name} {!b.is_active ? "(중지됨)" : "(진행중)"}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="── 기본 / 특수 설정 ──">
                  <option value="DEFAULT">👤 업체프로필 (기본 광고)</option>
                  <option value="NONE">🚫 배너없음 (숨김)</option>
                </optgroup>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setIsBulkAdModalOpen(false)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 6,
                  border: `1px solid ${border}`,
                  background: darkMode ? "#2c2d31" : "#f3f4f6",
                  color: textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleApplyBulkBanner}
                disabled={isBulkApplying}
                style={{
                  padding: "9px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "#059669",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isBulkApplying ? "적용 중..." : "일괄 적용하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공실 일괄 적용 모달 */}
      {isBulkVacancyModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setIsBulkVacancyModalOpen(false)}
        >
          <div
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
                🏢 기사 노출 공실 일괄 적용
              </h3>
              <button
                onClick={() => setIsBulkVacancyModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 20, color: textSecondary, cursor: "pointer", padding: 0 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: textSecondary, marginBottom: 18, lineHeight: 1.5 }}>
              선택하신 <strong style={{ color: "#2563eb" }}>{checkedIds.length}개</strong>의 기사에 일괄 노출할 공실 매물을 선택해주세요.<br />
              <span style={{ fontSize: 12, color: "#6b7280" }}>※ [부동산노출 + 일반인노출]로 등록된 활성 매물만 노출됩니다.</span>
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textSecondary, marginBottom: 6 }}>
                연결할 공실 매물 (최대 1개)
              </label>
              <select
                value={bulkSelectedVacancyId}
                onChange={(e) => setBulkSelectedVacancyId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: `1.5px solid #2563eb`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: textPrimary,
                  background: darkMode ? "#1e293b" : "#f8fafc",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="NONE">🚫 공실 미노출 (연결 해제)</option>
                {eligibleVacancies.map((v) => {
                  const formatMoney = (tradeType: string, deposit?: number, rent?: number) => {
                    const fmt = (val?: number) => {
                      if (!val || val === 0) return "0";
                      const m = Math.round(val / 10000);
                      if (m === 0) return "0";
                      const e = Math.floor(m / 10000);
                      const r = m % 10000;
                      let res = "";
                      if (e > 0) res += `${e}억`;
                      if (r > 0) res += `${r}만`;
                      return res || "0";
                    };
                    if (tradeType === "매매" || tradeType === "전세") return `[${tradeType} ${fmt(deposit)}]`;
                    if (tradeType === "월세" || tradeType === "단기") return `[${tradeType} ${fmt(deposit)}/${fmt(rent)}]`;
                    return `[${tradeType}]`;
                  };
                  const priceTag = formatMoney(v.trade_type, v.deposit, v.monthly_rent);
                  const addr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ") || "공실";
                  return (
                    <option key={v.id} value={v.id}>
                      🏢 {priceTag} {addr} {v.exclusive_m2 ? `(${v.exclusive_m2}㎡)` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setIsBulkVacancyModalOpen(false)}
                style={{
                  padding: "9px 16px",
                  borderRadius: 6,
                  border: `1px solid ${border}`,
                  background: darkMode ? "#2c2d31" : "#f3f4f6",
                  color: textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleApplyBulkVacancy}
                disabled={isBulkVacancyApplying}
                style={{
                  padding: "9px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isBulkVacancyApplying ? "적용 중..." : "일괄 적용하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification UI */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 40,
          right: 40,
          zIndex: 9999,
          padding: "16px 24px",
          background: toastMessage.type === "success" ? "#10b981" : toastMessage.type === "error" ? "#ef4444" : "#3b82f6",
          color: "#fff",
          borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontWeight: 700,
          fontSize: 15,
          animation: "slideIn 0.3s ease-out forwards"
        }}>
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, marginLeft: 10 }}>✕</button>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
