"use client";

// 배경음악 고르기 창: 무료 음악(저작권 걱정 없는 CC0) · 내 음악 올리기(저작권 동의) · 음악 없음
// + 시작 지점, 음악 크기, 유행곡은 인스타에서 붙이는 방법 안내
import { useEffect, useRef, useState } from "react";
import { BASIC_MUSIC, MUSIC_LIBRARY, MUSIC_MOODS, musicAsset } from "@/lib/reels/music-catalog";
import st from "./reels.module.css";

export type MyTrack = { id: string; title: string; duration: number | null; url: string | null };
type Tab = "free" | "mine" | "insta";

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      resolve(a.duration || 0);
      URL.revokeObjectURL(a.src);
    };
    a.onerror = () => resolve(0);
    a.src = URL.createObjectURL(file);
  });
}

export default function MusicPicker({ vacancyId, music, start, level, mine, onPick, onStart, onLevel, onMine, onClose }: {
  vacancyId: string;
  music: string;
  start: number;
  level: "low" | "mid" | "high";
  mine: MyTrack[];
  onPick: (id: string) => void;
  onStart: (sec: number) => void;
  onLevel: (v: "low" | "mid" | "high") => void;
  onMine: (list: MyTrack[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(music.startsWith("my-") ? "mine" : "free");
  const [mood, setMood] = useState<string>("전체");
  const [playing, setPlaying] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [up, setUp] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const srcOf = (id: string) => mine.find((m) => m.id === id)?.url || (musicAsset(id) ? `/reels-assets/${musicAsset(id)}` : null);
  const durOf = (id: string) => mine.find((m) => m.id === id)?.duration || MUSIC_LIBRARY.find((t) => t.id === id)?.duration || 0;

  const stop = () => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  };
  const play = (id: string, from = 0) => {
    const src = srcOf(id);
    if (!src) return;
    if (playing === id) return stop();
    stop();
    const a = new Audio(src);
    a.currentTime = from;
    audio.current = a;
    setPlaying(id);
    a.onended = () => audio.current === a && setPlaying(null);
    a.play().catch(() => setPlaying(null));
  };

  const upload = async (file: File) => {
    setErr(null);
    if (!agreed) return setErr("먼저 저작권 확인에 체크해 주세요.");
    const sec = await readDuration(file);
    const post = (body: object) => fetch("/api/reels/music", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vacancyId, ...body }) }).then((x) => x.json());
    try {
      setUp(0);
      const r = await post({ action: "start", fileName: file.name, size: file.size, duration: sec, agreed: true });
      if (!r.success) throw new Error(r.error);
      await new Promise<void>((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("PUT", r.uploadUrl);
        x.setRequestHeader("content-type", file.type || "audio/mpeg");
        x.setRequestHeader("x-upsert", "true");
        x.upload.onprogress = (e) => e.lengthComputable && setUp(Math.round((e.loaded / e.total) * 100));
        x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`올리기 실패 (${x.status})`)));
        x.onerror = () => reject(new Error("네트워크가 끊겨 올리지 못했습니다."));
        x.send(file);
      });
      const d = await post({ action: "uploaded", id: r.id });
      if (!d.success) throw new Error(d.error);
      onMine(d.music);
      onPick(`my-${r.id}`);
      onStart(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUp(null);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("이 음악을 지울까요?")) return;
    const d = await fetch("/api/reels/music", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ vacancyId, id }) }).then((x) => x.json());
    if (d.success) onMine(d.music);
    if (music === id) onPick("upbeat");
  };

  const row = (id: string, title: string, sub: string, del?: () => void) => (
    <div key={id} className={`${st.mRow} ${music === id ? st.mOn : ""}`}>
      <button className={st.mPlay} onClick={() => play(id)} title="미리 듣기">{playing === id ? "■" : "▶"}</button>
      <div className={st.mName} onClick={() => onPick(id)}>
        <b>{title}</b>
        <small>{sub}</small>
      </div>
      {del && <button className={st.vdel} onClick={del} title="지우기">🗑</button>}
      <button className={`${st.chip} ${music === id ? st.chipOn : ""}`} onClick={() => onPick(id)}>{music === id ? "✓ 사용 중" : "선택"}</button>
    </div>
  );

  const list = MUSIC_LIBRARY.filter((t) => mood === "전체" || t.mood === mood);
  const dur = durOf(music);

  return (
    <div className={st.modalBack} onClick={onClose}>
      <div className={`${st.modal} ${st.mModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={st.modalHead}>🎵 배경음악<div className={st.spacer} /><button className={st.btn} onClick={onClose}>닫기</button></div>

        <div className={st.libTabs}>
          {([["free", "무료 음악"], ["mine", `내 음악 ${mine.length || ""}`], ["insta", "유행곡 쓰기"]] as const).map(([k, label]) => (
            <button key={k} className={tab === k ? st.libTabOn : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === "free" && (
          <>
            <p className={st.small}>저작권 걱정 없이 상업적으로 쓸 수 있는 음악입니다 (퍼블릭 도메인 CC0).</p>
            <div className={st.seg} style={{ marginBottom: 8 }}>
              {["전체", ...MUSIC_MOODS].map((m) => (
                <button key={m} className={mood === m ? st.segOn : ""} onClick={() => setMood(m)}>{m}</button>
              ))}
            </div>
            <div className={st.mList}>
              {(mood === "전체" || BASIC_MUSIC.some((b) => b.mood === mood)) && BASIC_MUSIC.filter((b) => mood === "전체" || b.mood === mood).map((b) => row(b.id, b.label, b.mood))}
              {list.map((t) => row(t.id, t.label, `${t.mood} · ${mmss(t.duration)}`))}
              <div className={`${st.mRow} ${music === "none" ? st.mOn : ""}`}>
                <span className={st.mPlay}>🔇</span>
                <div className={st.mName} onClick={() => onPick("none")}><b>음악 없음</b><small>성우 목소리와 효과음만</small></div>
                <button className={`${st.chip} ${music === "none" ? st.chipOn : ""}`} onClick={() => onPick("none")}>{music === "none" ? "✓ 사용 중" : "선택"}</button>
              </div>
            </div>
          </>
        )}

        {tab === "mine" && (
          <>
            <label className={st.mAgree}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>이 음악은 <b>제가 직접 만들었거나, 상업적으로 써도 되는 허락을 받은 음악</b>입니다. 저작권 문제의 책임은 저에게 있습니다.</span>
            </label>
            <label className={`${st.libLoad} ${!agreed || up !== null ? st.libBusy : ""}`} style={{ opacity: agreed ? 1 : 0.5 }}>
              {up !== null ? `올리는 중 ${up}%` : "+ 내 음악 올리기"}
              <small>mp3·m4a·wav · 20MB(약 10분)까지</small>
              <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg" hidden disabled={!agreed || up !== null} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
            </label>
            {err && <div className={st.error}>{err}</div>}
            <div className={st.mList}>
              {mine.length === 0 && <div className={st.small}>아직 올린 음악이 없습니다.</div>}
              {mine.map((m) => row(m.id, m.title, m.duration ? mmss(m.duration) : "", () => remove(m.id)))}
            </div>
            <p className={st.small}>⚠ 유행곡·가요·드라마 OST 를 올리면 인스타·유튜브에서 소리가 지워지거나 영상이 막힐 수 있어요. 그런 곡은 [유행곡 쓰기] 방법을 써 주세요.</p>
          </>
        )}

        {tab === "insta" && (
          <div className={st.mInsta}>
            <b>요즘 유행곡은 인스타에서 붙이는 게 안전해요</b>
            <p>인스타그램 안의 음악은 인스타가 저작권 계약을 맺어 둬서 마음 놓고 쓸 수 있어요.</p>
            <ol>
              <li>여기서 배경음악을 <b>음악 없음</b>으로 하고 [영상 만들기]</li>
              <li>휴대폰 인스타그램 → <b>+ → 릴스</b> → 만든 영상 고르기</li>
              <li>위쪽 <b>♫ 음악</b> 버튼 → 원하는 곡 검색 → 쓸 부분 고르기</li>
              <li>음량에서 <b>원본 소리(성우)는 크게, 음악은 작게</b> 맞추고 공유</li>
            </ol>
            <button className={`${st.btn} ${st.primary}`} onClick={() => { onPick("none"); setTab("free"); }}>음악 없음으로 바꾸기</button>
          </div>
        )}

        {music !== "none" && (
          <div className={st.mFoot}>
            <div className={st.fxRow}>
              <span className={st.fxLabel}>시작 지점</span>
              <input type="range" min={0} max={Math.max(0, Math.floor((dur || 120) - 10))} step={1} value={start} onChange={(e) => onStart(Number(e.target.value))} style={{ flex: 1 }} />
              <span className={st.vtime}>{mmss(start)}부터</span>
              <button className={st.chip} onClick={() => play(music, start)}>{playing === music ? "■ 멈춤" : "▶ 이 지점부터 듣기"}</button>
            </div>
            <div className={st.fxRow}>
              <span className={st.fxLabel}>음악 크기</span>
              <div className={st.seg}>
                {([["low", "작게"], ["mid", "보통"], ["high", "크게"]] as const).map(([v, label]) => (
                  <button key={v} className={level === v ? st.segOn : ""} onClick={() => onLevel(v)}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
