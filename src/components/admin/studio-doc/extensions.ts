// 문서편집 — 편집기(TipTap) 확장: 문단 서식(들여쓰기·간격·줄 간격·테두리·음영) · 페이지 나누기 · 표 칸 색 ·
//  그림 정렬·크기 · 텍스트 상자 · 단 · 목차 · 각주 · 메모 · 찾기 · 쪽 나누기 화면(워드처럼 A4 종이가 한 장씩)
import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { TableCell as BaseCell, TableHeader as BaseHeader } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import type {} from "@tiptap/extension-text-align";


/* ── 단위 ── 문단 길이는 pt (워드와 같은 단위), 화면은 96dpi px */
export const PT = 96 / 72;
export const MM = 96 / 25.4;
const pt = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const num = (s: string | null | undefined) => {
  if (!s) return null;
  const m = /([-\d.]+)\s*(pt|px|mm|cm|em)?/.exec(s);
  if (!m) return null;
  const v = parseFloat(m[1]);
  const u = m[2] || "px";
  return u === "pt" ? v : u === "px" ? v / PT : u === "mm" ? (v * MM) / PT : u === "cm" ? (v * 10 * MM) / PT : u === "em" ? v * 11 : v;
};

/** 문단·제목 공통 속성 — 왼쪽/오른쪽 들여쓰기, 첫 줄, 앞/뒤 간격(pt), 줄 간격(배수), 테두리, 음영, 정렬은 TextAlign */
export const ParagraphFormat = Extension.create({
  name: "paragraphFormat",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        indentLeft: { default: null, parseHTML: (el) => num(el.style.marginLeft) ?? num(el.getAttribute("data-il")), renderHTML: (a) => (pt(a.indentLeft) ? { style: `margin-left:${a.indentLeft}pt`, "data-il": a.indentLeft } : {}) },
        indentRight: { default: null, parseHTML: (el) => num(el.style.marginRight), renderHTML: (a) => (pt(a.indentRight) ? { style: `margin-right:${a.indentRight}pt` } : {}) },
        firstLine: { default: null, parseHTML: (el) => num(el.style.textIndent), renderHTML: (a) => (pt(a.firstLine) !== null && a.firstLine !== 0 ? { style: `text-indent:${a.firstLine}pt` } : {}) },
        spaceBefore: { default: null, parseHTML: (el) => num(el.style.paddingTop) ?? num(el.getAttribute("data-sb")), renderHTML: (a) => (pt(a.spaceBefore) !== null ? { style: `padding-top:${a.spaceBefore}pt`, "data-sb": a.spaceBefore } : {}) },
        spaceAfter: { default: null, parseHTML: (el) => num(el.style.paddingBottom) ?? num(el.getAttribute("data-sa")), renderHTML: (a) => (pt(a.spaceAfter) !== null ? { style: `padding-bottom:${a.spaceAfter}pt`, "data-sa": a.spaceAfter } : {}) },
        lineHeight: {
          default: null,
          parseHTML: (el) => { const v = el.style.lineHeight; return v && /^[\d.]+$/.test(v) ? parseFloat(v) : null; },
          // 한글 방식(hwpLine) — 늘린 간격을 줄 사이에만: 첫 줄 위·끝 줄 아래의 반쪽 간격을 빼서 한 줄 문단이 글자 높이만 차지하게
          renderHTML: (a) => {
            if (!pt(a.lineHeight)) return {};
            const lh = Number(a.lineHeight);
            if (a.hwpLine && lh > 1) { const m = Math.round(((lh - 1) / 2) * 1000) / 1000; return { style: `line-height:${lh};margin-top:-${m}em;margin-bottom:-${m}em` }; }
            return { style: `line-height:${lh}` };
          },
        },
        // 글자 단위 줄 나눔 (한글 서식) — 기본은 낱말(어절) 단위
        breakAll: { default: null, parseHTML: (el) => (el.style.wordBreak === "break-all" ? true : null), renderHTML: (a) => (a.breakAll ? { style: "word-break:break-all" } : {}) },
        hwpLine: { default: null, parseHTML: (el) => (el.getAttribute("data-hl") ? true : null), renderHTML: (a) => (a.hwpLine ? { "data-hl": "1" } : {}) },
        border: { default: null, parseHTML: (el) => el.getAttribute("data-border") || null, renderHTML: (a) => (a.border ? { "data-border": a.border, style: `border:${a.border === "box" ? "1px solid #000" : "0"};${a.border === "bottom" ? "border-bottom:1px solid #000;" : ""}${a.border === "top" ? "border-top:1px solid #000;" : ""}padding-left:4pt;padding-right:4pt` } : {}) },
        shading: { default: null, parseHTML: (el) => el.getAttribute("data-shade") || null, renderHTML: (a) => (a.shading ? { "data-shade": a.shading, style: `background:${a.shading}` } : {}) },
        keepNext: { default: null, parseHTML: (el) => (el.getAttribute("data-keep") ? true : null), renderHTML: (a) => (a.keepNext ? { "data-keep": "1" } : {}) },
        comment: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
        // 문단 글자 크기(pt) — 빈 줄의 높이가 원본 서식과 같게 (한글·워드에서 연 문서)
        fontSize: { default: null, parseHTML: (el) => (el.style.fontSize ? num(el.style.fontSize) : null), renderHTML: (a) => (pt(a.fontSize) ? { style: `font-size:${a.fontSize}pt` } : {}) },
      },
    }];
  },
  addCommands() {
    const each = (fn: (attrs: Record<string, unknown>) => Record<string, unknown>) => ({ state, tr, dispatch }: { state: import("@tiptap/pm/state").EditorState; tr: import("@tiptap/pm/state").Transaction; dispatch?: (tr: import("@tiptap/pm/state").Transaction) => void }) => {
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (n, pos) => {
        if (n.type.name !== "paragraph" && n.type.name !== "heading") return;
        tr.setNodeMarkup(pos, undefined, { ...n.attrs, ...fn(n.attrs) });
        changed = true;
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };
    return {
      setParagraphAttrs: (attrs: Record<string, unknown>) => each(() => attrs),
      indentMore: () => each((a) => ({ indentLeft: Math.min(400, (Number(a.indentLeft) || 0) + 20) })),
      indentLess: () => each((a) => ({ indentLeft: Math.max(0, (Number(a.indentLeft) || 0) - 20) || null })),
    } as never;
  },
  addKeyboardShortcuts() {
    return {
      // 워드처럼 Ctrl+E/L/R/J 정렬
      "Mod-e": () => this.editor.commands.setTextAlign("center"),
      "Mod-l": () => this.editor.commands.setTextAlign("left"),
      "Mod-r": () => this.editor.commands.setTextAlign("right"),
      "Mod-j": () => this.editor.commands.setTextAlign("justify"),
      "Mod-m": () => (this.editor.commands as unknown as { indentMore: () => boolean }).indentMore(),
      "Mod-Shift-m": () => (this.editor.commands as unknown as { indentLess: () => boolean }).indentLess(),
      "Mod-1": () => (this.editor.commands as unknown as { setParagraphAttrs: (a: object) => boolean }).setParagraphAttrs({ lineHeight: 1 }),
      "Mod-2": () => (this.editor.commands as unknown as { setParagraphAttrs: (a: object) => boolean }).setParagraphAttrs({ lineHeight: 2 }),
      "Mod-5": () => (this.editor.commands as unknown as { setParagraphAttrs: (a: object) => boolean }).setParagraphAttrs({ lineHeight: 1.5 }),
    };
  },
});

