"use client";

/**
 * 최고관리자 — 주소록 (2026-11-25, docs/2026-11-25_crm_contacts_plan.md)
 *  사장님: "지역별로 나눠줘 · 그중에서 공실닷컴·교육부동산 이런 식으로 고르기"
 *  왼쪽 = 지역 (시도 › 시군구 › 동) · 표 위 = 구분(그룹) 고르기 — 둘을 같이 쓴다 (강남구 + 공실닷컴)
 *  오른쪽 표·[상세보기]·주소추가·다른그룹에 넣기·그룹에서 빼기·주소삭제 는 뿌리오 주소록 틀
 *  문자는 [문자 보내기] 에서 — [선택 주소 문자발송] 이 고른 사람(또는 지금 보이는 사람)을 넘긴다
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTheme } from "./types";
import {
  adminCrmOverview, adminCrmList, adminCrmGetContact, adminCrmUpdateContact, adminCrmSetTag, adminCrmAddEvent, adminCrmAddContact,
  adminCrmBulk, adminCrmRenameTag, adminCrmDeleteTag, adminCrmExport, adminCrmAddNumbers,
  type CrmOverview, type CrmFilter, type CrmRow, type CrmCard, type CrmStatus,
} from "@/app/actions/adminCrm";
import { NAVY, STATUSES, HANDOFF_KEY, fmtDate, makeUI, type UI } from "./crm/crmUi";

/** 구분 — 앞에 크게 보이는 것 (나머지는 [더 보기]) */
const MAIN_GROUPS: { tag: string; label: string }[] = [
  { tag: "공실닷컴", label: "공실닷컴" },
  { tag: "교육참여", label: "교육참여" },
  { tag: "뿌리오/부동산/강남부동산교육부동산", label: "강남부동산교육부동산" },
  { tag: "뿌리오주소록", label: "뿌리오 주소록" },
  { tag: "전국명단", label: "전국명단" },
  { tag: "공실뉴스가입", label: "공실뉴스 회원" },
];
const groupLabel = (tag: string) => MAIN_GROUPS.find((g) => g.tag === tag)?.label || tag.split("/").pop()!.replace(/_/g, " ");
/** 사장님이 만든 그룹 — 이름 바꾸기·지우기 되는 것 */
const isMine = (tag: string) => !MAIN_GROUPS.some((g) => g.tag === tag) && !tag.startsWith("뿌리오/") && !["공실닷컴_이용중", "공실닷컴_인증", "직접입력"].includes(tag);

type Region = { sido?: string; sigungu?: string; dong?: string };
const regionLabel = (r: Region) => [r.sido, r.sigungu, r.dong].filter(Boolean).join(" › ") || "전체 지역";

/** 문자 보내기 [주소록에서 불러오기] 창으로 쓸 때 — 고른 사람·지금 보이는 사람을 받는사람 칸에 담는다 */
export type CrmPick = { onAdd: (item: { label: string; filter: CrmFilter; count: number }) => void; onClose: () => void };

