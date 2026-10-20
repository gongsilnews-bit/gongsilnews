"use client";

// 새 클립 넣기 — 맨 위에서 종류를 고른다: AI 목소리 글 / 빈 클립 / 사진 / 영상 / 텍스트.
// 영상은 앞뒤(시작·끝)를 정해서 넣고, 소리는 [영상 원래 소리] 또는 [AI 목소리 얹기](원래 소리는 작게 깔림)
import React, { useEffect, useState } from "react";
import type { Asset, LibItem } from "./types";
import { errText, fmtTime, videoBridge } from "./types";
import { Btn, C, FONT, Icon, Modal, input, label } from "./ui";
import VideoStart from "./VideoStart";

export type NewClipSpec =
  | { kind: "ai"; text: string }
  | { kind: "empty"; sec: number }
  | { kind: "photo"; asset: Asset; sec: number }
  | { kind: "video"; asset: Asset; s: number; e: number; sound: "orig" | "ai"; text: string; vol: number }
  | { kind: "text"; text: string; sec: number; bg: "black" | "prev" };
type Kind = NewClipSpec["kind"];

const KINDS: { id: Kind; name: string; icon: string }[] = [
  { id: "ai", name: "AI 목소리 글", icon: "voice" },
  { id: "empty", name: "빈 클립", icon: "scene" },
  { id: "photo", name: "사진", icon: "image" },
  { id: "video", name: "영상", icon: "video" },
  { id: "text", name: "텍스트", icon: "font" },
];

