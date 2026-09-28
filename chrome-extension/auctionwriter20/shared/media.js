/* ══════════════════════════════════════════════════════════════
   기사 사진 만들기 — 자르기와 대체 카드

   gongsilwriter 의 cropRegion / generate*Fallback 을 가져와 정리한 것이다.
   여기 있는 것은 전부 순수 함수다. 탭도 저장소도 건드리지 않는다.

   사진은 webp 로 낸다. 공실뉴스가 쓰는 형식과 같고, 같은 화질에서
   jpeg 보다 훨씬 작아 저장 한도에 걸리지 않는다.
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   화면 캡쳐에서 한 영역만 잘라낸다

   캡쳐 이미지의 크기와 실제 화면(뷰포트) 크기가 다르다.
   그 배율을 맞춰야 좌표가 어긋나지 않는다.
   ══════════════════════════════════════════════════════════════ */
function gwCropRegion(dataUrl, rect, viewport, force16x9 = true) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);

    const img = new Image();

    img.onload = () => {
      try {
        const totalW = img.naturalWidth || img.width;
        const totalH = img.naturalHeight || img.height;
        if (totalW <= 100 || totalH <= 100) return resolve(null);

        /* 배율은 반드시 "찍힌 탭의 뷰포트" 기준이다.
           작업창 너비를 쓰면 엉뚱한 데가 잘린다. */
        const vpW = (viewport && viewport.width) || 1200;
        const vpH = (viewport && viewport.height) || 900;
        const scaleX = totalW / vpW;
        const scaleY = totalH / vpH;

        let sx = 0, sy = 0, sw = totalW, sh = totalH;

        if (rect && rect.width > 20 && rect.height > 20) {
          sx = Math.round(rect.left * scaleX);
          sy = Math.round(rect.top * scaleY);
          sw = Math.round(rect.width * scaleX);
          sh = Math.round(rect.height * scaleY);

          sx = Math.max(0, Math.min(sx, totalW - 40));
          sy = Math.max(0, Math.min(sy, totalH - 40));
          if (sx + sw > totalW) sw = totalW - sx;
          if (sy + sh > totalH) sh = totalH - sy;

          if (force16x9 && sw > 50) {
            const targetH = Math.round((sw * 9) / 16);
            if (sy + targetH <= totalH) {
              sh = targetH;
            } else if (targetH <= totalH) {
              sy = Math.max(0, totalH - targetH);
              sh = targetH;
            } else {
              sh = totalH - sy;
              sw = Math.round((sh * 16) / 9);
              if (sx + sw > totalW) sx = Math.max(0, totalW - sw);
            }
          }
        } else {
          sw = Math.round(totalW * 0.65);
          sh = Math.round((sw * 9) / 16);
          sx = Math.round(totalW * 0.1);
          sy = Math.round(totalH * 0.08);
        }

        if (sx < 0) sx = 0;
        if (sy < 0) sy = 0;
        if (sx + sw > totalW) sw = totalW - sx;
        if (sy + sh > totalH) sh = totalH - sy;
        if (sw <= 20 || sh <= 20) return resolve(null);

        /* 저장 한도에 걸리지 않도록 가로 1280px 로 줄인다.
           기사 사진으로는 넉넉하고, base64 크기는 서너 배 작아진다. */
        const MAX_W = 1280;
        const outW = Math.min(sw, MAX_W);
        const outH = Math.round((sh * outW) / sw);

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        /* 투명한 자리가 검게 나오지 않도록 흰 바탕을 먼저 깐다 */
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        resolve(canvas.toDataURL("image/webp", 0.85));
      } catch (e) {
        console.warn("[공실뉴스] 크롭 실패:", e);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/* ══════════════════════════════════════════════════════════════
   대체 카드

   캡쳐가 실패했을 때 쓴다. 없는 사실을 그리지 않는다 —
   가진 값만 글자로 적은 카드다. 사진인 척하지 않는다.
   ══════════════════════════════════════════════════════════════ */
function gwCard(lines, opts = {}) {
  const W = 800;
  const H = 450; /* 16:9 */
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = opts.bg || "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  /* 위쪽 색 띠 */
  ctx.fillStyle = opts.accent || "#2563eb";
  ctx.fillRect(16, 16, W - 32, 7);

  const font = (size, weight = "700") =>
    `${weight} ${size}px -apple-system, "Pretendard", "Noto Sans KR", sans-serif`;

  ctx.textAlign = "center";

  if (opts.badge) {
    ctx.fillStyle = opts.accent || "#2563eb";
    ctx.font = font(17, "800");
    ctx.fillText(opts.badge, W / 2, 76);
  }

  let y = opts.badge ? 140 : 110;
  for (const line of lines) {
    if (!line || !line.text) continue;
    ctx.fillStyle = line.color || "#0f172a";
    ctx.font = font(line.size || 22, line.weight || "700");
    /* 너무 길면 잘라 준다 — 카드 밖으로 넘치지 않게 */
    let text = String(line.text);
    while (ctx.measureText(text).width > W - 90 && text.length > 6) {
      text = text.slice(0, -2);
    }
    if (text !== String(line.text)) text += "…";
    ctx.fillText(text, W / 2, y);
    y += (line.size || 22) + 18;
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = font(13, "600");
  ctx.fillText("공실뉴스 · gongsilnews.com", W / 2, H - 38);

  return canvas.toDataURL("image/webp", 0.9);
}

function gwProofCard(v) {
  return gwCard(
    [
      { text: v.title || "경매·공매 물건", size: 28, weight: "800" },
      { text: v.priceText || "", size: 24, color: "#2563eb", weight: "800" },
      { text: gwField(v, "소재지(지번)", "소재지") || "", size: 17, color: "#475569", weight: "600" },
      { text: gwField(v, "관리번호", "사건번호")
          ? `${gwField(v, "관리번호") ? "관리번호" : "사건번호"} ${gwField(v, "관리번호", "사건번호")}`
          : "", size: 15, color: "#64748b", weight: "600" },
    ],
    { badge: `공실열람 ${(v && v.saleKind) || "경매"} 물건 정보`, accent: "#2563eb" }
  );
}

function gwMapCard(v) {
  return gwCard(
    [
      { text: gwField(v, "소재지(지번)", "소재지") || v.title || "", size: 24, weight: "800" },
      { text: v.infra || "", size: 15, color: "#475569", weight: "600" },
    ],
    { badge: "위치 정보", accent: "#059669", bg: "#f0fdf4" }
  );
}

function gwRoadviewCard(v) {
  return gwCard(
    [
      { text: v.title || "", size: 26, weight: "800" },
      { text: "현장 전경 · 로드뷰를 불러오지 못했습니다", size: 16, color: "#64748b", weight: "600" },
    ],
    { badge: "현장 로드뷰", accent: "#b45309", bg: "#fffbeb" }
  );
}

/* ══════════════════════════════════════════════════════════════
   사진마다 붙는 설명글

   기사 본문에 그대로 들어간다. 가진 값만 쓴다.
   ══════════════════════════════════════════════════════════════ */
function gwCaptionFor(kind, v, index = 0) {
  const name = (v && (v.title || gwField(v, "소재지(지번)", "소재지"))) || "해당 물건";
  const saleKind = (v && v.saleKind) || "경매";
  const price = (v && v.priceText) || "";

  switch (kind) {
    case "proof":
      return `[공실열람 ${saleKind} 물건 정보] 공실뉴스 공실열람에 게재된 '${name}'${price ? ` (${price})` : ""} ${saleKind} 물건 현황`;
    case "photo":
      return index === 0
        ? `${name} 전경 (자료: 공실뉴스)`
        : `${name} 사진 ${index + 1} (자료: 공실뉴스)`;
    case "map":
      return `[위치 지도] ${name} 위치 및 주변 환경 (자료: 위치정보 지도)`;
    case "roadview":
      return `[현장 로드뷰] ${name} 진입로 및 가로변 전경 (자료: 로드뷰)`;
    default:
      return name;
  }
}
