"use client";

// AI 목소리 설정 → [내 목소리] 탭 — 회원이 자기 목소리를 등록해 성우로 쓴다 (PC 에서, 무료). 회의: docs/2026-10-18_studio_ai_settings_meeting.md
//  ① 처음이면 [내 목소리 성우 켜기] (엔진 내려받기)  ② 등록: [직접 녹음] (프롬프터로 문장 읽기) / [녹음 파일 넣기]  ③ 등록된 목소리 카드 — 고르기·샘플 듣기·다시 등록
import React, { useEffect, useRef, useState } from "react";
import type { MyVoiceStatus } from "./types";
import { errText, videoBridge } from "./types";
import { Btn, C, FONT, Icon } from "./ui";

const box: React.CSSProperties = { border: `1px solid ${C.line2}`, borderRadius: 8, background: C.card, padding: 18 };
const big: React.CSSProperties = { fontSize: 19, fontWeight: 800, color: C.text };
const sub: React.CSSProperties = { fontSize: 15, color: C.sub, lineHeight: 1.6 };

export function MyVoicePane({ selected, onPick }: { selected: boolean; onPick: () => void }) {
  const b = videoBridge();
  const mv = b?.myVoice;
  const [st, setSt] = useState<MyVoiceStatus | null>(null);
  const [busy, setBusy] = useState<{ text: string; frac: number } | null>(null);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"" | "record">("");
  const [again, setAgain] = useState(false); // 등록돼 있어도 다시 등록 화면
  const [agree, setAgree] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    mv?.status().then(setSt).catch((e) => setErr(errText(e)));
    return () => audio.current?.pause();
  }, [mv]);
  useEffect(() => (mv ? mv.onProgress((text, frac) => setBusy({ text, frac })) : undefined), [mv]);

  const run = async (fn: () => Promise<MyVoiceStatus | null>, first: string) => {
    setErr("");
    setBusy({ text: first, frac: 0 });
    try {
      const r = await fn();
      if (r) {
        setSt(r);
        return r;
      }
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(null);
    }
    return null;
  };
  // 등록 직후 — 샘플 문장을 만들어 바로 들려준다
  const afterRegister = async (r: MyVoiceStatus | null) => {
    if (!r) return;
    setMode("");
    setAgain(false);
    onPick();
    const s = await run(() => mv!.sample(), "내 목소리로 샘플 문장을 만드는 중… (처음엔 30초쯤 걸려요)");
    if (s?.sampleUrl) play(s.sampleUrl);
  };
  const play = (url: string) => {
    audio.current?.pause();
    if (playing) return setPlaying(false);
    const a = new Audio(url);
    a.onended = () => setPlaying(false);
    audio.current = a;
    setPlaying(true);
    a.play().catch(() => setPlaying(false));
  };
  // 이름·녹음한 글자 고치기
  const [editName, setEditName] = useState<string | null>(null);
  const [editText, setEditText] = useState<string | null>(null);
  const saveName = async () => {
    if (editName === null || !mv?.update) return;
    const r = await run(() => mv.update!({ name: editName }), "이름을 바꾸는 중…");
    if (r) setEditName(null);
  };
  const saveText = async () => {
    if (editText === null || !mv?.update) return;
    const r = await run(() => mv.update!({ text: editText }), "녹음한 글자를 고치는 중…");
    if (!r) return;
    setEditText(null);
    const s2 = await run(() => mv.sample(), "고친 글자로 샘플 문장을 다시 만드는 중…");
    if (s2?.sampleUrl) play(s2.sampleUrl);
  };
  const playSample = async () => {
    if (st?.sampleUrl) return play(st.sampleUrl);
    const s = await run(() => mv!.sample(), "내 목소리로 샘플 문장을 만드는 중…");
    if (s?.sampleUrl) play(s.sampleUrl);
  };

  const wrap = (children: React.ReactNode) => <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>{children}{err && <div style={{ fontSize: 15, color: C.danger, lineHeight: 1.6 }}>{err}</div>}</div>;

  if (!mv) return wrap(<div style={box}><div style={big}>공실뉴스 스튜디오를 새로 받아 주세요</div><div style={{ ...sub, marginTop: 6 }}>내 목소리 성우는 스튜디오 앱 새 버전부터 쓸 수 있어요.</div></div>);
  if (!st) return wrap(<div style={sub}>불러오는 중…</div>);
  if (busy) return wrap(<Progress text={busy.text} frac={busy.frac} />);
  // 앱이 뒤에서 미리 받는 중 (켜고 3분 뒤 저절로) — 다음 진행 알림이 오면 막대가 찬다
  if (st.installing && !st.engine) return wrap(<Progress text="내 목소리 프로그램을 미리 받는 중이에요…" frac={0} />);

  // ① 엔진 켜기
  if (!st.engine) {
    return wrap(
      <div style={box}>
        <div style={big}>내 목소리로 영상을 읽어 보세요</div>
        <div style={{ ...sub, marginTop: 8 }}>
          내 목소리를 10초쯤 녹음해 두면, 대본을 내 목소리로 읽어 줘요.<br />
          이 PC 안에서 만들어서 <b style={{ color: C.text }}>요금이 들지 않고</b>, 목소리는 공실뉴스 서버에 올라가지 않아요.<br />
          처음 한 번 목소리 프로그램을 내려받아요 (약 6GB, 인터넷 속도에 따라 20~40분).
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn primary onClick={() => run(() => mv.install(), "준비하는 중…")}><Icon name="mic" size={17} />내 목소리 성우 켜기</Btn>
        </div>
      </div>,
    );
  }

  // ② 등록 (처음 또는 다시 등록)
  if (!st.voice || again) {
    if (mode === "record") return wrap(<Recorder text={st.readText} onCancel={() => setMode("")} onDone={(bytes) => run(() => mv.record(bytes, st.readText), "녹음을 살펴보는 중…").then(afterRegister)} />);
    return wrap(
      <>
        <div style={box}>
          <div style={big}>내 목소리 등록</div>
          <div style={{ ...sub, marginTop: 6 }}>두 가지 중 편한 방법으로 등록하세요. 조용한 곳에서 평소 말투로 하면 가장 좋아요.</div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 15.5, fontWeight: 700, color: C.text, cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 19, height: 19, accentColor: C.accent }} />
            본인 목소리만 등록합니다 (다른 사람 목소리는 등록하지 않아요)
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button type="button" disabled={!agree} onClick={() => setMode("record")} style={choice(agree)}>
            <Icon name="mic" size={30} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>직접 녹음</span>
            <span style={{ ...sub, fontSize: 14 }}>화면에 나오는 문장을 읽어요 (약 10초)<br />가장 잘 닮아요</span>
          </button>
          <button type="button" disabled={!agree} onClick={() => run(() => mv.file(), "파일을 고르는 중…").then(afterRegister)} style={choice(agree)}>
            <Icon name="folder" size={30} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>녹음 파일 넣기</span>
            <span style={{ ...sub, fontSize: 14 }}>내 목소리 녹음·영상 파일 (mp3·m4a·mp4 등)<br />앞부분 10초쯤을 받아 적어 써요</span>
          </button>
        </div>
        {!agree && <div style={{ ...sub, fontSize: 14 }}>위 확인 칸을 먼저 눌러 주세요.</div>}
        {st.voice && <div><Btn onClick={() => { setAgain(false); setMode(""); }}>등록한 목소리 그대로 쓰기</Btn></div>}
      </>,
    );
  }

  // ③ 등록된 내 목소리
  return wrap(
    <>
      <div onClick={onPick} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 8, border: `${selected ? 2 : 1}px solid ${selected ? C.accent : C.line2}`, background: selected ? C.accentDim : C.card, cursor: "pointer" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", flexShrink: 0, background: C.line, border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.text }}><Icon name="mic" size={34} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editName !== null ? (
            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={20}
                onKeyDown={(e) => { if (e.key === "Enter") void saveName(); if (e.key === "Escape") setEditName(null); }}
                style={{ height: 34, padding: "0 10px", borderRadius: 5, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 16, fontFamily: FONT, width: 200 }} />
              <Btn small primary onClick={() => void saveName()}>저장</Btn>
              <Btn small onClick={() => setEditName(null)}>취소</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 19, fontWeight: 800 }}>{st.name || "내 목소리"}</span>
              {mv.update && <button type="button" title="이름 바꾸기" onClick={(e) => { e.stopPropagation(); setEditName(st.name || "내 목소리"); }}
                style={{ width: 28, height: 28, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="pen" size={15} /></button>}
            </div>
          )}
          <div style={{ fontSize: 14, color: C.sub, marginTop: 5 }}>{st.registeredAt ? `${new Date(st.registeredAt).toLocaleDateString("ko-KR")} 등록` : ""} · PC에서 무료로 만들어요</div>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onPick(); playSample(); }} title={playing ? "멈추기" : "내 목소리 샘플 듣기"}
          style={{ width: 42, height: 42, flexShrink: 0, borderRadius: "50%", border: `1px solid ${playing ? C.accent : C.line2}`, background: playing ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {playing ? <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 2 }} /> : <Icon name="play" size={17} />}
        </button>
      </div>
      {/* 녹음한 글자 — 엔진에 녹음과 함께 넣는 글. 녹음과 딱 맞아야 잘 읽는다 (빠지거나 틀린 낱말이 있으면 고치기) */}
      {mv.update && (
        <div style={{ ...box, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>녹음한 글자</span>
            {st.refUrl && <Btn small onClick={() => play(st.refUrl!)}><Icon name="play" size={14} />원래 녹음 듣기</Btn>}
            {editText === null && <Btn small onClick={() => setEditText(st.text || "")}><Icon name="pen" size={14} />고치기</Btn>}
          </div>
          {editText === null ? (
            <div style={{ fontSize: 15, lineHeight: 1.7, marginTop: 8, color: C.text }}>{st.text || "—"}</div>
          ) : (
            <>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.bg, color: C.text, fontSize: 15, lineHeight: 1.6, fontFamily: FONT, resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Btn small primary onClick={() => void saveText()}>저장 (샘플 새로 만들기)</Btn>
                <Btn small onClick={() => setEditText(null)}>취소</Btn>
              </div>
            </>
          )}
          <div style={{ ...sub, fontSize: 13, marginTop: 8 }}>[원래 녹음 듣기]로 들어 보고, 실제로 말한 그대로가 아니면 고쳐 주세요. 녹음과 글자가 딱 맞아야 내 목소리가 자연스러워요.</div>
        </div>
      )}
      <div style={{ ...sub, fontSize: 14 }}>
        내 목소리는 PC 안에서 만들어서 성우보다 느려요 (문장 하나에 10초 안팎). 처음 쓸 때는 프로그램을 올리느라 더 걸려요.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { setAgain(true); setAgree(false); }}><Icon name="mic" size={16} />다시 등록</Btn>
        <Btn onClick={() => window.confirm("등록한 내 목소리를 지울까요?") && run(() => mv.remove(), "지우는 중…")}>지우기</Btn>
      </div>
    </>,
  );
}

