// 내 목소리 성우 — 회원이 등록한 자기 목소리로 문장을 읽는다 (PC 에서, 무료). 회의: docs/2026-10-18_studio_ai_settings_meeting.md
//  엔진: Qwen3-TTS 0.6B (Apache-2.0). 처음 [내 목소리 성우 켜기] 때 %LOCALAPPDATA%\gongsil-studio\voice\ 로 내려받는다 (설치 파일에는 안 넣음)
//   python\ 휴대용 Python (윈도우에 설치·등록하지 않음)  engine\ 프로그램  models\ 모델  voices\ 등록한 목소리  tmp\
//  목소리는 PC 에만 둔다 (서버에 올리지 않음). 녹음은 10초 안팎으로 잘라 그 글자와 함께 쓴다 (길면 문장 끝에서 안 멈춤)
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");
const crypto = require("crypto");
const { app } = require("electron");
const log = require("electron-log/main");
const ff = require("./ff");

const ROOT = path.join(process.env.LOCALAPPDATA || app.getPath("userData"), "gongsil-studio", "voice");
const P = {
  tools: path.join(ROOT, "tools"),
  uv: path.join(ROOT, "tools", "uv.exe"),
  python: path.join(ROOT, "python"),
  env: path.join(ROOT, "engine", "qwen"),
  py: path.join(ROOT, "engine", "qwen", "Scripts", "python.exe"),
  worker: path.join(ROOT, "engine", "myvoice_worker.py"),
  ready: path.join(ROOT, "engine", "ready.json"),
  models: path.join(ROOT, "models"),
  voices: path.join(ROOT, "voices"),
  tmp: path.join(ROOT, "tmp"),
};
// 큰 모델(1.7B) — 작은 모델(0.6B)보다 자연스럽게 (사장님 2026-10-18: 품질 우선). 무료·Apache-2.0 같음, 대신 느리고 크다
const MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base";
const MODEL_BYTES = 4.5e9; // 내려받기 진행 막대용 (대략)
const ME = { wav: path.join(P.voices, "me.wav"), txt: path.join(P.voices, "me.txt"), json: path.join(P.voices, "me.json"), sample: path.join(P.voices, "me_sample.wav") };
const SAMPLE_TEXT = "서울 강남구 논현동에 새 공실이 나왔습니다.";

// 읽을 문장 — [문장 읽고 녹음] 화면과 같은 글 (약 10초)
const READ_TEXT = "안녕하세요. 공실뉴스 스튜디오에서 제 목소리로 성우를 만들고 있습니다. 좋은 매물을 찾고 계신다면 언제든 편하게 연락 주세요.";

const uvEnv = () => ({
  ...process.env,
  UV_PYTHON_INSTALL_DIR: P.python,
  UV_CACHE_DIR: path.join(P.tmp, "uv-cache"),
  UV_NO_PROGRESS: "1",
});
const pyEnv = () => ({ ...process.env, HF_HOME: P.models, HF_HUB_DISABLE_SYMLINKS_WARNING: "1", HF_HUB_DISABLE_TELEMETRY: "1", PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" });

function sh(bin, args, { env, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { windowsHide: true, env: env || process.env });
    let tail = "";
    const eat = (d) => {
      tail = (tail + d).slice(-4000);
      if (onLine) String(d).split(/\r?\n/).forEach((l) => l.trim() && onLine(l.trim()));
    };
    p.stdout.on("data", eat);
    p.stderr.on("data", eat);
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(tail) : reject(new Error(`${path.basename(bin)} 오류 (${code}): ${tail.split(/\r?\n/).filter(Boolean).slice(-3).join(" / ")}`))));
  });
}

function dirBytes(dir) {
  let n = 0;
  const walk = (d) => {
    let list = [];
    try {
      list = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of list) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else
        try {
          n += fs.statSync(f).size;
        } catch {}
    }
  };
  walk(dir);
  return n;
}

const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};

