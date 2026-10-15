// 영상 편집기 — 앱에 넣은 FFmpeg/FFprobe 다루기 (인자는 늘 배열, 경로를 명령 문자열에 끼우지 않는다)
//  probe: 길이·크기·코덱·소리 유무   thumb: 썸네일 jpg   prepare: 편집용 사본(미리보기·굽기용)
//  audioForSpeech: 받아쓰기용 소리(16kHz mono mp3)   speech: 말소리 구간(무음 찾기)   encoder: 쓸 수 있는 H.264 인코더
const { spawn, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const log = require("electron-log/main");
const { ffmpegPath } = require("../paths");

const ff = () => {
  const p = ffmpegPath();
  if (!p) throw new Error("영상 도구(FFmpeg)를 찾지 못했습니다. 앱을 다시 설치해 주세요.");
  return p;
};
const ffprobe = () => path.join(path.dirname(ff()), "ffprobe.exe");

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|avif)$/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|wmv|mts|m2ts|3gp)$/i;
const kindOf = (file) => (IMAGE_EXT.test(file) ? "image" : AUDIO_EXT.test(file) ? "audio" : VIDEO_EXT.test(file) ? "video" : "");

function run(bin, args, { onLine, timeoutMs = 0, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { windowsHide: true, cwd });
    let err = "";
    let out = "";
    let timer = null;
    if (timeoutMs) timer = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.stdout.on("data", (d) => {
      out += d;
      if (onLine) String(d).split(/\r?\n/).forEach((l) => l && onLine(l));
    });
    p.stderr.on("data", (d) => {
      err += d;
      if (err.length > 200000) err = err.slice(-100000);
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve({ out, err });
      else reject(new Error(`FFmpeg 오류 (${code}): ${err.split(/\r?\n/).filter(Boolean).slice(-3).join(" / ")}`));
    });
  });
}

/** 파일 정보 — { kind, duration(초), width, height, fps, vcodec, hasAudio, rotation } */
async function probe(file) {
  const kind = kindOf(file);
  const { out } = await run(ffprobe(), ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]);
  const j = JSON.parse(out);
  const v = (j.streams || []).find((s) => s.codec_type === "video" && !(s.disposition && s.disposition.attached_pic));
  const a = (j.streams || []).find((s) => s.codec_type === "audio");
  let rotation = 0;
  if (v) {
    const sd = (v.side_data_list || []).find((x) => x.rotation !== undefined);
    rotation = Math.abs(Number((sd && sd.rotation) || (v.tags && v.tags.rotate) || 0)) % 360;
  }
  let w = v ? v.width : 0;
  let h = v ? v.height : 0;
  if (rotation === 90 || rotation === 270) [w, h] = [h, w];
  const fr = v && v.avg_frame_rate ? v.avg_frame_rate.split("/").map(Number) : [0, 1];
  return {
    kind: kind || (v ? "video" : a ? "audio" : ""),
    duration: kind === "image" ? 0 : Number((j.format && j.format.duration) || (v && v.duration) || 0),
    width: w,
    height: h,
    fps: fr[1] ? Math.round((fr[0] / fr[1]) * 100) / 100 : 0,
    vcodec: v ? v.codec_name : "",
    hasAudio: Boolean(a),
    rotation,
  };
}

/** 썸네일 jpg (가로 320) — at 초 지점 */
async function thumb(file, dest, at = 0) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const kind = kindOf(file);
  const args = ["-y", "-loglevel", "error"];
  if (kind === "video" && at > 0) args.push("-ss", String(at));
  args.push("-i", file, "-frames:v", "1", "-vf", "scale=320:-2", "-q:v", "4", dest);
  await run(ff(), args, { timeoutMs: 60000 });
  return dest;
}

/**
 * 편집용 사본 — 미리보기·굽기를 빠르게 (사장님: PC 복사본으로 렌더링 시간 단축)
 *  영상: H.264가 아니거나 1080 넘으면 1080p H.264 사본, 아니면 원본 그대로 쓴다
 *  사진: 긴 변 2560 넘으면 1920 으로 줄인 jpg, 아니면 원본
 *  onProgress(0~1)
 */
