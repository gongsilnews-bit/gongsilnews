/* ══════════════════════════════════════════════════════════════
   ChatGPT / Gemini 탭 — 작업창이 시키는 일만 한다 (공통)

   떠다니는 버튼을 심지 않는다. 화면은 작업창이 그린다.
   받는 지시는 넷뿐이다.

     GW_FILL       프롬프트를 입력칸에 넣어라
     GW_SUBMIT     전송을 눌러라
     GW_READ       응답이 멎을 때까지 기다렸다 읽어라
     GW_GET_IMAGE  마지막 그림의 주소를 내놔라
   ══════════════════════════════════════════════════════════════ */

const GwAi = (() => {
  "use strict";

  /* ── 프롬프트 넣기 ── */
  async function fill(conf, text) {
    /* 새 탭은 로그인 확인·화면 그리기가 늦을 때가 있어 넉넉히 기다린다 */
    const input = await gwWaitFor(conf.INPUT, 30000);
    if (!input) {
      return { ok: false, reason: "입력칸을 찾지 못했습니다. 로그인 상태와 화면을 확인해 주세요." };
    }

    input.focus();

    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
      gwSetReactValue(input, text);
    } else {
      /* contenteditable — 줄마다 문단을 만들어야 줄바꿈이 살아남는다 */
      input.innerHTML = "";
      for (const line of text.split("\n")) {
        const p = document.createElement("p");
        if (line.trim()) p.textContent = line;
        else p.appendChild(document.createElement("br"));
        input.appendChild(p);
      }
      input.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
    }

    /* 커서를 맨 끝으로 — 사람이 바로 이어 칠 수 있게 */
    try {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {
      /* 커서 위치를 못 잡아도 입력은 됐다 — 막지 않는다 */
    }

    return { ok: true };
  }

  /* ── 전송 누르기 ── */
  async function submit(conf) {
    /* 입력 직후에는 전송 버튼이 아직 잠겨 있다. 풀릴 때까지 잠깐 기다린다. */
    const until = Date.now() + 6000;
    let btn = null;
    while (Date.now() < until) {
      btn = gwPick(conf.SEND);
      if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") break;
      btn = null;
      await gwSleep(200);
    }

    if (btn) {
      btn.click();
      return { ok: true };
    }

    /* 버튼을 못 찾으면 엔터로도 보내진다 — 마지막 수단 */
    const input = gwPick(conf.INPUT);
    if (input) {
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true,
        })
      );
      return { ok: true, note: "전송 버튼을 못 찾아 엔터로 보냈습니다." };
    }

    return { ok: false, reason: "전송 버튼을 찾지 못했습니다. AI 탭에서 직접 눌러 주세요." };
  }

  /* ── 응답 개수 (수정 요청 전 개수를 세어 두고 새 답변만 읽기 위해) ── */
  function countAnswers(conf) {
    for (const sel of conf.ANSWER) {
      const count = document.querySelectorAll(sel).length;
      if (count) return count;
    }
    return 0;
  }

  /* ── 마지막 응답 읽기 ── */
  function readLast(conf) {
    for (const sel of conf.ANSWER) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length) {
        const last = nodes[nodes.length - 1];
        const text = (last.innerText || last.textContent || "").trim();
        if (text) return text;
      }
    }
    return "";
  }

  /* ── 응답이 멎을 때까지 기다린다 ──
     스트리밍이라 "끝" 신호가 없다. 글자가 더 늘지 않으면 끝난 것으로 본다. */
  async function read(conf, maxMs = 120000, minCount = 0) {
    const until = Date.now() + maxMs;
    const settleMs = Number(conf.SETTLE_MS) || GW.SETTLE_MS;
    let prev = "";
    let stableSince = 0;

    // minCount: 이만큼 답변이 쌓일 때까지(= 방금 보낸 요청의 새 답변이 나올 때까지) 이전 답변은 읽지 않는다
    while (minCount && countAnswers(conf) < minCount) {
      if (Date.now() >= until) {
        return { ok: false, reason: "AI의 새 답변이 아직 없습니다. 답변이 끝나면 [수정글 가져오기]를 눌러 주세요." };
      }
      await gwSleep(500);
    }

    while (Date.now() < until) {
      const now = readLast(conf);
      if (now && now === prev) {
        if (!stableSince) stableSince = Date.now();
        const jsonStarted = now.includes("{");
        const responseComplete = !jsonStarted || GWArticleJson.hasCompleteObject(now);
        if (Date.now() - stableSince >= settleMs && responseComplete) {
          return { ok: true, text: now };
        }
      } else {
        stableSince = 0;
        prev = now;
      }
      await gwSleep(250);
    }

    if (prev) {
      const jsonStarted = prev.includes("{");
      if (jsonStarted && !GWArticleJson.hasCompleteObject(prev)) {
        return { ok: false, reason: "AI 응답이 아직 완성되지 않았습니다. 생성이 끝난 뒤 다시 눌러 주세요." };
      }
      return { ok: true, text: prev, note: "기다리는 시간이 다 돼 그때까지 나온 것을 가져왔습니다." };
    }
    return { ok: false, reason: "AI 응답을 찾지 못했습니다. 기사가 다 나온 뒤에 다시 눌러 주세요." };
  }

  /* ── 마지막 그림 주소 ──
     아바타·아이콘·이모지가 섞이지 않게 충분히 큰 것만 고른다. */
  function getImage(conf) {
    const list = conf.IMAGE || [];
    const candidates = [];
    const seen = new Set();

    for (const sel of list) {
      for (const img of document.querySelectorAll(sel)) {
        if (seen.has(img)) continue;
        seen.add(img);
        const src = img.currentSrc || img.src || "";
        if (!src || src.startsWith("data:image/svg")) continue;
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (w < 200 || h < 150) continue;
        candidates.push({ img, src });
      }
    }

    if (!candidates.length) {
      return { ok: false, reason: "생성된 그림을 찾지 못했습니다." };
    }

    /* 셀렉터가 여러 개여도 실제 화면의 DOM 순서로 가장 마지막 그림을 고른다. */
    candidates.sort((a, b) => {
      if (a.img === b.img) return 0;
      return a.img.compareDocumentPosition(b.img) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    const best = candidates[candidates.length - 1];
    return { ok: true, url: best.src, count: candidates.length };
  }

  /* ══════════════════════════════════════════════════════════════
     작업창의 지시 받기
     ══════════════════════════════════════════════════════════════ */
  function listen(conf) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      const run = async () => {
        try {
          switch (msg.type) {
            case "GW_FILL":
              return await fill(conf, msg.text);
            case "GW_SUBMIT":
              return await submit(conf);
            case "GW_READ":
              return await read(conf, Number(msg.maxMs) || 120000, Number(msg.minCount) || 0);
            case "GW_COUNT":
              return { ok: true, count: countAnswers(conf) };
            case "GW_GET_IMAGE":
              return getImage(conf);
            default:
              return null;
          }
        } catch (e) {
          return { ok: false, reason: e.message };
        }
      };

      const known = ["GW_FILL", "GW_SUBMIT", "GW_READ", "GW_COUNT", "GW_GET_IMAGE"].includes(msg.type);
      if (!known) return false;

      run().then(sendResponse);
      return true; /* 비동기 응답 */
    });
  }

  return { listen, fill, submit, read, getImage };
})();
