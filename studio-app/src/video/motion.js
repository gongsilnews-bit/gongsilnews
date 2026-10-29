// 모션그래픽 틀 굽기 (2026-10-28 사장님) — motion\<틀>.html 을 안 보이는 창에 열고 한 장씩 찍어 MP4 로
//  틀 규칙 (motion\base.js): window.__setup(data) → Promise, window.__seek(t) → Promise, window.__SFX = [{ t, name, vol }]
//  고를 수 있는 것: 틀 · 배경(공실 사진 / 내 사진·영상) · 글씨(글꼴) · 색 — 효과음은 틀마다 정해진 자리에 섞는다
//  공실 정보는 분석해 둔 것(analysis.json)에서만 — 없는 값은 비운다 (지어내지 않는다)
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const log = require("electron-log/main");
const ff = require("./ff");

const SIZES = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "4:3": [1440, 1080] };
const TEMPLATES = {
  intro: { file: "intro.html", seconds: 3, label: "기본 (핀)", desc: "핀이 떨어지고 동네·종류·가격이 차례로" },
  impact: { file: "impact.html", seconds: 3, label: "가격 쾅", desc: "가격 숫자가 올라가다 쾅! 화면이 흔들려요" },
  split: { file: "split.html", seconds: 3, label: "갈라짐", desc: "색 판이 갈라지며 사진이 드러나요" },
  breaking: { file: "breaking.html", seconds: 3, label: "속보형", desc: "뉴스 자막처럼 '신규 매물' 띠가 들어와요" },
  gold: { file: "gold.html", seconds: 3, label: "고급형", desc: "금빛 선과 넓게 퍼졌다 모이는 글자" },
  neon: { file: "neon.html", seconds: 3, label: "네온", desc: "네온 간판처럼 깜빡이며 켜지는 글자" },
  typewriter: { file: "typewriter.html", seconds: 3, label: "타자기 메모", desc: "메모지에 한 글자씩 쳐지는 글" },
  punch: { file: "punch.html", seconds: 3, label: "줌 펀치", desc: "큰 단어가 한 박자씩 화면 가득" },
  polaroid: { file: "polaroid.html", seconds: 3, label: "폴라로이드", desc: "찰칵! 사진이 폴라로이드로 떨어져요" },
  minimal: { file: "minimal.html", seconds: 3, label: "미니멀", desc: "흰 바탕에 가는 선, 깔끔한 정리" },
  stamp: { file: "stamp.html", seconds: 3, label: "도장 쾅", desc: "거래 종류 도장이 쾅 찍혀요" },
  countdown: { file: "countdown.html", seconds: 3, label: "카운트다운", desc: "3·2·1 뒤에 매물 공개" },
  // Anime.js 로 만든 고급 틀 (2026-10-28)
  kinetic: { file: "kinetic.html", seconds: 3, label: "키네틱", desc: "글자가 한 자씩 회전하며 튀어 들어오고 밑줄이 그려져요" },
  luxe: { file: "luxe.html", seconds: 3, label: "럭셔리 라인", desc: "금빛 선이 감싸고 글자가 흐림에서 또렷하게" },
  // 끝 화면 (2026-10-28) — 사무소·대표·등록번호·소재지(표시광고) · 전화 · QR
  outro: { kind: "outro", file: "outro.html", seconds: 3.5, label: "기본 카드", desc: "흐린 사진 위 흰 카드에 사무소·전화·QR" },
  "outro-gold": { kind: "outro", file: "outro-gold.html", seconds: 3.5, label: "고급형", desc: "금빛 테두리, 넓게 퍼졌다 모이는 이름" },
  "outro-news": { kind: "outro", file: "outro-news.html", seconds: 3.5, label: "뉴스형", desc: "뉴스 자막 띠 · 흐르는 정보 줄" },
  "outro-minimal": { kind: "outro", file: "outro-minimal.html", seconds: 3.5, label: "미니멀", desc: "흰 바탕, 가는 선, 깔끔하게" },
  "outro-pop": { kind: "outro", file: "outro-pop.html", seconds: 3.5, label: "쇼츠 팝", desc: "'지금 문의하세요!' 통통 튀는 노랑" },
  // 장면에 입히는 모션 (2026-10-28) — 클립 화면을 배경으로, 길이는 클립(성우) 길이
  "scene-info": { kind: "scene", file: "scene-info.html", seconds: 4, label: "정보 카드", desc: "숫자 카드가 올라오며 숫자가 올라가요" },
  "scene-pin": { kind: "scene", file: "scene-pin.html", seconds: 4, label: "위치 핀", desc: "핀이 떨어지고 장소·거리 말풍선" },
  "scene-check": { kind: "scene", file: "scene-check.html", seconds: 4, label: "장점 체크", desc: "장점이 한 줄씩 ✓" },
  "scene-price": { kind: "scene", file: "scene-price.html", seconds: 4, label: "가격 강조", desc: "가격이 크게 박혀요" },
  "scene-kinetic": { kind: "scene", file: "scene-kinetic.html", seconds: 4, label: "키네틱 강조", desc: "핵심 문구가 단어씩 튀어나와요" },
  // 범용 장면 · 유튜브식 강조 (2026-10-28 사장님: 다양하게)
  "scene-quote": { kind: "scene", file: "scene-quote.html", seconds: 4, label: "인용 카드", desc: "큰 따옴표와 함께 문구가 한 줄씩" },
  "scene-question": { kind: "scene", file: "scene-question.html", seconds: 4, label: "질문 카드", desc: "큰 물음표가 흔들리며 질문 문구" },
  "scene-number": { kind: "scene", file: "scene-number.html", seconds: 4, label: "큰 숫자", desc: "숫자 하나가 크게 올라가요" },
  "scene-lower": { kind: "scene", file: "scene-lower.html", seconds: 4, label: "하단 바", desc: "방송 자막처럼 색 띠 두 줄" },
  "scene-box": { kind: "scene", file: "scene-box.html", seconds: 4, label: "테두리 상자", desc: "선이 그려지며 문구를 감싸요" },
  "scene-split": { kind: "scene", file: "scene-split.html", seconds: 4, label: "반쪽 색판", desc: "색판이 밀려 들어오며 큰 문구" },
  "scene-sticky": { kind: "scene", file: "scene-sticky.html", seconds: 4, label: "메모지", desc: "포스트잇이 날아와 붙고 글이 적혀요" },
  "scene-spot": { kind: "scene", file: "scene-spot.html", seconds: 4, label: "스포트라이트", desc: "원형 빛이 비추며 문구가 떠올라요" },
  "scene-typing": { kind: "scene", file: "scene-typing.html", seconds: 4, label: "타자", desc: "문장이 한 글자씩 쳐져요" },
  "scene-bubble": { kind: "scene", file: "scene-bubble.html", seconds: 4, label: "말풍선", desc: "말풍선이 통통 튀어나와요" },
  "fx-circle": { kind: "scene", file: "fx-circle.html", seconds: 4, label: "빨간 동그라미", desc: "강조 낱말에 빨간 원과 화살표" },
  "fx-punch": { kind: "scene", file: "fx-punch.html", seconds: 4, label: "줌 펀치", desc: "화면이 확 다가오며 흔들리고 번쩍" },
  "fx-glitch": { kind: "scene", file: "fx-glitch.html", seconds: 4, label: "글리치", desc: "글자가 지지직 갈라지다 맞춰져요" },
  "fx-burst": { kind: "scene", file: "fx-burst.html", seconds: 4, label: "폭발 말풍선", desc: "만화처럼 톱니 말풍선이 쾅" },
  "fx-arrow": { kind: "scene", file: "fx-arrow.html", seconds: 4, label: "화살표", desc: "큰 화살표가 날아와 가리켜요" },
  "fx-marker": { kind: "scene", file: "fx-marker.html", seconds: 4, label: "형광펜", desc: "강조 낱말에 형광펜과 물결 밑줄" },
  "fx-sparkle": { kind: "scene", file: "fx-sparkle.html", seconds: 4, label: "반짝 입자", desc: "별·하트 입자가 떠오르며 반짝" },
  "fx-bars": { kind: "scene", file: "fx-bars.html", seconds: 4, label: "막대 그래프", desc: "숫자들로 막대가 차올라요" },
};
for (const t of Object.values(TEMPLATES)) t.kind = t.kind || "intro";
const SFX_DIR = path.join(__dirname, "sfx");
// 한 단계가 멈추면 (드물게 화면 그리기가 멈춘다) 기다리지 않고 오류로 — 앱이 굳지 않게
const within = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`모션을 굽다가 멈췄어요 (${what}). 다시 해 주세요.`)), ms))]);
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

