// 문서편집 — 한글 .hwpx 읽기 · 쓰기 (직접 — OWPML, 한글 2014 이후 · 한컴 무료 뷰어에서 열림)
//  .hwp(예전 형식)는 앱의 변환기(hwplib)가 .hwpx 와 같은 모양으로 바꿔 이 읽기·쓰기를 거친다
//  단위: HWPUNIT = 1/7200 인치 (1pt = 100) · 글자 크기 height 1000 = 10pt
import JSZip from "jszip";
import type { JSONContent } from "@tiptap/core";
import { DEFAULT_PAGE, PAPERS, THEMES, esc, type DocData, type PageSetup } from "./model";

const HU_PER_MM = 7200 / 25.4;
const huToPt = (v: number) => Math.round((v / 100) * 10) / 10;
const ln = (el: Element) => el.localName;
const kids = (el: Element | null | undefined, name?: string) => (el ? Array.from(el.children).filter((c) => !name || ln(c) === name) : []);
const kid = (el: Element | null | undefined, name: string) => kids(el, name)[0] || null;
const desc = (el: Element | Document | null | undefined, name: string) => (el ? Array.from(el.getElementsByTagName("*")).filter((c) => ln(c) === name) : []);
const a = (el: Element | null | undefined, n: string) => (el ? el.getAttribute(n) : null);
const parseXml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const okColor = (c: string | null) => (c && /^#[0-9a-f]{6}$/i.test(c) && !/^#(ffffff)$/i.test(c) ? c : null);

/* ───────────── 읽기 ───────────── */
type CharPr = { size: number; spacing?: number; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; font?: string; shade?: string; va?: "sup" | "sub" };
type ParaPr = { breakAll?: boolean; align?: string; left?: number; right?: number; indent?: number; prev?: number; next?: number; line?: number };

export async function hwpxToDoc(bytes: Uint8Array): Promise<DocData & { html: string }> {
  const zip = await JSZip.loadAsync(bytes);
  const read = async (p: string) => (zip.file(p) ? await zip.file(p)!.async("string") : "");
  const headXml = await read("Contents/header.xml");
  if (!headXml) throw new Error("한글 문서(.hwpx)가 아니에요 — header.xml 이 없어요");
  const head = parseXml(headXml);
  // 글꼴 (한글 글꼴 목록)
  const fonts: string[] = [];
  const hf = desc(head, "fontface").find((f) => a(f, "lang") === "HANGUL");
  for (const f of kids(hf, "font")) fonts[Number(a(f, "id"))] = a(f, "face") || "";
  // 칸 채우기 색 (표 칸 배경)
  const fills: Record<string, string> = {};
  for (const bf of desc(head, "borderFill")) { const wb = desc(bf, "winBrush")[0]; const c = okColor(a(wb, "faceColor")); if (c) fills[a(bf, "id") || ""] = c; }
  // 글자 모양
  const chars: Record<string, CharPr> = {};
  for (const c of desc(head, "charPr")) {
    const ul = kid(c, "underline"), so = kid(c, "strikeout"), fr = kid(c, "fontRef");
    chars[a(c, "id") || ""] = {
      size: Number(a(c, "height") || 1000) / 100,
      spacing: Number(a(kid(c, "spacing"), "hangul") || 0),
      color: okColor(a(c, "textColor")) && a(c, "textColor") !== "#000000" ? a(c, "textColor")! : undefined,
      bold: !!kid(c, "bold"), italic: !!kid(c, "italic"),
      underline: !!ul && a(ul, "type") !== "NONE",
      strike: !!so && a(so, "shape") !== "NONE" && a(so, "shape") !== null,
      font: fr ? fonts[Number(a(fr, "hangul") || 0)] : undefined,
      shade: okColor(a(c, "shadeColor")) || undefined,
      va: kid(c, "supscript") ? "sup" : kid(c, "subscript") ? "sub" : undefined,
    };
  }
  // 문단 모양
  const paras: Record<string, ParaPr> = {};
  for (const p of desc(head, "paraPr")) {
    const al = a(kid(p, "align"), "horizontal") || "JUSTIFY";
    const mg = desc(p, "margin")[0], ls = desc(p, "lineSpacing")[0];
    const v = (n: string) => { const e = mg ? kids(mg).find((x) => ln(x) === n) : null; return e ? Number(a(e, "value") || 0) : 0; };
    paras[a(p, "id") || ""] = {
      align: al === "CENTER" ? "center" : al === "RIGHT" ? "right" : al === "JUSTIFY" || al === "DISTRIBUTE" ? "justify" : "left",
      left: huToPt(v("left")), right: huToPt(v("right")), indent: huToPt(v("intent")), prev: huToPt(v("prev")), next: huToPt(v("next")),
      line: ls && a(ls, "type") === "PERCENT" ? Number(a(ls, "value") || 160) / 100 : undefined,
      // OWPML: KEEP_WORD = 글자 단위, BREAK_WORD = 어절 단위 (hwp2hwpx·한글과 같은 뜻)
      breakAll: a(kid(p, "breakSetting"), "breakNonLatinWord") === "KEEP_WORD",
    };
  }
  // 그림 (BinData)
  const bins: Record<string, string> = {};
  const hpf = parseXml(await read("Contents/content.hpf"));
  for (const it of desc(hpf, "item")) {
    const href = a(it, "href") || "", id = a(it, "id") || "";
    if (!/BinData\//.test(href)) continue;
    const f = zip.file(href) || zip.file(href.replace(/^\//, ""));
    if (f) bins[id] = `data:${a(it, "media-type") || "image/png"};base64,${b64(await f.async("uint8array"))}`;
  }
  const page: PageSetup = { ...DEFAULT_PAGE, margin: { ...DEFAULT_PAGE.margin } };
  // 본문
  const runHtml = (r: Element): string => {
    const cp = chars[a(r, "charPrIDRef") || ""] || { size: 10 };
    let h = "";
    for (const c of kids(r)) {
      const n = ln(c);
      if (n === "t") {
        let t = "";
        for (const x of Array.from(c.childNodes)) {
          if (x.nodeType === 3) t += esc(x.textContent || "");
          else if ((x as Element).localName === "tab") t += "&emsp;&emsp;";
          else if ((x as Element).localName === "lineBreak") t += "<br>";
          else if ((x as Element).localName === "fwSpace" || (x as Element).localName === "nbSpace") t += "&nbsp;";
        }
        if (!t) continue;
        const css: string[] = [];
        if (cp.color) css.push(`color:${cp.color}`);
        if (cp.size) css.push(`font-size:${cp.size}pt`);
        if (cp.spacing) css.push(`letter-spacing:${cp.spacing / 100}em`);
        if (cp.font) css.push(`font-family:'${cp.font.replace(/'/g, "")}'`);
        if (css.length) t = `<span style="${css.join(";")}">${t}</span>`;
        if (cp.shade) t = `<mark data-color="${cp.shade}" style="background-color:${cp.shade}">${t}</mark>`;
        if (cp.va) t = `<${cp.va}>${t}</${cp.va}>`;
        if (cp.strike) t = `<s>${t}</s>`;
        if (cp.underline) t = `<u>${t}</u>`;
        if (cp.italic) t = `<em>${t}</em>`;
        if (cp.bold) t = `<strong>${t}</strong>`;
        h += t;
      } else if (n === "tbl") {
        // 글자처럼 취급하지 않은 표(문단에 붙어 떠 있는 표)는 그 문단 글 아래에 놓인다 → 문단 뒤로
        const floating = a(kid(c, "pos"), "treatAsChar") === "0";
        h += floating ? `\u0000FLOAT\u0000${tableHtml(c)}\u0000FEND\u0000` : `\u0000BLOCK\u0000${tableHtml(c)}\u0000END\u0000`;
      }
      else if (n === "pic") {
        const img = desc(c, "img")[0];
        const src = bins[a(img, "binaryItemIDRef") || ""];
        const sz = kid(c, "curSz") || kid(c, "sz");
        const w = sz ? Math.round((Number(a(sz, "width")) / 7200) * 96) : 0, hh = sz ? Math.round((Number(a(sz, "height")) / 7200) * 96) : 0;
        if (src) h += `\u0000BLOCK\u0000<img src="${src}"${w ? ` width="${w}"` : ""}${hh ? ` height="${hh}"` : ""}>\u0000END\u0000`;
      } else if (n === "secPr") {
        const pp = kid(c, "pagePr");
        if (pp) {
          let w = Number(a(pp, "width")) / HU_PER_MM, hh = Number(a(pp, "height")) / HU_PER_MM;
          const land = a(pp, "landscape") === "NARROWLY";
          if (w > hh) [w, hh] = [hh, w];
          page.w = Math.round(w * 10) / 10; page.h = Math.round(hh * 10) / 10; page.landscape = land;
          const pr = PAPERS.find((x) => Math.abs(x.w - page.w) < 2 && Math.abs(x.h - page.h) < 2);
          page.paper = pr ? pr.id : "custom";
          const m = kid(pp, "margin");
          if (m) page.margin = { top: Number(a(m, "top")) / HU_PER_MM + Number(a(m, "header") || 0) / HU_PER_MM, bottom: Number(a(m, "bottom")) / HU_PER_MM + Number(a(m, "footer") || 0) / HU_PER_MM, left: Number(a(m, "left")) / HU_PER_MM, right: Number(a(m, "right")) / HU_PER_MM };
        }
      } else if (n === "ctrl") {
        for (const x of kids(c)) {
          const xn = ln(x);
          if (xn === "header" || xn === "footer") {
            // 머리글 글 — 쪽 번호(자동 번호)는 {PAGE} · {PAGES} 로
            const lines = desc(x, "p").map((pp) => desc(pp, "*").map((e) => (ln(e) === "t" ? e.textContent || "" : ln(e) === "autoNum" ? (a(e, "numType") === "TOTAL_PAGE" ? "{PAGES}" : a(e, "numType") === "PAGE" ? "{PAGE}" : "") : "")).join(""));
            page[xn] = lines.join("\n").trim() || page[xn];
          }
          else if (xn === "pageNum") { const pos = a(x, "pos") || ""; page.pageNumber = /BOTTOM_RIGHT/.test(pos) ? "bottom-right" : /TOP_RIGHT/.test(pos) ? "top-right" : /TOP/.test(pos) ? "top-center" : "bottom-center"; }
          else if (xn === "footNote" || xn === "endNote") h += `<sup data-footnote="1" data-text="${esc(desc(x, "t").map((t) => t.textContent).join("").trim())}">*</sup>`;
        }
      }
    }
    return h;
  };
  const paraHtml = (p: Element): string => {
    const pp = paras[a(p, "paraPrIDRef") || ""] || {};
    const css: string[] = [];
    if (pp.align && pp.align !== "justify") css.push(`text-align:${pp.align}`); else if (pp.align === "justify") css.push("text-align:justify");
    // 한글 내어쓰기(음수) = 첫 줄은 왼쪽 여백 그대로, 나머지 줄이 들어감 → CSS 는 왼쪽 여백을 늘리고 첫 줄을 당긴다
    const hang = pp.indent && pp.indent < 0 ? -pp.indent : 0;
    if (pp.left || hang) css.push(`margin-left:${(pp.left || 0) + hang}pt`);
    if (pp.right) css.push(`margin-right:${pp.right}pt`);
    if (pp.indent) css.push(`text-indent:${pp.indent}pt`);
    if (pp.prev) css.push(`padding-top:${pp.prev}pt`);
    css.push(`padding-bottom:${pp.next || 0}pt`);
    if (pp.line) css.push(`line-height:${pp.line}`);
    if (pp.breakAll) css.push("word-break:break-all");
    // 문단 글자 크기 = 첫 글자 모양 (빈 줄도 원본 높이로)
    const firstRun = kids(p, "run")[0];
    const fsz = firstRun ? chars[a(firstRun, "charPrIDRef") || ""]?.size : undefined;
    if (fsz && fsz !== 10) css.push(`font-size:${fsz}pt`);
    let inner = kids(p, "run").map(runHtml).join("");
    const floats: string[] = [];
    inner = inner.replace(/\u0000FLOAT\u0000([\s\S]*?)\u0000FEND\u0000/g, (_m, t) => { floats.push(t); return ""; });
    const st = `${css.length ? ` style="${css.join(";")}"` : ""} data-hl="1"`; // 한글 줄 간격 방식
    // 표·그림은 문단 밖 블록으로 꺼낸다
    let out = a(p, "pageBreak") === "1" ? `<div data-page-break="1"></div>` : "";
    const parts = inner.split(/\u0000BLOCK\u0000|\u0000END\u0000/);
    let textBuf = "";
    parts.forEach((part, i) => {
      if (i % 2 === 1) { if (textBuf.replace(/<[^>]+>/g, "").trim()) out += `<p${st}>${textBuf}</p>`; textBuf = ""; out += part; }
      else textBuf += part;
    });
    if (textBuf.replace(/<[^>]+>/g, "").trim() || /<br>/.test(textBuf) || (!out.replace(/<div data-page-break="1"><\/div>/, "") && !floats.length)) out += `<p${st}>${textBuf}</p>`;
    return out + floats.join("");
  };
  const tableHtml = (tbl: Element): string => {
    const rows = kids(tbl, "tr");
    // 칸 격자 너비 — 합치지 않은 칸 너비로 먼저 채우고, 합친 칸은 모자란 만큼 빈 열에 나눈다 (칸 주소 cellAddr 기준)
    const cells = rows.flatMap((tr) => kids(tr, "tc")).map((tc) => {
      const span = kid(tc, "cellSpan"), sz = kid(tc, "cellSz"), addr = kid(tc, "cellAddr");
      return { col: Number(a(addr, "colAddr") || 0), cs: Number(a(span, "colSpan") || 1), w: sz ? (Number(a(sz, "width")) / 7200) * 96 : 0 };
    });
    const nCols = Math.max(Number(a(tbl, "colCnt") || 0), ...cells.map((c) => c.col + c.cs));
    const grid: number[] = Array(nCols).fill(0);
    for (const c of [...cells].sort((x, y) => x.cs - y.cs)) {
      const idx = Array.from({ length: c.cs }, (_, k) => c.col + k).filter((k) => k < nCols);
      const known = idx.reduce((sum, k) => sum + grid[k], 0);
      const empty = idx.filter((k) => !grid[k]);
      if (empty.length && c.w > known) for (const k of empty) grid[k] = (c.w - known) / empty.length;
    }
    const fill = grid.filter((v) => v > 0);
    const avg = fill.length ? fill.reduce((x, y) => x + y, 0) / fill.length : 40;
    for (let k = 0; k < nCols; k++) if (!grid[k]) grid[k] = avg;
    return `<table>${rows.map((tr) => `<tr>${kids(tr, "tc").map((tc) => {
      const span = kid(tc, "cellSpan"), addr = kid(tc, "cellAddr");
      const cs = Number(a(span, "colSpan") || 1), rs = Number(a(span, "rowSpan") || 1);
      const col = Number(a(addr, "colAddr") || 0);
      const cw = grid.slice(col, col + cs).map((v) => Math.max(1, Math.round(v)));
      const bg = fills[a(tc, "borderFillIDRef") || ""];
      const sub = kid(tc, "subList");
      const va = a(sub, "vertAlign");
      const inner = kids(sub, "p").map(paraHtml).join("") || "<p></p>";
      const cm = kid(tc, "cellMargin");
      // 한글 칸 크기에는 테두리가 들어 있다 → 위·아래 여백에서 테두리 반 줄씩 뺀다 (소수까지)
      const px = (n: string, minus = 0) => Math.max(0, Math.round(((Number(a(cm, n) || 0) / 7200) * 96 - minus) * 10) / 10);
      const pad = cm ? `${px("top", 0.5)} ${px("right")} ${px("bottom", 0.5)} ${px("left")}` : "";
      const st = [bg ? `background-color:${bg}` : "", va === "CENTER" ? "vertical-align:middle" : va === "BOTTOM" ? "vertical-align:bottom" : ""].filter(Boolean).join(";");
      return `<td${cs > 1 ? ` colspan="${cs}"` : ""}${rs > 1 ? ` rowspan="${rs}"` : ""}${cw.length === cs ? ` colwidth="${cw.join(",")}"` : ""}${bg ? ` data-bg="${bg}"` : ""}${pad ? ` data-pad="${pad}"` : ""}${st ? ` style="${st}"` : ""}>${inner}</td>`;
    }).join("")}</tr>`).join("")}</table>`;
  };
  let html = "";
  const secs = Object.keys(zip.files).filter((f) => /^Contents\/section\d+\.xml$/.test(f)).sort((x, y) => Number(/\d+/.exec(x)![0]) - Number(/\d+/.exec(y)![0]));
  for (const s of secs) {
    const sec = parseXml(await read(s)).documentElement;
    for (const p of kids(sec, "p")) html += paraHtml(p);
  }
  // 기본 글자 — 바탕글 스타일의 글자 모양
  const st0 = desc(head, "style").find((s) => a(s, "id") === "0");
  const base = st0 ? chars[a(st0, "charPrIDRef") || ""] : undefined;
  return { page, json: { type: "doc" }, html, meta: { font: base?.font, size: base?.size } } as DocData & { html: string };
}

/* ───────────── 쓰기 ───────────── */
type Ctx = {
  fonts: string[]; charKeys: Map<string, number>; chars: string[]; paraKeys: Map<string, number>; paras: string[];
  fillKeys: Map<string, number>; fills: string[]; bins: { id: string; name: string; data: Uint8Array; mime: string }[]; uid: number; contentW: number;
  base: { font: string; size: number };
};
const xmlEsc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const hex6 = (c?: string | null) => { if (!c) return ""; const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (m) return `#${m[1].toUpperCase()}`; const r = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(String(c)); return r ? `#${[r[1], r[2], r[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("").toUpperCase()}` : ""; };
const ptOf = (s?: string | null) => { if (!s) return 0; const m = /([\d.]+)\s*(pt|px)?/.exec(String(s)); return m ? (m[2] === "px" ? parseFloat(m[1]) * 0.75 : parseFloat(m[1])) : 0; };

function fontId(ctx: Ctx, f: string) { let i = ctx.fonts.indexOf(f); if (i < 0) { ctx.fonts.push(f); i = ctx.fonts.length - 1; } return i; }
function charId(ctx: Ctx, marks: JSONContent["marks"], over: Partial<{ size: number; bold: boolean; color: string }> = {}): number {
  let bold = false, italic = false, underline = false, strike = false, sup = false, sub = false;
  let font = ctx.base.font, size = ctx.base.size, color = "#000000", shade = "none", spacing = 0;
  for (const m of marks || []) {
    if (m.type === "bold") bold = true;
    else if (m.type === "italic") italic = true;
    else if (m.type === "underline" || m.type === "link") underline = true;
    else if (m.type === "strike") strike = true;
    else if (m.type === "superscript") sup = true;
    else if (m.type === "subscript") sub = true;
    else if (m.type === "highlight") shade = hex6(m.attrs?.color) || "#FFFF00";
    else if (m.type === "textStyle") {
      if (m.attrs?.fontFamily) font = String(m.attrs.fontFamily).split(",")[0].replace(/['"]/g, "").trim();
      if (m.attrs?.fontSize) size = ptOf(m.attrs.fontSize) || size;
      if (m.attrs?.color) color = hex6(m.attrs.color) || color;
      if (m.attrs?.backgroundColor) shade = hex6(m.attrs.backgroundColor) || shade;
      if (m.attrs?.letterSpacing) { const v = parseFloat(String(m.attrs.letterSpacing)); if (Number.isFinite(v)) spacing = Math.round(/em/.test(String(m.attrs.letterSpacing)) ? v * 100 : (v / Math.max(1, size * 1.333)) * 100); }
    }
    if (m.type === "link" && color === "#000000") color = "#0563C1";
  }
  if (over.size) size = over.size;
  if (over.bold) bold = true;
  if (over.color) color = over.color;
  const fid = fontId(ctx, font);
  const key = [fid, size, color, shade, bold, italic, underline, strike, sup, sub, spacing].join("|");
  const got = ctx.charKeys.get(key);
  if (got !== undefined) return got;
  const id = ctx.chars.length;
  const all = (v: string | number) => `hangul="${v}" latin="${v}" hanja="${v}" japanese="${v}" other="${v}" symbol="${v}" user="${v}"`;
  ctx.chars.push(`<hh:charPr id="${id}" height="${Math.round(size * 100)}" textColor="${color}" shadeColor="${shade}" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:fontRef ${all(fid)}/><hh:ratio ${all(100)}/><hh:spacing ${all(Math.max(-50, Math.min(50, spacing)))}/><hh:relSz ${all(100)}/><hh:offset ${all(0)}/>${bold ? "<hh:bold/>" : ""}${italic ? "<hh:italic/>" : ""}<hh:underline type="${underline ? "BOTTOM" : "NONE"}" shape="SOLID" color="${underline && color !== "#000000" ? color : "#000000"}"/><hh:strikeout shape="${strike ? "SOLID" : "NONE"}" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#B2B2B2" offsetX="10" offsetY="10"/>${sup ? "<hh:supscript/>" : sub ? "<hh:subscript/>" : ""}</hh:charPr>`);
  ctx.charKeys.set(key, id);
  return id;
}
function paraId(ctx: Ctx, attrs: Record<string, unknown> = {}, over: Partial<{ align: string; left: number; next: number }> = {}): number {
  const al = String(over.align || attrs.textAlign || "justify");
  const align = al === "center" ? "CENTER" : al === "right" ? "RIGHT" : al === "left" ? "LEFT" : "JUSTIFY";
  const hu = (v: unknown) => Math.round((Number(v) || 0) * 100);
  // 편집기(CSS·워드)의 내어쓰기는 왼쪽 여백이 둘째 줄 기준, 한글은 첫 줄 기준 → 음수 첫 줄만큼 왼쪽 여백을 줄여 적는다
  const fl = Number(attrs.firstLine) || 0;
  const left = hu(Math.max(0, (over.left ?? 0) + (Number(attrs.indentLeft) || 0) + (fl < 0 ? fl : 0))), right = hu(attrs.indentRight), indent = hu(attrs.firstLine);
  const prev = hu(attrs.spaceBefore), next = attrs.spaceAfter !== null && attrs.spaceAfter !== undefined ? hu(attrs.spaceAfter) : over.next !== undefined ? hu(over.next) : 0;
  const line = Math.round((Number(attrs.lineHeight) || 1.6) * 100);
  const keep = attrs.keepNext ? 1 : 0;
  const brk = attrs.breakAll ? "KEEP_WORD" : "BREAK_WORD"; // 글자 단위 : 어절 단위
  const key = [align, left, right, indent, prev, next, line, keep, brk].join("|");
  const got = ctx.paraKeys.get(key);
  if (got !== undefined) return got;
  const id = ctx.paras.length;
  // HwpUnitChar 쪽(case)은 HWPUNIT 그대로, 예전 방식(default)은 두 배 값 (한글이 그렇게 쓴다 — hwp2hwpx 와 같게)
  const mgOf = (k: number) => `<hh:margin><hc:intent value="${indent * k}" unit="HWPUNIT"/><hc:left value="${left * k}" unit="HWPUNIT"/><hc:right value="${right * k}" unit="HWPUNIT"/><hc:prev value="${prev * k}" unit="HWPUNIT"/><hc:next value="${next * k}" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="${line}" unit="HWPUNIT"/>`;
  ctx.paras.push(`<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0"><hh:align horizontal="${align}" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="${brk}" widowOrphan="0" keepWithNext="${keep}" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hp:switch><hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">${mgOf(1)}</hp:case><hp:default>${mgOf(2)}</hp:default></hp:switch><hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>`);
  ctx.paraKeys.set(key, id);
  return id;
}
/** 칸 테두리·채우기 — 1 = 없음(쪽), 2 = 글자용(없음), 3 = 표 칸 실선 · 그 밖 = 칸 색 */
function fillId(ctx: Ctx, bg: string, border = true): number {
  const key = `${bg}|${border}`;
  const got = ctx.fillKeys.get(key);
  if (got !== undefined) return got;
  const id = ctx.fills.length + 1;
  const line = border ? 'type="SOLID" width="0.12 mm" color="#000000"' : 'type="NONE" width="0.1 mm" color="#000000"';
  ctx.fills.push(`<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/><hh:leftBorder ${line}/><hh:rightBorder ${line}/><hh:topBorder ${line}/><hh:bottomBorder ${line}/><hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>${bg ? `<hc:fillBrush><hc:winBrush faceColor="${bg}" hatchColor="#999999" alpha="0"/></hc:fillBrush>` : ""}</hh:borderFill>`);
  ctx.fillKeys.set(key, id);
  return id;
}
const pOpen = (ctx: Ctx, pid: number, pageBreak = false) => `<hp:p id="${++ctx.uid}" paraPrIDRef="${pid}" styleIDRef="0" pageBreak="${pageBreak ? 1 : 0}" columnBreak="0" merged="0">`;
function runsXml(ctx: Ctx, nodes: JSONContent[] | undefined, over: Partial<{ size: number; bold: boolean; color: string }> = {}): string {
  let x = "";
  for (const n of nodes || []) {
    if (n.type === "text") {
      const cid = charId(ctx, n.marks, over);
      const parts = (n.text || "").split("\t");
      x += `<hp:run charPrIDRef="${cid}"><hp:t>${parts.map((t, i) => `${i ? "<hp:tab/>" : ""}${xmlEsc(t)}`).join("")}</hp:t></hp:run>`;
    } else if (n.type === "hardBreak") x += `<hp:run charPrIDRef="${charId(ctx, [], over)}"><hp:t><hp:lineBreak/></hp:t></hp:run>`;
    else if (n.type === "footnote") x += `<hp:run charPrIDRef="${charId(ctx, [], over)}"><hp:ctrl><hp:footNote number="0" suffixChar="41" instId="${++ctx.uid}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="TOP" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${pOpen(ctx, paraId(ctx))}<hp:run charPrIDRef="${charId(ctx, [], { size: 9 })}"><hp:t>${xmlEsc(String(n.attrs?.text || ""))}</hp:t></hp:run></hp:p></hp:subList></hp:footNote></hp:ctrl></hp:run>`;
  }
  return x;
}
const imgDim = (src: string) => new Promise<{ w: number; h: number }>((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: 300, h: 200 }); im.src = src; });
async function picXml(ctx: Ctx, n: JSONContent): Promise<string> {
  const src = String(n.attrs?.src || "");
  const m = /^data:([^;]+);base64,(.*)$/.exec(src);
  let mime = "image/png", data: Uint8Array | null = null;
  if (m) { mime = m[1]; const bin = atob(m[2]); data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i); }
  else { try { const r = await fetch(src); const bl = await r.blob(); mime = bl.type || mime; data = new Uint8Array(await bl.arrayBuffer()); } catch { return ""; } }
  const ext = /png/.test(mime) ? "png" : /gif/.test(mime) ? "gif" : /bmp/.test(mime) ? "bmp" : "jpg";
  const id = `image${ctx.bins.length + 1}`;
  ctx.bins.push({ id, name: `${id}.${ext}`, data, mime: ext === "jpg" ? "image/jpeg" : `image/${ext}` });
  let pw = Number(n.attrs?.width) || 0, ph = Number(n.attrs?.height) || 0;
  if (!pw || !ph) { const s = await imgDim(src); if (!pw && !ph) { pw = s.w; ph = s.h; } else if (!ph) ph = Math.round((pw * s.h) / s.w); else pw = Math.round((ph * s.w) / s.h); }
  const maxPx = (ctx.contentW / 7200) * 96;
  if (pw > maxPx) { ph = Math.round((ph * maxPx) / pw); pw = Math.round(maxPx); }
  const W = Math.round((pw / 96) * 7200), H = Math.round((ph / 96) * 7200);
  const uid = ++ctx.uid;
  return `<hp:pic id="${uid}" zOrder="${uid}" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="${uid}" reverse="0"><hp:offset x="0" y="0"/><hp:orgSz width="${W}" height="${H}"/><hp:curSz width="${W}" height="${H}"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${Math.round(W / 2)}" centerY="${Math.round(H / 2)}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo><hc:img binaryItemIDRef="${id}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${W}" y="0"/><hc:pt2 x="${W}" y="${H}"/><hc:pt3 x="0" y="${H}"/></hp:imgRect><hp:imgClip left="0" right="${W}" top="0" bottom="${H}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="${W}" dimheight="${H}"/><hp:effects/><hp:sz width="${W}" widthRelTo="ABSOLUTE" height="${H}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/></hp:pic>`;
}
async function tableXml(ctx: Ctx, t: JSONContent, totalW: number, noBorder = false): Promise<string> {
  const rows = t.content || [];
  let cols = 0;
  for (const c of rows[0]?.content || []) cols += Number(c.attrs?.colspan) || 1;
  cols = Math.max(1, cols);
  // 열 너비 (HWPUNIT)
  const widths: number[] = Array(cols).fill(0);
  for (const r of rows) { let ci = 0; for (const c of r.content || []) { const cw = c.attrs?.colwidth as number[] | null; const sp = Number(c.attrs?.colspan) || 1; if (cw) cw.forEach((v, k) => { if (v && ci + k < cols && !widths[ci + k]) widths[ci + k] = Math.round((v / 96) * 7200); }); ci += sp; } }
  const known = widths.reduce((s, v) => s + v, 0), unknown = widths.filter((v) => !v).length;
  const rest = Math.max(2000, Math.round((totalW - known) / Math.max(1, unknown)));
  const grid = widths.map((v) => v || rest);
  const occupied = new Set<string>();
  const rowH = 1800;
  let trs = "";
  for (let ri = 0; ri < rows.length; ri++) {
    let tcs = "", ci = 0;
    for (const c of rows[ri].content || []) {
      while (occupied.has(`${ri}:${ci}`)) ci++;
      const cs = Number(c.attrs?.colspan) || 1, rs = Number(c.attrs?.rowspan) || 1;
      for (let dr = 0; dr < rs; dr++) for (let dc = 0; dc < cs; dc++) occupied.add(`${ri + dr}:${ci + dc}`);
      const w = grid.slice(ci, ci + cs).reduce((s, v) => s + v, 0);
      const bg = hex6(c.attrs?.backgroundColor);
      const fid = fillId(ctx, bg, !noBorder);
      // 칸 안쪽 여백 (편집기 "위 오른 아래 왼" px → HWPUNIT), 없으면 한글 기본
      const pv = String(c.attrs?.pad || "").split(" ").map(Number);
      const pad = pv.length === 4 && pv.every((v) => Number.isFinite(v)) ? pv.map((v) => Math.round((v / 96) * 7200)) : [141, 510, 141, 510];
      const va = c.attrs?.verticalAlign === "middle" ? "CENTER" : c.attrs?.verticalAlign === "bottom" ? "BOTTOM" : noBorder ? "TOP" : "CENTER";
      const inner = (await blocksXml(ctx, c.content, w - 1020, c.type === "tableHeader")) || `${pOpen(ctx, paraId(ctx))}<hp:run charPrIDRef="${charId(ctx, [])}"/></hp:p>`;
      tcs += `<hp:tc name="" header="${c.type === "tableHeader" ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${fid}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${va}" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${inner}</hp:subList><hp:cellAddr colAddr="${ci}" rowAddr="${ri}"/><hp:cellSpan colSpan="${cs}" rowSpan="${rs}"/><hp:cellSz width="${w}" height="${rowH * rs}"/><hp:cellMargin left="${pad[3]}" right="${pad[1]}" top="${pad[0]}" bottom="${pad[2]}"/></hp:tc>`;
      ci += cs;
    }
    trs += `<hp:tr>${tcs}</hp:tr>`;
  }
  const W = grid.reduce((s, v) => s + v, 0);
  const uid = ++ctx.uid;
  return `<hp:tbl id="${uid}" zOrder="${uid}" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rows.length}" colCnt="${cols}" cellSpacing="0" borderFillIDRef="${fillId(ctx, "", !noBorder)}" noAdjust="0"><hp:sz width="${W}" widthRelTo="ABSOLUTE" height="${rowH * rows.length}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="283" right="283" top="283" bottom="283"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs}</hp:tbl>`;
}
/** 블록들 → <hp:p>… (표·그림은 글자처럼 취급한 문단 하나에) */
async function blocksXml(ctx: Ctx, nodes: JSONContent[] | undefined, width: number, headerCell = false, listDepth = 0): Promise<string> {
  let x = "";
  let pendingBreak = false;
  const theme = ctx.base;
  for (const n of nodes || []) {
    switch (n.type) {
      case "paragraph":
        x += `${pOpen(ctx, paraId(ctx, n.attrs || {}), pendingBreak)}${runsXml(ctx, n.content, headerCell ? { bold: true } : {}) || `<hp:run charPrIDRef="${charId(ctx, [], n.attrs?.fontSize ? { size: Number(n.attrs.fontSize) } : {})}"/>`}</hp:p>`;
        pendingBreak = false;
        break;
      case "heading": {
        const lv = Number(n.attrs?.level) || 1;
        const t = THEMES.find((x2) => x2.body === theme.font) || THEMES[0];
        const size = lv === 1 ? t.h1 : lv === 2 ? t.h2 : lv === 3 ? t.h3 : 11;
        x += `${pOpen(ctx, paraId(ctx, { ...(n.attrs || {}), keepNext: true }, { next: 6 }), pendingBreak)}${runsXml(ctx, n.content, { size, bold: true, color: t.color.toUpperCase() }) || `<hp:run charPrIDRef="${charId(ctx, [])}"/>`}</hp:p>`;
        pendingBreak = false;
        break;
      }
      case "bulletList": case "orderedList": {
        let k = 0;
        for (const li of n.content || []) {
          k++;
          let first = true;
          for (const c of li.content || []) {
            if (c.type === "bulletList" || c.type === "orderedList") { x += await blocksXml(ctx, [c], width, headerCell, listDepth + 1); continue; }
            if (c.type === "paragraph" && first) {
              const mark = n.type === "bulletList" ? ["• ", "◦ ", "▪ "][listDepth % 3] : `${k}. `;
              x += `${pOpen(ctx, paraId(ctx, c.attrs || {}, { left: 20 * (listDepth + 1) }), pendingBreak)}<hp:run charPrIDRef="${charId(ctx, [])}"><hp:t>${xmlEsc(mark)}</hp:t></hp:run>${runsXml(ctx, c.content)}</hp:p>`;
              pendingBreak = false;
            } else x += await blocksXml(ctx, [c], width, headerCell, listDepth + 1);
            first = false;
          }
        }
        break;
      }
      case "blockquote":
        x += await blocksXml(ctx, (n.content || []).map((c) => (c.type === "paragraph" ? { ...c, attrs: { ...(c.attrs || {}), indentLeft: (Number(c.attrs?.indentLeft) || 0) + 24 } } : c)), width, headerCell, listDepth);
        break;
      case "pageBreak": pendingBreak = true; break;
      case "horizontalRule": x += `${pOpen(ctx, paraId(ctx, { textAlign: "center" }))}<hp:run charPrIDRef="${charId(ctx, [], { color: "#999999" })}"><hp:t>${"─".repeat(30)}</hp:t></hp:run></hp:p>`; break;
      case "image": x += `${pOpen(ctx, paraId(ctx, { textAlign: n.attrs?.align || "center" }), pendingBreak)}<hp:run charPrIDRef="${charId(ctx, [])}">${await picXml(ctx, n)}<hp:t/></hp:run></hp:p>`; pendingBreak = false; break;
      case "table": x += `${pOpen(ctx, paraId(ctx), pendingBreak)}<hp:run charPrIDRef="${charId(ctx, [])}">${await tableXml(ctx, n, width)}<hp:t/></hp:run></hp:p>`; pendingBreak = false; break;
      case "columns": {
        // 단 → 테두리 없는 한 줄 표
        const cols = n.content || [];
        const fake: JSONContent = { type: "table", content: [{ type: "tableRow", content: cols.map((c) => ({ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: c.content })) }] };
        x += `${pOpen(ctx, paraId(ctx), pendingBreak)}<hp:run charPrIDRef="${charId(ctx, [])}">${await tableXml(ctx, fake, width, true)}<hp:t/></hp:run></hp:p>`;
        pendingBreak = false;
        break;
      }
      case "textBox": {
        const w = Math.round((width * (Number(n.attrs?.width) || 60)) / 100);
        const fake: JSONContent = { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: [Math.round((w / 7200) * 96)], backgroundColor: n.attrs?.fill || null }, content: n.content }] }] };
        x += `${pOpen(ctx, paraId(ctx, { textAlign: n.attrs?.align || "left" }), pendingBreak)}<hp:run charPrIDRef="${charId(ctx, [])}">${await tableXml(ctx, fake, w)}<hp:t/></hp:run></hp:p>`;
        pendingBreak = false;
        break;
      }
      case "toc": x += `${pOpen(ctx, paraId(ctx))}<hp:run charPrIDRef="${charId(ctx, [], { bold: true, size: 14 })}"><hp:t>목차</hp:t></hp:run></hp:p>`; break;
      case "codeBlock": x += `${pOpen(ctx, paraId(ctx))}<hp:run charPrIDRef="${charId(ctx, [])}"><hp:t>${xmlEsc((n.content || []).map((t) => t.text).join(""))}</hp:t></hp:run></hp:p>`; break;
      default: if (n.content) x += await blocksXml(ctx, n.content, width, headerCell, listDepth);
    }
  }
  return x;
}
function hfCtrl(ctx: Ctx, kind: "header" | "footer", text: string, align: string, width: number): string {
  const lines = text.split("\n").filter((l) => l.length);
  if (!lines.length) return "";
  const ps = lines.map((l) => {
    const parts = l.split(/(\{PAGE\}|\{PAGES\})/);
    const runs = parts.map((p) => (p === "{PAGE}" ? `<hp:run charPrIDRef="${charId(ctx, [], { size: 9 })}"><hp:ctrl><hp:autoNum num="1" numType="PAGE"><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar="" supscript="0"/></hp:autoNum></hp:ctrl></hp:run>` : p === "{PAGES}" ? `<hp:run charPrIDRef="${charId(ctx, [], { size: 9 })}"><hp:ctrl><hp:autoNum num="1" numType="TOTAL_PAGE"><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar="" supscript="0"/></hp:autoNum></hp:ctrl></hp:run>` : p ? `<hp:run charPrIDRef="${charId(ctx, [], { size: 9 })}"><hp:t>${xmlEsc(p)}</hp:t></hp:run>` : "")).join("");
    return `${pOpen(ctx, paraId(ctx, { textAlign: align }))}${runs}</hp:p>`;
  }).join("");
  return `<hp:ctrl><hp:${kind} id="${++ctx.uid}" applyPageType="BOTH"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${kind === "header" ? "TOP" : "BOTTOM"}" linkListIDRef="0" linkListNextIDRef="0" textWidth="${width}" textHeight="4252" hasTextRef="0" hasNumRef="0">${ps}</hp:subList></hp:${kind}></hp:ctrl>`;
}