/** 페이지 나누기 (Ctrl+Enter) — 다음 내용을 다음 쪽 맨 위로 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() { return [{ tag: "div[data-page-break]" }, { tag: "hr[data-page-break]" }]; },
  renderHTML() { return ["div", { "data-page-break": "1", class: "gsd-pagebreak", contenteditable: "false" }, ["span", {}, "페이지 나누기"]]; },
  addCommands() {
    return { insertPageBreak: () => ({ chain }: { chain: () => import("@tiptap/core").ChainedCommands }) => chain().insertContent([{ type: "pageBreak" }, { type: "paragraph" }]).run() } as never;
  },
  addKeyboardShortcuts() {
    return { "Mod-Enter": () => (this.editor.commands as unknown as { insertPageBreak: () => boolean }).insertPageBreak() };
  },
});

/** 단 나누기 표시 (단 안에서 다음 단으로) — 단(columns) 블록 안에서만 의미 */
export const ColumnBreak = Node.create({
  name: "columnBreak",
  group: "block",
  atom: true,
  parseHTML() { return [{ tag: "div[data-col-break]" }]; },
  renderHTML() { return ["div", { "data-col-break": "1", class: "gsd-colbreak", contenteditable: "false" }, ["span", {}, "단 나누기"]]; },
});

/** 단 — 두·세 단으로 나눈 칸 (안의 단마다 따로 쓰기) */
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  isolating: true,
  addAttributes() { return { count: { default: 2, parseHTML: (el) => Number(el.getAttribute("data-count")) || 2 } }; },
  parseHTML() { return [{ tag: "div[data-columns]" }]; },
  renderHTML({ node, HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-columns": "1", "data-count": node.attrs.count, class: "gsd-columns", style: `grid-template-columns:repeat(${node.attrs.count},1fr)` }), 0]; },
  addCommands() {
    return {
      insertColumns: (count: number) => ({ chain }: { chain: () => import("@tiptap/core").ChainedCommands }) =>
        chain().insertContent({ type: "columns", attrs: { count }, content: Array.from({ length: count }, () => ({ type: "column", content: [{ type: "paragraph" }] })) }).run(),
    } as never;
  },
});
export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML() { return [{ tag: "div[data-column]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-column": "1", class: "gsd-column" }), 0]; },
});