export default function CrmSection({ theme, pick }: { theme: AdminTheme; pick?: CrmPick }) {
  const ui = useMemo(() => makeUI(theme), [theme]);
  const router = useRouter();
  const [ov, setOv] = useState<CrmOverview | null>(null);
  const [extraGroups, setExtraGroups] = useState<string[]>([]); // 막 만든 빈 그룹 (사람을 넣으면 DB 에 생김)
  const [openSido, setOpenSido] = useState<Set<string>>(new Set());
  const [openSgg, setOpenSgg] = useState<Set<string>>(new Set());
  const [region, setRegion] = useState<Region>({});
  const [tags, setTags] = useState<string[]>([]);
  const [moreGroups, setMoreGroups] = useState(false);
  const [field, setField] = useState<CrmFilter["field"]>("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "old" | "office">("office");
  const [size, setSize] = useState(100);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<CrmRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<number | null>(null);
  const [modal, setModal] = useState<null | "add" | "numbers" | "toGroup" | "status">(null);
  const [busy, setBusy] = useState(false);
  const [sendMenu, setSendMenu] = useState(false);

  const loadOv = useCallback(async () => { setOv(await adminCrmOverview()); }, []);
  useEffect(() => { void loadOv(); }, [loadOv]);

  const filter: CrmFilter = useMemo(() => ({ ...region, tags: tags.length ? tags : undefined, q, field }), [region, tags, q, field]);
  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const r = await adminCrmList(filter, page, size, sort);
    setLoading(false);
    if (!r.success) { setErr(r.error || "불러오지 못했어요."); return; }
    setRows(r.rows); setTotal(r.total);
  }, [filter, page, size, sort]);
  useEffect(() => { if (ov?.success) void load(); }, [load, ov?.success]);
  useEffect(() => { setChecked(new Set()); }, [filter, page, size, sort]);

  // 지역 나무: 시도 › 시군구 › 동
  const tree = useMemo(() => {
    const m: Record<string, { n: number; sgg: Record<string, { n: number; dong: { dong: string; n: number }[] }> }> = {};
    for (const r of ov?.regions || []) {
      const s = (m[r.sido] ||= { n: 0, sgg: {} });
      s.n += r.n;
      const g = (s.sgg[r.sigungu] ||= { n: 0, dong: [] });
      g.n += r.n;
      g.dong.push({ dong: r.dong, n: r.n });
    }
    // 가나다 순 · (모름) 은 맨 끝
    const ko = (a: string, b: string) => (a === "(모름)" ? 1 : b === "(모름)" ? -1 : a.localeCompare(b, "ko"));
    const SIDO_ORDER = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
    const so = (s: string) => { const i = SIDO_ORDER.indexOf(s); return i < 0 ? 99 : i; };
    return Object.entries(m).sort((a, b) => so(a[0]) - so(b[0]) || ko(a[0], b[0])).map(([sido, v]) => ({
      sido, n: v.n,
      sgg: Object.entries(v.sgg).sort((a, b) => ko(a[0], b[0])).map(([sigungu, g]) => ({ sigungu, n: g.n, dong: g.dong.sort((a, b) => ko(a.dong, b.dong)) })),
    }));
  }, [ov]);

  const tagCount: Record<string, number> = useMemo(() => Object.fromEntries((ov?.tags || []).map((t) => [t.tag, t.n])), [ov]);
  const allGroups = useMemo(() => {
    const set = new Set([...(ov?.tags || []).map((t) => t.tag), ...extraGroups]);
    MAIN_GROUPS.forEach((g) => set.delete(g.tag));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [ov, extraGroups]);

  const refresh = async () => { await loadOv(); await load(); };
  const pickRegion = (r: Region) => { setRegion(r); setPage(0); };
  const toggleTag = (t: string) => { setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])); setPage(0); };
  const curTag = tags.length === 1 ? tags[0] : "";
  const viewLabel = `${regionLabel(region)}${tags.length ? ` · ${tags.map(groupLabel).join(" + ")}` : ""}${q ? ` · "${q}"` : ""}`;

  const ids = Array.from(checked);
  const allOnPage = rows.length > 0 && rows.every((r) => checked.has(r.id));
  const toggleAll = () => setChecked(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: number) => setChecked((p) => { const s = new Set(p); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  const bulk = async (action: "addTag" | "removeTag" | "status" | "delete", value?: string) => {
    setBusy(true);
    const r = await adminCrmBulk(ids, action, value);
    setBusy(false);
    if (!r.success) { alert(r.error); return false; }
    setChecked(new Set()); await refresh(); return true;
  };

  const sendTo = (mode: "checked" | "view") => {
    setSendMenu(false);
    if (mode === "checked" && !ids.length) { alert("주소를 골라 주세요."); return; }
    const f: CrmFilter = mode === "checked" ? { ids } : filter;
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ filter: f, label: mode === "checked" ? `주소록에서 고른 ${ids.length.toLocaleString()}명` : viewLabel })); } catch {}
    router.push("?menu=message", { scroll: false });
  };

  const download = async () => {
    if (total > 20000 && !window.confirm(`${total.toLocaleString()}명을 내려받을까요? 시간이 조금 걸려요.`)) return;
    setBusy(true);
    const r = await adminCrmExport(filter);
    setBusy(false);
    if (!r.success || !r.csv) { alert(r.error || "내려받지 못했어요."); return; }
    const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `주소록_${viewLabel.replace(/[\\/:*?"<>| ›+·]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const addGroup = () => {
    const name = window.prompt("새 그룹 이름 (예: VIP · 강의문의)");
    if (!name?.trim()) return;
    const t = name.trim().replace(/\s+/g, "_");
    setExtraGroups((g) => Array.from(new Set([...g, t])));
    setMoreGroups(true);
    setTags([t]); setPage(0);
  };
  const renameGroup = async (tag: string) => {
    const nv = window.prompt("새 그룹 이름", tag);
    if (!nv || nv === tag) return;
    const r = await adminCrmRenameTag(tag, nv);
    if (!r.success) { alert(r.error); return; }
    setTags((cur) => cur.filter((x) => x !== tag));
    await refresh();
  };
  const deleteGroup = async (tag: string) => {
    if (!window.confirm(`"${groupLabel(tag)}" 그룹을 지울까요?\n그룹만 지워지고 주소 ${(tagCount[tag] || 0).toLocaleString()}명은 그대로 남아요.`)) return;
    const r = await adminCrmDeleteTag(tag);
    if (!r.success) { alert(r.error); return; }
    setExtraGroups((g) => g.filter((x) => x !== tag));
    setTags((cur) => cur.filter((x) => x !== tag));
    await refresh();
  };

  const rowStyle = (active: boolean, depth: number): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6, padding: `7px 10px 7px ${10 + depth * 16}px`, cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${ui.border}`,
    background: active ? (ui.darkMode ? "#26304a" : "#eef2fb") : "transparent", borderLeft: active ? `3px solid ${NAVY}` : "3px solid transparent", color: ui.textPrimary, fontWeight: active ? 800 : 500,
  });
  const arrow = (open: boolean, onClick: () => void) => (
    <span onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ width: 14, color: ui.textSecondary, fontSize: 11 }}>{open ? "▼" : "▶"}</span>
  );
  const cnt = (n: number) => <span style={{ color: "#2563eb", fontWeight: 600 }}>({n.toLocaleString()})</span>;
  const same = (r: Region) => r.sido === region.sido && r.sigungu === region.sigungu && r.dong === region.dong;

  const th: React.CSSProperties = { padding: "10px 8px", fontWeight: 700, color: ui.textSecondary, textAlign: "left", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "9px 8px", whiteSpace: "nowrap" };
  const pages = Math.max(1, Math.ceil(total / size));
  const chip = (tag: string, label: string, mine: boolean) => {
    const on = tags.includes(tag);
    const n = tagCount[tag] || 0;
    return (
      <span key={tag} style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${on ? NAVY : ui.border}`, borderRadius: 16, background: on ? NAVY : ui.inputBg, overflow: "hidden" }}>
        <button onClick={() => toggleTag(tag)} style={{ border: "none", background: "none", padding: "5px 12px", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", color: on ? "#fff" : ui.textPrimary }}>
          {on ? "✓ " : ""}{label} <span style={{ opacity: 0.75, fontWeight: 500 }}>{n.toLocaleString()}</span>
        </button>
        {mine && (
          <>
            <button title="이름 바꾸기" onClick={() => void renameGroup(tag)} style={{ border: "none", background: "none", cursor: "pointer", color: on ? "#fff" : ui.textSecondary, fontSize: 11, padding: "0 4px" }}>✎</button>
            <button title="그룹 지우기 (주소는 남음)" onClick={() => void deleteGroup(tag)} style={{ border: "none", background: "none", cursor: "pointer", color: on ? "#fff" : ui.textSecondary, fontSize: 11, padding: "0 8px 0 2px" }}>✕</button>
          </>
        )}
      </span>
    );
  };

  return (
    <div style={{ padding: pick ? "16px 20px" : "20px 28px", height: pick ? "100%" : "calc(100vh - 64px)", overflowY: "auto", background: ui.darkMode ? "#18191c" : "#f4f5f7", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${ui.border}`, paddingBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: ui.textPrimary, margin: 0 }}>{pick ? "주소록에서 불러오기" : "주소록"}</h1>
          {pick && <button style={{ ...ui.secBtn, height: 34 }} onClick={pick.onClose}>닫기 ✕</button>}
          <span style={{ fontSize: 12.5, color: ui.textSecondary }}>{ov?.success ? <>전체 <b>{ov.total.toLocaleString()}</b>명 · 지역별로 보고, 위에서 구분을 골라 거르세요</> : "전국 부동산 주소록"}</span>
        </div>

        {ov && !ov.success && (
          <div style={{ ...ui.card, color: ov.missingTable ? ui.textSecondary : "#dc2626", lineHeight: 1.7, textAlign: "center" }}>
            {ov.missingTable ? <>주소록 표가 아직 없어요. Supabase SQL Editor 에서 <b>supabase/migrations/20261125_crm.sql</b> 을 실행해 주세요.</> : <>불러오지 못했어요. {ov.error}</>}
          </div>
        )}
        {!ov && <div style={{ ...ui.card, textAlign: "center", color: ui.textSecondary }}>불러오는 중…</div>}

        {ov?.success && (
          <>
            {/* 검색줄 */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={field} onChange={(e) => setField(e.target.value as CrmFilter["field"])} style={{ ...ui.field, height: 40, width: 110 }}>
                <option value="">전체</option><option value="office">상호</option><option value="name">대표자</option><option value="phone">휴대폰</option><option value="address">주소</option>
              </select>
              <input value={qInput} onChange={(e) => setQInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setQ(qInput.trim()); setPage(0); } }}
                placeholder="검색어를 입력하세요" style={{ ...ui.field, height: 40, width: 340 }} />
              <button style={{ ...ui.secBtn, height: 40, width: 44 }} title="찾기" onClick={() => { setQ(qInput.trim()); setPage(0); }}>🔍</button>
              <button style={{ ...ui.secBtn, height: 40, width: 44 }} title="처음으로 (지역·구분·검색 지우기)" onClick={() => { setQInput(""); setQ(""); setTags([]); setRegion({}); setPage(0); void loadOv(); }}>⟳</button>
              <div style={{ flex: 1 }} />
              {pick ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ ...ui.secBtn, height: 40, padding: "0 14px" }} disabled={!ids.length}
                    onClick={() => { pick.onAdd({ label: `고른 주소 ${ids.length.toLocaleString()}명`, filter: { ids }, count: ids.length }); setChecked(new Set()); }}>고른 {ids.length.toLocaleString()}명 담기</button>
                  <button style={{ ...ui.priBtn, height: 40, padding: "0 18px", fontSize: 13.5 }} disabled={!total}
                    onClick={() => pick.onAdd({ label: viewLabel, filter, count: total })}>지금 보이는 {total.toLocaleString()}명 담기 →</button>
                </div>
              ) : (
              <div style={{ position: "relative" }}>
                <button style={{ ...ui.priBtn, height: 40, padding: "0 18px", fontSize: 13.5 }} onClick={() => setSendMenu((v) => !v)}>선택 주소 문자발송 ▾</button>
                {sendMenu && (
                  <div style={{ position: "absolute", right: 0, top: 44, zIndex: 30, width: 300, background: ui.cardBg, border: `1px solid ${ui.border}`, borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", overflow: "hidden" }}>
                    <button onClick={() => sendTo("checked")} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: "none", borderBottom: `1px solid ${ui.border}`, background: "none", cursor: "pointer", fontSize: 13, color: ui.textPrimary, fontFamily: "inherit" }}>
                      고른 주소 <b>{ids.length.toLocaleString()}</b>명에게
                    </button>
                    <button onClick={() => sendTo("view")} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: ui.textPrimary, fontFamily: "inherit" }}>
                      지금 보이는 <b>{viewLabel}</b> <b>{total.toLocaleString()}</b>명에게
                    </button>
                  </div>
                )}
              </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
              {/* 왼쪽: 지역 */}
              <div style={{ ...ui.card, padding: 0, overflow: "hidden", position: "sticky", top: 0 }}>
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${ui.border}`, fontSize: 13.5, fontWeight: 800, color: ui.textPrimary, display: "flex", alignItems: "center" }}>
                  <span style={{ flex: 1 }}>📍 지역</span>
                  <button style={{ ...ui.secBtn, height: 28 }} disabled={busy} onClick={() => void download()}>⬇ 엑셀</button>
                </div>
                <div style={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
                  <div onClick={() => pickRegion({})} style={rowStyle(!region.sido, 0)}>📒 전체 지역 {cnt(ov.total)}</div>
                  {tree.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: ui.textSecondary, lineHeight: 1.6 }}>지역이 아직 없어요. 20261125_crm_2.sql 을 실행한 뒤 명단을 다시 넣으면 지역별로 나뉘어요.</div>}
                  {tree.map((s) => {
                    const so = openSido.has(s.sido);
                    return (
                      <div key={s.sido}>
                        <div onClick={() => { pickRegion({ sido: s.sido }); setOpenSido((o) => new Set([...o, s.sido])); }} style={rowStyle(same({ sido: s.sido }), 0)}>
                          {arrow(so, () => setOpenSido((o) => { const n = new Set(o); if (n.has(s.sido)) n.delete(s.sido); else n.add(s.sido); return n; }))}
                          📁 <span style={{ flex: 1 }}>{s.sido}</span> {cnt(s.n)}
                        </div>
                        {so && s.sgg.map((g) => {
                          const key = `${s.sido}/${g.sigungu}`;
                          const go = openSgg.has(key);
                          const hasDong = g.dong.length > 1 || (g.dong[0] && g.dong[0].dong !== "(모름)");
                          return (
                            <div key={key}>
                              <div onClick={() => { pickRegion({ sido: s.sido, sigungu: g.sigungu }); if (hasDong) setOpenSgg((o) => new Set([...o, key])); }} style={rowStyle(same({ sido: s.sido, sigungu: g.sigungu }), 1)}>
                                {hasDong ? arrow(go, () => setOpenSgg((o) => { const n = new Set(o); if (n.has(key)) n.delete(key); else n.add(key); return n; })) : <span style={{ width: 14 }} />}
                                📁 <span style={{ flex: 1 }}>{g.sigungu}</span> {cnt(g.n)}
                              </div>
                              {go && g.dong.map((d) => (
                                <div key={d.dong} onClick={() => pickRegion({ sido: s.sido, sigungu: g.sigungu, dong: d.dong })} style={rowStyle(same({ sido: s.sido, sigungu: g.sigungu, dong: d.dong }), 2)}>
                                  <span style={{ width: 14 }} />👥 <span style={{ flex: 1 }}>{d.dong}</span> {cnt(d.n)}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 오른쪽 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                {/* 구분 고르기 */}
                <div style={{ ...ui.card, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <b style={{ fontSize: 13.5, color: ui.textPrimary }}>구분</b>
                    <span style={{ fontSize: 12, color: ui.textSecondary }}>고르지 않으면 전부 · 여러 개 고르면 하나라도 해당하는 사람</span>
                    <div style={{ flex: 1 }} />
                    {tags.length > 0 && <button style={{ ...ui.secBtn, height: 26, fontSize: 11.5 }} onClick={() => { setTags([]); setPage(0); }}>구분 지우기</button>}
                    <button style={{ ...ui.secBtn, height: 26, fontSize: 11.5 }} onClick={addGroup}>+ 그룹 만들기</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {MAIN_GROUPS.filter((g) => g.tag in tagCount).map((g) => chip(g.tag, g.label, false))}
                    {allGroups.filter(isMine).map((t) => chip(t, groupLabel(t), true))}
                    <button onClick={() => setMoreGroups((v) => !v)} style={{ ...ui.secBtn, height: 30, borderRadius: 16, borderStyle: "dashed", fontSize: 12 }}>{moreGroups ? "접기" : "뿌리오 그룹 더 보기"}</button>
                  </div>
                  {moreGroups && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${ui.border}` }}>
                      {allGroups.filter((t) => !isMine(t)).map((t) => chip(t, groupLabel(t), false))}
                    </div>
                  )}
                </div>

                {/* 표 */}
                <div style={{ ...ui.card, padding: 0, overflow: "hidden" }}>
                  {!pick && <div style={{ display: "flex", gap: 6, padding: 10, borderBottom: `1px solid ${ui.border}`, flexWrap: "wrap", alignItems: "center" }}>
                    <button style={ui.priBtn} onClick={() => setModal("add")}>👤 주소추가</button>
                    <button style={ui.secBtn} onClick={() => setModal("numbers")}>여러 번호 넣기</button>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12.5, color: ui.textSecondary }}>고른 주소 <b style={{ color: ui.textPrimary }}>{ids.length.toLocaleString()}</b></span>
                    <button style={ui.secBtn} disabled={!ids.length || busy} onClick={() => setModal("toGroup")}>➜ 그룹에 넣기</button>
                    <button style={ui.secBtn} disabled={!ids.length || busy || !curTag} title={curTag ? "" : "위에서 구분 하나를 고르면 그 그룹에서 뺄 수 있어요"}
                      onClick={() => { if (window.confirm(`고른 ${ids.length}명을 "${groupLabel(curTag)}" 에서 뺄까요? (주소는 남아요)`)) void bulk("removeTag", curTag); }}>그룹에서 빼기</button>
                    <button style={ui.secBtn} disabled={!ids.length || busy} onClick={() => setModal("status")}>상태 바꾸기</button>
                    <button style={{ ...ui.secBtn, color: "#dc2626" }} disabled={!ids.length || busy}
                      onClick={() => { if (window.confirm(`고른 ${ids.length}명의 주소를 지울까요?\n그룹·문자 기록까지 모두 지워지고 되돌릴 수 없어요.`)) void bulk("delete"); }}>🗑 주소삭제</button>
                  </div>}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: `1px solid ${ui.border}`, fontSize: 13, color: ui.textPrimary }}>
                    <span>📁 <b>{viewLabel}</b> <span style={{ color: "#2563eb" }}>({total.toLocaleString()})</span></span>
                    <div style={{ flex: 1 }} />
                    <select value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); setPage(0); }} style={{ ...ui.field, height: 30 }}>
                      <option value="office">상호 순</option><option value="recent">최근 넣은 순</option><option value="old">오래된 순</option>
                    </select>
                    <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} style={{ ...ui.field, height: 30 }}>
                      <option value={50}>50개씩</option><option value={100}>100개씩</option><option value={200}>200개씩</option><option value={500}>500개씩</option>
                    </select>
                  </div>

                  {err && <div style={{ color: "#dc2626", fontSize: 13, padding: 12 }}>{err}</div>}
                  <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 400px)", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, opacity: loading ? 0.5 : 1 }}>
                      <thead style={{ position: "sticky", top: 0, background: ui.cardBg, zIndex: 1 }}>
                        <tr style={{ borderBottom: `1px solid ${ui.border}` }}>
                          <th style={{ ...th, width: 36 }}><input type="checkbox" checked={allOnPage} onChange={toggleAll} /></th>
                          <th style={th}>상호</th><th style={th}>대표자</th><th style={th}>휴대폰</th><th style={th}>지역</th><th style={th}>구분</th><th style={th}>문자</th><th style={th}>마지막 보냄</th><th style={th} />
                        </tr>
                      </thead>
                      <tbody>
                        {!loading && rows.length === 0 && (
                          <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: ui.textSecondary, lineHeight: 1.8 }}>
                            {curTag && extraGroups.includes(curTag) ? "새 그룹이에요. 주소를 골라 [그룹에 넣기] 하거나 [주소추가]로 넣어 주세요." : (
                              <>
                                {q && (tags.length > 0 || region.sido) ? <>고른 {region.sido ? "지역" : ""}{region.sido && tags.length ? "·" : ""}{tags.length ? "구분" : ""} 안에는 &quot;{q}&quot; 가 없어요.<br /></> : "주소가 없어요."}
                                {q && (tags.length > 0 || region.sido) && (
                                  <button style={{ ...ui.priBtn, marginTop: 8 }} onClick={() => { setTags([]); setRegion({}); setPage(0); }}>전체에서 &quot;{q}&quot; 찾기</button>
                                )}
                              </>
                            )}
                          </td></tr>
                        )}
                        {rows.map((r) => (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${ui.border}`, color: ui.textPrimary, background: checked.has(r.id) ? (ui.darkMode ? "#1f2a40" : "#f5f8ff") : "transparent" }}>
                            <td style={td}><input type="checkbox" checked={checked.has(r.id)} onChange={() => toggle(r.id)} /></td>
                            <td style={{ ...td, fontWeight: 600, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{r.office_name || "-"}</td>
                            <td style={td}>{r.name || <span style={{ color: ui.textSecondary }}>-</span>}</td>
                            <td style={td}>{r.phone}</td>
                            <td style={{ ...td, color: ui.textSecondary }}>{[r.sido, r.sigungu].filter(Boolean).join(" ") || "-"}</td>
                            <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", fontSize: 12, color: ui.textSecondary }} title={r.tags.join(", ")}>
                              {r.tags.filter((t) => MAIN_GROUPS.some((g) => g.tag === t) || isMine(t)).map(groupLabel).join(", ") || "-"}
                            </td>
                            <td style={td}>{ui.badge(r.sms_status)}</td>
                            <td style={{ ...td, fontSize: 12, color: ui.textSecondary }}>{fmtDate(r.last_sent_at, false)}</td>
                            <td style={td}><button style={{ ...ui.secBtn, height: 28, borderColor: "#93a3c4", color: NAVY }} onClick={() => setDetail(r.id)}>상세보기</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, alignItems: "center", padding: 10, borderTop: `1px solid ${ui.border}`, fontSize: 13, color: ui.textSecondary }}>
                    <button style={ui.secBtn} disabled={page === 0} onClick={() => setPage(0)}>«</button>
                    <button style={ui.secBtn} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>이전</button>
                    <span>{(page + 1).toLocaleString()} / {pages.toLocaleString()}</span>
                    <button style={ui.secBtn} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>다음</button>
                    <button style={ui.secBtn} disabled={page + 1 >= pages} onClick={() => setPage(pages - 1)}>»</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {detail !== null && <DetailModal id={detail} ui={ui} groups={ov?.tags.map((t) => t.tag) || []} onClose={(changed) => { setDetail(null); if (changed) void refresh(); }} />}
      {modal === "add" && <AddModal ui={ui} defaultGroup={curTag} onClose={(id) => { setModal(null); if (id) { setExtraGroups((g) => g.filter((x) => x !== curTag)); void refresh(); } }} />}
      {modal === "numbers" && <NumbersModal ui={ui} defaultGroup={curTag || "직접입력"} onClose={(done) => { setModal(null); if (done) void refresh(); }} />}
      {modal === "toGroup" && (
        <GroupPickModal ui={ui} title={`고른 ${ids.length.toLocaleString()}명을 그룹에 넣기`} groups={[...(ov?.tags.map((t) => t.tag) || []), ...extraGroups].filter((t) => !t.startsWith("뿌리오/"))}
          onClose={async (tag) => { setModal(null); if (tag && (await bulk("addTag", tag))) setExtraGroups((g) => g.filter((x) => x !== tag)); }} />
      )}
      {modal === "status" && (
        <Modal ui={ui} onClose={() => setModal(null)} width={380}>
          <b style={{ fontSize: 15, color: ui.textPrimary }}>고른 {ids.length.toLocaleString()}명 문자 상태 바꾸기</b>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {STATUSES.map((s) => (
              <button key={s} style={{ ...ui.secBtn, height: 38, textAlign: "left" }} onClick={() => { setModal(null); void bulk("status", s); }}>{ui.badge(s)}</button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── 창 틀 ── */
function Modal({ ui, onClose, children, width = 560 }: { ui: UI; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...ui.card, width: "100%", maxWidth: width, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: "20px 22px" }}>{children}</div>
    </div>
  );
}
function Row({ ui, label, children }: { ui: UI; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: ui.textPrimary }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

/* ── 주소 상세보기 (뿌리오 창 모양 + 문자 상태 · 있었던 일) ── */
function DetailModal({ id, ui, groups, onClose }: { id: number; ui: UI; groups: string[]; onClose: (changed: boolean) => void }) {
  const [c, setC] = useState<CrmCard | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [evKind, setEvKind] = useState<"전화" | "답장" | "메모">("전화");
  const [evText, setEvText] = useState("");

  const load = useCallback(async () => {
    const r = await adminCrmGetContact(id);
    if (!r.success || !r.card) { setErr(r.error || "불러오지 못했어요."); return; }
    const k = r.card as CrmCard & { fax?: string | null; tel?: string | null; email?: string | null };
    setC(r.card);
    setForm({ office_name: k.office_name || "", name: k.name || "", phone: k.phone || "", tel: k.tel || "", fax: k.fax || "", email: k.email || "", address: k.address || "", memo: k.memo || "" });
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.success) { alert(r.error || "하지 못했어요."); return false; }
    setChanged(true); await load(); return true;
  };
  const save = async () => { if (await run(() => adminCrmUpdateContact(id, form))) onClose(true); };
  const inp = (k: string, ph = "") => (
    <input value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph} style={{ ...ui.field, width: "100%", boxSizing: "border-box", height: 38 }} />
  );

  return (
    <Modal ui={ui} onClose={() => onClose(changed)} width={620}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${ui.border}`, paddingBottom: 12, marginBottom: 10 }}>
        <b style={{ fontSize: 17, color: ui.textPrimary }}>주소 상세보기</b>
        <button onClick={() => onClose(changed)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: ui.textSecondary }}>✕</button>
      </div>
      {!c ? <div style={{ padding: 30, textAlign: "center", color: err ? "#dc2626" : ui.textSecondary }}>{err || "불러오는 중…"}</div> : (
        <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
          <div style={{ fontSize: 12.5, color: "#2563eb", marginBottom: 6 }}>
            {c.tags.length ? c.tags.map((t) => `📁 ${t.split("/").join(" › ")}`).join("   ") : "그룹 없음"}
          </div>
          <Row ui={ui} label="상호">{inp("office_name")}</Row>
          <Row ui={ui} label="대표자">{inp("name")}</Row>
          <Row ui={ui} label="휴대폰번호 *">{inp("phone", "010-0000-0000")}</Row>
          <Row ui={ui} label="일반전화">{inp("tel")}</Row>
          <Row ui={ui} label="팩스번호">{inp("fax")}</Row>
          <Row ui={ui} label="이메일">{inp("email")}</Row>
          <Row ui={ui} label="주소">{inp("address")}</Row>
          <Row ui={ui} label="메모">
            <textarea value={form.memo || ""} onChange={(e) => setForm({ ...form, memo: e.target.value })} rows={2}
              style={{ width: "100%", boxSizing: "border-box", padding: 8, border: `1px solid ${ui.border}`, borderRadius: 6, background: ui.inputBg, color: ui.textPrimary, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
          </Row>
          <Row ui={ui} label="문자 상태">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select value={c.sms_status} disabled={busy} onChange={(e) => void run(() => adminCrmUpdateContact(id, { sms_status: e.target.value as CrmStatus }))} style={{ ...ui.field, height: 36 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span style={{ fontSize: 12, color: ui.textSecondary }}>
                연속 무반응 {c.no_reply_streak}번{c.sms_status === "쉬는중" && c.rest_until ? ` · ${c.rest_until} 까지 쉼` : ""} · 공실뉴스 {c.member_grade || "가입 안 함"}
              </span>
            </div>
          </Row>
          <Row ui={ui} label="그룹">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {c.tags.map((t) => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "3px 8px", borderRadius: 4, background: ui.darkMode ? "#2a2b2f" : "#eef1f7", color: NAVY, fontWeight: 700 }}>
                  {t.split("/").join(" › ")}
                  <button disabled={busy} title="이 그룹에서 빼기" onClick={() => { if (window.confirm(`"${t}" 그룹에서 뺄까요?`)) void run(() => adminCrmSetTag(id, t, false)); }}
                    style={{ border: "none", background: "none", cursor: "pointer", color: ui.textSecondary, padding: 0 }}>✕</button>
                </span>
              ))}
              <input list="crm-groups" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="그룹 넣기"
                onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { const t = newTag; setNewTag(""); void run(() => adminCrmSetTag(id, t, true)); } }}
                style={{ ...ui.field, height: 28, width: 150 }} />
              <datalist id="crm-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
              <button style={{ ...ui.secBtn, height: 28 }} disabled={busy || !newTag.trim()} onClick={() => { const t = newTag; setNewTag(""); void run(() => adminCrmSetTag(id, t, true)); }}>넣기</button>
            </div>
          </Row>

          <div style={{ borderTop: `1px solid ${ui.border}`, marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: ui.textPrimary, marginBottom: 6 }}>있었던 일 <span style={{ fontWeight: 500, color: ui.textSecondary, fontSize: 12 }}>(전화·답장을 적으면 반응으로 쳐요)</span></div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <select value={evKind} onChange={(e) => setEvKind(e.target.value as typeof evKind)} style={ui.field}>
                <option value="전화">전화</option><option value="답장">답장</option><option value="메모">메모</option>
              </select>
              <input value={evText} onChange={(e) => setEvText(e.target.value)} placeholder="예: PRO 가격 물어봄" style={{ ...ui.field, flex: 1 }} />
              <button style={ui.priBtn} disabled={busy} onClick={() => { const t = evText; setEvText(""); void run(() => adminCrmAddEvent(id, evKind, t)); }}>적기</button>
            </div>
            <div style={{ border: `1px solid ${ui.border}`, borderRadius: 6, maxHeight: 200, overflowY: "auto" }}>
              {c.events.length === 0 && <div style={{ padding: 12, fontSize: 12.5, color: ui.textSecondary, textAlign: "center" }}>아직 기록이 없어요.</div>}
              {c.events.map((e) => (
                <div key={e.id} style={{ display: "flex", gap: 10, padding: "7px 10px", borderBottom: `1px solid ${ui.border}`, fontSize: 12.5, color: ui.textPrimary }}>
                  <span style={{ color: ui.textSecondary, whiteSpace: "nowrap", width: 112 }}>{fmtDate(e.created_at)}</span>
                  <b style={{ whiteSpace: "nowrap", minWidth: 52 }}>{e.kind}</b>
                  <span style={{ flex: 1, color: ui.textSecondary }}>{[e.campaign_name, e.detail].filter(Boolean).join(" — ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {c && (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", borderTop: `1px solid ${ui.border}`, marginTop: 12, paddingTop: 12 }}>
          <button style={{ ...ui.secBtn, color: "#dc2626", marginRight: "auto" }} disabled={busy}
            onClick={async () => { if (!window.confirm("이 주소를 지울까요? 그룹·문자 기록까지 모두 지워지고 되돌릴 수 없어요.")) return; const r = await adminCrmBulk([id], "delete"); if (r.success) onClose(true); else alert(r.error); }}>주소삭제</button>
          <button style={{ ...ui.secBtn, height: 38, padding: "0 18px" }} onClick={() => onClose(changed)}>닫기</button>
          <button style={{ ...ui.priBtn, height: 38, padding: "0 22px" }} disabled={busy} onClick={() => void save()}>저장</button>
        </div>
      )}
    </Modal>
  );
}

