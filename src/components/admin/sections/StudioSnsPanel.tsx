"use client";

import React, { useEffect, useRef, useState } from "react";
import ChannelButton from "./ChannelButton";
import StudioReviseBar from "./StudioReviseBar";
import { useStudioWriter } from "./useStudioWriter";

/**
 * SNS뉴스발행 — 인스타그램·스레드·페이스북 탭 (공실스튜디오)
 *
 * - [ChatGPT로 SNS 글 쓰기] 한 번에 세 채널 글을 함께 쓴다 (크롬 확장 sns.js 와 같은 프롬프트, 이용 횟수 SNS 1회).
 * - 채널마다 그 채널에 올라갈 모양으로 보여 주고 고친다: 사진 순서·빼기·다시 넣기, 글(스레드는 글마다), 해시태그.
 * - 글 끝 링크·매물 정보 출처·해시태그는 앱이 붙인다 (미리보기 아래 "올라갈 전체 글").
 * - 1차: [글 복사] · [사진·글 폴더로 저장](채널 비율로 자른 사진) · [채널 열기]. 자동 채우기는 다음 단계.
 * - [수정 요청]: 이 채널 글만 처음 쓴 ChatGPT 대화에 이어 보내 고친다 (확장과 같다).
 */

export type SnsMedia = { id: string; kind: string; caption: string; ai: boolean; thumb: string | null };
type Post = { body?: string; hashtags?: string[]; posts?: string[]; topic?: string };
export type SnsChannelData = { post: Post | null; composed: { posts: string[]; text: string }; media: SnsMedia[]; aiNote: string };
export type SnsData = { vacancyId: string; channels: Record<string, SnsChannelData>; pool: SnsMedia[]; writtenAt: string };
export type ChannelInfo = { id: string; label: string; homeUrl: string; ratioText: string; maxChars: number; maxMedia: number; maxTags: number };

