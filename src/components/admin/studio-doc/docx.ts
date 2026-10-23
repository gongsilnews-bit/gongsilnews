// 문서편집 — MS 워드 .docx 읽기 · 쓰기 (직접 — OOXML)
//  읽기: 문단·글자 서식·제목·목록·표(칸 합치기·칸 색·너비)·그림·링크·페이지 나누기·각주·메모·머리글/바닥글·용지·여백 → 편집기 HTML
//  쓰기: 편집기 JSON → document.xml · styles.xml · numbering.xml · footnotes.xml · comments.xml · header/footer · 그림
import JSZip from "jszip";
import type { JSONContent } from "@tiptap/core";
import { DEFAULT_PAGE, PAPERS, THEMES, esc, wordLineRatio, type DocData, type PageSetup } from "./model";

/* ───────────── 공통 ───────────── */
const TW_PER_MM = 1440 / 25.4;
const twToPt = (v: string | null | undefined) => (v ? Math.round((Number(v) / 20) * 10) / 10 : null);
const kids = (el: Element | null | undefined, tag?: string) => (el ? Array.from(el.children).filter((c) => !tag || c.tagName === tag) : []);
const kid = (el: Element | null | undefined, tag: string) => kids(el, tag)[0] || null;
const attr = (el: Element | null | undefined, name: string) => (el ? el.getAttribute(name) : null);
const val = (el: Element | null | undefined) => attr(el, "w:val");
const onOff = (el: Element | null) => !!el && !["0", "false", "off", "none"].includes(String(val(el) ?? "true"));
const HL: Record<string, string> = { yellow: "#FFFF00", green: "#00FF00", cyan: "#00FFFF", magenta: "#FF00FF", blue: "#0000FF", red: "#FF0000", darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000", darkYellow: "#808000", darkGray: "#808080", lightGray: "#C0C0C0", black: "#000000", white: "#FFFFFF" };
const parseXml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const mimeOf = (name: string) => (/\.png$/i.test(name) ? "image/png" : /\.gif$/i.test(name) ? "image/gif" : /\.bmp$/i.test(name) ? "image/bmp" : /\.svg$/i.test(name) ? "image/svg+xml" : /\.emf$/i.test(name) ? "image/emf" : "image/jpeg");

/* ───────────── 읽기 ───────────── */
type RunStyle = { b?: boolean; i?: boolean; u?: boolean; s?: boolean; color?: string; size?: number; font?: string; bg?: string; va?: "sup" | "sub" };
type Ctx = {
  zip: JSZip; rels: Record<string, { target: string; type: string }>; styles: Record<string, { name: string; based?: string; rPr?: Element | null; pPr?: Element | null; type: string }>;
  num: Record<string, Record<number, string>>; // numId → ilvl → numFmt
  foot: Record<string, string>; comments: Record<string, { text: string; author: string; at: string }>;
  media: Record<string, string>; // rId → data URL
  defPPr?: Element | null; defFont?: string;
};

function runStyleOf(rPr: Element | null, base: RunStyle = {}): RunStyle {
  const st = { ...base };
  if (!rPr) return st;
  const b = kid(rPr, "w:b"); if (b) st.b = onOff(b);
  const i = kid(rPr, "w:i"); if (i) st.i = onOff(i);
  const u = kid(rPr, "w:u"); if (u) st.u = val(u) !== "none";
  const s = kid(rPr, "w:strike") || kid(rPr, "w:dstrike"); if (s) st.s = onOff(s);
  const c = kid(rPr, "w:color"); if (c && val(c) && val(c) !== "auto") st.color = `#${val(c)}`;
  const sz = kid(rPr, "w:sz") || kid(rPr, "w:szCs"); if (sz && val(sz)) st.size = Number(val(sz)) / 2;
  const f = kid(rPr, "w:rFonts"); if (f) { const n = attr(f, "w:eastAsia") || attr(f, "w:ascii") || attr(f, "w:hAnsi"); if (n) st.font = n; }
  const hl = kid(rPr, "w:highlight"); if (hl && val(hl) && val(hl) !== "none") st.bg = HL[val(hl)!] || st.bg;
  const sh = kid(rPr, "w:shd"); if (sh && attr(sh, "w:fill") && !/^(auto|FFFFFF)$/i.test(attr(sh, "w:fill")!)) st.bg = `#${attr(sh, "w:fill")}`;
  const va = kid(rPr, "w:vertAlign"); if (va) st.va = val(va) === "superscript" ? "sup" : val(va) === "subscript" ? "sub" : undefined;
  return st;
}
function styleChain(ctx: Ctx, id: string | null, kind: "rPr" | "pPr"): Element[] {
  const out: Element[] = [];
  let cur = id, n = 0;
  while (cur && ctx.styles[cur] && n++ < 10) { const e = ctx.styles[cur][kind]; if (e) out.unshift(e); cur = ctx.styles[cur].based || null; }
  return out;
}
function wrapRun(text: string, st: RunStyle) {
  let h = esc(text).replace(/\t/g, "&emsp;&emsp;");
  const css: string[] = [];
  if (st.color) css.push(`color:${st.color}`);
  if (st.size) css.push(`font-size:${st.size}pt`);
  if (st.font) css.push(`font-family:'${st.font.replace(/'/g, "")}'`);
  if (css.length) h = `<span style="${css.join(";")}">${h}</span>`;
  if (st.bg) h = `<mark data-color="${st.bg}" style="background-color:${st.bg}">${h}</mark>`;
  if (st.va) h = `<${st.va}>${h}</${st.va}>`;
  if (st.s) h = `<s>${h}</s>`;
  if (st.u) h = `<u>${h}</u>`;
  if (st.i) h = `<em>${h}</em>`;
  if (st.b) h = `<strong>${h}</strong>`;
  return h;
}
/** 문단 → { html(안쪽), pageBreakBefore/After } */
function runsHtml(ctx: Ctx, p: Element, base: RunStyle, out: { breaks: number }): string {
  let h = "";
  let comment: { id: string } | null = null;
  const walk = (el: Element) => {
    for (const c of kids(el)) {
      const t = c.tagName;
      if (t === "w:r") {
        const st = runStyleOf(kid(c, "w:rPr"), { ...base, ...runStyleOf(null) });
        const rStyle = val(kid(kid(c, "w:rPr"), "w:rStyle"));
        let st2 = st;
        if (rStyle) { for (const e of styleChain(ctx, rStyle, "rPr")) st2 = runStyleOf(e, st2); st2 = runStyleOf(kid(c, "w:rPr"), st2); }
        for (const x of kids(c)) {
          const xt = x.tagName;
          if (xt === "w:t") { const tx = x.textContent || ""; h += comment ? `<span data-comment="${comment.id}" data-text="${esc(ctx.comments[comment.id]?.text || "")}" data-author="${esc(ctx.comments[comment.id]?.author || "")}">${wrapRun(tx, st2)}</span>` : wrapRun(tx, st2); }
          else if (xt === "w:tab") h += "&emsp;&emsp;";
          else if (xt === "w:br" || xt === "w:cr") { if (attr(x, "w:type") === "page") { out.breaks++; h += "\u0000PB\u0000"; } else h += "<br>"; }
          else if (xt === "w:drawing" || xt === "w:pict") {
            const blip = x.getElementsByTagName("a:blip")[0] || x.getElementsByTagName("v:imagedata")[0];
            const rid = blip ? attr(blip, "r:embed") || attr(blip, "r:id") : null;
            const ext = x.getElementsByTagName("wp:extent")[0];
            const w = ext ? Math.round(Number(attr(ext, "cx")) / 9525) : 0, hh = ext ? Math.round(Number(attr(ext, "cy")) / 9525) : 0;
            if (rid && ctx.media[rid]) h += `\u0000IMG\u0000${ctx.media[rid]}\u0000${w}\u0000${hh}\u0000`;
          } else if (xt === "w:footnoteReference" || xt === "w:endnoteReference") {
            const tx = ctx.foot[attr(x, "w:id") || ""] || "";
            h += `<sup data-footnote="1" data-text="${esc(tx)}">*</sup>`;
          } else if (xt === "w:sym") h += esc(String.fromCharCode(parseInt(attr(x, "w:char") || "20", 16) & 0xff ? parseInt(attr(x, "w:char") || "20", 16) : 32));
        }
      } else if (t === "w:hyperlink") {
        const rid = attr(c, "r:id");
        const href = rid && ctx.rels[rid] ? ctx.rels[rid].target : attr(c, "w:anchor") ? `#${attr(c, "w:anchor")}` : "";
        const before = h; h = "";
        walk(c);
        h = before + (href ? `<a href="${esc(href)}">${h}</a>` : h);
      } else if (t === "w:commentRangeStart") comment = { id: attr(c, "w:id") || "" };
      else if (t === "w:commentRangeEnd") comment = null;
      else if (t === "w:smartTag" || t === "w:fldSimple" || t === "w:ins" || t === "w:sdt" || t === "w:sdtContent" || t === "w:customXml") walk(t === "w:sdt" ? kid(c, "w:sdtContent") || c : c);
    }
  };
  walk(p);
  return h;
}
function paraHtml(ctx: Ctx, p: Element): { html: string; list?: { fmt: string; lvl: number } } {
  const pPr = kid(p, "w:pPr");
  const sid = val(kid(pPr, "w:pStyle"));
  const sname = (sid && ctx.styles[sid]?.name) || "";
  // 스타일 상속 — 글자 기본값 · 문단 기본값
  let base: RunStyle = {};
  for (const e of styleChain(ctx, sid, "rPr")) base = runStyleOf(e, base);
  base = runStyleOf(kid(pPr, "w:rPr") ? null : null, base);
  const pp = [...(ctx.defPPr ? [ctx.defPPr] : []), ...styleChain(ctx, sid, "pPr"), ...(pPr ? [pPr] : [])];
  const pick = (tag: string) => { let r: Element | null = null; for (const e of pp) { const x = kid(e, tag); if (x) r = x; } return r; };
  // 제목
  let level = 0;
  const hm = /^heading\s?(\d)$/i.exec(sname) || /^Heading(\d)$/.exec(sid || "") || /^제목\s?(\d)$/.exec(sname);
  if (hm) level = Math.min(6, Number(hm[1]));
  else if (/^(title|제목)$/i.test(sname) || sid === "Title") level = 1;
  const ol = pick("w:outlineLvl"); if (!level && ol && Number(val(ol)) < 6) level = Number(val(ol)) + 1;
  // 문단 서식
  const css: string[] = [], data: string[] = [];
  const jc = val(pick("w:jc"));
  const align = jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : jc === "both" || jc === "distribute" ? "justify" : "";
  if (align) css.push(`text-align:${align}`);
  const ind = pick("w:ind");
  if (ind) {
    const l = twToPt(attr(ind, "w:left") || attr(ind, "w:start")), r = twToPt(attr(ind, "w:right") || attr(ind, "w:end"));
    const fl = twToPt(attr(ind, "w:firstLine")), hg = twToPt(attr(ind, "w:hanging"));
    if (l) css.push(`margin-left:${l}pt`);
    if (r) css.push(`margin-right:${r}pt`);
    if (fl) css.push(`text-indent:${fl}pt`); else if (hg) css.push(`text-indent:-${hg}pt`);
  }
  const sp = pick("w:spacing");
  if (sp) {
    const b = twToPt(attr(sp, "w:before")), a = twToPt(attr(sp, "w:after"));
    if (b !== null) css.push(`padding-top:${b}pt`);
    if (a !== null) css.push(`padding-bottom:${a}pt`);
    const line = attr(sp, "w:line"), rule = attr(sp, "w:lineRule");
    // 워드 배수(글꼴 줄 높이 × n) → 편집기 배수(글자 크기 × n)
    if (line && (!rule || rule === "auto")) css.push(`line-height:${Math.round((Number(line) / 240) * wordLineRatio(base.font || ctx.defFont) * 100) / 100}`);
  }
  const bdr = pick("w:pBdr"); if (bdr && kids(bdr).length) data.push(`data-border="${kids(bdr).length >= 4 ? "box" : kid(bdr, "w:bottom") ? "bottom" : "top"}"`);
  const shd = pick("w:shd"); if (shd && attr(shd, "w:fill") && !/^(auto|FFFFFF)$/i.test(attr(shd, "w:fill")!)) data.push(`data-shade="#${attr(shd, "w:fill")}"`);
  const out = { breaks: 0 };
  let inner = runsHtml(ctx, p, base, out);
  const pbBefore = onOff(pick("w:pageBreakBefore"));
  // 목록
  const numPr = kid(pPr, "w:numPr") || pick("w:numPr");
  let list: { fmt: string; lvl: number } | undefined;
  if (numPr) {
    const nid = val(kid(numPr, "w:numId")), lvl = Number(val(kid(numPr, "w:ilvl")) || 0);
    const fmt = nid && nid !== "0" ? ctx.num[nid]?.[lvl] || "bullet" : "";
    if (fmt) list = { fmt, lvl };
  }
  const tag = level ? `h${level}` : "p";
  const attrs = `${css.length ? ` style="${css.join(";")}"` : ""}${data.length ? " " + data.join(" ") : ""}`;
  // 그림 · 페이지 나누기 조각으로 나눈다
  const parts = inner.split("\u0000PB\u0000");
  const html = parts.map((part, i) => {
    const imgs: string[] = [];
    part = part.replace(/\u0000IMG\u0000([^\u0000]*)\u0000(\d*)\u0000(\d*)\u0000/g, (_m, src, w, hh) => { imgs.push(`<img src="${src}"${Number(w) ? ` width="${w}"` : ""}${Number(hh) ? ` height="${hh}"` : ""} data-align="${align || "left"}">`); return ""; });
    const textPart = part.replace(/<[^>]+>/g, "").trim() || /<br>/.test(part) ? `<${tag}${attrs}>${part}</${tag}>` : imgs.length ? "" : `<${tag}${attrs}></${tag}>`;
    return (i > 0 ? `<div data-page-break="1"></div>` : "") + imgs.join("") + textPart;
  }).join("");
  inner = (pbBefore ? `<div data-page-break="1"></div>` : "") + html;
  return { html: inner, list };
}
function tableHtml(ctx: Ctx, tbl: Element): string {
  const grid = kids(kid(tbl, "w:tblGrid"), "w:gridCol").map((g) => Math.round(Number(attr(g, "w:w")) / 15) || 0);
  const rows = kids(tbl, "w:tr");
  // 세로 합치기 — 열 위치마다 시작 칸을 기억해 rowspan 을 늘린다
  type Cell = { html: string; colspan: number; rowspan: number; bg?: string; va?: string; widths: number[]; skip?: boolean; header?: boolean };
  const out: Cell[][] = [];
  const openAt: Record<number, Cell> = {};
  rows.forEach((tr, ri) => {
    const row: Cell[] = [];
    let col = 0;
    const isHead = !!kid(kid(tr, "w:trPr"), "w:tblHeader");
    for (const tc of kids(tr, "w:tc")) {
      const tcPr = kid(tc, "w:tcPr");
      const span = Number(val(kid(tcPr, "w:gridSpan")) || 1);
      const vm = kid(tcPr, "w:vMerge");
      const vmVal = vm ? val(vm) || "continue" : "";
      if (vmVal === "continue" && openAt[col]) { openAt[col].rowspan++; col += span; continue; }
      const shd = kid(tcPr, "w:shd");
      const fill = shd && attr(shd, "w:fill") && !/^(auto|FFFFFF)$/i.test(attr(shd, "w:fill")!) ? `#${attr(shd, "w:fill")}` : undefined;
      const va = val(kid(tcPr, "w:vAlign")) || undefined;
      const inner = bodyHtml(ctx, tc) || "<p></p>";
      const cell: Cell = { html: inner, colspan: span, rowspan: 1, bg: fill, va: va === "center" ? "middle" : va, widths: grid.slice(col, col + span), header: isHead };
      row.push(cell);
      if (vmVal === "restart") openAt[col] = cell; else delete openAt[col];
      col += span;
    }
    out.push(row);
    void ri;
  });
  const html = out.map((r) => `<tr>${r.map((c) => {
    const tag = c.header ? "th" : "td";
    const cw = c.widths.filter(Boolean).length === c.colspan ? ` colwidth="${c.widths.join(",")}"` : "";
    const st = [c.bg ? `background-color:${c.bg}` : "", c.va ? `vertical-align:${c.va}` : ""].filter(Boolean).join(";");
    return `<${tag}${c.colspan > 1 ? ` colspan="${c.colspan}"` : ""}${c.rowspan > 1 ? ` rowspan="${c.rowspan}"` : ""}${cw}${c.bg ? ` data-bg="${c.bg}"` : ""}${st ? ` style="${st}"` : ""}>${c.html}</${tag}>`;
  }).join("")}</tr>`).join("");
  return `<table>${html}</table>`;
}
/** 본문(또는 표 칸) 안의 블록들 → HTML (목록은 묶어서) */
function bodyHtml(ctx: Ctx, body: Element): string {
  let h = "";
  type L = { tag: "ul" | "ol"; lvl: number };
  const stack: L[] = [];
  const closeTo = (lvl: number) => { while (stack.length && stack[stack.length - 1].lvl >= lvl) { h += `</li></${stack.pop()!.tag}>`; } };
  const closeAll = () => closeTo(-1);
  const blocks: Element[] = [];
  const collect = (el: Element) => { for (const c of kids(el)) { if (c.tagName === "w:sdt") collect(kid(c, "w:sdtContent") || c); else if (c.tagName === "w:customXml") collect(c); else blocks.push(c); } };
  collect(body);
  for (const c of blocks) {
    if (c.tagName === "w:p") {
      const { html, list } = paraHtml(ctx, c);
      if (list) {
        const tag: "ul" | "ol" = list.fmt === "bullet" || list.fmt === "none" ? "ul" : "ol";
        const top = stack[stack.length - 1];
        if (!top || list.lvl > top.lvl) { h += `<${tag}><li>`; stack.push({ tag, lvl: list.lvl }); }
        else {
          closeTo(list.lvl + 1);
          const t2 = stack[stack.length - 1];
          if (t2 && t2.lvl === list.lvl && t2.tag === tag) h += `</li><li>`;
          else { closeTo(list.lvl); h += `<${tag}><li>`; stack.push({ tag, lvl: list.lvl }); }
        }
        h += html.replace(/^<h\d/, "<p").replace(/<\/h\d>$/, "</p>") || "<p></p>";
      } else { closeAll(); h += html; }
    } else if (c.tagName === "w:tbl") { closeAll(); h += tableHtml(ctx, c); }
  }
  closeAll();
  return h;
}
function hfText(doc: Document): string {
  const ps = Array.from(doc.getElementsByTagName("w:p"));
  return ps.map((p) => {
    let t = "", inField = false, instr = "";
    for (const r of Array.from(p.getElementsByTagName("*"))) {
      if (r.tagName === "w:fldChar") { const ty = attr(r, "w:fldCharType"); if (ty === "begin") { inField = true; instr = ""; } else if (ty === "separate" || ty === "end") { if (inField && /PAGE\b/.test(instr) && !/NUMPAGES/.test(instr)) t += "{PAGE}"; else if (inField && /NUMPAGES/.test(instr)) t += "{PAGES}"; inField = false; } }
      else if (r.tagName === "w:instrText") instr += r.textContent || "";
      else if (r.tagName === "w:fldSimple") { const ins = attr(r, "w:instr") || ""; t += /NUMPAGES/.test(ins) ? "{PAGES}" : /PAGE/.test(ins) ? "{PAGE}" : ""; }
      else if (r.tagName === "w:t" && !inField && !(r.parentElement?.parentElement?.tagName === "w:fldSimple")) t += r.textContent || "";
    }
    return t;
  }).filter((x) => x.trim()).join("\n");
}

export async function docxToDoc(bytes: Uint8Array): Promise<DocData & { html: string }> {
  const zip = await JSZip.loadAsync(bytes);
  const read = async (p: string) => (zip.file(p) ? await zip.file(p)!.async("string") : "");
  const docXml = await read("word/document.xml");
  if (!docXml) throw new Error("워드 문서(.docx)가 아니에요 — 본문(document.xml)이 없어요");
  const relsDoc = parseXml(await read("word/_rels/document.xml.rels"));
  const rels: Ctx["rels"] = {};
  for (const r of Array.from(relsDoc.getElementsByTagName("Relationship"))) rels[r.getAttribute("Id") || ""] = { target: r.getAttribute("Target") || "", type: r.getAttribute("Type") || "" };
  // 스타일
  const styles: Ctx["styles"] = {};
  const stDoc = parseXml(await read("word/styles.xml"));
  let defRun: RunStyle = {};
  const dd = stDoc.getElementsByTagName("w:docDefaults")[0];
  if (dd) defRun = runStyleOf(dd.getElementsByTagName("w:rPr")[0] || null);
  for (const s of Array.from(stDoc.getElementsByTagName("w:style"))) {
    const id = attr(s, "w:styleId") || "";
    styles[id] = { name: val(kid(s, "w:name")) || id, based: val(kid(s, "w:basedOn")) || undefined, rPr: kid(s, "w:rPr"), pPr: kid(s, "w:pPr"), type: attr(s, "w:type") || "" };
  }
  // 목록 번호
  const num: Ctx["num"] = {};
  const nDoc = parseXml(await read("word/numbering.xml"));
  const abs: Record<string, Record<number, string>> = {};
  for (const a of Array.from(nDoc.getElementsByTagName("w:abstractNum"))) {
    const m: Record<number, string> = {};
    for (const l of kids(a, "w:lvl")) m[Number(attr(l, "w:ilvl"))] = val(kid(l, "w:numFmt")) || "bullet";
    abs[attr(a, "w:abstractNumId") || ""] = m;
  }
  for (const n of Array.from(nDoc.getElementsByTagName("w:num"))) num[attr(n, "w:numId") || ""] = abs[val(kid(n, "w:abstractNumId")) || ""] || {};
  // 그림
  const media: Ctx["media"] = {};
  for (const [id, r] of Object.entries(rels)) {
    if (!/image/.test(r.type)) continue;
    const p = r.target.startsWith("/") ? r.target.slice(1) : `word/${r.target}`.replace(/word\/\.\.\//, "");
    const f = zip.file(p);
    if (f) media[id] = `data:${mimeOf(p)};base64,${b64(await f.async("uint8array"))}`;
  }
  // 각주 · 메모
  const foot: Ctx["foot"] = {};
  for (const fx of ["word/footnotes.xml", "word/endnotes.xml"]) {
    const fd = parseXml(await read(fx) || "<x/>");
    for (const f of Array.from(fd.getElementsByTagName("w:footnote")).concat(Array.from(fd.getElementsByTagName("w:endnote")))) {
      const id = attr(f, "w:id") || "";
      if (Number(id) <= 0) continue;
      foot[id] = Array.from(f.getElementsByTagName("w:t")).map((t) => t.textContent).join("").trim();
    }
  }
  const comments: Ctx["comments"] = {};
  const cd = parseXml(await read("word/comments.xml") || "<x/>");
  for (const c of Array.from(cd.getElementsByTagName("w:comment"))) comments[attr(c, "w:id") || ""] = { text: Array.from(c.getElementsByTagName("w:t")).map((t) => t.textContent).join(""), author: attr(c, "w:author") || "", at: attr(c, "w:date") || "" };
  const defPPr = dd ? dd.getElementsByTagName("w:pPr")[0] || null : null;
  const ctx: Ctx = { zip, rels, styles, num, foot, comments, media, defPPr, defFont: defRun.font };
  const dDoc = parseXml(docXml);
  const body = dDoc.getElementsByTagName("w:body")[0];
  const html = bodyHtml(ctx, body);
  // 용지 · 여백 · 머리글/바닥글 (마지막 구역)
  const page: PageSetup = { ...DEFAULT_PAGE, margin: { ...DEFAULT_PAGE.margin } };
  const sects = Array.from(dDoc.getElementsByTagName("w:sectPr"));
  const sect = sects[sects.length - 1];
  if (sect) {
    const sz = kid(sect, "w:pgSz");
    if (sz) {
      let w = Number(attr(sz, "w:w")) / TW_PER_MM, h = Number(attr(sz, "w:h")) / TW_PER_MM;
      const land = attr(sz, "w:orient") === "landscape" || w > h;
      if (land && w > h) [w, h] = [h, w];
      page.w = Math.round(w * 10) / 10; page.h = Math.round(h * 10) / 10; page.landscape = land;
      const pp = PAPERS.find((x) => Math.abs(x.w - page.w) < 2 && Math.abs(x.h - page.h) < 2);
      page.paper = pp ? pp.id : "custom";
    }
    const mg = kid(sect, "w:pgMar");
    if (mg) page.margin = { top: Math.abs(Number(attr(mg, "w:top"))) / TW_PER_MM, right: Number(attr(mg, "w:right")) / TW_PER_MM, bottom: Math.abs(Number(attr(mg, "w:bottom"))) / TW_PER_MM, left: Number(attr(mg, "w:left")) / TW_PER_MM };
    for (const [tag, key] of [["w:headerReference", "header"], ["w:footerReference", "footer"]] as const) {
      const refs = kids(sect, tag);
      const ref = refs.find((r) => attr(r, "w:type") === "default") || refs[0];
      const rid = attr(ref, "r:id");
      if (rid && rels[rid]) { const x = await read(`word/${rels[rid].target}`); if (x) page[key] = hfText(parseXml(x)); }
    }
  }
  const bg = dDoc.getElementsByTagName("w:background")[0];
  if (bg && attr(bg, "w:color") && !/^(auto|FFFFFF)$/i.test(attr(bg, "w:color")!)) page.pageColor = `#${attr(bg, "w:color")}`;
  return { page, json: { type: "doc" }, html, meta: { font: defRun.font, size: defRun.size } } as DocData & { html: string };
}

/* ───────────── 쓰기 ───────────── */
type W = {
  rels: string[]; media: { name: string; data: Uint8Array }[]; foot: string[]; comments: { id: number; text: string; author: string; at: string }[];
  relId: number; imgId: number; theme: (typeof THEMES)[number];
};
const xmlEsc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const hex = (c?: string | null) => { if (!c) return ""; const m = /^#?([0-9a-f]{6})$/i.exec(c.trim()); if (m) return m[1].toUpperCase(); const r = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return r ? [r[1], r[2], r[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("").toUpperCase() : ""; };
const ptOf = (s?: string | null) => { if (!s) return 0; const m = /([\d.]+)\s*(pt|px)?/.exec(String(s)); if (!m) return 0; return m[2] === "px" ? parseFloat(m[1]) * 0.75 : parseFloat(m[1]); };
const dataUrlBytes = (u: string) => { const m = /^data:([^;]+);base64,(.*)$/.exec(u); if (!m) return null; const bin = atob(m[2]); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return { mime: m[1], data: a }; };
async function imgBytes(src: string): Promise<{ mime: string; data: Uint8Array } | null> {
  const d = dataUrlBytes(src);
  if (d) return d;
  try { const r = await fetch(src); const b = await r.blob(); return { mime: b.type || "image/png", data: new Uint8Array(await b.arrayBuffer()) }; } catch { return null; }
}
const imgSize = (src: string) => new Promise<{ w: number; h: number }>((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: 300, h: 200 }); im.src = src; });

function rPrXml(marks: JSONContent["marks"]): string {
  const p: string[] = [];
  let font = "", size = 0, color = "", bg = "", va = "", ls = "";
  for (const m of marks || []) {
    if (m.type === "bold") p.push("<w:b/><w:bCs/>");
    else if (m.type === "italic") p.push("<w:i/><w:iCs/>");
    else if (m.type === "underline") p.push('<w:u w:val="single"/>');
    else if (m.type === "strike") p.push("<w:strike/>");
    else if (m.type === "superscript") va = "superscript";
    else if (m.type === "subscript") va = "subscript";
    else if (m.type === "highlight") bg = hex(m.attrs?.color) || "FFFF00";
    else if (m.type === "textStyle") {
      if (m.attrs?.fontFamily) font = String(m.attrs.fontFamily).split(",")[0].replace(/['"]/g, "").trim();
      if (m.attrs?.fontSize) size = ptOf(m.attrs.fontSize);
      if (m.attrs?.color) color = hex(m.attrs.color);
      if (m.attrs?.backgroundColor) bg = hex(m.attrs.backgroundColor);
      if (m.attrs?.letterSpacing) ls = String(m.attrs.letterSpacing);
    } else if (m.type === "link") p.push('<w:rStyle w:val="Hyperlink"/>');
  }
  const pre: string[] = [];
  if (p.some((x) => x.includes("rStyle"))) pre.push('<w:rStyle w:val="Hyperlink"/>');
  if (font) pre.push(`<w:rFonts w:ascii="${xmlEsc(font)}" w:hAnsi="${xmlEsc(font)}" w:eastAsia="${xmlEsc(font)}" w:cs="${xmlEsc(font)}"/>`);
  const order = [...pre, ...p.filter((x) => !x.includes("rStyle"))];
  if (color) order.push(`<w:color w:val="${color}"/>`);
  // 자간 (em → 1/20pt)
  if (ls) { const v = parseFloat(ls); if (Number.isFinite(v) && v) order.push(`<w:spacing w:val="${Math.round(/em/.test(ls) ? v * (size || 10) * 20 : v * 0.75 * 20)}"/>`); }
  if (size) order.push(`<w:sz w:val="${Math.round(size * 2)}"/><w:szCs w:val="${Math.round(size * 2)}"/>`);
  if (bg) order.push(`<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`);
  if (va) order.push(`<w:vertAlign w:val="${va}"/>`);
  return order.length ? `<w:rPr>${order.join("")}</w:rPr>` : "";
}
async function inlineXml(w: W, nodes: JSONContent[] | undefined): Promise<string> {
  let x = "";
  for (const n of nodes || []) {
    if (n.type === "text") {
      const rp = rPrXml(n.marks);
      const parts = (n.text || "").split("\t");
      let run = parts.map((t, i) => `${i ? "<w:tab/>" : ""}${t ? `<w:t xml:space="preserve">${xmlEsc(t)}</w:t>` : ""}`).join("");
      run = `<w:r>${rp}${run}</w:r>`;
      const link = n.marks?.find((m) => m.type === "link");
      const com = n.marks?.find((m) => m.type === "comment");
      if (com) {
        const id = w.comments.length;
        w.comments.push({ id, text: String(com.attrs?.text || ""), author: String(com.attrs?.author || "공실뉴스"), at: String(com.attrs?.at || new Date().toISOString()) });
        run = `<w:commentRangeStart w:id="${id}"/>${run}<w:commentRangeEnd w:id="${id}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`;
      }
      if (link?.attrs?.href) {
        const rid = `rId${++w.relId}`;
        w.rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlEsc(String(link.attrs.href))}" TargetMode="External"/>`);
        run = `<w:hyperlink r:id="${rid}">${run}</w:hyperlink>`;
      }
      x += run;
    } else if (n.type === "hardBreak") x += "<w:r><w:br/></w:r>";
    else if (n.type === "footnote") {
      const id = w.foot.length + 1;
      w.foot.push(String(n.attrs?.text || ""));
      x += `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
    } else if (n.type === "image") x += await imageRun(w, n);
  }
  return x;
}
async function imageRun(w: W, n: JSONContent): Promise<string> {
  const src = String(n.attrs?.src || "");
  const b = await imgBytes(src);
  if (!b) return "";
  const ext = /png/.test(b.mime) ? "png" : /gif/.test(b.mime) ? "gif" : "jpeg";
  const name = `image${++w.imgId}.${ext === "jpeg" ? "jpg" : ext}`;
  w.media.push({ name, data: b.data });
  const rid = `rId${++w.relId}`;
  w.rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
  let pw = Number(n.attrs?.width) || 0, ph = Number(n.attrs?.height) || 0;
  if (!pw || !ph) { const s = await imgSize(src); if (!pw && !ph) { pw = s.w; ph = s.h; } else if (!ph) ph = Math.round((pw * s.h) / s.w); else pw = Math.round((ph * s.w) / s.h); }
  const max = 600; if (pw > max) { ph = Math.round((ph * max) / pw); pw = max; }
  const cx = pw * 9525, cy = ph * 9525, id = w.imgId;
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="그림 ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}
/** 칸 안쪽 여백 "위 오른 아래 왼"(px) → w:tcMar (1/20pt) */
const tcMar = (pad: unknown) => {
  const v = String(pad || "").split(" ").map(Number);
  if (v.length !== 4 || !v.every((x) => Number.isFinite(x))) return "";
  const t = (px: number) => Math.round(px * 0.75 * 20);
  return `<w:tcMar><w:top w:w="${t(v[0])}" w:type="dxa"/><w:left w:w="${t(v[3])}" w:type="dxa"/><w:bottom w:w="${t(v[2])}" w:type="dxa"/><w:right w:w="${t(v[1])}" w:type="dxa"/></w:tcMar>`;
};
let lineRatio = 1.745; // 저장할 때 문서 기본 글꼴의 워드 줄 높이 비율 (docToDocx 가 정한다)
function pPrXml(n: JSONContent, extra = ""): string {
  const a = n.attrs || {};
  const p: string[] = [];
  if (n.type === "heading") p.push(`<w:pStyle w:val="Heading${Math.min(6, Number(a.level) || 1)}"/>`);
  if (a.keepNext) p.push("<w:keepNext/>");
  if (extra) p.push(extra);
  if (a.border) p.push(a.border === "box" ? '<w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="1" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="4" w:color="000000"/></w:pBdr>' : `<w:pBdr><w:${a.border} w:val="single" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>`);
  if (a.shading) p.push(`<w:shd w:val="clear" w:color="auto" w:fill="${hex(String(a.shading))}"/>`);
  const sp: string[] = [];
  if (a.spaceBefore !== null && a.spaceBefore !== undefined) sp.push(`w:before="${Math.round(Number(a.spaceBefore) * 20)}"`);
  if (a.spaceAfter !== null && a.spaceAfter !== undefined) sp.push(`w:after="${Math.round(Number(a.spaceAfter) * 20)}"`);
  // 워드는 1줄보다 작은 배수면 글자가 겹친다 → 최소 1줄
  if (a.lineHeight) sp.push(`w:line="${Math.max(240, Math.round((Number(a.lineHeight) * 240) / lineRatio))}" w:lineRule="auto"`);
  if (sp.length) p.push(`<w:spacing ${sp.join(" ")}/>`);
  const ind: string[] = [];
  if (a.indentLeft) ind.push(`w:left="${Math.round(Number(a.indentLeft) * 20)}"`);
  if (a.indentRight) ind.push(`w:right="${Math.round(Number(a.indentRight) * 20)}"`);
  if (a.firstLine) ind.push(Number(a.firstLine) > 0 ? `w:firstLine="${Math.round(Number(a.firstLine) * 20)}"` : `w:hanging="${Math.round(-Number(a.firstLine) * 20)}"`);
  if (ind.length) p.push(`<w:ind ${ind.join(" ")}/>`);
  const al = a.textAlign as string | undefined;
  if (al && al !== "left") p.push(`<w:jc w:val="${al === "justify" ? "both" : al}"/>`);
  // 문단 글자 크기 — 빈 줄 높이 (문단 기호의 글자 크기)
  if (a.fontSize) p.push(`<w:rPr><w:sz w:val="${Math.round(Number(a.fontSize) * 2)}"/><w:szCs w:val="${Math.round(Number(a.fontSize) * 2)}"/></w:rPr>`);
  return p.length ? `<w:pPr>${p.join("")}</w:pPr>` : "";
}
async function blocksXml(w: W, nodes: JSONContent[] | undefined, list?: { num: number; lvl: number }, pageWTw = 9026): Promise<string> {
  let x = "";
  for (const n of nodes || []) {
    switch (n.type) {
      case "paragraph": case "heading":
        x += `<w:p>${pPrXml(n, list ? `<w:numPr><w:ilvl w:val="${list.lvl}"/><w:numId w:val="${list.num}"/></w:numPr>` : "")}${await inlineXml(w, n.content)}</w:p>`;
        break;
      case "bulletList": case "orderedList": {
        const lvl = list ? list.lvl + 1 : 0;
        for (const li of n.content || []) {
          let first = true;
          for (const c of li.content || []) {
            if (c.type === "bulletList" || c.type === "orderedList") x += await blocksXml(w, [c], { num: list?.num || 1, lvl });
            else { x += await blocksXml(w, [c], first ? { num: n.type === "bulletList" ? 1 : 2, lvl: Math.min(8, lvl) } : undefined); first = false; }
          }
        }
        break;
      }
      case "taskList":
        for (const li of n.content || []) x += await blocksXml(w, (li.content || []).map((c, i) => (i === 0 && c.type === "paragraph" ? { ...c, content: [{ type: "text", text: li.attrs?.checked ? "☑ " : "☐ " }, ...(c.content || [])] } : c)));
        break;
      case "blockquote":
        x += await blocksXml(w, (n.content || []).map((c) => (c.type === "paragraph" ? { ...c, attrs: { ...(c.attrs || {}), indentLeft: (Number(c.attrs?.indentLeft) || 0) + 24 } } : c)));
        break;
      case "codeBlock":
        x += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">${xmlEsc((n.content || []).map((t) => t.text).join(""))}</w:t></w:r></w:p>`;
        break;
      case "horizontalRule":
        x += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr></w:pPr></w:p>';
        break;
      case "pageBreak":
        x += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        break;
      case "columnBreak":
        x += '<w:p><w:r><w:br w:type="column"/></w:r></w:p>';
        break;
      case "image": {
        const al = n.attrs?.align === "right" ? "right" : n.attrs?.align === "left" ? "left" : "center";
        x += `<w:p><w:pPr><w:jc w:val="${al}"/></w:pPr>${await imageRun(w, n)}</w:p>`;
        break;
      }
      case "table": x += await tableXml(w, n, pageWTw); break;
      case "columns": {
        // 단 → 테두리 없는 표 (한 줄 · 단 수만큼 칸)
        const cols = n.content || [];
        const cw = Math.floor(pageWTw / Math.max(1, cols.length));
        x += `<w:tbl><w:tblPr><w:tblW w:w="${pageWTw}" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${cols.map(() => `<w:gridCol w:w="${cw}"/>`).join("")}</w:tblGrid><w:tr>`;
        for (const c of cols) x += `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/></w:tcPr>${(await blocksXml(w, c.content, undefined, cw)) || "<w:p/>"}</w:tc>`;
        x += "</w:tr></w:tbl><w:p/>";
        break;
      }
      case "textBox": {
        const tw = Math.round((pageWTw * (Number(n.attrs?.width) || 60)) / 100);
        const bc = hex(n.attrs?.border) || "333333", fill = hex(n.attrs?.fill);
        const jc = n.attrs?.align === "center" ? "center" : n.attrs?.align === "right" ? "right" : "left";
        x += `<w:tbl><w:tblPr><w:tblW w:w="${tw}" w:type="dxa"/><w:jc w:val="${jc}"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="${bc}"/><w:left w:val="single" w:sz="6" w:color="${bc}"/><w:bottom w:val="single" w:sz="6" w:color="${bc}"/><w:right w:val="single" w:sz="6" w:color="${bc}"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${tw}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${tw}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ""}</w:tcPr>${(await blocksXml(w, n.content, undefined, tw)) || "<w:p/>"}</w:tc></w:tr></w:tbl><w:p/>`;
        break;
      }
      case "toc": {
        // 워드 목차 필드 (워드에서 F9 로 새로 고칠 수 있게) + 지금 제목들
        x += '<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr><w:r><w:t>목차</w:t></w:r></w:p>';
        x += '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>(목차 — 워드에서 F9 로 새로 고침)</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
        break;
      }
      default:
        if (n.content) x += await blocksXml(w, n.content, list, pageWTw);
    }
  }
  return x;
}
async function tableXml(w: W, t: JSONContent, pageWTw: number): Promise<string> {
  const rows = t.content || [];
  // 칸 자리 — rowspan 아래 칸은 vMerge continue 로 채운다
  let cols = 0;
  for (const c of rows[0]?.content || []) cols += Number(c.attrs?.colspan) || 1;
  cols = Math.max(1, cols);
  const widths: number[] = Array(cols).fill(0);
  for (const r of rows) { let ci = 0; for (const c of r.content || []) { const cw = c.attrs?.colwidth as number[] | null; const span = Number(c.attrs?.colspan) || 1; if (cw) cw.forEach((v, k) => { if (v && ci + k < cols && !widths[ci + k]) widths[ci + k] = v * 15; }); ci += span; } }
  const known = widths.reduce((a, b) => a + b, 0), unknown = widths.filter((v) => !v).length;
  const rest = Math.max(600, (pageWTw - known) / Math.max(1, unknown));
  const grid = widths.map((v) => Math.round(v || rest));
  const occupied: Record<string, { left: number; span: number; bg: string }> = {}; // "row:col" → 위 칸에서 내려온 합치기
  let x = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${grid.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid.map((v) => `<w:gridCol w:w="${v}"/>`).join("")}</w:tblGrid>`;
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri];
    const head = (r.content || []).every((c) => c.type === "tableHeader");
    x += `<w:tr>${head && ri === 0 ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}`;
    let ci = 0;
    const cells = [...(r.content || [])];
    const emitCont = () => {
      while (occupied[`${ri}:${ci}`]) {
        const o = occupied[`${ri}:${ci}`];
        const cw = grid.slice(ci, ci + o.span).reduce((a, b) => a + b, 0);
        x += `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/>${o.span > 1 ? `<w:gridSpan w:val="${o.span}"/>` : ""}<w:vMerge/>${o.bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.bg}"/>` : ""}</w:tcPr><w:p/></w:tc>`;
        ci += o.span;
      }
    };
    for (const c of cells) {
      emitCont();
      const span = Number(c.attrs?.colspan) || 1, rs = Number(c.attrs?.rowspan) || 1;
      const bg = hex(c.attrs?.backgroundColor);
      const cw = grid.slice(ci, ci + span).reduce((a, b) => a + b, 0);
      const va = c.attrs?.verticalAlign === "middle" ? "center" : c.attrs?.verticalAlign === "bottom" ? "bottom" : "";
      for (let k = 1; k < rs; k++) occupied[`${ri + k}:${ci}`] = { left: ci, span, bg };
      const inner = (await blocksXml(w, c.content, undefined, cw)) || "<w:p/>";
      x += `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${rs > 1 ? '<w:vMerge w:val="restart"/>' : ""}${bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>` : ""}${tcMar(c.attrs?.pad)}${va ? `<w:vAlign w:val="${va}"/>` : ""}</w:tcPr>${/<w:p[ >]|<w:p\/>/.test(inner.slice(-200)) ? inner : inner + "<w:p/>"}</w:tc>`;
      ci += span;
    }
    emitCont();
    x += "</w:tr>";
  }
  return x + "</w:tbl><w:p/>";
}
function hfXml(kind: "hdr" | "ftr", text: string, align: string): string {
  const ns = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;
  const paras = text.split("\n").map((line) => {
    const parts = line.split(/(\{PAGE\}|\{PAGES\})/);
    const runs = parts.map((p) => (p === "{PAGE}" ? '<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>' : p === "{PAGES}" ? '<w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple>' : p ? `<w:r><w:t xml:space="preserve">${xmlEsc(p)}</w:t></w:r>` : "")).join("");
    return `<w:p><w:pPr><w:pStyle w:val="${kind === "hdr" ? "Header" : "Footer"}"/><w:jc w:val="${align}"/></w:pPr>${runs}</w:p>`;
  }).join("") || "<w:p/>";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${kind} ${ns}>${paras}</w:${kind}>`;
}

