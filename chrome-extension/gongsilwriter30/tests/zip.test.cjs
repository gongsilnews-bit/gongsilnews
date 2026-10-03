const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const GWZip = require("../shared/zip.js");

/* 중앙 목록을 읽어 파일 이름·크기·CRC 를 돌려준다 (간단한 ZIP 읽기) */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = [];
  for (let i = 0; i < count; i += 1) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const flags = view.getUint16(at + 8, true);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const offset = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const localNameLength = view.getUint16(offset + 26, true);
    const data = bytes.subarray(offset + 30 + localNameLength, offset + 30 + localNameLength + size);
    files.push({ name, flags, crc, data });
    at += 46 + nameLength;
  }
  return files;
}

test("한글 이름 파일을 담고, 담긴 내용과 CRC 가 맞다", () => {
  const photo = new Uint8Array([1, 2, 3, 4, 5]);
  const zip = GWZip.build([
    { name: "공실뉴스_인스타그램/01_대표.jpg", data: photo },
    { name: "공실뉴스_인스타그램/인스타그램_글.txt", data: GWZip.textBytes("첫 줄\n둘째 줄") },
  ]);
  const files = readZip(zip);
  assert.deepEqual(files.map((f) => f.name), ["공실뉴스_인스타그램/01_대표.jpg", "공실뉴스_인스타그램/인스타그램_글.txt"]);
  assert.ok(files.every((f) => f.flags & 0x0800), "UTF-8 이름 표시");
  assert.deepEqual([...files[0].data], [1, 2, 3, 4, 5]);
  assert.equal(files[0].crc, zlib.crc32 ? zlib.crc32(Buffer.from(photo)) : GWZip.crc32(photo));
});

test("TXT 는 메모장용 — UTF-8 BOM 과 윈도 줄바꿈", () => {
  const bytes = GWZip.textBytes("가\n나");
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(new TextDecoder().decode(bytes.subarray(3)), "가\r\n나");
});

test("CRC32 표준값", () => {
  assert.equal(GWZip.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});
