/* ══════════════════════════════════════════════════════════════
   대표 이미지 상태

   - 저장된 예전 초안에는 isCover 가 없으므로 첫 사진을 대표로 보정한다.
   - 대표는 언제나 정확히 한 장만 유지한다.
   - 기사작성 폼으로 보낼 때는 대표 사진을 첫 순서로 만든다.
     기사작성 폼이 첫 업로드 사진을 대표로 지정하는 기존 규칙과 호환된다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  function normalize(media) {
    const list = Array.isArray(media) ? media : [];
    let coverIndex = list.findIndex((item) => item && item.isCover === true);
    if (coverIndex < 0 && list.length > 0) coverIndex = 0;

    return list.map((item, index) => ({
      ...item,
      isCover: index === coverIndex,
    }));
  }

  function select(media, index) {
    const list = normalize(media);
    if (!Number.isInteger(index) || index < 0 || index >= list.length) return list;

    return list.map((item, itemIndex) => ({
      ...item,
      isCover: itemIndex === index,
    }));
  }

  function indexOf(media) {
    return normalize(media).findIndex((item) => item.isCover);
  }

  function coverFirst(media) {
    const list = normalize(media);
    const coverIndex = list.findIndex((item) => item.isCover);
    if (coverIndex <= 0) return list;

    return [
      list[coverIndex],
      ...list.slice(0, coverIndex),
      ...list.slice(coverIndex + 1),
    ];
  }

  const api = { normalize, select, indexOf, coverFirst };
  globalThis.GWMediaCover = api;

  /* Node 내장 테스트에서도 같은 코드를 그대로 검증한다. */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
