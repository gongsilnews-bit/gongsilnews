// 문서편집 — 편집기 동작 모음 (리본·단축키가 부른다)
import type { Editor, JSONContent } from "@tiptap/core";
import type { Mark as PMMark } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { SIZES } from "./model";
import { PICTOS } from "../studio-photo/pictos";

type Cmds = Record<string, (...a: unknown[]) => boolean>;
export const cmd = (ed: Editor) => ed.commands as unknown as Cmds;
export const chainCmd = (ed: Editor) => ed.chain().focus() as unknown as Record<string, (...a: unknown[]) => { run: () => boolean }> & { run: () => boolean };

/** 지금 글자 서식 — 글꼴 · 크기(pt) · 색 */
export function curText(ed: Editor, baseFont: string, baseSize: number) {
  const a = ed.getAttributes("textStyle");
  const font = (a.fontFamily ? String(a.fontFamily).split(",")[0].replace(/['"]/g, "").trim() : "") || (ed.isActive("heading") ? baseFont : baseFont);
  const size = a.fontSize ? parseFloat(String(a.fontSize)) * (/px/.test(String(a.fontSize)) ? 0.75 : 1) : headingSize(ed) || baseSize;
  return { font, size: Math.round(size * 10) / 10, color: a.color as string | undefined };
}
let themeSizes = { h1: 16, h2: 13, h3: 12 };
export const setThemeSizes = (s: typeof themeSizes) => { themeSizes = s; };
function headingSize(ed: Editor) {
  if (ed.isActive("heading", { level: 1 })) return themeSizes.h1;
  if (ed.isActive("heading", { level: 2 })) return themeSizes.h2;
  if (ed.isActive("heading", { level: 3 })) return themeSizes.h3;
  if (ed.isActive("heading")) return 11;
  return 0;
}
export const setFontSize = (ed: Editor, pt: number) => chainCmd(ed).setFontSize(`${pt}pt`).run();
export function growFont(ed: Editor, dir: 1 | -1, cur: number) {
  const next = dir > 0 ? SIZES.find((s) => s > cur) ?? cur + 10 : [...SIZES].reverse().find((s) => s < cur) ?? Math.max(1, cur - 1);
  setFontSize(ed, next);
}

/** Aa — 대/소문자 바꾸기 (영문) · 전자/반자 */
export function changeCase(ed: Editor, mode: "sentence" | "lower" | "upper" | "title" | "toggle" | "full" | "half") {
  const { state } = ed;
  const { from, to, empty } = state.selection;
  if (empty) return;
  let tr = state.tr;
  let sentenceStart = true;
  state.doc.nodesBetween(from, to, (n, pos) => {
    if (!n.isText || !n.text) return;
    const s = Math.max(from, pos), e = Math.min(to, pos + n.text.length);
    const t = n.text.slice(s - pos, e - pos);
    let o = t;
    if (mode === "lower") o = t.toLowerCase();
    else if (mode === "upper") o = t.toUpperCase();
    else if (mode === "toggle") o = [...t].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("");
    else if (mode === "title") o = t.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase());
    else if (mode === "sentence") o = [...t.toLowerCase()].map((c) => { if (sentenceStart && /\S/.test(c)) { sentenceStart = false; return c.toUpperCase(); } if (/[.!?]/.test(c)) sentenceStart = true; return c; }).join("");
    else if (mode === "full") o = t.replace(/[!-~]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).replace(/ /g, "　");
    else if (mode === "half") o = t.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, " ");
    if (o !== t) tr = tr.replaceWith(tr.mapping.map(s), tr.mapping.map(e), state.schema.text(o, n.marks));
  });
  if (tr.docChanged) ed.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from, tr.mapping.map(to))));
}

/** 모든 서식 지우기 — 글자 서식 + 문단을 표준으로 */
export function clearAll(ed: Editor) {
  ed.chain().focus().unsetAllMarks().clearNodes().setTextAlign("left").run();
  cmd(ed).setParagraphAttrs({ indentLeft: null, indentRight: null, firstLine: null, spaceBefore: null, spaceAfter: null, lineHeight: null, border: null, shading: null });
}

