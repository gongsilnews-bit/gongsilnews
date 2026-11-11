"use client";
/**
 * 최고관리자 [기사광고] (2026-11-11 사장님: "기사광고로 해서 관리자 페이지 만들어줘, 위치는 광고 메뉴 상단")
 *  사이트 전체 배너([광고])와 따로 — 기사 아래에 붙는 배너와 공실을 다룬다. 탭 없이 한 화면 (같은 날 사장님: "성과분석부터 하단 배너와 같이"):
 *   맨 위 회원 고르기 (처음엔 나 = 최고관리자)
 *   ① 성과 요약 — 진행중 배너(기간 안·켜짐) · 전체 배너 · 총 클릭 · 총 노출
 *   ② 기사 하단 배너 — 배너마다 상태·기간·노출·클릭·CTR + [수정][중지/활성][삭제] · [+ 새 배너 등록]
 *      등록·수정 폼은 부동산 회원 화면(MemberArticleAdSection)을 그대로 쓴다 (주소 ?menu=article_ad&action=new|edit)
 *   ③ 기사별 배너·공실 — 그 회원 기사만, 배너·공실 드롭다운과 일괄 적용 (승인·반려·삭제는 [기사관리]에서)
 *  고른 회원은 이 브라우저에 기억 (폼이 주소를 바꾸기 때문)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminSectionProps } from "./types";
import MemberArticleAdSection from "./MemberArticleAdSection";
import { actionFor } from "@/utils/menuAction";
import { getArticles } from "@/app/actions/article";
import {
  adminSearchAdMembers, getAuthorBannerStats, toggleAuthorBannerActive, deleteAuthorBanner,
  getAdminArticlesAdSettingsMap, adminUpdateArticlesAdSettings, adminListAllBanners,
  type AdMember, type AuthorBannerStat, type AdminBannerOption,
} from "@/app/actions/articleAd";
import { getAdminArticlesVacancyMap, updateArticleAttachedVacancy, updateMultipleArticlesAttachedVacancy, adminSearchVacancies, type AdminVacancyOption } from "@/app/actions/articleVacancy";

const KEY = "gs-admin-article-ad";
const PAGE = 20;
const roleName = (r: string) => (r === "ADMIN" || r === "최고관리자" ? "최고관리자" : r === "BIZ" || r === "비즈니스회원" ? "비즈니스회원" : "부동산회원");
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
/** 배너 상태 — 켜짐·기간으로 (회원 화면과 같은 규칙) */
function bannerStatus(b: { is_active: boolean; start_date?: string | null; end_date?: string | null }) {
  if (!b.is_active) return { label: "중지", color: "#6b7280", bg: "#f3f4f6" };
  const t = today();
  if (b.start_date && b.start_date > t) return { label: "예약", color: "#b45309", bg: "#fffbeb" };
  if (b.end_date && b.end_date < t) return { label: "종료", color: "#dc2626", bg: "#fef2f2" };
  return { label: "진행중", color: "#059669", bg: "#ecfdf5" };
}

