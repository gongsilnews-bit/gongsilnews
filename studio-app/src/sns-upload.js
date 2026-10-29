// 완성 영상 SNS 올리기 — 반자동 (2026-10-21 사장님, docs/2026-10-21_studio_sns_upload_plan.md)
// 스튜디오 전용 크롬(studio-chrome.js)에서 유튜브·인스타그램 올리기 화면을 열고
// 영상 파일 첨부 · 제목·설명(캡션) 채우기까지 한다.
//  - [게시]·[공유하기] 단추는 누르지 않는다 (네이버 블로그 채우기와 같은 원칙). 회원이 확인하고 누른다.
//  - 비밀번호는 받지 않는다. 로그인이 안 돼 있으면 "LOGIN:" 으로 알리고, 평범한 크롬(openPlain)에서 회원이 로그인한다.
//  - 중개사무소 정보·공실뉴스 링크·출처 줄은 AI 가 아니라 코드가 붙인다 (SNS 쓰기 gwSnsCompose 그대로).
//  - 사이트 화면이 바뀌면 이 파일의 찾기(SEL)만 고친다. 못 찾으면 거기서 멈추고 회원이 이어서 하게 알린다.
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const chrome = require("./studio-chrome");
const ext = require("./ext");
const ai = require("./ai");
const sns = require("./ext-sns");
const { fetchListing } = require("./naver-write");
const blogWriter = require("./blog-writer");

const lib = ext.lazyModule(() => ext.run(["video/video-script.js"], ["gwVideoFacts", "gwVideoPostPrompt", "gwVideoParse"]));

const URLS = {
  youtube: { host: "studio.youtube.com", open: "https://studio.youtube.com", upload: "https://www.youtube.com/upload", login: "https://studio.youtube.com", verify: "https://www.youtube.com/verify" },
  instagram: { host: "www.instagram.com", open: "https://www.instagram.com/", upload: "https://www.instagram.com/", login: "https://www.instagram.com/accounts/login/" },
};

/** 영상의 매물 정보 — 공실 분석 때 저장한 것만 (없으면 빈칸, 새로 분석하지 않는다) */
function vacancyOf(vacancyId) {
  if (!vacancyId) return null;
  try {
    const a = blogWriter.readJson(path.join(blogWriter.mediaDir(vacancyId), "analysis.json"));
    return a && a.vacancy ? a.vacancy : null;
  } catch {
    return null;
  }
}

/** 글 끝 — 공실뉴스 링크 · 매물 정보 출처 · 해시태그 (코드가 붙인다) */
async function tailOf(baseUrl, vacancyId, saleKind) {
  if (!vacancyId) return { url: "", listing: null };
  try {
    const listing = await fetchListing(baseUrl, vacancyId, saleKind || "");
    return { url: listing.detailUrl || "", listing };
  } catch (e) {
    log.warn("[SNS 올리기] 매물 출처를 못 가져옴", e.message);
    return { url: "", listing: null };
  }
}

/**
 * AI 초안 — { title, lines, vacancyId, saleKind, ratio, seconds }
 *  → { youtube: { title, description, hashtags, text }, instagram: { caption, hashtags, text }, tail: { url, hasListing } }
 *  text = 코드가 링크·출처·해시태그까지 붙인 최종 글 (회원이 고칠 수 있다)
 */
/** 이 공실(또는 칼럼)로 전에 쓴 블로그·SNS 글 — 영상 글이 겹치지 않게 (2026-10-28) */
function previousPosts(id) {
  if (!id) return null;
  try {
    const dir = blogWriter.mediaDir(id);
    const s = blogWriter.readJson(path.join(dir, "sns.json")) || {};
    const b = blogWriter.readJson(path.join(dir, "blog.json")) || {};
    const p = s.posts || {};
    const out = {
      blog: [b.title, ...(Array.isArray(b.paragraphs) ? b.paragraphs.slice(0, 2) : [])].filter(Boolean).join("\n"),
      instagram: p.instagram && p.instagram.body,
      facebook: p.facebook && p.facebook.body,
      threads: p.threads && Array.isArray(p.threads.posts) ? p.threads.posts.join("\n") : "",
    };
    return Object.values(out).some(Boolean) ? out : null;
  } catch {
    return null;
  }
}