/* ── 주소추가 ── */
function AddModal({ ui, defaultGroup, onClose }: { ui: UI; defaultGroup: string; onClose: (id?: number) => void }) {
  const [f, setF] = useState<Record<string, string>>({ group: defaultGroup });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await adminCrmAddContact({ phone: f.phone || "", office_name: f.office_name, name: f.name, tel: f.tel, fax: f.fax, email: f.email, address: f.address, memo: f.memo, tags: f.group ? [f.group] : [] });
    setBusy(false);
    if (!r.success) { alert(r.error); if (r.id) onClose(r.id); return; }
    onClose(r.id);
  };
  const inp = (k: string, ph = "") => <input value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} style={{ ...ui.field, width: "100%", boxSizing: "border-box", height: 38 }} />;
  return (
    <Modal ui={ui} onClose={() => onClose()}>
      <b style={{ fontSize: 17, color: ui.textPrimary }}>주소추가</b>
      <div style={{ fontSize: 12, color: ui.textSecondary, margin: "6px 0 10px" }}>※ 휴대폰번호는 꼭 넣어 주세요. 문자 상태는 보냄가능으로 들어가요.</div>
      <Row ui={ui} label="그룹">{inp("group", "예: 내그룹/VIP (비우면 그룹 없음)")}</Row>
      <Row ui={ui} label="상호">{inp("office_name", "○○공인중개사사무소")}</Row>
      <Row ui={ui} label="대표자">{inp("name")}</Row>
      <Row ui={ui} label="휴대폰번호 *">{inp("phone", "010-0000-0000")}</Row>
      <Row ui={ui} label="일반전화">{inp("tel")}</Row>
      <Row ui={ui} label="팩스번호">{inp("fax")}</Row>
      <Row ui={ui} label="이메일">{inp("email")}</Row>
      <Row ui={ui} label="주소">{inp("address")}</Row>
      <Row ui={ui} label="메모">{inp("memo")}</Row>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 12 }}>
        <button style={{ ...ui.secBtn, height: 38, padding: "0 18px" }} onClick={() => onClose()}>닫기</button>
        <button style={{ ...ui.priBtn, height: 38, padding: "0 22px" }} disabled={busy || !f.phone?.trim()} onClick={() => void save()}>{busy ? "넣는 중…" : "저장"}</button>
      </div>
    </Modal>
  );
}

