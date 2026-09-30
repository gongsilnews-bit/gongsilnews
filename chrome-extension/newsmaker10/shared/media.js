/* ══════════════════════════════════════════════════════════════
   기사 사진 — 바깥 주소 사진을 보낼 수 있는 모양(data URL)으로 바꾸기

   뉴스메이커의 사진은 AI 이미지(ChatGPT·Gemini 화면의 주소)와 내 PC 사진뿐이다.
   AI 화면의 그림 주소는 그 사이트에서만 열리거나 "다운로드 파일"로 오기도 해서
   기사쓰기 폼·네이버 블로그가 직접 받지 못한다. 그래서 작업창(확장 권한)에서 받아
   그림으로 읽을 수 있는지 확인하고 JPG 로 바꿔 넘긴다. 그림이 아니거나 받지 못하면 null.
   여기 있는 것은 전부 순수 함수다. 탭도 저장소도 건드리지 않는다.
   ══════════════════════════════════════════════════════════════ */
async function gwImageToDataUrl(url, maxSide = 1600) {
  if (!url) return null;
  if (String(url).startsWith("data:")) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    /* 파일 형식 표시를 믿지 않고 내용으로 그림인지 본다 */
    const bitmap = await createImageBitmap(blob).catch(() => null);
    if (!bitmap) return null;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // 투명한 부분은 흰 바탕으로
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (_) {
    return null;
  }
}

/* 사진 목록의 바깥 주소를 모두 data URL 로 바꾼다. 못 바꾼 사진은 원래 주소 그대로 두고 failed 로 알린다. */
async function gwMediaToDataUrls(media) {
  const failed = [];
  const out = await Promise.all((media || []).map(async (item, index) => {
    if (!item || !item.url || String(item.url).startsWith("data:")) return item;
    const dataUrl = await gwImageToDataUrl(item.url);
    if (!dataUrl) {
      failed.push(index);
      return item;
    }
    return { ...item, url: dataUrl };
  }));
  return { media: out, failed };
}
