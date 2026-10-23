"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudioBlogEditor, { type BlogDraft } from "./StudioBlogEditor";
import StudioSnsPanel, { type SnsData, type ChannelInfo } from "./StudioSnsPanel";
import ChannelButton from "./ChannelButton";
import StudioArticlePanel from "./StudioArticlePanel";
import StudioYoutubePanel from "./StudioYoutubePanel";
import { useStudioWriter } from "./useStudioWriter";

/**
 * 뉴스·SNS발행의 채널 탭 — 공실뉴스 기사 · 네이버 블로그 · 인스타그램 · 스레드 · 페이스북 · 유튜브 대본
 *
 * 공실뉴스(공실 하나)와 뉴스칼럼(소재 하나)이 함께 쓴다. workId 는 공실 ID 또는 칼럼 번호("col-…")이고,
 * 앱이 번호를 보고 알맞은 프롬프트(매물용·뉴스메이커)로 쓴다. 화면은 같다.
 *  - 블로그 3단계 쓰기(문체·글자 수) → 미리보기 편집기, 4단계 네이버 블로그 채우기(디자인 4종, 발행은 회원이)
 *  - 공실은 글 끝에 매물 정보 출처(표시·광고 필수 정보), 칼럼은 [참고 자료](원문 출처)가 붙는다.
 */

type BlogStyles = { saleKind?: string; styles: { id: string; label: string; fit: string; titleExample: string; design?: string }[]; lengths: { id: string; label: string; chars: string }[] };
type Bridge = {
  ai: { connect: (id: string) => Promise<{ ok: boolean }>; finishLogin: () => Promise<void> };
  naver: {
    designs: () => Promise<{ id: string; label: string; hint: string }[]>;
    fill: (opts: { vacancyId: string; design: string }) => Promise<{ ok: boolean; imagesInserted: number; imagesTotal: number; design: string; tags: string[] }>;
    openMyBlog: () => Promise<unknown>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
  sns: { channels: () => Promise<ChannelInfo[]>; get: (vacancyId: string) => Promise<SnsData | null> };
  youtube: { get: (vacancyId: string) => Promise<unknown> };
  blog: {
    styles: (vacancyId?: string) => Promise<BlogStyles>;
    write: (opts: { vacancyId: string; style: string; length: string }) => Promise<BlogDraft>;
    get: (vacancyId: string, doc?: string) => Promise<BlogDraft | null>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null) : null);
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };

