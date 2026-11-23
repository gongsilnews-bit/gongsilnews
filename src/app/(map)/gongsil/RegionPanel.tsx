"use client";
/**
 * 지역 분석 창 — 지도를 넓게 볼 때 나오는 시·도 / 구 / 동 평균 말풍선을 누르면 (2026-11-23 사장님: "어플과 같이", "동별 분석이 나와야지")
 *  앱 동네 분석(gongsilnews-app/app/area.tsx)과 같은 칸: 머리 숫자(단지 · 평균 매매가 84㎡ 기준 · 공실) · 거래량 · 실거래가 · (구) 동별 · (시·도) 구별 · 공실 · 부동산
 *  PC 는 단지 창과 같은 자리(왼쪽 목록 위), 모바일은 아래에서 올라오는 창. 숫자는 모두 실제 자료(실거래 단지 · 등록 공실 · 승인 부동산)로만
 */
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { LAWD_NAMES, shortPrice, type Trade } from "@/utils/aptMapShared";

export type AggLevel = "sido" | "gu" | "dong";
export type RegionAgg = { key: string; name: string; lat: number; lng: number; price: number; n: number };
type Cx = { id: string; name: string; kind: string; lat: number; lng: number; rep_price: number | null; rep_area: number | null; rep_date: string | null; trade_count: number; trades?: Trade[] | null };
type Vac = { id: string; vacancy_no: number | null; trade_type: string | null; property_type: string | null; sub_category: string | null; deposit: number | null; monthly_rent: number | null; dong: string | null; building_name: string | null; exclusive_m2: number | null; vacancy_photos?: { url: string; sort_order: number | null }[] | null };
type Ag = { owner_id: string; name: string; address: string | null; n: number };

const KIND_NAME = { apt: "아파트", offi: "오피스텔", villa: "빌라" } as const;
const VAC_PT = { apt: "아파트·오피스텔", offi: "아파트·오피스텔", villa: "빌라·주택" } as const;
const NAVY = "#1e3a6e";
const comma = (n: number) => n.toLocaleString("ko-KR");
const isNew = (d?: string | null) => !!d && Date.now() - new Date(d).getTime() < 7 * 86400000;
const sinceOf = (m: number) => { const f = new Date(); f.setMonth(f.getMonth() - m); return f.toISOString().slice(0, 10); };
const won = (manwon: number | null | undefined) => (manwon ? shortPrice(manwon) : "");

