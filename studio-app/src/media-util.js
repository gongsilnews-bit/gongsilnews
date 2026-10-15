// 사진 파일 도우미: 미리보기 썸네일, data URL → 파일 저장(webp 등은 jpg 로)
const { nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { ffmpegPath } = require("./paths");

function thumbOf(file, width = 480) {
  try {
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) return null;
    return img.resize({ width, quality: "good" }).toDataURL();
  } catch {
    return null;
  }
}

/* webp 등은 앱 이미지 도구·네이버 붙여넣기에서 안전한 jpg 로 바꾼다 (앱에 넣은 FFmpeg) */
function toJpeg(src, dest) {
  const ff = ffmpegPath();
  if (!ff) return Promise.resolve(src);
  return new Promise((resolve) => {
    execFile(ff, ["-y", "-loglevel", "error", "-i", src, "-q:v", "2", dest], (err) => {
      if (err || !fs.existsSync(dest)) return resolve(src);
      fs.rmSync(src, { force: true });
      resolve(dest);
    });
  });
}

/* data:image/...;base64,... 를 dir 안에 base 이름으로 저장하고 파일 경로를 돌려준다 */
async function saveDataUrl(dataUrl, dir, base) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(dataUrl || ""));
  if (!m) throw new Error("사진 파일을 읽지 못했습니다.");
  const ext = /png/i.test(m[1]) ? "png" : /jpe?g/i.test(m[1]) ? "jpg" : /webp/i.test(m[1]) ? "webp" : /gif/i.test(m[1]) ? "gif" : "img";
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${base}.${ext}`);
  fs.writeFileSync(file, Buffer.from(m[2], "base64"));
  return ext === "jpg" || ext === "png" ? file : toJpeg(file, path.join(dir, `${base}.jpg`));
}

module.exports = { thumbOf, toJpeg, saveDataUrl };