export default function StudioChannelTabs({ theme, workId, kind, tab, onTab, onUsed }: {
  theme: Theme;
  workId: string;
  kind: "gongsil" | "column" | "sim"; // sim = 인테리어·리모델링 시뮬레이션 결과표
  tab: string;
  onTab: (id: string) => void;
  onUsed: () => void;
}) {
  const aiName = useStudioWriter(); // 고른 글쓰기 AI (ChatGPT · Gemini)
  const router = useRouter();
  const column = kind === "column";
  const [article, setArticle] = useState<BlogDraft | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [snsData, setSnsData] = useState<SnsData | null>(null);
  const [hasYoutube, setHasYoutube] = useState(false);
  const [blogOpts, setBlogOpts] = useState<BlogStyles | null>(null);
  const [style, setStyle] = useState("");
  const [length, setLength] = useState("normal");
  const [writing, setWriting] = useState(false);
  const [blogProgress, setBlogProgress] = useState("");
  const [blogError, setBlogError] = useState("");
  const [blog, setBlog] = useState<BlogDraft | null>(null);
  const [designs, setDesigns] = useState<{ id: string; label: string; hint: string }[]>([]);
  const [design, setDesign] = useState("");
  const [filling, setFilling] = useState(false);
  const [naverProgress, setNaverProgress] = useState("");
  const [naverError, setNaverError] = useState("");
  const [naverLogin, setNaverLogin] = useState<"" | "need" | "open">("");
  const [naverDone, setNaverDone] = useState<{ imagesInserted: number; imagesTotal: number; tags: string[] } | null>(null);

  // 문체마다 어울리는 디자인 (확장과 같은 짝 — 문체 목록에 함께 온다)
  const designFor = useCallback((id: string, opts = blogOpts) => opts?.styles.find((x) => x.id === id)?.design || "basic", [blogOpts]);

  /* 써 둔 기사·블로그·SNS 를 불러온다 (새로 골랐을 때·돌아왔을 때 공용) */
  useEffect(() => {
    const b = bridge();
    if (!b) return;
    let alive = true;
    (async () => {
      b.naver.designs().then((d) => alive && setDesigns(d)).catch(() => {});
      b.sns.channels().then((c) => alive && setChannels(c)).catch(() => {});
      const opts = await b.blog.styles(workId); // 경매·공매면 경매용, 칼럼이면 뉴스메이커 문체
      if (!alive) return;
      setBlogOpts(opts);
      setStyle(opts.styles[0]?.id || "");
      setSnsData(await b.sns.get(workId).catch(() => null));
      setHasYoutube(Boolean(await b.youtube.get(workId).catch(() => null)));
      const prevArticle = await b.blog.get(workId, "article").catch(() => null);
      setArticle(prevArticle ? { ...prevArticle, doc: "article" } : null);
      const prev = await b.blog.get(workId).catch(() => null);
      if (!alive) return;
      setBlog(prev);
      if (prev) {
        setStyle(prev.style);
        setLength(prev.length);
        setDesign(designFor(prev.style, opts));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId]);

  // 탭을 옮겨 오면 PC에 저장된 최신 글로 다시 그린다 (미리보기에서 고친 것·수정 요청 반영)
  const firstTab = React.useRef(true);
  useEffect(() => {
    if (firstTab.current) {
      firstTab.current = false;
      return;
    }
    const b = bridge();
    if (!b || (tab !== "article" && tab !== "blog")) return;
    if (tab === "article") b.blog.get(workId, "article").then((a) => a && setArticle({ ...a, doc: "article" })).catch(() => {});
    else b.blog.get(workId).then((d) => d && setBlog(d)).catch(() => {});
  }, [tab, workId]);

  const writeBlog = async () => {
    const b = bridge();
    if (!b) return;
    setWriting(true);
    setBlogError("");
    setBlog(null);
    setNaverDone(null);
    const off = b.blog.onProgress(setBlogProgress);
    try {
      setBlog(await b.blog.write({ vacancyId: workId, style, length }));
      setDesign(designFor(style));
    } catch (e) {
      setBlogError(cleanErr(e));
    } finally {
      off();
      setBlogProgress("");
      setWriting(false);
      onUsed();
    }
  };

  const fillNaver = async () => {
    const b = bridge();
    if (!b || !blog) return;
    setFilling(true);
    setNaverError("");
    setNaverDone(null);
    const off = b.naver.onProgress(setNaverProgress);
    try {
      setNaverDone(await b.naver.fill({ vacancyId: workId, design: design || "basic" }));
    } catch (e) {
      const msg = cleanErr(e);
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
      setNaverError(cleanErr(e));
    }
  };

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const stepTitle = (n: number, t: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{t}</h3>
    </div>
  );
  // 칼럼은 기사가 있어야 블로그·SNS 를 쓴다 (뉴스메이커와 같다: 기사 → 블로그·SNS)
  const needArticle = kind !== "gongsil" && !article; // 칼럼·시뮬레이션은 기사를 먼저
  const firstStep = column ? 2 : 3;

  return (
    <>
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${theme.border}`, marginBottom: 16, overflowX: "auto", scrollbarWidth: "none" }}>
        {[{ id: "article", label: "공실뉴스 기사", done: Boolean(article) }, { id: "blog", label: "네이버 블로그", done: Boolean(blog) }, ...channels.map((c) => ({ id: c.id, label: c.label, done: Boolean(snsData?.channels[c.id]?.post) })), { id: "youtube", label: "유튜브 대본", done: hasYoutube }].map((t) => (
          <button key={t.id} onClick={() => onTab(t.id)}
            style={{ padding: "11px 18px", border: 0, background: "transparent", cursor: "pointer", fontSize: 14.5, whiteSpace: "nowrap",
              fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.textSecondary,
              borderBottom: `3px solid ${tab === t.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : "transparent"}`, marginBottom: -1 }}>
            {t.label}
            {t.done && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: "#16a34a" }}>✓</span>}
          </button>
        ))}
      </div>

      {tab === "article" && (
        <StudioArticlePanel theme={theme} vacancyId={workId} article={article} onArticle={setArticle} column={column}
          onSend={() => router.push(`/realty_admin?menu=article&action=write&studioDraft=${encodeURIComponent(workId)}`)} />
      )}

      {tab === "youtube" && (needArticle
        ? <div style={{ ...card, fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. 대본은 그 기사를 바탕으로 씁니다.</div>
        : <StudioYoutubePanel theme={theme} vacancyId={workId} onUsed={onUsed} onScript={setHasYoutube} />)}

      {channels.some((c) => c.id === tab) && needArticle && (
        <div style={{ ...card, fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. SNS 글은 그 기사를 바탕으로 씁니다.</div>
      )}
      {tab !== "blog" && !needArticle && channels.find((c) => c.id === tab) && (
        <StudioSnsPanel theme={theme} channel={tab} info={channels.find((c) => c.id === tab)!} vacancyId={workId}
          data={snsData} onData={setSnsData} onUsed={onUsed} />
      )}

      {tab === "blog" && (<>
        {/* 블로그 쓰기 */}
        <div style={card}>
          {stepTitle(firstStep, "블로그 쓰기")}
          {needArticle ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 <b>[공실뉴스 기사]</b> 탭에서 기사를 써 주세요. 블로그는 그 기사를 바탕으로 씁니다.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>문체</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
                {(blogOpts?.styles || []).map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)} title={`예: ${s.titleExample}`}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: style === s.id ? "rgba(26,58,107,0.08)" : "transparent",
                      border: `1px solid ${style === s.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.border}`, color: theme.textPrimary }}>
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
                  {writing ? `${aiName}가 쓰는 중…` : blog ? "다시 쓰기" : `${aiName}로 블로그 글 쓰기`}
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>스튜디오 전용 크롬에서 {aiName}가 열려 직접 씁니다. 1~2분 걸립니다.</div>
            </>
          )}
          {blogProgress && <div style={{ marginTop: 12, fontSize: 14, color: (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontWeight: 600 }}>{blogProgress}</div>}
          {blogError && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{blogError}</div>}

          {blog && <StudioBlogEditor key={`${blog.vacancyId}-${blog.version || blog.title}`} theme={theme} initial={blog} />}
        </div>

        {/* 네이버 블로그 채우기 */}
        <div style={{ ...card, opacity: blog ? 1 : 0.6 }}>
          {stepTitle(firstStep + 1, "네이버 블로그 채우기")}
          {!blog ? (
            <div style={{ fontSize: 14, color: theme.textSecondary }}>먼저 블로그 글을 써 주세요.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>블로그 디자인</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
                {designs.map((d) => (
                  <button key={d.id} onClick={() => setDesign(d.id)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: design === d.id ? "rgba(26,58,107,0.08)" : "transparent",
                      border: `1px solid ${design === d.id ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.border}`, color: theme.textPrimary }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 1.5 }}>{d.hint}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: theme.textSecondary, flex: 1, minWidth: 260, lineHeight: 1.6 }}>
                  스튜디오 전용 크롬에 네이버 글쓰기가 열리고 제목·본문·사진 {blog.media.length}장·{column ? "참고 자료(원문 출처)" : kind === "sim" ? "AI 예측 안내·출처" : "매물 정보 출처"}가 채워집니다. <b>[발행]은 소장님이 직접</b> 눌러 주세요. 태그는 발행 창이 열릴 때 자동으로 들어갑니다.
                </div>
                <ChannelButton channel="blog" label="네이버 블로그 바로가기" onClick={() => bridge()?.naver.openMyBlog()} />
                <button onClick={fillNaver} disabled={filling}
                  style={{ padding: "11px 20px", background: filling ? "#94a3b8" : "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: filling ? "default" : "pointer" }}>
                  {filling ? "네이버에 채우는 중…" : "네이버 블로그에 채우기"}
                </button>
              </div>
            </>
          )}
          {naverProgress && <div style={{ marginTop: 12, fontSize: 14, color: (theme.darkMode ? "#ffffff" : "#1a3a6b"), fontWeight: 600 }}>{naverProgress}</div>}
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
                오른쪽에 새로 뜬 &quot;공실스튜디오&quot; 크롬 창에서 네이버에 로그인한 뒤 눌러 주세요. (평소 쓰시는 크롬 창이 아닙니다)
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
    </>
  );
}
