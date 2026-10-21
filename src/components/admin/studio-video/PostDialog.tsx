"use client";

// 완성 영상 SNS 올리기 — 반자동 (2026-10-21 사장님, docs/2026-10-21_studio_sns_upload_plan.md)
//  [내보내기] 완료 → [유튜브에 올리기] [인스타그램에 올리기] → 이 창
//  AI 가 제목·설명(캡션)·해시태그 초안 → 회원이 고침 → [크롬에서 채우기] (파일 첨부·글 채우기) → 회원이 [게시]
//  중개사무소 정보·공실뉴스 링크·출처 줄은 앱이 붙인다 (글 끝)
import React, { useEffect, useState } from "react";
import type { PostChannel, PostDraft, Project } from "./types";
import { errText, videoBridge } from "./types";
import { clipText } from "./timeline";
import { Btn, C, FONT, Icon, Modal, Working, input, label } from "./ui";

/** 채널 픽토그램 — 유튜브(빨간 재생 단추) · 인스타그램(카메라) (2026-10-21 사장님) */
export function ChannelMark({ ch, size = 18 }: { ch: PostChannel; size?: number }) {
  if (ch === "youtube")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
        <rect x="1.5" y="5" width="21" height="14" rx="4" fill="#FF0033" />
        <path d="M10 9v6l5.2-3z" fill="#fff" />
      </svg>
    );
  const id = "igm" + size;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" /><stop offset="0.35" stopColor="#FA7E1E" /><stop offset="0.6" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill={`url(#${id})`} />
      <rect x="6.5" y="6.5" width="11" height="11" rx="5.5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" />
    </svg>
  );
}

// 같은 영상 파일이면 앱을 켠 동안 초안·썸네일을 기억 (창을 닫았다 열어도 다시 쓰지 않게)
const memo = new Map<string, { draft?: PostDraft; thumbs?: Thumb[] }>();
type Thumb = { at: number; plain: { file: string; url: string }; title: { file: string; url: string } | null };
type Vis = "public" | "unlisted" | "private";

