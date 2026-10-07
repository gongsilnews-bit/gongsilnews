// ChatGPT·제미나이·클로드가 만든 HTML 문서를 통째로 받아, 강의 상세 페이지 안에
// 안전하게 직접 넣을 수 있는 조각으로 바꾼다. (서버 전용)
//  - <style> CSS와 Tailwind 클래스 → 일반 CSS로 만들고 .study-html 안에서만 적용되게 묶음
//  - 화면 너비 기준(@media) → 상세 설명 칸 너비 기준(@container)으로 바꿔 PC·모바일 모두 맞게
//  - <script>, on* 속성, javascript: 링크 등 위험한 코드는 제거
import { createHash } from "crypto";
import * as cheerio from "cheerio";
import postcss, { type AtRule, type Root, type Rule } from "postcss";
import { compile } from "tailwindcss";
import { TAILWIND_INDEX_CSS } from "./tailwindIndexCss";
import { AI_HTML_MARKER } from "./marker";

const SCOPE = ".study-html";
const BOX = "study-html-box";
const MAX_INPUT = 2_000_000;

export function isAiHtml(description?: string | null): boolean {
  return !!description && description.startsWith(AI_HTML_MARKER);
}

export function aiHtmlSource(description: string): string {
  return description.slice(AI_HTML_MARKER.length);
}

/* ── 결과 캐시 (같은 원본은 다시 변환하지 않음) ── */
const cache = new Map<string, string>();
const CACHE_MAX = 40;

export async function renderAiHtml(raw: string): Promise<string> {
  if (!raw?.trim()) return "";
  const key = createHash("sha1").update(raw).digest("hex");
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let out: string;
  try {
    out = await convert(raw.slice(0, MAX_INPUT));
  } catch (e) {
    console.error("[renderAiHtml] 변환 실패:", e);
    out = `<div class="${BOX}"><div class="study-html"><p>HTML을 표시하지 못했습니다.</p></div></div>`;
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, out);
  return out;
}

/* ═════════════════════════ 변환 ═════════════════════════ */

async function convert(raw: string): Promise<string> {
  const $ = cheerio.load(raw);

  // 1) 스크립트에서 Tailwind 사용 여부와 설정만 읽어 둔다 (스크립트 자체는 버림)
  let tailwind: "v3" | "v4" | null = null;
  let twConfig: any = null;
  $("script").each((_, el) => {
    const src = ($(el).attr("src") || "").toLowerCase();
    if (src.includes("cdn.tailwindcss.com")) tailwind = "v3";
    else if (src.includes("@tailwindcss/browser")) tailwind = tailwind || "v4";
    const code = $(el).html() || "";
    if (/tailwind\.config\s*=/.test(code)) twConfig = parseTailwindConfig(code) ?? twConfig;
  });

  // 2) <style>, 폰트·아이콘 <link> 모으기
  const styleTexts: string[] = [];
  $("style").each((_, el) => {
    styleTexts.push($(el).html() || "");
  });
  const links: string[] = [];
  $("link").each((_, el) => {
    const rel = ($(el).attr("rel") || "").toLowerCase();
    const href = $(el).attr("href") || "";
    if (rel.split(/\s+/).includes("stylesheet") && isAllowedStylesheet(href)) links.push(href);
  });

  // 3) body 내용과 body/html에 붙은 클래스·스타일
  const body = $("body");
  const rootClass = [$("html").attr("class"), body.attr("class")].filter(Boolean).join(" ").trim();
  const rootStyle = cleanStyleAttr(body.attr("style") || "");
  sanitizeTree($, body);
  const bodyHtml = body.html() || "";

  // 4) CSS 만들기 — <style> 블록마다 따로 다뤄서 깨진 블록 하나가 전체를 망치지 않게 한다
  // CSS 안의 @import 폰트는 <link>로 옮긴다 (@import는 스타일시트 맨 앞에서만 동작)
  const blocks = styleTexts.map(t => extractImports(t.replace(/@tailwind\s+[\w-]+\s*;/g, ""), links));
  const userCss = blocks.join("\n");

  let scoped: string;
  if (tailwind || /@apply\s/.test(userCss)) {
    const candidates = collectCandidates(bodyHtml + " " + rootClass);
    const themeCss = twConfig ? configToTheme(twConfig) : "";
    const twBase = `@import "tailwindcss";\n${tailwind === "v3" ? V3_COMPAT_CSS : ""}\n${themeCss}`;
    const all = await buildTailwind(`${twBase}\n${userCss}`, candidates).catch(() => null);
    scoped = (all !== null ? safeScope(all) : null) ?? [
      // 사용자 CSS의 @apply 등이 깨졌으면 Tailwind만 만들고 CSS는 블록별로 붙인다
      safeScope(await buildTailwind(twBase, candidates)) ?? "",
      ...blocks.map(b => safeScope(b) ?? ""),
    ].join("\n");
  } else {
    scoped = [UA_RESTORE_CSS, ...blocks].map(b => safeScope(b) ?? "").join("\n");
  }

  const linkTags = [...new Set(links)].map(h => `<link rel="stylesheet" href="${escAttr(h)}">`).join("");
  const styleTag = `<style>${BOX_CSS}\n${scoped.replace(/<\/style/gi, "<\\/style")}</style>`;
  return `${linkTags}${styleTag}<div class="${BOX}"><div class="study-html${rootClass ? " " + escAttr(rootClass) : ""}"${rootStyle ? ` style="${escAttr(rootStyle)}"` : ""}>${bodyHtml}</div></div>`;
}

