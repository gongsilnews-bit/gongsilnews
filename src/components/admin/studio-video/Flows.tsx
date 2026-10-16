"use client";

// 처음 화면(새로 만들기 · 프로젝트 열기) · 새로 만들기 창(만들 방법 4가지) · 촬영 영상 편집 · 롱폼→숏폼 · 녹화
import React, { useEffect, useRef, useState } from "react";
import type { Clip, LibItem, Method, Project, Ratio, Recent } from "./types";
import { RATIO_LABEL, errText, fmtTime, uid, videoBridge } from "./types";
import { useStudioWriter } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Hint, Icon, Modal, Toggle, VolumeControl, Working, input, label } from "./ui";

/* ── 처음 화면 ── */
export function Home({ onNew, onOpenPick, onOpen }: { onNew: () => void; onOpenPick: () => void; onOpen: (dir: string) => void }) {
  const b = videoBridge()!;
  const [recent, setRecent] = useState<Recent[] | null>(null);
  useEffect(() => {
    b.project.recent().then(setRecent).catch(() => setRecent([]));
  }, [b]);
  const big = (icon: string, title: string, desc: string, onClick: () => void, primary?: boolean) => (
    <button type="button" onClick={onClick}
      style={{ width: 300, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, borderRadius: 8, border: `1px solid ${primary ? C.accent : C.line2}`, background: primary ? C.accent : C.card, color: primary ? "#fff" : C.text, cursor: "pointer", fontFamily: FONT }}>
      <span style={{ width: 52, height: 52, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${primary ? "rgba(255,255,255,0.7)" : C.line2}` }}><Icon name={icon} size={28} /></span>
      <span style={{ fontSize: 21, fontWeight: 800 }}>{title}</span>
      <span style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.5, padding: "0 24px", textAlign: "center" }}>{desc}</span>
    </button>
  );
  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg, color: C.text, fontFamily: FONT }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          {big("plus", "새로 만들기", "원하는 방식으로 새 영상을 만들어요", onNew, true)}
          {big("open", "프로젝트 열기", "저장한 프로젝트를 이어서 편집해요", onOpenPick)}
        </div>
        <div style={{ marginTop: 52 }}>
          <div style={{ ...label, fontSize: 17, marginBottom: 12 }}>최근 프로젝트</div>
          {recent === null ? <div style={{ color: C.sub }}>불러오는 중…</div> : recent.length === 0 ? (
            <Hint>아직 만든 영상이 없어요. 위의 [새로 만들기]를 눌러 시작하세요.</Hint>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
              {recent.slice(0, 24).map((r) => (
                <button key={r.dir} type="button" onClick={() => onOpen(r.dir)} style={{ textAlign: "left", padding: 0, borderRadius: 6, border: `1px solid ${C.line}`, background: C.card, color: C.text, cursor: "pointer", fontFamily: FONT, overflow: "hidden" }}>
                  <div style={{ aspectRatio: "16 / 9", background: "#000" }}>{r.thumb && <img src={r.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}</div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{r.ratio} · {fmtTime(r.duration || 0, false)} · {new Date(r.updatedAt).toLocaleDateString("ko-KR")}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 새로 만들기 창 — 만들 방법 4가지 (사장님 확정) ── */
export const METHODS: { id: Method; icon: string; title: string; desc: string }[] = [
  { id: "text", icon: "text", title: "텍스트로 영상 만들기", desc: "대본만 있으면 AI 목소리와 사진·영상으로 만들어요" },
  { id: "video", icon: "video", title: "촬영한 영상으로 편집하기", desc: "찍은 영상을 글로 보며 자르고, 자막을 자동으로 달아요" },
  { id: "longform", icon: "shorts", title: "롱폼으로 자동 숏폼 만들기", desc: "긴 영상에서 볼만한 구간을 골라 짧은 영상으로 만들어요" },
  { id: "record", icon: "record", title: "영상 녹화하고 바로 편집하기", desc: "화면이나 카메라를 녹화하면 바로 편집 화면으로 가요" },
];

export function NewDialog({ onPick, onClose }: { onPick: (m: Method) => void; onClose: () => void }) {
  const last = (() => {
    try {
      return (localStorage.getItem("gsv:lastMethod") as Method) || "";
    } catch {
      return "";
    }
  })();
  const pick = (m: Method) => {
    try {
      localStorage.setItem("gsv:lastMethod", m);
    } catch {}
    onPick(m);
  };
  const lastM = METHODS.find((m) => m.id === last);
  return (
    <Modal title="새로 만들기" onClose={onClose} width={860}>
      <div style={{ padding: "18px 24px 26px" }}>
        {lastM && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: C.sub }}>최근 사용</span>
            <Btn small onClick={() => pick(lastM.id)}><Icon name={lastM.icon} size={16} />{lastM.title}</Btn>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {METHODS.map((m) => (
            <button key={m.id} type="button" onClick={() => pick(m.id)}
              style={{ display: "flex", alignItems: "flex-start", gap: 16, textAlign: "left", padding: "24px 22px", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, color: C.text, cursor: "pointer", fontFamily: FONT, minHeight: 130 }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line2)}>
              <span style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, border: `1.5px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={m.icon} size={26} /></span>
              <span>
                <span style={{ display: "block", fontSize: 19, fontWeight: 800 }}>{m.title}</span>
                <span style={{ display: "block", fontSize: 15, color: C.sub, marginTop: 8, lineHeight: 1.55 }}>{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}><Hint>만들 방법을 하나 누르세요. 다음 화면에서 화면 비율을 고를 수 있어요.</Hint></div>
      </div>
    </Modal>
  );
}

/* ── 화면 비율 고르기 (공통) ── */
export function RatioPick({ value, onChange }: { value: Ratio; onChange: (r: Ratio) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      {(Object.keys(RATIO_LABEL) as Ratio[]).map((r) => {
        const [w, h] = r.split(":").map(Number);
        const s = 40 / Math.max(w, h);
        return (
          <button key={r} type="button" onClick={() => onChange(r)} style={{ height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 6, border: `1px solid ${value === r ? C.accent : C.line2}`, background: value === r ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
            <span style={{ width: w * s, height: h * s, border: `2px solid ${C.text}`, borderRadius: 2 }} />
            <span style={{ fontSize: 15, fontWeight: 800 }}>{r}</span>
            <span style={{ fontSize: 13, color: C.sub }}>{RATIO_LABEL[r]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── 영상 고르기 (내 자료 + PC에서) ── */
function VideoPicker({ multi, picked, setPicked }: { multi: boolean; picked: LibItem[]; setPicked: (x: LibItem[]) => void }) {
  const b = videoBridge()!;
  const [items, setItems] = useState<LibItem[] | null>(null);
  const load = () => b.lib.list({ kind: "video" }).then(setItems).catch(() => setItems([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fromPc = async () => {
    const added = (await b.lib.pick()).filter((x) => x.kind === "video");
    if (!added.length) return;
    setPicked(multi ? [...picked, ...added.filter((a) => !picked.some((p) => p.id === a.id))] : [added[0]]);
    load();
  };
  const toggle = (it: LibItem) => setPicked(picked.some((p) => p.id === it.id) ? picked.filter((p) => p.id !== it.id) : multi ? [...picked, it] : [it]);
  return (
    <div>
      <Btn primary onClick={fromPc} style={{ height: 50, fontSize: 16 }}><Icon name="plus" size={18} />PC에서 영상 불러오기</Btn>
      {picked.length > 0 && <div style={{ marginTop: 12, fontSize: 15 }}>고른 영상: <b>{picked.map((p) => p.name).join(", ")}</b></div>}
      <div style={{ ...label, margin: "18px 0 8px" }}>내 자료의 영상</div>
      {items === null ? <div style={{ color: C.sub }}>불러오는 중…</div> : !items.length ? <div style={{ color: C.sub, fontSize: 14 }}>아직 영상이 없어요.</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 300, overflowY: "auto" }}>
          {items.map((it) => {
            const on = picked.some((p) => p.id === it.id);
            return (
              <button key={it.id} type="button" onClick={() => toggle(it)} style={{ position: "relative", padding: 0, border: `2px solid ${on ? C.accent : "transparent"}`, borderRadius: 4, background: "#000", cursor: "pointer", aspectRatio: "16 / 10", overflow: "hidden" }}>
                {it.thumb && <img src={it.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                <span style={{ position: "absolute", left: 5, bottom: 4, fontSize: 12, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 3 }}>{fmtTime(it.duration || 0, false)}</span>
                {on && <span style={{ position: "absolute", right: 5, top: 5, width: 22, height: 22, borderRadius: 11, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} stroke={2.4} /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 영상들 → 새 프로젝트. 받아쓰기(AI 비용)는 하지 않고, PC에서 말소리 구간만 나눠 클립으로 (무료).
 * 예전 앱이면 영상 통째로 한 클립
 */
async function importVideos(method: Method, ratio: Ratio, items: LibItem[], name: string, setWork: (w: { title: string; detail?: string; frac?: number | null }) => void): Promise<Project> {
  const b = videoBridge()!;
  const p = await b.project.create({ method, ratio, name });
  p.scenes = [];
  for (let i = 0; i < items.length; i++) {
    setWork({ title: `영상을 준비하는 중… (${i + 1}/${items.length})`, detail: items[i].name });
    const off = b.onProgress((t, f) => setWork({ title: t, detail: items[i].name, frac: typeof f === "number" ? f : null }));
    try {
      const a = await b.project.addAsset(items[i].id);
      p.assets[a.id] = a;
      setWork({ title: `말소리 구간을 나누는 중… (${i + 1}/${items.length})`, detail: "PC에서 나눠요 (서버로 보내지 않아요)" });
      const whole: Clip[] = [{ id: uid(), type: "source", text: "", words: [], src: { asset: a.id, s: 0, e: a.duration } }];
      let clips: Clip[] = whole;
      try {
        if (b.split) clips = (await b.split(p, a.id)).clips;
      } catch {
        clips = whole; // 나누지 못하면 영상 통째로 한 클립 (그래도 편집은 된다)
      }
      p.scenes.push({ id: uid(), title: items.length > 1 ? a.name : "", clips });
    } finally {
      off();
    }
  }
  if (!p.scenes.length) p.scenes = [{ id: uid(), clips: [] }];
  await b.project.save(p);
  return p;
}

/* ── 촬영한 영상으로 편집하기 ── */
export function VideoFlow({ method = "video", preset, onCancel, onDone }: { method?: Method; preset?: LibItem[]; onCancel: () => void; onDone: (p: Project) => void }) {
  const [step, setStep] = useState(preset?.length ? 1 : 0);
  const [picked, setPicked] = useState<LibItem[]>(preset || []);
  const [ratio, setRatio] = useState<Ratio>(() => {
    const v = preset?.[0];
    return v && v.height > v.width ? "9:16" : "16:9";
  });
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [err, setErr] = useState("");
  const pick = (x: LibItem[]) => {
    setPicked(x);
    if (x[0] && x[0].height > x[0].width) setRatio("9:16");
  };
  const go = async () => {
    setErr("");
    try {
      const p = await importVideos(method, ratio, picked, "", (w) => setWork(w));
      onDone(p);
    } catch (e) {
      setErr(errText(e));
      setWork(null);
    }
  };
  if (work) return <Modal title=""><Working title={work.title} detail={work.detail} frac={work.frac ?? null} /></Modal>;
  return (
    <Modal steps={["영상 고르기", "화면 비율"]} step={step} onClose={onCancel} width={900}
      footer={<>{step > 0 && <Btn onClick={() => setStep(0)}>이전</Btn>}{step === 0 ? <Btn primary disabled={!picked.length} onClick={() => setStep(1)}>다음 <Icon name="chevron" size={16} /></Btn> : <Btn primary onClick={go}>편집 시작 <Icon name="chevron" size={16} /></Btn>}</>}>
      <div style={{ padding: "20px 26px" }}>
        {step === 0 ? (
          <>
            <VideoPicker multi picked={picked} setPicked={pick} />
            <div style={{ marginTop: 14 }}><Hint>영상은 PC에 그대로 두고 편집해요 (올리지 않아요). 여러 개를 고르면 차례로 이어 붙여요.</Hint></div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>어떤 화면 비율로 만들까요?</div>
            <RatioPick value={ratio} onChange={setRatio} />
            <div style={{ marginTop: 16 }}><Hint>[편집 시작]을 누르면 말하는 구간마다 클립으로 나눠요. PC에서 하니 금방 끝나고 비용이 없어요.</Hint></div>
          </>
        )}
        {err && <div style={{ marginTop: 12, color: C.danger, fontSize: 14.5 }}>{err}</div>}
      </div>
    </Modal>
  );
}

/** 마이크 소리 크기 막대 — 말하면 움직인다 (녹화 전·녹화 중 모두). 너무 크면 노랑·빨강 */
function MicMeter({ deviceId, gain = 1, auto = true }: { deviceId: string; gain?: number; auto?: boolean }) {
  const [level, setLevel] = useState(0); // 0~1
  const [err, setErr] = useState("");
  const gainRef = useRef(gain);
  useEffect(() => {
    gainRef.current = gain;
  }, [gain]);
  useEffect(() => {
    let dead = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId }, autoGainControl: auto } : { autoGainControl: auto }, video: false })
      .then((st) => {
        if (dead) return st.getTracks().forEach((t) => t.stop());
        stream = st;
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(st).connect(an);
        const buf = new Float32Array(an.fftSize);
        let shown = 0;
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length) * gainRef.current;
          // dB(-60~0) → 0~1, 올라갈 땐 바로 내려갈 땐 천천히
          const v = Math.max(0, Math.min(1, (20 * Math.log10(rms || 1e-6) + 60) / 60));
          shown = v > shown ? v : shown * 0.92 + v * 0.08;
          setLevel(shown);
          raf = requestAnimationFrame(tick);
        };
        tick();
        setErr("");
      })
      .catch(() => setErr("마이크 소리를 받을 수 없어요"));
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [deviceId, auto]);
  const color = level > 0.9 ? C.danger : level > 0.75 ? "#eab308" : "#22c55e";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="mic" size={16} color={level > 0.05 ? color : C.dim} />
        <div style={{ flex: 1, height: 10, borderRadius: 5, background: C.panel2, overflow: "hidden", border: `1px solid ${C.line}` }}>
          <div style={{ width: `${Math.round(level * 100)}%`, height: "100%", background: color, transition: "width 60ms linear" }} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: err ? C.danger : C.dim, marginTop: 4 }}>
        {err || (level < 0.05 ? "말해 보세요 — 막대가 움직이면 마이크가 잘 들려요" : level > 0.9 ? "소리가 너무 커요. 마이크에서 조금 떨어져 주세요" : "마이크가 잘 들려요")}
      </div>
    </div>
  );
}

/* ── 롱폼으로 자동 숏폼 만들기 ── */
export function LongformFlow({ onCancel, onDone }: { onCancel: () => void; onDone: (p: Project) => void }) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<LibItem[]>([]);
  const [count, setCount] = useState(3);
  const [maxSec, setMaxSec] = useState(60);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [request, setRequest] = useState("");
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [err, setErr] = useState("");
  const [src, setSrc] = useState<Project | null>(null);
  const [shorts, setShorts] = useState<{ title: string; start: number; end: number; reason: string; on: boolean }[]>([]);

  const find = async () => {
    setErr("");
    try {
      // 받아쓰기(AI 비용) 없이 — 말소리 구간으로만 나눠 바로 편집 화면으로.
      // 볼만한 구간 자동 고르기(AI)는 나중에 받아쓰기 단추와 함께 (setSrc·setShorts 는 그때 다시 쓴다)
      const p = await importVideos("longform", ratio, picked.slice(0, 1), picked[0].name.replace(/\.[^.]+$/, ""), (w) => setWork(w));
      setWork(null);
      onDone(p);
      return;
    } catch (e) {
      setErr(errText(e));
    }
    setWork(null);
  };

  const make = async () => {
    if (!src) return;
    const chosen = shorts.filter((s) => s.on);
    let first: Project | null = null;
    try {
      for (let i = 0; i < chosen.length; i++) {
        const s = chosen[i];
        setWork({ title: `숏폼 만드는 중… (${i + 1}/${chosen.length})`, detail: s.title });
        const p = await b.project.create({ method: "longform", ratio, name: s.title });
        p.assets = src.assets;
        p.settings.subtitle = { ...p.settings.subtitle, length: "short", position: ratio === "9:16" ? "middle-low" : "bottom" };
        const clips: Clip[] = [];
        for (const c of src.scenes.flatMap((x) => x.clips)) {
          if (!c.src || c.src.e <= s.start || c.src.s >= s.end) continue;
          const cc: Clip = structuredClone(c);
          cc.id = uid();
          cc.src = { ...c.src, s: Math.max(c.src.s, s.start), e: Math.min(c.src.e, s.end) };
          if (cc.words) cc.words = cc.words.filter((w) => w.e > cc.src!.s && w.s < cc.src!.e);
          if (cc.src.e - cc.src.s > 0.2) clips.push(cc);
        }
        p.scenes = [{ id: uid(), title: s.title, clips }];
        await b.project.save(p);
        if (!first) first = p;
      }
      if (first) onDone(first);
    } catch (e) {
      setErr(errText(e));
      setWork(null);
    }
  };

  if (work) return <Modal title=""><Working title={work.title} detail={work.detail} frac={work.frac ?? null} /></Modal>;
  return (
    <Modal steps={["긴 영상 고르기", "숏폼 설정", "구간 고르기"]} step={step} onClose={onCancel} width={900}
      footer={
        <>
          {step > 0 && step < 2 && <Btn onClick={() => setStep(step - 1)}>이전</Btn>}
          {step === 0 && <Btn primary disabled={!picked.length} onClick={() => setStep(1)}>다음 <Icon name="chevron" size={16} /></Btn>}
          {step === 1 && <Btn primary onClick={find}>숏폼 구간 찾기 <Icon name="chevron" size={16} /></Btn>}
          {step === 2 && <Btn primary disabled={!shorts.some((s) => s.on)} onClick={make}>고른 숏폼 만들기 ({shorts.filter((s) => s.on).length}개)</Btn>}
        </>
      }>
      <div style={{ padding: "20px 26px" }}>
        {step === 0 && <VideoPicker multi={false} picked={picked} setPicked={setPicked} />}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ ...label, marginBottom: 8 }}>몇 개 만들까요?</div>
              <div style={{ display: "flex", gap: 8 }}>{[1, 2, 3, 4, 5].map((n) => <Btn key={n} small primary={count === n} onClick={() => setCount(n)}>{n}개</Btn>)}</div>
            </div>
            <div>
              <div style={{ ...label, marginBottom: 8 }}>한 개 길이 (최대)</div>
              <div style={{ display: "flex", gap: 8 }}>{[30, 45, 60, 90].map((n) => <Btn key={n} small primary={maxSec === n} onClick={() => setMaxSec(n)}>{n}초</Btn>)}</div>
            </div>
            <div>
              <div style={{ ...label, marginBottom: 8 }}>화면 비율</div>
              <RatioPick value={ratio} onChange={setRatio} />
            </div>
            <div>
              <div style={{ ...label, marginBottom: 8 }}>요청 <span style={{ color: C.dim, fontWeight: 600 }}>(선택)</span></div>
              <input value={request} onChange={(e) => setRequest(e.target.value)} placeholder="예: 투자 팁이 나오는 부분 위주로" style={input} />
            </div>
            <Hint>영상 말소리를 글로 바꾼 뒤 {writer}가 볼만한 구간을 골라요. 소리만 보내고 영상은 PC에 그대로 있어요.</Hint>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shorts.map((s, i) => (
              <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 6, border: `1px solid ${s.on ? C.accent : C.line2}`, background: C.card, cursor: "pointer" }}>
                <input type="checkbox" checked={s.on} onChange={() => setShorts(shorts.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))} style={{ width: 20, height: 20, marginTop: 2, accentColor: C.accent }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>{s.title}</span>
                  <span style={{ display: "block", fontSize: 14, color: C.sub, marginTop: 4 }}>{fmtTime(s.start, false)} ~ {fmtTime(s.end, false)} ({Math.round(s.end - s.start)}초) · {s.reason}</span>
                </span>
              </label>
            ))}
            {!shorts.length && <div style={{ color: C.sub }}>알맞은 구간을 찾지 못했어요. 이전으로 가서 다시 해 보세요.</div>}
          </div>
        )}
        {err && <div style={{ marginTop: 12, color: C.danger, fontSize: 14.5 }}>{err}</div>}
      </div>
    </Modal>
  );
}

/* ── 영상 녹화하고 바로 편집하기 ── */
export function RecordFlow({ onCancel, onRecorded }: { onCancel: () => void; onRecorded: (item: LibItem) => void }) {
  const b = videoBridge()!;
  const [mode, setMode] = useState<"screen" | "camera" | "both">("screen");
  const [sources, setSources] = useState<{ id: string; name: string; thumb: string }[]>([]);
  const [source, setSource] = useState("");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cam, setCam] = useState("");
  const [mic, setMic] = useState("");
  // 소리 — 마이크·PC 소리 각각 크기·무음 (둘 다 무음이면 소리 없이 녹화). 녹화 중에 바꿔도 바로 들어간다
  const [micMuted, setMicMuted] = useState(false);
  const [micVol, setMicVol] = useState(1);
  const [micAuto, setMicAuto] = useState(true); // 마이크 자동 조절 (작은 소리는 키우고 큰 소리는 줄임)
  const [pcMuted, setPcMuted] = useState(false);
  const [pcVol, setPcVol] = useState(1);
  const micOn = !micMuted;
  const audioCtx = useRef<AudioContext | null>(null);
  const micGain = useRef<GainNode | null>(null);
  const pcGain = useRef<GainNode | null>(null);
  useEffect(() => {
    if (micGain.current) micGain.current.gain.value = micMuted ? 0 : micVol;
    if (pcGain.current) pcGain.current.gain.value = pcMuted ? 0 : pcVol;
  }, [micMuted, micVol, pcMuted, pcVol]);
  const [phase, setPhase] = useState<"setup" | "count" | "rec" | "saving">("setup");
  const [count, setCount] = useState(3);
  const [sec, setSec] = useState(0);
  const [err, setErr] = useState("");
  const preview = useRef<HTMLVideoElement>(null);
  const streams = useRef<MediaStream[]>([]);
  const rec = useRef<MediaRecorder | null>(null);
  const token = useRef("");
  const raf = useRef(0);

  useEffect(() => {
    b.record.sources().then((s) => {
      setSources(s);
      if (s[0]) setSource(s[0].id);
    }).catch(() => {});
    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null).then((st) => {
      st?.getTracks().forEach((t) => t.stop());
      navigator.mediaDevices.enumerateDevices().then((d) => {
        setCams(d.filter((x) => x.kind === "videoinput"));
        setMics(d.filter((x) => x.kind === "audioinput"));
      });
    });
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = () => {
    cancelAnimationFrame(raf.current);
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    micGain.current = null;
    pcGain.current = null;
    streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streams.current = [];
  };

  const buildStream = async (): Promise<MediaStream> => {
    stopAll();
    let screen: MediaStream | null = null;
    let camera: MediaStream | null = null;
    if (mode !== "camera") {
      await b.record.choose(source);
      // PC 소리는 화면과 함께 받는다 (윈도우 루프백)
      screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !pcMuted });
      streams.current.push(screen);
    }
    // 카메라만 녹화해도 PC 소리를 넣으려면 소리만 따로 받는다
    let pcAudio: MediaStreamTrack[] = screen ? screen.getAudioTracks() : [];
    if (mode === "camera" && !pcMuted) {
      try {
        if (sources[0]) await b.record.choose(sources[0].id);
        const d = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        d.getVideoTracks().forEach((t) => t.stop());
        streams.current.push(d);
        pcAudio = d.getAudioTracks();
      } catch {
        pcAudio = [];
      }
    }
    if (mode !== "screen") {
      camera = await navigator.mediaDevices.getUserMedia({ video: cam ? { deviceId: { exact: cam }, width: 1280, height: 720 } : { width: 1280, height: 720 }, audio: false });
      streams.current.push(camera);
    }
    // 마이크 + PC 소리를 각각 크기 조절해서 섞는다
    let audio: MediaStream | null = null;
    let micStream: MediaStream | null = null;
    if (micOn) {
      const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: micAuto };
      micStream = await navigator.mediaDevices.getUserMedia({ audio: mic ? { ...base, deviceId: { exact: mic } } : base, video: false });
      streams.current.push(micStream);
    }
    if (micStream || pcAudio.length) {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      if (micStream) {
        const g = ctx.createGain();
        g.gain.value = micMuted ? 0 : micVol;
        ctx.createMediaStreamSource(micStream).connect(g).connect(dest);
        micGain.current = g;
      }
      if (pcAudio.length) {
        const g = ctx.createGain();
        g.gain.value = pcMuted ? 0 : pcVol;
        ctx.createMediaStreamSource(new MediaStream(pcAudio)).connect(g).connect(dest);
        pcGain.current = g;
      }
      audio = dest.stream;
    }
    let video: MediaStream;
    if (mode === "both" && screen && camera) {
      // 화면 + 오른쪽 아래 둥근 카메라 — 캔버스로 합쳐서 녹화
      const sv = document.createElement("video");
      const cv = document.createElement("video");
      sv.srcObject = screen;
      cv.srcObject = camera;
      sv.muted = cv.muted = true;
      await Promise.all([sv.play(), cv.play()]);
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const g = canvas.getContext("2d")!;
      const draw = () => {
        g.fillStyle = "#000";
        g.fillRect(0, 0, 1920, 1080);
        const sw = sv.videoWidth || 1920, sh = sv.videoHeight || 1080;
        const k = Math.min(1920 / sw, 1080 / sh);
        g.drawImage(sv, (1920 - sw * k) / 2, (1080 - sh * k) / 2, sw * k, sh * k);
        const r = 170, cx = 1920 - r - 40, cy = 1080 - r - 40;
        g.save();
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.clip();
        const cw = cv.videoWidth || 1280, ch = cv.videoHeight || 720;
        const kk = Math.max((r * 2) / cw, (r * 2) / ch);
        g.drawImage(cv, cx - (cw * kk) / 2, cy - (ch * kk) / 2, cw * kk, ch * kk);
        g.restore();
        g.lineWidth = 6;
        g.strokeStyle = "#fff";
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.stroke();
        raf.current = requestAnimationFrame(draw);
      };
      draw();
      video = canvas.captureStream(30);
    } else video = (screen || camera)!;
    const out = new MediaStream([...video.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])]);
    if (preview.current) {
      preview.current.srcObject = out;
      preview.current.muted = true;
      preview.current.play().catch(() => {});
    }
    return out;
  };

  const start = async () => {
    setErr("");
    try {
      const stream = await buildStream();
      setPhase("count");
      for (let i = 3; i > 0; i--) {
        setCount(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      token.current = await b.record.start(mode === "camera" ? "카메라 녹화" : "화면 녹화");
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      r.ondataavailable = async (e) => {
        if (e.data.size) await b.record.chunk(token.current, await e.data.arrayBuffer());
      };
      r.start(1000);
      rec.current = r;
      setSec(0);
      setPhase("rec");
    } catch (e) {
      setErr(`녹화를 시작하지 못했어요: ${errText(e)}`);
      setPhase("setup");
      stopAll();
    }
  };
  useEffect(() => {
    if (phase !== "rec") return;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const stop = async () => {
    const r = rec.current;
    if (!r) return;
    setPhase("saving");
    await new Promise<void>((res) => {
      r.onstop = () => res();
      r.stop();
    });
    await new Promise((res) => setTimeout(res, 400));
    stopAll();
    try {
      const item = await b.record.stop(token.current);
      onRecorded(item);
    } catch (e) {
      setErr(errText(e));
      setPhase("setup");
    }
  };

  if (phase === "saving") return <Modal title=""><Working title="녹화 파일을 저장하는 중…" detail="PC에 저장하고 바로 편집 화면으로 가요" /></Modal>;
  const chip = (on: boolean): React.CSSProperties => ({ height: 40, padding: "0 16px", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 });
  return (
    <Modal title="영상 녹화하기" onClose={phase === "rec" ? undefined : () => { stopAll(); onCancel(); }} width={980}
      footer={phase === "rec" ? <Btn primary danger onClick={stop} style={{ background: C.danger, borderColor: C.danger, color: "#fff" }}><Icon name="pause" size={16} />녹화 끝내기 ({fmtTime(sec, false)})</Btn> : phase === "count" ? null : <Btn primary onClick={start}><Icon name="record" size={16} />녹화 시작</Btn>}>
      <div style={{ display: "flex", gap: 20, padding: 20 }}>
        <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ ...label, marginBottom: 8 }}>무엇을 녹화할까요?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" disabled={phase !== "setup"} onClick={() => setMode("screen")} style={chip(mode === "screen")}><Icon name="screen" size={18} />화면</button>
              <button type="button" disabled={phase !== "setup"} onClick={() => setMode("camera")} style={chip(mode === "camera")}><Icon name="camera" size={18} />카메라</button>
              <button type="button" disabled={phase !== "setup"} onClick={() => setMode("both")} style={chip(mode === "both")}>화면 + 카메라</button>
            </div>
          </div>
          {mode !== "camera" && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>녹화할 모니터</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {sources.map((s) => (
                  <button key={s.id} type="button" disabled={phase !== "setup"} onClick={() => setSource(s.id)} title={s.name} style={{ padding: 0, border: `2px solid ${source === s.id ? C.accent : "transparent"}`, borderRadius: 4, background: "#000", cursor: "pointer", overflow: "hidden" }}>
                    <img src={s.thumb} alt="" style={{ width: "100%", display: "block" }} />
                    <div style={{ fontSize: 12, color: C.sub, padding: "3px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: C.card }}>{s.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode !== "screen" && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>카메라</div>
              <select value={cam} onChange={(e) => setCam(e.target.value)} style={input} disabled={phase !== "setup"}>
                <option value="">기본 카메라</option>
                {cams.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label || "카메라"}</option>)}
              </select>
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <span style={{ ...label, flex: 1 }}>마이크</span>
              <span style={{ fontSize: 13, color: C.sub, marginRight: 6 }}>자동 조절</span>
              <Toggle on={micAuto} onChange={setMicAuto} disabled={phase !== "setup" || micMuted} />
            </div>
            <select value={mic} onChange={(e) => setMic(e.target.value)} style={{ ...input, marginBottom: 8 }} disabled={phase !== "setup" || micMuted}>
              <option value="">기본 마이크</option>
              {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || "마이크"}</option>)}
            </select>
            <VolumeControl muted={micMuted} value={micVol} onMute={setMicMuted} onVolume={(v) => { setMicVol(v); if (v > 0) setMicMuted(false); }} />
            {micOn && <MicMeter deviceId={mic} gain={micVol} auto={micAuto} />}
          </div>
          <div>
            <div style={{ ...label, marginBottom: 8 }}>PC 소리 <span style={{ color: C.dim, fontWeight: 600 }}>· 컴퓨터에서 나는 소리 (영상·음악 등)</span></div>
            <VolumeControl muted={pcMuted} value={pcVol} onMute={setPcMuted} onVolume={(v) => { setPcVol(v); if (v > 0) setPcMuted(false); }} />
            {phase !== "setup" && pcMuted !== false && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>녹화를 시작할 때 무음이었으면 녹화 중에 켤 수 없어요.</div>}
          </div>
          {err && <div style={{ color: C.danger, fontSize: 14.5, lineHeight: 1.5 }}>{err}</div>}
          <Hint>[녹화 시작]을 누르면 3초 뒤 녹화돼요. 끝나면 [녹화 끝내기]를 누르세요. 바로 편집 화면으로 가요.</Hint>
        </div>
        <div style={{ flex: 1, position: "relative", background: "#000", borderRadius: 6, minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <video ref={preview} playsInline style={{ width: "100%", maxHeight: 520, display: phase === "setup" ? "none" : "block" }} />
          {phase === "setup" && <span style={{ color: C.sub, fontSize: 15 }}>녹화를 시작하면 여기에 보여요</span>}
          {phase === "count" && <span style={{ position: "absolute", fontSize: 96, fontWeight: 800, color: "#fff" }}>{count}</span>}
          {phase === "rec" && <span style={{ position: "absolute", left: 14, top: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#fff" }}><span style={{ width: 12, height: 12, borderRadius: 6, background: C.danger }} />녹화 중 {fmtTime(sec, false)}</span>}
        </div>
      </div>
    </Modal>
  );
}
