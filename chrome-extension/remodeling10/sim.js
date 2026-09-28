/* ══════════════════════════════════════════════════════════════
   1 · 시뮬레이션 — 건물 외관 리모델링 예측 시뮬레이터

   사진(공실 스캔·직접 올리기) → 설계 조건 → 공사비 기준 → AI 선택
   → ① 설계 지시서 요청 ② 작성하기 ③ 지시서 가져오기
   → ④ 예측 이미지 요청(원본 사진 첨부) ⑤ 이미지 가져오기 (버전 수만큼)
   → 📋 결과표 (다운로드) → 2 · 기사 / 3 · 블로그 / 4 · 유튜브 의 원자료

   결과표가 만들어지면 "rm:result" 이벤트로 panel.js 에 넘긴다.
   panel.js 가 그것을 작업창 상태(gw_panel_state)에 넣어 블로그·유튜브도 같이 쓴다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const SIM_KEY = "rm_sim_state";
  const MAX_PICK = 3;
  const GONGSIL_URLS = ["https://gongsilnews.com/gongsil*", "https://*.gongsilnews.com/gongsil*", "http://localhost/gongsil*"];

  const R = {
    vacancy: null,
    photos: [],             // [{ id, url(dataURL), name, src:'scan'|'upload', on }]
    design: rmDefaultDesign(),
    costBase: rmDefaultCostBase(),
    platform: "chatgpt", // ChatGPT 가 원본 사진을 "고치는" 방식이라 구도를 잘 지킨다 (Gemini 는 새로 그리는 경향)
    origin: "https://www.gongsilnews.com", // 로그인 쿠키가 www 에 있다
    gongsilTabId: null,
    aiTabId: null,
    specWriting: false,
    spec: null,             // 설계 지시서 JSON
    images: [],             // [{ version, url(dataURL) }]
    pending: null,          // { version, before } — 이미지를 요청하고 아직 안 가져왔다
    imageWriting: false,
    result: null,           // 📋 결과표
  };

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const el = {
    tabSim: $("tabSim"), viewSim: $("viewSim"), simBadge: $("simBadge"),
    lock: $("rmLock"), lockTitle: $("rmLockTitle"), lockText: $("rmLockText"), lockRetry: $("btnRmLockRetry"),
    goGongsil: $("rmGoGongsil"), grab: $("rmGrab"), upload: $("rmUpload"), file: $("rmFile"),
    vacancy: $("rmVacancy"), vacancyName: $("rmVacancyName"), vacancyFields: $("rmVacancyFields"),
    photoWrap: $("rmPhotoWrap"), photos: $("rmPhotos"), pickCount: $("rmPickCount"),
    design: $("rmDesign"), ratios: $("rmRatios"),
    width: $("rmWidth"), depth: $("rmDepth"), floors: $("rmFloors"), floorHeight: $("rmFloorHeight"), faces: $("rmFaces"), costPreview: $("rmCostPreview"),
    specOpen: $("rmSpecOpen"), specSubmit: $("rmSpecSubmit"), specPull: $("rmSpecPull"), specWriting: $("rmSpecWriting"),
    pasteBox: $("rmPasteBox"), pasteJson: $("rmPasteJson"), pasteSpec: $("rmPasteSpec"), specCard: $("rmSpecCard"),
    imageReq: $("rmImageReq"), imageReqText: $("rmImageReqText"), imagePull: $("rmImagePull"), imageWriting: $("rmImageWriting"),
    imageProgress: $("rmImageProgress"), fail: $("rmFail"),
    resultEmpty: $("rmResultEmpty"), result: $("rmResult"),
    status: $("statusPill"), toastHost: $("toastHost"),
  };

  /* ═════════════ 알림 · 잠금 ═════════════ */
  function toast(message, kind = "info", ms = 4000) {
    const box = document.createElement("div");
    box.className = `toast ${kind}`;
    box.textContent = message;
    el.toastHost.appendChild(box);
    requestAnimationFrame(() => box.classList.add("in"));
    setTimeout(() => { box.classList.remove("in"); setTimeout(() => box.remove(), 260); }, ms);
  }
  function status(text, kind = "") {
    el.status.textContent = text;
    el.status.className = "status-pill" + (kind ? " " + kind : "");
  }
  async function guard(btn, busyText, fn, opts = {}) {
    const keep = btn.innerHTML;
    btn.disabled = true;
    GWBusy.clearFail(el.fail);
    GWBusy.start(btn, busyText, opts.cover);
    status(busyText, "busy");
    try {
      if (GWBusy.isPullButton(btn, opts)) {
        await GWBusy.retryOnce(fn, () => { GWBusy.label(btn, "3초 뒤 다시 가져오는 중"); status("3초 뒤 다시 시도", "busy"); });
      } else {
        await fn();
      }
    } catch (e) {
      console.error("[리모델링 작성기]", e);
      toast(e.message || String(e), "bad", 8000);
      status("문제 발생", "bad");
      if (opts.failTitle) GWBusy.fail(el.fail, opts.failTitle, e.message || String(e), opts.retry);
    } finally {
      GWBusy.stop(btn);
      btn.innerHTML = keep;
      btn.disabled = false;
      refresh();
    }
  }

  /* ═════════════ 탭 ═════════════ */
  function activateSim() {
    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".scroll-area > .view").forEach((v) => v.classList.remove("active"));
    ["draftActions", "blogActions", "scriptActions"].forEach((id) => $(id)?.classList.add("hidden"));
    document.dispatchEvent(new CustomEvent("gw:leave-youtube"));
    el.tabSim.classList.add("active");
    el.viewSim.classList.add("active");
    el.simBadge.classList.add("hidden");
  }
  function leaveSim() {
    el.tabSim.classList.remove("active");
    el.viewSim.classList.remove("active");
  }
  el.tabSim.addEventListener("click", activateSim);
  ["tabWork", "tabDraft", "tabBlog", "tabScript"].forEach((id) => $(id)?.addEventListener("click", leaveSim));

  /* ═════════════ 회원 확인 (유료회원 전용) ═════════════
     화면 잠금은 안내용이다. 권한 판정은 서버(/api/extension/auth/me 의 canRemodel)가 한다. */
  let access = null;
  const SITE_URLS = ["https://www.gongsilnews.com/*", "https://gongsilnews.com/*", "http://localhost/*"];

  /* 어느 공실뉴스에 물어볼까 — 지금 열린 공실뉴스 탭(개발 서버 localhost 포함)을 먼저, 없으면 운영 사이트.
     로그인이 된 곳을 고른다. 한 곳만 보면 localhost 에 로그인해 놓고도 잠기는 일이 생긴다. */
  async function candidateOrigins() {
    const tabs = await chrome.tabs.query({ url: SITE_URLS }).catch(() => []);
    const list = [R.origin, ...tabs.map((t) => { try { return new URL(t.url).origin; } catch (_) { return ""; } }), "https://www.gongsilnews.com"];
    return Array.from(new Set(list.filter(Boolean)));
  }

  async function askMe(origin) {
    try {
      const res = await fetch(`${origin}/api/extension/auth/me`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      return { origin, ok: GWTrial.canRemodelFrom(data), loggedIn: Boolean(data && data.isLoggedIn), plan: data?.user?.planLabel || "" };
    } catch (e) {
      return { origin, ok: false, loggedIn: false, error: true };
    }
  }

  async function checkAccess() {
    const answers = [];
    for (const origin of await candidateOrigins()) {
      const a = await askMe(origin);
      answers.push(a);
      if (a.ok) break;
    }
    access = answers.find((a) => a.ok) || answers.find((a) => a.loggedIn) || answers.find((a) => !a.error) || answers[0] || { ok: false, error: true };
    if (access.origin && !access.error) {
      R.origin = access.origin;
      save();
    }
    const locked = !access.ok;
    el.viewSim.classList.toggle("locked", locked);
    el.lock.classList.toggle("hidden", !locked);
    if (locked) {
      el.lockTitle.textContent = access.error ? "회원 확인을 하지 못했습니다" : access.loggedIn ? "리모델링 작성기는 유료회원 전용입니다" : "공실뉴스 로그인이 필요합니다";
      el.lockText.textContent = access.error
        ? "인터넷 연결을 확인한 뒤 [다시 확인]을 눌러 주세요."
        : access.loggedIn
          ? `지금 등급(${access.plan || "무료"})으로는 쓸 수 없습니다. 공실뉴스부동산·공실스터디부동산·비즈니스회원이 사용할 수 있습니다.`
          : "gongsilnews.com 에 로그인한 뒤 [다시 확인]을 눌러 주세요. 공실뉴스부동산·공실스터디부동산·비즈니스회원이 사용할 수 있습니다.";
      el.lockLink.href = `${R.origin}/study`;
    }
    return access.ok;
  }
  el.lockLink = $("rmLockLink");
  el.lockRetry.addEventListener("click", () => checkAccess());

  /* ═════════════ 탭 다루기 ═════════════ */
  async function findTab(patterns) {
    const tabs = await chrome.tabs.query({ url: patterns });
    return tabs.length ? tabs[0] : null;
  }
  async function askTab(tabId, msg) {
    if (!tabId) throw new Error("대상 탭이 없습니다.");
    try {
      const res = await chrome.tabs.sendMessage(tabId, msg);
      if (res === undefined) throw new Error("탭이 응답하지 않았습니다.");
      return res;
    } catch (e) {
      throw new Error("탭과 연결되지 않았습니다. 그 탭을 한 번 새로고침(F5)한 뒤 다시 눌러 주세요. (" + e.message + ")");
    }
  }
  function waitTabReady(tabId, timeoutMs = 30000) {
    return new Promise((resolve) => {
      const finish = () => { chrome.tabs.onUpdated.removeListener(onUpd); resolve(); };
      const timer = setTimeout(finish, timeoutMs);
      const onUpd = (id, info) => { if (id === tabId && info.status === "complete") { clearTimeout(timer); finish(); } };
      chrome.tabs.onUpdated.addListener(onUpd);
      chrome.tabs.get(tabId).then((t) => { if (t.status === "complete") { clearTimeout(timer); finish(); } }).catch(() => {});
    });
  }
  const aiConf = () => (R.platform === "gemini" ? GW.GEMINI : GW.CHATGPT);
  const aiName = () => (R.platform === "gemini" ? "Gemini" : "ChatGPT");
  const copyForPaste = (text) => navigator.clipboard.writeText(text).then(() => true, () => false);
  async function liveAiTab() {
    if (!R.aiTabId) throw new Error("AI 탭이 없습니다. 먼저 ① 설계 지시서 요청을 눌러 주세요.");
    const tab = await chrome.tabs.get(R.aiTabId).catch(() => null);
    if (!tab) { R.aiTabId = null; save(); throw new Error("AI 탭이 닫혔습니다. ① 설계 지시서 요청부터 다시 해 주세요."); }
    return tab;
  }

  /* ═════════════ 1단계 · 사진 ═════════════ */
  el.goGongsil.addEventListener("click", () =>
    guard(el.goGongsil, "공실열람 여는 중", async () => {
      const found = await findTab(GONGSIL_URLS);
      if (found) {
        await chrome.tabs.update(found.id, { active: true });
        await chrome.windows.update(found.windowId, { focused: true });
        R.gongsilTabId = found.id;
        R.origin = new URL(found.url).origin;
        toast("열려 있는 공실열람 탭으로 이동했습니다. 매물을 하나 펼친 뒤 [물건 가져오기]를 누르세요.", "info");
      } else {
        const tab = await chrome.tabs.create({ url: "https://www.gongsilnews.com/gongsil" });
        R.gongsilTabId = tab.id;
        R.origin = "https://www.gongsilnews.com";
        toast("공실열람을 열었습니다. 매물을 하나 펼친 뒤 [물건 가져오기]를 누르세요.", "info");
      }
      status("공실열람 열림", "ok");
      save();
    })
  );

  el.grab.addEventListener("click", () =>
    guard(el.grab, "물건 가져오는 중", async () => {
      let tab = R.gongsilTabId ? await chrome.tabs.get(R.gongsilTabId).catch(() => null) : null;
      if (!tab || !/\/gongsil/.test(tab.url || "")) tab = await findTab(GONGSIL_URLS);
      if (!tab) throw new Error("공실열람 탭이 없습니다. 먼저 [공실열람 페이지 이동]을 눌러 주세요.");
      R.gongsilTabId = tab.id;
      R.origin = new URL(tab.url).origin;

      const res = await askTab(tab.id, { type: "GW_GET_VACANCY" });
      if (!res.ok) throw new Error(res.reason || "물건을 읽지 못했습니다.");
      R.vacancy = res.vacancy;
      /* 경매·공매 물건이면 물건 정보를 서버에서 통째로 받는다 (상세가 탭으로 나뉘어 화면으론 일부만 읽힌다) */
      GWBusy.label(el.grab, "경매·공매 물건인지 확인 중");
      const auction = await fetchAuction(R.vacancy);
      if (auction) R.vacancy = auction;
      else if (!(R.vacancy.fields || []).length) throw new Error("매물 상세 표를 읽지 못했습니다. 매물이 다 펼쳐진 뒤에 다시 눌러 주세요.");
      /* 블로그 글 끝 "매물 정보 출처"를 가져올 때 같이 받아 둔다
         일반 매물: 매물을 등록한 중개사무소 · 경매·공매: 구분·사건(관리)번호·관할법원(집행기관) */
      GWBusy.label(el.grab, auction ? "경매·공매 출처 받는 중" : "중개사무소 정보 받는 중");
      R.vacancy.listing = await (auction ? fetchAuctionListing(R.vacancy) : fetchListingInfo(R.vacancy)).catch((e) => {
        toast(`매물 정보 출처를 받지 못했습니다 — ${e.message}`, "bad", 8000);
        return null;
      });
      renderVacancy();

      const urls = (R.vacancy.images || []).slice(0, 12);
      if (!urls.length) {
        toast("매물 정보는 가져왔지만 등록 사진이 없습니다. [사진 직접 올리기]로 건물 사진을 올려 주세요.", "bad", 8000);
      } else {
        GWBusy.label(el.grab, `사진 받는 중 (${urls.length}장)`);
        /* 스캔한 사진은 바꿔치기(다시 가져오기)한다 — 직접 올린 사진은 남긴다 */
        R.photos = R.photos.filter((p) => p.src === "upload");
        let failed = 0;
        for (const url of urls) {
          const dataUrl = await gwImageToDataUrl(url, 1600);
          if (!dataUrl) { failed++; continue; }
          addPhoto(dataUrl, "scan", `매물 사진 ${R.photos.filter((p) => p.src === "scan").length + 1}`);
        }
        if (failed) toast(`사진 ${failed}장을 받지 못했습니다.`, "bad", 6000);
      }

      const floors = rmFloorsFromVacancy(R.vacancy);
      if (floors) { R.costBase.floors = floors; renderCostInputs(); }
      renderPhotos();
      renderCost();
      toast(`매물 정보와 사진 ${R.photos.filter((p) => p.src === "scan").length}장을 가져왔습니다. 쓸 사진을 골라 주세요.`, "ok", 6000);
      status("사진 준비됨", "ok");
      save();
    })
  );

  el.upload.addEventListener("click", () => el.file.click());
  el.file.addEventListener("change", async () => {
    const files = Array.from(el.file.files || []);
    el.file.value = "";
    for (const f of files) {
      const raw = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(f); });
      const small = raw ? await shrink(raw) : null;
      if (small) addPhoto(small, "upload", f.name);
      else toast(`${f.name} 을(를) 읽지 못했습니다.`, "bad");
    }
    renderPhotos();
    save();
    if (files.length) toast(`사진 ${files.length}장을 올렸습니다.`, "ok");
  });

  function addPhoto(url, src, name) {
    const picked = R.photos.filter((p) => p.on).length;
    R.photos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url, name: name || "", src, on: picked < MAX_PICK && (src === "upload" || picked < 1) });
  }

  /* 큰 사진을 1600px JPG 로 줄인다 (AI 에 올리고 저장하기 알맞은 크기) */
  async function shrink(dataUrl, maxSide = 1600) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const bmp = await createImageBitmap(blob);
      const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s);
      c.height = Math.round(bmp.height * s);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close?.();
      return c.toDataURL("image/jpeg", 0.9);
    } catch (e) {
      return null;
    }
  }

  /* 물건을 가져온 공실뉴스 사이트(운영 또는 localhost) */
  function originOf(v) {
    try { return new URL(v.url).origin; } catch (_) { return R.origin; }
  }

  /* 기사에 쓰지 않는 공고 부속 정보 — 정보제공처(온비드 고객센터 연락처)와 입찰 전 법적 주의사항 */
  const EXCLUDED_FACT = /정보\s*제공|고객\s*센터|주의\s*사항|1588-?5321/;

  /* 경매·공매 물건이면 서버 정보를, 일반 매물이면 null 을 돌려준다 */
  async function fetchAuction(v) {
    if (!v || !v.vacancyId) return null;
    const res = await fetch(`${originOf(v)}/api/extension/auction-source?id=${encodeURIComponent(v.vacancyId)}`, { credentials: "include", cache: "no-store" }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data && data.success) {
      return {
        vacancyId: data.id,
        saleKind: data.saleKind,
        title: data.title,
        priceText: data.priceText,
        location: data.location,
        propertyType: data.propertyType,
        fields: (data.facts || []).filter((f) => !EXCLUDED_FACT.test(`${f.label} ${f.value}`)),
        images: (v.images || []).length ? v.images : data.images || [],
        themes: [],
        infra: "",
        url: v.url,
      };
    }
    /* 서버가 "경매·공매 물건이 아니다"라고 답했으면 일반 매물이다 */
    if (res && res.status >= 400 && res.status < 500) return null;
    throw new Error((data && data.error) || "경매·공매 물건인지 확인하지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
  }

  /* 경매·공매 출처 — 구분·사건(관리)번호·관할법원(집행기관). 정보제공처 연락처는 넣지 않는다 */
  async function fetchAuctionListing(v) {
    const res = await fetch(`${originOf(v)}/api/extension/auction-source?id=${encodeURIComponent(v.vacancyId)}&for=blog`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!data || !data.success) throw new Error((data && data.error) || "경매·공매 물건 정보를 가져오지 못했습니다.");
    const fact = (...labels) => ((data.facts || []).find((f) => labels.includes(f.label)) || {}).value || "";
    return {
      detailUrl: `${GWNaverBlog.SITE_URL}${data.detailPath}`,
      location: data.location || "",
      propertyType: data.propertyType || "",
      saleKind: data.saleKind || "",
      caseLabel: fact("관리번호") ? "관리번호" : "사건번호",
      caseNo: fact("관리번호", "사건번호"),
      agency: fact("집행기관", "관할법원"),
      capturedAt: new Date().toISOString(),
    };
  }

  /* 일반 매물 출처 — 블로그 글 끝 "매물 정보 출처"(표시·광고 필수 항목)에 쓴다.
     owner: 매물을 등록한 중개사무소(중개사가 아니면 등록자 이름만) */
  async function fetchListingInfo(v) {
    if (!v || !v.vacancyId) return null;
    const origin = originOf(v);
    const res = await fetch(`${origin}/api/extension/vacancy-source?id=${encodeURIComponent(v.vacancyId)}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!data || !data.success) throw new Error((data && data.error) || "매물 출처 정보를 가져오지 못했습니다.");
    return {
      detailUrl: `${GWNaverBlog.SITE_URL}${data.detailPath}`,
      location: data.location || "",
      propertyType: data.propertyType || "",
      tradeType: data.tradeType || "",
      owner: data.owner || null,
      capturedAt: new Date().toISOString(),
    };
  }

  function renderVacancy() {
    const v = R.vacancy;
    if (!v) { el.vacancy.classList.add("hidden"); return; }
    const rows = [];
    /* 표시·광고 출처 — 무엇이 블로그 끝에 들어갈지 미리 보여 준다 */
    const l = v.listing;
    const owner = l && l.owner;
    if (l && l.saleKind) {
      rows.push(["구분", l.saleKind]);
      rows.push([l.caseLabel || "사건번호", [l.caseNo, l.agency].filter(Boolean).join(" · ") || "-"]);
    } else if (owner && owner.type === "agency" && owner.name) {
      rows.push(["등록 중개사무소", [owner.name, owner.regNo && `등록번호 ${owner.regNo}`, owner.phone].filter(Boolean).join(" · ")]);
    } else if (owner && owner.name) {
      rows.push(["등록자", `${owner.name} (중개사무소 아님)`]);
    }
    if (v.priceText) rows.push(["금액", v.priceText]);
    for (const f of (v.fields || []).slice(0, 12)) rows.push([f.label, f.value]);
    el.vacancyName.textContent = v.title || "-";
    el.vacancyFields.innerHTML = rows.map(([k, val]) => `<div class="vf-row"><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join("");
    el.vacancy.classList.remove("hidden");
  }

  function renderPhotos() {
    el.photoWrap.classList.toggle("hidden", !R.photos.length);
    el.photos.innerHTML = R.photos.map((p, i) => `
      <div class="rm-photo${p.on ? " on" : ""}" data-i="${i}" role="button" tabindex="0" title="눌러서 고르기">
        <img src="${p.url}" alt="">
        <span class="rm-check">${p.on ? "✓" : ""}</span>
        <button class="rm-del" data-del="${i}" type="button" title="빼기">✕</button>
        <span class="rm-src">${p.src === "scan" ? "공실 스캔" : "직접 올림"}</span>
      </div>`).join("");
    el.pickCount.textContent = String(R.photos.filter((p) => p.on).length);
    refresh();
  }
  el.photos.addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      R.photos.splice(Number(del.dataset.del), 1);
      renderPhotos();
      save();
      return;
    }
    const card = e.target.closest(".rm-photo");
    if (!card) return;
    const p = R.photos[Number(card.dataset.i)];
    if (!p.on && R.photos.filter((x) => x.on).length >= MAX_PICK) {
      toast(`사진은 최대 ${MAX_PICK}장까지 고를 수 있습니다.`, "bad");
      return;
    }
    p.on = !p.on;
    renderPhotos();
    save();
  });
  const pickedPhotos = () => R.photos.filter((p) => p.on);

  /* ═════════════ 2단계 · 설계 조건 ═════════════ */
  function renderDesign() {
    el.design.innerHTML = RM_GROUPS.map((g) => `
      <div class="rm-group">
        <div class="rm-group-title">${esc(g.label)}</div>
        <div class="rm-opts">${RM_OPTIONS[g.key].map((o) =>
          `<button class="rm-opt${R.design[g.key].includes(o.id) ? " on" : ""}" data-g="${g.key}" data-id="${o.id}" type="button">${esc(o.name)}</button>`).join("")}</div>
      </div>`).join("");
    el.ratios.innerHTML = RM_RATIOS.map((r) => {
      const main = r.id === "original" ? "원본" : r.id;
      const sub = r.id === "original" ? "같은 구도 · 추천" : r.name.replace(/^[\d:]+\s*/, "").replace(/[()]/g, "");
      return `<button class="chip${R.design.aspectRatio === r.id ? " active" : ""}" data-ratio="${r.id}" type="button">${main}<small>${esc(sub)}</small></button>`;
    }).join("");
  }
  function designChanged() {
    /* 조건이 바뀌면 이미 받은 지시서·이미지는 맞지 않는다 */
    if (R.spec || R.images.length || R.result) {
      R.spec = null;
      R.images = [];
      R.pending = null;
      setResult(null);
      renderSpec();
      toast("설계 조건이 바뀌어 지시서와 예측 이미지를 비웠습니다. ① 설계 지시서 요청부터 다시 해 주세요.", "info", 7000);
    }
    renderDesign();
    renderCost();
    save();
    refresh();
  }
  el.design.addEventListener("click", (e) => {
    const b = e.target.closest(".rm-opt");
    if (!b) return;
    const list = R.design[b.dataset.g];
    const i = list.indexOf(b.dataset.id);
    if (i >= 0) list.splice(i, 1); else list.push(b.dataset.id);
    designChanged();
  });
  el.ratios.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ratio]");
    if (!b) return;
    R.design.aspectRatio = b.dataset.ratio;
    designChanged();
  });

  /* ═════════════ 3단계 · 공사비 기준 ═════════════ */
  function renderCostInputs() {
    el.width.value = R.costBase.width;
    el.depth.value = R.costBase.depth;
    el.floors.value = R.costBase.floors;
    el.floorHeight.value = R.costBase.floorHeight;
    el.faces.value = String(R.costBase.faces);
  }
  function renderCost() {
    const c = rmEstimateCost(R.costBase, R.design);
    el.costPreview.innerHTML = `<strong>${esc(c.rangeText)}</strong>외벽 약 ${c.area}m² · 창 약 ${c.windowArea}m²<br>${esc(c.basisText)}<br>${esc(c.excludes)}`;
    if (R.result) {
      R.result.cost = c;
      renderResult();
    }
  }
  [el.width, el.depth, el.floors, el.floorHeight, el.faces].forEach((input) =>
    input.addEventListener("input", () => {
      R.costBase = {
        width: Number(el.width.value) || 0,
        depth: Number(el.depth.value) || 0,
        floors: Number(el.floors.value) || 0,
        floorHeight: Number(el.floorHeight.value) || 0,
        faces: Number(el.faces.value) || 1,
      };
      renderCost();
      if (R.result) announceResult();
      save();
    })
  );

  /* ═════════════ 4단계 · AI ═════════════ */
  const platformBtns = document.querySelectorAll(".choice[data-rm-platform]");
  platformBtns.forEach((btn) => btn.addEventListener("click", () => {
    if (R.platform === btn.dataset.rmPlatform) return;
    platformBtns.forEach((b) => b.classList.toggle("active", b === btn));
    R.platform = btn.dataset.rmPlatform;
    R.aiTabId = null; // 다른 AI 의 대화는 이어 쓸 수 없다
    R.pending = null;
    save();
    refresh();
    announcePlatform();
  }));

  /* 여기서 고른 AI 를 기사·블로그·유튜브까지 그대로 쓴다 (2·3·4 탭에는 AI 선택이 없다) */
  function announcePlatform() {
    document.dispatchEvent(new CustomEvent("rm:platform", { detail: R.platform }));
  }

  /* ═════════════ 5단계 · ①②③ 설계 지시서 ═════════════ */
  el.specOpen.addEventListener("click", () =>
    guard(el.specOpen, "지시서 요청 중", async () => {
      if (!(await checkAccess())) throw new Error("유료회원 전용 기능입니다.");
      if (!pickedPhotos().length) throw new Error("먼저 1단계에서 건물 사진을 1장 이상 골라 주세요.");
      const conf = aiConf();
      const text = rmBuildSpecPrompt(R.design);
      const copied = await copyForPaste(text);

      const tab = await chrome.tabs.create({ url: conf.URL, active: true });
      R.aiTabId = tab.id;
      R.spec = null;
      R.images = [];
      R.pending = null;
      setResult(null);
      renderSpec();
      save();

      await waitTabReady(tab.id);
      await sleep(1200);
      let res = await askTab(tab.id, { type: "GW_FILL", text }).catch((e) => ({ ok: false, reason: e.message }));
      if (!res.ok) {
        await chrome.tabs.reload(tab.id);
        await sleep(500);
        await waitTabReady(tab.id);
        await sleep(2000);
        res = await askTab(tab.id, { type: "GW_FILL", text }).catch((e) => ({ ok: false, reason: e.message }));
      }
      if (!res.ok) {
        if (!copied) throw new Error(res.reason || "프롬프트를 넣지 못했습니다.");
        toast(`${aiName()} 입력칸에 프롬프트를 넣지 못했습니다. 복사해 두었으니 입력칸에 Ctrl+V 로 붙여넣고 직접 전송한 뒤 ③ 지시서 가져오기를 누르세요.`, "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }
      toast("설계 조건 프롬프트를 넣었습니다. ② 작성하기를 누르세요.", "ok", 6000);
      status("프롬프트 입력됨", "ok");
    }, { failTitle: "설계 지시서 요청을 시작하지 못했습니다" })
  );

  el.specSubmit.addEventListener("click", () =>
    guard(el.specSubmit, "AI에 보내는 중", async () => {
      await liveAiTab();
      await chrome.tabs.update(R.aiTabId, { active: true });
      const res = await askTab(R.aiTabId, { type: "GW_SUBMIT" });
      if (!res.ok) throw new Error(res.reason || "전송 버튼을 누르지 못했습니다.");
      setSpecWriting(true);
      toast("전송했습니다. 지시서가 다 나오면 ③ 지시서 가져오기를 누르세요.", "ok");
      status("AI 지시서 작성 중", "busy");
    }, { failTitle: "AI에 보내지 못했습니다" })
  );

  el.specPull.addEventListener("click", () =>
    guard(el.specPull, "지시서 가져오는 중", async () => {
      await liveAiTab();
      let text = "";
      if (R.platform === "chatgpt") text = (await GWChatGptDirect.read(R.aiTabId, (s) => status(`지시서 읽는 중 (${s})`, "busy"))) || "";
      if (!text) {
        const res = await askTab(R.aiTabId, { type: "GW_READ" });
        if (res.ok) text = res.text;
        else if (!res.unreadable) throw new Error(res.reason || "응답을 읽지 못했습니다.");
      }
      const parsed = rmParseSpec(text);
      if (!parsed.ok) {
        el.pasteBox.classList.remove("hidden");
        throw new Error(parsed.reason + " 자동으로 읽지 못하면 아래 칸에 JSON 을 붙여넣어 주세요.");
      }
      applySpec(parsed.spec);
    }, { failTitle: "지시서를 가져오지 못했습니다", retry: el.specPull })
  );

  el.pasteSpec.addEventListener("click", () => {
    const parsed = rmParseSpec(el.pasteJson.value);
    if (!parsed.ok) { toast(parsed.reason, "bad", 7000); return; }
    el.pasteJson.value = "";
    applySpec(parsed.spec);
  });

  function applySpec(spec) {
    R.spec = spec;
    R.images = [];
    R.pending = null;
    setSpecWriting(false);
    el.pasteBox.classList.add("hidden");
    setResult(null);
    renderSpec();
    save();
    refresh();
    toast("지시서를 가져왔습니다. 이제 ④ 예측 이미지 요청을 누르세요.", "ok", 6000);
    status("지시서 준비됨", "ok");
  }

  function renderSpec() {
    if (!R.spec) { el.specCard.classList.add("hidden"); el.specCard.innerHTML = ""; renderImageProgress(); return; }
    const ko = R.spec.versionDiffsKo[0] || "";
    el.specCard.innerHTML = `<div><b>지시서 준비됨</b></div>` + (ko ? `<div>디자인 방향 · ${esc(ko)}</div>` : "");
    el.specCard.classList.remove("hidden");
    renderImageProgress();
  }

  function setSpecWriting(on) {
    R.specWriting = on;
    GWBusy.writing(el.specWriting, on, "AI가 설계 지시서를 작성 중입니다", "다 쓰면 이 안내가 꺼집니다. 그때 ③ 지시서 가져오기를 누르세요");
    if (on) GWBusy.watchAi("rmSpec", () => R.aiTabId, () => R.specWriting, () => { setSpecWriting(false); status("지시서 작성 완료", "ok"); });
    save();
  }

  /* ═════════════ 5단계 · ④⑤ 예측 이미지 ═════════════ */
  const nextVersion = () => R.images.length + 1;

  function renderImageProgress() {
    const total = R.design.versions;
    const done = R.images.length;
    el.imageProgress.textContent = R.spec && done >= total ? "(완료)" : "";
    el.imageReqText.textContent = R.pending ? "예측 이미지 다시 요청" : done >= total ? "예측 이미지 완료" : "예측 이미지 요청";
  }

  /* 요청 전 대화 상태 — 새로 생긴 그림만 가져오기 위해 */
  async function snapshot() {
    if (R.platform === "chatgpt") {
      const st = await GWChatGptDirect.imageState(R.aiTabId);
      return { images: st.ok ? st.images.length : 0 };
    }
    const turn = await askTab(R.aiTabId, { type: "GW_TURN_STATE" });
    return { turns: turn.ok ? turn.turns : 0 };
  }

  el.imageReq.addEventListener("click", () =>
    guard(el.imageReq, "이미지 요청 중", async () => {
      if (!R.spec) throw new Error("먼저 ③ 지시서 가져오기를 해 주세요.");
      const photos = pickedPhotos();
      if (!photos.length) throw new Error("1단계에서 건물 사진을 1장 이상 골라 주세요.");
      if (R.images.length >= R.design.versions && !R.pending) throw new Error("모든 버전의 예측 이미지를 이미 가져왔습니다.");
      await liveAiTab();
      await chrome.tabs.update(R.aiTabId, { active: true });

      const version = R.pending ? R.pending.version : nextVersion();
      const before = await snapshot();
      const text = rmBuildImagePrompt(R.spec, version - 1, R.design.aspectRatio);
      const copied = await copyForPaste(text);

      GWBusy.label(el.imageReq, "사진 첨부 중");
      const att = await askTab(R.aiTabId, { type: "GW_ATTACH", images: photos.map((p, i) => ({ url: p.url, name: `building-${i + 1}.jpg` })) })
        .catch((e) => ({ ok: false, reason: e.message }));
      if (!att.ok) {
        R.pending = { version, before };
        save();
        throw new Error(`${aiName()} 입력칸에 사진을 첨부하지 못했습니다. 1단계의 사진을 AI 입력칸에 직접 끌어다 놓고, 복사해 둔 프롬프트를 Ctrl+V 로 붙여넣어 전송한 뒤 ⑤ 이미지 가져오기를 누르세요.${copied ? "" : " (프롬프트 복사도 실패했습니다)"}`);
      }

      GWBusy.label(el.imageReq, "프롬프트 넣는 중");
      const fill = await askTab(R.aiTabId, { type: "GW_FILL", text }).catch((e) => ({ ok: false, reason: e.message }));
      if (!fill.ok) {
        R.pending = { version, before };
        save();
        throw new Error("프롬프트를 넣지 못했습니다. 복사해 두었으니 입력칸에 Ctrl+V 로 붙여넣고 전송한 뒤 ⑤ 이미지 가져오기를 누르세요.");
      }

      GWBusy.label(el.imageReq, "사진 올라가는 중");
      const sent = await askTab(R.aiTabId, { type: "GW_SUBMIT", waitMs: 60000 });
      if (!sent.ok) {
        R.pending = { version, before };
        save();
        throw new Error((sent.reason || "전송하지 못했습니다.") + " AI 탭에서 직접 전송한 뒤 ⑤ 이미지 가져오기를 누르세요.");
      }

      R.pending = { version, before };
      setImageWriting(true);
      save();
      toast(`버전 ${version} 예측 이미지를 요청했습니다. 그림이 다 나오면 ⑤ 이미지 가져오기를 누르세요.`, "ok", 7000);
      status("이미지 생성 중", "busy");
    }, { failTitle: "예측 이미지를 요청하지 못했습니다" })
  );

  el.imagePull.addEventListener("click", () =>
    guard(el.imagePull, "이미지 가져오는 중", async () => {
      if (!R.pending) throw new Error("먼저 ④ 예측 이미지 요청을 눌러 주세요.");
      await liveAiTab();
      const url = await fetchNewImage(R.pending.before);
      if (!url) throw new Error("아직 새 그림이 없습니다. AI 탭에서 그림이 다 나온 뒤 다시 눌러 주세요.");
      const small = await shrink(url, 1600) || url;
      R.images.push({ version: R.pending.version, url: small });
      R.images.sort((a, b) => a.version - b.version);
      R.pending = null;
      setImageWriting(false);
      renderImageProgress();
      /* 이미지를 하나 받을 때마다 결과표를 바로 만든다 — 나머지 버전은 받는 대로 채운다 */
      buildResult();
      if (R.images.length >= R.design.versions) {
        toast("모든 예측 이미지를 가져왔습니다. 아래 📋 결과표를 확인하세요.", "ok", 7000);
        status("결과표 완성", "ok");
      } else {
        toast(`버전 ${R.images.length} 이미지로 결과표를 만들었습니다. 버전 ${nextVersion()}도 만들려면 ④를 누르세요. 이대로 기사를 써도 됩니다.`, "ok", 8000);
        status(`결과표 ${R.images.length}/${R.design.versions}`, "ok");
      }
      save();
    }, { failTitle: "예측 이미지를 가져오지 못했습니다", retry: el.imagePull })
  );

  async function fetchNewImage(before) {
    if (R.platform === "chatgpt") {
      const st = await GWChatGptDirect.imageState(R.aiTabId);
      if (!st.ok) throw new Error("ChatGPT 대화를 읽지 못했습니다 — " + (st.error || ""));
      const fresh = st.images.slice(before.images || 0).filter((im) => im.done);
      if (!fresh.length) return null;
      return await GWChatGptDirect.downloadImage(R.aiTabId, fresh[fresh.length - 1].fileId);
    }
    const turn = await askTab(R.aiTabId, { type: "GW_TURN_STATE", after: before.turns || 0 });
    if (!turn.ok || !turn.images.length || turn.busy) return null;
    const src = turn.images[turn.images.length - 1];
    return (await gwImageToDataUrl(src, 2048)) || (await fetchInTab(R.aiTabId, src));
  }

  /* 바깥에서 못 받는 그림은 그 AI 탭 안에서(로그인 쿠키로) 받아 온다 */
  async function fetchInTab(tabId, url) {
    try {
      const [run] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: async (u) => {
          const blob = await fetch(u, { credentials: "include" }).then((r) => (r.ok ? r.blob() : null));
          if (!blob) return null;
          return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(blob); });
        },
        args: [url],
      });
      return (run && run.result) || null;
    } catch (e) {
      return null;
    }
  }

  function setImageWriting(on) {
    R.imageWriting = on;
    GWBusy.writing(el.imageWriting, on, "AI가 예측 이미지를 만드는 중입니다", "다 만들면 이 안내가 꺼집니다. 그때 ⑤ 이미지 가져오기를 누르세요");
    if (on) GWBusy.watchAi("rmImage", () => R.aiTabId, () => R.imageWriting, () => { setImageWriting(false); status("이미지 생성 완료", "ok"); });
    save();
  }

  /* ═════════════ 📋 결과표 ═════════════ */
  function buildResult() {
    const v = R.vacancy;
    const picked = pickedPhotos();
    const now = new Date();
    const location = v ? ((v.fields || []).find((f) => /소재지|주소|위치/.test(f.label)) || {}).value || v.location || "" : "";
    const result = {
      title: (v && v.title) || "직접 올린 건물 사진",
      location,
      vacancyId: (v && v.vacancyId) || null,
      saleKind: (v && v.saleKind) || null, // 경매·공매 물건이면 "경매"·"공매"
      vacancyUrl: (v && v.url) || "", // 블로그가 이 주소로 중개사무소 정보(표시·광고 출처)를 받는다
      dateText: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`,
      beforeUrl: picked[0] ? picked[0].url : (R.photos[0] || {}).url || "",
      versions: R.images.map((im, i) => ({ index: im.version, imageUrl: im.url, diffKo: R.spec.versionDiffsKo[im.version - 1] || "기본 디자인" })),
      design: Object.fromEntries(RM_GROUPS.map((g) => [g.label, rmNames(g.key, R.design[g.key])])),
      aspectRatio: R.design.aspectRatio,
      designSpec: R.spec.designSpec || {},
      constraints: R.spec.constraints || "",
      disclaimer: R.spec.disclaimer || "",
      cost: rmEstimateCost(R.costBase, R.design),
      vacancyFacts: v ? (v.fields || []).slice(0, 20) : [],
      /* 해설 재료 — 주변환경에 맞는 디자인, 신축 검토 같은 판단의 근거로 쓴다 */
      themes: v && Array.isArray(v.themes) ? v.themes : [],
      infra: v ? v.infra || "" : "",
      priceText: v ? v.priceText || "" : "",
      listing: v ? v.listing || null : null, // 표시·광고 출처 (물건 가져올 때 받은 것)
    };
    setResult(result);
  }

  function setResult(result) {
    R.result = result;
    renderResult();
    announceResult();
  }

  /* 2·3·4 탭이 쓰도록 panel.js 에 알린다 */
  function announceResult() {
    document.dispatchEvent(new CustomEvent("rm:result", { detail: R.result }));
  }

  function renderResult() {
    const r = R.result;
    el.result.classList.toggle("hidden", !r);
    el.resultEmpty.classList.toggle("hidden", Boolean(r));
    if (!r) { el.result.innerHTML = ""; return; }
    const [first, ...rest] = r.versions;
    const spec = r.designSpec || {};
    const c = r.cost;
    el.result.innerHTML = `
      <h3>📋 시뮬레이션 결과표</h3>
      <div class="rm-meta">${esc([r.title, r.location, r.dateText].filter(Boolean).join(" · "))}</div>
      ${r.versions.length < R.design.versions ? `<div class="rm-version-note">예측 이미지 <b>${r.versions.length}/${R.design.versions}</b> — 나머지 버전은 5단계 ④로 더 만들 수 있습니다. 지금 결과로 기사를 써도 됩니다.</div>` : ""}
      <div class="rm-ba">
        <figure><img src="${r.beforeUrl}" alt="현재 외관"><figcaption>현재</figcaption></figure>
        <figure class="after"><img src="${first ? first.imageUrl : ""}" alt="예측 외관"><figcaption>예측${r.versions.length > 1 ? " · 버전 1" : ""}</figcaption></figure>
      </div>
      ${first ? `<div class="rm-version-note"><b>디자인 방향</b> · ${esc(first.diffKo)}</div>` : ""}
      ${rest.length ? `<div class="rm-ba">${rest.map((v) => `<figure class="after"><img src="${v.imageUrl}" alt=""><figcaption>버전 ${v.index}</figcaption></figure>`).join("")}</div>
        ${rest.map((v) => `<div class="rm-version-note"><b>버전 ${v.index}</b> · ${esc(v.diffKo)}</div>`).join("")}` : ""}

      <div class="rm-block-title">디자인 사양표</div>
      <table class="rm-table">${Object.keys(RM_SPEC_LABELS).filter((k) => spec[k]).map((k) =>
        `<tr><th>${RM_SPEC_LABELS[k]}</th><td>${esc(spec[k])}</td></tr>`).join("")}</table>

      <div class="rm-block-title">예상 공사비 (개략)</div>
      <div class="rm-cost-total">${esc(c.rangeText)}</div>
      <div class="rm-text">외벽 약 ${c.area}m² (${esc(c.basisText)})</div>
      <table class="rm-table">${c.items.map((it) =>
        `<tr><th>${esc(it.label)}</th><td>${esc(it.basis || "")}</td><td class="amt">${esc(rmWon(it.min))}~<br>${esc(rmWon(it.max))}</td></tr>`).join("")}</table>
      <div class="rm-notice">※ ${esc(c.notice)}</div>
      <div class="rm-text">${esc(c.excludes)}</div>

      ${r.constraints ? `<div class="rm-block-title">제약·보존 규칙</div><div class="rm-text">${esc(r.constraints)}</div>` : ""}
      ${r.disclaimer ? `<div class="rm-disclaimer"><b>주의</b> · ${esc(r.disclaimer)}</div>` : ""}

      <div class="rm-result-actions">
        <button id="rmSaveSheet" class="btn-fill" type="button">📋 결과표 이미지 저장<small>임대인에게 보낼 수 있는 한 장짜리 결과표(PNG)</small></button>
        <button id="rmSaveImages" class="btn-line" type="button">🖼 예측 이미지 저장 (${r.versions.length}장)</button>
        <button id="rmToArticle" class="btn-fill green" type="button">이 결과로 기사 쓰기 →<small>2 · 기사 탭으로 갑니다</small></button>
      </div>`;
    $("rmSaveSheet").addEventListener("click", () =>
      guard($("rmSaveSheet"), "결과표 그리는 중", async () => {
        const png = await rmDrawSheet(r);
        rmDownload(png, `공실뉴스_리모델링_결과표_${r.dateText}.png`);
        toast("결과표 이미지를 저장했습니다.", "ok");
      })
    );
    $("rmSaveImages").addEventListener("click", () => {
      rmDownload(r.beforeUrl, `리모델링_현재외관_${r.dateText}.jpg`);
      r.versions.forEach((v) => rmDownload(v.imageUrl, `리모델링_예측_버전${v.index}_${r.dateText}.jpg`));
      toast(`이미지 ${r.versions.length + 1}장을 저장했습니다 (현재 외관 포함).`, "ok");
    });
    $("rmToArticle").addEventListener("click", () => $("tabWork").click());
  }

  /* ═════════════ 버튼 잠금 ═════════════ */
  function refresh() {
    const hasPhoto = pickedPhotos().length > 0;
    el.specOpen.disabled = !hasPhoto;
    el.specSubmit.disabled = !R.aiTabId;
    el.specPull.disabled = !R.aiTabId;
    const allDone = R.spec && R.images.length >= R.design.versions && !R.pending;
    el.imageReq.disabled = !R.spec || !R.aiTabId || !hasPhoto || allDone;
    el.imagePull.disabled = !R.pending || !R.aiTabId;
    renderImageProgress();
  }

  /* ═════════════ 상태 보관 ═════════════ */
  let lastSaveError = "";
  function save() {
    chrome.storage.local.set({ [SIM_KEY]: R }).catch((e) => {
      const msg = e.message || String(e);
      if (msg !== lastSaveError) { lastSaveError = msg; toast("작업 내용을 저장하지 못했습니다 — " + msg, "bad", 9000); }
    });
  }

  async function restore() {
    const got = await chrome.storage.local.get(SIM_KEY);
    const prev = got[SIM_KEY];
    if (prev) Object.assign(R, prev);
    if (!R.design || !Array.isArray(R.design.materials)) R.design = rmDefaultDesign();
    /* 버전 수 선택을 없앴다 — 예전에 2개 이상으로 저장했어도 1개로 맞추고, 받은 이미지는 첫 장만 쓴다 */
    R.design.versions = 1;
    /* 예전에 저장한 기준에는 세로(depth)가 없다 — 빠진 칸은 기본값으로 채운다 */
    R.costBase = Object.assign(rmDefaultCostBase(), R.costBase || {});
    if (!Array.isArray(R.photos)) R.photos = [];
    if (!Array.isArray(R.images)) R.images = [];
    R.images = R.images.slice(0, 1);
    if (R.images.length) R.pending = null;
    /* 이미지는 받았는데 결과표가 없으면(예전 방식: 모든 버전을 받아야 만들었다) 지금 만든다 */
    if (R.spec && R.images.length && !R.result) buildResult();
    else if (R.result && R.result.versions && R.result.versions.length > 1) R.result.versions = R.result.versions.slice(0, 1);
    for (const key of ["gongsilTabId", "aiTabId"]) {
      if (R[key] && !(await chrome.tabs.get(R[key]).catch(() => null))) R[key] = null;
    }
    if (!R.aiTabId) { R.specWriting = false; R.imageWriting = false; }
    platformBtns.forEach((b) => b.classList.toggle("active", b.dataset.rmPlatform === R.platform));
    announcePlatform();
    renderVacancy();
    renderPhotos();
    renderDesign();
    renderCostInputs();
    renderCost();
    renderSpec();
    renderResult();
    GWBusy.writing(el.specWriting, R.specWriting, "AI가 설계 지시서를 작성 중입니다", "다 쓰면 이 안내가 꺼집니다. 그때 ③ 지시서 가져오기를 누르세요");
    GWBusy.writing(el.imageWriting, R.imageWriting, "AI가 예측 이미지를 만드는 중입니다", "다 만들면 이 안내가 꺼집니다. 그때 ⑤ 이미지 가져오기를 누르세요");
    refresh();
  }

  /* 초기화할 때 panel.js 가 부른다 — 시뮬레이션 상태를 비운다 */
  globalThis.RMSim = {
    resetKeys: [SIM_KEY],
    result: () => R.result,
    platform: () => R.platform,
  };

  (async () => {
    await restore();
    announceResult();
    await checkAccess();
  })();
})();
