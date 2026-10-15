"use client";

import React, { useEffect, useState } from "react";
import StudioBlogEditor, { type BlogDraft } from "./StudioBlogEditor";

/**
 * 뉴스·SNS발행 — 공실뉴스 기사 탭 (맨 앞)
 *
 * - 분석·캡처한 사진(등록 사진 + 캡처 3장)과 매물 정보로, 회원 ChatGPT 가 크롬 확장과 같은 기사 프롬프트로 쓴다.
 *   (뉴스기사형·단락별 요약, 분량 3단계. 경매·공매 물건이면 경매용)
 * - 블로그와 같은 미리보기 편집기로 다듬는다 (제목·부제 3줄·본문·키워드·사진).
 * - [기사쓰기 화면으로 보내기] → 기사등록의 기사쓰기 화면이 초안을 받아 제목·부제·본문·사진·키워드를 채운다.
 *   [기사 등록]은 회원이 누르고, 기사 한도·검토는 지금과 같다.
 * - 기사를 먼저 쓰면 블로그·SNS 가 이 기사를 바탕으로 쓴다.
 */

type Option = { id: string; label: string; brief?: string; chars?: string };
type Bridge = {
  article: {
    options: (vacancyId: string) => Promise<{ kinds: Option[]; lengths: Option[] }>;
    write: (opts: { vacancyId: string; kind: string; length: string }) => Promise<BlogDraft>;
  };
  blog: { onProgress: (fn: (t: string) => void) => () => void };
};
const bridge = () => (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null;
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function StudioArticlePanel({ theme, vacancyId, article, onArticle, onSend }: {
  theme: Theme; vacancyId: string; article: BlogDraft | null; onArticle: (a: BlogDraft) => void; onSend: () => void;
}) {
  const [opts, setOpts] = useState<{ kinds: Option[]; lengths: Option[] } | null>(null);
  const [kind, setKind] = useState(article?.style || "news");
  const [length, setLength] = useState(article?.length || "normal");
  const [writing, setWriting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    bridge()?.article.options(vacancyId).then(setOpts).catch(() => {});
  }, [vacancyId]);

  const write = async () => {
    const b = bridge();
    if (!b) return;
    setWriting(true);
    setError("");
    const off = b.blog.onProgress(setProgress);
    try {
      onArticle({ ...(await b.article.write({ vacancyId, kind, length })), doc: "article" });
    } catch (e) {
      setError(cleanErr(e));
    } finally {
      off();
      setProgress("");
      setWriting(false);
    }
  };

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const chip = (on: boolean): React.CSSProperties => ({
    textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", color: theme.textPrimary,
    border: `1px solid ${on ? "#1a3a6b" : theme.border}`, background: on ? "rgba(26,58,107,0.08)" : "transparent",
  });

  return (
    <div>
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 12 }}>공실뉴스 기사 쓰기</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>기사 스타일</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, marginBottom: 14 }}>
          {(opts?.kinds || []).map((k) => (
            <button key={k.id} onClick={() => setKind(k.id)} style={chip(kind === k.id)}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{k.label}</div>
              {k.brief && <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 3, lineHeight: 1.5 }}>{k.brief}</div>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginRight: 4 }}>분량</span>
          {(opts?.lengths || []).map((l) => (
            <button key={l.id} onClick={() => setLength(l.id)}
              style={{ padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 700,
                border: `1px solid ${length === l.id ? "#1a3a6b" : theme.border}`, background: length === l.id ? "#1a3a6b" : "transparent", color: length === l.id ? "#fff" : theme.textPrimary }}>
              {l.label} · {l.chars}
            </button>
          ))}
          <button onClick={write} disabled={writing}
            style={{ marginLeft: "auto", padding: "10px 18px", background: writing ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: writing ? "default" : "pointer" }}>
            {writing ? "ChatGPT가 쓰는 중…" : article ? "다시 쓰기" : "ChatGPT로 기사 쓰기"}
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>기사를 먼저 쓰면 블로그·SNS가 이 기사를 바탕으로 씁니다. 기사 한도는 기사 등록할 때 셉니다.</div>
        {progress && <div style={{ marginTop: 12, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{progress}</div>}
        {error && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{error}</div>}

        {article && <StudioBlogEditor key={`a-${article.vacancyId}-${article.title}`} theme={theme} initial={{ ...article, doc: "article" }} />}
      </div>

      {article && (
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260, fontSize: 13.5, color: theme.textSecondary, lineHeight: 1.6 }}>
            기사쓰기 화면에 제목·부제·본문·사진 {article.media.length}장·키워드가 채워집니다. 섹션을 확인하고 <b>[기사 등록]</b>을 눌러 주세요.
          </div>
          <button onClick={onSend}
            style={{ padding: "11px 20px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            기사쓰기 화면으로 보내기
          </button>
        </div>
      )}
    </div>
  );
}