const choice = (on: boolean): React.CSSProperties => ({
  display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "22px 14px", borderRadius: 8, border: `1px solid ${C.line2}`,
  background: C.card, color: C.text, fontFamily: FONT, textAlign: "center", cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.45,
});

function Progress({ text, frac }: { text: string; frac: number }) {
  return (
    <div style={box}>
      <div style={big}>{text}</div>
      <div style={{ height: 10, borderRadius: 5, background: C.line, marginTop: 14, overflow: "hidden" }}>
        <div style={{ width: `${Math.round(Math.max(0.03, Math.min(1, frac || 0)) * 100)}%`, height: "100%", background: C.accent, transition: "width .4s" }} />
      </div>
      <div style={{ ...sub, fontSize: 14, marginTop: 10 }}>이 창을 닫지 마세요.</div>
    </div>
  );
}

/* ── 직접 녹음 — 프롬프터(큰 글씨, 읽을 곳을 차례로 밝힘) + 마이크 고르기 + 소리 크기 막대 ── */
const CPS = 5.2; // 읽는 빠르기 (글자/초) — 프롬프터 밝힘 속도
function Recorder({ text, onDone, onCancel }: { text: string; onDone: (bytes: ArrayBuffer) => void; onCancel: () => void }) {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [mic, setMic] = useState("");
  const [level, setLevel] = useState(0);
  const [phase, setPhase] = useState<"ready" | "count" | "rec" | "done">("ready");
  const [count, setCount] = useState(3);
  const [sec, setSec] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const t0 = useRef(0);
  const player = useRef<HTMLAudioElement | null>(null);

  // 마이크 열기 + 소리 크기
  useEffect(() => {
    let stop = false;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        stream.current?.getTracks().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ audio: mic ? { deviceId: { exact: mic }, echoCancellation: false, noiseSuppression: true, autoGainControl: true } : { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
        if (stop) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
        setMics(list);
        if (!mic) setMic(s.getAudioTracks()[0]?.getSettings().deviceId || "");
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(s).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(peak / 128);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        setErr(`마이크를 열지 못했어요: ${errText(e)}. 마이크가 꽂혀 있는지, 윈도우 설정에서 마이크를 허용했는지 확인해 주세요.`);
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      ctx?.close();
    };
  }, [mic]);
  useEffect(() => () => { stream.current?.getTracks().forEach((t) => t.stop()); player.current?.pause(); }, []);

  // [녹음 시작]을 누르는 순간부터 녹음한다 — 3·2·1 동안 먼저 읽기 시작해도 빠지지 않게 (앞 무음은 등록할 때 잘라 낸다)
  useEffect(() => {
    if (phase !== "count") return;
    const id = setTimeout(() => {
      if (count > 1) return setCount((c) => c - 1);
      t0.current = performance.now();
      setSec(0);
      setPhase("rec");
    }, 800);
    return () => clearTimeout(id);
  }, [phase, count]);
  const begin = () => {
    const r = new MediaRecorder(stream.current!, { mimeType: "audio/webm" });
    const parts: Blob[] = [];
    r.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
    r.onstop = () => { setBlob(new Blob(parts, { type: "audio/webm" })); setPhase("done"); };
    r.start(250);
    rec.current = r;
  };
  // 녹음 시간 · 25초면 저절로 멈춤
  useEffect(() => {
    if (phase !== "rec") return;
    const id = setInterval(() => {
      const s = (performance.now() - t0.current) / 1000;
      setSec(s);
      if (s >= 25 && rec.current?.state === "recording") rec.current.stop();
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  const start = () => { setErr(""); setBlob(null); setCount(3); setPhase("count"); begin(); };
  const stopRec = () => {
    if (rec.current?.state === "recording") rec.current.stop();
  };
  const listen = () => {
    if (!blob) return;
    player.current?.pause();
    player.current = new Audio(URL.createObjectURL(blob));
    player.current.play();
  };

  // 프롬프터 — 읽을 곳까지 밝게 (글자 수 기준)
  const lit = phase === "rec" ? Math.floor(sec * CPS) : phase === "done" ? text.length : 0;
  return (
    <>
      <div style={{ ...box, padding: "26px 28px", background: "#0b0d12" }}>
        <div style={{ fontSize: 14, color: C.sub, marginBottom: 12 }}>
          {phase === "ready" ? "[녹음 시작]을 누르고, 3·2·1 뒤에 아래 문장을 평소 말투로 읽어 주세요." : phase === "count" ? "곧 시작해요…" : phase === "rec" ? "밝아지는 곳을 따라 읽어 주세요. 다 읽으면 [멈추기]" : "녹음했어요. 들어 보고 괜찮으면 [이 목소리로 등록]"}
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.75, fontWeight: 700, wordBreak: "keep-all", letterSpacing: "-0.01em" }}>
          <span style={{ color: "#fff" }}>{text.slice(0, lit)}</span>
          <span style={{ color: phase === "ready" ? "#e5e7eb" : "#5b6170" }}>{text.slice(lit)}</span>
        </div>
        {phase === "count" && <div style={{ fontSize: 64, fontWeight: 900, color: C.accent, textAlign: "center", marginTop: 8 }}>{count}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>마이크</span>
        <select value={mic} onChange={(e) => setMic(e.target.value)} disabled={phase === "rec" || phase === "count"} style={{ height: 38, minWidth: 220, maxWidth: 360, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14.5, fontFamily: FONT }}>
          {mics.map((m, i) => <option key={m.deviceId || i} value={m.deviceId}>{m.label || `마이크 ${i + 1}`}</option>)}
        </select>
        <div title="소리 크기" style={{ flex: 1, minWidth: 140, height: 12, borderRadius: 6, background: C.line, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, level * 140)}%`, height: "100%", background: level > 0.85 ? C.danger : "#22c55e", transition: "width .08s" }} />
        </div>
      </div>
      {err && <div style={{ fontSize: 15, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {phase === "ready" && <Btn primary disabled={!mics.length} onClick={start}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />녹음 시작</Btn>}
        {phase === "rec" && <Btn primary onClick={stopRec}><span style={{ width: 11, height: 11, background: "#fff", borderRadius: 2 }} />멈추기 · {sec.toFixed(0)}초</Btn>}
        {phase === "done" && (
          <>
            <Btn onClick={listen}><Icon name="play" size={16} />들어 보기</Btn>
            <Btn onClick={start}><Icon name="mic" size={16} />다시 녹음</Btn>
            <Btn primary onClick={async () => blob && onDone(await blob.arrayBuffer())}><Icon name="check" size={16} />이 목소리로 등록</Btn>
          </>
        )}
        <span style={{ flex: 1 }} />
        <Btn onClick={onCancel}>뒤로</Btn>
      </div>
      <div style={{ fontSize: 13.5, color: C.sub }}>녹음은 이 PC 에만 저장돼요.</div>
    </>
  );
}