/* ── 스타일 (홈 › 스타일) ── */
export type StyleDef = { id: string; name: string; preview: React.CSSProperties };
export const STYLES: StyleDef[] = [
  { id: "normal", name: "표준", preview: {} },
  { id: "nospace", name: "간격 없음", preview: {} },
  { id: "h1", name: "제목 1", preview: { fontSize: 15, color: "#2F5496" } },
  { id: "h2", name: "제목 2", preview: { fontSize: 13, color: "#2F5496" } },
  { id: "h3", name: "제목 3", preview: { fontSize: 12, color: "#1F3763" } },
  { id: "title", name: "제목", preview: { fontSize: 19 } },
  { id: "subtitle", name: "부제", preview: { color: "#595959", letterSpacing: 1 } },
  { id: "emph", name: "약한 강조", preview: { fontStyle: "italic", color: "#404040" } },
  { id: "strong", name: "강한 강조", preview: { fontStyle: "italic", color: "#4472C4", fontWeight: 700 } },
  { id: "quote", name: "인용", preview: { fontStyle: "italic", color: "#404040" } },
  { id: "list", name: "목록 단락", preview: {} },
];
const paraRange = (ed: Editor) => { const { $from } = ed.state.selection; return { from: $from.start(), to: $from.end() }; };
export function applyStyle(ed: Editor, id: string) {
  const c = ed.chain().focus();
  const pa = (a: Record<string, unknown>) => cmd(ed).setParagraphAttrs(a);
  switch (id) {
    case "normal": c.setParagraph().unsetMark("textStyle").run(); pa({ spaceAfter: null, lineHeight: null }); break;
    case "nospace": c.setParagraph().run(); pa({ spaceAfter: 0, lineHeight: 1 }); break;
    case "h1": c.setHeading({ level: 1 }).run(); break;
    case "h2": c.setHeading({ level: 2 }).run(); break;
    case "h3": c.setHeading({ level: 3 }).run(); break;
    case "title": c.setParagraph().setTextSelection(paraRange(ed)).setFontSize("26pt").run(); pa({ spaceAfter: 6 }); break;
    case "subtitle": c.setParagraph().setTextSelection(paraRange(ed)).setColor("#595959").setFontSize("13pt").run(); break;
    case "emph": c.setItalic().setColor("#404040").run(); break;
    case "strong": c.setBold().setItalic().setColor("#4472C4").run(); break;
    case "quote": if (!ed.isActive("blockquote")) c.setBlockquote().run(); break;
    case "list": pa({ indentLeft: 36 }); break;
  }
}
export function currentStyle(ed: Editor): string {
  if (ed.isActive("heading", { level: 1 })) return "h1";
  if (ed.isActive("heading", { level: 2 })) return "h2";
  if (ed.isActive("heading", { level: 3 })) return "h3";
  if (ed.isActive("blockquote")) return "quote";
  const p = ed.getAttributes("paragraph");
  if (p.spaceAfter === 0 && p.lineHeight === 1) return "nospace";
  return "normal";
}

/* ── 서식 복사 (붓) — 글자 표시를 담아 두었다가 다음에 고른 글에 칠한다 ── */
let painter: readonly PMMark[] | null = null;
let painterPara: Record<string, unknown> | null = null;
export function painterTake(ed: Editor) {
  const { $from } = ed.state.selection;
  painter = ed.state.storedMarks || $from.marks();
  painterPara = { ...$from.parent.attrs };
  return true;
}
export const painterOn = () => painter !== null;
export function painterApply(ed: Editor) {
  if (!painter) return false;
  const { from, to, empty } = ed.state.selection;
  if (empty) return false;
  let tr = ed.state.tr;
  for (const m of ed.state.schema.marks ? Object.values(ed.state.schema.marks) : []) tr = tr.removeMark(from, to, m);
  for (const m of painter) tr = tr.addMark(from, to, m);
  ed.view.dispatch(tr);
  if (painterPara) { const { textAlign, ...rest } = painterPara; void rest; if (textAlign) ed.commands.setTextAlign(String(textAlign)); }
  painter = null;
  painterPara = null;
  return true;
}
export const painterCancel = () => { painter = null; painterPara = null; };