/** 텍스트 상자 — 테두리가 있는 글 칸 (안에 문단 여러 개) */
export const TextBox = Node.create({
  name: "textBox",
  group: "block",
  content: "block+",
  isolating: true,
  addAttributes() {
    return {
      width: { default: 60, parseHTML: (el) => Number(el.getAttribute("data-w")) || 60 }, // 쪽 너비 %
      align: { default: "left", parseHTML: (el) => el.getAttribute("data-align") || "left" },
      border: { default: "#333333", parseHTML: (el) => el.getAttribute("data-bc") || "#333333" },
      fill: { default: "", parseHTML: (el) => el.getAttribute("data-fill") || "" },
    };
  },
  parseHTML() { return [{ tag: "div[data-textbox]" }]; },
  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs;
    return ["div", mergeAttributes(HTMLAttributes, { "data-textbox": "1", "data-w": a.width, "data-align": a.align, "data-bc": a.border, "data-fill": a.fill, class: "gsd-textbox",
      style: `width:${a.width}%;border:1px solid ${a.border || "transparent"};background:${a.fill || "transparent"};${a.align === "center" ? "margin-left:auto;margin-right:auto;" : a.align === "right" ? "margin-left:auto;" : ""}` }), 0];
  },
  addCommands() {
    return { insertTextBox: () => ({ chain }: { chain: () => import("@tiptap/core").ChainedCommands }) => chain().insertContent({ type: "textBox", content: [{ type: "paragraph", content: [{ type: "text", text: "텍스트를 입력하세요" }] }] }).run() } as never;
  },
});

/** 목차 — 제목들을 모아 보여 준다 (그릴 때마다 지금 제목으로) */
export const TableOfContents = Node.create({
  name: "toc",
  group: "block",
  atom: true,
  parseHTML() { return [{ tag: "div[data-toc]" }]; },
  renderHTML() { return ["div", { "data-toc": "1", class: "gsd-toc" }]; },
  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement("div");
      dom.className = "gsd-toc";
      dom.setAttribute("data-toc", "1");
      dom.contentEditable = "false";
      const draw = () => {
        const items: { level: number; text: string }[] = [];
        editor.state.doc.descendants((n) => { if (n.type.name === "heading") items.push({ level: n.attrs.level, text: n.textContent }); });
        dom.innerHTML = `<div class="gsd-toc-title">목차</div>` + (items.length ? items.map((x) => `<div class="gsd-toc-row" style="padding-left:${(x.level - 1) * 16}px">${x.text.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;")) || "&nbsp;"}</div>`).join("") : `<div class="gsd-toc-row" style="color:#999">제목 1·제목 2 스타일을 쓴 문단이 여기에 모여요</div>`);
      };
      draw();
      const off = () => editor.off("update", draw);
      editor.on("update", draw);
      return { dom, destroy: off };
    };
  },
});

