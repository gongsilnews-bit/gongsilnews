/* ══════════════════════════════════════════════════════════════
   ZIP 묶기 — SNS [글·사진 받기]가 사진 여러 장 + 글(TXT)을 파일 하나로 내려받게 한다

   확장은 바깥 라이브러리를 불러올 수 없어(MV3) 직접 만든다. 사진(JPG)은 이미 압축돼 있으므로
   다시 압축하지 않고 그대로 담는다(store). 한글 파일 이름이 깨지지 않게 UTF-8 표시(bit 11)를 켠다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  /* ZIP 의 날짜 칸 (MS-DOS 형식) */
  function dosTime(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
  }

  /* files: [{ name: "폴더/01_대표.jpg", data: Uint8Array }] → ZIP 바이트(Uint8Array) */
  function build(files, now = new Date()) {
    const encoder = new TextEncoder();
    const { time, day } = dosTime(now);
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
      const crc = crc32(data);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); // 로컬 파일 머리
      local.setUint16(4, 20, true);         // 필요한 버전 2.0
      local.setUint16(6, 0x0800, true);     // 파일 이름이 UTF-8
      local.setUint16(8, 0, true);          // 압축 안 함(store)
      local.setUint16(10, time, true);
      local.setUint16(12, day, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      locals.push(new Uint8Array(local.buffer), name, data);

      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true); // 중앙 목록 머리
      central.setUint16(4, 20, true);
      central.setUint16(6, 20, true);
      central.setUint16(8, 0x0800, true);
      central.setUint16(10, 0, true);
      central.setUint16(12, time, true);
      central.setUint16(14, day, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, data.length, true);
      central.setUint32(24, data.length, true);
      central.setUint16(28, name.length, true);
      central.setUint16(30, 0, true);
      central.setUint16(32, 0, true);
      central.setUint16(34, 0, true);
      central.setUint16(36, 0, true);
      central.setUint32(38, 0, true);
      central.setUint32(42, offset, true);
      centrals.push(new Uint8Array(central.buffer), name);

      offset += 30 + name.length + data.length;
    }

    const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); // 끝 머리
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let at = 0;
    for (const part of parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }

  /* data:...;base64,... → Uint8Array */
  function dataUrlBytes(dataUrl) {
    const base64 = String(dataUrl).split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /* 메모장에서 한글이 깨지지 않게 UTF-8 BOM + 윈도 줄바꿈 */
  function textBytes(text) {
    const body = new TextEncoder().encode(String(text || "").replace(/\r?\n/g, "\r\n"));
    const out = new Uint8Array(body.length + 3);
    out.set([0xef, 0xbb, 0xbf], 0);
    out.set(body, 3);
    return out;
  }

  const api = { build, crc32, dataUrlBytes, textBytes };
  globalThis.GWZip = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