export function PostDialog({ project, file, seconds, channel: ch0, onClose }: { project: Project; file: string; seconds: number; channel: PostChannel; onClose: () => void }) {
  const b = videoBridge();
  const post = b?.post;
  const m = memo.get(file) || {};
  const [ch, setCh] = useState<PostChannel>(ch0);
  const [draft, setDraft] = useState<PostDraft | null>(m.draft || null);
  const [ytTitle, setYtTitle] = useState(m.draft?.youtube.title || "");
  const [ytText, setYtText] = useState(m.draft?.youtube.text || "");
  const [igText, setIgText] = useState(m.draft?.instagram.text || "");
  const [vis, setVis] = useState<Vis>("public");
  const [thumbs, setThumbs] = useState<Thumb[] | null>(m.thumbs || null);
  const [useTitle, setUseTitle] = useState(true);
  const [thumbI, setThumbI] = useState(0); // -1 = 내가 고른 그림
  const [mine, setMine] = useState<{ file: string; url: string } | null>(null); // 썸네일 직접 올리기 (2026-10-21 사장님)
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [login, setLogin] = useState<"" | "need" | "open">("");
  const [done, setDone] = useState<{ ch: PostChannel; partial?: string; thumb?: string; vis?: string } | null>(null);
  const [note, setNote] = useState("");
  const shorts = project.ratio === "9:16" || project.ratio === "1:1";
  const lines = project.scenes.flatMap((s) => s.clips).map((c) => clipText(c)).filter((t) => t.trim());
  // AI 그림이 들어간 영상 — 채널의 AI 표시를 켜도록 알린다
  const aiCount = project.scenes.flatMap((s) => s.clips).filter((c) => {
    const a = c.visual ? project.assets[c.visual.asset] : null;
    return a && (a.source === "ai" || /^AI그림_/.test(a.name || ""));
  }).length;

  const listen = () => b?.onProgress((t) => setBusy(t)) || (() => {});
  const writeDraft = async () => {
    if (!post) return;
    setErr("");
    setBusy("글 AI가 쓰는 중…");
    const off = listen();
    try {
      const d = await post.draft({ title: project.name, lines, vacancyId: project.vacancyId, ratio: project.ratio, seconds });
      setDraft(d);
      setYtTitle(d.youtube.title);
      setYtText(d.youtube.text);
      setIgText(d.instagram.text);
      memo.set(file, { ...(memo.get(file) || {}), draft: d });
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };
  const makeThumbs = async (title: string) => {
    if (!post) return;
    setBusy("썸네일 만드는 중…");
    const off = listen();
    try {
      const t = await post.thumbs({ file, title, duration: seconds });
      setThumbs(t);
      setThumbI(0);
      memo.set(file, { ...(memo.get(file) || {}), thumbs: t });
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };
  // 처음 열면 — 글 초안부터 (그다음 유튜브 일반 영상이면 썸네일)
  useEffect(() => {
    if (!draft) void writeDraft();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (draft && ch === "youtube" && !shorts && !thumbs && !busy) void makeThumbs(ytTitle);
  }, [draft, ch]); // eslint-disable-line react-hooks/exhaustive-deps

  const text = ch === "youtube" ? ytText : igText;
  const thumbFile = shorts ? undefined : thumbI === -1 && mine ? mine.file : thumbs && thumbs[thumbI] ? (useTitle && thumbs[thumbI].title ? thumbs[thumbI].title!.file : thumbs[thumbI].plain.file) : undefined;
  const fill = async () => {
    if (!post) return;
    setErr("");
    setDone(null);
    setBusy("크롬을 여는 중…");
    const off = listen();
    try {
      const r = await post.fill({ channel: ch, file, title: ytTitle, text, visibility: ch === "youtube" ? vis : undefined, thumb: ch === "youtube" ? thumbFile : undefined });
      setDone({ ch, partial: r.partial, thumb: r.thumb, vis: r.vis });
      try {
        const log = JSON.parse(localStorage.getItem("gsv:postLog") || "[]");
        localStorage.setItem("gsv:postLog", JSON.stringify([{ at: Date.now(), ch, file, title: ch === "youtube" ? ytTitle : "" }, ...log].slice(0, 200)));
      } catch {}
    } catch (e) {
      const msg = errText(e);
      if (msg.startsWith("LOGIN:")) setLogin("need");
      setErr(msg.replace(/^LOGIN:\s*/, ""));
    } finally {
      off();
      setBusy("");
    }
  };
  /** PC에서 썸네일 그림 고르기 — JPG·PNG */
  const pickMine = async () => {
    if (!b) return;
    setErr("");
    try {
      const items = await b.lib.pick({ kinds: "media" });
      const img = items.find((x) => x.kind === "image" && x.path);
      if (!items.length) return;
      if (!img) return setErr("썸네일은 사진 파일(JPG·PNG)로 골라 주세요.");
      setMine({ file: img.path!, url: img.url });
      setThumbI(-1);
    } catch (e) {
      setErr(errText(e));
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ch === "youtube" ? `${ytTitle}\n\n${ytText}` : igText);
      setNote("글을 복사했어요");
      setTimeout(() => setNote(""), 1800);
    } catch {}
  };
  const name = ch === "youtube" ? "유튜브" : "인스타그램";

  if (!post) {
    return (
      <Modal title="SNS에 올리기" onClose={onClose} width={560}>
        <div style={{ padding: 22, fontSize: 15, lineHeight: 1.7 }}>이 기능은 공실뉴스 스튜디오 앱 0.1.11부터 쓸 수 있어요. 앱을 새로 받아 주세요.</div>
      </Modal>
    );
  }
  const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  return (
    <Modal title="SNS에 올리기" onClose={onClose} width={720}
      footer={<>
        <Btn onClick={copy}><Icon name="copy" size={15} />글 복사</Btn>
        <Btn onClick={() => b?.showFile(file)}><Icon name="folder" size={15} />영상 폴더</Btn>
        <Btn onClick={() => post.open(ch)}><Icon name="open" size={15} />{name} 열기</Btn>
        <span style={{ flex: 1 }} />
        {note && <span style={{ fontSize: 13, color: C.accent }}>{note}</span>}
        <Btn primary onClick={fill} disabled={Boolean(busy) || !draft}><Icon name="export" size={15} />크롬에서 채우기</Btn>
      </>}>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        {([["youtube", shorts ? "유튜브 쇼츠" : "유튜브"], ["instagram", "인스타그램 릴스"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setCh(k); setDone(null); setErr(""); setLogin(""); }}
            style={{ flex: 1, height: 42, border: 0, borderBottom: `2px solid ${ch === k ? C.accent : "transparent"}`, background: "transparent", color: ch === k ? C.text : C.sub, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><ChannelMark ch={k} />{l}</button>
        ))}
      </div>
      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "62vh", overflowY: "auto" }}>
        {busy && <Working title={busy} detail="회원님 AI·크롬에서 하고 있어요." />}
        {!busy && draft && (
          <>
            {ch === "youtube" && (
              <div>
                <div style={{ ...label, marginBottom: 6, display: "flex" }}><span style={{ flex: 1 }}>제목</span><span style={{ color: ytTitle.length > 100 ? C.danger : C.dim, fontWeight: 600 }}>{ytTitle.length}/100</span></div>
                <input value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} style={{ ...input, width: "100%", boxSizing: "border-box", height: 38, fontSize: 15 }} />
              </div>
            )}
            <div>
              <div style={{ ...label, marginBottom: 6 }}>{ch === "youtube" ? "설명" : "문구 (캡션)"} <span style={{ color: C.dim, fontWeight: 600, fontSize: 12.5 }}>· 끝의 공실뉴스 링크·매물 정보 출처는 앱이 붙였어요{draft.tail.hasListing ? "" : " (매물 정보가 없는 영상이라 출처 줄 없음)"}</span></div>
              <textarea value={text} onChange={(e) => (ch === "youtube" ? setYtText(e.target.value) : setIgText(e.target.value))} rows={11}
                style={{ ...input, width: "100%", boxSizing: "border-box", height: "auto", padding: 10, lineHeight: 1.6, resize: "vertical", fontSize: 14 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Btn small onClick={writeDraft}><Icon name="ai" size={14} />글 다시 쓰기</Btn>
              </div>
            </div>
            {ch === "youtube" && (
              <div>
                <div style={{ ...label, marginBottom: 6 }}>공개 범위 <span style={{ color: C.dim, fontWeight: 600, fontSize: 12.5 }}>· 크롬에서 마지막 단계까지 가서 골라 둬요. [게시]는 직접</span></div>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["public", "공개"], ["unlisted", "일부 공개"], ["private", "비공개"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setVis(k)} style={chip(vis === k)}>{l}</button>)}
                </div>
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>{shorts ? "세로·정사각 영상이라 유튜브에서 쇼츠로 올라가요." : "가로 영상이라 일반 영상으로 올라가요."}</div>
              </div>
            )}
            {ch === "youtube" && !shorts && (
              <div>
                <div style={{ ...label, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1 }}>썸네일</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.sub, fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={useTitle} onChange={(e) => setUseTitle(e.target.checked)} style={{ accentColor: C.accent }} />제목 넣기
                  </label>
                  <Btn small onClick={() => makeThumbs(ytTitle)}>제목으로 다시 만들기</Btn>
                  <Btn small primary onClick={pickMine}><Icon name="image" size={14} />PC에서 직접 고르기</Btn>
                </div>
                {thumbs || mine ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {mine && (
                      <button type="button" onClick={() => setThumbI(-1)} title={mine.file} style={{ position: "relative", padding: 0, border: `2px solid ${thumbI === -1 ? C.accent : "transparent"}`, borderRadius: 6, overflow: "hidden", background: "#000", cursor: "pointer", aspectRatio: "16 / 9" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mine.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <span style={{ position: "absolute", left: 4, top: 4, padding: "1px 6px", borderRadius: 3, background: "rgba(0,0,0,.7)", color: "#fff", fontSize: 11.5, fontWeight: 700 }}>내 그림</span>
                      </button>
                    )}
                    {(thumbs || []).map((t, i) => {
                      const src = useTitle && t.title ? t.title.url : t.plain.url;
                      return (
                        <button key={i} type="button" onClick={() => setThumbI(i)} style={{ padding: 0, border: `2px solid ${thumbI === i ? C.accent : "transparent"}`, borderRadius: 6, overflow: "hidden", background: "#000", cursor: "pointer", aspectRatio: "16 / 9" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                      );
                    })}
                  </div>
                ) : <div style={{ fontSize: 13, color: C.dim }}>썸네일을 만들지 못했어요. [제목으로 다시 만들기]를 눌러 주세요.</div>}
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>
                  고른 그림을 크롬에서 썸네일로 넣어요. 직접 만든 그림은 [PC에서 직접 고르기]로 — 유튜브 권장 1280×720 (16:9), 2MB 이하 JPG·PNG. 직접 만든 썸네일은 <b>휴대폰 인증을 한 유튜브 채널</b>만 올릴 수 있어요.
                </div>
              </div>
            )}
            {ch === "instagram" && project.ratio === "16:9" && (
              <div style={{ fontSize: 13, color: "#facc15", lineHeight: 1.6 }}>가로(16:9) 영상이에요. 릴스는 세로 화면이라 위아래가 비어 보일 수 있어요. 위쪽 화면 비율을 [쇼츠·릴스 9:16]으로 바꿔 한 번 더 내보내면 꽉 차요.</div>
            )}
            {aiCount > 0 && (
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line2}` }}>
                AI로 만든 그림이 {aiCount}곳에 들어 있어요. {ch === "youtube" ? "유튜브 세부정보의 \"변경되거나 합성된 콘텐츠\"를 [예]로 골라 주세요." : "인스타그램 고급 설정의 \"AI 정보\" 표시를 켜 주세요."}
              </div>
            )}
          </>
        )}
        {err && <div style={{ fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
        {login === "need" && (
          <div><Btn primary onClick={() => { void post.login(ch); setLogin("open"); }}>{name} 로그인</Btn></div>
        )}
        {login === "open" && (
          <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.accent}`, background: C.accentDim, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 240, fontSize: 14, lineHeight: 1.6 }}>새로 뜬 &quot;공실뉴스 스튜디오&quot; 크롬 창에서 {name}에 로그인한 뒤 눌러 주세요. (평소 쓰시는 크롬 창이 아니에요)</span>
            <Btn primary onClick={() => { void post.finishLogin(); setLogin(""); setErr(""); }}>로그인 다 했어요</Btn>
          </div>
        )}
        {done && (
          <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #16a34a", background: "rgba(22,163,74,0.12)", fontSize: 14, lineHeight: 1.7 }}>
            {name} 올리기 화면에 영상과 글을 넣었어요. 크롬 창에서 내용을 확인하고 <b>{done.ch === "youtube" ? "[게시]" : "[공유하기]"}</b>를 직접 눌러 주세요.
            {done.partial && <div style={{ color: "#facc15", marginTop: 4 }}>{done.partial}</div>}
            {done.ch === "youtube" && done.thumb === "verify" && (
              <div style={{ color: "#facc15", marginTop: 6 }}>
                썸네일은 넣지 못했어요 — 이 유튜브 채널은 <b>전화번호 인증</b>이 안 되어 있어서, 유튜브가 직접 만든 썸네일을 막아요. 한 번 인증하면 다음부터 자동으로 들어가요.
                <div style={{ marginTop: 6 }}><Btn small onClick={() => post.open("youtube", "verify")}>전화번호 인증하기</Btn></div>
              </div>
            )}
            {done.ch === "youtube" && done.thumb === "fail" && <div style={{ color: "#facc15", marginTop: 4 }}>썸네일은 넣지 못했어요. 크롬 창 썸네일 칸의 [파일 업로드]로 직접 넣어 주세요 (그림은 [영상 폴더]의 썸네일 폴더에 있어요).</div>}
            {done.ch === "youtube" && done.vis === "fail" && <div style={{ color: "#facc15", marginTop: 4 }}>공개 범위는 크롬에서 직접 골라 주세요.</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}
