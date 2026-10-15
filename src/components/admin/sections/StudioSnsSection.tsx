"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getVacancies } from "@/app/actions/vacancy";
import { findStudioVacancyByNo } from "@/app/actions/studio";

/**
 * SNS뉴스발행 (공실뉴스 스튜디오 앱 전용)
 *
 * 1단계 공실 분석·캡처: 공실을 고르면 앱이 안 보이는 창에서 공실열람을 열어
 * 매물 정보를 읽고, 등록 사진 전부 + 화면 3장(공실열람 검증·지도·로드뷰)을 모은다.
 * 결과는 앱(PC)에 저장되고 기사·블로그·SNS·영상이 함께 쓴다.
 * 다음 단계(블로그 쓰기·네이버 붙여넣기)는 이어서 붙인다.
 */

type MediaThumb = { kind: string; caption: string; thumb: string | null };
type Analysis = {
  vacancyId: string;
  vacancy: { title?: string; priceText?: string; fields?: { label: string; value: string }[]; themes?: string[]; infra?: string };
  media: MediaThumb[];
  failures: string[];
};
type AiItem = { id: string; name: string; ready: boolean; ok: boolean; account?: string; plan?: string };
type StudioBridge = {
  openAiConnect: () => Promise<void>;
  ai: { list: () => Promise<AiItem[]> };
  vacancy: { analyze: (id: string) => Promise<Analysis>; onProgress: (fn: (t: string) => void) => () => void };
};
type VacancyRow = { id: string; vacancy_no: number; building_name?: string | null; trade_type?: string; property_type?: string; sido?: string; sigungu?: string; dong?: string };

const bridge = (): StudioBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: StudioBridge }).gongsilStudio ?? null) : null);

