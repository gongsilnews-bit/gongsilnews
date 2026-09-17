"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMyArticles, getArticles, getArticleTabCounts, adminUpdateArticleStatus, deleteArticle, adminReviseArticleWithFeedback } from "@/app/actions/article";
import { getAdminArticlesAdSettingsMap, getAuthorArticlesAdSettingsMap, adminUpdateArticlesAdSettings, updateArticlesAdSettings, AuthorBanner } from "@/app/actions/articleAd";
import { getAdminArticlesVacancyMap, getAuthorArticlesVacancyMap, getAuthorEligibleVacancies, updateArticleAttachedVacancy } from "@/app/actions/articleVacancy";
import MobileAdminLoading from "@/components/mobile/MobileAdminLoading";

const REJECT_REASONS = [
  "사진 화질 불량 또는 이미지 누락",
  "제목 및 본문 오타 수정 요망",
  "사실 확인 필요 (내용 불충분)",
  "기타 사유 (직접 입력)"
];

// 탭 이름 → 서버 status 파라미터 ("전체"는 status 필터 없음)
const STATUS_PARAM: Record<string, string | undefined> = {
  "전체": undefined,
  "승인대기": "PENDING",
  "발행됨": "APPROVED",
  "예약됨": "SCHEDULED",
  "작성중": "DRAFT",
  "반려": "REJECTED",
};

const EMPTY_COUNTS = { 전체: 0, 승인대기: 0, 발행됨: 0, 예약됨: 0, 작성중: 0, 반려: 0 };

const PAGE_SIZE = 30;

type ListParams = {
  page: number;
  limit: number;
  orderBy: "published_at" | "updated_at" | "created_at";
  slim: boolean;
  noCache: boolean;
  status?: string;
  searchKeyword?: string;
};

type EligibleVacancy = {
  id: string;
  building_name?: string | null;
  dong?: string | null;
  trade_type: string;
  deposit?: number;
  monthly_rent?: number;
};