/** 각주 — 본문엔 작은 번호, 문서 끝 [각주] 칸에 내용 (워드 미주와 같은 자리) */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() { return { text: { default: "", parseHTML: (el) => el.getAttribute("data-text") || "" } }; },
  parseHTML() { return [{ tag: "sup[data-footnote]" }]; },
  renderHTML({ node }) { return ["sup", { "data-footnote": "1", "data-text": node.attrs.text, class: "gsd-footnote", title: node.attrs.text }, "*"]; },
});

/** 메모 — 글에 노란 칠 + 오른쪽 메모 칸 */
export const Comment = Mark.create({
  name: "comment",
  inclusive: false,
  addAttributes() {
    return {
      id: { default: "", parseHTML: (el) => el.getAttribute("data-comment") || "" },
      text: { default: "", parseHTML: (el) => el.getAttribute("data-text") || "" },
      author: { default: "", parseHTML: (el) => el.getAttribute("data-author") || "" },
      at: { default: "", parseHTML: (el) => el.getAttribute("data-at") || "" },
    };
  },
  parseHTML() { return [{ tag: "span[data-comment]" }]; },
  renderHTML({ HTMLAttributes, mark }) { return ["span", mergeAttributes(HTMLAttributes, { "data-comment": mark.attrs.id, "data-text": mark.attrs.text, "data-author": mark.attrs.author, "data-at": mark.attrs.at, class: "gsd-comment" }), 0]; },
});

/** 표 칸 — 칸 색 · 세로 정렬 · 테두리 굵기 */
const cellAttrs = {
  backgroundColor: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-bg") || el.style.backgroundColor || null, renderHTML: (a: Record<string, unknown>) => (a.backgroundColor ? { "data-bg": a.backgroundColor, style: `background-color:${a.backgroundColor}` } : {}) },
  verticalAlign: { default: null, parseHTML: (el: HTMLElement) => el.style.verticalAlign || null, renderHTML: (a: Record<string, unknown>) => (a.verticalAlign ? { style: `vertical-align:${a.verticalAlign}` } : {}) },
  borderColor: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-bc") || null, renderHTML: (a: Record<string, unknown>) => (a.borderColor ? { "data-bc": a.borderColor, style: `border-color:${a.borderColor}` } : {}) },
  // 칸 안쪽 여백 "위 오른 아래 왼"(px) — 한글 칸 여백 그대로
  // 최소 높이(px) — 한글 원본 줄 높이 (내용이 많으면 늘어남)
  minH: { default: null, parseHTML: (el: HTMLElement) => Number(el.getAttribute("data-h")) || null, renderHTML: (a: Record<string, unknown>) => (a.minH ? { "data-h": a.minH, style: `height:${a.minH}px` } : {}) },
  pad: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-pad") || null, renderHTML: (a: Record<string, unknown>) => (a.pad ? { "data-pad": a.pad, style: `padding:${String(a.pad).split(" ").map((v) => `${v}px`).join(" ")}` } : {}) },
};
/** 자간 — 글자 사이 간격(em). 한글 서식의 자간(-7% 등)을 그대로 */
export const LetterSpacing = Extension.create({
  name: "letterSpacing",
  addGlobalAttributes() {
    return [{ types: ["textStyle"], attributes: { letterSpacing: { default: null, parseHTML: (el) => el.style.letterSpacing || null, renderHTML: (a) => (a.letterSpacing ? { style: `letter-spacing:${a.letterSpacing}` } : {}) } } }];
  },
});
export const DocTableCell = BaseCell.extend({ addAttributes() { return { ...this.parent?.(), ...cellAttrs }; } });
export const DocTableHeader = BaseHeader.extend({ addAttributes() { return { ...this.parent?.(), ...cellAttrs }; } });

