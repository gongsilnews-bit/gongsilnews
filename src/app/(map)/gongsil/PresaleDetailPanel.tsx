"use client";
/**
 * 분양 단지 상세 창 (2026-11-26 사장님: 아파트 단지 상세 창과 같은 틀로 — 색은 보라)
 *  맨 위 로드뷰 + 이름·주소 · 세대수·입주 예정 · 시공·시행 · 평형 고르기 + 분양가(큰 글자) · 청약 일정(그래프 자리) · 평형별 분양가 · 맨 아래 모집공고
 *  값은 청약홈 자료 그대로, 없는 칸은 "-" (지어내지 않는다)
 */
import React, { useEffect, useMemo, useState } from "react";
import { HeroRoadview, heroBtn } from "./AptDetailPanel";
import { repType } from "@/utils/presale";
import { collectText, thirdText } from "@/utils/presaleConsent";
import { submitPresaleRequest } from "@/app/actions/presale";
import { createClient } from "@/utils/supabase/client";

export const PRESALE = "#6d28d9";      // 분양 보라 — 청약 전·진행 중 (11-26 사장님: 더 진하게)
export const PRESALE_DIM = "#4b5563";  // 청약 마감 — 짙은 회색 (11-26 사장님: 마감은 보라 말고 그레이, 지금 청약할 수 있는 곳만 보라로 눈에 띄게)
const SOFT = "#f5f3ff";
const SUB = "#6b7280";

export type PresaleItem = {
  id: string; kind: "apt" | "ofc" | "rem"; name: string; address: string | null; house_type: string | null; supply_kind: string | null;
  total_units: number | null; notice_date: string | null; special_start: string | null; special_end: string | null;
  rank1_date: string | null; rank2_date: string | null; receipt_start: string | null; receipt_end: string | null; winner_date: string | null;
  contract_start: string | null; contract_end: string | null; move_in_ym: string | null; builder: string | null; developer: string | null;
  notice_url: string | null; homepage: string | null; phone: string | null; lat: number | null; lng: number | null;
  types: { type: string; area: number | null; supply_area: number | null; units: number | null; price: number | null }[];
};

const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // 한국 날짜
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** 청약 단계 — 지도 표시 아래 줄과 카드에 */
export function presaleStage(x: { receipt_start: string | null; receipt_end: string | null; winner_date: string | null }) {
  const t = today();
  if (x.receipt_start && t < x.receipt_start) return { short: `청약 D-${days(t, x.receipt_start)}`, live: true, done: false };
  if (x.receipt_end && t <= x.receipt_end) return { short: "청약 중", live: true, done: false };
  if (x.winner_date && t < x.winner_date) return { short: `발표 D-${days(t, x.winner_date)}`, live: false, done: false };
  return { short: "청약 마감", live: false, done: true };
}

/** 만원 → "9억 8,000만" */
export function presalePrice(v: number | null) {
  if (!v) return "-";
  const eok = Math.floor(v / 10000), man = v % 10000;
  return `${eok ? `${eok}억` : ""}${eok && man ? " " : ""}${man ? `${man.toLocaleString("ko-KR")}만` : ""}` || "-";
}
const dot = (d: string | null) => (d ? d.slice(2).replace(/-/g, ".") : "-");
const range = (a: string | null, b: string | null) => (a ? (b && b !== a ? `${dot(a)} ~ ${dot(b).slice(3)}` : dot(a)) : "-");