/** 공실 분석 자료 → 틀에 넣을 글 (실제 값만) + 배경으로 고를 수 있는 사진 */
function vacancyData(vacancyId) {
  const dir = path.join(app.getPath("userData"), "media", String(vacancyId || "").replace(/[^\w-]/g, ""));
  const a = readJson(path.join(dir, "analysis.json"));
  if (!a || !a.vacancy) return null;
  const v = a.vacancy;
  const f = (label) => (((v.fields || []).find((x) => x.label === label) || {}).value || "").trim();
  const addr = f("소재지"); // "서울 강남구 논현동"
  const place = addr.split(/\s+/).slice(-2).join(" ") || (v.title || "").split(/\s+/)[0] || "";
  const kind = (v.title || "").replace(/^\S+동\s*/, "").trim() || v.title || "";
  const trade = f("거래구분") || (/^(매매|전세|월세|단기임대)/.exec(v.priceText || "") || [])[1] || "";
  const price = (v.priceText || "").replace(/^(매매|전세|월세|단기임대)\s*/, "").trim() || f("금액");
  const chips = [];
  const area = /\/\s*([\d.]+m²)\s*\((\d+)평\)/.exec(f("공급/전용면적")) || /([\d.]+m²)\s*\((\d+)평\)/.exec(f("전용면적"));
  if (area) chips.push(`전용 ${area[2]}평`);
  const rooms = /(\d+)\s*개?\s*\/\s*(\d+)/.exec(f("방/욕실수"));
  if (rooms) chips.push(`방 ${rooms[1]} · 욕실 ${rooms[2]}`);
  const year = /(\d{4})/.exec(f("준공연도"));
  if (year) chips.push(`${year[1]}년 준공`);
  const photos = (a.media || []).filter((m) => m.file && fs.existsSync(m.file) && !["proof", "map"].includes(m.kind)).map((m) => m.file);
  const photo = ((a.media || []).find((m) => m.kind === "photo" || m.kind === "upload") || {}).file || photos[0] || "";
  return { place, kind, trade, price, chips, photo, photos, no: f("공실광고번호") };
}