/** 그림 — 정렬(왼·가운데·오른) · 너비(px) */
export const DocImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: { default: "center", parseHTML: (el) => el.getAttribute("data-align") || "center", renderHTML: (a) => ({ "data-align": a.align }) },
      width: { default: null, parseHTML: (el) => Number(el.getAttribute("width")) || null, renderHTML: (a) => (a.width ? { width: a.width } : {}) },
      height: { default: null, parseHTML: (el) => Number(el.getAttribute("height")) || null, renderHTML: (a) => (a.height ? { height: a.height } : {}) },
      frame: { default: null, parseHTML: (el) => el.getAttribute("data-frame") || null, renderHTML: (a) => (a.frame ? { "data-frame": a.frame } : {}) }, // 그림 스타일: line · gray · white · shadow · round
    };
  },
}).configure({ inline: false, allowBase64: true, resize: { enabled: true, minWidth: 40, minHeight: 40, alwaysPreserveAspectRatio: true } });

/* ── 찾기 · 바꾸기 — 찾은 곳 노랗게, 지금 것은 주황 ── */
export const findKey = new PluginKey<{ q: string; idx: number; hits: { from: number; to: number }[] }>("gsdFind");
export const Find = Extension.create({
  name: "find",
  addProseMirrorPlugins() {
    return [new Plugin({
      key: findKey,
      state: {
        init: () => ({ q: "", idx: 0, hits: [] as { from: number; to: number }[] }),
        apply(tr, v) {
          const m = tr.getMeta(findKey) as { q?: string; idx?: number } | undefined;
          const q = m?.q !== undefined ? m.q : v.q;
          if (!m && !tr.docChanged) return v;
          const hits: { from: number; to: number }[] = [];
          if (q) {
            const low = q.toLowerCase();
            tr.doc.descendants((n, pos) => {
              if (!n.isText || !n.text) return;
              const t = n.text.toLowerCase();
              let i = t.indexOf(low);
              while (i >= 0) { hits.push({ from: pos + i, to: pos + i + q.length }); i = t.indexOf(low, i + Math.max(1, q.length)); }
            });
          }
          const idx = m?.idx !== undefined ? m.idx : Math.min(v.idx, Math.max(0, hits.length - 1));
          return { q, idx, hits };
        },
      },
      props: {
        decorations(state) {
          const v = findKey.getState(state);
          if (!v || !v.hits.length) return null;
          return DecorationSet.create(state.doc, v.hits.map((h, i) => Decoration.inline(h.from, h.to, { class: i === v.idx ? "gsd-find-cur" : "gsd-find" })));
        },
      },
    })];
  },
});
/** 찾기 — 글 바꾸기·다음·바꾸기·모두 바꾸기 */
export function findSet(view: EditorView, q: string, idx = 0) {
  view.dispatch(view.state.tr.setMeta(findKey, { q, idx }));
  const v = findKey.getState(view.state);
  const h = v?.hits[v.idx];
  if (h) view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, h.from, h.to)).scrollIntoView());
  return v?.hits.length || 0;
}
export function findStep(view: EditorView, dir: 1 | -1) {
  const v = findKey.getState(view.state);
  if (!v || !v.hits.length) return 0;
  return findSet(view, v.q, (v.idx + dir + v.hits.length) % v.hits.length);
}
export function replaceCur(view: EditorView, rep: string) {
  const v = findKey.getState(view.state);
  const h = v?.hits[v.idx];
  if (!v || !h) return 0;
  view.dispatch(view.state.tr.insertText(rep, h.from, h.to));
  return findSet(view, v.q, v.idx);
}
export function replaceAll(view: EditorView, rep: string) {
  const v = findKey.getState(view.state);
  if (!v || !v.hits.length) return 0;
  let tr = view.state.tr;
  for (const h of [...v.hits].reverse()) tr = tr.insertText(rep, h.from, h.to);
  view.dispatch(tr);
  const n = v.hits.length;
  findSet(view, v.q, 0);
  return n;
}

/* ── 쪽 나누기 화면 ──
 *  글은 한 줄로 이어 쓰되, 맨 위 블록마다 그 쪽 글 칸 아래로 넘치면 앞에 빈 칸(위젯)을 넣어 다음 쪽 글 칸 맨 위로 민다.
 *  pageBreak 다음 블록은 늘 다음 쪽으로. 표는 줄마다 재서 넘치는 줄부터 다음 쪽으로 (빈 줄을 끼운다). 한 쪽보다 큰 덩어리는 걸쳐 둔다. */