/* ── Tailwind ── */

async function buildTailwind(input: string, candidates: string[]): Promise<string> {
  const compiler = await compile(input, {
    base: "/",
    loadStylesheet: async (id: string) => {
      if (id === "tailwindcss") return { path: "tailwindcss/index.css", base: "/", content: TAILWIND_INDEX_CSS };
      throw new Error(`불러올 수 없는 CSS: ${id}`);
    },
  });
  return compiler.build(candidates);
}

function collectCandidates(html: string): string[] {
  const set = new Set<string>();
  const re = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    for (const c of (m[2] ?? m[3] ?? "").split(/\s+/)) if (c) set.add(c.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
  }
  for (const c of html.split(/\s+/)) if (c && !c.includes("=")) set.add(c);
  return [...set];
}

// v3(cdn.tailwindcss.com) 기본값 맞추기: 테두리 색, 크기 이름이 바뀐 그림자·모서리·흐림
// (v4의 맨이름 shadow·rounded·blur는 v3 값과 같아서 -sm만 되돌리면 된다)
const V3_COMPAT_CSS = `
@theme {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --radius-sm: 0.125rem;
  --blur-sm: 4px;
}
@layer base {
  *, ::after, ::before, ::backdrop, ::file-selector-button { border-color: var(--color-gray-200, currentcolor); }
  input::placeholder, textarea::placeholder { color: var(--color-gray-400); }
  button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer; }
}
`;

/* tailwind.config = {...} 객체 리터럴만 안전하게 읽는다 (코드는 실행하지 않음) */
function parseTailwindConfig(code: string): any | null {
  const start = code.search(/tailwind\.config\s*=/);
  if (start < 0) return null;
  const brace = code.indexOf("{", start);
  if (brace < 0) return null;
  try {
    return new ObjectLiteralParser(code, brace).parseValue();
  } catch {
    return null;
  }
}

class ObjectLiteralParser {
  private s: string;
  private i: number;
  constructor(s: string, i: number) {
    this.s = s;
    this.i = i;
  }
  private ws() {
    for (;;) {
      const c = this.s[this.i];
      if (c === " " || c === "\n" || c === "\r" || c === "\t") this.i++;
      else if (this.s.startsWith("//", this.i)) this.i = this.s.indexOf("\n", this.i) < 0 ? this.s.length : this.s.indexOf("\n", this.i);
      else if (this.s.startsWith("/*", this.i)) this.i = this.s.indexOf("*/", this.i) + 2;
      else return;
    }
  }
  parseValue(): any {
    this.ws();
    const c = this.s[this.i];
    if (c === "{") return this.obj();
    if (c === "[") return this.arr();
    if (c === '"' || c === "'" || c === "`") return this.str();
    const m = /^-?\d+(\.\d+)?/.exec(this.s.slice(this.i, this.i + 40));
    if (m) { this.i += m[0].length; return Number(m[0]); }
    for (const [w, v] of [["true", true], ["false", false], ["null", null]] as const) {
      if (this.s.startsWith(w, this.i)) { this.i += w.length; return v; }
    }
    throw new Error("지원하지 않는 값");
  }
  private str(): string {
    const q = this.s[this.i++];
    let out = "";
    while (this.i < this.s.length && this.s[this.i] !== q) {
      if (this.s[this.i] === "\\") this.i++;
      if (q === "`" && this.s.startsWith("${", this.i)) throw new Error("템플릿 식");
      out += this.s[this.i++];
    }
    this.i++;
    return out;
  }
  private key(): string {
    this.ws();
    const c = this.s[this.i];
    if (c === '"' || c === "'") return this.str();
    const m = /^[\w$-]+/.exec(this.s.slice(this.i, this.i + 100));
    if (!m) throw new Error("키");
    this.i += m[0].length;
    return m[0];
  }
  private obj(): any {
    this.i++;
    const o: any = {};
    for (;;) {
      this.ws();
      if (this.s[this.i] === "}") { this.i++; return o; }
      const k = this.key();
      this.ws();
      if (this.s[this.i++] !== ":") throw new Error(":");
      o[k] = this.parseValue();
      this.ws();
      if (this.s[this.i] === ",") this.i++;
    }
  }
  private arr(): any[] {
    this.i++;
    const a: any[] = [];
    for (;;) {
      this.ws();
      if (this.s[this.i] === "]") { this.i++; return a; }
      a.push(this.parseValue());
      this.ws();
      if (this.s[this.i] === ",") this.i++;
    }
  }
}