const NS = 'xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"';

export async function docToHwpx(data: DocData): Promise<Uint8Array> {
  const { page, json } = data;
  const theme = THEMES.find((t) => t.id === page.theme) || THEMES[0];
  const pw = page.landscape ? page.h : page.w; // 글 칸 너비 계산용 (용지 크기 자체는 세로 기준으로 적고 landscape 로 돌린다)
  const hu = (mm: number) => Math.round(mm * HU_PER_MM);
  const contentW = hu(pw - page.margin.left - page.margin.right);
  const meta = (data.meta || {}) as { font?: string; size?: number; title?: string };
  const ctx: Ctx = { fonts: [], charKeys: new Map(), chars: [], paraKeys: new Map(), paras: [], fillKeys: new Map(), fills: [], bins: [], uid: 0, contentW, base: { font: meta.font || theme.body, size: meta.size || 10 } };
  fillId(ctx, "", false); // 1 = 없음 (쪽 테두리)
  ctx.fills.push(ctx.fills[0].replace('id="1"', 'id="2"')); // 2 = 글자·문단용 (없음)
  charId(ctx, []); // 0 = 바탕글 글자
  paraId(ctx); // 0 = 바탕글 문단
  const body = await blocksXml(ctx, json.content, contentW);
  // 머리글 · 바닥글 · 쪽 번호
  const fAlign = page.footerAlign, hAlign = page.headerAlign;
  const pageNumCtrl = page.pageNumber !== "none" && !/\{PAGE\}/.test(page.header + page.footer)
    ? `<hp:ctrl><hp:pageNum pos="${({ "bottom-center": "BOTTOM_CENTER", "bottom-right": "BOTTOM_RIGHT", "top-right": "TOP_RIGHT", "top-center": "TOP_CENTER" } as Record<string, string>)[page.pageNumber] || "BOTTOM_CENTER"}" formatType="DIGIT" sideChar="-"/></hp:ctrl>` : "";
  const headMm = Math.min(15, page.margin.top / 2), footMm = Math.min(15, page.margin.bottom / 2);
  const secPr = `<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="0" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0"><hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/><hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/><hp:pagePr landscape="${page.landscape ? "NARROWLY" : "WIDELY"}" width="${hu(Math.min(page.w, page.h))}" height="${hu(Math.max(page.w, page.h))}" gutterType="LEFT_ONLY"><hp:margin header="${hu(headMm)}" footer="${hu(footMm)}" gutter="0" left="${hu(page.margin.left)}" right="${hu(page.margin.right)}" top="${hu(Math.max(0, page.margin.top - headMm))}" bottom="${hu(Math.max(0, page.margin.bottom - footMm))}"/></hp:pagePr><hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr><hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr>${["BOTH", "EVEN", "ODD"].map((t) => `<hp:pageBorderFill type="${t}" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>`).join("")}</hp:secPr>`;
  const ctrls = `<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>${hfCtrl(ctx, "header", page.header, hAlign, contentW)}${hfCtrl(ctx, "footer", page.footer, fAlign, contentW)}${pageNumCtrl}`;
  // 첫 문단 맨 앞에 구역 설정을 넣는다
  const firstOpen = /^<hp:p [^>]*>/.exec(body);
  const sectionBody = firstOpen ? `${firstOpen[0]}<hp:run charPrIDRef="0">${secPr}${ctrls}</hp:run>${body.slice(firstOpen[0].length)}` : `<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0">${secPr}${ctrls}</hp:run><hp:run charPrIDRef="0"/></hp:p>`;
  const section = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hs:sec ${NS}>${sectionBody}</hs:sec>`;
  // 머리 (글꼴·모양 목록)
  const fontfaces = ["HANGUL", "LATIN", "HANJA", "JAPANESE", "OTHER", "SYMBOL", "USER"].map((lang) => `<hh:fontface lang="${lang}" fontCnt="${ctx.fonts.length}">${ctx.fonts.map((f, i) => `<hh:font id="${i}" face="${xmlEsc(f)}" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>`).join("")}</hh:fontface>`).join("");
  const headXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hh:head ${NS} version="1.4" secCnt="1"><hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/><hh:refList><hh:fontfaces itemCnt="7">${fontfaces}</hh:fontfaces><hh:borderFills itemCnt="${ctx.fills.length}">${ctx.fills.join("")}</hh:borderFills><hh:charProperties itemCnt="${ctx.chars.length}">${ctx.chars.join("")}</hh:charProperties><hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties><hh:numberings itemCnt="0"/><hh:paraProperties itemCnt="${ctx.paras.length}">${ctx.paras.join("")}</hh:paraProperties><hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles></hh:refList><hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument><hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption><hh:trackchageConfig flags="56"/></hh:head>`;
  const items = ctx.bins.map((b) => `<opf:item id="${b.id}" href="BinData/${b.name}" media-type="${b.mime}" isEmbeded="1"/>`).join("");
  const hpf = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><opf:package ${NS} version="" unique-identifier="" id=""><opf:metadata><opf:title>${xmlEsc(meta.title || "")}</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">공실마케팅</opf:meta><opf:meta name="CreatedDate" content="text">${new Date().toISOString()}</opf:meta></opf:metadata><opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/>${items}</opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`;
  const zip = new JSZip();
  // 폴더 항목(word/ 같은)은 넣지 않는다 — 한글·워드가 까다롭게 볼 때가 있다
  const put = (n: string, d: string | Uint8Array, o: JSZip.JSZipFileOptions = {}) => zip.file(n, d, { createFolders: false, ...o });
  put("mimetype", "application/hwp+zip", { compression: "STORE" });
  put("version.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="0" buildNumber="1" os="1" xmlVersion="1.4" application="Hancom Office Hangul" appVersion="11, 0, 0, 0"/>`);
  put("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>`);
  put("META-INF/manifest.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`);
  put("META-INF/container.rdf", `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/></rdf:Description><rdf:Description rdf:about="Contents/header.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/></rdf:Description><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/></rdf:Description><rdf:Description rdf:about="Contents/section0.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/></rdf:Description><rdf:Description rdf:about=""><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/></rdf:Description></rdf:RDF>`);
  put("settings.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>`);
  put("Contents/content.hpf", hpf);
  put("Contents/header.xml", headXml);
  put("Contents/section0.xml", section);
  put("Preview/PrvText.txt", (json.content || []).map((n) => (n.content || []).map((t) => t.text || "").join("")).join("\r\n").slice(0, 1000));
  for (const b of ctx.bins) put(`BinData/${b.name}`, b.data);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", mimeType: "application/hwp+zip" });
}
