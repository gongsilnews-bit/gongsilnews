"use client";

// AI 목소리 설정 → [내 목소리] 탭 — 회원이 자기 목소리를 등록해 성우로 쓴다 (PC 에서, 무료). 회의: docs/2026-10-18_studio_ai_settings_meeting.md
//  ① 처음이면 [내 목소리 성우 켜기] (엔진 내려받기)  ② 등록: [직접 녹음] (프롬프터로 문장 읽기) / [녹음 파일 넣기]  ③ 등록된 목소리 카드 — 고르기·샘플 듣기·다시 등록
import React, { useEffect, useRef, useState } from "react";
import type { MyVoiceStatus } from "./types";
import { errText, videoBridge } from "./types";
import { Btn, C, FONT, Icon } from "./ui";
import { MY_VOICE_ID, setMyVoiceName } from "@/lib/studio-video/voices";
import { FavStar, useVoiceFavs } from "./TypecastVoices";

const box: React.CSSProperties = { border: `1px solid ${C.line2}`, borderRadius: 8, background: C.card, padding: 18 };
const big: React.CSSProperties = { fontSize: 19, fontWeight: 800, color: C.text };
const sub: React.CSSProperties = { fontSize: 15, color: C.sub, lineHeight: 1.6 };

export function MyVoicePane({ selected, onPick }: { selected: boolean; onPick: () => void }) {
  const b = videoBridge();
  const mv = b?.myVoice;
  const [favs, toggleFav] = useVoiceFavs(); // 즐겨찾기 (☆)
  const [st, setSt] = useState<MyVoiceStatus | null>(null);
  const [busy, setBusy] = useState<{ text: string; frac: number } | null>(null);
  const [err, setErr] = useState("");
  const [again, setAgain] = useState(false); // 등록돼 있어도 다시 등록 화면
  const [wiz, setWiz] = useState<WizStep>("intro");
  const [takes, setTakes] = useState<Take[]>([]);
  const [mic, setMic] = useState("");
  const [fileMode, setFileMode] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  // 듣기 — 어느 소리를 틀고 있는지 (load: 누름 → 소리 나오기 전 ⟳, play: 나오는 중 ■)
  const [pl, setPl] = useState<{ url: string; phase: "load" | "play" } | null>(null);


  useEffect(() => {
    mv?.status().then(setSt).catch((e) => setErr(errText(e)));
    return () => audio.current?.pause();
  }, [mv]);
  useEffect(() => (mv ? mv.onProgress((text, frac) => setBusy({ text, frac })) : undefined), [mv]);
  // 등록한 이름 — 클립의 목소리 단추에도 그 이름이 나오게
  useEffect(() => { if (st) setMyVoiceName(st.name); }, [st]);

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
    setAgain(false);
    setWiz("intro");
    setTakes([]);
    onPick();
    const s = await run(() => mv!.sample(), "내 목소리로 샘플 문장을 만드는 중… (처음엔 30초쯤 걸려요)");
    if (s?.sampleUrl) play(s.sampleUrl);
  };
  const play = (url: string, lead = 0) => {
    audio.current?.pause();
    audio.current = null;
    if (pl?.url === url) return setPl(null); // 같은 것을 다시 누르면 멈춤
    const a = new Audio(url);
    // 앞에 무음(3·2·1)이 있으면 목소리가 나오는 때까지 ⟳ 를 보여 준다
    const live = () => setPl((x) => (x && x.url === url ? { url, phase: "play" } : x));
    a.onplaying = () => { if (lead <= 0.05) live(); };
    a.ontimeupdate = () => { if (lead > 0.05 && a.currentTime >= lead - 0.05) live(); };
    a.onended = () => setPl((x) => (x && x.url === url ? null : x));
    a.onerror = () => setPl((x) => (x && x.url === url ? null : x));
    audio.current = a;
    setPl({ url, phase: "load" });
    a.play().catch(() => setPl((x) => (x && x.url === url ? null : x)));
  };
  /** 듣기 단추 — 누르면 바로 ⟳, 소리가 나오면 ■ 멈추기, 끝나면 ▷ */
  const playBtn = (url: string, label = "듣기", lead = 0) => {
    const me = pl?.url === url ? pl.phase : "";
    return (
      <Btn small onClick={() => play(url, lead)}>
        {me === "load" ? <span className="gsv-mv-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block" }} /> : me === "play" ? <span style={{ width: 10, height: 10, background: "currentColor", borderRadius: 2, display: "inline-block" }} /> : <Icon name="play" size={14} />}
        {me === "play" ? "멈추기" : me === "load" ? "준비 중…" : label}
      </Btn>
    );
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
  // 카드 ▶ 는 내 목소리 샘플을 틀 때만 ■ (원래 녹음 듣기 때는 그대로 ▶ — 2026-10-19 사장님)
  const playing = Boolean(pl) && pl!.url !== st?.refUrl;
  const playSample = async () => {
    if (st?.sampleUrl) return play(st.sampleUrl);
    const s = await run(() => mv!.sample(), "내 목소리로 샘플 문장을 만드는 중…");
    if (s?.sampleUrl) play(s.sampleUrl);
  };

  const wrap = (children: React.ReactNode) => <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}><style>{"@keyframes gsvMvSpin{to{transform:rotate(360deg)}}.gsv-mv-spin{animation:gsvMvSpin .8s linear infinite}"}</style>{children}{err && <div style={{ fontSize: 15, color: C.danger, lineHeight: 1.6 }}>{err}</div>}</div>;

  if (!mv) return wrap(<div style={box}><div style={big}>공실마케팅를 새로 받아 주세요</div><div style={{ ...sub, marginTop: 6 }}>내 목소리 성우는 스튜디오 앱 새 버전부터 쓸 수 있어요.</div></div>);
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

  // ② 등록 (처음 또는 다시 등록) — 브루처럼 단계별: 소개 → 동의 → 녹음 안내 → 마이크 → 3문장 녹음 → 고르기 (2026-10-18 사장님)
  if (!st.voice || again) {
    const cancel = st.voice ? () => { setAgain(false); setWiz("intro"); setTakes([]); } : undefined;
    return wrap(
      <Wizard step={wiz} setStep={setWiz} takes={takes} setTakes={setTakes} mic={mic} setMic={setMic} fileMode={fileMode} setFileMode={setFileMode} onCancel={cancel}
        onFile={() => run(() => mv.file(), "파일을 고르는 중…").then(afterRegister)}
        onPick={(t) => run(() => mv.record(t.bytes, t.text), "녹음을 살펴보는 중… (실제로 말한 글자를 받아 적어요)").then(afterRegister)}
        playBtn={playBtn} />,
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
              <FavStar on={favs.includes(MY_VOICE_ID)} onToggle={() => toggleFav(MY_VOICE_ID)} />
              {mv.update && <button type="button" title="이름 바꾸기" onClick={(e) => { e.stopPropagation(); setEditName(st.name || "내 목소리"); }}
                style={{ width: 28, height: 28, border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="pen" size={15} /></button>}
            </div>
          )}
          <div style={{ fontSize: 14, color: C.sub, marginTop: 5 }}>{st.registeredAt ? `${new Date(st.registeredAt).toLocaleDateString("ko-KR")} 등록` : ""} · PC에서 무료로 만들어요</div>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onPick(); playSample(); }} title={playing ? "멈추기" : "녹음한 글자를 내 목소리로 듣기"}
          style={{ width: 42, height: 42, flexShrink: 0, borderRadius: "50%", border: `1px solid ${playing ? C.accent : C.line2}`, background: playing ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {playing ? <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 2 }} /> : <Icon name="play" size={17} />}
        </button>
      </div>
      {/* 녹음한 글자 — 엔진에 녹음과 함께 넣는 글. 녹음과 딱 맞아야 잘 읽는다 (빠지거나 틀린 낱말이 있으면 고치기) */}
      {mv.update && (
        <div style={{ ...box, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, flex: 1 }}>녹음한 글자</span>
            {st.refUrl && playBtn(st.refUrl, "원래 녹음 듣기")}
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
        <Btn onClick={() => { setAgain(true); setWiz("intro"); setTakes([]); }}><Icon name="mic" size={16} />다시 등록</Btn>
        <Btn onClick={() => window.confirm("등록한 내 목소리를 지울까요?") && run(() => mv.remove(), "지우는 중…")}>지우기</Btn>
      </div>
    </>,
  );
}

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
function Recorder({ text, onDone, onCancel, initialMic = "", doneLabel = "이 목소리로 등록", head }: { text: string; onDone: (bytes: ArrayBuffer, lead: number) => void; onCancel: () => void; initialMic?: string; doneLabel?: string; head?: string }) {
  const recAt = useRef(0); // [녹음 시작]을 누른 때 — 3·2·1 무음 길이(lead)를 재려고
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [mic, setMic] = useState(initialMic);
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
    }, 600);
    return () => clearTimeout(id);
  }, [phase, count]);
  const begin = () => {
    recAt.current = performance.now();
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
  // 글자를 차례로 밝히지 않는다 — 밝아지는 속도에 맞춰 읽으면 느려지고, 엔진이 그 느린 말투까지 흉내 낸다 (2026-10-18 사장님). 평소 속도로
  const lit = text.length;
  return (
    <>
      <div style={{ ...box, padding: "26px 28px", background: "#0b0d12" }}>
        {head && <div style={{ fontSize: 13, fontWeight: 800, color: C.accent, marginBottom: 6 }}>{head}</div>}
        <div style={{ fontSize: 14, color: C.sub, marginBottom: 12 }}>
          {phase === "ready" ? "[녹음 시작]을 누르고, 3·2·1 뒤에 아래 문장을 평소 말투로 읽어 주세요." : phase === "count" ? "곧 시작해요…" : phase === "rec" ? "평소 말하는 속도·말투로 편하게 읽어 주세요. 다 읽으면 [멈추기]" : `녹음했어요. 들어 보고 괜찮으면 [${doneLabel}]`}
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.75, fontWeight: 700, wordBreak: "keep-all", letterSpacing: "-0.01em" }}>
          <span style={{ color: "#fff" }}>{text.slice(0, lit)}</span>
          <span>{text.slice(lit)}</span>
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
        {/* 뒤로는 왼쪽, 녹음 단추는 오른쪽 (2026-10-18 사장님) */}
        <Btn onClick={onCancel}>뒤로</Btn>
        <span style={{ flex: 1 }} />
        {phase === "ready" && <Btn primary disabled={!mics.length} onClick={start}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />녹음 시작</Btn>}
        {phase === "rec" && <Btn primary onClick={stopRec}><span style={{ width: 11, height: 11, background: "#fff", borderRadius: 2 }} />멈추기 · {sec.toFixed(0)}초</Btn>}
        {phase === "done" && (
          <>
            <Btn onClick={listen}><Icon name="play" size={16} />들어 보기</Btn>
            <Btn onClick={start}><Icon name="mic" size={16} />다시 녹음</Btn>
            <Btn primary onClick={async () => blob && onDone(await blob.arrayBuffer(), Math.max(0, (t0.current - recAt.current) / 1000))}><Icon name="check" size={16} />{doneLabel}</Btn>
          </>
        )}
      </div>
      <div style={{ fontSize: 13.5, color: C.sub }}>녹음은 이 PC 에만 저장돼요.</div>
    </>
  );
}

