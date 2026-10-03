/* ══════════════════════════════════════════════════════════════
   실거래 시세표 이미지 — "단지 시세" · "우리동네 시세"에서 불러온 표를 기사 사진으로

   작업창 화면을 캡처하지 않고 같은 숫자로 깔끔한 표 그림을 새로 그린다 (글자가 선명하고 버튼·테두리가 안 찍힌다).
   초안이 오면 기사 첫 문단 다음에 넣는다 (panel.js addMarketChart). 블로그는 기사 사진을 그대로 가져간다.
   자료는 국토교통부 공개 실거래가라 다른 서비스 화면을 가져다 쓰는 저작권 문제가 없다.
   ══════════════════════════════════════════════════════════════ */

const GW_CHART = {
  width: 1200,
  pad: 56,
  font: '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
  orange: "#ff8e15",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  head: "#f1f5f9",
  blue: "#1e3a8a",
  blueBg: "#eff6ff",
};

/* 표에 넣을 줄 — 그리기와 따로 둬서 테스트할 수 있다 */
function gwMarketChartTables(source) {
  if (source.mode === "complex") {
    const d = source.complex.data;
    const s = d.summary;
    return [{
      head: ["전용면적", "매매", "최근 거래", "최고가", "전세가율"],
      widths: [0.22, 0.12, 0.32, 0.18, 0.16],
      rows: s.areas.slice(0, 4).map((a) => [
        `${a.areaKey} (${a.pyeong}평)`,
        `${a.tradeCount}건`,
        a.latest ? [gwPrice(a.latest.price), `${a.latest.date} · ${a.latest.floor}층`] : "-",
        a.high ? gwPrice(a.high.price) : "-",
        a.jeonseRatio ? `${a.jeonseRatio}%` : "-",
      ]),
    }];
  }
  const s = source.local.data.summary;
  const tables = [{
    head: ["기간", "아파트 매매", "3.3㎡당 가격(가운데 값)"],
    widths: [0.36, 0.24, 0.40],
    rows: [
      [`${s.periodRecent} (최근 석 달)`, `${s.recentCount}건`, gwPrice(s.recentMedianPerPyeong)],
      [`${s.periodBefore} (그 전 석 달)`, `${s.beforeCount}건`, gwPrice(s.beforeMedianPerPyeong)],
    ],
  }];
  if (s.topComplexes.length) {
    tables.push({
      head: ["거래 많은 단지", "매매", "3.3㎡당"],
      widths: [0.50, 0.18, 0.32],
      rows: s.topComplexes.map((c) => [c.name, `${c.tradeCount}건`, gwPrice(c.medianPerPyeong)]),
    });
  }
  return tables;
}

function gwMarketChartTitle(source) {
  if (source.mode === "complex") {
    const d = source.complex.data;
    return {
      kicker: "공실뉴스 · 단지 시세",
      title: `${d.complexName || d.target.name} 실거래 시세`,
      sub: `${d.target.address}${d.summary.buildYear ? ` · ${d.summary.buildYear}년 준공` : ""} · 최근 12개월 매매`,
    };
  }
  const d = source.local.data;
  return {
    kicker: "공실뉴스 · 우리동네 시세",
    title: `${d.target.name} 아파트 실거래 동향`,
    sub: `신고가 끝난 최근 석 달과 그 전 석 달 비교 (${d.summary.pendingMonths}은 신고 중이라 제외)`,
  };
}

/* 글을 폭에 맞춰 줄로 나눈다 — 띄어쓰기에서 끊고, 한 낱말이 폭보다 길 때만 글자 단위로 끊는다 */
function gwChartWrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  const push = () => { if (line) lines.push(line); line = ""; };
  for (const word of String(text || "").split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    push();
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    for (const char of word) {
      if (ctx.measureText(line + char).width > maxWidth && line) push();
      line += char;
    }
  }
  push();
  return lines;
}