/* ── 여러 번호 넣기 (붙여넣기) ── */
function NumbersModal({ ui, defaultGroup, onClose }: { ui: UI; defaultGroup: string; onClose: (done: boolean) => void }) {
  const [text, setText] = useState("");
  const [group, setGroup] = useState(defaultGroup);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const save = async () => {
    setBusy(true);
    const r = await adminCrmAddNumbers(text, group);
    setBusy(false);
    if (!r.success) { setMsg(r.error || "넣지 못했어요."); return; }
    alert(`새로 넣음 ${r.added.toLocaleString()} · 이미 있던 번호 ${r.existed.toLocaleString()}${group ? ` (모두 "${group}" 그룹에)` : ""}${r.bad ? ` · 휴대폰 아님 ${r.bad.toLocaleString()}` : ""}`);
    onClose(true);
  };
  return (
    <Modal ui={ui} onClose={() => onClose(false)}>
      <b style={{ fontSize: 17, color: ui.textPrimary }}>여러 번호 넣기</b>
      <div style={{ fontSize: 12, color: ui.textSecondary, margin: "6px 0 10px", lineHeight: 1.6 }}>휴대폰 번호를 한 줄에 하나씩 (또는 쉼표로) 붙여넣으세요. 1만 개까지. 이미 있는 번호는 그룹에만 넣어요.</div>
      <Row ui={ui} label="그룹"><input value={group} onChange={(e) => setGroup(e.target.value)} style={{ ...ui.field, width: "100%", boxSizing: "border-box", height: 38 }} /></Row>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder={"010-1234-5678\n01098765432"}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: 10, border: `1px solid ${ui.border}`, borderRadius: 6, background: ui.inputBg, color: ui.textPrimary, fontSize: 13, fontFamily: "inherit" }} />
      {msg && <div style={{ color: "#dc2626", fontSize: 12.5, marginTop: 6 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 12 }}>
        <button style={{ ...ui.secBtn, height: 38, padding: "0 18px" }} onClick={() => onClose(false)}>닫기</button>
        <button style={{ ...ui.priBtn, height: 38, padding: "0 22px" }} disabled={busy || !text.trim()} onClick={() => void save()}>{busy ? "넣는 중…" : "넣기"}</button>
      </div>
    </Modal>
  );
}