/** 내 자료에서 사진·영상 고르기 (+ PC에서 불러오기) */
function MediaPick({ kind, onPick }: { kind: "image" | "video"; onPick: (it: LibItem) => void }) {
  const b = videoBridge()!;
  const [items, setItems] = useState<LibItem[] | null>(null);
  const load = () => b.lib.list({ kind }).then((r) => setItems(r.filter((x) => x.kind === kind))).catch(() => setItems([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);
  const fromPc = async () => {
    const added = (await b.lib.pick()).filter((x) => x.kind === kind);
    if (added[0]) onPick(added[0]);
    else load();
  };
  return (
    <div>
      <Btn primary onClick={fromPc}><Icon name="plus" size={16} />PC에서 {kind === "image" ? "사진" : "영상"} 불러오기</Btn>
      <div style={{ ...label, fontSize: 14, margin: "14px 0 8px" }}>내 자료의 {kind === "image" ? "사진" : "영상"}</div>
      {items === null ? <div style={{ color: C.sub, fontSize: 14 }}>불러오는 중…</div> : !items.length ? <div style={{ color: C.sub, fontSize: 14 }}>아직 없어요. [PC에서 불러오기]를 눌러 주세요.</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 260, overflowY: "auto" }}>
          {items.map((it) => (
            <button key={it.id} type="button" onClick={() => onPick(it)} title={it.name}
              style={{ position: "relative", padding: 0, border: `1px solid ${C.line2}`, borderRadius: 4, background: "#000", cursor: "pointer", aspectRatio: "16 / 10", overflow: "hidden" }}>
              {(it.thumb || it.kind === "image") && <img src={it.thumb || it.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              {it.kind === "video" && <span style={{ position: "absolute", left: 5, bottom: 4, fontSize: 12, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 3 }}>{fmtTime(it.duration || 0, false)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewClipDialog({ where, ensureAsset, onAdd, onClose }: { where: string; ensureAsset: (it: LibItem) => Promise<Asset>; onAdd: (s: NewClipSpec) => void; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("ai");
  const [text, setText] = useState("");
  const [sec, setSec] = useState(3);
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [video, setVideo] = useState<Asset | null>(null);
  const [range, setRange] = useState<{ s: number; e: number } | null>(null);
  const [trimOpen, setTrimOpen] = useState(false);
  const [sound, setSound] = useState<"orig" | "ai">("orig");
  const [vol, setVol] = useState(0.2);
  const [bg, setBg] = useState<"black" | "prev">("black");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const pick = async (it: LibItem, k: "image" | "video") => {
    setErr("");
    setBusy("자료를 준비하는 중…");
    try {
      const a = await ensureAsset(it);
      if (k === "image") setPhoto(a);
      else {
        setVideo(a);
        setRange({ s: 0, e: Math.min(a.duration || 5, 15) });
        setSound(a.hasAudio ? "orig" : "ai");
        setTrimOpen(true);
      }
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };
  const chip = (on: boolean): React.CSSProperties => ({ height: 36, padding: "0 14px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: C.text, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const secs = (list: number[]) => (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 14, color: C.sub, width: 40 }}>길이</span>
      {list.map((n) => <button key={n} type="button" onClick={() => setSec(n)} style={chip(sec === n)}>{n}초</button>)}
    </div>
  );
  const ok =
    kind === "ai" ? Boolean(text.trim())
      : kind === "photo" ? Boolean(photo)
        : kind === "video" ? Boolean(video && range && (sound === "orig" || text.trim()))
          : kind === "text" ? Boolean(text.trim()) : true;
  const add = () => {
    if (!ok) return;
    if (kind === "ai") onAdd({ kind, text });
    else if (kind === "empty") onAdd({ kind, sec });
    else if (kind === "photo" && photo) onAdd({ kind, asset: photo, sec });
    else if (kind === "video" && video && range) onAdd({ kind, asset: video, s: range.s, e: range.e, sound, text, vol });
    else if (kind === "text") onAdd({ kind, text, sec, bg });
  };
  const textArea = (ph: string, rows = 5) => (
    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={rows} autoFocus placeholder={ph} style={{ ...input, height: "auto", padding: 12, lineHeight: 1.6, resize: "vertical" }} />
  );
  return (
    <>
      <Modal title="새 클립 넣기" onClose={onClose} width={680}
        footer={<><Btn onClick={onClose}>취소</Btn><Btn primary onClick={add} disabled={!ok || Boolean(busy)}><Icon name="check" size={16} />넣기</Btn></>}>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 맨 위 — 종류 고르기 */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => { setKind(k.id); setErr(""); }}
                style={{ ...chip(kind === k.id), height: 42, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 15 }}>
                <Icon name={k.icon} size={17} />{k.name}
              </button>
            ))}
          </div>

          {kind === "ai" && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>AI 목소리가 읽을 글</div>
              {textArea("문장마다 클립 하나가 돼요.\n예) 이번에 소개할 곳은 논현동 빌라입니다. 지하철역까지 걸어서 5분이에요.", 6)}
            </div>
          )}

          {kind === "empty" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 14.5, color: C.sub }}>글 없이 검은 화면이 그만큼 나와요. 나중에 사진·영상을 넣거나, 연필로 글을 쓰면 AI 목소리로 읽어요.</div>
              {secs([1, 2, 3, 5])}
            </div>
          )}

          {kind === "photo" && (
            photo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={photo.thumb || photo.url} alt="" style={{ width: 120, height: 72, objectFit: "cover", borderRadius: 4, background: "#000" }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.name}</span>
                  <Btn small onClick={() => setPhoto(null)}>다른 사진</Btn>
                </div>
                {secs([2, 3, 5])}
              </div>
            ) : <MediaPick kind="image" onPick={(it) => void pick(it, "image")} />
          )}

          {kind === "video" && (
            video && range ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={video.thumb || ""} alt="" style={{ width: 120, height: 72, objectFit: "cover", borderRadius: 4, background: "#000" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.name}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{fmtTime(range.s, false)} ~ {fmtTime(range.e, false)} <span style={{ color: C.sub, fontWeight: 600 }}>({(range.e - range.s).toFixed(1)}초)</span></div>
                  </div>
                  <Btn small onClick={() => setTrimOpen(true)}><Icon name="cut" size={15} />앞뒤 다시 정하기</Btn>
                  <Btn small onClick={() => { setVideo(null); setRange(null); }}>다른 영상</Btn>
                </div>
                <div>
                  <div style={{ ...label, marginBottom: 8 }}>소리</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" disabled={!video.hasAudio} onClick={() => setSound("orig")} style={{ ...chip(sound === "orig"), opacity: video.hasAudio ? 1 : 0.4 }}>영상 원래 소리 그대로</button>
                    <button type="button" onClick={() => setSound("ai")} style={chip(sound === "ai")}>AI 목소리 얹기</button>
                  </div>
                  {!video.hasAudio && <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>이 영상에는 소리가 없어요.</div>}
                </div>
                {sound === "ai" && (
                  <>
                    {textArea("영상 위에서 AI 목소리가 읽을 글", 4)}
                    {video.hasAudio && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, color: C.sub, flexShrink: 0 }}>원래 소리 크기</span>
                        <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} style={{ flex: 1, accentColor: C.accent }} />
                        <span style={{ width: 52, textAlign: "right", fontSize: 14, fontWeight: 800 }}>{vol ? `${Math.round(vol * 100)}%` : "끄기"}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>길이는 정한 영상 구간에 맞춰요. 목소리가 짧으면 남은 시간은 영상만 나와요.</div>
                  </>
                )}
              </div>
            ) : <MediaPick kind="video" onPick={(it) => void pick(it, "video")} />
          )}

          {kind === "text" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {textArea("화면에 크게 띄울 글 (예: 논현동 빌라 · 전세 5억)", 3)}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 14, color: C.sub, width: 40 }}>바탕</span>
                <button type="button" onClick={() => setBg("black")} style={chip(bg === "black")}>검은 화면</button>
                <button type="button" onClick={() => setBg("prev")} style={chip(bg === "prev")}>앞 클립 화면 위에</button>
              </div>
              {secs([2, 3, 5])}
            </div>
          )}

          {busy && <div style={{ fontSize: 14, color: C.sub }}>{busy}</div>}
          {err && <div style={{ fontSize: 14, color: C.danger }}>{err}</div>}
          <div style={{ fontSize: 13.5, color: C.sub }}>{where} 넣어요.</div>
        </div>
      </Modal>
      {trimOpen && video && range && (
        <VideoStart trim asset={video} dur={range.e - range.s} start={range.s} end={range.e}
          onApply={(s, e) => { setRange({ s, e }); setTrimOpen(false); }} onClose={() => setTrimOpen(false)} />
      )}
    </>
  );
}