/* source + 한 줄 읽기 문장 → PNG data URL. 그릴 수 없으면 "" */
function gwMarketChartImage(source, reading, today = new Date()) {
  if (typeof document === "undefined") return "";
  const C = GW_CHART;
  const W = C.width;
  const inner = W - C.pad * 2;
  const tables = gwMarketChartTables(source);
  const title = gwMarketChartTitle(source);

  /* 높이를 먼저 잰다 */
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `600 24px ${C.font}`;
  const readingLines = reading ? gwChartWrap(measure, `💡 ${reading}`, inner - 48) : [];
  const ROW = 64;
  const TALL_ROW = 84;
  const tableHeight = tables.reduce((sum, t) => sum + 56 + t.rows.reduce((h, r) => h + (r.some(Array.isArray) ? TALL_ROW : ROW), 0) + 28, 0);
  const HEAD = 96 + 40 + 64 + 74; // 머리 띠 · 여백 · 제목 · 부제
  const H = HEAD + tableHeight + (readingLines.length ? readingLines.length * 36 + 44 + 24 : 0) + 90;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);

  /* 머리 띠 */
  g.fillStyle = C.orange;
  g.fillRect(0, 0, W, 96);
  g.fillStyle = "#ffffff";
  g.font = `800 32px ${C.font}`;
  g.textBaseline = "middle";
  g.fillText(title.kicker, C.pad, 48);
  const pad2 = (n) => String(n).padStart(2, "0");
  const dateText = `${today.getFullYear()}.${pad2(today.getMonth() + 1)}.${pad2(today.getDate())} 기준`;
  g.font = `600 24px ${C.font}`;
  g.textAlign = "right";
  g.fillText(dateText, W - C.pad, 48);
  g.textAlign = "left";

  let y = 96 + 40;
  g.fillStyle = C.ink;
  g.font = `800 46px ${C.font}`;
  g.textBaseline = "top";
  g.fillText(gwChartWrap(g, title.title, inner)[0], C.pad, y);
  y += 56 + 8;
  g.fillStyle = C.muted;
  g.font = `500 23px ${C.font}`;
  g.fillText(gwChartWrap(g, title.sub, inner)[0], C.pad, y);
  y += 44 + 30;

  /* 표 */
  for (const table of tables) {
    const xs = [];
    let x = C.pad;
    for (const w of table.widths) {
      xs.push(x);
      x += w * inner;
    }
    g.fillStyle = C.head;
    g.fillRect(C.pad, y, inner, 56);
    g.fillStyle = "#334155";
    g.font = `800 24px ${C.font}`;
    g.textBaseline = "middle";
    table.head.forEach((h, i) => {
      const right = i > 0;
      g.textAlign = right ? "right" : "left";
      g.fillText(h, right ? xs[i] + table.widths[i] * inner - 16 : xs[i] + 16, y + 28);
    });
    y += 56;
    table.rows.forEach((row) => {
      const tall = row.some(Array.isArray);
      const h = tall ? TALL_ROW : ROW;
      row.forEach((cell, i) => {
        const right = i > 0;
        const tx = right ? xs[i] + table.widths[i] * inner - 16 : xs[i] + 16;
        g.textAlign = right ? "right" : "left";
        if (Array.isArray(cell)) {
          g.fillStyle = C.ink;
          g.font = `800 26px ${C.font}`;
          g.fillText(cell[0], tx, y + h / 2 - 14);
          g.fillStyle = C.muted;
          g.font = `500 19px ${C.font}`;
          g.fillText(cell[1], tx, y + h / 2 + 18);
        } else {
          g.fillStyle = C.ink;
          g.font = `${right ? 800 : 600} 26px ${C.font}`;
          g.fillText(gwChartWrap(g, cell, table.widths[i] * inner - 32)[0], tx, y + h / 2);
        }
      });
      y += h;
      g.fillStyle = C.line;
      g.fillRect(C.pad, y - 1, inner, 2);
    });
    g.textAlign = "left";
    y += 28;
  }

  /* 한 줄 읽기 */
  if (readingLines.length) {
    const boxH = readingLines.length * 36 + 44;
    g.fillStyle = C.blueBg;
    g.fillRect(C.pad, y, inner, boxH);
    g.fillStyle = C.blue;
    g.font = `600 24px ${C.font}`;
    g.textBaseline = "top";
    readingLines.forEach((line, i) => g.fillText(line, C.pad + 24, y + 22 + i * 36));
    y += boxH + 24;
  }

  /* 출처 */
  g.fillStyle = C.muted;
  g.font = `500 20px ${C.font}`;
  g.textBaseline = "top";
  g.fillText("자료: 국토교통부 실거래가 공개시스템 (신고 기준 · 최근 거래는 집계 중) · 공실뉴스 정리", C.pad, H - 62);

  return canvas.toDataURL("image/png");
}

const GW_MARKET_CHART_CAPTION = "자료: 국토교통부 실거래가 공개시스템(신고 기준) · 공실뉴스 정리";

if (typeof module !== "undefined" && module.exports) {
  module.exports = { gwMarketChartTables, gwMarketChartTitle, GW_MARKET_CHART_CAPTION };
}