export type PageGeom = { contentH: number; gap: number }; // 글 칸 높이 · 글 칸 사이 (아래 여백 + 쪽 사이 + 위 여백), px
export const pageKey = new PluginKey<{ pushes: Map<number, number>; pages: number }>("gsdPages");
export const Pagination = Extension.create<{ geom: () => PageGeom; onPages?: (n: number) => void }>({
  name: "pagination",
  addOptions() { return { geom: () => ({ contentH: 900, gap: 200 }), onPages: undefined }; },
  addProseMirrorPlugins() {
    const opts = this.options;
    return [new Plugin({
      key: pageKey,
      state: {
        init: () => ({ pushes: new Map<number, number>(), pages: 1 }),
        apply(tr, v) {
          const m = tr.getMeta(pageKey) as { pushes: Map<number, number>; pages: number } | undefined;
          if (m) return m;
          if (!tr.docChanged) return v;
          // 글이 바뀌면 자리를 옮겨 두고, 다시 재는 동안 그대로 쓴다
          const pushes = new Map<number, number>();
          v.pushes.forEach((h, pos) => { const np = tr.mapping.map(pos, -1); pushes.set(np, h); });
          return { pushes, pages: v.pages };
        },
      },
      props: {
        decorations(state) {
          const v = pageKey.getState(state);
          if (!v || !v.pushes.size) return null;
          const decos: Decoration[] = [];
          v.pushes.forEach((h, pos) => {
            if (h <= 0 || pos > state.doc.content.size) return;
            // 표 안(줄 사이)이면 빈 줄(tr)로, 아니면 빈 칸(div)으로
            const inTable = state.doc.resolve(pos).parent.type.name === "table";
            decos.push(Decoration.widget(pos, () => {
              if (inTable) {
                const tr = document.createElement("tr");
                tr.className = "gsd-push gsd-push-row";
                tr.contentEditable = "false";
                const td = document.createElement("td");
                td.colSpan = 1000;
                td.style.cssText = `height:${h}px;padding:0;border:0;background:transparent`;
                tr.appendChild(td);
                return tr;
              }
              const d = document.createElement("div"); d.className = "gsd-push"; d.style.height = `${h}px`; d.contentEditable = "false"; return d;
            }, { side: -1, key: `push-${pos}-${Math.round(h)}-${inTable ? "r" : "b"}`, ignoreSelection: true }));
          });
          return DecorationSet.create(state.doc, decos);
        },
      },
      view(view) {
        let raf = 0; // 창마다 따로 (편집기를 다시 만들면 예전 값이 남아 재기가 멈추던 것)
        const measure = () => {
          raf = 0;
          const { contentH, gap } = opts.geom();
          const period = contentH + gap;
          const prev = pageKey.getState(view.state);
          const root = view.dom as HTMLElement;
          const base = root.getBoundingClientRect().top;
          const zoom = root.getBoundingClientRect().height / Math.max(1, root.offsetHeight) || 1;
          const pushes = new Map<number, number>();
          let shift = 0; // 지금까지 넣은 빈 칸 높이 (새로 계산한 것)
          let oldShift = 0; // 지금 화면에 들어 있는 빈 칸 높이 (잰 자리에서 빼서 원래 자리를 구한다)
          let forceNext = false;
          let lastBottom = 0;
          // 잴 단위 — 보통 블록은 통째로, 표는 줄(행)마다 (워드·한글처럼 긴 표가 다음 쪽으로 이어지게)
          const units: { pos: number; rect: () => { top: number; height: number }; brk: boolean }[] = [];
          const rectOf = (els: HTMLElement[]) => () => {
            const a = els[0].getBoundingClientRect(), b = els[els.length - 1].getBoundingClientRect();
            return { top: a.top, height: b.bottom - a.top };
          };
          view.state.doc.forEach((node: PMNode, offset: number) => {
            const dom = view.nodeDOM(offset) as HTMLElement | null;
            if (!dom || !(dom instanceof HTMLElement)) return;
            if (node.type.name === "table" && node.childCount > 1) {
              // 합친 칸(rowspan)으로 이어진 줄들은 한 덩어리 — 쪽 경계에서 갈라지면 합친 칸이 빈 줄까지 늘어나 깨진다
              let group: { pos: number; els: HTMLElement[]; end: number } | null = null;
              node.forEach((row, rOff, i) => {
                const rowPos = offset + 1 + rOff;
                const rd = view.nodeDOM(rowPos) as HTMLElement | null;
                if (!(rd instanceof HTMLElement)) return;
                let end = i;
                row.forEach((cell) => { end = Math.max(end, i + (Number(cell.attrs.rowspan) || 1) - 1); });
                if (group && i <= group.end) { group.els.push(rd); group.end = Math.max(group.end, end); return; }
                if (group) units.push({ pos: group.pos, rect: rectOf(group.els), brk: false });
                group = { pos: i === 0 ? offset : rowPos, els: [rd], end }; // 첫 덩어리는 표 앞에서 민다
              });
              if (group) { const g = group as { pos: number; els: HTMLElement[] }; units.push({ pos: g.pos, rect: rectOf(g.els), brk: false }); }
            } else units.push({ pos: offset, rect: () => { const r = dom.getBoundingClientRect(); return { top: r.top, height: r.height }; }, brk: node.type.name === "pageBreak" });
          });
          for (const u of units) {
            const { pos } = u;
            oldShift += prev?.pushes.get(pos) || 0;
            const r = u.rect();
            const top = (r.top - base) / zoom - oldShift; // 빈 칸 없을 때 자리
            const h = r.height / zoom;
            let y = top + shift;
            const pageStart = Math.floor(y / period) * period;
            const inGap = y - pageStart > contentH; // 쪽 사이에 걸려 시작
            const over = y + h > pageStart + contentH;
            if (forceNext || inGap || (over && h <= contentH && y > pageStart + 1)) {
              const target = forceNext && !inGap && y - pageStart < 0.5 ? y : pageStart + period;
              const add = Math.max(0, target - y);
              if (add > 0.5) { pushes.set(pos, (pushes.get(pos) || 0) + add); shift += add; y += add; }
            }
            forceNext = u.brk;
            lastBottom = Math.max(lastBottom, y + h);
          }
          const pages = Math.max(1, Math.ceil((lastBottom + 1) / period));
          let same = prev && prev.pages === pages && prev.pushes.size === pushes.size;
          if (same && prev) pushes.forEach((h, p) => { if (Math.abs((prev.pushes.get(p) || 0) - h) > 1) same = false; });
          if (!same) view.dispatch(view.state.tr.setMeta(pageKey, { pushes, pages }).setMeta("addToHistory", false));
          opts.onPages?.(pages);
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
        schedule();
        const ro = new ResizeObserver(schedule);
        ro.observe(view.dom);
        const onLoad = (e: Event) => { if ((e.target as HTMLElement)?.tagName === "IMG") schedule(); };
        view.dom.addEventListener("load", onLoad, true);
        view.dom.addEventListener("gsd-remeasure", schedule); // 용지·여백이 바뀌면 다시
        return {
          update: (_v, prevState) => { if (prevState.doc !== view.state.doc || !pageKey.getState(prevState)) schedule(); },
          destroy: () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); raf = 0; view.dom.removeEventListener("load", onLoad, true); view.dom.removeEventListener("gsd-remeasure", schedule); },
        };
      },
    })];
  },
});

/** 목록 모양 — 글머리 기호(● ○ ■ ✓ ➢ ◆) · 번호(1. 가. a. A. i. I. ①) */
export const ListStyle = Extension.create({
  name: "listStyle",
  addGlobalAttributes() {
    return [
      { types: ["bulletList"], attributes: { bullet: { default: null, parseHTML: (el) => el.getAttribute("data-bullet") || null, renderHTML: (a) => (a.bullet ? { "data-bullet": a.bullet } : {}) } } },
      { types: ["orderedList"], attributes: { kind: { default: null, parseHTML: (el) => el.getAttribute("data-kind") || null, renderHTML: (a) => (a.kind ? { "data-kind": a.kind } : {}) } } },
    ];
  },
});
