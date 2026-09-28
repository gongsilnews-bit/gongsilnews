/* ══════════════════════════════════════════════════════════════
   결과표 한 장 그림 (PNG)

   임대인에게 보내는 제안서로도 쓰도록, 결과표 전체를 세로 한 장으로 그린다.
   바깥 라이브러리(html2canvas 등) 없이 canvas 로 직접 그린다 — 확장은 원격 코드를 못 쓴다.
   ══════════════════════════════════════════════════════════════ */

async function rmDrawSheet(result) {
  const W = 1200;
  const P = 56;
  const inner = W - P * 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = 9000; // 넉넉히 그린 뒤 쓴 만큼만 잘라 낸다
  const ctx = canvas.getContext("2d");
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  const C = { ink: "#111827", sub: "#4b5563", muted: "#6b7280", line: "#e5e7eb", brand: "#1d4ed8", accent: "#f4a71b", red: "#dc2626", soft: "#f8fafc" };

  const font = (size, weight = 400) => { ctx.font = `${weight} ${size}px ${FONT}`; };
  /* 한글은 글자 단위로 줄을 바꾼다 */
  const wrap = (text, maxW) => {
    const lines = [];
    for (const para of String(text || "").split("\n")) {
      let line = "";
      for (const ch of para) {
        if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch.trim() ? ch : ""; }
        else line += ch;
      }
      lines.push(line);
    }
    return lines;
  };
  const text = (str, x, y, size, weight, color, maxW, lh) => {
    font(size, weight);
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    const lines = maxW ? wrap(str, maxW) : [String(str || "")];
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * (lh || size * 1.55)));
    return y + lines.length * (lh || size * 1.55);
  };
  const loadImg = (src) => new Promise((ok) => {
    if (!src) return ok(null);
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
  /* 칸 안에 비율을 지켜 꽉 채운다 (가운데 기준으로 잘라 냄) */
  const cover = (img, x, y, w, h) => {
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(x, y, w, h);
    if (!img) return;
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  };
  const label = (str, x, y, bg) => {
    font(15, 800);
    const w = ctx.measureText(str).width + 20;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, 28);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(str, x + 10, y + 14);
  };
  const section = (title, y) => {
    ctx.fillStyle = C.brand;
    ctx.fillRect(P, y + 4, 5, 22);
    return text(title, P + 16, y, 22, 800, C.ink) + 12;
  };

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, canvas.height);

  /* ── 머리 ── */
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, 150);
  text("공실뉴스", P, 34, 20, 800, C.accent);
  text("건물 외관 리모델링 예측 시뮬레이션 결과표", P, 62, 32, 800, "#ffffff");
  const sub = [result.title, result.location, result.dateText].filter(Boolean).join("  ·  ");
  text(sub, P, 110, 16, 500, "#cbd5e1", inner);
  let y = 184;

  /* ── 전·후 ── */
  y = section("현재 외관  →  예측 외관", y);
  const before = await loadImg(result.beforeUrl);
  const versions = result.versions || [];
  const colW = (inner - 24) / 2;
  const imgH = Math.round(colW * 0.72);
  cover(before, P, y, colW, imgH);
  label("현재", P + 12, y + 12, "#374151");
  const first = versions[0] ? await loadImg(versions[0].imageUrl) : null;
  cover(first, P + colW + 24, y, colW, imgH);
  label(versions.length > 1 ? "예측 · 버전 1" : "예측", P + colW + 36, y + 12, C.brand);
  y += imgH + 12;
  if (versions[0] && versions[0].diffKo) y = text(`버전 1 · ${versions[0].diffKo}`, P + colW + 24, y, 15, 500, C.sub, colW) + 8;
  y += 16;

  /* 버전이 더 있으면 두 장씩 */
  for (let i = 1; i < versions.length; i += 2) {
    const pair = versions.slice(i, i + 2);
    const imgs = await Promise.all(pair.map((v) => loadImg(v.imageUrl)));
    let rowBottom = y + imgH + 12;
    pair.forEach((v, k) => {
      const x = P + k * (colW + 24);
      cover(imgs[k], x, y, colW, imgH);
      label(`예측 · 버전 ${i + k + 1}`, x + 12, y + 12, C.brand);
      if (v.diffKo) rowBottom = Math.max(rowBottom, text(`버전 ${i + k + 1} · ${v.diffKo}`, x, y + imgH + 12, 15, 500, C.sub, colW) + 8);
    });
    y = rowBottom + 16;
  }

  /* ── 디자인 사양표 ── */
  y = section("디자인 사양표", y + 8);
  const spec = result.designSpec || {};
  for (const key of Object.keys(RM_SPEC_LABELS)) {
    if (!spec[key]) continue;
    ctx.fillStyle = C.soft;
    const rowTop = y;
    font(16, 500);
    const lines = wrap(spec[key], inner - 200);
    const h = Math.max(44, lines.length * 25 + 18);
    ctx.fillRect(P, rowTop, 170, h);
    ctx.strokeStyle = C.line;
    ctx.strokeRect(P, rowTop, inner, h);
    text(RM_SPEC_LABELS[key], P + 16, rowTop + 12, 16, 800, C.sub);
    text(spec[key], P + 190, rowTop + 10, 16, 500, C.ink, inner - 200, 25);
    y = rowTop + h;
  }
  y += 28;

  /* ── 예상 공사비 ── */
  const cost = result.cost;
  if (cost) {
    y = section("예상 공사비 (개략)", y);
    ctx.fillStyle = "#fffbeb";
    ctx.fillRect(P, y, inner, 70);
    text(cost.rangeText, P + 20, y + 16, 30, 800, "#92400e");
    y += 84;
    text(`외벽 면적 약 ${cost.area}m² (${cost.basisText}) · 창 면적 약 ${cost.windowArea}m²`, P, y, 15, 500, C.muted, inner);
    y += 32;
    for (const it of cost.items) {
      ctx.strokeStyle = C.line;
      ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(P + inner, y); ctx.stroke();
      text(it.label, P + 4, y + 10, 16, 800, C.ink);
      text(it.basis || "", P + 190, y + 12, 14, 500, C.muted, inner - 480);
      font(16, 700);
      ctx.fillStyle = C.ink;
      const amt = `${rmWon(it.min)} ~ ${rmWon(it.max)}`;
      ctx.fillText(amt, P + inner - ctx.measureText(amt).width - 4, y + 10);
      y += 44;
    }
    y = text(`※ ${cost.notice} (${cost.excludes})`, P, y + 10, 16, 800, C.red, inner) + 24;
  }

  /* ── 제약·보존 규칙 / 주의 ── */
  if (result.constraints) {
    y = section("제약·보존 규칙", y);
    y = text(result.constraints, P, y, 16, 500, C.sub, inner, 26) + 24;
  }
  if (result.disclaimer) {
    ctx.fillStyle = "#fef2f2";
    font(15, 500);
    const lines = wrap(result.disclaimer, inner - 40);
    const h = lines.length * 24 + 50;
    ctx.fillRect(P, y, inner, h);
    text("주의 문구", P + 20, y + 14, 15, 800, C.red);
    text(result.disclaimer, P + 20, y + 38, 15, 500, "#7f1d1d", inner - 40, 24);
    y += h + 24;
  }

  text("© 공실뉴스 gongsilnews.com · 개념 시뮬레이션 결과이며 실제 시공·구조 안전·법규 적합을 보장하지 않습니다.", P, y, 13, 500, C.muted, inner);
  y += 40;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = Math.ceil(y);
  out.getContext("2d").drawImage(canvas, 0, 0);
  return out.toDataURL("image/png");
}

/* data URL 을 파일로 내려받는다 */
function rmDownload(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