async function draft(baseUrl, o, onProgress = () => {}) {
  await ext.ensure(); // 지시문·SNS 정리는 서버에서 받은 파일 (video: 채널은 main.js 가 기다려 주지 않는다)
  // 매물 정보(사무소 이름·홈페이지)를 먼저 받아 지시문에도 넣는다 — 글의 주인공은 회원의 부동산 (2026-10-29 사장님)
  const t = await tailOf(baseUrl, o.vacancyId, o.saleKind);
  const owner = (t.listing && t.listing.owner) || {};
  const base = vacancyOf(o.vacancyId);
  const vacancy = base || owner.type ? { ...(base || {}), ...(owner.type === "agency" ? { office: owner.name, homepage: owner.homepage || "" } : owner.type === "general" ? { landlord: owner.name } : {}) } : null;
  onProgress("글 AI가 유튜브·인스타그램·페이스북·스레드 글을 쓰는 중… (1분 안팎)");
  // 문체 — 내 영상 올리기에서 고른 것 (사진 SNS 글과 같은 6가지, 네 채널 같이, 2026-10-29 사장님)
  const TONES = require("./sns-writer").TONES || {};
  const toneRule = o.tone && TONES[o.tone] && o.tone !== "polite"
    ? `

[문체 지정 — 위 지시보다 우선 · 네 채널 같이]
- ${TONES[o.tone]}
문체만 바꾸고 사실은 자료에 있는 것만 쓰십시오. 정보 글 원칙과 출력 JSON 형식은 그대로 지키십시오.`
    : "";
  // 예전 글을 넘길 때 사무소 이름·물건번호를 지운다 — 안 지우면 AI 가 "○○가 소개하는"을 따라 쓴다 (2026-10-29 사장님)
  const nb = require("./naver-write").naverBlogLib ? require("./naver-write").naverBlogLib() : null;
  const scrub = (txt) => (nb && nb.infoText ? nb.infoText(txt, t.listing) : String(txt || ""));
  const prev = previousPosts(o.vacancyId);
  const prevClean = prev ? Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, scrub(v)])) : null;
  const prompt = lib.gwVideoPostPrompt({ title: o.title, lines: o.lines, vacancy, ratio: o.ratio, seconds: o.seconds, previous: prevClean, posted: Array.isArray(o.posted) ? o.posted : [] }) + toneRule;
  const parse = (t) => {
    const j = lib.gwVideoParse(t);
    return j && j.youtube && j.instagram ? j : null;
  };
  const answer = await ai.ask(prompt, { onProgress, busyLabel: "영상 올릴 글을 쓰고 있습니다", isComplete: (t) => Boolean(parse(t)) });
  const j = parse(answer);
  if (!j) throw new Error("AI 답을 읽지 못했습니다. 다시 눌러 주세요.");
  const clean = (a) => (Array.isArray(a) ? a : []).map((x) => String(x || "").replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean);
  const yt = { title: scrub(String(j.youtube.title || "").trim()).slice(0, 100), description: String(j.youtube.description || "").trim(), hashtags: clean(j.youtube.hashtags).slice(0, 10) };
  const ig = { caption: String(j.instagram.caption || "").trim(), hashtags: clean(j.instagram.hashtags).slice(0, 15) };
  const shorts = o.ratio === "9:16" || o.ratio === "1:1";
  if (shorts && !yt.hashtags.some((t) => t.toLowerCase() === "shorts")) yt.hashtags.push("Shorts");
  const ctx = { noun: o.saleKind ? "물건" : "매물", url: t.url, listing: t.listing };
  // 유튜브 = 페이스북과 같은 모양 (링크가 눌린다) · 인스타 = 프로필 링크 안내
  yt.text = sns.gwSnsCompose("facebook", { body: yt.description, hashtags: yt.hashtags }, ctx).text || yt.description;
  ig.text = sns.gwSnsCompose("instagram", { body: ig.caption, hashtags: ig.hashtags }, ctx).text || ig.caption;
  // 페이스북·스레드 (2026-10-28) — 같은 질문 한 번에 받은 글. 예전 지시문이라 없으면 유튜브 설명 · 인스타 캡션으로
  const fbBody = String((j.facebook && j.facebook.body) || "").trim() || yt.description;
  const fbTags = clean(j.facebook && j.facebook.hashtags).slice(0, 5);
  const fb = { text: sns.gwSnsCompose("facebook", { body: fbBody, hashtags: fbTags.length ? fbTags : yt.hashtags.slice(0, 5) }, ctx).text || fbBody };
  const thBody = String((j.threads && j.threads.text) || "").trim() || ig.caption;
  const thc = sns.gwSnsCompose("threads", { posts: [thBody.slice(0, 430)] }, ctx);
  const th = { text: thc.text || thBody, posts: thc.posts && thc.posts.length ? thc.posts : [thBody] };
  return { youtube: yt, instagram: ig, facebook: fb, threads: th, tail: { url: t.url, hasListing: Boolean(t.listing) } };
}