/* ── 상태 ── */
function status() {
  const me = readJson(ME.json);
  return {
    engine: fs.existsSync(P.py) && (readJson(P.ready) || {}).model === MODEL, // 모델을 바꾸면 다시 받는다
    installing: Boolean(installing),
    voice: Boolean(me && fs.existsSync(ME.wav)),
    registeredAt: me ? me.at : "",
    sample: fs.existsSync(ME.sample) && me && me.sampleText === sampleText(me) ? ME.sample : "", // 녹음한 글자로 만든 것만
    readText: READ_TEXT,
    name: (me && me.name) || "내 목소리", // 대표님이 고친 이름
    text: me ? me.text : "", // 녹음한 글자 (엔진에 함께 넣는 글 — 녹음과 딱 맞아야 잘 읽는다)
    ref: me && fs.existsSync(ME.wav) ? ME.wav : "",
  };
}

/** 이름·녹음한 글자 고치기 — 글자를 고치면 샘플·프로젝트의 내 목소리 녹음을 새로 만든다 (stamp 가 바뀜) */
function update({ name, text } = {}) {
  const me = readJson(ME.json);
  if (!me) throw new Error("등록한 내 목소리가 없습니다.");
  if (typeof name === "string") me.name = name.replace(/\s+/g, " ").trim().slice(0, 20) || "내 목소리";
  if (typeof text === "string") {
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length < 4) throw new Error("녹음한 글자를 적어 주세요.");
    if (t !== me.text) {
      me.text = t;
      me.at = new Date().toISOString();
      fs.writeFileSync(ME.txt, t);
      fs.rmSync(ME.sample, { force: true });
    }
  }
  fs.writeFileSync(ME.json, JSON.stringify(me));
  return status();
}

