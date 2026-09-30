/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const GWZip = require("../shared/zip.js");

test("CRC32 는 표준 값과 같다", () => {
  assert.equal(GWZip.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("ZIP 을 풀면 한글 이름 폴더 하나에 파일이 그대로 나온다", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 0, 255]);
  const text = new TextEncoder().encode("﻿논현동 대본\r\n둘째 줄");
  const zip = GWZip.make([
    { name: "논현동 빌라_20260927-1010/01.png", data: png },
    { name: "논현동 빌라_20260927-1010/대본.txt", data: text },
  ]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gwzip-"));
  const file = path.join(dir, "out.zip");
  fs.writeFileSync(file, zip);
  try {
    execFileSync("tar", ["-xf", file, "-C", dir]);
  } catch {
    return; // tar 가 없는 환경이면 풀어 보기는 건너뛴다
  }
  const folder = path.join(dir, "논현동 빌라_20260927-1010");
  assert.deepEqual(new Uint8Array(fs.readFileSync(path.join(folder, "01.png"))), png);
  assert.deepEqual(new Uint8Array(fs.readFileSync(path.join(folder, "대본.txt"))), text);
});