/** 글꼴 파일 주소 (앱 글꼴 목록) — 없으면 Pretendard */
async function fontUrlOf(family) {
  for (const fam of [family, "Pretendard"].filter(Boolean)) {
    try { const [file] = await require("./fonts").files(fam); if (file) return pathToFileURL(file).href; } catch {}
  }
  return "";
}

/**
 * 틀 하나를 영상으로 — 돌려줌: mp4 파일
 *  opt: { template, data, ratio, out, fps, font, bg (사진·영상 파일), preview (작게·빨리·소리 없음) }
 */
//  overlay: 배경 없이 글자·움직임만 투명하게 → .alpha.webm (VP9 투명) — 원본 영상 위에 그래픽처럼 얹는다 (2026-10-28 사장님)
async function render({ template = "intro", data = {}, ratio = "9:16", out, fps = 30, font = "", bg = "", bgStart = 0, preview = false, overlay = false }, onProgress = () => {}) {
  const T = TEMPLATES[template];
  if (!T) throw new Error("모르는 틀이에요.");
  let [w, h] = SIZES[ratio] || SIZES["9:16"];
  if (preview) { const k = 360 / Math.min(w, h); w = Math.round(w * k / 2) * 2; h = Math.round(h * k / 2) * 2; fps = 15; }
  const seconds = Number(data.seconds) || T.seconds;
  const bgFile = overlay ? "" : bg && fs.existsSync(bg) ? bg : data.photo && fs.existsSync(data.photo) ? data.photo : "";
  const isVideo = bgFile && ff.kindOf(bgFile) === "video";
  const d = { ...data, w, h, seconds, fontUrl: await fontUrlOf(font), photo: !isVideo && bgFile ? pathToFileURL(bgFile).href : "", video: isVideo ? pathToFileURL(bgFile).href : "", videoStart: bgStart, overlay };
  const work = path.join(app.getPath("temp"), `gs-motion-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`);
  fs.mkdirSync(work, { recursive: true });
  const win = new BrowserWindow({ show: false, width: w, height: h, useContentSize: true, ...(overlay ? { transparent: true, backgroundColor: "#00000000", frame: false } : {}), webPreferences: { offscreen: true, contextIsolation: false, nodeIntegration: false, sandbox: true, backgroundThrottling: false, zoomFactor: 1, autoplayPolicy: "no-user-gesture-required" } });
  win.webContents.setAudioMuted(true);
  let sfx = [];
  try {
    await within(win.loadFile(path.join(__dirname, "motion", T.file)), 20000, "틀 열기");
    win.setContentSize(w, h);
    if (overlay) await win.webContents.insertCSS("html, body, #stage { background: transparent !important; }");
    sfx = await within(win.webContents.executeJavaScript(`window.__setup(${JSON.stringify(d)}).then(() => document.fonts.load('900 40px GsFont')).then(() => document.fonts.ready).then(() => window.__SFX || [])`), 30000, "준비");
    const n = Math.round(seconds * fps);
    for (let i = 0; i < n; i++) {
      await within(win.webContents.executeJavaScript(`Promise.resolve(window.__seek(${(i / fps).toFixed(4)})).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1)))))`), 10000, `${i}번째 장면`);
      const img = await within(win.webContents.capturePage({ x: 0, y: 0, width: w, height: h }), 10000, `${i}번째 찍기`);
      const sz = img.getSize();
      fs.writeFileSync(path.join(work, `${String(i).padStart(5, "0")}.png`), (sz.width !== w || sz.height !== h ? img.resize({ width: w, height: h }) : img).toPNG());
      if (i % 10 === 0) onProgress(`${preview ? "미리보기" : "모션그래픽"}를 굽는 중… (${Math.round((i / n) * 100)}%)`);
    }
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
  onProgress("영상으로 묶는 중…");
  const file = out || path.join(app.getPath("temp"), `gs-motion-${template}-${Date.now().toString(36)}.mp4`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // 효과음 — 틀이 정한 시각에 (미리보기에도 넣는다: 고를 때 소리도 들어 보게)
  const cues = (sfx || []).filter((c) => c && fs.existsSync(path.join(SFX_DIR, `${c.name}.mp3`)) && c.t < seconds);
  const inputs = ["-framerate", String(fps), "-i", path.join(work, "%05d.png")];
  cues.forEach((c) => inputs.push("-i", path.join(SFX_DIR, `${c.name}.mp3`)));
  const filt = cues.length
    // 효과음마다 음질(44.1k·48k·24k)이 달라 48k 로 맞추고, 늘리는 길이도 정한다 — 끝없이 늘리면(apad) ffmpeg 가 안 끝났다 (2026-10-29 위치 핀 12분 멈춤)
    ? [...cues.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(c.t * 1000)}|${Math.round(c.t * 1000)},volume=${Number(c.vol || 0.7).toFixed(2)}[s${i}]`), `${cues.map((_, i) => `[s${i}]`).join("")}amix=inputs=${cues.length}:normalize=0,apad=whole_dur=${seconds},atrim=0:${seconds}[aout]`].join(";")
    : "";
  const LIMIT = { timeoutMs: 3 * 60 * 1000 }; // 그래도 멈추면 3분에 끊고 알린다 (몇 초짜리라 보통 몇 초면 끝난다)
  if (overlay) {
    await ff.run(ff.ff(), ["-y", "-hide_banner", "-loglevel", "error", ...inputs, ...(filt ? ["-filter_complex", filt, "-map", "0:v", "-map", "[aout]", "-c:a", "libopus", "-b:a", "128k"] : []), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-auto-alt-ref", "0", "-t", String(seconds), file], LIMIT);
  } else {
    const args = (enc) => ["-y", "-hide_banner", "-loglevel", "error", ...inputs, ...(filt ? ["-filter_complex", filt, "-map", "0:v", "-map", "[aout]", "-c:a", "aac", "-b:a", "160k"] : []), "-pix_fmt", "yuv420p", ...enc.args(preview ? "fast" : "quality"), "-t", String(seconds), "-movflags", "+faststart", file];
    try { await ff.run(ff.ff(), args(await ff.encoder()), LIMIT); } catch { await ff.run(ff.ff(), args(ff.fallbackEncoder()), LIMIT); }
  }
  try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  log.info(`[모션그래픽] ${template} ${ratio}${preview ? " 미리보기" : ""} → ${file}`);
  return file;
}

/** 고르기 창 글꼴 (앱 글꼴 목록에서 인트로에 어울리는 것) */
const FONT_CHOICES = [["Pretendard", "프리텐다드"], ["GmarketSans", "지마켓 산스"], ["Black Han Sans", "검은고딕"], ["Do Hyeon", "배민 도현"], ["Jua", "배민 주아"], ["NanumMyeongjo", "나눔명조"], ["Gowun Dodum", "고운돋움"], ["NanumGothic", "나눔고딕"], ["CookieRunOTF", "쿠키런"]];

module.exports = { TEMPLATES, SIZES, FONT_CHOICES, vacancyData, render };
