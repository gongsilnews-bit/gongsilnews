// 설치 파일에 넣을 FFmpeg(윈도우 64비트, LGPL 빌드)를 vendor/ffmpeg 에 받아 둔다.
// GPL 부품(x264 등)이 들어간 빌드는 앱 소스 공개 의무가 생길 수 있어 LGPL 빌드만 쓴다.
// H.264(MP4)는 윈도우 내장 인코더(h264_mf)로 만든다.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ZIP_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-win64-lgpl-shared-8.1.zip";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "vendor", "ffmpeg");

if (existsSync(join(outDir, "ffmpeg.exe"))) {
  console.log("FFmpeg 이미 있음:", outDir);
  process.exit(0);
}

const work = join(tmpdir(), `gongsil-ffmpeg-${Date.now()}`);
mkdirSync(work, { recursive: true });
const zip = join(work, "ffmpeg.zip");
console.log("FFmpeg 받는 중…", ZIP_URL);
execFileSync("curl", ["-L", "--fail", "-o", zip, ZIP_URL], { stdio: "inherit" });
// 윈도우 기본 tar(bsdtar)는 zip을 풀 수 있다. Git Bash의 GNU tar는 C: 경로를 못 읽는다
const tar = process.platform === "win32" ? join(process.env.SystemRoot || "C:\Windows", "System32", "tar.exe") : "tar";
execFileSync(tar, ["-xf", zip, "-C", work], { stdio: "inherit" });

const findBin = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (existsSync(join(p, "bin", "ffmpeg.exe"))) return join(p, "bin");
      const found = findBin(p);
      if (found) return found;
    }
  }
  return null;
};
const bin = findBin(work);
if (!bin) throw new Error("압축 안에서 ffmpeg.exe 를 찾지 못함");

mkdirSync(outDir, { recursive: true });
// shared 빌드: ffmpeg.exe·ffprobe.exe가 같은 DLL을 함께 써서 크기가 절반 이하로 준다
for (const f of readdirSync(bin)) if (/\.(exe|dll)$/i.test(f) && f !== "ffplay.exe") copyFileSync(join(bin, f), join(outDir, f));
const license = readdirSync(join(bin, "..")).find((n) => /^LICENSE/i.test(n));
if (license) copyFileSync(join(bin, "..", license), join(outDir, "LICENSE.txt"));
rmSync(work, { recursive: true, force: true });
console.log("FFmpeg 준비 완료:", outDir);