function configToTheme(config: any): string {
  const theme = config?.theme || {};
  const src = { ...theme, ...(theme.extend || {}) };
  const vars: string[] = [];
  const keyframes: string[] = [];
  const cssVal = (v: any) => String(v).replace(/[;{}]/g, "");
  const flat = (prefix: string, obj: any) => {
    if (obj == null) return;
    if (typeof obj !== "object" || Array.isArray(obj)) return;
    for (const [k, v] of Object.entries(obj)) {
      const name = k === "DEFAULT" ? prefix : `${prefix}-${k}`;
      if (v && typeof v === "object" && !Array.isArray(v)) flat(name, v);
      else if (typeof v === "string" || typeof v === "number") vars.push(`${name}: ${cssVal(v)};`);
    }
  };
  flat("--color", src.colors);
  flat("--shadow", src.boxShadow);
  flat("--radius", src.borderRadius);
  flat("--spacing", src.spacing);
  flat("--animate", src.animation);
  flat("--blur", src.blur);
  if (src.fontFamily && typeof src.fontFamily === "object") {
    for (const [k, v] of Object.entries<any>(src.fontFamily)) {
      const list = (Array.isArray(v) ? v : [v]).filter(x => typeof x === "string")
        .map((f: string) => (/[\s]/.test(f) && !/^["']/.test(f) ? `"${f}"` : f));
      if (list.length) vars.push(`--font-${k}: ${cssVal(list.join(", "))};`);
    }
  }
  if (src.fontSize && typeof src.fontSize === "object") {
    for (const [k, v] of Object.entries<any>(src.fontSize)) {
      if (typeof v === "string") vars.push(`--text-${k}: ${cssVal(v)};`);
      else if (Array.isArray(v) && typeof v[0] === "string") {
        vars.push(`--text-${k}: ${cssVal(v[0])};`);
        const lh = typeof v[1] === "string" ? v[1] : v[1]?.lineHeight;
        if (lh) vars.push(`--text-${k}--line-height: ${cssVal(lh)};`);
      }
    }
  }
  if (src.keyframes && typeof src.keyframes === "object") {
    for (const [name, frames] of Object.entries<any>(src.keyframes)) {
      if (!frames || typeof frames !== "object") continue;
      const body = Object.entries<any>(frames).map(([sel, decls]) =>
        `${cssVal(sel)} { ${Object.entries<any>(decls || {}).map(([p, v]) => `${p.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}: ${cssVal(v)};`).join(" ")} }`
      ).join(" ");
      keyframes.push(`@keyframes ${name.replace(/[^\w-]/g, "")} { ${body} }`);
    }
  }
  if (!vars.length && !keyframes.length) return "";
  return `@theme {\n${vars.join("\n")}\n${keyframes.join("\n")}\n}`;
}

/* ── CSS 범위 묶기 ── */

function extractImports(css: string, imports: string[]): string {
  return css.replace(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/gi, (_, url: string) => {
    if (isAllowedStylesheet(url)) imports.push(url);
    return "";
  });
}

function safeScope(css: string): string | null {
  try {
    return scopeCss(css);
  } catch {
    return null;
  }
}

function scopeCss(css: string): string {
  const root: Root = postcss.parse(css);

  // @layer 껍데기를 벗겨 사이트 CSS보다 우선하도록 (순서는 그대로)
  let again = true;
  while (again) {
    again = false;
    root.walkAtRules("layer", at => {
      again = true;
      if (at.nodes && at.nodes.length) at.replaceWith(at.nodes);
      else at.remove();
    });
  }

  root.walkAtRules(at => {
    const name = at.name.toLowerCase();
    if (["import", "charset", "namespace", "page"].includes(name)) at.remove();
    else if (name === "media") mediaToContainer(at);
  });

  root.walkRules(rule => {
    if (insideKeyframesOrRule(rule)) return;
    const scoped = rule.selectors.map(scopeSelector).filter((s): s is string => !!s);
    if (!scoped.length) rule.remove();
    else rule.selectors = [...new Set(scoped)];
  });

  return root.toString();
}

function insideKeyframesOrRule(rule: Rule): boolean {
  let p = rule.parent;
  while (p && p.type !== "root") {
    if (p.type === "rule") return true;
    if (p.type === "atrule" && /keyframes$/i.test((p as AtRule).name)) return true;
    p = p.parent as any;
  }
  return false;
}

const ROOT_TOKEN = /^(?:html|body|:root|:host)(?![\w-])/i;

function scopeSelector(sel: string): string | null {
  const s = sel.trim();
  if (!s) return null;
  let rest = s;
  let isRoot = false;
  for (;;) {
    const m = ROOT_TOKEN.exec(rest);
    if (!m) break;
    isRoot = true;
    rest = rest.slice(m[0].length);
    const ws = /^\s+(?=(?:html|body|:root|:host)(?![\w-]))/i.exec(rest);
    if (ws) { rest = rest.slice(ws[0].length); continue; }
    break;
  }
  if (!isRoot) return `${SCOPE} ${s}`;
  // 바깥(형제) 요소로 번지는 선택자는 버린다
  if (/^\s*[~+]/.test(rest)) return null;
  return SCOPE + rest;
}

function mediaToContainer(at: AtRule) {
  let p = at.params.trim().replace(/^only\s+/i, "").replace(/^(screen|all)\s+and\s+/i, "");
  if (/^(screen|all)$/i.test(p)) { at.replaceWith(at.nodes || []); return; }
  const onlyWidth = /^(\(\s*(?:(?:min|max)-)?width\s*[:<>=][^)]*\)\s*(?:and\s*)?)+$/i.test(p)
    || /^\(\s*[\d.]+\w*\s*[<>]=?\s*width\s*[<>]=?\s*[\d.]+\w*\s*\)$/i.test(p);
  if (onlyWidth) {
    at.name = "container";
    at.params = `${BOX} ${p}`;
  }
}

/* ── HTML 정리 ── */

const DROP_TAGS = new Set([
  "script", "style", "noscript", "template", "object", "embed", "applet", "frame", "frameset",
  "base", "meta", "link", "title", "head", "portal", "foreignobject", "animate", "set",
  "animatemotion", "animatetransform", "math", "xml",
]);

const KEEP_TAGS = new Set([
  "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote", "br", "button", "caption",
  "center", "cite", "code", "col", "colgroup", "data", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em",
  "figcaption", "figure", "font", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "i",
  "img", "input", "ins", "kbd", "label", "legend", "fieldset", "li", "main", "mark", "menu", "meter", "nav", "ol", "optgroup", "option",
  "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "section", "select", "small", "source",
  "span", "strike", "strong", "sub", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead",
  "time", "tr", "track", "tt", "u", "ul", "var", "video", "audio", "wbr", "iframe",
  // SVG
  "svg", "g", "path", "circle", "ellipse", "line", "polyline", "polygon", "rect", "text", "tspan", "textpath",
  "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "pattern", "symbol", "use", "desc",
  "marker", "image", "filter", "feblend", "fecolormatrix", "fecomponenttransfer", "fecomposite", "feconvolvematrix",
  "fediffuselighting", "fedisplacementmap", "fedropshadow", "feflood", "fefunca", "fefuncb", "fefuncg", "fefuncr",
  "fegaussianblur", "feimage", "femerge", "femergenode", "femorphology", "feoffset", "fespecularlighting",
  "fetile", "feturbulence", "fedistantlight", "fepointlight", "fespotlight",
]);

const URL_ATTRS = new Set(["href", "src", "xlink:href", "poster", "background", "cite", "action", "data", "formaction"]);

const IFRAME_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|google\.com\/maps|maps\.google\.com|tv\.naver\.com|serviceapi\.nmv\.naver\.com)\//i;

function sanitizeTree($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>) {
  // 바깥 요소부터 처리하도록 목록을 먼저 만든다
  const nodes = root.find("*").toArray();
  for (const el of nodes) {
    if (!el.parent) continue; // 이미 지워진 조상 아래
    const tag = (el.tagName || el.name || "").toLowerCase();
    const $el = $(el);
    if (DROP_TAGS.has(tag)) { $el.remove(); continue; }
    if (tag === "form") { $el.replaceWith($el.contents()); continue; }
    if (!KEEP_TAGS.has(tag)) { $el.replaceWith($el.contents()); continue; }
    if (tag === "iframe") {
      const src = $el.attr("src") || "";
      if (!IFRAME_HOSTS.test(src)) { $el.remove(); continue; }
    }
    for (const name of Object.keys(el.attribs || {})) {
      const lower = name.toLowerCase();
      const value = el.attribs[name] ?? "";
      if (lower.startsWith("on") || lower === "srcdoc" || lower === "formaction" || lower === "action" || lower === "ping" || lower === "http-equiv") {
        $el.removeAttr(name);
      } else if (URL_ATTRS.has(lower)) {
        if (!isSafeUrl(value, tag, lower)) $el.removeAttr(name);
      } else if (lower === "srcset") {
        if (!value.split(",").every(part => isSafeUrl(part.trim().split(/\s+/)[0] || "", "img", "src"))) $el.removeAttr(name);
      } else if (lower === "style") {
        const cleaned = cleanStyleAttr(value);
        if (cleaned) $el.attr(name, cleaned); else $el.removeAttr(name);
      }
    }
    if (tag === "use") {
      const h = $el.attr("href") || $el.attr("xlink:href") || "";
      if (h && !h.startsWith("#")) { $el.remove(); continue; }
    }
    if (tag === "a" && ($el.attr("target") || "").toLowerCase() === "_blank") $el.attr("rel", "noopener noreferrer");
  }
}

function isSafeUrl(value: string, tag: string, attr: string): boolean {
  // 브라우저처럼 제어 문자·공백을 지우고 스킴을 본다
  const v = value.replace(/[\u0000- \u007f-\u009f]/g, "").toLowerCase();
  if (!v) return true;
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(v);
  if (!scheme) return true; // 상대 경로, #앵커
  const s = scheme[1];
  if (s === "http" || s === "https" || s === "mailto" || s === "tel") return true;
  if (s === "data") {
    const imgish = ["img", "source", "image", "video"].includes(tag) && (attr === "src" || attr === "href" || attr === "xlink:href" || attr === "poster");
    return imgish && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/.test(v);
  }
  return false;
}

function cleanStyleAttr(style: string): string {
  const v = style.replace(/[\u0000-\u001f]/g, "");
  if (/expression\s*\(|javascript:|vbscript:|-moz-binding|behavior\s*:/i.test(v)) return "";
  return v.trim();
}

function isAllowedStylesheet(href: string): boolean {
  let u: URL;
  try { u = new URL(href.startsWith("//") ? "https:" + href : href); } catch { return false; }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (["fonts.googleapis.com", "fonts.cdnfonts.com", "use.fontawesome.com", "fonts.bunny.net", "use.typekit.net"].includes(host)) return true;
  if (["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "fastly.jsdelivr.net", "unpkg.com"].includes(host)) {
    return /font|icon|pretendard|spoqa|nanum|noto/i.test(u.pathname);
  }
  return false;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* ── 고정 CSS ── */

// 바깥 상자: 너비 기준(container) + fixed 요소가 사이트 위로 튀어나오지 않게 가둠
const BOX_CSS = `.${BOX}{container-type:inline-size;container-name:${BOX};contain:layout paint;position:relative;isolation:isolate;width:100%;font-size:16px;line-height:normal;color:#000;text-align:left;}
${SCOPE}{display:block;}`;

// 사이트 공통 초기화(* margin:0, ul list-style:none 등)로 사라진 브라우저 기본 모양을 되살림 (Tailwind 미사용 HTML용)
const UA_RESTORE_CSS = `
html{line-height:normal;}
h1{font-size:2em;margin:.67em 0;font-weight:bold;}
h2{font-size:1.5em;margin:.83em 0;font-weight:bold;}
h3{font-size:1.17em;margin:1em 0;font-weight:bold;}
h4{margin:1.33em 0;font-weight:bold;}
h5{font-size:.83em;margin:1.67em 0;font-weight:bold;}
h6{font-size:.67em;margin:2.33em 0;font-weight:bold;}
p,dl,pre{margin:1em 0;}
blockquote,figure{margin:1em 40px;}
ul,ol,menu{margin:1em 0;padding-left:40px;}
ul,menu{list-style:disc;}
ol{list-style:decimal;}
li{list-style:inherit;}
ul ul,ol ul{list-style:circle;margin:0;}
ol ol,ul ol{margin:0;}
dd{margin-left:40px;}
hr{margin:.5em auto;border:0;border-top:1px solid #ccc;}
a,a:visited,a:active{color:#0645ad;text-decoration:underline;}
b,strong,th{font-weight:bold;}
table{border-collapse:separate;border-spacing:2px;}
td,th{padding:1px;}
img,video{max-width:100%;}
button{border:2px outset buttonborder;background:buttonface;padding:1px 6px;}
`;