export default function RegionPanel({ level, region, kind, color, side, mobile, onClose, onRegion, onComplex, subRegions }: {
  level: AggLevel; region: RegionAgg; kind: "apt" | "offi" | "villa"; color: string;
  side?: { left: number; top: number; height: number }; mobile?: boolean;
  onClose: () => void;
  /** 동별·구별 줄을 누르면 — 그 지역 분석으로 (지도도 그리로) */
  onRegion: (lv: AggLevel, r: RegionAgg) => void;
  /** 단지를 누르면 단지 창 — 지도도 그 단지로 */
  onComplex: (id: string, lat: number, lng: number) => void;
  /** 아래 단계 지역 평균 (시·도 → 구, 구 → 동) — 이미 받아 둔 것 */
  subRegions: RegionAgg[] | null;
}) {
  const code = level === "dong" ? region.key.split(":")[0] : region.key; // 구 lawd_cd · 시·도 2자리
  const full = LAWD_NAMES[level === "sido" ? Object.keys(LAWD_NAMES).find((k) => k.startsWith(code)) || "" : code] || "";
  const sido = full.split(" ")[0] || "";
  const gu = level === "sido" ? "" : full.split(" ").slice(1).join(" ");
  const title = level === "dong" ? `${region.name} 동네 분석` : level === "gu" ? `${gu || region.name} 분석` : `${region.name} 분석`;
  const place = level === "dong" ? full : level === "gu" ? sido : "";

  const [cxs, setCxs] = useState<Cx[] | null>(level === "sido" ? [] : null);
  const [vacs, setVacs] = useState<Vac[] | null>(null);
  const [ags, setAgs] = useState<Ag[] | null>(null);
  const [months, setMonths] = useState<3 | 6 | 12>(12);
  const [pMonths, setPMonths] = useState<3 | 6 | 12>(12);
  const [size, setSize] = useState(84);
  const [more, setMore] = useState({ vol: false, price: false, sub: false });

  useEffect(() => {
    let alive = true;
    const sb = createClient();
    setCxs(level === "sido" ? [] : null); setVacs(null); setAgs(null);
    // 단지 — 시·도는 너무 많아 받지 않고 구별 평균만
    if (level !== "sido") {
      let q = sb.from("apt_complexes").select("id, name, kind, lat, lng, rep_price, rep_area, rep_date, trade_count, trades").eq("kind", kind).eq("lawd_cd", code).not("lat", "is", null).neq("fp", "gone");
      if (level === "dong") q = q.eq("dong", region.name);
      q.order("trade_count", { ascending: false }).limit(level === "gu" ? 300 : 200).then(({ data }) => { if (alive) setCxs((data as Cx[]) || []); });
    }
    // 공실 — 이 지역 광고 중, 고른 종류 (공실 자료의 동 이름은 법정동)
    {
      let vq = sb.from("vacancies").select("id, vacancy_no, trade_type, property_type, sub_category, deposit, monthly_rent, dong, building_name, exclusive_m2, vacancy_photos(url, sort_order)")
        .eq("status", "ACTIVE").neq("trade_type", "경매").eq("property_type", VAC_PT[kind]);
      if (level === "sido") vq = vq.ilike("sido", `${sido.slice(0, 2)}%`);
      else vq = vq.eq("sigungu", gu);
      if (level === "dong") vq = vq.eq("dong", region.name);
      vq.or("exposure_type.is.null,exposure_type.neq.홈페이지전용").order("created_at", { ascending: false }).limit(100)
        .then(({ data }) => {
          if (!alive) return;
          const list = ((data as unknown as Vac[]) || []).filter((v) => kind !== "offi" ? !/오피스텔/.test(String(v.sub_category || "")) : /오피스텔/.test(String(v.sub_category || "")));
          setVacs(list);
        });
    }
    // 부동산 — 공실뉴스 승인 사무소, 주소에 이 지역 이름 · 광고 중 공실 수
    {
      const word = (level === "dong" ? region.name : level === "gu" ? (gu.split(" ").pop() || gu) : sido.slice(0, 2)).replace(/[%_,()]/g, "");
      sb.from("agencies").select("owner_id, name, address, address_detail").eq("status", "APPROVED").ilike(level === "dong" ? "address" : "address", `%${word}%`).limit(level === "sido" ? 300 : 500)
        .then(async ({ data }) => {
          type Row = { owner_id: string; name: string; address: string | null; address_detail: string | null };
          let list = ((data as Row[]) || []).filter((a) => a.owner_id);
          if (level !== "sido" && sido) list = list.filter((a) => String(a.address || "").includes(sido.slice(0, 2)));
          if (level === "dong" && gu) list = list.filter((a) => String(a.address || "").includes(gu.split(" ").pop() || gu));
          const cnt = new Map<string, number>();
          const ids = list.map((a) => a.owner_id);
          if (ids.length) {
            const { data: vs } = await sb.from("vacancies").select("owner_id").in("owner_id", ids.slice(0, 300)).eq("status", "ACTIVE").neq("trade_type", "경매").limit(3000);
            for (const v of (vs as { owner_id: string }[]) || []) cnt.set(v.owner_id, (cnt.get(v.owner_id) || 0) + 1);
          }
          if (alive) setAgs(list.map((a) => ({ owner_id: a.owner_id, name: a.name, address: a.address, n: cnt.get(a.owner_id) || 0 })).sort((x, y) => y.n - x.n));
        });
    }
    return () => { alive = false; };
  }, [level, region.key, region.name, kind, code, gu, sido]);

  // 평균 매매가 = 84㎡ 기준 — 최근 1년 매매를 평당가로 바꿔 평균 낸 뒤 84㎡ (앱과 같은 셈). 시·도는 지도 평균
  const avg84 = useMemo(() => {
    if (level === "sido") return 0;
    const since = sinceOf(12);
    const per: number[] = [];
    for (const c of cxs || []) for (const t of c.trades || []) if (t.d >= since && t.a > 0 && t.p > 0) per.push(t.p / t.a);
    return per.length ? Math.round((per.reduce((a, b) => a + b, 0) / per.length) * 84) : 0;
  }, [cxs, level]);
  const monthly = useMemo(() => {
    const out: { ym: string; n: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push({ ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, n: 0 }); }
    const idx = new Map(out.map((x, i) => [x.ym, i]));
    for (const c of cxs || []) for (const t of c.trades || []) { const i = idx.get(String(t.d).slice(0, 7)); if (i != null) out[i].n++; }
    return out;
  }, [cxs, months]);
  const byVol = useMemo(() => {
    const since = sinceOf(months);
    return (cxs || []).map((c) => ({ c, cnt: (c.trades || []).filter((t) => t.d >= since).length }))
      .sort((x, y) => y.cnt - x.cnt || (y.c.trade_count || 0) - (x.c.trade_count || 0));
  }, [cxs, months]);
  // 평형 묶음 — 고른 기간 매매 전용면적을 반올림해 폭 4㎡ 안쪽끼리 (앱과 같음)
  const sizes = useMemo(() => {
    const since = sinceOf(pMonths);
    const cnt = new Map<number, number>();
    for (const c of cxs || []) for (const t of c.trades || []) if (t.d >= since) { const k = Math.round(t.a); cnt.set(k, (cnt.get(k) || 0) + 1); }
    const groups: { lo: number; hi: number; top: number; n: number }[] = [];
    for (const k of [...cnt.keys()].sort((a, b) => a - b)) {
      const g = groups[groups.length - 1];
      if (g && k - g.lo <= 4) { g.hi = k; g.n += cnt.get(k)!; if (cnt.get(k)! > (cnt.get(g.top) || 0)) g.top = k; }
      else groups.push({ lo: k, hi: k, top: k, n: cnt.get(k)! });
    }
    return groups;
  }, [cxs, pMonths]);
  const sizeG = useMemo(() => sizes.find((g) => size >= g.lo - 0.5 && size <= g.hi + 0.5) || sizes.find((g) => g.lo <= 86 && g.hi >= 82) || [...sizes].sort((a, b) => b.n - a.n)[0] || null, [sizes, size]);
  const byPrice = useMemo(() => {
    const since = sinceOf(pMonths);
    const [lo, hi] = sizeG ? [sizeG.lo - 0.5, sizeG.hi + 0.5] : [80, 90];
    return (cxs || []).map((c) => {
      const band = (c.trades || []).filter((t) => t.d >= since && t.a >= lo && t.a <= hi);
      return { c, n: band.length, avg: band.length ? Math.round(band.reduce((a, t) => a + t.p, 0) / band.length) : 0, max: Math.max(0, ...band.map((t) => t.p)) };
    }).sort((x, y) => y.avg - x.avg || y.n - x.n);
  }, [cxs, pMonths, sizeG]);
  // 아래 단계 지역 — 구면 그 구의 동, 시·도면 그 시·도의 구
  const subs = useMemo(() => (subRegions || []).filter((x) => (level === "gu" ? x.key.startsWith(`${code}:`) : level === "sido" ? x.key.startsWith(code) : false)).sort((a, b) => b.price - a.price), [subRegions, level, code]);

  const loading = <div style={{ padding: "18px 0", color: "#9ca3af", fontSize: 13.5, textAlign: "center" }}>불러오는 중…</div>;
  const area = level === "dong" ? "동네" : level === "gu" ? "구" : "지역";
  const box: React.CSSProperties = mobile
    ? { position: "fixed", left: 0, right: 0, bottom: 0, height: "86vh", zIndex: 9000, borderRadius: "16px 16px 0 0", boxShadow: "0 -6px 24px rgba(0,0,0,.18)" }
    : side ? { position: "fixed", left: side.left, top: side.top, height: side.height, width: 420, zIndex: 1003, boxShadow: "4px 0 16px rgba(0,0,0,.08)" }
      : { position: "absolute", left: 0, top: 0, bottom: 0, width: 420, zIndex: 1003, boxShadow: "4px 0 16px rgba(0,0,0,.12)" };

  return (
    <div style={{ ...box, background: "#fff", display: "flex", flexDirection: "column", fontFamily: "inherit", overflow: "hidden" }} onMouseDown={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 14px 12px 10px", borderBottom: "1px solid #eef0f3" }}>
        <button type="button" onClick={onClose} aria-label="닫기" style={{ border: "none", background: "none", fontSize: 24, lineHeight: 1, color: "#111", cursor: "pointer", padding: "0 6px" }}>‹</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#111", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <button type="button" onClick={onClose} aria-label="닫기" style={{ border: "none", background: "none", fontSize: 18, color: "#9ca3af", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* 머리 숫자 */}
        <div style={{ padding: "14px 18px 16px", borderBottom: "8px solid #f3f4f6" }}>
          {place && <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>{place}</div>}
          <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            {[
              [`${KIND_NAME[kind]} 단지`, comma(level === "dong" && cxs ? cxs.length : region.n)],
              [level === "sido" ? "평균 매매가 (대표 평형)" : "평균 매매가 (84㎡ 기준)", level === "sido" ? shortPrice(region.price) : cxs === null ? "…" : avg84 ? shortPrice(avg84) : "-"],
              [`${KIND_NAME[kind]} 공실`, vacs === null ? "…" : comma(vacs.length)],
            ].map(([l, v], i) => (
              <div key={l} style={{ flex: 1, padding: "14px 6px 12px", textAlign: "center", borderLeft: i ? "1px solid #f1f2f4" : "none" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: NAVY }}>{v}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* (시·도) 구별 · (구) 동별 평균 */}
        {level !== "dong" && (
          <Block title={level === "sido" ? "구별 평균 매매가" : "동별 평균 매매가"}>
            {subRegions === null ? loading : subs.length ? (
              <>
                {subs.slice(0, more.sub ? 60 : 10).map((x, i) => (
                  <Row key={x.key} no={i + 1} name={x.name} sub={`${KIND_NAME[kind]} 단지 ${comma(x.n)}곳 평균`} right={shortPrice(x.price)} rightColor={NAVY} arrow
                    onClick={() => onRegion(level === "sido" ? "gu" : "dong", x)} />
                ))}
                {subs.length > 10 && <More open={more.sub} onClick={() => setMore((m) => ({ ...m, sub: !m.sub }))} />}
              </>
            ) : <Empty>아직 자료가 없어요.</Empty>}
          </Block>
        )}

        {level !== "sido" && (
          <>
            <Block title="거래량" right={<Sel value={months} options={[[3, "3개월"], [6, "6개월"], [12, "1년"]]} onChange={(v) => setMonths(v as 3 | 6 | 12)} />}>
              {cxs === null ? loading : (
                <>
                  <Line data={monthly} />
                  {byVol.length === 0 ? <Empty>이 {area} {KIND_NAME[kind]} 실거래 단지가 아직 없어요.</Empty> : (
                    <>
                      {byVol.slice(0, more.vol ? 30 : 5).map(({ c, cnt }, i) => (
                        <Row key={c.id} no={cnt ? i + 1 : "-"} dim={!cnt} name={c.name} isNew={isNew(c.rep_date)} sub={`대표 ${c.rep_area ? `${Math.round(c.rep_area * 0.3025)}평 ` : ""}${won(c.rep_price)}`} right={`${comma(cnt)}건`} onClick={() => onComplex(c.id, c.lat, c.lng)} />
                      ))}
                      {byVol.length > 5 && <More open={more.vol} onClick={() => setMore((m) => ({ ...m, vol: !m.vol }))} />}
                    </>
                  )}
                </>
              )}
            </Block>

            <Block title="실거래가" right={<div style={{ display: "flex", gap: 6 }}>
              <Sel value={pMonths} options={[[3, "3개월"], [6, "6개월"], [12, "1년"]]} onChange={(v) => setPMonths(v as 3 | 6 | 12)} />
              {sizeG && <Sel value={sizeG.top} options={sizes.map((g) => [g.top, `${g.top}㎡ (${Math.round(g.top * 0.3025)}평) · ${g.n}건`] as [number, string])} onChange={(v) => setSize(Number(v))} />}
            </div>}>
              {cxs === null ? loading : byPrice.length === 0 ? <Empty>실거래가 자료가 아직 없어요.</Empty> : (
                <>
                  {byPrice.slice(0, more.price ? 30 : 5).map(({ c, n, avg, max }, i) => (
                    <Row key={c.id} no={n ? i + 1 : "-"} dim={!n} name={c.name} sub={n ? `${sizeG?.top ?? size}㎡ 매매 ${n}건 평균` : `${sizeG?.top ?? size}㎡ 거래 없음`}
                      right={n ? shortPrice(avg) : "-"} rightColor={color} rightSub={n > 1 && max > avg ? `최고 ${shortPrice(max)}` : ""} onClick={() => onComplex(c.id, c.lat, c.lng)} />
                  ))}
                  {byPrice.length > 5 && <More open={more.price} onClick={() => setMore((m) => ({ ...m, price: !m.price }))} />}
                </>
              )}
            </Block>
          </>
        )}

        <Block title={`${KIND_NAME[kind]} 공실`}>
          {vacs === null ? loading : vacs.length ? vacs.slice(0, 5).map((v) => {
            const photo = [...(v.vacancy_photos || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.url;
            const price = v.trade_type === "매매" ? `매매 ${won(v.deposit)}` : v.trade_type === "전세" ? `전세 ${won(v.deposit)}` : `월세 ${won(v.deposit)}/${comma(v.monthly_rent || 0)}`;
            return (
              <a key={v.id} href={mobile ? `/m/gongsil/detail/${v.id}` : `/gongsil?id=${v.id}`} style={{ display: "flex", gap: 12, padding: "12px 18px", borderTop: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "#ef4444", fontWeight: 700 }}>{v.vacancy_no}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "2px 0" }}>{[v.dong, v.sub_category || v.property_type].filter(Boolean).join(" ")}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#2563eb" }}>{price}</div>
                  {!!v.exclusive_m2 && <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>전용 {v.exclusive_m2}㎡</div>}
                </div>
                {photo && <img src={photo} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
              </a>
            );
          }) : <Empty>이 {area} 광고 중 공실이 아직 없어요.</Empty>}
        </Block>

        <Block title="부동산">
          {ags === null ? loading : ags.length ? ags.slice(0, 5).map((a) => (
            <Row key={a.owner_id} name={a.name} sub={a.address || ""} right={`공실 ${a.n}`} rightColor={NAVY}
              onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: { id: a.owner_id, ownerId: a.owner_id, name: a.name, address: a.address || "", vacancies: a.n, articles: 0 } })); }} />
          )) : <Empty>이 {area}에 등록된 공실뉴스 부동산이 아직 없어요.</Empty>}
        </Block>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function Block({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: "8px solid #f3f4f6", paddingBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "16px 18px 10px" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#111" }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
function Row({ no, name, sub, right, rightColor, rightSub, onClick, dim, isNew, arrow }: { no?: number | string; name: string; sub?: string; right: string; rightColor?: string; rightSub?: string; onClick?: () => void; dim?: boolean; isNew?: boolean; arrow?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="gs-rg-row" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 18px", border: "none", borderTop: "1px solid #f3f4f6", background: "#fff", cursor: "pointer", textAlign: "left", opacity: dim ? 0.45 : 1, fontFamily: "inherit" }}>
      <style>{`.gs-rg-row:hover{background:#f9fafb!important}`}</style>
      {no !== undefined && <span style={{ width: 22, fontSize: 16, fontWeight: 800, color: "#111", textAlign: "center", flexShrink: 0 }}>{no}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15.5, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          {isNew && <span style={{ fontSize: 10, fontWeight: 900, color: "#fff", background: "#ef4444", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>NEW</span>}
        </span>
        {sub && <span style={{ display: "block", fontSize: 12.5, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
      </span>
      <span style={{ textAlign: "right", flexShrink: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 900, color: rightColor || "#111" }}>{right}</span>
        {rightSub && <span style={{ display: "block", fontSize: 11.5, color: "#ef4444", fontWeight: 700 }}>{rightSub}</span>}
      </span>
      {arrow && <span style={{ color: "#c0c4cc", fontSize: 18 }}>›</span>}
    </button>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "14px 18px 18px", fontSize: 13.5, color: "#9ca3af" }}>{children}</div>;
}
function More({ open, onClick }: { open: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ display: "block", width: "100%", padding: "12px 0", border: "none", borderTop: "1px solid #f3f4f6", background: "#fff", color: "#6b7280", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{open ? "접기 ▲" : "더보기 ▼"}</button>;
}
function Sel({ value, options, onChange }: { value: number; options: [number, string][]; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}
      style={{ height: 32, padding: "0 8px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: "inherit", cursor: "pointer", maxWidth: 170 }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
/** 달마다 매매 건수 — 선 그래프 (앱과 같은 모양) */
function Line({ data }: { data: { ym: string; n: number }[] }) {
  const W = 540, H = 170, PADL = 34, PADR = 14, TOP = 22, BOT = 24;
  const max = Math.max(1, ...data.map((x) => x.n));
  const hi = Math.ceil((max * 1.15) / 5) * 5 || 5;
  const step = data.length > 1 ? (W - PADL - PADR) / (data.length - 1) : 0;
  const x = (i: number) => (data.length > 1 ? PADL + i * step : (PADL + W - PADR) / 2);
  const y = (v: number) => TOP + (1 - v / hi) * (H - TOP - BOT);
  const ticks = [0, 1, 2, 3].map((k) => Math.round((hi * k) / 3));
  const last = data.length - 1;
  const peak = data.reduce((m, p, i) => (p.n > data[m].n ? i : m), 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", padding: "0 10px 6px", boxSizing: "border-box" }}>
      {ticks.map((t) => (
        <g key={t}><line x1={PADL} x2={W - PADR} y1={y(t)} y2={y(t)} stroke="#f1f3f4" /><text x={PADL - 6} y={y(t) + 4} fontSize="11" fill="#9aa0a6" textAnchor="end">{t}</text></g>
      ))}
      <polyline points={data.map((p, i) => `${x(i)},${y(p.n)}`).join(" ")} fill="none" stroke={NAVY} strokeWidth="2.4" strokeLinejoin="round" />
      {data.map((p, i) => <circle key={p.ym} cx={x(i)} cy={y(p.n)} r={i === last ? 4.5 : 2.6} fill={NAVY} stroke="#fff" strokeWidth={i === last ? 2 : 1} />)}
      {data[peak].n > 0 && <text x={x(peak)} y={y(data[peak].n) - 9} fontSize="11.5" fill="#d9363e" textAnchor="middle" fontWeight="700">{data[peak].n}건</text>}
      {peak !== last && <text x={x(last)} y={y(data[last].n) - 9} fontSize="11.5" fill={NAVY} textAnchor="middle" fontWeight="700">{data[last].n}건</text>}
      {data.map((p, i) => (data.length <= 6 || i % 2 === 0 || i === last ? <text key={p.ym} x={x(i)} y={H - 6} fontSize="11" fill="#9aa0a6" textAnchor="middle">{`${Number(p.ym.slice(5))}월`}</text> : null))}
    </svg>
  );
}
