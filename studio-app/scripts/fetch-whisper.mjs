// 설치 파일에 넣을 Whisper(PC 받아쓰기, whisper.cpp · MIT)를 vendor/whisper 에 받아 둔다.
//  whisper-cli.exe + DLL (윈도우 64비트, CPU) + 모델 large-v3-turbo q5_0 (약 0.55GB, 한국어 포함 다국어)
//  자동 자막·내 목소리 등록 녹음 받아 적기에 쓴다 — 서버로 소리를 보내지 않고 무료 (회의: docs/2026-10-18_studio_ai_settings_meeting.md 3-16)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const BIN_URL = "https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip";
const MODEL = "ggml-large-v3-turbo-q5_0.bin";
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL}`;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "vendor", "whisper");
mkdirSync(outDir, { recursive: true });

if (!existsSync(join(outDir, "whisper-cli.exe"))) {
  const work = join(tmpdir(), `gongsil-whisper-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const zip = join(work, "whisper.zip");
  console.log("Whisper 받는 중…", BIN_URL);
  execFileSync("curl", ["-L", "--fail", "-o", zip, BIN_URL], { stdio: "inherit" });
  // 윈도우 기본 tar(bsdtar)는 zip을 풀 수 있다. Git Bash의 GNU tar는 C: 경로를 못 읽는다
  const tar = process.platform === "win32" ? join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
  execFileSync(tar, ["-xf", zip, "-C", work], { stdio: "inherit" });
  const findBin = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        const found = existsSync(join(p, "whisper-cli.exe")) ? p : findBin(p);
        if (found) return found;
      }
    }
    return null;
  };
  const bin = existsSync(join(work, "whisper-cli.exe")) ? work : findBin(work);
  if (!bin) throw new Error("압축 안에서 whisper-cli.exe 를 찾지 못함");
  // 받아쓰기에 필요한 것만 (whisper-cli + DLL)
  for (const f of readdirSync(bin)) if (/\.dll$/i.test(f) || f === "whisper-cli.exe") copyFileSync(join(bin, f), join(outDir, f));
  rmSync(work, { recursive: true, force: true });
} else console.log("Whisper 이미 있음:", outDir);

if (!existsSync(join(outDir, MODEL))) {
  console.log("Whisper 모델 받는 중… (약 0.55GB)", MODEL_URL);
  execFileSync("curl", ["-L", "--fail", "-o", join(outDir, `${MODEL}.part`), MODEL_URL], { stdio: "inherit" });
  copyFileSync(join(outDir, `${MODEL}.part`), join(outDir, MODEL));
  rmSync(join(outDir, `${MODEL}.part`), { force: true });
} else console.log("Whisper 모델 이미 있음");
console.log("Whisper 준비 완료:", outDir);
