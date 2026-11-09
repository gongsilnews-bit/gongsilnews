"use client";

/**
 * 최고관리자 홈 (2026-11-09 사장님 회의 — docs/2026-11-09_superadmin_page_plan.md ① 총괄)
 *  맨 위 가입 현황 → 가입 경로 → 처리할 일(누르면 그 화면) → 맨 아래 작게 전체 합계
 *  숫자는 DB 실제 값만, 못 읽으면 "–"
 */
import React, { useCallback, useEffect, useState } from "react";
import type { AdminTheme } from "./types";
import { getAdminHome, type AdminHomeData } from "@/app/actions/adminHome";

const NAVY = "#1e3a6e";
const fmt = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString());

export default function AdminHomeSection({ theme, onGo }: { theme: AdminTheme; onGo: (menu: string, sub?: string) => void }) {
  const [data, setData] = useState<AdminHomeData | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [at, setAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    const res = await getAdminHome();
    if (res.success) setData(res.data);
    else setErr(res.error);
    setAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const dark = theme.darkMode;
  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "18px 20px" };
  const h2: React.CSSProperties = { margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: theme.textPrimary };
  const accent = dark ? "#93c5fd" : NAVY;

  const s = data?.signups;
  const t = data?.tiers;
  const todo = data?.todo;
  const maxDaily = Math.max(1, ...(s?.daily.map((d) => d.count) || [0]));

  const todoRows: { label: string; value: number | null | undefined; go: [string, string?] }[] = [
    { label: "회원 승인 대기", value: todo?.memberPending, go: ["approval", "member"] },
    { label: "공실뉴스부동산 가입 신청", value: todo?.newsrealtyPending, go: ["approval", "newsrealty"] },
    { label: "결제 확인 (스마트스토어 주문)", value: todo?.paymentReview, go: ["approval", "payment"] },
    { label: "기사 승인 대기", value: todo?.articlePending, go: ["approval", "article"] },
    { label: "반려된 기사", value: todo?.articleRejected, go: ["article"] },
    { label: "답 안 한 문의", value: todo?.inquiryOpen, go: ["inquiry"] },
    { label: "단지 정보 요청", value: todo?.aptReports, go: ["apt_reports"] },
  ];

  return (
    <div style={{ flex: 1, padding: "22px 28px 40px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: theme.textPrimary }}>홈</h1>
          {at && <span style={{ fontSize: 12, color: theme.textSecondary }}>{at} 기준</span>}
        </div>
        <button onClick={() => void load()} disabled={loading}
          style={{ height: 32, padding: "0 12px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "inherit" }}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {err && <div style={{ ...card, marginBottom: 16, color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{err}</div>}

      {/* 가입 현황 */}
      <section style={{ ...card, marginBottom: 16 }}>
        <h2 style={h2}>가입 현황</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
          {[["오늘", s?.today], ["이번 주", s?.week], ["이번 달", s?.month]].map(([label, v]) => (
            <div key={label as string} style={{ border: `1px solid ${theme.border}`, borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 12.5, color: theme.textSecondary, fontWeight: 600 }}>{label} 가입</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: accent, marginTop: 2 }}>{fmt(v as number | null | undefined)}<span style={{ fontSize: 13, fontWeight: 700, marginLeft: 3, color: theme.textSecondary }}>명</span></div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>최근 30일</div>
        {s ? (
          <svg viewBox="0 0 600 110" width="100%" height={110} preserveAspectRatio="none" role="img" aria-label="최근 30일 날마다 가입 수">
            {s.daily.map((d, i) => {
              const h = (d.count / maxDaily) * 86;
              return (
                <g key={d.day}>
                  <title>{`${d.day.slice(5).replace("-", "/")} · ${d.count}명`}</title>
                  <rect x={i * 20 + 3} y={92 - h} width={14} height={Math.max(h, d.count ? 2 : 0)} rx={2} fill={accent} opacity={d.count ? 0.9 : 0} />
                  <rect x={i * 20 + 3} y={91} width={14} height={1} fill={theme.border} />
                  {i % 5 === 4 && <text x={i * 20 + 10} y={106} fontSize={9} textAnchor="middle" fill={theme.textSecondary}>{d.day.slice(5).replace("-", "/")}</text>}
                </g>
              );
            })}
          </svg>
        ) : (
          <div style={{ fontSize: 13, color: theme.textSecondary }}>–</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 16 }}>
          {[
            ["일반회원", t?.user],
            ["부동산회원 (무료)", t?.free],
            ["공실뉴스부동산 (유료)", t?.pro],
            ["비즈니스회원", t?.biz],
            ["유료 만료 30일 안", data?.expiringSoon],
          ].map(([label, v]) => (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 6, background: dark ? "#2c2d31" : "#f7f8fa", fontSize: 13 }}>
              <span style={{ color: theme.textSecondary, fontWeight: 600 }}>{label}</span>
              <b style={{ color: theme.textPrimary }}>{fmt(v as number | null | undefined)}</b>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 16 }}>
        {/* 처리할 일 */}
        <section style={card}>
          <h2 style={h2}>처리할 일</h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {todoRows.map((r) => (
              <button key={r.label} onClick={() => onGo(r.go[0], r.go[1])}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 4px", border: "none", borderBottom: `1px solid ${theme.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: theme.textPrimary }}>{r.label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b style={{ fontSize: 15, color: r.value ? (dark ? "#fbbf24" : "#b45309") : theme.textSecondary }}>{fmt(r.value)}</b>
                  <span style={{ color: theme.textSecondary, fontSize: 13 }}>›</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 가입 경로 */}
        <section style={card}>
          <h2 style={h2}>이번 달 가입 경로</h2>
          {!data ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>–</div>
          ) : data.refs == null ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>가입 경로 기록 준비 중</div>
          ) : data.refs.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>이번 달에는 꼬리표 달린 링크로 가입한 사람이 아직 없어요.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {data.refs.map((r) => (
                  <tr key={r.ref} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={{ padding: "9px 4px", color: theme.textPrimary, wordBreak: "break-all" }}>{r.ref}</td>
                    <td style={{ padding: "9px 4px", textAlign: "right", fontWeight: 800, color: accent, whiteSpace: "nowrap" }}>{r.count}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* 전체 합계 — 작게 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, padding: "10px 4px", fontSize: 12.5, color: theme.textSecondary }}>
        <span>전체 공실 <b style={{ color: theme.textPrimary }}>{fmt(data?.totals.vacancies)}</b></span>
        <span>전체 기사 <b style={{ color: theme.textPrimary }}>{fmt(data?.totals.articles)}</b></span>
        <span>전체 회원 <b style={{ color: theme.textPrimary }}>{fmt(data?.totals.members)}</b></span>
        <span>전체 문의 <b style={{ color: theme.textPrimary }}>{fmt(data?.totals.inquiries)}</b></span>
      </div>
    </div>
  );
}