/* ── 썸네일 (유튜브 일반 영상, 2026-10-21 결정) — 완성 영상에서 장면 3장 · 제목을 크게 얹은 것 / 글자 없는 것 ──
   1280×720 JPG (유튜브 썸네일 권장 크기). 파일은 영상 옆 "○○_썸네일" 폴더 */
async function thumbs(o, onProgress = () => {}) {
  const ff = require("./video/ff");
  const media = require("./video/media");
  const fonts = require("./video/fonts");
  if (!o || !o.file || !fs.existsSync(o.file)) throw new Error("영상 파일을 찾지 못했어요.");
  const dur = Number(o.duration) > 0 ? Number(o.duration) : 10;
  const dir = path.join(path.dirname(o.file), `${path.basename(o.file, path.extname(o.file))}_썸네일`);
  fs.mkdirSync(dir, { recursive: true });
  // 제목 — 두 줄까지 (낱말 사이에서 나눔), 글꼴은 Pretendard (작업 폴더에 복사해 상대 경로로 — 윈도우 경로의 : 를 피한다)
  const title = String(o.title || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const words = title.split(" ");
  const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + " " + w).length > 16 && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = cur ? `${cur} ${w}` : w;
  }
  fs.writeFileSync(path.join(dir, "title.txt"), lines.join("\n"), "utf8");
  let fontOk = false;
  try {
    const [f] = await fonts.files("Pretendard");
    fs.copyFileSync(f, path.join(dir, "font.otf"));
    fontOk = true;
  } catch (e) {
    log.warn("[썸네일] 글꼴 못 받음", e.message);
  }
  const fit = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720";
  const text = "drawtext=fontfile=font.otf:textfile=title.txt:fontsize=92:fontcolor=white:borderw=7:bordercolor=black:line_spacing=12:x=(w-text_w)/2:y=h-text_h-70:box=1:boxcolor=black@0.35:boxborderw=26";
  const out = [];
  const at = [0.12, 0.45, 0.75].map((k) => Math.max(0, Math.min(dur - 0.1, dur * k)));
  for (let i = 0; i < at.length; i++) {
    onProgress(`썸네일 만드는 중… (${i + 1}/${at.length})`);
    const plain = path.join(dir, `장면${i + 1}.jpg`);
    const withTitle = path.join(dir, `장면${i + 1}_제목.jpg`);
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", at[i].toFixed(2), "-i", o.file, "-frames:v", "1", "-vf", fit, "-q:v", "3", plain], { cwd: dir });
    if (fontOk && title) await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", at[i].toFixed(2), "-i", o.file, "-frames:v", "1", "-vf", `${fit},${text}`, "-q:v", "3", withTitle], { cwd: dir }).catch((e) => log.warn("[썸네일] 제목 못 얹음", e.message));
    for (const f of [plain, withTitle]) if (fs.existsSync(f)) media.allow(f);
    out.push({ at: at[i], plain: { file: plain, url: media.urlOf(plain) }, title: fs.existsSync(withTitle) ? { file: withTitle, url: media.urlOf(withTitle) } : null });
  }
  return out;
}

/* ── 크롬 채우기 공통 ── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** 여러 후보 중 먼저 보이는 것 (못 찾으면 null) */
async function firstVisible(page, sels, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const s of sels) {
      const loc = page.locator(s).first();
      try {
        if (await loc.isVisible()) return loc;
      } catch {}
    }
    await sleep(400);
  }
  return null;
}
/** 글 칸(contenteditable·textarea)에 글 넣기 — 있던 글은 지우고 */
async function typeInto(page, loc, text) {
  await loc.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(String(text || ""));
}
/** 단추 — 글자로 찾기 (한국어·영어 화면 모두) */
const byText = (labels) => labels.map((t) => `button:has-text("${t}"), div[role="button"]:has-text("${t}")`);

/** 썸네일 그림을 유튜브용으로 — 1280×720 JPG (가운데 맞춰 자름, 2MB 아래로) */
async function thumbJpg(file) {
  const ff = require("./video/ff");
  const out = path.join(require("electron").app.getPath("temp"), `gs-thumb-${Date.now()}.jpg`);
  await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", "-i", file, "-frames:v", "1", "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "3", out]);
  return fs.existsSync(out) ? out : file;
}

