"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AdminSectionProps } from "./types";
import { getBanners, createBanner, updateBanner, deleteBanner, toggleBannerActive, getBannerStats } from "@/app/actions/banner";

const PLACEMENT_OPTIONS = [
  { value: "MAIN_TOP", label: "메인 상단" },
  { value: "MAIN_MIDDLE", label: "메인 중간" },
  { value: "SIDEBAR", label: "사이드바" },
  { value: "LIST_INLINE", label: "리스트 인라인" },
  { value: "NEWS_DETAIL", label: "뉴스 상세" },
  { value: "POPUP", label: "팝업" },
];

const DEVICE_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "PC", label: "PC" },
  { value: "MOBILE", label: "모바일" },
];

function getStatusInfo(banner: any) {
  const now = new Date();
  if (!banner.is_active) return { label: "중지", color: "#9ca3af", bg: "#f3f4f6" };
  if (banner.start_time && new Date(banner.start_time) > now) return { label: "예약", color: "#f59e0b", bg: "#fffbeb" };
  if (banner.end_time && new Date(banner.end_time) < now) return { label: "종료", color: "#ef4444", bg: "#fef2f2" };
  return { label: "진행중", color: "#10b981", bg: "#ecfdf5" };
}

export default function BannerSection({ theme }: AdminSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const action = searchParams.get("action");
  
  const [banners, setBanners] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  // URL 파라미터와 컴포넌트 상태 동기화
  useEffect(() => {
    if (!action) {
      setShowForm(false);
      setShowStats(false);
      setEditingBanner(null);
      setImagePreview(null);
    } else if (action === "stats") {
      setShowStats(true);
      setShowForm(false);
    } else if (action === "new" || action === "edit") {
      setShowForm(true);
      setShowStats(false);
    }
  }, [action]);

  const loadBanners = async () => {
    const res = await getBanners();
    if (res.success) setBanners(res.data || []);
  };

  const loadStats = async () => {
    const res = await getBannerStats();
    if (res.success) setStats(res.data || []);
  };

  const filtered = banners.filter(b => {
    if (filter === "전체") return true;
    const status = getStatusInfo(b).label;
    return status === filter;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    let res;
    if (editingBanner) {
      res = await updateBanner(editingBanner.id, formData);
    } else {
      res = await createBanner(formData);
    }
    if (res.success) {
      router.push(`${pathname}?menu=ad`); // 목록으로 이동
      loadBanners();
    } else {
      alert("오류: " + res.error);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`${ids.length}건의 배너를 삭제하시겠습니까?`)) return;
    for (const id of ids) await deleteBanner(id);
    setCheckedIds([]);
    loadBanners();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleBannerActive(id, !current);
    loadBanners();
  };

  /* ── 배너 등록/수정 폼 ── */
  if (showForm) {
    const b = editingBanner;
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>{b ? "배너 수정" : "새 배너 등록"}</h1>
          <button onClick={() => router.push(`${pathname}?menu=ad`)}
            style={{ padding: "8px 20px", background: darkMode ? "#374151" : "#f3f4f6", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← 목록으로</button>
        </div>

        <form onSubmit={handleSubmit} style={{ background: cardBg, borderRadius: 14, padding: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            {/* 배너명 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>배너명 *</label>
              <input name="title" defaultValue={b?.title || ""} required placeholder="예: 2026년 봄 이벤트 배너"
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* 이미지 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>배너 이미지 *</label>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div onClick={() => fileInputRef.current?.click()}
                  style={{ width: 200, height: 100, border: `2px dashed ${border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: darkMode ? "#1a1b1e" : "#fafafa" }}>
                  {(imagePreview || b?.image_url) ? (
                    <img src={imagePreview || b?.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center", color: textSecondary, fontSize: 12 }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
                      클릭하여 업로드
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" name="image" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImagePreview(URL.createObjectURL(file));
                  }} />
                {b?.image_url && <input type="hidden" name="image_url" value={b.image_url} />}
              </div>
            </div>

            {/* 링크 URL */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>링크 URL</label>
              <input name="link_url" defaultValue={b?.link_url || ""} placeholder="https://example.com"
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* 링크 방식 */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>링크 열기 방식</label>
              <select name="link_target" defaultValue={b?.link_target || "_blank"}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }}>
                <option value="_blank">새 창에서 열기</option>
                <option value="_self">현재 창에서 열기</option>
              </select>
            </div>

            {/* 노출 위치 */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>노출 위치 *</label>
              <select name="placement_code" defaultValue={b?.placement_code || "MAIN_TOP"} required
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }}>
                {PLACEMENT_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* 기기 */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>노출 기기</label>
              <select name="device_type" defaultValue={b?.device_type || "ALL"}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }}>
                {DEVICE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            {/* 시작/종료 일시 */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>시작 일시</label>
              <input name="start_time" type="datetime-local" defaultValue={b?.start_time ? new Date(b.start_time).toISOString().slice(0, 16) : ""}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>종료 일시</label>
              <input name="end_time" type="datetime-local" defaultValue={b?.end_time ? new Date(b.end_time).toISOString().slice(0, 16) : ""}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* 정렬순서 */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>정렬 순서</label>
              <input name="sort_order" type="number" defaultValue={b?.sort_order || 0}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* 여백 */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>상단 여백(px)</label>
                <input name="margin_top" type="number" defaultValue={b?.margin_top || 0}
                  style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>하단 여백(px)</label>
                <input name="margin_bottom" type="number" defaultValue={b?.margin_bottom || 0}
                  style={{ width: "100%", padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* 자동 롤링 */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 24, alignItems: "center", padding: "16px 20px", background: darkMode ? "#1a1b1e" : "#f9fafb", borderRadius: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="hidden" name="auto_rotate" value="false" />
                <input type="checkbox" name="auto_rotate" value="true" defaultChecked={b?.auto_rotate || false}
                  style={{ width: 18, height: 18, accentColor: "#3b82f6" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>자동 롤링</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: textSecondary }}>롤링 간격</span>
                <input name="rotate_interval" type="number" min="1" max="30" defaultValue={b?.rotate_interval || 5}
                  style={{ width: 60, padding: "8px 10px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: darkMode ? "#25262b" : "#fff", outline: "none", textAlign: "center" }} />
                <span style={{ fontSize: 13, color: textSecondary }}>초</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginLeft: "auto" }}>
                <input type="hidden" name="is_active" value="false" />
                <input type="checkbox" name="is_active" value="true" defaultChecked={b?.is_active !== false}
                  style={{ width: 18, height: 18, accentColor: "#10b981" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>즉시 활성화</span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${border}`, paddingTop: 20 }}>
            <button type="button" onClick={() => router.push(`${pathname}?menu=ad`)}
              style={{ padding: "12px 24px", background: darkMode ? "#374151" : "#f3f4f6", color: textPrimary, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
            <button type="submit"
              style={{ padding: "12px 28px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{b ? "수정 저장" : "배너 등록"}</button>
          </div>
        </form>
      </div>
    );
  }

  /* ── 통계 대시보드 ── */
  if (showStats) {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>📊 배너 성과 분석</h1>
          <button onClick={() => router.push(`${pathname}?menu=ad`)}
            style={{ padding: "8px 20px", background: darkMode ? "#374151" : "#f3f4f6", color: textPrimary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← 목록으로</button>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "전체 배너", value: stats.length, icon: "🖼️", color: "#3b82f6" },
            { label: "활성 배너", value: stats.filter(s => s.is_active).length, icon: "✅", color: "#10b981" },
            { label: "총 클릭수", value: stats.reduce((a, s) => a + (s.click_count || 0), 0).toLocaleString(), icon: "👆", color: "#f59e0b" },
            { label: "총 노출수", value: stats.reduce((a, s) => a + (s.view_count || 0), 0).toLocaleString(), icon: "👁️", color: "#8b5cf6" },
          ].map((card, i) => (
            <div key={i} style={{ background: cardBg, borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: `1px solid ${border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{card.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>{card.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* 배너별 성과 테이블 */}
        <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, fontWeight: 700, color: textPrimary }}>배너별 클릭 성과 (CTR = 클릭수 ÷ 노출수)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}` }}>배너명</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>위치</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>노출수</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>클릭수</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 100 }}>CTR</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${border}`, width: 200 }}>클릭률 그래프</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => {
                const ctrNum = parseFloat(s.ctr);
                const placeName = PLACEMENT_OPTIONS.find(p => p.value === s.placement_code)?.label || s.placement_code;
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: textPrimary }}>{s.title}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: textSecondary }}>{placeName}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: textPrimary, fontWeight: 600 }}>{(s.view_count || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#3b82f6", fontWeight: 700 }}>{(s.click_count || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: ctrNum > 5 ? "#10b981" : ctrNum > 1 ? "#f59e0b" : textSecondary }}>{s.ctr}%</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ background: darkMode ? "#1a1b1e" : "#f3f4f6", borderRadius: 4, height: 20, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(ctrNum * 5, 100)}%`, height: "100%", background: `linear-gradient(90deg, #3b82f6, ${ctrNum > 5 ? "#10b981" : "#60a5fa"})`, borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary }}>등록된 배너가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── 배너 목록 ── */
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>광고/배너 관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 진행중 {banners.filter(b => getStatusInfo(b).label === "진행중").length}건 / 전체 {banners.length}건 )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "진행중", "예약", "종료", "중지"].map(tab => {
            let count = 0;
            if (tab === "전체") count = banners.length;
            else count = banners.filter(b => getStatusInfo(b).label === tab).length;
            return (
              <button key={tab} onClick={() => { setFilter(tab); setCheckedIds([]); }}
                style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: filter === tab ? 800 : 600, color: filter === tab ? "#3b82f6" : textSecondary, borderBottom: filter === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {tab}
                <span style={{
                  background: tab === "전체" ? "#e5e7eb" : tab === "진행중" ? "#10b981" : tab === "예약" ? "#f59e0b" : tab === "종료" ? "#ef4444" : "#9ca3af",
                  color: tab === "전체" ? "#4b5563" : "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 액션 버튼 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => { setEditingBanner(null); router.push(`${pathname}?menu=ad&action=new`); }}
            style={{ display: "flex", alignItems: "center", height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", gap: 6 }}>+ 새 배너 등록</button>
          <button onClick={() => { loadStats(); router.push(`${pathname}?menu=ad&action=stats`); }}
            style={{ display: "flex", alignItems: "center", height: 36, padding: "0 16px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", gap: 6 }}>📊 성과 분석</button>
          <button onClick={() => handleDelete(checkedIds)} disabled={checkedIds.length === 0}
            style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: checkedIds.length > 0 ? "#ef4444" : "#ccc", border: `1px solid ${checkedIds.length > 0 ? "#ef4444" : border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: checkedIds.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6 }}>
            🗑 선택삭제
          </button>
        </div>

        {/* 카드형 배너 목록 */}
        <div style={{ padding: 24 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: textSecondary }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>등록된 배너가 없습니다.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>새 배너를 등록해 보세요.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {filtered.map(b => {
                const status = getStatusInfo(b);
                const placeName = PLACEMENT_OPTIONS.find(p => p.value === b.placement_code)?.label || b.placement_code;
                const periodText = b.start_time
                  ? `${new Date(b.start_time).toLocaleDateString('ko-KR')} ~ ${b.end_time ? new Date(b.end_time).toLocaleDateString('ko-KR') : ""}`
                  : "상시 노출";
                return (
                  <div key={b.id} style={{
                    background: cardBg, borderRadius: 12, overflow: "hidden",
                    border: `1px solid ${checkedIds.includes(b.id) ? "#3b82f6" : border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.2s",
                  }}>
                    {/* 기간 바 */}
                    <div style={{
                      padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#fff",
                      background: status.label === "진행중" ? "#10b981" : status.label === "예약" ? "#f59e0b" : status.label === "종료" ? "#ef4444" : "#9ca3af",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span>{periodText}</span>
                      <span style={{ background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 4 }}>{status.label}</span>
                    </div>

                    {/* 이미지 미리보기 */}
                    <div
                      onClick={() => { setEditingBanner(b); router.push(`${pathname}?menu=ad&action=edit&id=${b.id}`); }}
                      style={{
                        width: "100%", height: 160, cursor: "pointer", overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: darkMode ? "#1a1b1e" : "#f9fafb",
                      }}
                    >
                      <img src={b.image_url} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>

                    {/* 배너 정보 */}
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <input type="checkbox" style={{ accentColor: "#3b82f6" }} checked={checkedIds.includes(b.id)}
                          onChange={(e) => setCheckedIds(e.target.checked ? [...checkedIds, b.id] : checkedIds.filter(id => id !== b.id))} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: textSecondary, marginBottom: 10 }}>
                        <span style={{ padding: "2px 8px", background: darkMode ? "#2c2d31" : "#f3f4f6", borderRadius: 4, fontWeight: 600 }}>{placeName}</span>
                        <span>클릭 <strong style={{ color: "#3b82f6" }}>{(b.click_count || 0).toLocaleString()}</strong></span>
                        <span>노출 <strong style={{ color: textPrimary }}>{(b.view_count || 0).toLocaleString()}</strong></span>
                      </div>

                      {/* 액션 아이콘 */}
                      <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                        <button onClick={() => handleToggle(b.id, b.is_active)} title={b.is_active ? "중지" : "활성"}
                          style={{ flex: 1, height: 32, background: b.is_active ? "#ef4444" : "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {b.is_active ? "⏸ 중지" : "▶ 활성"}
                        </button>
                        <button onClick={() => { setEditingBanner(b); router.push(`${pathname}?menu=ad&action=edit&id=${b.id}`); }} title="수정"
                          style={{ flex: 1, height: 32, background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          ✏️ 수정
                        </button>
                        <button onClick={() => handleDelete([b.id])} title="삭제"
                          style={{ flex: 1, height: 32, background: "none", color: "#9ca3af", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          🗑 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