/* ── [내 목소리 성우 켜기] — 엔진 내려받기 (처음 한 번). 이미 있는 단계는 건너뛴다 ── */
let installing = null;
function install(onProgress = () => {}) {
  if (!installing) installing = doInstall(onProgress).finally(() => (installing = null));
  return installing;
}
async function doInstall(say) {
  for (const d of Object.values(P)) if (!path.extname(d)) fs.mkdirSync(d, { recursive: true });
  // 1. uv (Python·프로그램 내려받기 도구, 한 파일)
  if (!fs.existsSync(P.uv)) {
    say("내려받기 도구 받는 중…", 0.02);
    const zip = path.join(P.tmp, "uv.zip");
    const r = await fetch("https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip");
    if (!r.ok) throw new Error(`내려받기 도구를 받지 못했습니다 (${r.status}). 인터넷 연결을 확인해 주세요.`);
    fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    await sh(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe"), ["-xf", zip, "-C", P.tools]);
    fs.rmSync(zip, { force: true });
  }
  // 2. 휴대용 Python 3.11 — 윈도우 레지스트리·PATH 에 등록하지 않는다
  if (!fs.existsSync(P.py)) {
    say("Python 받는 중…", 0.06);
    await sh(P.uv, ["python", "install", "3.11", "--no-registry", "--no-bin"], { env: uvEnv() });
    say("목소리 프로그램 자리 만드는 중…", 0.1);
    await sh(P.uv, ["venv", "--python", "3.11", "--managed-python", P.env], { env: uvEnv() });
  }
  // 3. 프로그램 — PyTorch(CPU판: 대부분의 사무실 PC 는 그래픽카드가 없고, 그래픽카드판은 3GB 로 너무 크다) + qwen-tts
  say("목소리 프로그램 받는 중… (약 1GB)", 0.14);
  await sh(P.uv, ["pip", "install", "--python", P.py, "torch", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cpu"], { env: uvEnv() });
  say("목소리 프로그램 받는 중…", 0.3);
  await sh(P.uv, ["pip", "install", "--python", P.py, "qwen-tts", "soundfile", "huggingface_hub"], { env: uvEnv() });
  // 4. 모델 (약 4.5GB) — 폴더 크기로 진행 막대 (이미 있던 것은 빼고)
  const before = dirBytes(P.models);
  const timer = setInterval(() => {
    const got = dirBytes(P.models) - before;
    say(`목소리 모델 받는 중… ${(got / 1e9).toFixed(1)}GB / 약 ${(MODEL_BYTES / 1e9).toFixed(1)}GB`, 0.35 + 0.6 * Math.min(1, got / MODEL_BYTES));
  }, 1500);
  try {
    await sh(P.py, ["-I", "-c", `from huggingface_hub import snapshot_download; snapshot_download(${JSON.stringify(MODEL)})`], { env: pyEnv() });
  } finally {
    clearInterval(timer);
  }
  log.info(`[내 목소리] 엔진 준비 (모델 ${((dirBytes(P.models) - before) / 1e9).toFixed(2)}GB 새로 받음)`);
  fs.writeFileSync(P.ready, JSON.stringify({ model: MODEL, at: new Date().toISOString() }));
  say("준비 끝", 1);
  return status();
}

/* ── 엔진 일꾼 — 모델을 한 번 올려 두고 문장을 차례로 읽힌다. 10분 안 쓰면 끈다 (메모리 2~3GB) ── */
const WORKER_PY = String.raw`
import sys, os, json, io
OUT = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")  # 앱과 주고받는 줄은 늘 UTF-8 (윈도우 기본 cp949 로 읽으면 한글이 깨진다)
sys.stdout = sys.stderr  # 라이브러리 출력이 대답 줄에 섞이지 않게
def reply(o):
    OUT.write(json.dumps(o, ensure_ascii=False) + "\n"); OUT.flush()
import torch, soundfile as sf
from qwen_tts import Qwen3TTSModel
dev = "cuda:0" if torch.cuda.is_available() else "cpu"
if dev == "cpu":
    torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))
from huggingface_hub import snapshot_download
local = snapshot_download(sys.argv[1], local_files_only=True)  # 내려받아 둔 모델 (인터넷 없이)
m = Qwen3TTSModel.from_pretrained(local, device_map=dev, dtype=(torch.bfloat16 if dev != "cpu" else torch.float32))
reply({"ready": True, "device": dev})
prompts = {}
for raw in sys.stdin.buffer:
    try:
        q = json.loads(raw.decode("utf-8"))
    except Exception:
        continue
    try:
        key = (q["ref"], os.path.getmtime(q["ref"]), q["refText"])
        if key not in prompts:
            prompts = {key: m.create_voice_clone_prompt(ref_audio=q["ref"], ref_text=q["refText"])}
        n = len(q["text"].replace(" ", ""))
        w, sr = m.generate_voice_clone(text=q["text"], language="Korean", voice_clone_prompt=prompts[key], max_new_tokens=min(2048, int(n * 3.2) + 40))
        sf.write(q["out"], w[0], sr)
        reply({"id": q["id"], "ok": True})
    except Exception as e:
        reply({"id": q.get("id"), "ok": False, "error": str(e)})
`;
let worker = null; // { proc, ready: Promise, pending: Map }
let idle = null;
let seq = 0;
function startWorker() {
  if (worker) return worker;
  if (!status().engine) throw new Error("내 목소리 성우가 아직 꺼져 있습니다. [내 목소리 성우 켜기]를 먼저 눌러 주세요.");
  fs.writeFileSync(P.worker, WORKER_PY);
  const proc = spawn(P.py, ["-I", P.worker, MODEL], { windowsHide: true, env: pyEnv() });
  const pending = new Map();
  let errTail = "";
  let onReady;
  let onFail;
  const ready = new Promise((res, rej) => ((onReady = res), (onFail = rej)));
  proc.stderr.on("data", (d) => (errTail = (errTail + d).slice(-3000)));
  readline.createInterface({ input: proc.stdout }).on("line", (l) => {
    let m;
    try {
      m = JSON.parse(l);
    } catch {
      return;
    }
    if (m.ready) {
      log.info(`[내 목소리] 엔진 켜짐 (${m.device})`);
      return onReady();
    }
    const job = pending.get(m.id);
    if (!job) return;
    pending.delete(m.id);
    m.ok ? job.res() : job.rej(new Error(`내 목소리로 읽지 못했습니다: ${m.error}`));
  });
  const me = { proc, ready, pending };
  proc.on("exit", (code) => {
    const why = new Error(`내 목소리 엔진이 멈췄습니다 (${code}). ${errTail.split(/\r?\n/).filter(Boolean).slice(-2).join(" / ")}`);
    onFail(why);
    for (const j of pending.values()) j.rej(why);
    if (worker === me) worker = null;
  });
  worker = me;
  return me;
}
function stopWorker() {
  clearTimeout(idle);
  if (worker) worker.proc.kill();
  worker = null;
}
let chain = Promise.resolve(); // 한 번에 한 문장씩
function say(text, out) {
  const run = async () => {
    const me = readJson(ME.json);
    if (!me || !fs.existsSync(ME.wav)) throw new Error("등록한 내 목소리가 없습니다. [내 목소리 등록]을 먼저 해 주세요.");
    clearTimeout(idle);
    const w = startWorker();
    await w.ready;
    const id = ++seq;
    const raw = out.replace(/\.wav$/i, "_raw.wav");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await new Promise((res, rej) => {
      w.pending.set(id, { res, rej });
      w.proc.stdin.write(JSON.stringify({ id, text, out: raw, ref: ME.wav, refText: me.text }) + "\n");
    });
    await trim(raw, out, 0.25); // 말끝 여유 — 0.08 은 끝소리가 잘려 급하게 들렸다 (2026-10-18)
    fs.rmSync(raw, { force: true });
    idle = setTimeout(stopWorker, 10 * 60 * 1000);
    return out;
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

/** 앞뒤 무음 자르기 (말소리 구간 앞뒤로 pad 초 남김) */
async function trim(src, dest, pad = 0.1) {
  const info = await ff.probe(src);
  const parts = await ff.speech(src, info.duration, { noise: -40, min: 0.3 });
  const s = parts.length ? Math.max(0, parts[0].s - pad) : 0;
  const e = parts.length ? Math.min(info.duration, parts[parts.length - 1].e + pad) : info.duration;
  await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-ss", s.toFixed(3), "-to", e.toFixed(3), "-ac", "1", "-ar", "24000", dest]);
  return e - s;
}

/** 목소리가 바뀌면 프로젝트의 "내 목소리" 녹음도 새로 만든다 — 캐시 열쇠에 넣는 값 */
function stamp() {
  const me = readJson(ME.json);
  return me ? crypto.createHash("sha1").update(`${me.at}\n${me.text}`).digest("hex").slice(0, 8) : "";
}

/* ── [내 목소리 등록] ── 두 가지: ① 앱에서 직접 녹음(정해진 문장) ② 녹음 파일 넣기(앞부분을 받아 적어 글자와 함께) ── */
async function loudEnough(file) {
  const { err } = await ff.run(ff.ff(), ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect", "-f", "null", "-"]);
  const mean = Number((/mean_volume:\s*(-?[\d.]+)/.exec(err) || [])[1]);
  if (Number.isFinite(mean) && mean < -38) throw new Error("소리가 너무 작아요. 마이크에 조금 더 가까이에서 또렷하게 녹음해 주세요.");
  return mean;
}
function keep(cut, text, len, from) {
  fs.copyFileSync(cut, ME.wav);
  fs.writeFileSync(ME.txt, text);
  fs.writeFileSync(ME.json, JSON.stringify({ text, at: new Date().toISOString(), seconds: Math.round(len * 10) / 10, from }));
  fs.rmSync(ME.sample, { force: true });
  log.info(`[내 목소리] 등록 (${from}, ${len.toFixed(1)}초)`);
  return { seconds: len, text };
}

/** ① 직접 녹음 — 앱에서 녹음한 소리(webm) + 읽은 문장 */
async function register(bytes, text) {
  const t = String(text || READ_TEXT).replace(/\s+/g, " ").trim();
  for (const d of [P.tmp, P.voices]) fs.mkdirSync(d, { recursive: true });
  const src = path.join(P.tmp, "rec_in.webm");
  const wav = path.join(P.tmp, "rec.wav");
  const cut = path.join(P.tmp, "rec_cut.wav");
  fs.writeFileSync(src, Buffer.from(bytes));
  try {
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vn", "-ac", "1", "-ar", "24000", wav]);
    const len = await trim(wav, cut, 0.15);
    if (len < 4) throw new Error(`녹음이 너무 짧아요 (${len.toFixed(1)}초). 문장을 끝까지 읽어 주세요.`);
    if (len > 25) throw new Error(`녹음이 너무 길어요 (${len.toFixed(0)}초). 문장만 읽고 [멈추기]를 눌러 주세요.`);
    await loudEnough(cut);
    // 실제로 말한 글자를 넣는다 — 화면 문장을 그대로 넣으면, 앞부분을 빠뜨렸을 때 녹음·글자가 어긋나 엔진이 엉망으로 읽는다 (2026-10-18)
    const wh = require("./whisper");
    if (wh.ready()) {
      const said = (await wh.segments(cut, { fix: false })).map((x) => x.text).join(" ").replace(/\s+/g, " ").trim();
      const bare = (x) => x.replace(/[^가-힣0-9a-zA-Z]/g, "");
      if (bare(said).length < bare(t).length * 0.75) throw new Error(`문장을 처음부터 끝까지 읽어 주세요 — 녹음에서 들린 말: "${said || "없음"}"`);
      return keep(cut, said, len, "record");
    }
    return keep(cut, t, len, "record");
  } finally {
    for (const f of [src, wav, cut]) fs.rmSync(f, { force: true });
  }
}

/** ② 녹음 파일 넣기 (mp3·m4a·wav·mp4 …) — 앞 30초를 받아 적고, 처음부터 5~14초 되는 문장들만 잘라 글자와 함께 쓴다 */
async function registerFile(file, onProgress = () => {}) {
  if (!file || !fs.existsSync(file)) throw new Error("파일을 찾지 못했습니다.");
  for (const d of [P.tmp, P.voices]) fs.mkdirSync(d, { recursive: true });
  const mp3 = path.join(P.tmp, "file_head.mp3");
  const wav = path.join(P.tmp, "file.wav");
  const cut = path.join(P.tmp, "file_cut.wav");
  try {
    onProgress("녹음을 글로 받아 적는 중… (PC에서)", 0.2);
    // Whisper(PC) — 문장 시각이 정확해서 문장 끝에서 딱 자를 수 있다 (녹음 끝·글자 끝이 어긋나면 엔진이 녹음 속 말을 앞에 붙여 읽는다)
    const wh = require("./whisper");
    let r = null;
    // 공실뉴스 서버 Gemini 받아쓰기는 쓰지 않는다 (2026-10-19 사장님) — PC 받아쓰기(Whisper)만
    if (wh.ready()) r = { success: true, segments: await wh.segments(file, { len: 30 }) };
    else r = { success: false, error: "PC 받아쓰기 프로그램이 없어요. 스튜디오를 새 버전으로 다시 설치해 주세요." };
    if (!r || !r.success) throw new Error(`녹음을 받아 적지 못했습니다: ${(r && r.error) || ""}`);
    const segs = (r.segments || []).filter((x) => String(x.text || "").trim());
    if (!segs.length) throw new Error("녹음에서 말소리를 찾지 못했어요. 말소리가 또렷한 파일을 넣어 주세요.");
    // 첫 문장부터 이어서, 14초를 넘지 않게 (최소 5초 되도록)
    const start = Math.max(0, segs[0].start - 0.15);
    const pick = [];
    for (const x of segs) {
      if (pick.length && x.end - start > 14) break;
      pick.push(x);
    }
    const end = pick[pick.length - 1].end + 0.15;
    if (end - start < 5) throw new Error(`말소리가 너무 짧아요 (${(end - start).toFixed(1)}초). 5초 이상 말한 녹음을 넣어 주세요.`);
    onProgress("목소리 부분만 자르는 중…", 0.7);
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", start.toFixed(3), "-to", end.toFixed(3), "-i", file, "-vn", "-ac", "1", "-ar", "24000", wav]);
    const len = await trim(wav, cut, 0.15);
    await loudEnough(cut);
    const text = pick.map((x) => String(x.text).trim()).join(" ").replace(/\s+/g, " ");
    return keep(cut, text, len, "file");
  } finally {
    for (const f of [mp3, wav, cut]) fs.rmSync(f, { force: true });
  }
}

/** 샘플로 읽을 글 — 녹음한 글자 그대로 (2026-10-19 사장님: ▶ 누르면 녹음한 글자가 나와야) */
const sampleText = (me) => (me && me.text) || SAMPLE_TEXT;
/** 등록한 목소리로 샘플 — 녹음한 글자를 내 목소리로 읽는다. 등록 직후·카드 ▶ 에서 들려준다 */
async function sample() {
  const me = readJson(ME.json);
  const t = sampleText(me);
  if (!fs.existsSync(ME.sample) || !me || me.sampleText !== t) {
    await say(t, ME.sample);
    if (me) fs.writeFileSync(ME.json, JSON.stringify({ ...me, sampleText: t }));
  }
  return ME.sample;
}

function remove() {
  stopWorker();
  for (const f of Object.values(ME)) fs.rmSync(f, { force: true });
  return status();
}

module.exports = { status, update, install, register, registerFile, sample, say, stamp, remove, stopWorker, READ_TEXT, SAMPLE_TEXT, ROOT };
