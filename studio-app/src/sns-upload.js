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
async function draft(baseUrl, o, onProgress = () => {}) {
  await ext.ensure(); // 지시문·SNS 정리는 서버에서 받은 파일 (video: 채널은 main.js 가 기다려 주지 않는다)
  const vacancy = vacancyOf(o.vacancyId);
  onProgress("글 AI가 유튜브·인스타그램 글을 쓰는 중… (1분 안팎)");
  const prompt = lib.gwVideoPostPrompt({ title: o.title, lines: o.lines, vacancy, ratio: o.ratio, seconds: o.seconds });
  const parse = (t) => {
    const j = lib.gwVideoParse(t);
    return j && j.youtube && j.instagram ? j : null;
  };
  const answer = await ai.ask(prompt, { onProgress, busyLabel: "영상 올릴 글을 쓰고 있습니다", isComplete: (t) => Boolean(parse(t)) });
  const j = parse(answer);
  if (!j) throw new Error("AI 답을 읽지 못했습니다. 다시 눌러 주세요.");
  const clean = (a) => (Array.isArray(a) ? a : []).map((x) => String(x || "").replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean);
  const yt = { title: String(j.youtube.title || "").trim().slice(0, 100), description: String(j.youtube.description || "").trim(), hashtags: clean(j.youtube.hashtags).slice(0, 10) };
  const ig = { caption: String(j.instagram.caption || "").trim(), hashtags: clean(j.instagram.hashtags).slice(0, 15) };
  const shorts = o.ratio === "9:16" || o.ratio === "1:1";
  if (shorts && !yt.hashtags.some((t) => t.toLowerCase() === "shorts")) yt.hashtags.push("Shorts");
  const t = await tailOf(baseUrl, o.vacancyId, o.saleKind);
  const ctx = { noun: o.saleKind ? "물건" : "매물", url: t.url, listing: t.listing };
  // 유튜브 = 페이스북과 같은 모양 (링크가 눌린다) · 인스타 = 프로필 링크 안내
  yt.text = sns.gwSnsCompose("facebook", { body: yt.description, hashtags: yt.hashtags }, ctx).text || yt.description;
  ig.text = sns.gwSnsCompose("instagram", { body: ig.caption, hashtags: ig.hashtags }, ctx).text || ig.caption;
  return { youtube: yt, instagram: ig, tail: { url: t.url, hasListing: Boolean(t.listing) } };
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
  return { ok: true, thumb, vis };
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
  if (o.channel === "youtube") return fillYoutube(o, onProgress);
  if (o.channel === "instagram") return fillInstagram(o, onProgress);
  throw new Error("아직 준비되지 않은 채널이에요.");
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
  const u = URLS[channel];
  if (!u) return false;
  const page = await chrome.openPage(u.host, u.open);
  // what = "verify" — 유튜브 전화번호 인증 (맞춤 썸네일을 올리려면)
  const to = what === "verify" && u.verify ? u.verify : channel === "youtube" ? u.upload : "";
  if (to) await page.goto(to, { waitUntil: "domcontentloaded" }).catch(() => {});
  return true;
}

module.exports = { draft, thumbs, fill, login, finishLogin, open };