/** 단락 정렬(가나다순) — 고른 문단들 */
export function sortParagraphs(ed: Editor, desc = false) {
  const { state } = ed;
  const { $from, $to } = state.selection;
  const depth = Math.min($from.depth, $to.depth) - 1;
  if (depth < 0) return;
  const parent = $from.node(depth);
  const start = $from.index(depth), end = $to.index(depth) + 1;
  if (end - start < 2) return;
  const items: PMNodeLike[] = [];
  for (let i = start; i < end; i++) items.push(parent.child(i));
  const sorted = [...items].sort((a, b) => a.textContent.localeCompare(b.textContent, "ko") * (desc ? -1 : 1));
  const from = $from.before(depth + 1), to = $to.after(depth + 1);
  ed.view.dispatch(state.tr.replaceWith(from, to, sorted as never));
}
type PMNodeLike = { textContent: string };

/** 날짜 및 시간 넣기 */
export const DATE_FORMATS = (d = new Date()) => {
  const y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate(), wd = "일월화수목금토"[d.getDay()];
  const p2 = (n: number) => String(n).padStart(2, "0");
  return [
    `${y}-${p2(m)}-${p2(dd)}`, `${y}. ${m}. ${dd}.`, `${y}년 ${m}월 ${dd}일`, `${y}년 ${m}월 ${dd}일 ${wd}요일`, `${p2(y % 100)}.${p2(m)}.${p2(dd)}`,
    `${m}월 ${dd}일`, `${y}/${p2(m)}/${p2(dd)}`, `${y}년 ${m}월 ${dd}일 ${d.getHours() < 12 ? "오전" : "오후"} ${((d.getHours() + 11) % 12) + 1}:${p2(d.getMinutes())}`,
    `${p2(d.getHours())}:${p2(d.getMinutes())}`, `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`,
  ];
};

