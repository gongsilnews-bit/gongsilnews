// 앱 안에 넣은 FFmpeg 위치 (설치판: resources/ffmpeg, 개발: vendor/ffmpeg)
const { app } = require("electron");
const path = require("path");
const fs = require("fs");

function ffmpegPath() {
  const dir = app.isPackaged ? path.join(process.resourcesPath, "ffmpeg") : path.join(__dirname, "..", "vendor", "ffmpeg");
  const exe = path.join(dir, "ffmpeg.exe");
  return fs.existsSync(exe) ? exe : null;
}

module.exports = { ffmpegPath };