/* ── 유튜브 ── */
// 유튜브 스튜디오 화면 요소 — 바뀌면 여기만 고친다
const YT = {
  title: ["#title-textarea #textbox", "ytcp-social-suggestions-textbox#title-textarea #textbox", "#textbox[aria-label*='제목']", "#textbox[aria-label*='title' i]"],
  desc: ["#description-textarea #textbox", "ytcp-social-suggestions-textbox#description-textarea #textbox", "#textbox[aria-label*='설명']", "#textbox[aria-label*='description' i]"],
  notKids: ["tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK']", "#radioLabel:has-text('아동용이 아님')", "#radioLabel:has-text('not made for kids')"],
  next: ["#next-button", "ytcp-button#next-button"],
  // 영상 넣는 곳 — 업로드 창 안의 파일 칸부터 (2026-10-22)
  picker: ["ytcp-uploads-file-picker input[type='file']", "ytcp-uploads-dialog input[type='file'][name='Filedata']", "ytcp-uploads-dialog input[type='file']", "input[type='file'][name='Filedata']"],
  selectBtn: "#select-files-button, ytcp-button#select-files-button, ytcp-uploads-file-picker ytcp-button",
  // 썸네일 — 그림 넣는 곳 · 오류 글 · 영상 주소(자리가 생겼는지)
  thumbInput: "ytcp-thumbnail-uploader input#file-loader, input#file-loader",
  thumbError: "ytcp-video-thumbnail-editor .error, ytcp-thumbnail-editor .error, ytcp-video-thumbnail-editor #error-message",
  videoLink: ["a[href*=\"youtu.be/\"]", "a[href*=\"youtube.com/shorts/\"]"], // 클래스 이름은 자주 바뀐다 (2026-10-21 ytcpVideoInfoVideoUrlFadeable) — 주소로 찾는다
  thumbButton: "ytcp-thumbnail-uploader #select-button",
  verifyDialog: "tp-yt-paper-dialog:visible, ytcp-dialog:visible",
  vis: { public: "tp-yt-paper-radio-button[name='PUBLIC']", unlisted: "tp-yt-paper-radio-button[name='UNLISTED']", private: "tp-yt-paper-radio-button[name='PRIVATE']" },
};

