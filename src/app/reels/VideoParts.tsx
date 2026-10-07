"use client";

// 릴스 영상: 오른쪽 "내 사진·영상" 칸 (PC에서 불러오기·고르기). 구간·속도·소리는 클립 메뉴(ClipMenu)와 구간 정하기 창(VideoTrimmer)에서
import { useState } from "react";
import { VIDEO_LIMIT, type ReelPhoto, type SceneVideo } from "@/lib/reels/types";
import st from "./reels.module.css";

export type MediaItem = {
  id: string;
  status: "uploading" | "processing" | "ready" | "failed";
  fileName: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  error: string | null;
  url: string | null;
  poster: string | null;
};

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** 고른 영상으로 클립 영상 설정 기본값: 대사 길이쯤의 앞부분, 자동 맞춤, 소리 끔, 가로 영상은 전체 보이기 */
export function defaultVideo(m: MediaItem, clipSec: number): SceneVideo {
  const dur = m.duration || 0;
  return { media: m.id, from: 0, to: Math.min(dur, Math.max(4, Math.round(clipSec * 10) / 10)), speed: "auto", sound: "off", fit: (m.width || 0) > (m.height || 0) ? "contain" : "cover" };
}

// 브라우저에서 길이 먼저 재기 (올리기 전에 3분 넘으면 막는다)
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve(v.duration || 0);
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

// 진행률을 보여 주려고 fetch 대신 XHR 로 서명 주소에 바로 올린다 (서버를 거치지 않음)
function putWithProgress(url: string, file: File, onPct: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", file.type || "video/mp4");
    x.setRequestHeader("x-upsert", "true");
    x.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`올리기 실패 (${x.status}) ${x.responseText.slice(0, 120)}`)));
    x.onerror = () => reject(new Error("네트워크가 끊겨 올리지 못했습니다. 다시 시도해 주세요."));
    x.send(file);
  });
}

type Tab = "all" | "photo" | "video";