// 공실 금액 축약 표기 (ArticleVacancyDropdown과 동일 규칙)
function formatShortMoney(tradeType: string, deposit?: number, rent?: number) {
  const format = (val?: number) => {
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
  if (tradeType === "매매" || tradeType === "전세") return `[${tradeType} ${format(deposit)}]`;
  if (tradeType === "월세" || tradeType === "단기") return `[${tradeType} ${format(deposit)}/${format(rent)}]`;
  return `[${tradeType}]`;
}

const BANNER_NONE = { bg: "#f3f4f6", color: "#9ca3af", border: "#d1d5db" };
const BANNER_SET = { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
const BANNER_DEFAULT = { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };

function MobileArticleAdmin() {
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [sortBy, setSortBy] = useState("published_at");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [articlePage, setArticlePage] = useState(1);
  const [articleTotal, setArticleTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE); // 일반 회원(내 기사) 화면 표시 개수
  const requestRef = useRef(0);

  // 배너광고 / 공실선택
  const [adSettingsMap, setAdSettingsMap] = useState<Record<string, { ad_type: string; custom_banner_id: string | null; banner_name: string | null }>>({});
  const [authorBanners, setAuthorBanners] = useState<AuthorBanner[]>([]);
  const [vacancyMap, setVacancyMap] = useState<Record<string, { vacancy_id: string; title: string; snapshot: unknown }>>({});
  // 공실 목록은 "기사 작성자" 기준이다. 관리자는 남의 기사도 다루므로 작성자별로 캐싱한다.
  const [vacancyOptions, setVacancyOptions] = useState<Record<string, { isPaid: boolean; vacancies: EligibleVacancy[] }>>({});
  const [loadingVacancyAuthor, setLoadingVacancyAuthor] = useState<string | null>(null);
  const [isPaidRealtor, setIsPaidRealtor] = useState(false);
  const [sheet, setSheet] = useState<{ type: "banner" | "vacancy"; articleId: string; authorId: string } | null>(null);

  // 반려 모달
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCustom, setRejectCustom] = useState("");

  const isAdmin = (() => {
    const r = userRole?.trim().toUpperCase() || '';
    return r === 'ADMIN' || r === '최고관리자' || r.includes('관리자');
  })();

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name, role").eq("id", user.id).single();
      if (data) {
        setMemberId(data.id);
        setUserName(data.name || "이름없음");
        setUserRole(data.role || "");
      }
      setAuthChecked(true);
    }
    init();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (previewId) {
        setPreviewId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [previewId]);

  const closePreview = () => {
    if (previewId) {
      setPreviewId(null);
      if (window.history.state?.previewOpen) {
        window.history.back();
      }
    }
  };

  const openPreview = (id: string) => {
    window.history.pushState({ previewOpen: true }, "");
    setPreviewId(String(id));
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_ARTICLE_OVERLAY') {
        closePreview();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [previewId]);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 배너/공실 설정은 목록과 별개로 조회한다 (목록 렌더링을 막지 않는다)
  const loadAdminMeta = (ids: string[], append = false) => {
    if (ids.length === 0) return;
    void getAdminArticlesAdSettingsMap(ids).then(res => {
      if (!res.success) return;
      setAdSettingsMap(prev => (append ? { ...prev, ...res.settingsMap } : res.settingsMap));
      setAuthorBanners(res.banners || []);
    });
    void getAdminArticlesVacancyMap(ids).then(res => {
      if (!res.success) return;
      setVacancyMap(prev => (append ? { ...prev, ...res.vacancyMap } : res.vacancyMap));
    });
  };

  const loadMemberMeta = (id: string) => {
    void getAuthorArticlesAdSettingsMap(id).then(res => {
      if (!res.success) return;
      setAdSettingsMap(res.settingsMap || {});
      setAuthorBanners(res.banners || []);
    });
    void getAuthorArticlesVacancyMap(id).then(res => {
      if (res.success) setVacancyMap(res.vacancyMap || {});
    });
  };

  // 작성자의 연결 가능 공실을 1회만 조회해 캐싱한다 (비즈니스회원은 서버 규칙상 isPaid=false)
  const ensureVacancyOptions = (authorId: string) => {
    if (!authorId || vacancyOptions[authorId]) return;
    setLoadingVacancyAuthor(authorId);
    void getAuthorEligibleVacancies(authorId).then(res => {
      setVacancyOptions(prev => ({
        ...prev,
        [authorId]: { isPaid: !!res.isPaid, vacancies: (res.vacancies || []) as EligibleVacancy[] },
      }));
      setLoadingVacancyAuthor(prev => (prev === authorId ? null : prev));
    });
  };

  // 로그인한 본인 기준 판정 (일반 회원의 공실선택 노출 여부)
  useEffect(() => {
    if (!memberId) return;
    void getAuthorEligibleVacancies(memberId).then(res => {
      if (!res.success) return;
      setIsPaidRealtor(res.isPaid);
      setVacancyOptions(prev => ({
        ...prev,
        [memberId]: { isPaid: res.isPaid, vacancies: (res.vacancies || []) as EligibleVacancy[] },
      }));
    });
  }, [memberId]);

  // 목록 조회 파라미터: 탭/검색어/정렬을 서버로 넘겨 DB 전체를 대상으로 조회한다.
  const buildListParams = (page: number) => {
    const params: ListParams = {
      page,
      limit: PAGE_SIZE,
      orderBy: sortBy as ListParams["orderBy"],
      slim: true,
      noCache: true,
    };
    const status = STATUS_PARAM[filter];
    if (status) params.status = status;
    const kw = activeKeyword.trim();
    if (kw) params.searchKeyword = kw;
    return params;
  };

  // 관리자: 목록은 30건씩 서버 페이징, 건수는 HEAD 카운트로 DB 전체 기준
  const loadAdminArticles = async (showLoading = true) => {
    const request = ++requestRef.current;
    if (showLoading) setLoading(true);
    const params = buildListParams(1);
    const listRequest = getArticles(params);
    void getArticleTabCounts({ status: params.status, searchKeyword: params.searchKeyword }).then(res => {
      if (request !== requestRef.current) return;
      if (res.success && res.data) setCounts(res.data);
    });
    const res = await listRequest;
    if (request !== requestRef.current) return;
    if (res.success) {
      setArticles(res.data || []);
      setArticleTotal(res.count || 0);
      setArticlePage(1);
      loadAdminMeta((res.data || []).map((a: { id: string }) => a.id));
    }
    setLoading(false);
  };

  // 일반 회원: 본인 기사만 받아 화면에서 30건씩 늘려 표시
  const loadMyOwnArticles = async (showLoading = true) => {
    const request = ++requestRef.current;
    if (showLoading) setLoading(true);
    const res = await getMyArticles(memberId!);
    if (request !== requestRef.current) return;
    if (res.success) {
      setArticles(res.data || []);
      setVisibleCount(PAGE_SIZE);
      loadMemberMeta(memberId!);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!memberId || !authChecked) return;
    void (async () => {
      if (isAdmin) await loadAdminArticles();
      else await loadMyOwnArticles();
    })();
  }, [memberId, authChecked, isAdmin, filter, activeKeyword, sortBy]);

  const refreshCounts = () => {
    if (!isAdmin) return;
    const request = requestRef.current;
    const params = buildListParams(1);
    void getArticleTabCounts({ status: params.status, searchKeyword: params.searchKeyword }).then(res => {
      if (request !== requestRef.current) return;
      if (res.success && res.data) setCounts(res.data);
    });
  };

  const refreshArticles = async () => {
    if (isAdmin) await loadAdminArticles(false);
    else await loadMyOwnArticles(false);
  };

  const loadMoreArticles = async () => {
    if (!isAdmin) { setVisibleCount(v => v + PAGE_SIZE); return; }
    if (isLoadingMore || articles.length >= articleTotal) return;
    setIsLoadingMore(true);
    const nextPage = articlePage + 1;
    const res = await getArticles(buildListParams(nextPage));
    if (res.success) {
      setArticles(prev => [...prev, ...(res.data || [])]);
      setArticlePage(nextPage);
      loadAdminMeta((res.data || []).map((a: { id: string }) => a.id), true);
    }
    setIsLoadingMore(false);
  };

  // 관리자는 서버에서 탭/검색/정렬이 적용된 결과를 그대로 쓰고, 일반 회원만 화면에서 거른다.
  const clientFiltered = articles.filter(a => {
    const isFuture = a.published_at && new Date(a.published_at).getTime() > new Date().getTime();
    if (filter === "승인대기" && a.status !== "PENDING") return false;
    if (filter === "발행됨" && (a.status !== "APPROVED" || isFuture)) return false;
    if (filter === "예약됨" && (a.status !== "APPROVED" || !isFuture)) return false;
    if (filter === "작성중" && a.status !== "DRAFT") return false;
    if (filter === "반려" && a.status !== "REJECTED") return false;
    if (activeKeyword) {
      const k = activeKeyword.toLowerCase();
      if (!(a.title && a.title.toLowerCase().includes(k)) && 
          !(a.author_name && a.author_name.toLowerCase().includes(k)) &&
          !(a.article_no && String(a.article_no).includes(k)) &&
          !(a.id && String(a.id).includes(k))) return false;
    }
    return true;
  });

  const clientSorted = [...clientFiltered].sort((a, b) => {
    if (sortBy === "updated_at") return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    if (sortBy === "created_at") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    return new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime();
  });

  const sortedArticles = isAdmin ? articles : clientSorted;
  const displayArticles = isAdmin ? sortedArticles : sortedArticles.slice(0, visibleCount);
  const totalForDisplay = isAdmin ? articleTotal : sortedArticles.length;
  const hasMore = displayArticles.length < totalForDisplay;

  // 승인신청 (일반 회원용)
  const handleRequestApproval = async (id: string) => {
    const a = articles.find(x => x.id === id);
    if (!a || (a.status !== "DRAFT" && a.status !== "REJECTED")) {
      alert("작성중 또는 반려된 기사만 승인신청할 수 있습니다.");
      return;
    }
    if (!confirm("이 기사를 승인신청하시겠습니까?")) return;
    const res = await adminUpdateArticleStatus([id], "PENDING");
    if (res.success) {
      fetch('/api/agents/article-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleIds: [id] }) }).catch(console.error);
      await refreshArticles();
    }
    else alert("오류: " + res.error);
  };

  // 승인 (관리자용)
  const handleApprove = async (id: string) => {
    if (!confirm("이 기사를 승인(발행)하시겠습니까?")) return;
    // 낙관적 업데이트
    setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a));
    const res = await adminUpdateArticleStatus([id], "APPROVED");
    if (!res.success) {
      alert("오류: " + res.error);
      await refreshArticles();
    } else {
      refreshCounts();
    }
  };

  // 반려 모달 열기 (관리자용)
  const openRejectModal = (id: string) => {
    setRejectTargetId(id);
    setRejectReason(REJECT_REASONS[0]);
    setRejectCustom("");
    setShowRejectModal(true);
  };

  // 반려 처리
  const handleReject = async () => {
    if (!rejectTargetId) return;
    const finalReason = rejectReason === "기타 사유 (직접 입력)" ? rejectCustom : rejectReason;
    if (!finalReason.trim()) {
      alert("반려 사유를 입력해주세요.");
      return;
    }
    // 낙관적 업데이트
    setArticles(prev => prev.map(a => a.id === rejectTargetId ? { ...a, status: 'REJECTED', reject_reason: finalReason } : a));
    setShowRejectModal(false);
    const res = await adminUpdateArticleStatus([rejectTargetId], "REJECTED", finalReason);
    if (!res.success) {
      alert("오류: " + res.error);
      await refreshArticles();
    } else {
      refreshCounts();
    }
  };

  // AI 반려 및 재작성 처리 (비동기 즉시 반려)
  const handleAiRevise = () => {
    if (!rejectTargetId) return;
    const finalReason = rejectReason === "기타 사유 (직접 입력)" ? rejectCustom : rejectReason;
    if (!finalReason.trim()) {
      alert("반려 사유를 입력해주세요.");
      return;
    }
    setShowRejectModal(false);
    setArticles(prev => prev.map(a => a.id === rejectTargetId ? { ...a, status: 'REJECTED', reject_reason: finalReason } : a));
    adminUpdateArticleStatus([rejectTargetId], "REJECTED", finalReason).then(() => refreshCounts());
  };

  // 배너광고 변경 (관리자는 전체 배너, 회원은 본인 배너)
  const handleChangeBanner = async (articleId: string, value: string) => {
    let adType: "DEFAULT" | "BANNER" | "NONE" = "DEFAULT";
    let customBannerId: string | null = null;
    let bannerName: string | null = null;
    if (value === "NONE") {
      adType = "NONE";
    } else if (value !== "DEFAULT") {
      adType = "BANNER";
      customBannerId = value;
      bannerName = authorBanners.find(b => b.id === value)?.name || null;
    }

    const prevInfo = adSettingsMap[articleId];
    setAdSettingsMap(prev => ({ ...prev, [articleId]: { ad_type: adType, custom_banner_id: customBannerId, banner_name: bannerName } }));
    setSheet(null);

    const res = isAdmin
      ? await adminUpdateArticlesAdSettings([articleId], { ad_type: adType, custom_banner_id: customBannerId })
      : await updateArticlesAdSettings([articleId], memberId!, { ad_type: adType, custom_banner_id: customBannerId });

    if (res.success) {
      showToast("배너광고 설정이 변경되었습니다.");
    } else {
      setAdSettingsMap(prev => {
        const next = { ...prev };
        if (prevInfo) next[articleId] = prevInfo; else delete next[articleId];
        return next;
      });
      showToast(res.error || "배너 변경 실패", "error");
    }
  };

  // 기사 노출 공실 연결/해제 (유료 부동산 전용)
  const handleSelectVacancy = async (articleId: string, authorId: string, vacancyId: string | null) => {
    const list = vacancyOptions[authorId]?.vacancies || [];
    const selected = vacancyId ? list.find(v => v.id === vacancyId) : null;
    const title = selected ? (selected.building_name || selected.dong || "공실") : "";
    const prevVac = vacancyMap[articleId];

    setVacancyMap(prev => {
      const next = { ...prev };
      if (vacancyId) next[articleId] = { vacancy_id: vacancyId, title, snapshot: null };
      else delete next[articleId];
      return next;
    });
    setSheet(null);

    const res = await updateArticleAttachedVacancy(articleId, vacancyId);
    if (res.success) {
      showToast(vacancyId ? "기사에 공실 매물이 연결되었습니다." : "공실 연결이 해제되었습니다.");
    } else {
      setVacancyMap(prev => {
        const next = { ...prev };
        if (prevVac) next[articleId] = prevVac; else delete next[articleId];
        return next;
      });
      showToast(res.error || "공실 설정 변경 실패", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 기사를 삭제하시겠습니까?")) return;
    const res = await deleteArticle(id);
    if (res.success) await refreshArticles();
    else alert("삭제 실패: " + res.error);
  };

  const statusInfo: Record<string, { bg: string; label: string }> = {
    PENDING: { bg: "#8b5cf6", label: "승인대기" },
    APPROVED: { bg: "#10b981", label: "발행됨" },
    REJECTED: { bg: "#ef4444", label: "반려됨" },
    DRAFT: { bg: "#9ca3af", label: "작성중" },
  };

  // 배지 건수: 관리자는 DB 전체 기준(HEAD 카운트), 일반 회원은 본인 기사 기준
  const displayCounts = isAdmin ? counts : {
    전체: articles.length,
    승인대기: articles.filter(a => a.status === "PENDING").length,
    발행됨: articles.filter(a => a.status === "APPROVED" && !(a.published_at && new Date(a.published_at).getTime() > new Date().getTime())).length,
    예약됨: articles.filter(a => a.status === "APPROVED" && !!(a.published_at && new Date(a.published_at).getTime() > new Date().getTime())).length,
    작성중: articles.filter(a => a.status === "DRAFT").length,
    반려: articles.filter(a => a.status === "REJECTED").length,
  };

  const tabs = [
    { key: "전체", count: displayCounts.전체 },
    { key: "승인대기", count: displayCounts.승인대기 },
    { key: "발행됨", count: displayCounts.발행됨 },
    { key: "예약됨", count: displayCounts.예약됨 },
    { key: "작성중", count: displayCounts.작성중 },
    { key: "반려", count: displayCounts.반려 },
  ];

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>권한을 확인하고 있습니다...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 상단 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>기사관리</h1>
          {isAdmin && (
            <span style={{ fontSize: 10, padding: "2px 8px", background: "#111827", color: "#fff", borderRadius: 10, fontWeight: 700 }}>관리자</span>
          )}
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            {displayCounts.승인대기}건 대기 / 전체 {displayCounts.전체}건
          </span>
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* 검색 영역 (접이식) */}
      {searchOpen && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(searchKeyword); setFilter("전체"); } }}
              placeholder="기사 제목, 기자명 또는 기사번호 검색"
              style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
            />
            <button onClick={() => { setActiveKeyword(searchKeyword); setFilter("전체"); }} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>검색</button>
            {activeKeyword && (
              <button onClick={() => { setSearchKeyword(""); setActiveKeyword(""); }} style={{ height: 40, padding: "0 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>초기화</button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>정렬 기준</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ flex: 1, height: 38, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", background: "#f9fafb" }}>
              <option value="published_at">발행일 최신순</option>
              <option value="updated_at">수정일 최신순</option>
              <option value="created_at">작성일 최신순</option>
            </select>
          </div>
        </div>
      )}

      {/* 필터 탭 (가로 스크롤) */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              flexShrink: 0, border: "none", background: "none", padding: "14px 16px", fontSize: 14,
              fontWeight: filter === tab.key ? 800 : 500,
              color: filter === tab.key ? "#3b82f6" : "#6b7280",
              borderBottom: filter === tab.key ? "3px solid #3b82f6" : "3px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {tab.key}
            <span style={{
              background: tab.key === "전체" ? "#e5e7eb" : tab.key === "승인대기" ? "#8b5cf6" : tab.key === "발행됨" ? "#10b981" : tab.key === "예약됨" ? "#f59e0b" : tab.key === "작성중" ? "#9ca3af" : "#ef4444",
              color: tab.key === "전체" ? "#4b5563" : "#fff",
              padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 안내 배너 */}
      <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: isAdmin ? "#fef3c7" : "#eff6ff", borderRadius: 10, border: `1px solid ${isAdmin ? "#fde68a" : "#bfdbfe"}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{isAdmin ? "👑" : "💡"}</span>
        <span style={{ fontSize: 12, color: isAdmin ? "#92400e" : "#1d4ed8", fontWeight: 600, lineHeight: 1.4 }}>
          {isAdmin
            ? "관리자 모드: 모든 기사를 조회하고 승인/반려할 수 있습니다."
            : "기사 작성 후 \"승인신청\"을 하면 관리자 검토 후 발행됩니다."}
        </span>
      </div>

      {/* 기사 카드 리스트 */}
      <div style={{ padding: "12px 16px 100px" }}>
        {loading ? (
          <MobileAdminLoading label="기사를 불러오는 중" />
        ) : displayArticles.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {activeKeyword ? "검색 결과가 없습니다." : filter === "전체" ? "작성한 기사가 없습니다." : "조회된 기사가 없습니다."}
            </div>
          </div>
        ) : displayArticles.map(a => {
          const st = statusInfo[a.status] || { bg: "#9ca3af", label: a.status };
          const dateStr = a.created_at ? new Date(a.created_at).toISOString().split("T")[0] : "-";
          const updatedStr = a.updated_at ? new Date(a.updated_at).toISOString().split("T")[0] : "-";
          
          return (
            <div key={a.id} style={{
              background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: a.status === "PENDING" && isAdmin ? "2px solid #8b5cf6" : "1px solid #f0f0f0",
            }}>
              {/* 상단: 상태 배지 + 섹션 + 기자명(관리자) */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "4px 10px", background: st.bg, color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{a.section1 || "-"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isAdmin && a.author_name && (
                    <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, background: "#eff6ff", padding: "2px 8px", borderRadius: 6 }}>
                      {a.author_name}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>#{a.article_no || "-"}</span>
                </div>
              </div>

              {/* 제목 */}
              <div
                onClick={() => openPreview(a.article_no || a.id)}
                style={{ fontSize: 16, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 8, wordBreak: "keep-all", cursor: "pointer" }}
              >
                {a.title || "(제목 없음)"}
              </div>

              {/* 반려 사유 */}
              {a.status === "REJECTED" && a.reject_reason && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 8, fontSize: 12, color: "#dc2626", fontWeight: 600, lineHeight: 1.4 }}>
                  ⚠️ 반려 사유: {a.reject_reason}
                </div>
              )}

              {/* 날짜 정보 */}
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12, display: "flex", gap: 12 }}>
                <span>작성 {dateStr}</span>
                <span>수정 {updatedStr}</span>
              </div>

              {/* 배너광고 · 공실선택 */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {(() => {
                  const info = adSettingsMap[a.id];
                  const t = info?.ad_type || "DEFAULT";
                  const c = t === "NONE" ? BANNER_NONE : t === "BANNER" && info?.banner_name ? BANNER_SET : BANNER_DEFAULT;
                  const label = t === "NONE" ? "배너없음" : t === "BANNER" && info?.banner_name ? info.banner_name : "업체프로필";
                  return (
                    <button
                      onClick={() => setSheet({ type: "banner", articleId: a.id, authorId: a.author_id || memberId || "" })}
                      style={{
                        flex: 1, minWidth: 0, height: 34, padding: "0 8px", background: c.bg, color: c.color,
                        border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                      }}
                    >
                      <span style={{ flexShrink: 0 }}>📢</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                      <span style={{ fontSize: 9, opacity: 0.7, flexShrink: 0 }}>▼</span>
                    </button>
                  );
                })()}
                {(() => {
                  const v = vacancyMap[a.id];
                  const c = v?.vacancy_id ? BANNER_DEFAULT : BANNER_NONE;
                  const label = v?.vacancy_id ? (v.title || "공실 연결됨") : "공실 없음";
                  return (
                    <button
                      onClick={() => {
                        if (!isAdmin && !isPaidRealtor) {
                          showToast("공실뉴스부동산 / 공실등록부동산 유료 회원 전용 기능입니다.", "info");
                          return;
                        }
                        const authorId = a.author_id || memberId || "";
                        ensureVacancyOptions(authorId);
                        setSheet({ type: "vacancy", articleId: a.id, authorId });
                      }}
                      style={{
                        flex: 1, minWidth: 0, height: 34, padding: "0 8px", background: c.bg, color: c.color,
                        border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                        opacity: isAdmin || isPaidRealtor ? 1 : 0.55,
                      }}
                    >
                      <span style={{ flexShrink: 0 }}>🏢</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                      <span style={{ fontSize: 9, opacity: 0.7, flexShrink: 0 }}>▼</span>
                    </button>
                  );
                })()}
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* 관리자: 승인대기 기사에 승인/반려 버튼 표시 */}
                {isAdmin && a.status === "PENDING" && (
                  <>
                    <button onClick={() => handleApprove(a.id)} style={{
                      flex: 1, height: 38, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                      ✅ 승인
                    </button>
                    <button onClick={() => openRejectModal(a.id)} style={{
                      flex: 1, height: 38, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                      🚫 반려
                    </button>
                  </>
                )}

                {/* 관리자: 반려/작성중 기사도 승인 가능 */}
                {isAdmin && (a.status === "REJECTED" || a.status === "DRAFT") && (
                  <button onClick={() => handleApprove(a.id)} style={{
                    flex: 1, height: 38, background: "#10b981", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}>
                    ✅ 즉시승인
                  </button>
                )}

                {/* 일반 회원: 승인신청 */}
                {!isAdmin && (a.status === "DRAFT" || a.status === "REJECTED") && (
                  <button onClick={() => handleRequestApproval(a.id)} style={{ flex: 1, height: 38, background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    📋 승인신청
                  </button>
                )}

                <button onClick={() => openPreview(a.article_no || a.id)} style={{ flex: 1, height: 38, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  👁️ 미리보기
                </button>
                <button onClick={() => router.push(`/m/admin/article/write?id=${a.id}`)} style={{ flex: 1, height: 38, background: "#4b5563", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  ✏️ 수정
                </button>
                <button onClick={() => handleDelete(a.id)} style={{ height: 38, padding: "0 14px", background: "#fff", color: "#9ca3af", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button onClick={loadMoreArticles} disabled={isLoadingMore} style={{ display: "block", width: "calc(100% - 32px)", height: 44, margin: "0 16px 24px", border: "1px solid #dbeafe", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 13, fontWeight: 700, cursor: isLoadingMore ? "wait" : "pointer" }}>
          {isLoadingMore ? "불러오는 중..." : `기사 더 불러오기 (${displayArticles.length}/${totalForDisplay})`}
        </button>
      )}

      {/* FAB: 새 기사 작성 */}
      <button
        onClick={() => router.push("/m/admin/article/write")}
        style={{
          position: "fixed", bottom: 80, right: 20, width: 56, height: 56,
          borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
          fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 40,
        }}
      >
        +
      </button>

      {/* 반려 사유 모달 */}
      {showRejectModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 400, borderRadius: 16, padding: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#111", fontWeight: 800 }}>🚫 기사 반려</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
              작성자에게 전달할 반려 사유를 선택하거나 직접 입력하세요.
            </p>

            {/* 반려 사유 선택 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {REJECT_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => { setRejectReason(reason); if (reason !== "기타 사유 (직접 입력)") setRejectCustom(""); }}
                  style={{
                    padding: "12px 16px", textAlign: "left", border: `2px solid ${rejectReason === reason ? "#ef4444" : "#e5e7eb"}`,
                    borderRadius: 10, fontSize: 13, fontWeight: rejectReason === reason ? 700 : 500,
                    color: rejectReason === reason ? "#dc2626" : "#374151",
                    background: rejectReason === reason ? "#fef2f2" : "#fff",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>

            {/* 직접 입력 */}
            {rejectReason === "기타 사유 (직접 입력)" && (
              <textarea
                value={rejectCustom}
                onChange={e => setRejectCustom(e.target.value)}
                placeholder="상세 반려 사유를 직접 입력하세요."
                style={{
                  width: "100%", height: 80, padding: 12, border: "1px solid #d1d5db", borderRadius: 8,
                  fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 16,
                }}
              />
            )}

            {/* 버튼 */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  flex: 1, height: 44, background: "#f3f4f6", color: "#4b5563",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleAiRevise}
                style={{
                  flex: 1, height: 44, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미리보기 오버레이 (iframe) */}
      {previewId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)" }}>
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ height: "40px", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "flex-end", padding: "0 16px" }}>
              <button onClick={closePreview} style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                &times;
              </button>
            </div>
            <iframe 
              src={`/m/news/${previewId}?embed=true`} 
              style={{ width: "100%", flex: 1, border: "none", background: "#f4f6f8" }}
            />
          </div>
        </div>
      )}

      {/* 배너광고 / 공실선택 바텀시트 */}
      {sheet && (() => {
        const target = articles.find(a => a.id === sheet.articleId);
        const info = adSettingsMap[sheet.articleId];
        const adType = info?.ad_type || "DEFAULT";
        const attachedId = vacancyMap[sheet.articleId]?.vacancy_id || null;
        const authorOption = vacancyOptions[sheet.authorId];
        const vacancyList = authorOption?.vacancies || [];
        const authorIsPaid = authorOption?.isPaid;
        const optionStyle = (active: boolean): React.CSSProperties => ({
          width: "100%", padding: "14px 20px", border: "none", borderBottom: "1px solid #f6f7f9",
          background: active ? "#eff6ff" : "transparent", color: active ? "#2563eb" : "#374151",
          fontSize: 14, fontWeight: active ? 800 : 500, textAlign: "left", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        });
        return (
          <div onClick={() => setSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 10000, display: "flex", alignItems: "flex-end" }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#fff", borderRadius: "18px 18px 0 0", maxHeight: "72vh", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 20px 14px", borderBottom: "1px solid #eef0f3" }}>
                <div style={{ width: 38, height: 4, background: "#e5e7eb", borderRadius: 2, margin: "0 auto 12px" }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>
                  {sheet.type === "banner" ? "📢 배너광고 선택" : "🏢 기사 노출 공실 선택 (최대 1개)"}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  #{target?.article_no || "-"} {target?.title || ""}
                  {isAdmin && target?.author_name ? ` · ${target.author_name}` : ""}
                </div>
              </div>
              <div style={{ overflowY: "auto", paddingBottom: 24 }}>
                {sheet.type === "banner" ? (
                  <>
                    <button onClick={() => handleChangeBanner(sheet.articleId, "DEFAULT")} style={optionStyle(adType === "DEFAULT")}>👤 업체프로필 (기본)</button>
                    <button onClick={() => handleChangeBanner(sheet.articleId, "NONE")} style={optionStyle(adType === "NONE")}>🚫 배너없음</button>
                    {authorBanners.length === 0 ? (
                      <div style={{ padding: "18px 20px", fontSize: 12.5, color: "#9ca3af", lineHeight: 1.6 }}>
                        등록된 배너가 없습니다.<br />PC 관리자 화면에서 배너를 먼저 만들어 주세요.
                      </div>
                    ) : authorBanners.map(b => (
                      <button key={b.id} onClick={() => handleChangeBanner(sheet.articleId, b.id)} style={optionStyle(adType === "BANNER" && info?.custom_banner_id === b.id)}>
                        <span style={{ flexShrink: 0 }}>🏷️</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button onClick={() => handleSelectVacancy(sheet.articleId, sheet.authorId, null)} style={optionStyle(!attachedId)}>🚫 공실 미노출 (연결 해제)</button>
                    {loadingVacancyAuthor === sheet.authorId ? (
                      <div style={{ padding: "18px 20px", fontSize: 12.5, color: "#9ca3af" }}>공실 목록을 불러오는 중...</div>
                    ) : vacancyList.length === 0 ? (
                      <div style={{ padding: "18px 20px", fontSize: 12.5, color: "#9ca3af", lineHeight: 1.6 }}>
                        {authorIsPaid === false
                          ? <>작성자가 공실뉴스부동산 / 공실등록부동산 유료 회원이 아니어서<br />연결할 수 있는 공실이 없습니다.</>
                          : <>연결할 수 있는 공실이 없습니다.<br />&apos;부동산노출 + 일반인노출&apos;로 설정된 진행중 매물만 선택할 수 있습니다.</>}
                      </div>
                    ) : vacancyList.map(v => (
                      <button key={v.id} onClick={() => handleSelectVacancy(sheet.articleId, sheet.authorId, v.id)} style={optionStyle(attachedId === v.id)}>
                        <span style={{ color: "#2563eb", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{formatShortMoney(v.trade_type, v.deposit, v.monthly_rent)}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.building_name || v.dong || "공실"}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 토스트 */}
      {toastMessage && (
        <div style={{
          position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", zIndex: 10001,
          background: toastMessage.type === "error" ? "#dc2626" : toastMessage.type === "info" ? "#374151" : "#059669",
          color: "#fff", padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)", maxWidth: "88%", textAlign: "center", lineHeight: 1.4,
        }}>
          {toastMessage.text}
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function MobileArticleAdminPage() {
  return (
    <Suspense fallback={null}>
      <MobileArticleAdmin />
    </Suspense>
  );
}