export default function AdminArticleAdSection({ theme, adminId, adminName, adminEmail }: AdminSectionProps & { adminId: string; adminName: string; adminEmail?: string }) {
  const { textPrimary, textSecondary, border, cardBg, bg, darkMode } = theme;
  const router = useRouter();
  const searchParams = useSearchParams();
  const action0 = actionFor(searchParams, "article_ad");
  const action = action0 === "new" || action0 === "edit" ? action0 : null; // 예전 [성과 분석](stats) 주소는 이 한 화면으로
  const me: AdMember = { id: adminId, name: adminName || "공실뉴스", email: adminEmail || "", role: "ADMIN", office: "", banners: 0 };
  const [member, setMember] = useState<AdMember>(me);
  useEffect(() => {
    try { const s = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (s?.member?.id) setMember(s.member); } catch { /* */ }
  }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify({ member })); } catch { /* */ } }, [member]);
  const isMe = member.id === adminId;

  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const say = (text: string, ok = true) => { setToast({ text, ok }); setTimeout(() => setToast(null), 2500); };

  /* ── 배너 (성과 포함) ── */
  const [banners, setBanners] = useState<AuthorBannerStat[] | null>(null);
  const loadBanners = useCallback(() => {
    setBanners(null);
    getAuthorBannerStats(member.id).then((r) => setBanners(r.data || [])).catch(() => setBanners([]));
  }, [member.id]);
  useEffect(() => { if (!action) loadBanners(); }, [action, loadBanners]);

  /* ── 모든 기사 (2026-11-11 사장님: "최고관리자는 모든 기사의 배너·공실을 조절") — 찾기 · [이 회원 기사만] ── */
  const [page, setPage] = useState(1);
  const [arts, setArts] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [adMap, setAdMap] = useState<Record<string, { ad_type: string; custom_banner_id: string | null; banner_name: string | null }>>({});
  const [vacMap, setVacMap] = useState<Record<string, { vacancy_id: string; title: string; snapshot: any }>>({});
  const [checked, setChecked] = useState<string[]>([]);
  const [onlyMember, setOnlyMember] = useState(false);
  const [q, setQ] = useState("");
  const [qOn, setQOn] = useState("");
  useEffect(() => { setPage(1); setChecked([]); }, [member.id, onlyMember, qOn]);
  const loadArts = useCallback(async () => {
    setArts(null);
    const p: any = { page, limit: PAGE, orderBy: "published_at", slim: true, noCache: true };
    if (onlyMember) p.author_id = member.id;
    if (/^\d+$/.test(qOn)) p.articleNo = qOn; else if (qOn) p.searchKeyword = qOn;
    const res = await getArticles(p);
    const list = (res as any).success ? (res as any).data || [] : [];
    setArts(list); setTotal((res as any).count || 0);
    const ids = list.map((a: any) => a.id);
    if (ids.length) {
      getAdminArticlesAdSettingsMap(ids).then((r) => { if (r.success) setAdMap(r.settingsMap); });
      getAdminArticlesVacancyMap(ids).then((r: any) => { if (r.success) setVacMap(r.vacancyMap); });
    }
  }, [member.id, page, onlyMember, qOn]);
  useEffect(() => { if (!action) void loadArts(); }, [action, loadArts]);

  // 고를 수 있는 배너 = 모든 배너 (공실뉴스·최고관리자 것이 맨 위, 그다음 회원별)
  const [allBanners, setAllBanners] = useState<AdminBannerOption[]>([]);
  useEffect(() => { if (!action) adminListAllBanners().then((r) => setAllBanners(r.data || [])); }, [action, banners]);
  const options = allBanners;
  const bannerGroups = (() => {
    const g = new Map<string, { label: string; list: AdminBannerOption[] }>();
    for (const b of [...allBanners].sort((x, y) => Number(y.is_admin) - Number(x.is_admin))) {
      const k = b.author_id;
      if (!g.has(k)) g.set(k, { label: b.is_admin ? `${b.author_name} (최고관리자)` : b.author_name, list: [] });
      g.get(k)!.list.push(b);
    }
    return [...g.values()];
  })();
  const bannerOptions = (
    <>
      <option value="DEFAULT">업체프로필 (기본)</option>
      <option value="NONE">배너없음</option>
      {bannerGroups.map((g) => <optgroup key={g.label} label={g.label}>{g.list.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>)}
    </>
  );
  const setBannerFor = async (ids: string[], value: string) => {
    const ad_type: "DEFAULT" | "BANNER" | "NONE" = value === "NONE" ? "NONE" : value === "DEFAULT" ? "DEFAULT" : "BANNER";
    const custom_banner_id = ad_type === "BANNER" ? value : null;
    const res = await adminUpdateArticlesAdSettings(ids, { ad_type, custom_banner_id });
    if (!res.success) { say(res.error || "배너를 바꾸지 못했어요.", false); return; }
    const name = options.find((o) => o.id === value)?.name || null;
    setAdMap((prev) => { const n = { ...prev }; ids.forEach((id) => { n[id] = { ad_type, custom_banner_id, banner_name: name }; }); return n; });
    say(ids.length > 1 ? `${ids.length}개 기사에 적용했어요.` : "배너를 바꿨어요.");
  };
  const setVacancyFor = async (ids: string[], v: AdminVacancyOption | null) => {
    const vacancyId = v ? v.id : null;
    const res: any = ids.length === 1 ? await updateArticleAttachedVacancy(ids[0], vacancyId) : await updateMultipleArticlesAttachedVacancy(ids, vacancyId);
    if (!res.success) { say(res.error || "공실을 바꾸지 못했어요.", false); return; }
    setVacMap((prev) => { const n = { ...prev }; ids.forEach((id) => { n[id] = { vacancy_id: vacancyId || "", title: v ? v.title : "", snapshot: null }; }); return n; });
    say(vacancyId ? (ids.length > 1 ? `${ids.length}개 기사에 공실을 붙였어요.` : "공실을 붙였어요.") : "공실을 뺐어요.");
  };
  const [bulkBanner, setBulkBanner] = useState("DEFAULT");

  const card: React.CSSProperties = { background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 20px" };
  const btn = (c: string, solid = false): React.CSSProperties => ({ height: 30, padding: "0 12px", borderRadius: 6, border: `1px solid ${c}`, background: solid ? c : "transparent", color: solid ? "#fff" : c, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" });
  const th: React.CSSProperties = { padding: "10px 8px", fontSize: 12.5, fontWeight: 700, color: textSecondary, textAlign: "center", borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "12px 8px", fontSize: 13, color: textPrimary, textAlign: "center", borderBottom: `1px solid ${border}`, verticalAlign: "middle" };

  const live = (banners || []).filter((b) => bannerStatus(b).label === "진행중").length;
  const clicks = (banners || []).reduce((s, b) => s + b.click_count, 0);
  const views = (banners || []).reduce((s, b) => s + b.view_count, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", background: bg }}>
      {toast && <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.ok ? "#0f172a" : "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700 }}>{toast.text}</div>}
      <div style={{ padding: "20px 28px 0" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 4px" }}>기사광고</h1>
        <div style={{ fontSize: 13, color: textSecondary }}>기사 아래에 붙는 배너와 공실 — 회원마다. 사이트 전체 배너는 [광고]에서.</div>
      </div>
      <MemberPicker theme={theme} me={me} member={member} isMe={isMe} onPick={(m) => { setMember(m); if (action) router.push("?menu=article_ad"); }} />

      {/* 배너 등록·수정 — 회원 화면 폼 그대로 */}
      {(action === "new" || action === "edit") && (
        <MemberArticleAdSection key={`f-${member.id}`} theme={theme} memberId={member.id} memberName={member.name} memberEmail={member.email} role="admin" />
      )}

      {!action && (
        <div style={{ padding: "16px 28px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ① 성과 요약 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {([["진행중 배너", live, "#059669"], ["전체 배너", banners?.length ?? 0, textPrimary], ["총 클릭", clicks, "#2563eb"], ["총 노출", views, textPrimary]] as const).map(([k, v, c]) => (
              <div key={k} style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>{k}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: c, marginTop: 6 }}>{banners ? v.toLocaleString() : "…"}</div>
              </div>
            ))}
          </div>

          {/* ② 기사 하단 배너 */}
          <div style={{ ...card, padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: `1px solid ${border}` }}>
              <b style={{ fontSize: 15, color: textPrimary }}>기사 하단 배너</b>
              <span style={{ fontSize: 12.5, color: textSecondary }}>CTR = 클릭 ÷ 노출</span>
              <button type="button" onClick={() => router.push("?menu=article_ad&action=new")} style={{ ...btn("#1e3a6e", true), marginLeft: "auto", height: 34 }}>+ 새 배너 등록</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["미리보기", "배너명 · 링크", "상태", "노출 기간", "노출", "클릭", "CTR", "관리"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {!banners && <tr><td colSpan={8} style={{ ...td, padding: 30, color: textSecondary }}>불러오는 중…</td></tr>}
                {banners && banners.length === 0 && <tr><td colSpan={8} style={{ ...td, padding: 30, color: textSecondary }}>아직 배너가 없어요. [+ 새 배너 등록]으로 만들어 주세요.</td></tr>}
                {banners?.map((b) => {
                  const st = bannerStatus(b);
                  return (
                    <tr key={b.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <td style={td}><img src={b.image_url} alt="" style={{ width: 120, height: 40, objectFit: "cover", borderRadius: 4, background: "#f3f4f6" }} /></td>
                      <td style={{ ...td, textAlign: "left", maxWidth: 320 }}>
                        <div style={{ fontWeight: 800 }}>{b.name}</div>
                        {b.link_url && <a href={b.link_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#2563eb", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.link_url}</a>}
                      </td>
                      <td style={td}><span style={{ fontSize: 12, fontWeight: 800, color: st.color, background: st.bg, borderRadius: 4, padding: "3px 8px" }}>{st.label}</span></td>
                      <td style={{ ...td, fontSize: 12.5, color: textSecondary }}>{b.start_date || b.end_date ? `${b.start_date || "…"} ~ ${b.end_date || "상시"}` : "상시"}</td>
                      <td style={td}>{b.view_count.toLocaleString()}</td>
                      <td style={td}>{b.click_count.toLocaleString()}</td>
                      <td style={{ ...td, fontWeight: 800, color: "#059669" }}>{b.ctr}%</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button type="button" style={btn("#1e3a6e", true)} onClick={() => router.push(`?menu=article_ad&action=edit&id=${b.id}`)}>수정</button>
                          <button type="button" style={btn(b.is_active ? "#dc2626" : "#059669")} onClick={async () => { const r = await toggleAuthorBannerActive(b.id, member.id, b.is_active); if (r.success) { say(b.is_active ? "배너를 중지했어요." : "배너를 켰어요."); loadBanners(); } else say(r.error || "바꾸지 못했어요.", false); }}>{b.is_active ? "중지" : "활성"}</button>
                          <button type="button" style={btn("#9ca3af")} onClick={async () => { if (!confirm(`"${b.name}" 배너를 지울까요?`)) return; const r = await deleteAuthorBanner(b.id, member.id); if (r.success) { say("배너를 지웠어요."); loadBanners(); } else say(r.error || "지우지 못했어요.", false); }}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ③ 기사별 배너·공실 */}
          <div style={{ ...card, padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderBottom: `1px solid ${border}`, flexWrap: "wrap" }}>
              <b style={{ fontSize: 15, color: textPrimary }}>기사별 배너·공실</b>
              <span style={{ fontSize: 12.5, color: textSecondary }}>{onlyMember ? `${member.name} 기사` : "모든 기사"} {total.toLocaleString()}건 · 어느 기사에든 어느 배너·공실이든 · 기사 고치기·승인은 [기사관리]에서</span>
              <form onSubmit={(e) => { e.preventDefault(); setQOn(q.trim()); }} style={{ display: "inline-flex", gap: 6, marginLeft: 8 }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="기사 번호 · 제목 · 기자명" style={{ height: 30, width: 200, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 12.5, background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary }} />
                <button type="submit" style={btn("#1e3a6e", true)}>찾기</button>
                {qOn && <button type="button" style={btn("#6b7280")} onClick={() => { setQ(""); setQOn(""); }}>지우기</button>}
              </form>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: textPrimary, cursor: "pointer" }}>
                <input type="checkbox" checked={onlyMember} onChange={(e) => setOnlyMember(e.target.checked)} /> {member.name} 기사만
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderBottom: `1px solid ${border}`, fontSize: 12.5, color: textSecondary, flexWrap: "wrap", background: darkMode ? "transparent" : "#f8fafc" }}>
              체크한 {checked.length}건에 한꺼번에:
              <select value={bulkBanner} onChange={(e) => setBulkBanner(e.target.value)} style={{ height: 30, borderRadius: 6, border: `1px solid ${border}`, fontSize: 12.5, maxWidth: 220 }}>{bannerOptions}</select>
              <button type="button" disabled={!checked.length} style={{ ...btn("#059669"), opacity: checked.length ? 1 : 0.4 }} onClick={() => setBannerFor(checked, bulkBanner)}>배너 일괄적용</button>
              <span style={{ width: 12 }} />
              <VacancyPicker theme={theme} label="공실 일괄적용" disabled={!checked.length} ownerFirst={onlyMember ? member.id : ""} onPick={(v) => setVacancyFor(checked, v)} />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ ...th, width: 36 }}><input type="checkbox" checked={!!arts?.length && checked.length === arts.length} onChange={(e) => setChecked(e.target.checked ? (arts || []).map((a) => a.id) : [])} /></th>
                {["번호", "기사 제목", "기자", "발행일", "배너광고", "공실", ""].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {!arts && <tr><td colSpan={8} style={{ ...td, padding: 30, color: textSecondary }}>불러오는 중…</td></tr>}
                {arts && arts.length === 0 && <tr><td colSpan={8} style={{ ...td, padding: 30, color: textSecondary }}>찾는 기사가 없어요.</td></tr>}
                {arts?.map((a) => {
                  const ad = adMap[a.id];
                  const cur = !ad || ad.ad_type === "DEFAULT" ? "DEFAULT" : ad.ad_type === "NONE" ? "NONE" : ad.custom_banner_id || "DEFAULT";
                  return (
                    <tr key={a.id}>
                      <td style={td}><input type="checkbox" checked={checked.includes(a.id)} onChange={(e) => setChecked((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))} /></td>
                      <td style={{ ...td, color: textSecondary }}>{a.article_no}</td>
                      <td style={{ ...td, textAlign: "left", fontWeight: 700, maxWidth: 420 }}>{a.title}</td>
                      <td style={{ ...td, fontSize: 12.5, color: textSecondary, whiteSpace: "nowrap" }}>{a.author_name || "-"}</td>
                      <td style={{ ...td, fontSize: 12.5, color: textSecondary }}>{String(a.published_at || a.created_at || "").slice(0, 10)}</td>
                      <td style={td}>
                        <select value={cur} onChange={(e) => setBannerFor([a.id], e.target.value)} style={{ height: 30, borderRadius: 6, border: `1px solid ${cur === "NONE" ? "#d1d5db" : cur === "DEFAULT" ? "#bfdbfe" : "#a7f3d0"}`, color: cur === "NONE" ? "#9ca3af" : cur === "DEFAULT" ? "#2563eb" : "#059669", fontSize: 12.5, fontWeight: 700, maxWidth: 190, background: darkMode ? "#1a1b1e" : "#fff" }}>
                          {bannerOptions}
                          {cur !== "DEFAULT" && cur !== "NONE" && !options.some((o) => o.id === cur) && <option value={cur}>{ad?.banner_name || "다른 배너"}</option>}
                        </select>
                      </td>
                      <td style={td}>
                        <VacancyPicker theme={theme} label={vacMap[a.id]?.vacancy_id ? vacMap[a.id].title || "공실" : "공실 없음"} active={!!vacMap[a.id]?.vacancy_id} ownerFirst={a.author_id} onPick={(v) => setVacancyFor([a.id], v)} />
                      </td>
                      <td style={td}><button type="button" style={btn("#2563eb")} onClick={() => window.open(`/news/${a.article_no || a.id}`, "_blank")}>미리보기</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {total > PAGE && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: 14, fontSize: 13, color: textSecondary }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...btn("#6b7280"), opacity: page <= 1 ? 0.4 : 1 }}>이전</button>
                {page} / {Math.ceil(total / PAGE)}
                <button type="button" disabled={page >= Math.ceil(total / PAGE)} onClick={() => setPage((p) => p + 1)} style={{ ...btn("#6b7280"), opacity: page >= Math.ceil(total / PAGE) ? 0.4 : 1 }}>다음</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 공실 고르기 — 모든 공실에서 찾기(번호·건물명·동). ownerFirst 의 공실이 맨 위 · [공실 빼기] */
function VacancyPicker({ theme, label, active = false, disabled = false, ownerFirst = "", onPick }: { theme: AdminSectionProps["theme"]; label: string; active?: boolean; disabled?: boolean; ownerFirst?: string; onPick: (v: AdminVacancyOption | null) => void }) {
  const { textPrimary, textSecondary, border, darkMode } = theme;
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [list, setList] = useState<AdminVacancyOption[] | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setList(null);
    const t = setTimeout(() => { adminSearchVacancies(kw, ownerFirst).then((r) => setList(r.data || [])); }, 250);
    return () => clearTimeout(t);
  }, [open, kw, ownerFirst]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (v: AdminVacancyOption | null) => { setOpen(false); setKw(""); onPick(v); };
  return (
    <div ref={boxRef} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
        style={{ height: 30, maxWidth: 170, padding: "0 10px", borderRadius: 6, border: `1px solid ${active || disabled === false && label === "공실 일괄적용" ? "#fdba74" : border}`, background: active ? "#fff7ed" : darkMode ? "#1a1b1e" : "#fff", color: active || label === "공실 일괄적용" ? "#ea580c" : textSecondary, fontSize: 12.5, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "inherit" }}>
        {label} ▾
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, width: 360, maxHeight: 380, overflowY: "auto", background: darkMode ? "#1e293b" : "#fff", border: `1px solid ${border}`, borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,.18)", zIndex: 100, padding: 8, textAlign: "left" }}>
          <input autoFocus value={kw} onChange={(e) => setKw(e.target.value)} placeholder="공실 번호 · 건물명 · 동으로 찾기"
            style={{ width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, marginBottom: 6, background: darkMode ? "#111" : "#fff", color: textPrimary }} />
          <button type="button" onClick={() => pick(null)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", border: "none", borderRadius: 6, background: "transparent", color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>공실 빼기 (공실 없음)</button>
          {!list && <div style={{ padding: 10, fontSize: 13, color: textSecondary }}>찾는 중…</div>}
          {list && list.length === 0 && <div style={{ padding: 10, fontSize: 13, color: textSecondary }}>찾는 공실이 없어요.</div>}
          {list?.map((v) => (
            <button key={v.id} type="button" onClick={() => pick(v)} style={{ width: "100%", display: "flex", gap: 8, alignItems: "center", textAlign: "left", padding: "8px 10px", border: "none", borderRadius: 6, background: v.owner_id === ownerFirst ? (darkMode ? "#3b2a1a" : "#fff7ed") : "transparent", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", flexShrink: 0 }}>{v.vacancy_no}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</span>
                <span style={{ display: "block", fontSize: 11.5, color: textSecondary }}>{[v.trade_type, v.owner_name, v.owner_id === ownerFirst ? "글쓴이 공실" : ""].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 회원 고르기 — 이름·이메일·사무소로 찾기, 처음엔 나 */
function MemberPicker({ theme, me, member, isMe, onPick }: { theme: AdminSectionProps["theme"]; me: AdMember; member: AdMember; isMe: boolean; onPick: (m: AdMember) => void }) {
  const { textPrimary, textSecondary, border, cardBg, darkMode } = theme;
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [list, setList] = useState<AdMember[] | null>(null);
  const [err, setErr] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { adminSearchAdMembers(kw).then((r) => { setList(r.data); setErr(r.success ? "" : r.error || "회원을 불러오지 못했어요."); }); }, 250);
    return () => clearTimeout(t);
  }, [open, kw]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (m: AdMember) => { onPick(m); setOpen(false); setKw(""); };
  return (
    <div style={{ margin: "12px 28px 0", padding: "12px 16px", background: cardBg, border: `1px solid ${border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: textSecondary }}>회원</span>
      <div ref={boxRef} style={{ position: "relative" }}>
        <button type="button" onClick={() => setOpen((v) => !v)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px", border: `1.5px solid ${isMe ? "#1e3a6e" : "#ea8a0c"}`, borderRadius: 8, background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          {member.name}{isMe ? " (나)" : ""}
          <span style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>{[roleName(member.role), member.office, member.email].filter(Boolean).join(" · ")}</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
        </button>
        {open && (
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, width: 420, maxHeight: 420, overflowY: "auto", background: darkMode ? "#1e293b" : "#fff", border: `1px solid ${border}`, borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,.18)", zIndex: 100, padding: 8 }}>
            <input autoFocus value={kw} onChange={(e) => setKw(e.target.value)} placeholder="이름 · 이메일 · 사무소 이름으로 찾기"
              style={{ width: "100%", boxSizing: "border-box", height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, marginBottom: 6, background: darkMode ? "#111" : "#fff", color: textPrimary }} />
            <Row m={me} me onPick={pick} theme={theme} active={isMe} />
            {err && <div style={{ padding: 10, fontSize: 13, color: "#ef4444" }}>{err}</div>}
            {!list && !err && <div style={{ padding: 10, fontSize: 13, color: textSecondary }}>찾는 중…</div>}
            {list && list.filter((m) => m.id !== me.id).length === 0 && <div style={{ padding: 10, fontSize: 13, color: textSecondary }}>찾는 회원이 없어요.</div>}
            {list?.filter((m) => m.id !== me.id).map((m) => <Row key={m.id} m={m} onPick={pick} theme={theme} active={m.id === member.id} />)}
          </div>
        )}
      </div>
      {!isMe && (
        <>
          <button type="button" onClick={() => pick(me)} style={{ height: 32, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: "transparent", color: textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>나로 돌아가기</button>
          <span style={{ fontSize: 12.5, color: "#c2410c", fontWeight: 600 }}>이 회원의 배너·공실을 최고관리자가 대신 고칩니다. 배너가 기사에 보이는지는 그 회원의 배너광고 권한(유료)에 따릅니다.</span>
        </>
      )}
    </div>
  );
}

function Row({ m, me = false, onPick, theme, active }: { m: AdMember; me?: boolean; onPick: (m: AdMember) => void; theme: AdminSectionProps["theme"]; active: boolean }) {
  return (
    <button type="button" onClick={() => onPick(m)}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", borderRadius: 8, background: active ? (theme.darkMode ? "#334155" : "#eef2f7") : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: theme.textPrimary }}>{m.name}{me ? " (나)" : ""}</span>
        <span style={{ display: "block", fontSize: 12, color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[roleName(m.role), m.office, m.email].filter(Boolean).join(" · ")}</span>
      </span>
      {!me && m.banners > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: "#059669", background: "#ecfdf5", borderRadius: 999, padding: "2px 8px" }}>배너 {m.banners}</span>}
    </button>
  );
}