/** 오른쪽 "내 사진·영상" 칸 (브루식): PC에서 불러오기(여러 개), 전체·사진·영상, 누르면 선택한 클립에 바로 적용 */
export function MediaLibrary({ vacancyId, clipNo, clipKind, currentPhoto, currentVideo, photos, media, uploadPhoto, onPickPhoto, onPickVideo, onVideoUploaded, onDeleteVideo, onRefresh, onClose }: {
  vacancyId: string;
  clipNo: number;
  clipKind: string;
  currentPhoto: string | null;
  currentVideo: string | null;
  photos: ReelPhoto[];
  media: MediaItem[];
  uploadPhoto: (file: File, apply: boolean) => Promise<void>;
  onPickPhoto: (url: string) => void;
  onPickVideo: (m: MediaItem) => void;
  onVideoUploaded: (id: string, apply: boolean) => void;   // 변환이 끝나면 (한 개만 올렸을 때) 선택한 클립에 넣기
  onDeleteVideo: (id: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [jobs, setJobs] = useState<{ key: string; name: string; pct: number | null }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const videoOk = clipKind === "hook" || clipKind === "photo";
  // 마우스를 올리면 칸 왼쪽에 크게 미리 보기 (영상은 소리 없이 재생)
  const [peek, setPeek] = useState<{ video?: string; img?: string; label: string; top: number; right: number } | null>(null);
  const hover = (p: { video?: string; img?: string; label: string }) => (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const h = 300;
    setPeek({ ...p, top: Math.max(12, Math.min(window.innerHeight - h - 12, r.top + r.height / 2 - h / 2)), right: window.innerWidth - r.left + 14 });
  };

  const job = (key: string, patch: { name?: string; pct?: number | null } | null) =>
    setJobs((j) => (patch === null ? j.filter((x) => x.key !== key) : j.some((x) => x.key === key) ? j.map((x) => (x.key === key ? { ...x, ...patch } : x)) : [...j, { key, name: patch.name || "", pct: patch.pct ?? null }]));

  const uploadVideo = async (file: File, apply: boolean, key: string) => {
    const sec = await readDuration(file);
    if (sec > VIDEO_LIMIT.maxSeconds) throw new Error(`"${file.name}" 은 ${mmss(sec)}예요. 휴대폰 사진(갤러리) 앱 → 편집 → 자르기로 3분 이내만 남긴 뒤 올려 주세요. (릴스에는 클립당 2~5초만 쓰여요)`);
    if (file.size > VIDEO_LIMIT.maxBytes) throw new Error(`"${file.name}" 이 1.5GB를 넘어요. 1080p로 촬영하거나 필요한 부분만 잘라 주세요.`);
    if (sec > VIDEO_LIMIT.warnSeconds && !window.confirm(`"${file.name}" 은 ${mmss(sec)}예요. 올리는 데 3~10분 걸릴 수 있어요 (와이파이 권장). 계속할까요?`)) return;
    const post = (body: object) => fetch("/api/reels/media", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vacancyId, ...body }) }).then((x) => x.json());
    const r = await post({ action: "start", fileName: file.name, size: file.size, duration: sec || 1 });
    if (!r.success) throw new Error(r.error);
    onRefresh();
    await putWithProgress(r.uploadUrl, file, (pct) => job(key, { pct }));
    const d = await post({ action: "uploaded", id: r.id });
    if (!d.success) throw new Error(d.error);
    onVideoUploaded(r.id, apply);
    onRefresh();
  };

  // 여러 개를 한 번에 골라도 하나씩 차례로 올린다. 한 개만 고르면 선택한 클립에 바로 적용
  const load = async (files: File[]) => {
    setErr(null);
    const apply = files.length === 1;
    for (const [k, f] of files.entries()) {
      const key = `${Date.now()}-${k}`;
      const isVideo = f.type.startsWith("video/");
      job(key, { name: f.name, pct: isVideo ? 0 : null });
      try {
        if (isVideo) await uploadVideo(f, apply && videoOk, key);
        else await uploadPhoto(f, apply);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        job(key, null);
      }
    }
  };

  const showPhotos = tab !== "video";
  const showVideos = tab !== "photo";
  const usable = photos.filter((p) => p.keep).length;

  return (
    <aside className={st.lib}>
      <div className={st.libHead}>
        <b>내 사진·영상</b>
        <button className={st.fxClose} onClick={onClose}>✕</button>
      </div>
      <div className={st.libTarget}>
        <span>바꿀 클립</span>
        <b>{clipNo}번 클립</b>
        {!videoOk && <em>가격·마무리 클립은 사진만 바꿀 수 있어요</em>}
      </div>
      <label className={`${st.libLoad} ${jobs.length ? st.libBusy : ""}`}>
        + PC에서 불러오기
        <small>사진·영상 여러 개 선택 가능 · 영상은 3분까지</small>
        <input type="file" accept="image/jpeg,image/png,image/webp,video/*" multiple hidden onChange={(e) => { const f = [...(e.target.files || [])]; e.target.value = ""; if (f.length) load(f); }} />
      </label>
      {jobs.map((j) => (
        <div key={j.key} className={st.libJob}>
          <span>{j.pct == null ? "사진 검사 중…" : j.pct < 100 ? `올리는 중 ${j.pct}%` : "변환 요청 중…"}</span>
          <small>{j.name}</small>
          {j.pct != null && <i className={st.bar}><b style={{ width: `${j.pct}%` }} /></i>}
        </div>
      ))}
      {err && <div className={st.error}>{err}</div>}

      <div className={st.libTabs}>
        {([["all", "전체"], ["photo", `사진 ${usable}`], ["video", `영상 ${media.length}`]] as const).map(([k, label]) => (
          <button key={k} className={tab === k ? st.libTabOn : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <div className={st.libGrid}>
        {showVideos && media.map((m) => {
          const ready = m.status === "ready";
          return (
            <div key={m.id} className={`${st.libItem} ${currentVideo === m.id ? st.libCur : ""} ${!ready || !videoOk ? st.libOff : ""}`} onMouseEnter={ready && m.url ? hover({ video: m.url, img: m.poster || undefined, label: `${m.fileName || "영상"} · ${mmss(m.duration || 0)}` }) : undefined} onMouseLeave={() => setPeek(null)}>
              <button disabled={!ready || !videoOk} onClick={() => onPickVideo(m)} title={videoOk ? "이 클립에 넣기" : "가격·마무리 클립은 사진만"}>
                {m.poster ? <img src={m.poster} alt="" /> : <span className={st.vwait}>{m.status === "failed" ? "⚠" : "⏳"}</span>}
                {m.duration ? <em className={st.vdur}>{mmss(m.duration)}</em> : null}
                <em className={st.libKind}>🎬</em>
              </button>
              <div>
                <span>{ready ? m.fileName || "영상" : m.status === "failed" ? `실패: ${m.error?.slice(0, 30) || ""}` : m.status === "processing" ? "변환 중…" : "올리는 중…"}</span>
                <button className={st.vdel} title="지우기" onClick={() => window.confirm("이 영상을 지울까요? 이 영상을 쓰는 클립은 사진으로 바뀝니다.") && onDeleteVideo(m.id)}>🗑</button>
              </div>
            </div>
          );
        })}
        {showPhotos && photos.map((p) => (
          <div key={p.url} className={`${st.libItem} ${!currentVideo && currentPhoto === p.url ? st.libCur : ""} ${p.keep ? "" : st.libOff}`} onMouseEnter={hover({ img: p.url, label: p.keep ? p.label : `사용 불가: ${p.reason}` })} onMouseLeave={() => setPeek(null)}>
            <button disabled={!p.keep} onClick={() => onPickPhoto(p.url)} title={p.keep ? "이 클립에 넣기" : p.reason}>
              <img src={p.url} alt="" />
            </button>
            <div><span>{p.keep ? p.label : `✕ ${p.reason}`}</span></div>
          </div>
        ))}
      </div>
      {peek && (
        <div className={st.peek} style={{ top: peek.top, right: peek.right }}>
          {peek.video ? <video key={peek.video} src={peek.video} poster={peek.img} autoPlay muted loop playsInline /> : <img src={peek.img} alt="" />}
          <span>{peek.label}</span>
        </div>
      )}
      {showVideos && <p className={st.small}>영상 원본은 변환 직후 서버에서 지워지고 편집용 변환본만 남습니다 (30일 안 쓰면 삭제).</p>}
    </aside>
  );
}