async function fillYoutube(o, onProgress) {
  onProgress("스튜디오 전용 크롬에서 유튜브 올리기 화면을 여는 중…");
  const page = await chrome.openPage(URLS.youtube.host, URLS.youtube.open);
  await page.goto(URLS.youtube.upload, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  if (/accounts\.google\.com|ServiceLogin|signin/i.test(page.url())) throw new Error("LOGIN: 유튜브(구글)에 로그인되어 있지 않습니다. 아래 [유튜브 로그인]을 눌러 로그인한 뒤 다시 채워 주세요.");
  if (/youtube\.com\/create_channel|channel_switcher/i.test(page.url())) throw new Error("유튜브 채널이 아직 없어요. 크롬 창에서 채널을 먼저 만든 뒤 다시 채워 주세요.");

  onProgress("영상 파일을 첨부하는 중…");
  // 업로드 칸을 정확히 — 페이지 첫 파일 칸이 업로드 칸이 아닐 때가 있다 (2026-10-22: 엉뚱한 칸에 들어가 영상이 안 올라감)
  const attach = async () => {
    await page.locator(YT.picker.join(", ")).first().waitFor({ state: "attached", timeout: 20000 }).catch(() => {});
    for (const sel of YT.picker) {
      const inp = page.locator(sel).first();
      if (!(await inp.count().catch(() => 0))) continue;
      try { await inp.setInputFiles(o.file); return true; } catch {}
    }
    // 그래도 안 되면 [파일 선택] 단추를 눌러 파일 창으로
    try {
      const [fc] = await Promise.all([page.waitForEvent("filechooser", { timeout: 15000 }), page.locator(YT.selectBtn).first().click({ timeout: 10000 })]);
      await fc.setFiles(o.file);
      return true;
    } catch { return false; }
  };
  if (!(await attach())) throw new Error("유튜브 올리기 화면에서 파일 넣는 곳을 찾지 못했어요. 크롬 창에서 [파일 선택]으로 영상을 직접 넣어 주세요.");

  onProgress("제목·설명을 채우는 중… (영상이 올라가는 동안)");
  let title = await firstVisible(page, YT.title, 30000);
  if (!title && (await page.locator(YT.selectBtn).first().isVisible().catch(() => false))) {
    // 아직 "파일 선택" 화면 — 파일이 안 들어갔다. [파일 선택]으로 한 번 더
    log.warn("[유튜브] 파일이 안 들어가 다시 넣음");
    try {
      const [fc] = await Promise.all([page.waitForEvent("filechooser", { timeout: 15000 }), page.locator(YT.selectBtn).first().click({ timeout: 10000 })]);
      await fc.setFiles(o.file);
    } catch {}
    title = await firstVisible(page, YT.title, 60000);
  } else if (!title) title = await firstVisible(page, YT.title, 30000);
  if (!title) return { ok: true, partial: "제목 칸을 찾지 못했어요. 크롬 창에서 제목·설명을 직접 넣어 주세요 (글은 [글 복사]로)." };
  await typeInto(page, title, o.title);
  const desc = await firstVisible(page, YT.desc, 5000);
  if (desc) await typeInto(page, desc, o.text);

  // 썸네일 (2026-10-21 고침 — 바로 넣으면 "오류가 발생했습니다": 영상 자리가 생기기 전이었다)
  //  ① 1280×720 JPG 로 바꿔 둔다 (2MB 넘는 그림·16:9 아닌 그림도) ② 영상 주소(자리)가 생길 때까지 기다린다
  //  ③ #file-loader 에 넣고 ④ 썸네일 칸에 오류가 뜨면 한 번 더
  let thumb = "none";
  if (o.thumb && fs.existsSync(o.thumb)) {
    thumb = "fail";
    try {
      const jpg = await thumbJpg(o.thumb);
      onProgress("영상 자리가 생기기를 기다리는 중… (썸네일을 넣으려고)");
      await firstVisible(page, YT.videoLink, 90000);
      for (let k = 0; k < 2 && thumb !== "ok"; k++) {
        if (k) await sleep(8000);
        onProgress(k ? "썸네일을 한 번 더 넣는 중…" : "썸네일을 넣는 중…");
        const input = page.locator(YT.thumbInput).first();
        await input.waitFor({ state: "attached", timeout: 15000 });
        await input.setInputFiles(jpg);
        await sleep(6000);
        const bad = await page.locator(YT.thumbError).filter({ hasText: /오류|error/i }).count().catch(() => 0);
        thumb = bad ? "fail" : "ok";
        if (bad) {
          // 전화번호 인증 안 된 채널인지 — [파일 업로드]를 눌러 보면 "맞춤 썸네일을 추가하려면 전화번호를 인증하세요" 창이 뜬다 (2026-10-21 확인)
          await page.locator(YT.thumbButton).first().click({ timeout: 5000 }).catch(() => {});
          await sleep(1500);
          const dlg = page.locator(YT.verifyDialog).filter({ hasText: /전화번호|인증|verify/i });
          if (await dlg.count().catch(() => 0)) {
            await dlg.locator("button:has-text(\"취소\"), button:has-text(\"Cancel\")").first().click({ timeout: 4000 }).catch(() => {});
            thumb = "verify";
            break;
          }
        }
      }
    } catch (e) {
      log.warn("[유튜브] 썸네일 못 넣음", e.message);
    }
  }

  // 아동용 아님 — 고르지 않으면 다음으로 못 간다
  const kids = await firstVisible(page, YT.notKids, 8000);
  if (kids) await kids.click().catch(() => {});

  // 공개 범위 — [다음]으로 마지막 단계까지 가서 고르고 멈춘다 ([게시]는 누르지 않는다)
  let vis = "skip";
  if (o.visibility) {
    try {
      for (let i = 0; i < 3; i++) {
        const nx = await firstVisible(page, YT.next, 8000);
        if (!nx) break;
        await nx.click();
        await sleep(1200);
      }
      const r = page.locator(YT.vis[o.visibility] || YT.vis.public).first();
      await r.waitFor({ state: "visible", timeout: 8000 });
      await r.click();
      vis = "ok";
    } catch (e) {
      vis = "fail";
      log.warn("[유튜브] 공개 범위 못 고름", e.message);
    }
  }
  await page.bringToFront().catch(() => {});
  log.info(`[유튜브] 채움 — 썸네일 ${thumb} · 공개 범위 ${vis}`);
  void watchYoutubePublish(page, o);
  return { ok: true, thumb, vis };
}

/* 홍보현황 (2026-10-28) — 회원이 [게시]하면 그 영상 주소를 공실(또는 내 기사) 홍보현황에.
   영상 주소는 올리는 중에 이미 보인다 (YT.videoLink). "게시됨" 창 모양은 자주 바뀌어 믿지 않고 (2026-10-28 쇼츠에서 못 알아봄),
   업로드 창이 닫힌 뒤 유튜브에 그 영상이 공개(일부 공개 포함)됐는지 직접 묻는다 (oEmbed — 비공개·임시 저장이면 404).
   업로드 창이 열린 채 30분, 닫힌 뒤 10분까지 본다 */
const ytId = (href) => (/(?:youtu\.be\/|shorts\/|[?&]v=)([\w-]{6,})/.exec(String(href || "")) || [])[1] || "";
async function isPublic(id) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    return r.ok;
  } catch { return false; }
}
async function watchYoutubePublish(page, o) {
  const id = String(o.vacancyId || "");
  const isVacancy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const articleNo = isVacancy ? "" : require("./column-writer").articleOf(id);
  if (!isVacancy && !articleNo) return;
  const meta = isVacancy ? { vacancyId: id, channel: "youtube" } : { articleNo, channel: "youtube" };
  let vid = "", link = "", closedAt = 0;
  const end = Date.now() + 30 * 60 * 1000;
  while (Date.now() < (closedAt ? closedAt + 10 * 60 * 1000 : end)) {
    if (!vid && !page.isClosed()) {
      for (const sel of YT.videoLink) {
        const href = await page.locator(sel).first().getAttribute("href", { timeout: 1000 }).catch(() => null);
        if (href && ytId(href)) { vid = ytId(href); link = /shorts\//.test(href) ? `https://www.youtube.com/shorts/${vid}` : `https://www.youtube.com/watch?v=${vid}`; break; }
      }
    }
    if (vid && !closedAt) {
      const open = !page.isClosed() && (await page.locator("ytcp-uploads-dialog").first().isVisible().catch(() => false));
      if (!open) { closedAt = Date.now(); log.info(`[유튜브] 업로드 창 닫힘 — 공개됐는지 확인 ${vid}`); }
    }
    if (closedAt && (await isPublic(vid))) {
      require("./helper-server").published(meta, link);
      return;
    }
    await sleep(closedAt ? 10000 : 3000);
  }
  log.info(`[유튜브] 공개된 것을 못 봐서 홍보현황 연결 안 함 ${id} ${vid || "(영상 주소 못 봄)"}`);
}

/* ── 인스타그램 (릴스) ── */
const IG = {
  create: ["svg[aria-label='새로운 게시물']", "svg[aria-label='New post']", "a:has-text('만들기')", "span:has-text('만들기')", "a:has-text('Create')", "span:has-text('Create')"],
  post: ["span:has-text('게시물')", "span:has-text('Post')"],
  ok: byText(["확인", "OK"]),
  next: byText(["다음", "Next"]),
  caption: ["div[aria-label='문구를 입력하세요...']", "div[aria-label='Write a caption...']", "div[contenteditable='true'][role='textbox']", "textarea[aria-label*='문구']"],
};

async function fillInstagram(o, onProgress) {
  onProgress("스튜디오 전용 크롬에서 인스타그램을 여는 중…");
  const page = await chrome.openPage(URLS.instagram.host, URLS.instagram.open);
  if (!/instagram\.com\/?$/.test(page.url().split("?")[0])) await page.goto(URLS.instagram.open, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  if (/accounts\/login/.test(page.url()) || (await page.locator("input[name='username']").count().catch(() => 0)) > 0) {
    throw new Error("LOGIN: 인스타그램에 로그인되어 있지 않습니다. 아래 [인스타그램 로그인]을 눌러 로그인한 뒤 다시 채워 주세요.");
  }
  onProgress("새 게시물 만들기를 여는 중…");
  const create = await firstVisible(page, IG.create, 15000);
  if (!create) throw new Error("인스타그램 [만들기] 단추를 찾지 못했어요. 크롬 창에서 [만들기]를 직접 눌러 영상을 넣어 주세요 (글은 [글 복사]로).");
  await create.click();
  await sleep(1200);
  const post = await firstVisible(page, IG.post, 3000); // 만들기 → [게시물] 고르는 메뉴가 뜨는 화면도 있다
  if (post) await post.click().catch(() => {});

  onProgress("영상 파일을 첨부하는 중…");
  try {
    const input = page.locator("input[type='file']").first();
    await input.waitFor({ state: "attached", timeout: 15000 });
    await input.setInputFiles(o.file);
  } catch {
    throw new Error("인스타그램에서 파일 넣는 곳을 찾지 못했어요. 크롬 창의 [컴퓨터에서 선택]으로 영상을 직접 넣어 주세요.");
  }
  await sleep(3000);
  const ok = await firstVisible(page, IG.ok, 4000); // "동영상 게시물은 이제 릴스로 공유됩니다" 안내
  if (ok) await ok.click().catch(() => {});

  onProgress("자르기·편집 단계를 넘기는 중…");
  for (let i = 0; i < 2; i++) {
    const nx = await firstVisible(page, IG.next, 30000);
    if (!nx) return { ok: true, partial: "[다음] 단추를 찾지 못했어요. 크롬 창에서 [다음]을 눌러 문구 칸까지 가서 글을 붙여 넣어 주세요 (글은 [글 복사]로)." };
    await nx.click();
    await sleep(1800);
  }
  onProgress("문구(캡션)를 채우는 중…");
  const cap = await firstVisible(page, IG.caption, 15000);
  if (!cap) return { ok: true, partial: "문구 칸을 찾지 못했어요. 크롬 창에서 글을 붙여 넣어 주세요 (글은 [글 복사]로)." };
  await typeInto(page, cap, o.text);
  await page.bringToFront().catch(() => {});
  log.info("[인스타그램] 채움");
  return { ok: true };
}

/** 채우기 — { channel, file, title, text, visibility, thumb } */
async function fill(o, onProgress = () => {}) {
  if (!o || !o.file || !fs.existsSync(o.file)) throw new Error("올릴 영상 파일을 찾지 못했어요. 다시 내보내 주세요.");
  if (o.channel === "youtube") return fillYoutubeByHelper(o, onProgress);
  if (o.channel === "instagram" || o.channel === "threads" || o.channel === "facebook") return fillVideoPostByHelper(o, onProgress);
  throw new Error("아직 준비되지 않은 채널이에요.");
}

/* 유튜브 — 평소 크롬 + 공실마케팅 도우미 (2026-10-28 사장님: 전용 크롬 싫어)
   영상·썸네일 파일은 PC 안 창구로 내주고(helper-server addFile), 평소 크롬에 업로드 화면을 연다 →
   도우미(helper-youtube.js)가 받아 가서 영상·제목·설명·썸네일·아동용 아님·공개 범위까지 채운다. [게시]는 회원이.
   공실(또는 내 기사) 영상이면 업로드 창이 닫힐 때 주소를 받아, 공개됐는지 확인하고 홍보현황에 */
async function fillYoutubeByHelper(o, onProgress) {
  const { shell } = require("electron");
  const helper = require("./helper-server");
  onProgress("영상 파일을 준비하는 중…");
  const video = helper.addFile(o.file, "video/mp4");
  let thumb = null;
  if (o.thumb && fs.existsSync(o.thumb)) {
    try { thumb = helper.addFile(await thumbJpg(o.thumb), "image/jpeg"); } catch (e) { log.warn("[유튜브] 썸네일 준비 못함", e.message); }
  }
  const id = String(o.vacancyId || "");
  const isVacancy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  // 내 기사 — 화면에서 고른 기사 번호 또는 칼럼(홈 "내 기사")의 기사
  const articleNo = isVacancy ? "" : /^\d+$/.test(String(o.articleNo || "")) ? String(o.articleNo) : require("./column-writer").articleOf(id);
  const meta = isVacancy ? { vacancyId: id, channel: "youtube" } : articleNo ? { articleNo, channel: "youtube" } : null;
  const job = helper.addJob("youtube", { title: o.title, text: o.text, visibility: o.visibility || "public", video, thumb }, meta);
  void shell.openExternal(URLS.youtube.upload);
  onProgress("평소 크롬에 유튜브 올리기 화면을 열었어요. 공실마케팅 도우미가 채우기를 기다리는 중…");
  if (!(await helper.wait(job, "taken", 45000))) {
    helper.cancel(job);
    throw new Error("공실마케팅 도우미(크롬 확장)가 응답하지 않았어요. 평소 크롬에 도우미가 켜져 있고 유튜브에 로그인돼 있는지 확인해 주세요. 안 되면 [영상 폴더]·[글 복사]로 직접 올려 주세요.");
  }
  onProgress("도우미가 영상을 넣고 제목·설명을 채우는 중… (영상이 크면 1~2분)");
  const r = await helper.wait(job, "done", 10 * 60 * 1000);
  if (!r) return { ok: true, partial: "도우미가 끝났다고 알려 오지 않았어요. 크롬 창에서 제목·설명·공개 범위를 확인해 주세요." };
  if (!r.ok) throw new Error(r.error || "유튜브 채우기를 마치지 못했어요. 크롬 창에서 이어서 해 주세요.");
  log.info(`[유튜브] 도우미 채움 — 썸네일 ${r.thumb} · 공개 범위 ${r.vis}`);
  return { ok: true, thumb: r.thumb, vis: r.vis, partial: r.partial };
}

/* 인스타그램 릴스 · 스레드 · 페이스북 영상 — 평소 크롬 + 공실마케팅 도우미 (2026-10-28 사장님: 전용 크롬 싫어)
   영상은 PC 안 창구로 내주고 평소 크롬에 그 채널을 연다 → 도우미(helper-sns.js)가 사진 게시물과 같은 흐름으로 영상·글을 넣는다.
   [공유하기]·[게시]는 회원이. 공실(또는 내 기사) 영상이면 올린 글 주소를 홍보현황에 — 같은 채널에 예전 링크가 있으면 새 것으로 바뀐다 */
const VIDEO_POST = {
  instagram: { home: "https://www.instagram.com/", label: "인스타그램 릴스", name: "인스타그램" },
  threads: { home: "https://www.threads.com/", label: "스레드", name: "스레드" },
  facebook: { home: "https://www.facebook.com/", label: "페이스북", name: "페이스북" },
};
async function fillVideoPostByHelper(o, onProgress) {
  const ch = VIDEO_POST[o.channel];
  const { shell } = require("electron");
  const helper = require("./helper-server");
  onProgress("영상 파일을 준비하는 중…");
  const video = helper.addFile(o.file, "video/mp4");
  const id = String(o.vacancyId || "");
  const isVacancy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const articleNo = isVacancy ? "" : /^\d+$/.test(String(o.articleNo || "")) ? String(o.articleNo) : require("./column-writer").articleOf(id);
  const meta = isVacancy ? { vacancyId: id, channel: o.channel } : articleNo ? { articleNo, channel: o.channel } : null;
  const posts = Array.isArray(o.posts) && o.posts.length ? o.posts : [o.text];
  const job = helper.addJob(o.channel, { channel: o.channel, label: ch.label, text: o.text, posts, photos: [], video }, meta);
  void shell.openExternal(ch.home);
  onProgress(`평소 크롬에 ${ch.name}을(를) 열었어요. 공실마케팅 도우미가 채우기를 기다리는 중…`);
  if (!(await helper.wait(job, "taken", 45000))) {
    helper.cancel(job);
    throw new Error(`공실마케팅 도우미(크롬 확장)가 응답하지 않았어요. 평소 크롬에 도우미가 켜져 있고 ${ch.name}에 로그인돼 있는지 확인해 주세요. 안 되면 [영상 폴더]·[글 복사]로 직접 올려 주세요.`);
  }
  onProgress("도우미가 영상을 넣고 글을 채우는 중…");
  const r = await helper.wait(job, "done", 10 * 60 * 1000);
  if (!r) return { ok: true, partial: "도우미가 끝났다고 알려 오지 않았어요. 크롬 창에서 이어서 해 주세요." };
  if (!r.ok && r.error) throw new Error(r.error);
  log.info(`[${ch.label}] 영상 도우미 채움 ${JSON.stringify(r).slice(0, 120)}`);
  return { ok: true, partial: r.partial ? "몇 단계는 크롬 창의 도우미 상자 안내대로 이어서 해 주세요." : undefined };
}

/** 로그인 — 조종하지 않는 평범한 크롬에서 회원이 직접 (구글 로그인은 조종 중이면 막힌다) */
function login(channel) {
  const u = URLS[channel];
  if (!u) return false;
  chrome.openPlain(u.login).catch(() => {});
  return true;
}
/** [로그인 다 했어요] — 로그인 크롬을 정상 종료 (로그인이 저장되게) */
const finishLogin = () => chrome.closePlain();
/** 사이트만 열기 (채우기가 안 될 때) */
async function open(channel, what) {
  if (VIDEO_POST[channel] && !URLS[channel]) { void require("electron").shell.openExternal(VIDEO_POST[channel].home); return true; } // 스레드·페이스북 — 평소 크롬
  const u = URLS[channel];
  if (!u) return false;
  if (channel === "youtube" || channel === "instagram") { // 평소 크롬 (2026-10-28)
    void require("electron").shell.openExternal(what === "verify" && u.verify ? u.verify : u.upload);
    return true;
  }
  const page = await chrome.openPage(u.host, u.open);
  // what = "verify" — 유튜브 전화번호 인증 (맞춤 썸네일을 올리려면)
  const to = what === "verify" && u.verify ? u.verify : channel === "youtube" ? u.upload : "";
  if (to) await page.goto(to, { waitUntil: "domcontentloaded" }).catch(() => {});
  return true;
}

module.exports = { draft, thumbs, fill, login, finishLogin, open };
