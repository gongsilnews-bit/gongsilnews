"use client";
/**
 * 기사쓰기 왼쪽 "글쓰기 도구" (2026-11-03 사장님: 기존 기사초안작성기를 버리고 대본 작성 모양으로)
 *  ① 무엇으로 쓸까요 — 매물 소개 · 단지/시세 · 뉴스 기사 · 자유 주제 · 공실뉴스
 *  ② 재료 ③ 기사 스타일 ④ 문체·제목 ⑤ 분량 ⑥ 더 할 말 → [✨ AI 기사 초안 작성] → 가운데 기사 칸(제목·부제목·본문·키워드)에 채운다.
 *  AI 는 회원 본인 계정 (앱 gongsilStudio.write.ask, 서버 AI 안 씀). 숫자는 공실뉴스 데이터(재료)에 있는 것만.
 *  디자인은 대본 작성과 같은 톤 — 흰 바탕 · 옅은 회색 선 · 남색 하나 · 번호 단계.
 */
import React, { useEffect, useState } from "react";
import { writingArticleFacts, writingArticles, writingComplexFacts, writingMyVacancies, writingSearchComplexes, writingVacancyFacts } from "@/app/actions/writingFacts";

/** photos — 공실뉴스 단지 화면 캡처 (시세·로드뷰·실거래, 2026-11-03 사장님). url 은 앱이 저장한 사진 주소 */
export type ArticleDraft = { title: string; subtitles: string[]; paragraphs: { heading?: string; text: string }[]; keywords: string[]; photos?: { url: string; caption: string; after: number }[] };
type News = { title: string; body: string; publisher?: string; url?: string; publishedAt?: string };
type Bridge = {
  write?: { ask: (prompt: string, opts?: { json?: boolean; busyLabel?: string }) => Promise<string>; onProgress: (fn: (t: string) => void) => () => void };
  video?: { capturePage?: (url: string, opts: { mode: "head" | "full"; title?: string; credit?: string; max?: number }) => Promise<{ url: string }[]> };
  column?: { fetchNews: (url: string) => Promise<News>; openNews?: () => Promise<unknown>; grabNews?: () => Promise<News> };
};
const bridge = (): Bridge | null => (typeof window === "undefined" ? null : ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null));
export const articleToolReady = () => Boolean(bridge()?.write);

export const NAVY = "#1e3a6e";
const LINE = "#e5e7eb", SUB = "#6b7280", DIM = "#9ca3af", TEXT = "#1f2937";
type Src = "vacancy" | "market" | "news" | "topic" | "gongsil";
const SRCS: [Src, string][] = [["vacancy", "매물 소개"], ["market", "단지/시세"], ["news", "뉴스 기사"], ["topic", "자유 주제"], ["gongsil", "공실뉴스"]];
const KINDS = [
  { id: "news", name: "뉴스기사형", prompt: "도입부터 결론까지 문단이 자연스럽게 이어지는 뉴스 기사. 매물 조건·지역·수요·확인할 점을 기사 흐름 안에서 풀어 쓴다." },
  { id: "summary", name: "단락별 요약", prompt: "첫 문단에서 기사 전체를 요약하고, 이어서 핵심 내용을 소제목 단위로 나눠 독자가 빠르게 훑어볼 수 있게 쓴다." },
];
const TONES = [
  { id: "report", name: "보도형", desc: "사실 중심, 건조하게", prompt: "사실을 먼저, 건조하고 정확하게. 형용사·감탄 없이." },
  { id: "analysis", name: "해설형", desc: "의미까지 차분히", prompt: "사실을 전한 뒤 그 의미와 독자에게 주는 영향을 차분히 해설한다. 단정·전망 금지." },
  { id: "field", name: "현장 르포", desc: "와 있는 듯 생생하게", prompt: "현장에 와 있는 기자처럼 동선·주변 모습을 생생하게 묘사한다. 사실은 자료 그대로." },
  { id: "quote", name: "인터뷰·인용형", desc: "말을 살려서", prompt: "자료에 있는 말·설명을 인용 형식으로 살린다. 자료에 없는 발언은 절대 지어내지 않는다." },
];
const HOOKS = [
  { id: "q", name: "질문", prompt: "제목은 독자가 답하고 싶은 질문형" },
  { id: "num", name: "숫자", prompt: "제목에 가장 눈에 띄는 숫자 하나 (자료에 있는 숫자만)" },
  { id: "twist", name: "반전", prompt: "제목은 예상을 뒤집는 한마디" },
  { id: "empathy", name: "공감", prompt: "제목은 독자의 고민을 짚는 공감형" },
];
const LENGTHS = [
  { id: "short", name: "짧게", chars: "700~1,000자" },
  { id: "normal", name: "보통", chars: "1,400~1,800자" },
  { id: "long", name: "길게", chars: "2,800~3,500자" },
];
const RULES = [
  "사실(숫자·가격·면적·주소·날짜·이름)은 [재료]에 있는 것만 쓴다. 재료에 없으면 쓰지 않는다 — 지어내지 않는다.",
  "AI 티 나는 말(다양한·최적의·완벽한·결론적으로·요약하자면·여러분)과 과장·단정·투자 권유('무조건 오른다' 등)를 쓰지 않는다.",
  "한 문장은 짧게, 쉬운 말로. 같은 말을 되풀이하지 않는다.",
  "개인정보(연락처·동호수·실명)를 넣지 않는다. 남의 기사 문장을 그대로 옮기지 않고 사실만 살려 새로 쓴다.",
  "단지·건물 이름은 브랜드와 동네를 띄어 쓰고, 영문 이름은 한글로.",
];