const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰" };

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function StudioSnsSection({ theme, memberId }: { theme: Theme; memberId: string }) {
  const [ai, setAi] = useState<AiItem[]>([]);
  const [mine, setMine] = useState<VacancyRow[] | null>(null);
  const [noInput, setNoInput] = useState("");
  const [picked, setPicked] = useState<VacancyRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  const loadAi = useCallback(async () => {
    const b = bridge();
    if (b) setAi(await b.ai.list());
  }, []);

  useEffect(() => {
    loadAi();
    const onFocus = () => loadAi();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadAi]);

  useEffect(() => {
    getVacancies({ ownerId: memberId, page: 1, limit: 30, slim: true, status: "ACTIVE" }).then((res) => {
      setMine(res.success ? ((res.data as unknown as VacancyRow[]) || []) : []);
    });
  }, [memberId]);

  const pickByNo = async () => {
    setError("");
    const res = await findStudioVacancyByNo(noInput);
    if (!res.success) return setError(res.error);
    setPicked(res.data as VacancyRow);
    setResult(null);
  };

  const analyze = async () => {
    const b = bridge();
    if (!b || !picked) return;
    setBusy(true);
    setError("");
    setResult(null);
    const off = b.vacancy.onProgress(setProgress);
    try {
      setResult(await b.vacancy.analyze(picked.id));
    } catch (e) {
      setError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      off();
      setProgress("");
      setBusy(false);
    }
  };

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const stepTitle = (n: number, t: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{t}</h3>
    </div>
  );
  const vacancyLabel = (v: VacancyRow) => `${v.vacancy_no} · ${v.building_name || [v.sigungu, v.dong].filter(Boolean).join(" ") || "이름 없음"}${v.trade_type ? ` · ${v.trade_type}` : ""}`;
  const connectedAi = ai.filter((a) => a.ok);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.textPrimary }}>SNS뉴스발행</h2>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: theme.textSecondary }}>공실을 고르면 사진을 모으고, 소장님 AI로 블로그 글을 써서 네이버에 채워 드립니다. 발행은 소장님이 누릅니다.</p>
          </div>
          <button onClick={() => bridge()?.openAiConnect()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connectedAi.length ? "#22c55e" : "#cbd5e1" }} />
            {connectedAi.length ? `내 AI: ${connectedAi.map((a) => a.name).join(", ")}` : "내 AI 연결하기"}
          </button>
        </div>

        {/* 1. 공실 고르기 */}
        <div style={card}>
          {stepTitle(1, "공실 고르기")}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={noInput} onChange={(e) => setNoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pickByNo()} placeholder="공실번호로 불러오기 (예: 87889)"
              style={{ flex: 1, maxWidth: 320, padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, background: theme.cardBg, color: theme.textPrimary }} />
            <button onClick={pickByNo} style={{ padding: "10px 16px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>불러오기</button>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>내 공실</div>
          {mine === null ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>불러오는 중…</div>
          ) : mine.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>등록한 공실이 없습니다. 위에서 공실번호로 불러올 수 있습니다.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {mine.map((v) => (
                <button key={v.id} onClick={() => { setPicked(v); setResult(null); }}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 14, color: theme.textPrimary,
                    border: `1px solid ${picked?.id === v.id ? "#1a3a6b" : theme.border}`, background: picked?.id === v.id ? "rgba(26,58,107,0.08)" : "transparent", fontWeight: picked?.id === v.id ? 700 : 500 }}>
                  {vacancyLabel(v)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. 분석·캡처 */}
        <div style={card}>
          {stepTitle(2, "공실 분석·캡처")}
          {!picked ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 공실을 골라 주세요.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: theme.textPrimary }}>{vacancyLabel(picked)}</span>
                <button onClick={analyze} disabled={busy}
                  style={{ padding: "10px 18px", background: busy ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer" }}>
                  {busy ? "분석·캡처 중…" : result ? "다시 분석·캡처" : "분석·캡처 시작"}
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>등록 사진 전부와 화면 3장(공실열람 검증·지도·로드뷰)을 모읍니다. 10초쯤 걸립니다.</div>
            </>
          )}
          {progress && <div style={{ marginTop: 12, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{progress}</div>}
          {error && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{error}</div>}

          {result && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: theme.textPrimary }}>{result.vacancy.title}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#2563eb", margin: "4px 0 8px" }}>{result.vacancy.priceText}</div>
              <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.7 }}>
                상세 항목 {result.vacancy.fields?.length || 0}개{result.vacancy.themes?.length ? ` · ${result.vacancy.themes.join(" ")}` : ""}
                {result.vacancy.infra ? <div>주변환경: {result.vacancy.infra}</div> : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
                {result.media.map((m, i) => (
                  <figure key={i} style={{ margin: 0, border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden", background: theme.bg || "#f6f8fa" }}>
                    <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#e5e7eb" }}>
                      {m.thumb && <img src={m.thumb} alt={m.caption} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                      <span style={{ position: "absolute", top: 8, left: 8, fontSize: 11, fontWeight: 800, padding: "3px 7px", borderRadius: 6, background: m.kind === "photo" ? "rgba(0,0,0,0.6)" : "#1a3a6b", color: "#fff" }}>{KIND_LABEL[m.kind] || m.kind}</span>
                    </div>
                    <figcaption style={{ padding: "8px 10px", fontSize: 12, lineHeight: 1.5, color: theme.textSecondary }}>{m.caption}</figcaption>
                  </figure>
                ))}
              </div>
              {result.failures.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 13, color: "#b45309" }}>못 가져온 것: {result.failures.join(" / ")}</div>
              )}
            </div>
          )}
        </div>

        {/* 3. 블로그 쓰기 (다음 단계) */}
        <div style={{ ...card, opacity: 0.6 }}>
          {stepTitle(3, "블로그 쓰기 · 네이버 채우기")}
          <div style={{ fontSize: 14, color: theme.textSecondary }}>다음 단계에서 붙입니다. 소장님 AI(ChatGPT)로 블로그 글을 쓰고 네이버 글쓰기에 채웁니다.</div>
        </div>
      </div>
    </div>
  );
}