export default function PresaleDetailPanel({ item, onClose, mobile = false, side }: { item: PresaleItem; onClose: () => void; mobile?: boolean; side?: { left: number; top: number; height: number } }) {
  const types = useMemo(() => (item.types || []).filter((t) => t.type), [item]);
  // 처음 고른 평형 = 지도 표시와 같은 대표 평형 (repType)
  const first = useMemo(() => (repType(types) || types[0])?.type || "", [types]);
  const [sel, setSel] = useState(first);
  const [ask, setAsk] = useState(false);
  useEffect(() => setAsk(false), [item.id]);
  useEffect(() => setSel(first), [item.id, first]);
  // 모바일 뒤로가기 = 분양 창만 닫기 (단지 창과 같게) — 열 때 기록 한 칸, 닫을 때 그 칸을 되돌린다
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!mobile) return;
    if (!window.history.state?.presale) window.history.pushState({ ...(window.history.state || {}), presale: 1 }, "");
    const onPop = (e: PopStateEvent) => { if ((e.state as { presale?: number } | null)?.presale) return; e.stopImmediatePropagation(); closeRef.current(); };
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, [mobile]);
  const close = mobile ? () => { if (window.history.state?.presale) window.history.back(); else onClose(); } : onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const t = types.find((x) => x.type === sel) || types[0];
  const stage = presaleStage(item);
  const color = stage.done ? PRESALE_DIM : PRESALE;
  const priceLabel = item.kind === "ofc" ? "공급금액" : "분양가 (최고가 기준)";
  const moveIn = item.move_in_ym && /^\d{6}$/.test(item.move_in_ym) ? `${item.move_in_ym.slice(0, 4)}년 ${item.move_in_ym.slice(4)}월 입주 예정` : "입주 예정 -";
  const tag = item.kind === "rem" ? "무순위 · 잔여세대" : item.kind === "ofc" ? `${item.house_type || "오피스텔"} 분양` : `분양${item.supply_kind ? ` · ${item.supply_kind}` : ""}`;

  // 청약 일정 — 지난 것은 회색, 다음 것은 보라로 강조
  const now = today();
  const steps = [
    { label: "모집공고", d: item.notice_date, e: null as string | null },
    { label: "특별공급", d: item.special_start, e: item.special_end },
    { label: "1순위", d: item.rank1_date, e: null },
    { label: "2순위", d: item.rank2_date, e: null },
    ...(item.kind !== "apt" && !item.rank1_date ? [{ label: "청약 접수", d: item.receipt_start, e: item.receipt_end }] : []),
    { label: "당첨 발표", d: item.winner_date, e: null },
    { label: "계약", d: item.contract_start, e: item.contract_end },
  ].filter((s) => s.d);
  const nextIdx = steps.findIndex((s) => (s.e || s.d)! >= now);

  const section: React.CSSProperties = { background: "#fff", marginBottom: 10 };
  const h3: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: 0, padding: "18px 20px 10px" };
  const lat = Number(item.lat), lng = Number(item.lng);

  return (
    <div onClick={side ? undefined : close} style={side ? { position: "fixed", left: side.left, top: side.top, height: side.height, width: 420, zIndex: 1002, display: "flex" } : { position: mobile ? "fixed" : "absolute", inset: 0, zIndex: mobile ? 9000 : 1002, background: "rgba(17,24,39,.45)", display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", padding: mobile ? 0 : 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ["--apt-accent" as string]: color, ["--apt-soft" as string]: stage.done ? "#f3f4f6" : SOFT, position: "relative", width: mobile || side ? "100%" : 600, maxWidth: "100%", height: "100%", maxHeight: mobile || side ? undefined : 860, borderRadius: side || mobile ? 0 : 16, overflow: "hidden", background: "#f3f4f6", boxShadow: side ? "4px 0 16px rgba(0,0,0,.14)" : "0 18px 50px rgba(0,0,0,.35)", display: "flex", flexDirection: "column", fontSize: 14, color: "#1f2937" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <HeroRoadview lat={Number.isFinite(lat) ? lat : NaN} lng={lng} title={item.name} sub={item.address || ""} tag={tag}
            actions={(dark) => (<>
              {side && <button onClick={onClose} aria-label="목록으로" title="공실 목록으로" style={heroBtn(dark)}>‹</button>}
              <span style={{ flex: 1 }} />
              <button onClick={close} aria-label="닫기" style={heroBtn(dark)}>✕</button>
            </>)} />

          {/* 단지 한 줄 — 세대수 · 입주 예정 / 시공 · 시행 */}
          <div style={{ ...section, padding: "16px 20px" }}>
            <div style={{ color: "#4b5563" }}>
              {item.total_units ? `${item.total_units.toLocaleString("ko-KR")}세대 공급` : "공급 세대 -"} <span style={{ color: "#d1d5db" }}>|</span> {moveIn}
            </div>
            <div style={{ color: "#4b5563", marginTop: 2 }}>
              시공 {item.builder || "-"} <span style={{ color: "#d1d5db" }}>|</span> 시행 {item.developer || "-"}
            </div>
          </div>

          {/* 분양가 — 평형 고르기 + 큰 글자 */}
          <div style={section}>
            <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 0", gap: 8 }}>
              <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "6px 14px", fontSize: 14, fontWeight: 800 }}>{stage.short}</span>
              <div style={{ flex: 1 }} />
              {types.length > 0 && (
                <select value={t?.type} onChange={(e) => setSel(e.target.value)}
                  style={{ border: `1.5px solid ${color}`, background: "#fff", color: color, borderRadius: 6, padding: "6px 10px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  {types.map((x) => <option key={x.type} value={x.type}>{x.area ? `전용 ${Math.round(x.area * 100) / 100}㎡ · ${x.type}` : x.type}</option>)}
                </select>
              )}
            </div>
            <div style={{ padding: "16px 20px 4px", color: color, fontWeight: 600 }}>{priceLabel}</div>
            <div style={{ padding: "0 20px", fontSize: 30, fontWeight: 900, color: color, letterSpacing: "-0.5px" }}>{presalePrice(t?.price ?? null)}</div>
            <div style={{ padding: "4px 20px 16px", color: SUB, fontSize: 12 }}>
              {[t?.units ? `${t.units.toLocaleString("ko-KR")}세대` : "", t?.supply_area ? `공급 ${Math.round(t.supply_area * 100) / 100}㎡` : ""].filter(Boolean).join(" · ") || "평형 정보 없음"}
            </div>
          </div>

          {/* 청약 일정 — 단지 창의 "최근 3년" 그래프 자리 */}
          <div style={section}>
            <h3 style={h3}>청약 일정</h3>
            <div style={{ padding: "0 20px 16px" }}>
              {steps.length ? steps.map((s, i) => {
                const past = nextIdx === -1 || i < nextIdx, next = i === nextIdx;
                return (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < steps.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, background: next ? PRESALE : past ? "#d1d5db" : "#fff", border: `2px solid ${next ? PRESALE : past ? "#d1d5db" : PRESALE_DIM}` }} />
                    <span style={{ width: 70, fontWeight: next ? 800 : 600, color: next ? PRESALE : past ? "#9ca3af" : "#374151" }}>{s.label}</span>
                    <span style={{ flex: 1, color: next ? PRESALE : past ? "#9ca3af" : "#374151", fontWeight: next ? 800 : 500 }}>{range(s.d, s.e)}</span>
                    {next && <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: PRESALE, borderRadius: 10, padding: "1px 8px" }}>{days(now, s.d!) > 0 ? `D-${days(now, s.d!)}` : "오늘"}</span>}
                  </div>
                );
              }) : <div style={{ color: SUB }}>일정 정보가 없습니다.</div>}
            </div>
          </div>

          {/* 평형별 분양가 */}
          {types.length > 0 && (
            <div style={section}>
              <h3 style={h3}>평형별 {item.kind === "ofc" ? "공급금액" : "분양가"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px auto", gap: 10, padding: "8px 20px", color: SUB, fontSize: 12, borderBottom: "1px solid #e5e7eb" }}>
                <span>평형</span><span style={{ textAlign: "right" }}>세대</span><span style={{ textAlign: "right" }}>{item.kind === "ofc" ? "공급금액" : "최고가"}</span>
              </div>
              {types.map((x) => (
                <div key={x.type} onClick={() => setSel(x.type)} style={{ display: "grid", gridTemplateColumns: "1fr 70px auto", gap: 10, padding: "10px 20px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: x.type === t?.type ? (stage.done ? "#f3f4f6" : SOFT) : "#fff" }}>
                  <span style={{ fontWeight: 700 }}>{x.type}{x.area ? <span style={{ color: SUB, fontWeight: 500 }}> · 전용 {Math.round(x.area * 100) / 100}㎡</span> : null}</span>
                  <span style={{ textAlign: "right", color: "#4b5563" }}>{x.units ?? "-"}</span>
                  <span style={{ textAlign: "right", fontWeight: 800, color: color }}>{presalePrice(x.price)}</span>
                </div>
              ))}
              <div style={{ padding: "10px 20px 14px", color: SUB, fontSize: 12 }}>
                출처: 청약홈(한국부동산원) 모집공고 {/* 원문 링크는 뺌 — 밖으로 나가는 길 없이 [분양자료 신청하기] 하나로 (2026-11-26 사장님) */}
              </div>
            </div>
          )}
          {/* 분양사 문의 전화·홈페이지는 보이지 않는다 — 신청은 [분양자료 신청하기] 하나로 (2026-11-26 사장님 회의) */}
        </div>

        {/* 맨 아래 — [분양자료 신청하기] (11-26 사장님 회의: 청약홈으로 내보내지 않고 공실뉴스가 신청을 받는다) */}
        <button type="button" onClick={() => setAsk(true)}
          style={{ flexShrink: 0, height: 52, border: "none", background: color, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          분양자료 신청하기 →
        </button>
        {ask && <PresaleRequestForm item={item} types={types.map((x) => x.type)} defaultType={t?.type || ""} onClose={() => setAsk(false)} />}
      </div>
    </div>
  );
}

/** 분양자료 신청 창 — 이름 · 휴대폰("-" 자동) · 관심 평형 · 동의 2개(수집 필수 · 분양사 제공 선택). 로그인 회원은 이름·번호를 미리 채운다 */
function PresaleRequestForm({ item, types, defaultType, onClose }: { item: PresaleItem; types: string[]; defaultType: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState(defaultType);
  const [a1, setA1] = useState(false);
  const [a2, setA2] = useState(false);
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const fmt = (v: string) => {
    const r = v.replace(/\D/g, "").slice(0, 11);
    return r.length <= 3 ? r : r.length <= 7 ? `${r.slice(0, 3)}-${r.slice(3)}` : r.length <= 10 ? `${r.slice(0, 3)}-${r.slice(3, 6)}-${r.slice(6)}` : `${r.slice(0, 3)}-${r.slice(3, 7)}-${r.slice(7)}`;
  };
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getUser();
        if (!data?.user) return;
        const { data: m } = await sb.from("members").select("name, phone").eq("id", data.user.id).maybeSingle();
        if (m?.name) setName((v) => v || String(m.name));
        if (m?.phone) setPhone((v) => v || fmt(String(m.phone)));
      } catch { /* 비회원 */ }
    })();
  }, []);
  const send = async () => {
    setMsg("");
    if (!a1) { setMsg("개인정보 수집·이용에 동의해 주세요."); return; }
    setBusy(true);
    const r = await submitPresaleRequest({ presaleId: item.id, name, phone, areaType: area || undefined, agreeCollect: a1, agreeThird: a2 }).catch(() => null);
    setBusy(false);
    if (r?.success) setDone(true);
    else setMsg(r?.error || "신청하지 못했습니다. 잠시 뒤 다시 해 주세요.");
  };
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 46, padding: "0 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, fontFamily: "inherit" };
  const agree = (on: boolean, set: (v: boolean) => void, label: string, opened: boolean, setOpened: (v: boolean) => void, text: string) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#374151" }}>
          <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} style={{ width: 18, height: 18, accentColor: PRESALE }} />{label}
        </label>
        <button type="button" onClick={() => setOpened(!opened)} style={{ border: "none", background: "none", color: SUB, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>{opened ? "접기" : "자세히"}</button>
      </div>
      {opened && <pre style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", padding: "10px 12px", background: "#f9fafb", borderRadius: 8, fontSize: 12, lineHeight: 1.6, color: "#4b5563", fontFamily: "inherit" }}>{text}</pre>}
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(17,24,39,.45)", display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "92%", overflowY: "auto", background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 20px 18px", boxSizing: "border-box" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "18px 0 6px" }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>신청이 접수됐어요</div>
            <div style={{ color: SUB, marginTop: 8, lineHeight: 1.6 }}>{item.name} 분양자료를<br />적어 주신 번호로 안내해 드릴게요.</div>
            <button type="button" onClick={onClose} style={{ marginTop: 18, width: "100%", height: 50, border: "none", borderRadius: 10, background: PRESALE, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>확인</button>
          </div>
        ) : (<>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>분양자료 신청</div>
            <button type="button" onClick={onClose} aria-label="닫기" style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: SUB }}>✕</button>
          </div>
          <div style={{ color: PRESALE, fontWeight: 700, marginTop: 4 }}>{item.name}</div>
          <div style={{ color: SUB, fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>분양가표·평면도·청약 일정 등 분양자료를 보내 드려요.</div>
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" maxLength={30} style={input} />
            <input value={phone} onChange={(e) => setPhone(fmt(e.target.value))} placeholder="휴대폰 번호 010-0000-0000" inputMode="numeric" style={input} />
            {types.length > 0 && (
              <select value={area} onChange={(e) => setArea(e.target.value)} style={{ ...input, background: "#fff" }}>
                <option value="">관심 평형 (선택)</option>
                {types.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            )}
          </div>
          <div style={{ marginTop: 14, paddingTop: 4, borderTop: "1px solid #f3f4f6" }}>
            {agree(a1, setA1, "개인정보 수집·이용 동의 (필수)", open1, setOpen1, collectText(item.name))}
            {agree(a2, setA2, "분양사 개인정보 제공 동의 (선택)", open2, setOpen2, thirdText(item.name, item.developer))}
          </div>
          {msg && <div style={{ color: "#dc2626", fontSize: 13.5, fontWeight: 600, marginTop: 12 }}>{msg}</div>}
          <button type="button" onClick={send} disabled={busy}
            style={{ marginTop: 16, width: "100%", height: 52, border: "none", borderRadius: 10, background: PRESALE, color: "#fff", fontSize: 16, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: "inherit" }}>
            {busy ? "보내는 중…" : "신청하기"}
          </button>
        </>)}
      </div>
    </div>
  );
}