/** 기호 */
export const SYMBOLS: { name: string; chars: string }[] = [
  { name: "자주 쓰는", chars: "※★☆●○◎◆◇■□▲△▶▷▼▽◀◁→←↑↓↔·•…‥「」『』【】〔〕《》〈〉‘’“”㎡㎥㎏㎝㎜㎞℃℉€£¥₩©®™§¶†‡№" },
  { name: "도형", chars: "●○◎◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵▶▷▸▹►▻▼▽▾▿◀◁◂◃◄◅◆◇◈◉◊" },
  { name: "화살표", chars: "←↑→↓↔↕↖↗↘↙⇐⇑⇒⇓⇔⇕➔➘➙➚➛➜➝➞➟➠➡➢➣➤➥➦➧➨➩➪⤴⤵↩↪↺↻" },
  { name: "숫자", chars: "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹ㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻" },
  { name: "단위", chars: "㎀㎁㎂㎃㎄㎈㎉㎊㎋㎌㎍㎎㎏㎐㎑㎒㎓㎔㎕㎖㎗㎘㎙㎚㎛㎜㎝㎞㎟㎠㎡㎢㎣㎤㎥㎦㎧㎨㎩㎪㎫㎬㎭㎮㎯㎰㎱㎲㎳㎴㎵㎶㎷㎸㎹㎺㎻㎼㎽㎾㎿㏀㏁㏂㏃㏄㏅㏆㏇㏈㏉㏊㏋㏌㏍㏎㏏㏐㏑㏒㏓㏔㏕㏖㏗㏘㏙㏚㏛㏜㏝" },
  { name: "수학", chars: "±×÷≠≤≥≒≡∞∴∵∫∬∮∑∏√∂∇∈∋⊂⊃⊆⊇∪∩∧∨¬⇒⇔∀∃∠⊥⌒∽∝°′″" },
  { name: "그리스", chars: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω" },
  { name: "괄호 한글", chars: "㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛㉮㉯㉰㉱" },
];

/* ── 도형 · 아이콘 → SVG 그림 (그림처럼 크기·정렬) ── */
export type ShapeId = "rect" | "round" | "ellipse" | "triangle" | "diamond" | "pentagon" | "hexagon" | "star" | "arrowR" | "arrowL" | "arrowU" | "arrowD" | "line" | "callout" | "heart" | "plus" | "check" | "cloud";
export const SHAPES: { id: ShapeId; name: string; d: string; w?: number; h?: number; stroke?: boolean }[] = [
  { id: "rect", name: "직사각형", d: "M2 2H98V68H2Z", h: 70 },
  { id: "round", name: "모서리가 둥근 직사각형", d: "M14 2H86A12 12 0 0 1 98 14V56A12 12 0 0 1 86 68H14A12 12 0 0 1 2 56V14A12 12 0 0 1 14 2Z", h: 70 },
  { id: "ellipse", name: "타원", d: "M50 2A48 33 0 1 1 49.9 2Z", h: 70 },
  { id: "triangle", name: "삼각형", d: "M50 2L98 88H2Z", h: 90 },
  { id: "diamond", name: "마름모", d: "M50 2L98 45L50 88L2 45Z", h: 90 },
  { id: "pentagon", name: "오각형", d: "M50 2L98 37L80 93H20L2 37Z", h: 95 },
  { id: "hexagon", name: "육각형", d: "M25 2H75L98 45L75 88H25L2 45Z", h: 90 },
  { id: "star", name: "별", d: "M50 2L62 36H98L69 57L80 92L50 71L20 92L31 57L2 36H38Z", h: 95 },
  { id: "arrowR", name: "오른쪽 화살표", d: "M2 22H62V4L98 35L62 66V48H2Z", h: 70 },
  { id: "arrowL", name: "왼쪽 화살표", d: "M98 22H38V4L2 35L38 66V48H98Z", h: 70 },
  { id: "arrowU", name: "위쪽 화살표", d: "M35 98V38H17L50 2L83 38H65V98Z", w: 100, h: 100 },
  { id: "arrowD", name: "아래쪽 화살표", d: "M35 2V62H17L50 98L83 62H65V2Z", w: 100, h: 100 },
  { id: "line", name: "선", d: "M2 10H98", h: 20, stroke: true },
  { id: "callout", name: "말풍선", d: "M8 2H92A6 6 0 0 1 98 8V52A6 6 0 0 1 92 58H40L22 76L26 58H8A6 6 0 0 1 2 52V8A6 6 0 0 1 8 2Z", h: 78 },
  { id: "heart", name: "하트", d: "M50 88C20 66 2 50 2 28A22 22 0 0 1 50 18A22 22 0 0 1 98 28C98 50 80 66 50 88Z", h: 90 },
  { id: "plus", name: "더하기", d: "M38 2H62V38H98V62H62V98H38V62H2V38H38Z", h: 100 },
  { id: "check", name: "체크", d: "M4 52L36 84L96 14", h: 90, stroke: true },
  { id: "cloud", name: "구름", d: "M26 76A20 20 0 0 1 22 37A26 26 0 0 1 70 26A22 22 0 0 1 96 50A18 18 0 0 1 80 76Z", h: 80 },
];
export function shapeSvg(id: ShapeId, fill: string, line: string, text = "") {
  const s = SHAPES.find((x) => x.id === id) || SHAPES[0];
  const w = s.w || 100, h = s.h || 70;
  const body = s.stroke
    ? `<path d="${s.d}" fill="none" stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${s.d}" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>`;
  const tx = text ? `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Malgun Gothic, sans-serif" font-size="12" fill="#fff">${text.replace(/[<&]/g, "")}</text>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${body}${tx}</svg>`;
  return { src: svgToPng(svg, w * 4, h * 4), w: w * 2, h: h * 2 };
}
export function pictoSvg(id: string, color: string, circle = false) {
  const p = PICTOS.find((x) => x.id === id) || PICTOS[0];
  const svg = circle
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96"><circle cx="12" cy="12" r="12" fill="${color}"/><g transform="translate(4 4) scale(0.6667)"><path d="${p.d}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96"><path d="${p.d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return { src: svgToPng(svg, 384, 384), w: 72, h: 72 };
}
/** SVG → PNG 데이터 (워드·한글이 SVG 를 못 읽는 경우가 있어 PNG 로 넣는다) — 동기 처리를 위해 SVG 데이터 주소를 먼저 쓰고 나중에 바꾼다 */
function svgToPng(svg: string, w: number, h: number): string {
  void w; void h;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
export async function rasterize(src: string, w: number, h: number): Promise<string> {
  if (!src.startsWith("data:image/svg")) return src;
  const im = new Image();
  im.src = src;
  await im.decode().catch(() => {});
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(im, 0, 0, w, h);
  return c.toDataURL("image/png");
}
export async function insertSvgImage(ed: Editor, o: { src: string; w: number; h: number }, title: string) {
  const png = await rasterize(o.src, o.w * 2, o.h * 2);
  ed.chain().focus().insertContent({ type: "image", attrs: { src: png, alt: title, width: o.w, height: o.h, align: "center" } }).run();
}

/** 단어 수 · 글자 수 (워드의 [단어 개수]) */
export function counts(ed: Editor) {
  const text = ed.state.doc.textBetween(0, ed.state.doc.content.size, "\n", "\n");
  const words = (text.match(/\S+/g) || []).length;
  const chars = text.replace(/\n/g, "").length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  let paras = 0;
  ed.state.doc.descendants((n) => { if ((n.type.name === "paragraph" || n.type.name === "heading") && n.textContent.trim()) paras++; });
  const lines = text.split("\n").filter((l) => l.trim()).length;
  return { words, chars, charsNoSpace, paras, lines };
}
export function selectionWords(ed: Editor) {
  const { from, to, empty } = ed.state.selection;
  if (empty) return 0;
  return (ed.state.doc.textBetween(from, to, " ", " ").match(/\S+/g) || []).length;
}

/** 메모 — 고른 글에 메모 표시 */
export function addComment(ed: Editor, text: string, author: string) {
  const id = `c${Date.now().toString(36)}`;
  ed.chain().focus().setMark("comment", { id, text, author, at: new Date().toISOString() }).run();
  return id;
}
export type CommentItem = { id: string; text: string; author: string; at: string; quote: string; from: number; to: number };
export function listComments(ed: Editor): CommentItem[] {
  const map = new Map<string, CommentItem>();
  ed.state.doc.descendants((n, pos) => {
    if (!n.isText) return;
    for (const m of n.marks) if (m.type.name === "comment") {
      const id = String(m.attrs.id);
      const cur = map.get(id);
      if (cur) { cur.quote += n.text || ""; cur.to = pos + n.nodeSize; }
      else map.set(id, { id, text: String(m.attrs.text || ""), author: String(m.attrs.author || ""), at: String(m.attrs.at || ""), quote: n.text || "", from: pos, to: pos + n.nodeSize });
    }
  });
  return [...map.values()].sort((a, b) => a.from - b.from);
}
export function updateComment(ed: Editor, id: string, text: string | null) {
  const type = ed.state.schema.marks.comment;
  let tr = ed.state.tr;
  ed.state.doc.descendants((n, pos) => {
    if (!n.isText) return;
    const m = n.marks.find((x) => x.type === type && x.attrs.id === id);
    if (!m) return;
    tr = tr.removeMark(pos, pos + n.nodeSize, m);
    if (text !== null) tr = tr.addMark(pos, pos + n.nodeSize, type.create({ ...m.attrs, text }));
  });
  ed.view.dispatch(tr);
}

/** 목차·탐색 창 — 제목 목록 */
export function headings(ed: Editor) {
  const out: { level: number; text: string; pos: number }[] = [];
  ed.state.doc.descendants((n, pos) => { if (n.type.name === "heading") out.push({ level: n.attrs.level, text: n.textContent, pos }); });
  return out;
}
export function goTo(ed: Editor, pos: number) {
  ed.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
}

/** 표지 (삽입 › 표지) — 고른 모양으로 맨 앞에 */
export function coverPage(kind: "basic" | "band" | "report"): JSONContent[] {
  const p = (text: string, attrs: Record<string, unknown> = {}, marks: JSONContent["marks"] = []): JSONContent => ({ type: "paragraph", attrs, content: text ? [{ type: "text", text, marks }] : undefined });
  const big = (pt: number, color?: string) => [{ type: "textStyle", attrs: { fontSize: `${pt}pt`, ...(color ? { color } : {}) } }];
  const blank = (n: number) => Array.from({ length: n }, () => p(""));
  if (kind === "band") return [
    ...blank(6),
    { type: "textBox", attrs: { width: 100, align: "left", border: "#1F3864", fill: "#1F3864" }, content: [p("[문서 제목]", { spaceBefore: 12 }, [...big(28, "#FFFFFF"), { type: "bold" }]), p("[부제목]", { spaceAfter: 12 }, big(14, "#DCE6F2"))] },
    ...blank(14), p("[작성자]", { textAlign: "right" }, big(12)), p("[날짜]", { textAlign: "right" }, big(12)), { type: "pageBreak" }, p(""),
  ];
  if (kind === "report") return [
    ...blank(3), p("[기관·회사 이름]", { textAlign: "center" }, big(14, "#595959")), ...blank(5),
    p("[보고서 제목]", { textAlign: "center", border: "bottom", spaceAfter: 8 }, [...big(30), { type: "bold" }]), p("[부제목]", { textAlign: "center" }, big(15, "#404040")),
    ...blank(12), p("[날짜]", { textAlign: "center" }, big(13)), p("[작성자]", { textAlign: "center" }, big(13)), { type: "pageBreak" }, p(""),
  ];
  return [...blank(8), p("[문서 제목]", { textAlign: "center" }, [...big(32), { type: "bold" }]), p("[부제목]", { textAlign: "center" }, big(16, "#595959")), ...blank(14), p("[작성자] · [날짜]", { textAlign: "center" }, big(12)), { type: "pageBreak" }, p("")];
}

/** 표 넣기 — 넣은 뒤 커서를 첫 칸으로 (워드처럼) */
export function insertTableHere(ed: Editor, rows: number, cols: number, withHeaderRow = false) {
  const before = ed.state.selection.from;
  ed.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
  let target = -1;
  ed.state.doc.descendants((n, pos) => {
    if (target >= 0) return false;
    if (n.type.name === "table" && pos >= before - 2) { target = pos; return false; }
    return true;
  });
  if (target >= 0) ed.chain().focus().setTextSelection(target + 4).run();
}

/** 표가 글 칸보다 넓으면 칸 너비를 같은 비율로 줄인다 (한글·워드 파일을 열 때) */
export function fitTables(ed: Editor, contentPx: number) {
  let tr = ed.state.tr;
  let changed = false;
  ed.state.doc.descendants((n, pos) => {
    if (n.type.name !== "table") return true;
    // 가장 넓은 줄 기준 (첫 줄이 머리 칸이라 좁은 서식이 있다)
    let total = 0;
    n.forEach((row) => { let t = 0; row.forEach((cell) => { const cw = cell.attrs.colwidth as number[] | null; t += cw ? cw.reduce((s, v) => s + (v || 0), 0) : 0; }); total = Math.max(total, t); });
    const room = contentPx - 12; // 칸 테두리·안쪽 여백 몫
    if (total > room) {
      const k = room / total;
      n.descendants((cell, cpos) => {
        if (cell.type.name !== "tableCell" && cell.type.name !== "tableHeader") return true;
        const cw = cell.attrs.colwidth as number[] | null;
        if (cw) { tr = tr.setNodeMarkup(pos + 1 + cpos, undefined, { ...cell.attrs, colwidth: cw.map((v) => Math.max(3, Math.floor(v * k))) }); changed = true; }
        return false;
      });
    }
    return false;
  });
  if (changed) ed.view.dispatch(tr.setMeta("addToHistory", false));
}