export async function docToDocx(data: DocData): Promise<Uint8Array> {
  const { page, json } = data;
  const theme = THEMES.find((t) => t.id === page.theme) || THEMES[0];
  const w: W = { rels: [], media: [], foot: [], comments: [], relId: 10, imgId: 0, theme };
  lineRatio = wordLineRatio((data.meta as { font?: string } | undefined)?.font || theme.body);
  const pw = page.landscape ? page.h : page.w, ph = page.landscape ? page.w : page.h;
  const contentTw = Math.round((pw - page.margin.left - page.margin.right) * TW_PER_MM);
  const body = await blocksXml(w, json.content, undefined, contentTw);
  // 머리글 · 바닥글 (쪽 번호 포함)
  let header = page.header, footer = page.footer;
  const hasTok = /\{PAGE\}/.test(header + footer); // 머리글·바닥글에 쪽 번호가 있으면 따로 넣지 않는다 (편집기 화면과 같게)
  if (!hasTok && page.pageNumber.startsWith("bottom")) footer = footer ? `${footer}\n{PAGE}` : "{PAGE}";
  if (!hasTok && page.pageNumber.startsWith("top")) header = header ? `${header}\n{PAGE}` : "{PAGE}";
  const fAlign = page.pageNumber === "bottom-right" ? "right" : page.footerAlign === "left" ? "left" : page.footerAlign === "right" ? "right" : "center";
  const hAlign = page.pageNumber === "top-right" ? "right" : page.headerAlign === "left" ? "left" : page.headerAlign === "right" ? "right" : "center";
  const hasH = !!header.trim(), hasF = !!footer.trim();
  const tw = (mm: number) => Math.round(mm * TW_PER_MM);
  const sect = `<w:sectPr>${hasH ? '<w:headerReference w:type="default" r:id="rId8"/>' : ""}${hasF ? '<w:footerReference w:type="default" r:id="rId9"/>' : ""}<w:pgSz w:w="${tw(pw)}" w:h="${tw(ph)}"${page.landscape ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${tw(page.margin.top)}" w:right="${tw(page.margin.right)}" w:bottom="${tw(page.margin.bottom)}" w:left="${tw(page.margin.left)}" w:header="${tw(12.5)}" w:footer="${tw(12.5)}" w:gutter="0"/>${page.pageBorder ? `<w:pgBorders w:offsetFrom="page"><w:top w:val="single" w:sz="8" w:space="24" w:color="${hex(page.pageBorder)}"/><w:left w:val="single" w:sz="8" w:space="24" w:color="${hex(page.pageBorder)}"/><w:bottom w:val="single" w:sz="8" w:space="24" w:color="${hex(page.pageBorder)}"/><w:right w:val="single" w:sz="8" w:space="24" w:color="${hex(page.pageBorder)}"/></w:pgBorders>` : ""}<w:cols w:space="425"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
  const NS = 'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const bgXml = page.pageColor ? `<w:background w:color="${hex(page.pageColor)}"/>` : "";
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}>${bgXml}<w:body>${body || "<w:p/>"}${sect}</w:body></w:document>`;

  const font = theme.body;
  const hc = hex(theme.color) || "1F3864";
  const heading = (n: number, sz: number) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80" w:line="${Math.max(240, Math.round((1.35 * 240) / lineRatio))}" w:lineRule="auto"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:rFonts w:ascii="${xmlEsc(theme.head)}" w:hAnsi="${xmlEsc(theme.head)}" w:eastAsia="${xmlEsc(theme.head)}"/><w:b/><w:color w:val="${hc}"/><w:sz w:val="${sz * 2}"/><w:szCs w:val="${sz * 2}"/></w:rPr></w:style>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${xmlEsc(font)}" w:hAnsi="${xmlEsc(font)}" w:eastAsia="${xmlEsc(font)}" w:cs="${xmlEsc(font)}"/><w:sz w:val="${Math.round((data.meta as { size?: number } | undefined)?.size ? Number((data.meta as { size?: number }).size) * 2 : 22)}"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="${Math.max(240, Math.round((1.6 * 240) / lineRatio))}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
    + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`
    + heading(1, theme.h1) + heading(2, theme.h2) + heading(3, theme.h3) + heading(4, 12) + heading(5, 11) + heading(6, 11)
    + `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:sz w:val="56"/></w:rPr></w:style>`
    + `<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr></w:style>`
    + `<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Heading1"/><w:next w:val="Normal"/></w:style>`
    + `<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="800"/></w:pPr></w:style>`
    + `<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>`
    + `<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>`
    + `<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/><w:rPr><w:sz w:val="16"/></w:rPr></w:style>`
    + `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>`
    + `<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>`
    + `</w:styles>`;
  const lvl = (i: number, fmt: string, text: string) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${400 * (i + 1)}" w:hanging="400"/></w:pPr>${fmt === "bullet" ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>' : ""}</w:lvl>`;
  const bullets = ["", "o", ""];
  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`
    + `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${Array.from({ length: 9 }, (_, i) => lvl(i, "bullet", bullets[i % 3]).replace('w:ascii="Symbol" w:hAnsi="Symbol"', i % 3 === 1 ? 'w:ascii="Courier New" w:hAnsi="Courier New"' : i % 3 === 2 ? 'w:ascii="Wingdings" w:hAnsi="Wingdings"' : 'w:ascii="Symbol" w:hAnsi="Symbol"')).join("")}</w:abstractNum>`
    + `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${Array.from({ length: 9 }, (_, i) => lvl(i, ["decimal", "ganada", "lowerRoman"][i % 3], `%${i + 1}.`)).join("")}</w:abstractNum>`
    + `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`;
  const footXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${w.foot.map((t, i) => `<w:footnote w:id="${i + 1}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${xmlEsc(t)}</w:t></w:r></w:p></w:footnote>`).join("")}</w:footnotes>`;
  const comXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${w.comments.map((c) => `<w:comment w:id="${c.id}" w:author="${xmlEsc(c.author)}" w:date="${xmlEsc(c.at)}" w:initials="${xmlEsc(c.author.slice(0, 2))}"><w:p><w:r><w:t xml:space="preserve">${xmlEsc(c.text)}</w:t></w:r></w:p></w:comment>`).join("")}</w:comments>`;
  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${page.pageColor ? "<w:displayBackgroundShape/>" : ""}<w:defaultTabStop w:val="800"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    + `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`
    + `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>`
    + `<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>`
    + (w.comments.length ? `<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>` : "")
    + (hasH ? `<Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>` : "")
    + (hasF ? `<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` : "")
    + w.rels.join("") + `</Relationships>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>`
    + `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>`
    + (w.comments.length ? `<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>` : "")
    + (hasH ? `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>` : "")
    + (hasF ? `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` : "")
    + `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const zip = new JSZip();
  // 폴더 항목(word/ 같은)은 넣지 않는다 — 한글·워드가 까다롭게 볼 때가 있다
  const put = (n: string, d: string | Uint8Array, o: JSZip.JSZipFileOptions = {}) => zip.file(n, d, { createFolders: false, ...o });
  put("[Content_Types].xml", ct);
  put("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  put("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(data.meta?.title || "")}</dc:title><dc:creator>공실스튜디오</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  put("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>공실스튜디오</Application></Properties>`);
  put("word/document.xml", docXml);
  put("word/styles.xml", stylesXml);
  put("word/numbering.xml", numberingXml);
  put("word/settings.xml", settingsXml);
  put("word/footnotes.xml", footXml);
  if (w.comments.length) put("word/comments.xml", comXml);
  if (hasH) put("word/header1.xml", hfXml("hdr", header, hAlign));
  if (hasF) put("word/footer1.xml", hfXml("ftr", footer, fAlign));
  put("word/_rels/document.xml.rels", docRels);
  for (const m of w.media) put(`word/media/${m.name}`, m.data);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
