/* ══════════════════════════════════════════════════════════════
   3단계 — 공실뉴스 기사작성 페이지 자동 입력

   제목 / 부제목 1·2·3 / 본문 / 사진 / 키워드 를 채운다.
   [기사 등록] 은 누르지 않는다. 사람이 읽어보고 누른다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  /* 기사쓰기 화면인지 */
  function isWritePage() {
    return GWWritePage.isNewArticleWriteUrl(location.href);
  }

  /* ── 본문 편집기 고르기 ──
     화면에 contenteditable 이 여럿일 수 있다. 기사 본문은 그중 가장 큰 것이고,
     인라인 스타일에 minHeight 360px 이 박혀 있다. */
  function findBodyEditor() {
    const all = Array.from(document.querySelectorAll(GW.ADMIN.BODY));
    if (!all.length) return null;
    const byStyle = all.find((el) => (el.style.minHeight || "").startsWith("360"));
    if (byStyle) return byStyle;
    return all.reduce((big, el) => (el.offsetHeight > (big?.offsetHeight || 0) ? el : big), null);
  }

  /* ══════════════════════════════════════════════════════════════
     사진 붙이기

     폼에는 숨은 파일 입력칸(#photo-upload)이 있고, 파일이 들어오면 폼이
     알아서 WebP 압축·대표 지정·미리보기까지 한다. 그 길을 그대로 탄다.

     ★ 중요 — 폼은 저장할 때 본문 HTML 안의 blob: 주소를 찾아
       업로드된 진짜 주소로 바꿔치기한다. 그래서 사진이 라이브러리에만
       있으면 본문에 안 실린다. 반드시 본문 HTML 에 그 blob 주소로
       심어 두어야 위치가 잡힌다.
     ══════════════════════════════════════════════════════════════ */

  async function toFile(url, name) {
    if (!url) return null;

    if (url.startsWith("data:")) {
      const m = url.match(/^data:([^;,]+)[^,]*,(.*)$/);
      if (!m) return null;
      const mime = m[1] || "image/webp";
      const bin = atob(m[2]);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return new File([buf], name, { type: mime });
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) throw new Error("이미지가 아님");
    return new File([blob], name, { type: blob.type });
  }

  const EXT = { "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/jpeg": "jpg" };
  const extOf = (mime) => EXT[mime] || "webp";
  const mimeOf = (url) =>
    (url || "").startsWith("data:") ? (url.match(/^data:([^;,]+)/) || [])[1] || "image/webp" : "image/webp";

  /* 사진 칸에 그려진 미리보기(blob:) 주소를 순서대로 읽는다 */
  function readPreviews() {
    return Array.from(document.querySelectorAll(GW.ADMIN.PHOTO_CAPTION)).map((inp) => {
      const card = inp.closest("div")?.parentElement;
      const img = card ? card.querySelector("img") : null;
      return img ? img.getAttribute("src") || "" : "";
    });
  }

  async function waitPhotoRows(want, timeoutMs) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      if (document.querySelectorAll(GW.ADMIN.PHOTO_CAPTION).length >= want) {
        await gwSleep(300); /* 마지막 한 장이 자리 잡을 틈 */
        return true;
      }
      await gwSleep(250);
    }
    return false;
  }

  /* 사진을 폼에 올리고, 본문에 심을 수 있게 미리보기 주소를 돌려준다 */
  async function attachPhotos(media) {
    const input = document.querySelector(GW.ADMIN.PHOTO_INPUT);
    if (!input) return { photos: [], failed: ["사진 입력칸을 찾지 못했습니다"] };

    const before = document.querySelectorAll(GW.ADMIN.PHOTO_CAPTION).length;
    /* 대표 사진을 첫 파일로 올리면 폼의 기존 자동 대표 지정 규칙을 그대로 탄다. */
    const orderedMedia = GWMediaCover.coverFirst(media);

    const files = [];
    const kept = [];
    const failed = [];

    for (let i = 0; i < orderedMedia.length; i++) {
      const m = orderedMedia[i];
      try {
        const f = await toFile(m.url, `gongsil_${Date.now()}_${i}.${extOf(mimeOf(m.url))}`);
        if (!f) throw new Error("빈 이미지");
        files.push(f);
        kept.push(m);
      } catch (e) {
        failed.push(`${i + 1}번째(${m.kind}) — ${e.message}`);
      }
    }

    if (!files.length) return { photos: [], failed };

    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await waitPhotoRows(before + files.length, 25000);

    /* 우리가 올린 것만 (앞에 있던 것은 건드리지 않는다) */
    const previews = readPreviews().slice(before);
    const caps = Array.from(document.querySelectorAll(GW.ADMIN.PHOTO_CAPTION)).slice(before);

    const photos = [];
    kept.forEach((m, i) => {
      if (!previews[i]) {
        failed.push(`${i + 1}번째(${m.kind}) — 미리보기를 찾지 못함`);
        return;
      }
      if (caps[i] && m.caption) gwSetReactValue(caps[i], m.caption);
      photos.push({
        preview: previews[i],
        caption: m.caption || "",
        kind: m.kind,
        isCover: m.isCover === true,
        insertAfterParagraph: Number.isInteger(m.insertAfterParagraph) ? m.insertAfterParagraph : null,
      });
    });

    return { photos, failed };
  }

  /* ══════════════════════════════════════════════════════════════
     본문 HTML 조립

     문단에는 아래 여백을 직접 넣는다. 편집기에는 p 여백 규칙이 없어서,
     넣지 않으면 문단이 다닥다닥 붙어 나온다.
     사진은 폼이 쓰는 것과 똑같은 .inserted-photo 모양으로 심는다.
     ══════════════════════════════════════════════════════════════ */
  const CSS_WRAP = "display: table; margin: 16px auto; text-align: center;";
  const CSS_IMG = "max-width: 600px; width: 100%; height: auto; border-radius: 6px; display: block;";
  const CSS_CAP =
    "display: table-caption; caption-side: bottom; font-size: 13px; color: #6b7280; margin: 8px 0 0 0; text-align: center; line-height: 1.5;";
  const CSS_P = "margin: 0 0 16px 0; line-height: 1.8;";
  const CSS_SECTION = "margin: 24px 0 8px 0; line-height: 1.6; font-weight: 800; color: #111827;";

  function figureHtml(p) {
    const cap = p.caption
      ? `<p style="${CSS_CAP}">${gwEscape(p.caption)}</p>`
      : "";
    return (
      `<div class="inserted-photo" contenteditable="false" style="${CSS_WRAP}">` +
      `<img src="${p.preview}" alt="${gwEscape(p.caption || "기사 이미지")}" style="${CSS_IMG}">` +
      cap +
      `</div><br>`
    );
  }

  function buildBodyHtml(bodyText, photos) {
    const paras = String(bodyText || "")
      .split(/\n{2,}|\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    let html = "";

    /* 대표 사진은 기사 맨 앞 — 작업창 초안과 같은 자리 */
    if (photos[0]) {
      html += figureHtml(photos[0]);
    }

    const slots = Array.from({ length: paras.length + 1 }, () => []);
    const automatic = [];

    photos.slice(1).forEach((photo) => {
      if (Number.isInteger(photo.insertAfterParagraph)) {
        const slot = Math.max(0, Math.min(photo.insertAfterParagraph, paras.length));
        slots[slot].push(photo);
      } else {
        automatic.push(photo);
      }
    });

    let autoIndex = 0;
    for (let slot = 1; slot < paras.length && autoIndex < automatic.length; slot += 1) {
      slots[slot].push(automatic[autoIndex]);
      autoIndex += 1;
    }
    while (autoIndex < automatic.length) {
      slots[paras.length].push(automatic[autoIndex]);
      autoIndex += 1;
    }

    html += slots[0].map(figureHtml).join("");
    paras.forEach((text, i) => {
      const paragraphStyle = text.startsWith("■") ? CSS_SECTION : CSS_P;
      html += `<p style="${paragraphStyle}">${gwEscape(text)}</p>`;
      html += slots[i + 1].map(figureHtml).join("");
    });

    return html;
  }

  /* ── 키워드 넣기 ──
     키워드 칸은 엔터를 쳐야 태그가 된다. 띄어쓰기로 붙여 넣고 엔터 한 번이면
     폼이 알아서 쪼갠다. React 상태가 따라오도록 한 박자 쉰다. */
  async function fillKeywords(input, keywords) {
    if (!input || !keywords.length) return false;
    gwSetReactValue(input, keywords.join(" "));
    await gwSleep(80);
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true })
    );
    await gwSleep(80);
    return true;
  }

  /* ══════════════════════════════════════════════════════════════
     폼 채우기
     ══════════════════════════════════════════════════════════════ */
  async function fillForm(draft) {
    const article = draft.article || {};
    const media = Array.isArray(draft.media) ? draft.media : [];

    const titleEl = await gwWaitFor(GW.ADMIN.TITLE, 20000);
    if (!titleEl) {
      gwToast("기사작성 폼을 찾지 못했습니다. 화면이 다 뜬 뒤 새로고침해 주세요.", "error", 7000);
      return false;
    }

    const bodyEl = findBodyEditor();

    /* 이미 쓰던 글이 있으면 말없이 덮지 않는다 */
    const hasExisting =
      (titleEl.value || "").trim().length > 0 ||
      (bodyEl && (bodyEl.innerText || "").trim().length > 0);

    if (hasExisting) {
      const ok = window.confirm("기사작성 화면에 이미 쓰던 내용이 있습니다.\nAI 기사 초안으로 덮어쓸까요?");
      if (!ok) {
        gwToast("덮어쓰지 않았습니다.", "info");
        return false;
      }
    }

    const done = [];
    const failed = [];

    /* 1. 제목 */
    if (article.title) {
      gwSetReactValue(titleEl, article.title);
      done.push("제목");
    }

    /* 2. 부제목 1·2·3 — 한 칸에 줄바꿈으로 */
    const subs = (article.subtitles || []).filter(Boolean);
    if (subs.length) {
      const subEl = document.querySelector(GW.ADMIN.SUBTITLE);
      if (subEl) {
        gwSetReactValue(subEl, subs.join("\n"));
        done.push(`부제목 ${subs.length}줄`);
      } else {
        failed.push("부제목");
      }
    }

    /* 3. 사진 먼저 — 본문에 심으려면 미리보기 주소가 먼저 나와야 한다 */
    let photos = [];
    if (media.length) {
      gwToast(`사진 ${media.length}장을 올리는 중입니다…`, "info", 25000);
      try {
        const r = await attachPhotos(media);
        photos = r.photos;
        if (r.failed.length) {
          console.warn("[공실뉴스] 사진 실패\n" + r.failed.join("\n"));
          failed.push(`사진 ${r.failed.length}장`);
        }
      } catch (e) {
        failed.push("사진(" + e.message + ")");
      }
    }

    /* 4. 본문 — 사진을 자리에 끼워 넣어 조립한다 */
    if (article.body) {
      if (bodyEl) {
        gwSetEditable(bodyEl, buildBodyHtml(article.body, photos));
        done.push("본문");
        if (photos.length) done.push(`사진 ${photos.length}장`);
      } else {
        failed.push("본문");
      }
    }

    /* 5. 키워드 */
    const kws = article.keywords || [];
    if (kws.length) {
      const kwEl = document.querySelector(GW.ADMIN.KEYWORD);
      if (kwEl) {
        await fillKeywords(kwEl, kws);
        done.push(`키워드 ${kws.length}개`);
      } else {
        failed.push("키워드");
      }
    }

    /* 무엇이 들어갔고 무엇이 안 들어갔는지 그대로 말한다. */
    if (failed.length) {
      gwToast(`${done.join(" · ")} 입력됨. 안 된 것 — ${failed.join(" · ")}`, "error", 9000);
    } else if (done.length) {
      gwToast(`${done.join(" · ")} 입력됨. 확인 후 [기사 등록] 을 눌러 주세요.`, "ok", 7000);
    } else {
      gwToast("AI 기사에 채울 내용이 없었습니다.", "error", 6000);
    }

    titleEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return done.length > 0;
  }

  let applying = null;

  async function applyPendingDraft() {
    if (!isWritePage()) {
      return { ok: false, error: "새 기사쓰기 화면이 아닙니다." };
    }

    if (applying) return applying;

    applying = (async () => {
      const store = await chrome.storage.local.get(GW.KEY.DRAFT);
      const draft = store[GW.KEY.DRAFT];
      if (!draft || !draft.article) {
        return { ok: false, error: "전송할 기사 초안을 찾지 못했습니다." };
      }

      /* 10분이 지난 것은 찌꺼기로 본다 */
      if (Date.now() - (draft.createdAt || 0) > 10 * 60 * 1000) {
        await chrome.storage.local.remove(GW.KEY.DRAFT);
        return { ok: false, error: "기사 초안이 만료되었습니다. 다시 보내 주세요." };
      }

      gwBusy("AI 기사 초안을 넣는 중입니다");
      let filled = false;
      let error = "기사쓰기 폼에 초안을 넣지 못했습니다.";
      try {
        filled = await fillForm(draft);
      } catch (e) {
        error = "자동 입력 중 오류가 났습니다: " + e.message;
        gwToast(error, "error", 7000);
      } finally {
        gwBusyDone();
      }

      /* 성공했을 때만 지워 새로고침으로 같은 글을 덮어쓰지 않게 한다. */
      if (filled) {
        await chrome.storage.local.remove(GW.KEY.DRAFT);
        return { ok: true, url: location.href };
      }

      return { ok: false, error };
    })();

    try {
      return await applying;
    } finally {
      applying = null;
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GW_PING_WRITE_PAGE") {
      sendResponse({ ok: isWritePage() });
      return false;
    }

    if (msg?.type === "GW_APPLY_PENDING_DRAFT") {
      applyPendingDraft()
        .then(sendResponse)
        .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
      return true;
    }

    return false;
  });

  async function boot() {
    if (!isWritePage()) return;

    const store = await chrome.storage.local.get(GW.KEY.DRAFT);
    const draft = store[GW.KEY.DRAFT];
    if (!draft || !draft.article) return;
    await applyPendingDraft();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
