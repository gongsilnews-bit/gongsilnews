"use client";

import React, { useCallback, useEffect, useState } from "react";
import { findStudioVacancyByNo, listMyStudioVacancies } from "@/app/actions/studio";
import StudioBlogEditor, { type BlogDraft } from "./StudioBlogEditor";
import StudioSnsPanel, { type SnsData, type ChannelInfo } from "./StudioSnsPanel";
import ChannelButton from "./ChannelButton";

/**
 * SNS뉴스발행 (공실뉴스 스튜디오 앱 전용)
 *
 * 1단계 공실 분석·캡처: 공실을 고르면 앱이 안 보이는 창에서 공실열람을 열어
 * 매물 정보를 읽고, 등록 사진 전부 + 화면 3장(공실열람 검증·지도·로드뷰)을 모은다.
 * 결과는 앱(PC)에 저장되고 기사·블로그·SNS·영상이 함께 쓴다.
 * 3단계 블로그 쓰기: 크롬 확장과 같은 블로그 프롬프트(6문체·글자 수)로 소장님 AI(ChatGPT)가 쓴다.
 * 채널 탭: 네이버 블로그(③④) · 인스타그램 · 스레드 · 페이스북(StudioSnsPanel). ①②는 분석이 끝나면 한 줄로 접힌다.
 * 4단계 네이버 블로그 채우기: 확장과 같은 디자인 4종·사진 배치·출처 블록으로 네이버 글쓰기에 채운다.
 *   발행은 회원이 누른다. 태그는 발행 창이 열릴 때 채워진다.
 */

