"use client";

// AI 보이스 녹음 (2026-10-20 사장님: "강의/영상녹화 아래에 — 말 그대로 텍스트로 녹화하는 거야")
//  글을 쓰거나 붙여 넣고 → 목소리 고르기 → 문장마다 AI 목소리를 만들어 쉼을 두고 이어 MP3·WAV 한 파일 (영상·프로젝트 없이)
//  기본 저장 폴더 = 문서\공실마케팅\08 AI생성물\AI보이스. 만드는 법은 [텍스트로 영상 › 목소리만 저장]과 같다 (b.voiceSave)
import React, { useEffect, useMemo, useState } from "react";
import type { Project } from "./types";
import { errText, videoBridge, datedName } from "./types";
import { splitScript, estimateSeconds, COMMA_GAP, GAP } from "./timeline";
import { findVoice, voicePhoto } from "@/lib/studio-video/voices";
import { VoiceFace, VoicePanel } from "./Panels";
import { Btn, C, FONT, Hint, Icon, Modal, Working, input } from "./ui";
import { EL_TAGS, ElevenDetail, elSetOf } from "./ElevenDetail";
import { lastVoice, saveLastVoice } from "./voiceMemory";

export function AiVoiceStudio() {
  const b = videoBridge();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  // 마지막에 고른 목소리로 시작 (처음 쓰면 정훈)
  const [voiceId, setVoiceId] = useState(() => lastVoice()?.id || "Charon");
  const [speed, setSpeed] = useState(() => lastVoice()?.speed || 1);
  const [gap, setGap] = useState(GAP);
  const [pick, setPick] = useState(false);
  const [emotion, setEmotion] = useState<string | undefined>(() => lastVoice()?.emotion);
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);
  const isV3 = voiceId.startsWith("el_") && elSetOf(emotion).m === "v3" && Boolean(emotion?.startsWith("x:"));
  /** 감정 태그를 글 쓰는 자리에 넣기 */
  const putTag = (t: string) => {
    const ta = taRef.current;
    const at = ta ? ta.selectionStart : text.length;
    const ins = `[${t}] `;
    setText(text.slice(0, at) + ins + text.slice(at));
    setTimeout(() => { if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = at + ins.length; } }, 0);
  };
  const [work, setWork] = useState<{ title: string; frac?: number } | null>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ file: string; seconds: number; url?: string } | null>(null);
  const [doneOpen, setDoneOpen] = useState(false); // 다 만들면 가운데 창으로 — 바로 들어 보고, 폴더 열고, 다시 만들기
  // 저장 — 녹화 창처럼 폴더·파일 이름을 미리 보여 주고 바로 저장 (2026-10-20 사장님)
  const [dir, setDir] = useState("");
  const [defDir, setDefDir] = useState("");
  const [kind, setKind] = useState<"mp3" | "wav">("mp3");
  useEffect(() => {
    b?.project.folders?.().then((f) => { setDir(f.aiAudioDir || f.defaults.aiAudioDir || ""); setDefDir(f.defaults.aiAudioDir || ""); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const changeDir = async () => {
    const d = await b?.project.pickFolder?.("AI 보이스를 저장할 폴더", dir || undefined);
    if (!d) return;
    setDir(d);
    await b?.project.setFolders?.({ aiAudioDir: d === defDir ? "" : d }).catch(() => {});
  };
  // 문장 나누기 — 태그만 있는 줄([울먹이며] 처럼 마침표 뒤에 쓴 것)은 다음 문장 앞에, 마지막이면 앞 문장 뒤에 붙인다
  //  (태그만 보내면 일레븐랩스가 "빈 글" 오류를 낸다, 2026-10-20)
  const lines = useMemo(() => {
    const raw = splitScript(text).flat().map((t) => t.trim()).filter(Boolean);
    const out: string[] = [];
    let carry = "";
    for (const t of raw) {
      if (!t.replace(/\[[^\]]{1,20}\]/g, "").replace(/[\s.,!?…~]/g, "")) { carry += (carry ? " " : "") + t; continue; }
      out.push(carry ? `${carry} ${t}` : t);
      carry = "";
    }
    if (carry) { if (out.length) out[out.length - 1] += ` ${carry}`; }
    return out;
  }, [text]);
  const secs = useMemo(() => lines.reduce((a, t) => a + estimateSeconds(t, speed) + (/[,，、]\s*$/.test(t) ? COMMA_GAP : gap), 0), [lines, speed, gap]);
  const v = findVoice(voiceId);
  const ok = Boolean(b?.voiceSave);

  // 성우 견본 듣기 — 각 회사가 주는 견본 녹음 (무료, 크레딧 안 씀). 제미나이는 우리 견본, 내 목소리는 등록 때 만든 견본
  const [smp, setSmp] = useState<"" | "busy" | "play">("");
  const smpAudio = React.useRef<HTMLAudioElement | null>(null);
  const playSample = async () => {
    if (smp === "play") { smpAudio.current?.pause(); setSmp(""); return; }
    setErr("");
    setSmp("busy");
    try {
      let url = "";
      if (voiceId.startsWith("el_")) url = (await b?.eleven?.voices())?.find((x) => x.id === voiceId)?.preview || "";
      else if (voiceId.startsWith("tc_")) url = (await b?.typecast?.voices())?.find((x) => x.id === voiceId)?.preview || "";
      else if (voiceId === "me") url = (await b?.myVoice?.status())?.sampleUrl || "";
      else url = voicePhoto(voiceId).replace(/\.webp(\?.*)?$/, ".mp3");
      if (!url) throw new Error("이 성우는 견본 녹음이 없어요. [미리 듣기]로 내 글을 들어 보세요.");
      smpAudio.current?.pause();
      const a = new Audio(url);
      smpAudio.current = a;
      a.onended = () => setSmp("");
      a.onerror = () => { setSmp(""); setErr("이 성우는 견본 녹음이 없어요."); };
      await a.play();
      setSmp("play");
    } catch (e) {
      setErr(errText(e));
      setSmp("");
    }
  };
  // 미리 듣기 — 처음 세 문장을 지금 성우·설정으로 (저장하지 않음)
  const [pv, setPv] = useState<"" | "busy" | "play">("");
  const pvAudio = React.useRef<HTMLAudioElement | null>(null);
  const preview = async () => {
    if (pv === "play") { pvAudio.current?.pause(); setPv(""); return; }
    if (!b?.voiceSave || !lines.length) return;
    setErr("");
    setPv("busy");
    try {
      const r = await b.voiceSave(lines, voiceId, { kind: "mp3", outFile: "", speed, gap, emotion, preview: true });
      if (!r.url) throw new Error("공실마케팅를 껐다 켜 주세요 (미리 듣기를 새로 연결해요)");
      pvAudio.current?.pause();
      const a = new Audio(r.url);
      pvAudio.current = a;
      a.onended = () => setPv("");
      await a.play();
      setPv("play");
    } catch (e) {
      setErr(errText(e));
      setPv("");
    }
  };
  // 기본 이름 "20261021 AI 보이스" — 같은 이름이 있으면 _2 (2026-10-20 사장님)
  const autoName = () => datedName("AI 보이스");
  const save = async () => {
    if (!b?.voiceSave || !lines.length || !dir) return;
    const base = (name.trim() || autoName()).replace(/[\\/:*?"<>|]/g, "_");
    const f = `${dir.replace(/[\\/]+$/, "")}\\${base}.${kind}`;
    setErr("");
    setDone(null);
    const off = b.onProgress((t, fr) => setWork({ title: t, frac: typeof fr === "number" ? fr : undefined }));
    try {
      setWork({ title: "AI 목소리를 만드는 중…", frac: 0.02 });
      const r = await b.voiceSave(lines, voiceId, { kind, outFile: f, speed, gap, emotion, noOverwrite: true });
      setDone(r);
      setDoneOpen(true);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setWork(null);
      off();
    }
  };

  const smallBtn: React.CSSProperties = { height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", flexShrink: 0 };
  const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", color: C.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 860, padding: "26px 28px 40px" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>AI 보이스 녹음</div>
        <div style={{ fontSize: 14.5, color: C.sub, marginTop: 6 }}>글을 쓰면 AI 성우가 읽어서 소리 파일(MP3·WAV)로 저장해요. 영상은 만들지 않아요.</div>
        {/* 결과·오류 — 맨 위에 (녹음 시작을 누르면 바로 보이게, 2026-10-20 사장님) */}
        {err && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.danger}`, background: "rgba(239,68,68,0.1)", color: C.danger, fontSize: 14.5, lineHeight: 1.5 }}>{err}</div>}
        {done && b && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 8, border: `1px solid ${C.accent}`, background: C.accentDim }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>녹음했어요 · {Math.round(done.seconds)}초</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 4, wordBreak: "break-all" }}>{done.file}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn small primary onClick={() => b.openPath(done.file)}><Icon name="play" size={15} />들어 보기</Btn>
              <Btn small onClick={() => b.showFile(done.file)}><Icon name="folder" size={15} />폴더에서 보기</Btn>
              <Btn small onClick={() => setDone(null)}>닫기</Btn>
            </div>
          </div>
        )}
        {done && doneOpen && b && (
          <Modal title="녹음이 완성됐어요" onClose={() => setDoneOpen(false)} width={560}
            footer={<>
              <Btn onClick={() => b.showFile(done.file)}><Icon name="folder" size={16} />폴더에서 보기</Btn>
              <span style={{ flex: 1 }} />
              <Btn onClick={() => setDoneOpen(false)}><Icon name="pen" size={16} />고쳐서 다시 만들기</Btn>
              <Btn primary onClick={() => setDoneOpen(false)}><Icon name="check" size={16} />확인</Btn>
            </>}>
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>{done.file.split(/[\/]/).pop()} · {Math.round(done.seconds)}초</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 4, wordBreak: "break-all" }}>{done.file}</div>
              {done.url ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio src={done.url} controls autoPlay style={{ width: "100%", marginTop: 16 }} />
              ) : (
                <Btn primary onClick={() => b.openPath(done.file)} style={{ marginTop: 16 }}><Icon name="play" size={16} />들어 보기</Btn>
              )}
              <div style={{ fontSize: 13, color: C.dim, marginTop: 12, lineHeight: 1.6 }}>마음에 안 들면 [고쳐서 다시 만들기]를 눌러 글·성우·설정을 고친 뒤 [녹음 시작]을 다시 누르세요. 새 파일은 _2 로 저장돼요.</div>
            </div>
          </Modal>
        )}
        {work && <Modal title=""><Working title={work.title} detail="문장마다 AI 목소리를 만들어 한 파일로 이어요" frac={work.frac ?? null} /></Modal>}
        {!ok && <div style={{ marginTop: 14, color: C.danger, fontSize: 14.5 }}>공실마케팅를 새 버전으로 업데이트하면 쓸 수 있어요.</div>}

        {/* 목소리 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22, padding: 12, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card }}>
          {v ? <VoiceFace id={v.id} name={v.name} size={52} /> : <Icon name="mic" size={30} />}
          <button type="button" onClick={() => void playSample()} disabled={smp === "busy"} title={smp === "play" ? "멈추기" : "성우 목소리 견본 듣기 (무료)"}
            style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 20, border: `1px solid ${C.line2}`, background: smp === "play" ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <Icon name={smp === "play" ? "pause" : "play"} size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 800 }}>{v?.name || (voiceId === "me" ? "내 목소리" : voiceId.startsWith("el_") ? "일레븐랩스 성우" : voiceId.startsWith("tc_") ? "타입캐스트 성우" : "목소리")}</div>
            {v && <div style={{ fontSize: 13.5, color: C.sub, marginTop: 3 }}>{v.kind}{"age" in v && "mood" in v ? ` · ${v.age} · ${v.mood}` : ""}</div>}
          </div>
          <Btn onClick={() => setPick(true)}><Icon name="mic" size={16} />목소리 바꾸기</Btn>
        </div>
        {/* 일레븐랩스 성우면 세부 설정을 이 화면에서 바로 (2026-10-20 사장님) */}
        {voiceId.startsWith("el_") && <div style={{ margin: "0 -16px" }}><ElevenDetail voiceId={voiceId} emotion={emotion || "normal"} onEmotion={setEmotion} openFirst /></div>}
        {pick && <VoicePanel initial={{ id: voiceId, speed, emotion }} pickLabel="이 목소리로" targetCount={0} onApply={(o) => { setVoiceId(o.id); setSpeed(o.speed); setEmotion(o.emotion); saveLastVoice({ id: o.id, speed: o.speed, emotion: o.emotion }); setPick(false); }} onClose={() => setPick(false)} />}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, marginTop: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700 }}>
            빠르기
            <input type="range" min={0.7} max={1.6} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: 160, accentColor: C.accent }} />
            <span style={{ width: 44 }}>{speed.toFixed(2)}배</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 700 }}>
            문장 사이 쉼
            {([[0.1, "짧게"], [0.2, "보통"], [0.4, "길게"]] as const).map(([g, l]) => <button key={g} type="button" onClick={() => setGap(g)} style={chip(Math.abs(gap - g) < 0.01)}>{l}</button>)}
          </span>
        </div>

        {/* 글 */}
        <div style={{ fontSize: 15, fontWeight: 800, margin: "22px 0 8px" }}>읽을 글</div>
        {isV3 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.sub, marginRight: 4 }}>감정 태그 (v3) — 누르면 글 쓰는 자리에 들어가요</span>
            {EL_TAGS.map((t) => <button key={t} type="button" onClick={() => putTag(t)} style={chip(false)}>[{t}]</button>)}
          </div>
        )}
        <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={"읽을 글을 쓰거나 붙여 넣으세요.\n문장 끝에 마침표(.)를 찍으면 또렷하게 끝나고, 쉼표(,)는 이어서 읽어요."} rows={12}
          style={{ ...input, width: "100%", height: 260, boxSizing: "border-box", resize: "vertical", lineHeight: 1.7, fontSize: 15.5, padding: 14 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 13.5, color: C.sub }}>
          <span>문장 {lines.length}개 · 약 {Math.round(secs)}초</span>
          <span style={{ flex: 1 }} />
          <Btn small onClick={() => void preview()} disabled={!ok || !lines.length || pv === "busy" || Boolean(work)}>
            <Icon name={pv === "play" ? "pause" : "play"} size={15} />{pv === "busy" ? "만드는 중…" : pv === "play" ? "멈추기" : `내 글로 미리 듣기${lines.length > 3 ? " (처음 3문장)" : ""}${/^(el|tc)_/.test(voiceId) ? " · 크레딧 사용" : ""}`}
          </Btn>
        </div>

        {/* 저장 — 녹화 창과 같은 모양 (폴더 · 파일 이름 · 형식) */}
        <div style={{ marginTop: 20, padding: 14, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>저장</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>폴더</span>
            <span title={dir} style={{ flex: 1, minWidth: 0, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dir || "…"}</span>
            <button type="button" onClick={() => void changeDir()} disabled={Boolean(work)} style={smallBtn}>바꾸기</button>
            <button type="button" onClick={() => dir && b?.openPath(dir)} style={smallBtn}>폴더 열기</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>파일 이름</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="비우면 자동 (AI 보이스_날짜·시각)" style={{ ...input, height: 36, fontSize: 14, flex: 1, minWidth: 0 }} />
            <span style={{ fontSize: 13.5, color: C.dim, width: 40, flexShrink: 0 }}>.{kind}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>형식</span>
            <button type="button" onClick={() => setKind("mp3")} style={chip(kind === "mp3")}>MP3</button>
            <button type="button" onClick={() => setKind("wav")} style={chip(kind === "wav")}>WAV (고음질)</button>
            {dir && defDir && dir !== defDir && <button type="button" onClick={() => { setDir(defDir); void b?.project.setFolders?.({ aiAudioDir: "" }).catch(() => {}); }} style={{ marginLeft: "auto", padding: 0, border: 0, background: "transparent", color: C.dim, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", textDecoration: "underline" }}>기본 폴더로 되돌리기</button>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <span style={{ flex: 1, fontSize: 12.5, color: C.dim, lineHeight: 1.5 }}>[녹음 시작]을 누르면 위 폴더에 바로 저장돼요. 같은 이름이 있으면 _2 를 붙여요.</span>
            <Btn primary onClick={() => void save()} disabled={!ok || !lines.length || !dir || Boolean(work)}><Icon name="record" size={16} />녹음 시작</Btn>
          </div>
        </div>

      </div>
    </div>
  );
}