type Bridge = {
  openInBrowser?: (url: string) => Promise<void>;
  sns: {
    write: (opts: { vacancyId: string; tone?: Record<string, string> }) => Promise<SnsData>;
    save: (opts: { vacancyId: string; channel: string; post?: Post; mediaIds?: string[] }) => Promise<SnsChannelData>;
    revise: (opts: { vacancyId: string; channel: string; request: string }) => Promise<SnsChannelData>;
    exportChannel: (opts: { vacancyId: string; channel: string }) => Promise<{ folder: string; saved: number; total: number }>;
    fillByHelper?: (opts: { vacancyId: string; channel: string }) => Promise<{ ok: boolean; partial?: boolean; note?: string; error?: string }>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
const bridge = () => (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null;
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

const KIND_LABEL: Record<string, string> = { photo: "등록 사진", proof: "공실열람 검증", map: "지도", roadview: "로드뷰", upload: "내 사진", ai: "AI 이미지", capture: "기사 화면" };
const RATIO: Record<string, string> = { instagram: "4 / 5", facebook: "1 / 1", threads: "auto" };

/** SNS 문체 — 세 채널 같이 (2026-10-23 사장님 회의). 앱 sns-writer.js TONES 와 같은 id */
export const SNS_TONES = [
  { id: "polite", label: "공손체", brief: "존댓말로 차분하게 안내" },
  { id: "casual", label: "반말체", brief: "친구에게 말하듯 편하게" },
  { id: "hook", label: "후킹체", brief: "첫 줄에서 궁금하게, 짧게 끊어서" },
  { id: "expert", label: "전문가체", brief: "입지·가격·활용도를 분석하듯" },
  { id: "story", label: "스토리체", brief: "현장을 다녀온 듯 이야기로" },
  { id: "short", label: "요약체", brief: "핵심만 3~5줄" },
];

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };

export default function StudioSnsPanel({ theme, channel, info, vacancyId, data, onData, onUsed, oneShot = false, tones = {}, onTone }: {
  theme: Theme; channel: string; info: ChannelInfo; vacancyId: string; data: SnsData | null; onData: (d: SnsData) => void; onUsed: () => void;
  /** 한 번에 쓰기 — 이 탭은 문체만 고르고, 쓴 뒤에만 [이 글만 다시 쓰기] */
  /** 채널마다 문체 { instagram, threads, facebook } — 이 탭에서는 이 채널 것만 고른다 */
  oneShot?: boolean; tones?: Record<string, string>; onTone?: (t: string) => void;
}) {
  const tone = tones[channel] || "polite";
  const aiName = useStudioWriter(); // 고른 글쓰기 AI (ChatGPT · Gemini)
  const [writing, setWriting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const ch = data?.channels[channel] || null;

  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [threadPosts, setThreadPosts] = useState<string[]>([]);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const loadedFrom = useRef("");

  // 채널을 바꾸거나 새로 쓰면 편집칸을 그 글로 채운다
  useEffect(() => {
    const key = `${channel}:${data?.writtenAt || ""}`;
    if (!ch || loadedFrom.current === key) return;
    loadedFrom.current = key;
    const tagLine = (ch.post?.hashtags || []).map((t) => `#${t}`).join(" ");
    // 인스타그램은 캡션처럼 본문 바로 아래에 해시태그를 함께 보여 준다
    setBody(channel === "instagram" && tagLine ? `${ch.post?.body || ""}\n\n${tagLine}` : ch.post?.body || "");
    setTags((ch.post?.hashtags || []).join(" "));
    setThreadPosts(ch.post?.posts || []);
    setMediaIds(ch.media.map((m) => m.id));
  }, [channel, ch, data?.writtenAt]);

  const persist = async (patch: { post?: Post; mediaIds?: string[] }) => {
    const b = bridge();
    if (!b || !data) return;
    try {
      const updated = await b.sns.save({ vacancyId, channel, ...patch });
      onData({ ...data, channels: { ...data.channels, [channel]: updated } });
    } catch (e) {
      setError(cleanErr(e));
    }
  };
  const currentPost = (): Post => {
    if (channel === "threads") return { posts: threadPosts.map((p) => p.trim()).filter(Boolean), topic: ch?.post?.topic || "" };
    if (channel === "instagram") {
      // 한 칸에서 # 으로 시작하는 단어는 해시태그로, 나머지는 본문으로 나눈다
      const tagsFound = Array.from(body.matchAll(/#([^\s#]+)/g)).map((m) => m[1]);
      const text = body.split("\n").filter((line) => !/^(\s*#[^\s#]+)+\s*$/.test(line)).join("\n").trim();
      return { body: text, hashtags: tagsFound };
    }
    return { body: body.trim(), hashtags: tags.split(/[\s,]+/).map((t) => t.replace(/^#+/, "").trim()).filter(Boolean) };
  };

  const write = async () => {
    const b = bridge();
    if (!b) return;
    setWriting(true);
    setError("");
    setNote("");
    const off = b.sns.onProgress(setProgress);
    try {
      onData(await b.sns.write({ vacancyId, tone: tones }));
    } catch (e) {
      setError(cleanErr(e));
    } finally {
      off();
      setProgress("");
      setWriting(false);
      onUsed();
    }
  };

  /* [수정 요청] — 고친 글을 먼저 저장하고, 이 채널 글만 같은 대화에서 고쳐 받는다 */
  const revise = async (request: string, onProgress: (t: string) => void) => {
    const b = bridge();
    if (!b || !data) return;
    await b.sns.save({ vacancyId, channel, post: currentPost() });
    const off = b.sns.onProgress(onProgress);
    try {
      const updated = await b.sns.revise({ vacancyId, channel, request });
      loadedFrom.current = ""; // 편집칸을 고친 글로 다시 채운다
      onData({ ...data, channels: { ...data.channels, [channel]: updated } });
    } finally {
      off();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ch?.composed.text || "");
      setNote("글을 복사했습니다. 채널 글쓰기 칸에 붙여 넣으세요.");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("복사하지 못했습니다.");
    }
  };
  const exportFolder = async () => {
    const b = bridge();
    if (!b) return;
    setError("");
    setNote("사진을 채널 비율로 맞추는 중…");
    try {
      const r = await b.sns.exportChannel({ vacancyId, channel });
      setNote(`사진 ${r.saved}장과 글을 저장하고 폴더를 열었습니다: ${r.folder}`);
    } catch (e) {
      setNote("");
      setError(cleanErr(e));
    }
  };
  /* [도우미로 채우기] — 평소 크롬 + 공실스튜디오 도우미 확장 (2026-10-23 사장님) */
  const [helping, setHelping] = useState(false);
  const [helpMsg, setHelpMsg] = useState("");
  const fillHelper = async () => {
    const b = bridge();
    if (!b?.sns.fillByHelper) return;
    await b.sns.save({ vacancyId, channel, post: currentPost() }).catch(() => {}); // 고친 글 먼저
    setHelping(true);
    setHelpMsg("");
    setError("");
    const off = b.sns.onProgress(setHelpMsg);
    try {
      const r = await b.sns.fillByHelper({ vacancyId, channel });
      setHelpMsg(r.note || (r.ok ? `크롬 창의 ${info.label}에 넣었어요. 도우미 상자를 보고 확인한 뒤 [공유하기]·[게시]를 직접 눌러 주세요.` : r.error || "도우미가 다 채우지 못했어요. 크롬 창의 도우미 상자 단추로 이어서 해 주세요."));
    } catch (e) {
      setHelpMsg(cleanErr(e).replace(/^HELPER_NONE:s*/, ""));
    } finally {
      off();
      setHelping(false);
    }
  };
  const openChannel = () => {
    const b = bridge();
    if (b?.openInBrowser) b.openInBrowser(info.homeUrl);
    else window.open(info.homeUrl, "_blank", "noopener");
  };

  const moveMedia = (id: string, dir: -1 | 1) => {
    const i = mediaIds.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= mediaIds.length) return;
    const next = mediaIds.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setMediaIds(next);
    persist({ mediaIds: next });
  };
  const removeMedia = (id: string) => {
    const next = mediaIds.filter((x) => x !== id);
    setMediaIds(next);
    persist({ mediaIds: next });
  };
  const addMedia = (id: string) => {
    if (mediaIds.length >= info.maxMedia) return setError(`${info.label}은(는) 사진을 ${info.maxMedia}장까지 올릴 수 있습니다.`);
    const next = [...mediaIds, id];
    setMediaIds(next);
    persist({ mediaIds: next });
  };

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const btn = (primary = false): React.CSSProperties => ({
    padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
    border: primary ? 0 : `1px solid ${theme.border}`, background: primary ? "#1a3a6b" : theme.cardBg, color: primary ? "#fff" : theme.textPrimary,
  });
  const area: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14.5, lineHeight: 1.75, color: theme.textPrimary, background: theme.cardBg, fontFamily: "inherit", resize: "vertical" };

  const byId = new Map((data?.pool || []).map((m) => [m.id, m]));
  const chosen = mediaIds.map((id) => byId.get(id)).filter((m): m is SnsMedia => Boolean(m));
  const rest = (data?.pool || []).filter((m) => !mediaIds.includes(m.id));
  const bodyLen = channel === "threads" ? 0 : (ch?.composed.text || "").length;

  return (
    <div>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{oneShot ? `${info.label} 문체` : `${info.label} 글 쓰기`}</div>
            <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4, lineHeight: 1.6 }}>
              인스타그램·스레드·페이스북 글을 {vacancyId.startsWith("col-") ? "뉴스칼럼 기사·원문을 바탕으로" : "처음 분석·캡처한 공실 정보로"} 함께 씁니다 (SNS 1회). 문체는 채널마다 따로 골라요 (이 탭은 {info.label}).
            </div>
          </div>
          {oneShot ? (data || writing) && (
            <button onClick={write} disabled={writing}
              style={{ padding: "7px 12px", background: "transparent", color: writing ? theme.textSecondary : "#16a34a", border: "1px solid #16a34a", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: writing ? "default" : "pointer" }}>
              {writing ? `${aiName}가 쓰는 중…` : "이 글만 다시 쓰기 (세 채널)"}
            </button>
          ) : (
            <button onClick={write} disabled={writing} style={{ ...btn(true), background: writing ? "#94a3b8" : "#16a34a", cursor: writing ? "default" : "pointer" }}>
              {writing ? `${aiName}가 쓰는 중…` : data ? "세 채널 다시 쓰기" : `${aiName}로 SNS 글 쓰기`}
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginTop: 14 }}>
          {SNS_TONES.map((t) => (
            <button key={t.id} type="button" onClick={() => onTone?.(t.id)} disabled={!onTone}
              style={{ textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: onTone ? "pointer" : "default", color: theme.textPrimary,
                border: `1px solid ${tone === t.id ? "#1a3a6b" : theme.border}`, background: tone === t.id ? "rgba(26,58,107,0.08)" : "transparent" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{t.label}{tone === t.id ? " ✓" : ""}</div>
              <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{t.brief}</div>
            </button>
          ))}
        </div>
        {progress && <div style={{ marginTop: 12, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{progress}</div>}
        {error && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{error}</div>}
      </div>

      {ch && ch.post && (
        <div style={card}>
          {/* 사진 */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>
              사진 <span style={{ color: "#2563eb" }}>{chosen.length}</span>/{info.maxMedia}
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginLeft: 8 }}>{info.ratioText} · 첫 장이 대표</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {chosen.map((m, i) => (
              <div key={m.id} className="sns-ph" style={{ position: "relative", flex: "0 0 150px", borderRadius: 10, overflow: "hidden", boxShadow: i === 0 ? "0 0 0 2px #1a3a6b" : `0 0 0 1px ${theme.border}`, background: "#111" }}>
                <div style={{ aspectRatio: RATIO[channel] === "auto" ? "1 / 1" : RATIO[channel], background: "#e5e7eb" }}>
                  {m.thumb && <img src={m.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: ["proof", "map", "roadview"].includes(m.kind) || RATIO[channel] === "auto" ? "contain" : "cover", display: "block", background: "#fff" }} />}
                </div>
                <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: i === 0 ? "#1a3a6b" : "rgba(17,24,39,0.6)", color: "#fff" }}>
                  {i === 0 ? "대표" : KIND_LABEL[m.kind] || m.kind}
                </span>
                <div className="sns-ph-tools">
                  <button onClick={() => moveMedia(m.id, -1)} title="앞으로">←</button>
                  <button onClick={() => moveMedia(m.id, 1)} title="뒤로">→</button>
                  <button onClick={() => removeMedia(m.id)} title="빼기" className="danger">✕</button>
                </div>
              </div>
            ))}
          </div>
          {rest.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: theme.textSecondary }}>뺀 사진 다시 넣기</span>
              {rest.map((m) => (
                <button key={m.id} onClick={() => addMedia(m.id)} title={KIND_LABEL[m.kind] || m.kind}
                  style={{ width: 44, height: 44, padding: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}`, cursor: "pointer", background: "#e5e7eb", position: "relative" }}>
                  {m.thumb && <img src={m.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.75 }} />}
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>+</span>
                </button>
              ))}
            </div>
          )}
          {ch.aiNote && <div style={{ marginTop: 10, fontSize: 12.5, color: "#b45309" }}>{ch.aiNote}</div>}

          {/* 글 */}
          <div style={{ marginTop: 20, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>글</span>
            <button onClick={copy} title="올라갈 전체 글 복사"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: copied ? "#16a34a" : theme.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
              )}
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          {channel === "threads" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {threadPosts.map((p, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.textSecondary, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>{i === 0 ? "첫 글" : `이어 쓰기 ${i}`}</span>
                    <span style={{ color: p.length > info.maxChars ? "#c53030" : theme.textSecondary }}>{p.length}/{info.maxChars}</span>
                  </div>
                  <textarea value={p} rows={4} style={area}
                    onChange={(e) => setThreadPosts((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                    onBlur={() => persist({ post: currentPost() })} />
                </div>
              ))}
            </div>
          ) : (
            <>
              <textarea value={body} rows={channel === "instagram" ? 12 : 8} style={area} onChange={(e) => setBody(e.target.value)} onBlur={() => persist({ post: currentPost() })} />
              {channel === "instagram" ? (
                <div style={{ marginTop: 6, fontSize: 12, color: theme.textSecondary }}>본문 아래 #으로 시작하는 단어가 해시태그입니다 (최대 {info.maxTags}개).</div>
              ) : (
                <>
                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: theme.textSecondary }}>해시태그 (띄어 쓰기로 구분, 최대 {info.maxTags}개)</div>
                  <input value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => persist({ post: currentPost() })}
                    style={{ ...area, padding: "9px 12px", fontSize: 13.5, resize: undefined }} />
                </>
              )}
            </>
          )}

          {/* 올라갈 전체 글 */}
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: theme.textSecondary }}>
              올라갈 전체 글 보기 (링크·{vacancyId.startsWith("col-") ? "출처" : "매물 정보 출처"}·해시태그 포함){channel !== "threads" && info.maxChars ? ` · ${bodyLen}/${info.maxChars}자` : ""}
            </summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "keep-all", margin: "10px 0 0", padding: "14px 16px", borderRadius: 10, background: theme.bg || "#f6f8fa", fontSize: 13.5, lineHeight: 1.7, color: theme.textPrimary, fontFamily: "inherit" }}>
              {ch.composed.text}
            </pre>
          </details>

          <StudioReviseBar theme={theme} label={`${info.label} 글`} onRevise={revise}
            examples={channel === "threads" ? "첫 글을 더 짧게, 질문을 바꿔 줘" : channel === "instagram" ? "이모지를 줄이고 훅을 더 강하게" : "첫 문단을 더 짧게, 해시태그를 3개로"} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            <button onClick={copy} style={btn()}>글 복사</button>
            <button onClick={exportFolder} style={btn()}>사진·글 폴더로 저장</button>
            <ChannelButton channel={channel} label={`${info.label} 열기`} onClick={openChannel} />
            {/* [채널 열기] 바로 옆 · 블로그 [네이버 블로그에 채우기]와 같은 남색 (2026-10-23 사장님) */}
            {bridge()?.sns.fillByHelper && (
              <button onClick={() => void fillHelper()} disabled={helping} title="평소 크롬에 이 채널을 열고 공실스튜디오 도우미(크롬 확장)가 사진·글을 넣어요"
                style={{ ...btn(true), background: helping ? "#94a3b8" : "#1a3a6b" }}>{helping ? "도우미가 채우는 중…" : `도우미로 ${info.label}에 채우기`}</button>
            )}
          </div>
          {helpMsg && <div style={{ marginTop: 10, fontSize: 13, color: /못|없|응답/.test(helpMsg) ? "#c2410c" : (theme.darkMode ? "#93c5fd" : "#1a3a6b"), fontWeight: 600, lineHeight: 1.6 }}>{helpMsg}</div>}
          {note && <div style={{ marginTop: 10, fontSize: 13, color: "#16a34a", lineHeight: 1.6, wordBreak: "break-all" }}>{note}</div>}
          <div style={{ marginTop: 10, fontSize: 12, color: theme.textSecondary, lineHeight: 1.6 }}>
            [도우미로 채우기]는 평소 크롬에 {info.label}을(를) 열고 사진·글을 넣어요 ([공유하기]·[게시]는 직접). 도우미가 없으면 [글 복사]·[사진·글 폴더로 저장]으로 직접 올리세요.
          </div>
        </div>
      )}

      <style>{`
        .sns-ph .sns-ph-tools{position:absolute;right:6px;bottom:6px;display:flex;gap:2px;padding:2px;border-radius:999px;background:rgba(255,255,255,0.92);box-shadow:0 2px 8px rgba(0,0,0,0.18);opacity:0;transition:opacity .15s}
        .sns-ph:hover .sns-ph-tools{opacity:1}
        .sns-ph-tools button{width:26px;height:26px;border:0;border-radius:999px;background:transparent;cursor:pointer;font-size:12px;color:#1f2937}
        .sns-ph-tools button:hover{background:#eef2f7}
        .sns-ph-tools button.danger:hover{background:#fee2e2;color:#dc2626}
      `}</style>
    </div>
  );
}