/** 작업 중 점점점 (2026-11-03 사장님: "작업시 흰색 점점점") */
function Dots({ color = "#fff" }: { color?: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, marginLeft: 8, verticalAlign: "middle" }} aria-hidden>
      <style>{`@keyframes gsDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}`}</style>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: `gsDot 1.2s ${i * 0.18}s infinite ease-in-out` }} />)}
    </span>
  );
}

export default function ArticleAiTool({ onDraft, hasContent }: { onDraft: (d: ArticleDraft) => void; hasContent: () => boolean }) {
  const [src, setSrc] = useState<Src>("vacancy");
  const [kind, setKind] = useState("news");
  const [tone, setTone] = useState("");
  const [hook, setHook] = useState("");
  const [len, setLen] = useState("normal");
  const [more, setMore] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  // 재료
  const [vacs, setVacs] = useState<{ id: string; label: string }[] | null>(null);
  const [vacId, setVacId] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; label: string }[]>([]);
  const [pick, setPick] = useState<{ id: string; label: string } | null>(null);
  const [newsUrl, setNewsUrl] = useState("");
  // 가져온 뉴스 — [지금 보는 뉴스 가져오기] · 주소 [가져오기] (2026-11-03 사장님: 네이버에서 가져오고 지금 보는 뉴스도)
  const [news, setNews] = useState<News | null>(null);
  const [newsBusy, setNewsBusy] = useState(false);
  const takeNews = async (how: "url" | "grab") => {
    const c = bridge()?.column;
    if (!c) return setErr("뉴스 가져오기는 공실마케팅 앱에서 돼요.");
    setErr(""); setNewsBusy(true);
    try {
      const n = how === "grab" ? await c.grabNews!() : await c.fetchNews(newsUrl.trim());
      setNews(n);
      if (n.url) setNewsUrl(n.url);
    } catch (e) { setErr((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "")); }
    finally { setNewsBusy(false); }
  };
  const [topic, setTopic] = useState("");

  useEffect(() => {
    if ((src === "vacancy") && vacs === null) writingMyVacancies().then((r) => { const l = r.success ? r.data : []; setVacs(l); if (l[0] && !vacId) setVacId(l[0].id); }).catch(() => setVacs([]));
    if (src === "gongsil" && !found.length) writingArticles("").then((r) => r.success && setFound(r.data)).catch(() => {});
    setPick(null); setErr(""); if (src !== "gongsil") setFound([]);
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // [공실열람에서 고르기] — 단지 창 [이 단지로 대본 쓰기]가 보내 주는 단지
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "gs-apt-pick") return;
      setSrc("market");
      setTimeout(() => setPick({ id: String(e.data.id), label: `${e.data.name} · ${e.data.dong || ""}` }), 0);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const openGongsil = () => { window.open(`${window.location.origin}/gongsil?aptPick=1`, "gs-apt-pick", "width=1400,height=900"); };

  const search = async () => {
    setErr("");
    const r = src === "market" ? await writingSearchComplexes(q) : await writingArticles(q);
    if (!r.success) return setErr(r.error);
    setFound(r.data);
    if (!r.data.length) setErr("찾지 못했어요. 이름을 바꿔 보세요.");
  };

  /* ── ① 먼저 분석 (자료 모으기 · 공실뉴스 화면 캡처) → ② 확인 → ③ 쓰기 (2026-11-03 사장님: 한 번에 하니 버벅거림) ──
   *  공실·단지·기사를 고르면 저절로 분석한다. 분석해 둔 재료로 문체만 바꿔 여러 번 다시 쓸 수 있다 */
  type Shot = { url: string; thumb: string; caption: string };
  type Analysis = { key: string; subject: string; mats: string[]; summary: string[]; complex: { id: string; name: string } | null; shots: Shot[] };
  const [ana, setAna] = useState<Analysis | null>(null);
  const [anaBusy, setAnaBusy] = useState("");
  const [capBusy, setCapBusy] = useState(false);
  const anaKey = src === "vacancy" ? `v:${vacId}` : src === "market" ? `m:${pick?.id || ""}` : src === "gongsil" ? `g:${pick?.id || ""}` : src === "news" ? `n:${news?.url || news?.title || ""}` : `t:${topic.trim()}`;
  const errOf = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
  /** 공실뉴스 단지 화면 3장 — 시세 그래프 · 로드뷰 · 실거래 금액. 하나씩 차례로 (한꺼번에 찍으면 버벅거린다) */
  const capture = async (complex: { id: string; name: string }) => {
    const cap = bridge()?.video?.capturePage;
    if (!cap) return [] as Shot[];
    const out: Shot[] = [];
    // 공실 기사 사진(공실열람 검증·지도·로드뷰)과 같은 모양 — 공실열람 화면 · 로드뷰 · 실거래가 (2026-11-03 사장님)
    const o = window.location.origin, id = encodeURIComponent(complex.id);
    const SH = [
      { what: "공실열람 단지 시세 화면", url: `${o}/gongsil?apt=${id}`, caption: `[공실열람 단지 시세] 공실뉴스 공실열람에서 본 '${complex.name}' 실거래 시세 (자료: 국토교통부 실거래가)` },
      { what: "로드뷰", url: `${o}/apt-capture/${id}?part=roadview`, caption: `[현장 로드뷰] ${complex.name} 진입로 및 가로변 전경 (자료: 로드뷰)` },
      { what: "실거래가", url: `${o}/apt-capture/${id}?part=trades`, caption: `[실거래가] ${complex.name} 최근 실거래 내역 (자료: 국토교통부 실거래가)` },
    ];
    for (const sh of SH) {
      setAnaBusy(`${sh.what}을 캡처하는 중… (${out.length + 1}/3)`);
      const l = await cap(sh.url, { mode: "head", title: complex.name, credit: "" }).catch(() => []);
      const it = l[0] as unknown as { url: string; thumb?: string } | undefined;
      if (it?.url) out.push({ url: it.url, thumb: it.thumb || it.url, caption: sh.caption });
    }
    return out;
  };
  const analyze = async () => {
    const key = anaKey;
    setErr(""); setDone(false); setAnaBusy("공실뉴스 자료를 모으는 중…");
    try {
      const mats: string[] = [], summary: string[] = [];
      let subject = "", complex: { id: string; name: string } | null = null;
      if (src === "vacancy") {
        const r = await writingVacancyFacts(vacId);
        if (!r.success) throw new Error(r.error);
        mats.push(r.data.text); subject = `${r.data.title} 매물 소개 기사`;
        summary.push(...r.data.text.split("\n").slice(1, 5).map((l) => l.replace(/^- /, "")));
        if (r.data.complexId) { const c = await writingComplexFacts(r.data.complexId); if (c.success) { mats.push(c.data.text); complex = { id: r.data.complexId, name: c.data.title }; } }
      } else if (src === "market") {
        const c = await writingComplexFacts(pick!.id);
        if (!c.success) throw new Error(c.error);
        mats.push(c.data.text); subject = `${c.data.title} 실거래 시세 기사`; complex = { id: pick!.id, name: c.data.title };
        summary.push(...c.data.text.split("\n").slice(1, 5).map((l) => l.replace(/^- /, "")));
      } else if (src === "gongsil") {
        const a = await writingArticleFacts(pick!.id);
        if (!a.success) throw new Error(a.error);
        mats.push(a.data.text); subject = `공실뉴스 기사「${a.data.title}」를 바탕으로 한 후속·해설 기사`; summary.push(a.data.title);
      } else if (src === "news") {
        const n = news!;
        mats.push(`[원문 뉴스 — ${n.publisher || "원문 기사"}${n.publishedAt ? `, ${n.publishedAt}` : ""}]\n- 제목: ${n.title}\n- 본문: ${String(n.body || "").slice(0, 4000)}`);
        subject = `뉴스「${n.title}」를 바탕으로 새로 쓰는 기사 (마지막 문단에 출처 ${n.publisher || "원문 기사"} 를 밝힌다)`;
        summary.push(n.title);
      } else subject = topic.trim();
      const base: Analysis = { key, subject, mats, summary, complex, shots: [] };
      setAna(base);
      if (complex) { const shots = await capture(complex); setAna((a) => (a && a.key === key ? { ...a, shots } : a)); }
    } catch (e) { setErr(errOf(e)); setAna(null); }
    finally { setAnaBusy(""); }
  };
  const recapture = async () => {
    if (!ana?.complex) return;
    setCapBusy(true);
    const shots = await capture(ana.complex);
    setAna((a) => (a ? { ...a, shots } : a));
    setAnaBusy(""); setCapBusy(false);
  };
  // 고르면 저절로 분석 (자유 주제는 분석할 것이 없다)
  useEffect(() => {
    if (src === "topic") { setAna(null); return; }
    const can = src === "vacancy" ? Boolean(vacId) : src === "news" ? Boolean(news) : Boolean(pick);
    if (!can) { setAna(null); return; }
    if (ana?.key === anaKey) return;
    void analyze();
  }, [anaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = src === "topic" ? Boolean(topic.trim()) : Boolean(ana && ana.key === anaKey) && !anaBusy;

  const write = async () => {
    const b = bridge();
    if (!b?.write) return setErr("공실마케팅 앱 새 버전에서 쓸 수 있어요.");
    if (hasContent() && !confirm("지금 쓴 제목·본문을 AI 초안으로 바꿀까요?")) return;
    const a: Analysis = src === "topic" ? { key: anaKey, subject: topic.trim(), mats: [], summary: [], complex: null, shots: [] } : ana!;
    setErr(""); setDone(false); setBusy("AI가 기사 초안을 쓰는 중… (1~2분)");
    const off = b.write.onProgress((t) => setBusy(t));
    try {
      const k = KINDS.find((x) => x.id === kind)!, tn = TONES.find((x) => x.id === tone), hk = HOOKS.find((x) => x.id === hook), ln = LENGTHS.find((x) => x.id === len)!;
      const prompt = [
        "당신은 대한민국 부동산 전문 매체의 숙련된 기자다. 아래 자료로 기사 한 편을 쓴다.",
        `[주제] ${a.subject}`,
        `[기사 형식] ${k.name} — ${k.prompt}`,
        tn ? `[문체] ${tn.name} — ${tn.prompt}` : "",
        hk ? `[제목] ${hk.prompt}` : "[제목] 핵심을 담아 클릭하고 싶게, 과장 없이",
        `[분량] 본문 ${ln.chars}`,
        `[재료 — 사실은 여기 있는 것만]\n${a.mats.length ? a.mats.join("\n\n") : "(자료 없음 — 일반적인 정보만, 숫자·이름을 지어내지 말 것)"}`,
        more.trim() ? `[요청 — 꼭 반영] ${more.trim()}` : "",
        `[규칙]\n${RULES.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
        "[쓰는 방법] 다 쓴 뒤 스스로 점검하고 고친 최종본만 낸다: 제목이 끌리는가 · 첫 문단에 핵심이 있는가 · 사실이 재료에 있는 것뿐인가 · 문장이 짧은가.",
        '[답 형식 — 설명 없이 JSON 하나만] {"title":"제목","subtitles":["부제 1","부제 2","부제 3"],"paragraphs":[{"heading":"소제목(단락별 요약일 때만, 아니면 빈 글자)","text":"문단"}],"keywords":["키워드1","키워드2","키워드3","키워드4","키워드5"]}',
      ].filter(Boolean).join("\n\n");
      const raw = await b.write.ask(prompt, { json: true, busyLabel: "기사 초안을 쓰고 있습니다" });
      const s = String(raw || "").replace(/```(?:json)?/gi, "");
      const j = JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)) as Partial<ArticleDraft>;
      const paragraphs = (j.paragraphs || []).filter((p) => p && String(p.text || "").trim()).map((p) => ({ heading: String(p.heading || "").trim(), text: String(p.text).trim() }));
      if (!j.title || !paragraphs.length) throw new Error("AI 답을 읽지 못했어요. 다시 눌러 주세요.");
      // 자리 — 첫 사진은 첫 문단 뒤, 둘째는 둘째 문단 뒤, 셋째는 셋째 문단 뒤
      const photos = a.shots.map((x, i) => ({ url: x.url, caption: x.caption, after: Math.min(paragraphs.length, i + 1) }));
      onDraft({ title: String(j.title).trim(), subtitles: (j.subtitles || []).map(String).filter(Boolean).slice(0, 3), paragraphs, keywords: (j.keywords || []).map(String).filter(Boolean).slice(0, 10), photos });
      setDone(true);
    } catch (e) {
      setErr(errOf(e));
    } finally { off(); setBusy(""); }
  };

  /** 분석 결과 — 숫자 몇 줄 · 사진 3장 (눌러서 빼기) · [다시 캡처] */
  const anaBox = () => (src !== "topic") && (anaBusy || ana) ? (
    <div style={{ marginTop: 10, border: `1px solid ${ana && !anaBusy ? NAVY : LINE}`, borderRadius: 5, background: "#f7f9fc", padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: NAVY }}>
        🔍 분석 {anaBusy ? <span style={{ fontWeight: 600, color: SUB }}>· {anaBusy}<Dots color={NAVY} /></span> : <span style={{ fontWeight: 600, color: "#16a34a" }}>· 끝 — 확인하고 아래에서 쓰세요</span>}
      </div>
      {ana && ana.summary.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: SUB, lineHeight: 1.6 }}>{ana.summary.slice(0, 4).map((l, i) => <div key={i} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>)}</div>}
      {ana?.complex && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {ana.shots.map((x, i) => (
              <div key={i} style={{ position: "relative", flex: "1 1 0", minWidth: 0 }} title={x.caption}>
                <img src={x.thumb} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4, display: "block", border: `1px solid ${LINE}` }} />
                <button type="button" onClick={() => setAna((a) => (a ? { ...a, shots: a.shots.filter((_, k) => k !== i) } : a))} title="이 사진 빼기"
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: 0, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            ))}
            {!ana.shots.length && !anaBusy && <div style={{ fontSize: 12, color: DIM }}>캡처한 사진이 없어요</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 11.5, color: DIM, flex: 1 }}>기사에 들어갈 사진 · 공실열람 화면 · 로드뷰 · 실거래가</span>
            <button type="button" onClick={() => void recapture()} disabled={Boolean(anaBusy) || capBusy} style={{ ...btn, height: 26, padding: "0 8px", fontSize: 12 }}>↻ 다시 캡처</button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  /* ── 모양 — 대본 작성 톤 ── */
  const head = (n: number, t: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: TEXT, marginBottom: 8 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>{t}
    </div>
  );
  const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 11px", borderRadius: 5, border: `1px solid ${on ? NAVY : "#d9dde3"}`, background: on ? NAVY : "#fff", color: on ? "#fff" : "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" });
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 38, padding: "0 11px", borderRadius: 5, border: "1px solid #d9dde3", background: "#fff", color: TEXT, fontSize: 13.5, fontFamily: "inherit" };
  const btn: React.CSSProperties = { height: 38, padding: "0 12px", borderRadius: 5, border: "1px solid #d9dde3", background: "#fff", color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
  const dim = (t: string) => <span style={{ fontWeight: 600, color: DIM, fontSize: 12.5 }}>{t}</span>;
  const list = (rows: { id: string; label: string }[]) => (
    <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${LINE}`, borderRadius: 5, marginTop: 6 }}>
      {rows.map((x) => (
        <button key={x.id} type="button" onClick={() => setPick(x)}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderBottom: `1px solid ${LINE}`, background: pick?.id === x.id ? "#eef2fb" : "#fff", color: TEXT, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{x.label}</button>
      ))}
    </div>
  );
  let n = 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#fff", color: TEXT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: `1px solid ${LINE}` }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>✍ 글쓰기 도구</span>{dim("AI 기사 초안")}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>{head(n++, "무엇으로 쓸까요")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{SRCS.map(([k, l]) => <button key={k} type="button" onClick={() => setSrc(k)} style={chip(src === k)}>{l}</button>)}</div>
        </div>
        <div>
          {src === "vacancy" && (<>{head(n++, "공실 고르기")}
            <select value={vacId} onChange={(e) => setVacId(e.target.value)} style={input}>
              {vacs === null ? <option>불러오는 중…</option> : vacs.length ? vacs.map((v) => <option key={v.id} value={v.id}>{v.label}</option>) : <option value="">광고 중인 내 공실이 없어요</option>}
            </select></>)}
          {src === "market" && (<>{head(n++, "단지 찾기")}
            <div style={{ display: "flex", gap: 5 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="단지 이름 — 예: 아크로힐스논현" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => void search()} disabled={q.trim().length < 2} style={btn}>찾기</button>
            </div>
            <button type="button" onClick={openGongsil} style={{ ...btn, marginTop: 6, height: 34 }}>📂 공실열람에서 단지 고르기</button>
            {found.length > 0 && !pick && list(found)}
            {pick && <div style={{ marginTop: 6, fontSize: 13, color: TEXT }}><b>{pick.label}</b> <button type="button" onClick={() => setPick(null)} style={{ border: 0, background: "none", color: SUB, cursor: "pointer" }}>바꾸기</button><div style={{ fontSize: 12, color: DIM }}>국토교통부 실거래가 — 기사에는 이 단지 숫자만 들어가요</div></div>}
          </>)}
          {src === "news" && (<>{head(n++, "뉴스 기사 고르기")}
            <div style={{ display: "flex", gap: 5 }}>
              <input value={newsUrl} onChange={(e) => { setNewsUrl(e.target.value); setNews(null); }} onKeyDown={(e) => { if (e.key === "Enter" && /^https?:\/\//.test(newsUrl.trim())) void takeNews("url"); }}
                placeholder="네이버 뉴스 기사 주소 붙여넣기 (https://n.news.naver.com/…)" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => void takeNews("url")} disabled={newsBusy || !/^https?:\/\//.test(newsUrl.trim())} style={btn}>가져오기</button>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
              <button type="button" onClick={() => void bridge()?.column?.openNews?.().catch(() => {})} style={{ ...btn, height: 34 }}>📂 네이버 뉴스 열기</button>
              <button type="button" onClick={() => void takeNews("grab")} disabled={newsBusy} title="전용 크롬에서 보고 있는 기사를 가져와요" style={{ ...btn, height: 34 }}>{newsBusy ? "가져오는 중…" : "지금 보는 뉴스 가져오기"}</button>
            </div>
            {news && (
              <div style={{ marginTop: 8, padding: "10px 12px", border: `1px solid ${NAVY}`, borderRadius: 5, background: "#f5f8fd" }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: TEXT, lineHeight: 1.45 }}>{news.title}</div>
                <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>{[news.publisher, news.publishedAt].filter(Boolean).join(" · ")} · 본문 {String(news.body || "").length.toLocaleString()}자</div>
              </div>
            )}
            <div style={{ fontSize: 12, color: DIM, marginTop: 5 }}>원문 문장은 옮기지 않고 사실만 살려 새로 쓰고, 출처를 밝혀요</div>
          </>)}
          {src === "topic" && (<>{head(n++, "주제")}
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 전세 계약 전 꼭 확인할 것" style={input} />
          </>)}
          {src === "gongsil" && (<>{head(n++, "공실뉴스 기사 고르기")}
            <div style={{ display: "flex", gap: 5 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="기사 제목 찾기" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => void search()} style={btn}>찾기</button>
            </div>
            {!pick && found.length > 0 && list(found)}
            {pick && <div style={{ marginTop: 6, fontSize: 13 }}><b>{pick.label}</b> <button type="button" onClick={() => setPick(null)} style={{ border: 0, background: "none", color: SUB, cursor: "pointer" }}>바꾸기</button></div>}
          </>)}
        </div>
        {anaBox()}
        <div>{head(n++, "기사 스타일")}
          <div style={{ display: "flex", gap: 5 }}>{KINDS.map((k) => <button key={k.id} type="button" onClick={() => setKind(k.id)} title={k.prompt} style={chip(kind === k.id)}>{k.name}</button>)}</div>
        </div>
        <div>{head(n++, <>문체 {dim("(선택)")}</>)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {TONES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTone(tone === t.id ? "" : t.id)} title={t.prompt}
                style={{ ...chip(tone === t.id), height: "auto", padding: "7px 9px", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                <span>{t.name}</span><span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{t.desc}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: SUB, marginRight: 3 }}>제목</span>
            {HOOKS.map((h) => <button key={h.id} type="button" onClick={() => setHook(hook === h.id ? "" : h.id)} title={h.prompt} style={{ ...chip(hook === h.id), height: 28, padding: "0 9px", fontSize: 12.5 }}>{h.name}</button>)}
          </div>
        </div>
        <div>{head(n++, "분량")}
          <div style={{ display: "flex", gap: 5 }}>{LENGTHS.map((l) => <button key={l.id} type="button" onClick={() => setLen(l.id)} style={{ ...chip(len === l.id), height: 28, padding: "0 12px", fontSize: 12.5 }}>{l.name}</button>)}</div>
          <div style={{ fontSize: 12, color: DIM, marginTop: 5 }}>{LENGTHS.find((l) => l.id === len)?.name} · {LENGTHS.find((l) => l.id === len)?.chars}</div>
        </div>
        <div>{head(n++, <>더 할 말 {dim("(선택)")}</>)}
          <textarea value={more} onChange={(e) => setMore(e.target.value)} rows={3} placeholder="예: 신혼부부 관점으로, 역세권 강조" style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical" }} />
        </div>
      </div>
      <div style={{ padding: "14px 18px", borderTop: `1px solid ${LINE}` }}>
        <button type="button" onClick={() => void write()} disabled={Boolean(busy) || !ready}
          style={{ width: "100%", height: 48, borderRadius: 6, border: 0, background: busy || anaBusy ? NAVY : !ready ? "#9aa6b8" : "#2563eb", color: "#fff", fontSize: 15.5, fontWeight: 800, cursor: busy || !ready ? "default" : "pointer", fontFamily: "inherit" }}>
          {busy ? <>AI가 쓰는 중<Dots /></> : anaBusy ? <>분석하는 중<Dots /></> : "✨ AI 기사 초안 작성"}
        </button>
        <div style={{ marginTop: 7, fontSize: 12, textAlign: "center", color: err ? "#dc2626" : busy ? NAVY : done ? "#16a34a" : DIM, fontWeight: err || busy || done ? 700 : 500, lineHeight: 1.5 }}>
          {err || busy || (done ? "기사 칸에 채웠어요. 고쳐서 등록하세요." : anaBusy ? "분석이 끝나면 쓸 수 있어요" : !ready && src !== "topic" ? "재료를 고르면 저절로 분석해요" : "분석한 재료로 써요 · 문체를 바꿔 여러 번 다시 써도 돼요")}
        </div>
      </div>
    </div>
  );
}