/* ── 등록 단계 (브루식) ── */
type WizStep = "intro" | "consent" | "tips" | "mic" | "rec" | "pick";
type Take = { text: string; bytes: ArrayBuffer; url: string; lead: number }; // lead: 앞의 3·2·1 무음 (초)
// 읽을 문장 3개 (각 10초 안팎) — 우리 엔진은 녹음 하나(10초)를 보고 흉내 내서, 길게(30문장) 녹음해도 나아지지 않는다. 대신 셋 중 잘된 것을 고른다
const SENTENCES = [
  "안녕하세요. 공실마케팅에서 제 목소리로 성우를 만들고 있습니다. 좋은 매물을 찾고 계신다면 언제든 편하게 연락 주세요.",
  "이번에 소개해 드릴 매물은 역세권에 있는 깨끗한 오피스텔입니다. 채광이 좋고 관리 상태도 아주 훌륭합니다.",
  "궁금하신 점은 언제든 편하게 문의해 주세요. 직접 방문하시면 더 자세히 안내해 드리겠습니다.",
];

function Wizard({ step, setStep, takes, setTakes, mic, setMic, fileMode, setFileMode, onCancel, onFile, onPick, playBtn }: {
  step: WizStep; setStep: (s: WizStep) => void; takes: Take[]; setTakes: (t: Take[]) => void; mic: string; setMic: (m: string) => void;
  fileMode: boolean; setFileMode: (v: boolean) => void; onCancel?: () => void; onFile: () => void; onPick: (t: Take) => void; playBtn: (url: string, label?: string, lead?: number) => React.ReactNode;
}) {
  const [agree, setAgree] = useState(false);
  const panel: React.CSSProperties = { ...box, padding: 28, display: "flex", flexDirection: "column", gap: 16, minHeight: 360 };
  const foot = (next: React.ReactNode, back?: () => void) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
      {back && <Btn onClick={back}>뒤로</Btn>}
      {onCancel && <Btn onClick={onCancel}>그만두기</Btn>}
      <span style={{ flex: 1 }} />
      {next}
    </div>
  );
  if (step === "intro") {
    return (
      <div style={{ ...panel, flexDirection: "row", gap: 28, alignItems: "stretch" }}>
        <div style={{ width: 210, flexShrink: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, alignContent: "center" }}>
          {["#16a34a", "#f9a8d4", "#06b6d4", "#16a34a", "#06b6d4", "#06b6d4", "#06b6d4", "#f97316", "#16a34a"].map((c, i) => (
            <span key={i} style={{ aspectRatio: "1", borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name={i % 3 === 0 ? "mic" : i % 3 === 1 ? "voice" : "play"} size={22} /></span>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>나와 똑 닮은 AI 내 목소리</div>
          <div style={sub}>만들고 싶은 언어를 고르세요</div>
          {[["ko", "한국어", ""], ["en", "영어 (English)", "준비 중"], ["ja", "일본어 (日本語)", "준비 중"]].map(([k, l, tag]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, border: `1px solid ${k === "ko" ? C.accent : C.line2}`, opacity: k === "ko" ? 1 : 0.5, fontSize: 15, fontWeight: 700 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${k === "ko" ? C.accent : C.sub}`, background: k === "ko" ? C.accent : "transparent", boxShadow: k === "ko" ? `inset 0 0 0 3px ${C.card}` : "none" }} />
              {l}<span style={{ flex: 1 }} />{tag && <span style={{ fontSize: 12, color: C.sub }}>{tag}</span>}
            </div>
          ))}
          {foot(<>
            <Btn onClick={() => { setFileMode(true); setStep("consent"); }}><Icon name="folder" size={16} />녹음 파일로 만들기</Btn>
            <Btn primary onClick={() => { setFileMode(false); setStep("consent"); }}>시작하기 →</Btn>
          </>)}
        </div>
      </div>
    );
  }
  if (step === "consent") {
    return (
      <div style={panel}>
        <div style={big}>음성 데이터 수집 및 이용 안내</div>
        <div style={{ ...sub, fontSize: 14.5 }}>
          녹음한 목소리는 AI 내 목소리를 만드는 데만 쓰이며, <b style={{ color: C.text }}>이 PC 안에만 저장되고 공실뉴스 서버로 보내지 않아요.</b>
          내 목소리를 지우면 녹음도 바로 지워지고, 그 뒤에는 그 녹음으로 만든 목소리를 쓸 수 없어요.
        </div>
        <div style={{ ...sub, fontSize: 14.5 }}>반드시 본인의 목소리로 녹음해야 하며, 다른 사람의 목소리를 녹음해 생기는 문제의 책임은 녹음한 분에게 있어요.</div>
        <div style={{ borderTop: `1px solid ${C.line2}`, paddingTop: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15.5, fontWeight: 700, cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 19, height: 19, accentColor: C.accent }} />
            음성 데이터 수집 및 이용 안내를 확인했고 동의합니다.
          </label>
        </div>
        {foot(<Btn primary disabled={!agree} onClick={() => (fileMode ? onFile() : setStep("tips"))}>{fileMode ? "녹음 파일 고르기" : "다음"}</Btn>, () => setStep("intro"))}
      </div>
    );
  }
  if (step === "tips") {
    const card = (icon: string, title: string, text: string) => (
      <div style={{ flex: 1, borderRadius: 8, border: `1px solid ${C.line2}`, overflow: "hidden" }}>
        <div style={{ height: 120, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f172a" }}><Icon name={icon} size={52} /></div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800 }}>{title}</div>
          <div style={{ ...sub, fontSize: 14, marginTop: 6 }}>{text}</div>
        </div>
      </div>
    );
    return (
      <div style={panel}>
        <div style={big}>앞으로 30초 정도 녹음을 진행합니다. (총 3문장)</div>
        <div style={{ display: "flex", gap: 14 }}>
          {card("mute", "조용한 공간에서 진행해 주세요.", "주변 소리가 함께 녹음되면 AI 내 목소리의 품질이 떨어집니다.")}
          {card("voice", "원하는 목소리의 톤을 생각하며 읽어 주세요.", "발랄한 목소리, 차분한 목소리 등 영상에 쓰고 싶은 말투로 녹음해 주세요.")}
        </div>
        <div style={{ ...sub, fontSize: 13.5 }}>3문장을 녹음한 뒤, 가장 잘된 녹음을 골라 등록해요.</div>
        {foot(<Btn primary onClick={() => setStep("mic")}>다음</Btn>, () => setStep("consent"))}
      </div>
    );
  }
  if (step === "mic") return <MicTest mic={mic} setMic={setMic} onNext={() => { setTakes([]); setStep("rec"); }} onBack={() => setStep("tips")} panel={panel} />;
  if (step === "rec") {
    const k = takes.length;
    return (
      <Recorder key={k} text={SENTENCES[k]} initialMic={mic} head={`문장 ${k + 1} / ${SENTENCES.length}`} doneLabel={k + 1 < SENTENCES.length ? "다음 문장" : "녹음 끝 · 고르기"}
        onCancel={() => (k ? setTakes(takes.slice(0, -1)) : setStep("mic"))}
        onDone={(bytes, lead) => {
          const next = [...takes, { text: SENTENCES[k], bytes, lead, url: URL.createObjectURL(new Blob([bytes], { type: "audio/webm" })) }];
          setTakes(next);
          if (next.length >= SENTENCES.length) setStep("pick");
        }} />
    );
  }
  // pick
  return (
    <div style={panel}>
      <div style={big}>가장 잘된 녹음을 골라 주세요</div>
      <div style={{ ...sub, fontSize: 14 }}>들어 보고 또렷하고 자연스러운 것을 고르세요. 고른 녹음 하나로 내 목소리를 만들어요 (나머지는 저장하지 않아요).</div>
      {takes.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 8, border: `1px solid ${C.line2}` }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.sub, width: 46 }}>문장 {i + 1}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.text}</span>
          {playBtn(t.url, "듣기", t.lead)}
          <Btn small primary onClick={() => onPick(t)}><Icon name="check" size={14} />이걸로 등록</Btn>
        </div>
      ))}
      {foot(<Btn onClick={() => { setTakes([]); setStep("rec"); }}><Icon name="mic" size={15} />처음부터 다시 녹음</Btn>)}
    </div>
  );
}

/** 마이크 설정 — 고르고 말해 보면 소리 막대가 움직이는지 (움직여야 [다음]) */
function MicTest({ mic, setMic, onNext, onBack, panel }: { mic: string; setMic: (m: string) => void; onNext: () => void; onBack: () => void; panel: React.CSSProperties }) {
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stop = false;
    let raf = 0;
    let ctx: AudioContext | null = null;
    let s: MediaStream | null = null;
    (async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia({ audio: mic ? { deviceId: { exact: mic } } : true });
        if (stop) return s.getTracks().forEach((t) => t.stop());
        setMics((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput"));
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
          const lv = peak / 128;
          setLevel(lv);
          if (lv > 0.15) setHeard(true);
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
      s?.getTracks().forEach((t) => t.stop());
    };
  }, [mic, setMic]);
  return (
    <div style={panel}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={big}>마이크 설정</span>
        <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 16 }}>마이크 선택</span>
        <select value={mic} onChange={(e) => { setHeard(false); setMic(e.target.value); }} style={{ flex: 1, height: 38, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14.5, fontFamily: FONT }}>
          {mics.map((m, i) => <option key={m.deviceId || i} value={m.deviceId}>{m.label || `마이크 ${i + 1}`}</option>)}
        </select>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "20px 0" }}>
        <span style={{ color: heard ? "#22c55e" : "#22d3ee" }}><Icon name="mic" size={64} /></span>
        <div style={{ width: 320, height: 12, borderRadius: 6, background: C.line, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, level * 140)}%`, height: "100%", background: level > 0.85 ? C.danger : "#22c55e", transition: "width .08s" }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{heard ? "잘 들려요! [다음]을 눌러 주세요" : "마이크가 잘 작동하는지 말해서 테스트해 보세요"}</div>
        {err && <div style={{ fontSize: 14.5, color: C.danger, lineHeight: 1.6, textAlign: "center" }}>{err}</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onBack}>뒤로</Btn>
        <span style={{ flex: 1 }} />
        <Btn primary disabled={!heard} onClick={onNext}>다음</Btn>
      </div>
    </div>
  );
}