/* ── 그룹 고르기 (다른그룹에 넣기) ── */
function GroupPickModal({ ui, title, groups, onClose }: { ui: UI; title: string; groups: string[]; onClose: (tag?: string) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => Array.from(new Set(groups)).filter((g) => !q || g.includes(q)).sort((a, b) => a.localeCompare(b, "ko")).slice(0, 200), [groups, q]);
  return (
    <Modal ui={ui} onClose={() => onClose()} width={460}>
      <b style={{ fontSize: 16, color: ui.textPrimary }}>{title}</b>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="그룹 찾기 또는 새 그룹 이름 (폴더/그룹)" autoFocus
        style={{ ...ui.field, width: "100%", boxSizing: "border-box", height: 38, marginTop: 12 }} />
      {q.trim() && !groups.includes(q.trim()) && (
        <button style={{ ...ui.priBtn, width: "100%", height: 36, marginTop: 8 }} onClick={() => onClose(q.trim())}>+ 새 그룹 &quot;{q.trim()}&quot; 만들어 넣기</button>
      )}
      <div style={{ border: `1px solid ${ui.border}`, borderRadius: 6, maxHeight: 320, overflowY: "auto", marginTop: 8 }}>
        {list.map((g) => (
          <div key={g} onClick={() => onClose(g)} style={{ padding: "9px 12px", borderBottom: `1px solid ${ui.border}`, cursor: "pointer", fontSize: 13, color: ui.textPrimary }}>👥 {g.split("/").join(" › ")}</div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button style={ui.secBtn} onClick={() => onClose()}>닫기</button>
      </div>
    </Modal>
  );
}