type MediaThumb = { kind: string; caption: string; thumb: string | null };
type Analysis = {
  vacancyId: string;
  vacancy: { title?: string; priceText?: string; saleKind?: string; fields?: { label: string; value: string }[]; themes?: string[]; infra?: string };
  media: MediaThumb[];
  failures: string[];
};
type BlogStyles = { saleKind?: string; styles: { id: string; label: string; fit: string; titleExample: string; design?: string }[]; lengths: { id: string; label: string; chars: string }[] };
type Blog = BlogDraft;
type Usage = { plan: string; monthLimit: number; monthUsed: number; monthRemaining: number | null; dailyLimit: number | null; todayUsed: number; custom: boolean };
type AiItem = { id: string; name: string; ready: boolean; ok: boolean; account?: string; plan?: string };
type StudioBridge = {
  openAiConnect: () => Promise<void>;
  ai: { list: () => Promise<AiItem[]>; connect: (id: string) => Promise<{ ok: boolean }>; finishLogin: () => Promise<void> };
  vacancy: { analyze: (id: string) => Promise<Analysis>; onProgress: (fn: (t: string) => void) => () => void };
  naver: {
    designs: () => Promise<{ id: string; label: string; hint: string }[]>;
    fill: (opts: { vacancyId: string; design: string }) => Promise<{ ok: boolean; imagesInserted: number; imagesTotal: number; design: string; tags: string[] }>;
    openMyBlog: () => Promise<unknown>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
  sns: { channels: () => Promise<ChannelInfo[]>; get: (vacancyId: string) => Promise<SnsData | null> };
  blog: {
    styles: (vacancyId?: string) => Promise<BlogStyles>;
    write: (opts: { vacancyId: string; style: string; length: string }) => Promise<Blog>;
    get: (vacancyId: string) => Promise<Blog | null>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
type VacancyRow = { id: string; vacancy_no: number; building_name?: string | null; trade_type?: string | null; property_type?: string | null; sido?: string; sigungu?: string; dong?: string };
type MyVacancy = { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; property_type: string | null; deposit: number | null; monthly_rent: number | null; address: string; created_at: string; photo: string | null; photoCount: number };

/* 원 단위 → "3억 5,000만" (공실열람과 같은 표기) */
function won(v: number | null) {
  if (!v) return "";
  const man = Math.floor(v / 10000);
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString()}만`;
  if (eok) return `${eok}억`;
  return `${man.toLocaleString()}만`;
}
function priceText(v: MyVacancy) {
  if (v.trade_type === "월세") return `월세 ${won(v.deposit) || "0"} / ${won(v.monthly_rent) || "0"}`;
  return `${v.trade_type || ""} ${won(v.deposit)}`.trim();
}

const bridge = (): StudioBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: StudioBridge }).gongsilStudio ?? null) : null);

const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰" };

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function StudioSnsSection({ theme, memberId }: { theme: Theme; memberId: string }) {
  const [ai, setAi] = useState<AiItem[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [snsUsage, setSnsUsage] = useState<Usage | null>(null);
  // 채널 탭 (회의 결정: 공통 ①②를 한 번 하고, 채널마다 탭)
  const [tab, setTab] = useState("blog");
  const [pickOpen, setPickOpen] = useState(true); // ①② 펼침 — 분석이 끝나면 한 줄로 접는다
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [snsData, setSnsData] = useState<SnsData | null>(null);
  const loadUsage = useCallback(() => {
    fetch("/api/studio/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setUsage(d.usage);
        setSnsUsage(d.snsUsage || null);
      })
      .catch(() => {});
  }, []);
  useEffect(() => loadUsage(), [loadUsage]);
  const [mine, setMine] = useState<MyVacancy[] | null>(null);
  const [mineError, setMineError] = useState("");

  const [noInput, setNoInput] = useState("");
  const [picked, setPicked] = useState<VacancyRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [blogOpts, setBlogOpts] = useState<BlogStyles | null>(null);
  const [style, setStyle] = useState("listing");
  const [length, setLength] = useState("normal");
  const [writing, setWriting] = useState(false);
  const [blogProgress, setBlogProgress] = useState("");
  const [blogError, setBlogError] = useState("");
  const [blog, setBlog] = useState<Blog | null>(null);
  const [designs, setDesigns] = useState<{ id: string; label: string; hint: string }[]>([]);
  const [design, setDesign] = useState("");
  const [filling, setFilling] = useState(false);
  const [naverProgress, setNaverProgress] = useState("");
  const [naverError, setNaverError] = useState("");
  const [naverLogin, setNaverLogin] = useState<"" | "need" | "open">("");
  const [naverDone, setNaverDone] = useState<{ imagesInserted: number; imagesTotal: number; tags: string[] } | null>(null);

  useEffect(() => {
    bridge()?.blog.styles().then(setBlogOpts);
    bridge()?.naver.designs().then(setDesigns);
    bridge()?.sns.channels().then(setChannels).catch(() => {});
  }, []);

  // 문체마다 어울리는 디자인 (확장과 같은 짝)
  // 문체마다 어울리는 디자인 (확장과 같은 짝 — 문체 목록에 함께 온다)
  const designFor = (id: string) => blogOpts?.styles.find((x) => x.id === id)?.design || "basic";

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
    listMyStudioVacancies().then((res) => {
      if (res.success) setMine(res.data);
      else {
        setMine([]);
        setMineError(res.error);
      }
    });
  }, [memberId]);



  const pickByNo = async () => {
    setError("");
    const res = await findStudioVacancyByNo(noInput);
    if (!res.success) return setError(res.error);
    setPicked(res.data as VacancyRow);
    setResult(null);
    setBlog(null);
    setSnsData(null);
  };

  const analyze = async () => {
    const b = bridge();
    if (!b || !picked) return;
    setBusy(true);
    setError("");
    setResult(null);
    const off = b.vacancy.onProgress(setProgress);
    try {
      const r = await b.vacancy.analyze(picked.id);
      setResult(r);
      setBlogOpts(await b.blog.styles(r.vacancyId)); // 경매·공매 물건이면 경매용 문체
      setPickOpen(false);
      setSnsData(await b.sns.get(r.vacancyId).catch(() => null));
      const prev = await b.blog.get(r.vacancyId);
      if (prev) {
        setBlog(prev);
        setStyle(prev.style);
        setLength(prev.length);
        setDesign(designFor(prev.style));
      }
    } catch (e) {
      setError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      off();
      setProgress("");
      setBusy(false);
    }
  };

  const writeBlog = async () => {
    const b = bridge();
    if (!b || !result) return;
    setWriting(true);
    setBlogError("");
    setBlog(null);
    const off = b.blog.onProgress(setBlogProgress);
    setNaverDone(null);
    try {
      setBlog(await b.blog.write({ vacancyId: result.vacancyId, style, length }));
      setDesign(designFor(style));
    } catch (e) {
      setBlogError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      off();
      setBlogProgress("");
      setWriting(false);
      loadUsage();
    }
  };

  const fillNaver = async () => {
    const b = bridge();
    if (!b || !result || !blog) return;
    setFilling(true);
    setNaverError("");
    setNaverDone(null);
    const off = b.naver.onProgress(setNaverProgress);
    try {
      const r = await b.naver.fill({ vacancyId: result.vacancyId, design: design || "basic" });
      setNaverDone(r);
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
      if (msg.startsWith("NAVER_LOGIN:")) setNaverLogin("need");
      setNaverError(msg.replace(/^NAVER_LOGIN:\s*/, ""));
    } finally {
      off();
      setNaverProgress("");
      setFilling(false);
    }
  };

  /* 네이버 로그인: 전용 크롬(조종 없는 평범한 창)에서 회원이 직접 로그인 → [로그인 다 했어요] */
  const loginNaver = async () => {
    const b = bridge();
    if (!b) return;
    setNaverLogin("open");
    setNaverError("");
    try {
      const r = await b.ai.connect("naver");
      if (r && r.ok) {
        setNaverLogin("");
        setNaverProgress("");
        setNaverError("");
        setNaverDone(null);
      } else {
        setNaverLogin("need");
        setNaverError("네이버 로그인이 확인되지 않았습니다. 다시 [네이버 로그인]을 눌러 주세요.");
      }
    } catch (e) {
      setNaverLogin("need");
      setNaverError((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {(() => {
            const u = tab === "blog" ? usage : snsUsage;
            const name = tab === "blog" ? "블로그" : "SNS";
            if (!u) return null;
            return u.monthRemaining === null ? (
              <span style={{ fontSize: 13, fontWeight: 700, padding: "8px 12px", borderRadius: 10, background: "#ecfdf5", color: "#047857" }}>
                {name} 무제한{u.dailyLimit !== null ? ` · 오늘 ${u.todayUsed}/${u.dailyLimit}건` : ""}
              </span>
            ) : u.monthRemaining > 0 ? (
              <span style={{ fontSize: 13, fontWeight: 700, padding: "8px 12px", borderRadius: 10, background: "#eff6ff", color: "#1d4ed8" }}>
                이번 달 {name} {u.monthRemaining}/{u.monthLimit}회 남음
              </span>
            ) : (
              <a href="/study" target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 800, padding: "8px 12px", borderRadius: 10, background: "#fef3c7", color: "#b45309", textDecoration: "none" }}>
                {u.monthLimit === 0 ? `${name}는 부동산회원 기능입니다` : `이번 달 ${u.monthLimit}회를 모두 썼어요 · 공실스터디 멤버십 무제한 →`}
              </a>
            );
          })()}
          <button onClick={() => bridge()?.openAiConnect()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connectedAi.length ? "#22c55e" : "#cbd5e1" }} />
            {connectedAi.length ? `내 AI: ${connectedAi.map((a) => a.name).join(", ")}` : "내 AI 연결하기"}
          </button>
          </div>
        </div>

        {/* ①② 접힌 요약 (분석이 끝나면) */}
        {result && !pickOpen && (
          <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {result.media.slice(0, 4).map((m, i) => (
                <div key={i} style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "#e5e7eb" }}>
                  {m.thumb && <img src={m.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                {result.vacancy.saleKind && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c" }}>{result.vacancy.saleKind}</span>
                )}
                {picked ? vacancyLabel(picked) : result.vacancy.title}
              </div>
              <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                {result.vacancy.title} · {result.vacancy.priceText} · 사진 {result.media.length}장 분석·캡처 완료
              </div>
            </div>
            <button onClick={() => setPickOpen(true)}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              공실 바꾸기
            </button>
          </div>
        )}

        {(!result || pickOpen) && (<>
        {/* 1. 공실 고르기 */}
        <div style={card}>
          {stepTitle(1, "공실 고르기")}
          {/* 내가 등록한 공실은 셀렉트바로 (기사등록의 "보도 대상 공실 매물"과 같은 모양) */}
          <label style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 6, display: "block" }}>보도 대상 공실 매물</label>
          {mine === null ? (
            <div style={{ fontSize: 13, color: theme.textSecondary }}>불러오는 중…</div>
          ) : mine.length === 0 ? (
            <div style={{ fontSize: 13.5, color: "#b45309", padding: "6px 0" }}>{mineError || "아직 등록한 공실이 없습니다."} 공실등록 메뉴에서 공실을 등록하면 여기에 나옵니다.</div>
          ) : (
            <select value={picked && mine.some((v) => v.id === picked.id) ? picked.id : ""}
              onChange={(e) => {
                const v = mine.find((x) => x.id === e.target.value);
                if (!v) return;
                setPicked(v);
                setResult(null);
                setBlog(null);
                setSnsData(null);
              }}
              style={{ width: "100%", maxWidth: 560, padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, background: theme.cardBg, color: theme.textPrimary }}>
              <option value="">공실을 골라 주세요 ({mine.length}개)</option>
              {mine.map((v) => (
                <option key={v.id} value={v.id}>
                  [{v.trade_type || "-"}] {v.building_name || "무제"} ({v.address || ""}) · {v.vacancy_no}
                </option>
              ))}
            </select>
          )}
          {/* 경매·공매 물건이나 남의 공실은 물건번호로 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: theme.textSecondary }}>또는</span>
            <input value={noInput} onChange={(e) => setNoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pickByNo()} placeholder="공실·경매 물건번호 (예: 87889)"
              style={{ width: 240, padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary }} />
            <button onClick={pickByNo} style={{ padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>불러오기</button>
          </div>
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

        </>)}

        {/* 채널 탭 */}
        {result && (
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${theme.border}`, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
            {[{ id: "blog", label: "네이버 블로그", done: Boolean(blog) }, ...channels.map((c) => ({ id: c.id, label: c.label, done: Boolean(snsData?.channels[c.id]?.post) }))].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: "11px 18px", border: 0, background: "transparent", cursor: "pointer", fontSize: 14.5, whiteSpace: "nowrap",
                  fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? "#1a3a6b" : theme.textSecondary,
                  borderBottom: `3px solid ${tab === t.id ? "#1a3a6b" : "transparent"}`, marginBottom: -1 }}>
                {t.label}
                {t.done && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: "#16a34a" }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {result && tab !== "blog" && channels.find((c) => c.id === tab) && (
          <StudioSnsPanel theme={theme} channel={tab} info={channels.find((c) => c.id === tab)!} vacancyId={result.vacancyId}
            data={snsData} onData={setSnsData} onUsed={loadUsage} />
        )}

        {(!result || tab === "blog") && (<>
        {/* 3. 블로그 쓰기 */}
        <div style={{ ...card, opacity: result ? 1 : 0.6 }}>
          {stepTitle(3, "블로그 쓰기")}
          {!result ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 공실 분석·캡처를 해 주세요.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>문체</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
                {(blogOpts?.styles || []).map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)} title={`예: ${s.titleExample}`}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: style === s.id ? "rgba(26,58,107,0.08)" : "transparent",
                      border: `1px solid ${style === s.id ? "#1a3a6b" : theme.border}`, color: theme.textPrimary }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{s.fit}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginRight: 4 }}>글자 수</span>
                {(blogOpts?.lengths || []).map((l) => (
                  <button key={l.id} onClick={() => setLength(l.id)}
                    style={{ padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 700,
                      border: `1px solid ${length === l.id ? "#1a3a6b" : theme.border}`, background: length === l.id ? "#1a3a6b" : "transparent", color: length === l.id ? "#fff" : theme.textPrimary }}>
                    {l.label} · {l.chars}
                  </button>
                ))}
                <button onClick={writeBlog} disabled={writing}
                  style={{ marginLeft: "auto", padding: "10px 18px", background: writing ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: writing ? "default" : "pointer" }}>
                  {writing ? "ChatGPT가 쓰는 중…" : blog ? "다시 쓰기" : "ChatGPT로 블로그 글 쓰기"}
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>스튜디오 전용 크롬에서 ChatGPT가 열려 직접 씁니다. 1~2분 걸립니다.</div>
            </>
          )}
          {blogProgress && <div style={{ marginTop: 12, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{blogProgress}</div>}
          {blogError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{blogError}</div>}

          {blog && <StudioBlogEditor key={`${blog.vacancyId}-${blog.title}`} theme={theme} initial={blog} />}
        </div>

        {/* 4. 네이버 블로그 채우기 */}
        <div style={{ ...card, opacity: blog ? 1 : 0.6 }}>
          {stepTitle(4, "네이버 블로그 채우기")}
          {!blog ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 블로그 글을 써 주세요.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>블로그 디자인</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
                {designs.map((d) => (
                  <button key={d.id} onClick={() => setDesign(d.id)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: design === d.id ? "rgba(26,58,107,0.08)" : "transparent",
                      border: `1px solid ${design === d.id ? "#1a3a6b" : theme.border}`, color: theme.textPrimary }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 1.5 }}>{d.hint}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: theme.textSecondary, flex: 1, minWidth: 260, lineHeight: 1.6 }}>
                  스튜디오 전용 크롬에 네이버 글쓰기가 열리고 제목·본문·사진 {result?.media.length || 0}장·매물 정보 출처가 채워집니다. <b>[발행]은 소장님이 직접</b> 눌러 주세요. 태그는 발행 창이 열릴 때 자동으로 들어갑니다.
                </div>
                <ChannelButton channel="blog" label="네이버 블로그 바로가기" onClick={() => bridge()?.naver.openMyBlog()} />
                <button onClick={fillNaver} disabled={filling}
                  style={{ padding: "11px 20px", background: filling ? "#94a3b8" : "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: filling ? "default" : "pointer" }}>
                  {filling ? "네이버에 채우는 중…" : "네이버 블로그에 채우기"}
                </button>
              </div>
            </>
          )}
          {naverProgress && <div style={{ marginTop: 12, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{naverProgress}</div>}
          {naverError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030", lineHeight: 1.6 }}>{naverError}</div>}
          {naverLogin === "need" && (
            <button onClick={loginNaver}
              style={{ marginTop: 10, padding: "10px 16px", background: "#03c75a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              네이버 로그인
            </button>
          )}
          {naverLogin === "open" && (
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "#065f46", flex: 1, minWidth: 240, lineHeight: 1.6 }}>
                오른쪽에 새로 뜬 &quot;공실뉴스 스튜디오&quot; 크롬 창에서 네이버에 로그인한 뒤 눌러 주세요. (평소 쓰시는 크롬 창이 아닙니다)
              </span>
              <button onClick={() => bridge()?.ai.finishLogin()}
                style={{ padding: "10px 16px", background: "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                로그인 다 했어요
              </button>
            </div>
          )}
          {naverDone && (
            <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 14, color: "#065f46", lineHeight: 1.7 }}>
              네이버 글쓰기에 채웠습니다. 사진 {naverDone.imagesInserted}/{naverDone.imagesTotal}장.
              {naverDone.imagesInserted < naverDone.imagesTotal ? " 빠진 사진은 네이버 화면에서 직접 올려 주세요." : ""}
              <br />오른쪽 크롬 창에서 내용을 확인하고 <b>[발행]</b>을 눌러 주세요. 태그 {naverDone.tags.length}개는 발행 창에 자동으로 들어갑니다.
            </div>
          )}
        </div>
        </>)}
      </div>
    </div>
  );
}
