"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getBanners, createBanner, updateBanner, deleteBanner, toggleBannerActive, getBannerStats } from "@/app/actions/banner";

const PLACEMENT_OPTIONS = [
  { value: "TOP_FULL", label: "메인 최상단 와이드" },
  { value: "HEADER_TEXT", label: "헤더 우측 텍스트 (줄글)" },
  { value: "MAIN_TOP", label: "메인 상단" },
  { value: "MAIN_MIDDLE", label: "메인 중간" },
  { value: "MAIN_BOTTOM_FULL", label: "메인 최하단 롤링" },
  { value: "MAIN_ISSUE_RIGHT", label: "메인 이슈 우측" },
  { value: "SIDEBAR", label: "뉴스상세사이드바" },
  { value: "LIST_INLINE", label: "뉴스 리스트형" },
  { value: "LIST_SIDEBAR", label: "뉴스 리스트 사이드바" },
  { value: "NEWS_DETAIL", label: "뉴스 상세하단" },
  { value: "POPUP", label: "팝업" },
  { value: "CUSTOM", label: "기타 (직접입력)" }
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

async function compressImageToWebP(file: File, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context is not available"));
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Blob conversion failed"));
            const extName = file.name.replace(/\.[^/.]+$/, "");
            const newFile = new File([blob], `${extName}.webp`, { type: "image/webp" });
            resolve(newFile);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (e) => reject(e);
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function MobileBannerAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  
  const [banners, setBanners] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 화면 모드 상태
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  
  const [stats, setStats] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlacement, setSelectedPlacement] = useState("MAIN_TOP");
  const [customPlacement, setCustomPlacement] = useState("");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      const r = data?.role?.trim().toUpperCase() || '';
      if (r === 'ADMIN' || r === '최고관리자' || r.includes('관리자')) {
        setIsAdmin(true);
      } else {
        alert("최고관리자 전용 기능입니다.");
        router.push("/m");
        return;
      }
      setAuthChecked(true);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (authChecked) loadBanners();
  }, [authChecked]);

  useEffect(() => {
    if (action === "stats") {
      setShowStats(true);
      setShowForm(false);
      loadStats();
    } else if (action === "new" || action === "edit") {
      setShowForm(true);
      setShowStats(false);
    } else {
      setShowForm(false);
      setShowStats(false);
      setEditingBanner(null);
      setImagePreview(null);
      setCompressedImage(null);
      setCustomPlacement("");
    }
  }, [action]);

  useEffect(() => {
    if (showForm) {
      if (editingBanner) {
        if (PLACEMENT_OPTIONS.some(p => p.value === editingBanner.placement_code && p.value !== "CUSTOM")) {
          setSelectedPlacement(editingBanner.placement_code);
          setCustomPlacement("");
        } else {
          setSelectedPlacement("CUSTOM");
          setCustomPlacement(editingBanner.placement_code || "");
        }
      } else {
        setSelectedPlacement("MAIN_TOP");
        setCustomPlacement("");
      }
    }
  }, [showForm, editingBanner]);

  const loadBanners = async () => {
    setLoading(true);
    const res = await getBanners();
    if (res.success) setBanners(res.data || []);
    setLoading(false);
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

    const oldTarget = formData.get("link_target") as string;
    const targetCats = formData.getAll("target_categories") as string[];
    if ((selectedPlacement === "LIST_INLINE" || selectedPlacement === "LIST_SIDEBAR") && targetCats.length > 0) {
      formData.set("link_target", `${oldTarget}|${targetCats.join(",")}`);
    } else {
      formData.set("link_target", oldTarget);
    }

    if (compressedImage) formData.set("image", compressedImage);

    let res;
    if (editingBanner) {
      res = await updateBanner(editingBanner.id, formData);
    } else {
      res = await createBanner(formData);
    }
    
    if (res.success) {
      alert(editingBanner ? "배너가 수정되었습니다." : "배너가 등록되었습니다.");
      setEditingBanner(null);
      setImagePreview(null);
      setCompressedImage(null);
      setCustomPlacement("");
      setShowForm(false);
      router.push("/m/admin/banner");
      loadBanners();
    } else {
      alert("오류: " + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 배너를 삭제하시겠습니까?")) return;
    await deleteBanner(id);
    loadBanners();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleBannerActive(id, !current);
    loadBanners();
  };

  const tabs = ["전체", "진행중", "예약", "종료", "중지"];

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

  /* ── 폼 뷰 (등록/수정) ── */
  if (showForm) {
    const b = editingBanner;
    return (
      <div style={{ minHeight: "100dvh", background: "#f4f5f7" }}>
        {/* 헤더 */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/m/admin/banner")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>{b ? "배너 수정" : "새 배너 등록"}</h1>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
              
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>배너명 *</label>
                <input name="title" defaultValue={b?.title || ""} required placeholder="예: 2026년 봄 이벤트 배너"
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>
                  {(b?.placement_code === "HEADER_TEXT" || selectedPlacement === "HEADER_TEXT") ? "텍스트 배너 (이미지 불필요)" : "배너 이미지 *"}
                </label>
                <div onClick={() => {
                    if (b?.placement_code === "HEADER_TEXT" || selectedPlacement === "HEADER_TEXT") return;
                    fileInputRef.current?.click();
                  }}
                  style={{ width: "100%", height: 160, border: "2px dashed #d1d5db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: (b?.placement_code === "HEADER_TEXT" || selectedPlacement === "HEADER_TEXT") ? "not-allowed" : "pointer", overflow: "hidden", background: (b?.placement_code === "HEADER_TEXT" || selectedPlacement === "HEADER_TEXT") ? "#eee" : "#fafafa" }}
                >
                  {(b?.placement_code === "HEADER_TEXT" || selectedPlacement === "HEADER_TEXT") ? (
                    <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13 }}>텍스트 배너는 이미지가 필요 없습니다.</div>
                  ) : (imagePreview || b?.image_url) ? (
                    <img src={imagePreview || b?.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                      터치하여 이미지 업로드
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" name="image" accept="image/*" style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const webpFile = await compressImageToWebP(file, 0.85);
                        setCompressedImage(webpFile);
                        setImagePreview(URL.createObjectURL(webpFile));
                      } catch (error) {
                        setCompressedImage(null);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    } else {
                      setCompressedImage(null);
                    }
                  }} />
                {b?.image_url && <input type="hidden" name="image_url" value={b.image_url} />}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>링크 URL</label>
                <input name="link_url" defaultValue={b?.link_url || ""} placeholder="https://example.com"
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>링크 열기 방식</label>
                <select name="link_target" defaultValue={(b?.link_target || "_blank").split("|")[0]}
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                  <option value="_blank">새 창에서 열기</option>
                  <option value="_self">현재 창에서 열기</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 8 }}>노출 위치 확인 및 선택 *</label>
                <input type="hidden" name="placement_code" value={selectedPlacement === "CUSTOM" ? customPlacement : selectedPlacement} />
                <select 
                  value={selectedPlacement} 
                  onChange={(e) => setSelectedPlacement(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
                >
                  {PLACEMENT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {selectedPlacement === "CUSTOM" && (
                   <div style={{ padding: "16px", background: "#f9fafb", borderRadius: 8, border: "1px solid #3b82f6" }}>
                     <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>Custom 코드 입력</label>
                     <input value={customPlacement} onChange={(e) => setCustomPlacement(e.target.value)} required placeholder="예: CUSTOM_BOTTOM_1"
                        style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                   </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>시작 일시</label>
                  <input name="start_time" type="datetime-local" defaultValue={b?.start_time ? new Date(b.start_time).toISOString().slice(0, 16) : ""}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>종료 일시</label>
                  <input name="end_time" type="datetime-local" defaultValue={b?.end_time ? new Date(b.end_time).toISOString().slice(0, 16) : ""}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>노출 기기</label>
                <select name="device_type" defaultValue={b?.device_type || "ALL"}
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                  {DEVICE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>정렬 순서</label>
                  <input name="sort_order" type="number" defaultValue={b?.sort_order || 0}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>상단 여백</label>
                  <input name="margin_top" type="number" defaultValue={b?.margin_top || 0}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "16px", background: "#f9fafb", borderRadius: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="hidden" name="auto_rotate" value="false" />
                  <input type="checkbox" name="auto_rotate" value="true" defaultChecked={b?.auto_rotate || false}
                    style={{ width: 18, height: 18, accentColor: "#3b82f6" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>자동 롤링</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>간격(초)</span>
                  <input name="rotate_interval" type="number" min="1" max="30" defaultValue={b?.rotate_interval || 5}
                    style={{ width: 60, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, outline: "none", textAlign: "center" }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "100%" }}>
                  <input type="hidden" name="is_active" value="false" />
                  <input type="checkbox" name="is_active" value="true" defaultChecked={b?.is_active !== false}
                    style={{ width: 18, height: 18, accentColor: "#10b981" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>즉시 활성화</span>
                </label>
              </div>

            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => router.push("/m/admin/banner")}
                style={{ flex: 1, height: 48, background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button type="submit"
                style={{ flex: 2, height: 48, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{b ? "수정 저장" : "배너 등록"}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ── 통계 뷰 ── */
  if (showStats) {
    return (
      <div style={{ minHeight: "100dvh", background: "#f4f5f7" }}>
        {/* 헤더 */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/m/admin/banner")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>📊 성과 분석</h1>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px", border: "1px solid #e5e7eb", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>총 클릭수</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{stats.reduce((a, s) => a + (s.click_count || 0), 0).toLocaleString()}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px", border: "1px solid #e5e7eb", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>총 노출수</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6" }}>{stats.reduce((a, s) => a + (s.view_count || 0), 0).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, color: "#111" }}>배너별 CTR 현황</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {stats.map(s => {
                const ctrNum = parseFloat(s.ctr);
                const placeName = PLACEMENT_OPTIONS.find(p => p.value === s.placement_code)?.label || s.placement_code;
                return (
                  <div key={s.id} style={{ padding: "16px", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{placeName}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                      <span>노출: {(s.view_count || 0).toLocaleString()}</span>
                      <span>클릭: {(s.click_count || 0).toLocaleString()}</span>
                      <span style={{ fontWeight: 700, color: ctrNum > 5 ? "#10b981" : "#f59e0b" }}>CTR: {s.ctr}%</span>
                    </div>
                    <div style={{ background: "#f3f4f6", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(ctrNum * 5, 100)}%`, height: "100%", background: "linear-gradient(90deg, #3b82f6, #10b981)", borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
              {stats.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>데이터가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── 목록 뷰 ── */
  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7" }}>
      {/* 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>배너관리</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/m/admin/banner?action=stats")} style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#4b5563" }}>📊 통계</button>
          <button onClick={() => { setEditingBanner(null); router.push("/m/admin/banner?action=new"); }} style={{ background: "#3b82f6", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>+ 추가</button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
        {tabs.map(tab => {
          const count = tab === "전체" ? banners.length : banners.filter(b => getStatusInfo(b).label === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                flexShrink: 0, border: "none", background: "none", padding: "14px 16px", fontSize: 14,
                fontWeight: filter === tab ? 800 : 500,
                color: filter === tab ? "#3b82f6" : "#6b7280",
                borderBottom: filter === tab ? "3px solid #3b82f6" : "3px solid transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {tab}
              <span style={{
                background: tab === "전체" ? "#e5e7eb" : tab === "진행중" ? "#10b981" : tab === "예약" ? "#f59e0b" : tab === "종료" ? "#ef4444" : "#9ca3af",
                color: tab === "전체" ? "#4b5563" : "#fff",
                padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 목록 */}
      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>조회된 배너가 없습니다.</div>
          </div>
        ) : filtered.map(b => {
          const status = getStatusInfo(b);
          const placeName = PLACEMENT_OPTIONS.find(p => p.value === b.placement_code)?.label || b.placement_code;
          return (
            <div key={b.id} style={{ background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ padding: "4px 8px", background: status.bg, color: status.color, borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{status.label}</span>
                    <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "4px 8px", borderRadius: 6 }}>{placeName}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111", lineHeight: 1.4, wordBreak: "break-all" }}>{b.title}</div>
                </div>
              </div>

              {b.image_url && (
                <div style={{ width: "100%", height: 120, borderRadius: 8, overflow: "hidden", marginBottom: 12, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={b.image_url} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              )}

              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                <span>{b.start_time ? new Date(b.start_time).toLocaleDateString() : "-"} ~ {b.end_time ? new Date(b.end_time).toLocaleDateString() : "상시"}</span>
                <span>클릭 {b.click_count || 0} / 노출 {b.view_count || 0}</span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleToggle(b.id, b.is_active)} style={{ flex: 1, height: 36, background: b.is_active ? "#fef2f2" : "#ecfdf5", color: b.is_active ? "#dc2626" : "#10b981", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                  {b.is_active ? "중지하기" : "활성하기"}
                </button>
                <button onClick={() => { setEditingBanner(b); router.push(`/m/admin/banner?action=edit&id=${b.id}`); }} style={{ flex: 1, height: 36, background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                  수정
                </button>
                <button onClick={() => handleDelete(b.id)} style={{ width: 44, height: 36, background: "#fff", color: "#9ca3af", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function MobileBannerAdminPage() {
  return (
    <Suspense fallback={null}>
      <MobileBannerAdmin />
    </Suspense>
  );
}