async function prepare(file, destDir, info, onProgress = () => {}) {
  const kind = info.kind;
  const base = path.join(destDir, path.basename(file).replace(/\.[^.]+$/, ""));
  fs.mkdirSync(destDir, { recursive: true });
  if (kind === "image") {
    const big = Math.max(info.width, info.height) > 2560 || /\.(heic|avif|bmp|webp)$/i.test(file);
    if (!big) return null;
    const dest = `${base}_edit.jpg`;
    await run(ff(), ["-y", "-loglevel", "error", "-i", file, "-vf", "scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))'", "-q:v", "2", dest]);
    return dest;
  }
  if (kind !== "video") return null;
  const okCodec = info.vcodec === "h264";
  const small = Math.min(info.width, info.height) <= 1080;
  if (okCodec && small && /\.(mp4|mov|m4v)$/i.test(file)) return null;
  const dest = `${base}_edit.mp4`;
  const scale = info.width >= info.height ? "scale=-2:'min(1080,ih)'" : "scale='min(1080,iw)':-2";
  const enc = await encoder();
  await run(
    ff(),
    ["-y", "-loglevel", "error", "-progress", "pipe:1", "-i", file, "-vf", `${scale},format=yuv420p`, ...enc.args("fast"), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", dest],
    {
      onLine: (l) => {
        const m = /^out_time_us=(\d+)/.exec(l);
        if (m && info.duration) onProgress(Math.min(1, Number(m[1]) / 1e6 / info.duration));
      },
    }
  );
  return dest;
}

/** 받아쓰기용 소리 — 16kHz mono mp3 32kbps (10분 ≈ 2.4MB). start/len 을 주면 그 구간만 */
async function audioForSpeech(file, dest, { start = 0, len = 0 } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const args = ["-y", "-loglevel", "error"];
  if (start) args.push("-ss", String(start));
  args.push("-i", file);
  if (len) args.push("-t", String(len));
  args.push("-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", dest);
  await run(ff(), args);
  return dest;
}

/** 말소리 구간 — 무음(-35dB, 0.35초 이상)을 찾아 그 사이를 돌려준다 [{s,e}] */
async function speech(file, duration, { noise = -35, min = 0.35 } = {}) {
  const { err } = await run(ff(), ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `silencedetect=noise=${noise}dB:d=${min}`, "-f", "null", "-"]).catch((e) => ({ err: String(e.message) }));
  const silences = [];
  let cur = null;
  for (const line of String(err).split(/\r?\n/)) {
    const s = /silence_start:\s*([\d.]+)/.exec(line);
    const e = /silence_end:\s*([\d.]+)/.exec(line);
    if (s) cur = { s: Number(s[1]) };
    if (e && cur) {
      cur.e = Number(e[1]);
      silences.push(cur);
      cur = null;
    }
  }
  if (cur) silences.push({ s: cur.s, e: duration });
  const out = [];
  let t = 0;
  for (const sl of silences) {
    if (sl.s - t > 0.05) out.push({ s: t, e: sl.s });
    t = sl.e;
  }
  if (duration - t > 0.05) out.push({ s: t, e: duration });
  return out;
}

/* 쓸 수 있는 H.264 인코더 — 그래픽카드 가속(NVENC·QSV·AMF) → 윈도우 MediaFoundation → OpenH264 (처음 한 번 시험) */
let encCache = null;
async function encoder() {
  if (encCache) return encCache;
  const tries = [
    { name: "h264_nvenc", args: (q) => ["-c:v", "h264_nvenc", "-preset", q === "fast" ? "p3" : "p5", "-cq", "23", "-b:v", "0"] },
    { name: "h264_qsv", args: () => ["-c:v", "h264_qsv", "-global_quality", "23"] },
    { name: "h264_amf", args: () => ["-c:v", "h264_amf", "-quality", "balanced", "-rc", "cqp", "-qp_i", "22", "-qp_p", "24"] },
    { name: "h264_mf", args: () => ["-c:v", "h264_mf", "-b:v", "8M"] },
    { name: "libopenh264", args: () => ["-c:v", "libopenh264", "-b:v", "8M"] },
  ];
  for (const t of tries) {
    try {
      await run(ff(), ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=256x256:d=0.2", "-pix_fmt", "yuv420p", ...t.args("fast"), "-f", "null", "-"], { timeoutMs: 15000 });
      encCache = t;
      log.info(`[영상] 인코더: ${t.name}`);
      return t;
    } catch {}
  }
  encCache = tries[tries.length - 1];
  return encCache;
}
const fallbackEncoder = () => ({ name: "libopenh264", args: () => ["-c:v", "libopenh264", "-b:v", "8M"] });

module.exports = { ff, ffprobe, run, probe, thumb, prepare, audioForSpeech, speech, encoder, fallbackEncoder, kindOf, IMAGE_EXT, VIDEO_EXT, AUDIO_EXT };
