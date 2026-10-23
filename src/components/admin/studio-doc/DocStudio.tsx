"use client";
// 문서편집 (공실마케팅 › 문서편집, 2026-10-22) — MS 워드와 같은 모양의 문서 편집기
//  열기·저장: 워드(.docx) · 한글(.hwpx · .hwp*) · 텍스트 · 웹 페이지   *.hwp 는 앱 안 변환기(Java)
//  내보내기: PDF · 그림(PNG·JPG, 쪽마다·이어 붙이기, 보통·고화질, 내 자료)   계획: docs/2026-10-22_doc_editor_plan.md
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily, FontSize, BackgroundColor } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  RiSave3Line, RiArrowGoBackLine, RiArrowGoForwardLine, RiSearchLine, RiArrowDownSLine, RiArrowUpSLine, RiCloseLine, RiBookReadLine,
  RiPagesFill, RiGlobalLine, RiSubtractLine, RiAddLine, RiChatNewLine, RiShareLine, RiFullscreenLine, RiPrinterLine,
} from "react-icons/ri";
import {
  ParagraphFormat, PageBreak, ColumnBreak, Columns, Column, TextBox, TableOfContents, Footnote, Comment, DocTableCell, DocTableHeader,
  DocImage, Find, Pagination, ListStyle, LetterSpacing, findSet, findStep, findKey, PT,
} from "./extensions";
import { DEFAULT_PAGE, THEMES, pageSize, datedTitle, type PageSetup, type DocData } from "./model";
import { RibbonBody, TABS, type TabName, type Ctl, type ViewMode } from "./Ribbon";
import Backstage, { type Recent, type SaveFmt, type PrintOpts } from "./Backstage";
import { DocDialog, type Extra, type ImgExport } from "./Dialogs";
import { DOC_CSS } from "./styles";
import { fitTables, cmd, painterApply, painterCancel, setThemeSizes, counts, headings, goTo, listComments, addComment, updateComment, growFont, curText, type CommentItem } from "./actions";
import { mdToHtml, textToHtml, htmlBody, docHtmlFile } from "./convert";
import { capturePages, stitch, canvasBytes, imagePdf, printHtml, browserPrint, download, type Geom } from "./print";
import { TEMPLATES, templatePage, type Template } from "./templates";

const MMPX = 96 / 25.4;
const DOC_EXTS = ["docx", "hwpx", "hwp"];
type FileRes = { path: string; name: string; bytes?: Uint8Array; as?: string; error?: string; code?: string };
type DocBridge = {
  open: () => Promise<FileRes | null>;
  read: (f: string) => Promise<FileRes>;
  pickImages: () => Promise<FileRes[]>;
  save: (o: { file?: string; name: string; ext: string; bytes?: Uint8Array; thumb?: string; ask?: boolean; files?: { name: string; bytes: Uint8Array }[] }) => Promise<{ path?: string; name?: string; canceled?: boolean; error?: string; code?: string; paths?: string[] }>;
  recent: () => Promise<Recent[]>;
  setDirty: (n: number) => Promise<boolean>;
  autosaveWrite: (o: { id: string; name: string; file?: string; json: unknown }) => Promise<boolean>;
  autosaveList: () => Promise<{ id: string; name: string; file: string; at: number }[]>;
  autosaveRead: (id: string) => Promise<{ id: string; name: string; file: string; json: { page: PageSetup; doc: unknown; base: { font: string; size: number }; ext: string } } | null>;
  autosaveClear: (id: string) => Promise<boolean>;
  pdf: (o: { html: string; wMm: number; hMm: number; origin?: string }) => Promise<{ bytes?: Uint8Array; error?: string }>;
  print: (o: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  libAdd: (o: { files: { name: string; bytes: Uint8Array }[] }) => Promise<{ count: number }>;
  ai: (o: { mode: string; text: string; request: string }) => Promise<{ text: string }>;
  javaStatus: () => Promise<{ ok: boolean; from?: string; version?: number; tool?: boolean }>;
  javaInstall: () => Promise<{ ok: boolean; error?: string }>;
  javaRemove: () => Promise<boolean>;
  onJavaProgress: (fn: (t: string, f: number) => void) => () => void;
};
const bridge = (): DocBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: { doc?: DocBridge } }).gongsilStudio?.doc ?? null) : null);
const toDataUrl = (bytes: Uint8Array, name: string) => {
  const ext = (name.split(".").pop() || "png").toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : ext === "bmp" ? "image/bmp" : "image/png";
  return new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(new Blob([bytes as BlobPart], { type: mime })); });
};
const fileToDataUrl = (f: File) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(f); });
const pickLocal = (accept: string, multiple = false) => new Promise<File[]>((res) => {
  const i = document.createElement("input");
  i.type = "file"; i.accept = accept; i.multiple = multiple;
  i.onchange = () => res([...(i.files || [])]);
  i.click();
});
const DEFAULT_KEY = "gsd_default";
const loadDefault = (): { theme?: string; font?: string; size?: number; margin?: PageSetup["margin"]; paper?: string; w?: number; h?: number } => { try { return JSON.parse(localStorage.getItem(DEFAULT_KEY) || "{}"); } catch { return {}; } };
const newId = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const parseRange = (s: string, max: number) => {
  const out = new Set<number>();
  for (const part of s.split(/[,\s]+/)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) continue;
    const a = Number(m[1]), b = Number(m[2] || m[1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) out.add(i - 1);
  }
  return [...out].sort((x, y) => x - y);
};

export default function DocStudio() {
  const isApp = typeof window !== "undefined" && Boolean(bridge());
  const def = useMemo(() => (typeof window === "undefined" ? {} : loadDefault()), []);
  const [page, setPageState] = useState<PageSetup>(() => ({ ...DEFAULT_PAGE, margin: { ...(def.margin || DEFAULT_PAGE.margin) }, theme: def.theme || DEFAULT_PAGE.theme, ...(def.paper ? { paper: def.paper, w: def.w || 210, h: def.h || 297 } : {}) }));
  const theme = THEMES.find((t) => t.id === page.theme) || THEMES[0];
  const [base, setBaseState] = useState<{ font: string; size: number }>(() => ({ font: def.font || theme.body, size: def.size || 10 }));
  const [title, setTitle] = useState(() => datedTitle());
  const [file, setFile] = useState("");
  const [ext, setExt] = useState("docx");
  const [dirty, setDirty] = useState(false);
  const foreignRef = useRef(false); // 밖에서 만든 한글·워드 파일을 연 것 — 처음 덮어쓸 때 한 번 묻는다
  const docId = useRef(newId());
  const [tab, setTab] = useState<TabName>("홈");
  const [ribbonOpen, setRibbonOpen] = useState(true);
  const [bs, setBs] = useState<null | "home" | "new" | "open" | "info" | "saveas" | "print" | "share" | "export">("home");
  const [dlg, setDlg] = useState<{ name: string; arg?: unknown } | null>(null);
  const [zoom, setZoomState] = useState(1);
  const [view, setViewState] = useState<ViewMode>("print");
  const [ruler, setRuler] = useState(false);
  const [nav, setNavState] = useState(false);
  const [marks, setMarks] = useState(false);
  const [grid, setGrid] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [painter, setPainterState] = useState(false);
  const [focus, setFocus] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [pages, setPages] = useState(1);
  const [curPage, setCurPage] = useState(1);
  const [, setTick] = useState(0);
  const [toast, setToast] = useState("");
  const [recent, setRecent] = useState<Recent[]>([]);
  const [recover, setRecover] = useState<{ id: string; name: string; file: string; at: number }[]>([]);
  const [editTitle, setEditTitle] = useState(false);
  const [webW, setWebW] = useState(900);
  const [fnPages, setFnPages] = useState<{ n: number; text: string }[][]>([]);
  const [activeCmt, setActiveCmt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const cleanRef = useRef<import("@tiptap/pm/model").Node | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((t: string, ms = 2600) => { setToast(t); if (toastT.current) clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), ms); }, []);

  // 쪽 크기 (px, 96dpi)
  const sz = pageSize(page);
  const pageW = sz.w * MMPX, pageH = sz.h * MMPX;
  const mt = page.margin.top * MMPX, mb = page.margin.bottom * MMPX, ml = page.margin.left * MMPX, mr = page.margin.right * MMPX;
  const GAP = view === "print" ? 24 : 0;
  const period = pageH + GAP;
  const geomRef = useRef({ contentH: pageH - mt - mb, gap: mb + GAP + mt });
  geomRef.current = view === "print" ? { contentH: Math.max(60, pageH - mt - mb), gap: mb + GAP + mt } : { contentH: 1e7, gap: 0 };
  const onPagesRef = useRef<(n: number) => void>(() => {});
  onPagesRef.current = (n: number) => setPages((p) => (p === n ? p : n));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, link: { openOnClick: false, autolink: true }, dropcursor: { color: "#2b579a", width: 2 }, undoRedo: { depth: 300 } }),
      TextStyle, Color, FontFamily, FontSize, BackgroundColor,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Subscript, Superscript,
      TableKit.configure({ table: { resizable: true, cellMinWidth: 6 }, tableCell: false, tableHeader: false }),
      DocTableCell, DocTableHeader, DocImage,
      CharacterCount, Placeholder.configure({ placeholder: "" }),
      ParagraphFormat, PageBreak, ColumnBreak, Columns, Column, TextBox, TableOfContents, Footnote, Comment, Find, ListStyle, LetterSpacing,
      Pagination.configure({ geom: () => geomRef.current, onPages: (n: number) => onPagesRef.current(n) }),
    ],
    content: "<p></p>",
    editorProps: {
      attributes: { spellcheck: "false", lang: "ko" },
      // 그림 붙여넣기·끌어 놓기 → 문서 안 그림(데이터)으로
      handlePaste: (_v, e) => {
        const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
        if (!files.length) return false;
        Promise.all(files.map(fileToDataUrl)).then((srcs) => edRef.current?.chain().focus().insertContent(srcs.map((src) => ({ type: "image", attrs: { src, align: "center" } }))).run());
        return true;
      },
      handleDrop: (v, e) => {
        const files = [...((e as DragEvent).dataTransfer?.files || [])];
        const imgs = files.filter((f) => f.type.startsWith("image/"));
        const docs = files.filter((f) => /\.(docx|hwpx|txt|md|html?)$/i.test(f.name));
        if (docs.length) { e.preventDefault(); docs[0].arrayBuffer().then((b) => loadRef.current(new Uint8Array(b), docs[0].name, "")); return true; }
        if (!imgs.length) return false;
        e.preventDefault();
        const pos = v.posAtCoords({ left: (e as DragEvent).clientX, top: (e as DragEvent).clientY })?.pos;
        Promise.all(imgs.map(fileToDataUrl)).then((srcs) => {
          const ch = edRef.current?.chain().focus();
          if (!ch) return;
          (pos !== undefined ? ch.insertContentAt(pos, srcs.map((src) => ({ type: "image", attrs: { src, align: "center" } }))) : ch.insertContent(srcs.map((src) => ({ type: "image", attrs: { src, align: "center" } })))).run();
        });
        return true;
      },
    },
    onCreate: ({ editor: e }) => { setTimeout(() => { cleanRef.current = e.state.doc; setDirty(false); }, 80); },
    // 저장한 때와 글이 같으면(되돌리기 포함) 저장 안 됨 표시를 끈다
    onUpdate: ({ editor: e }) => { setDirty(Boolean(cleanRef.current) && !e.state.doc.eq(cleanRef.current!)); },
    onTransaction: () => setTick((t) => (t + 1) % 1e9),
  });
  const ed = editor as Editor | null;
  const edRef = useRef<Editor | null>(null);
  edRef.current = ed;

  // 서식(테마)·기본 글자 → 편집기 꾸밈 값
  useEffect(() => { setThemeSizes({ h1: theme.h1, h2: theme.h2, h3: theme.h3 }); }, [theme]);
  const cssVars = { "--gsd-font": `'${base.font}', 'Malgun Gothic', sans-serif`, "--gsd-size": `${base.size}pt`, "--gsd-head": `'${theme.head}', 'Malgun Gothic', sans-serif`, "--gsd-hcolor": theme.color, "--gsd-h1": `${theme.h1}pt`, "--gsd-h2": `${theme.h2}pt`, "--gsd-h3": `${theme.h3}pt` } as React.CSSProperties;

  // 쪽 나눔 다시 재기 (용지·여백·글꼴·보기 바뀔 때)
  const remeasure = useCallback(() => { requestAnimationFrame(() => ed?.view.dom.dispatchEvent(new Event("gsd-remeasure"))); }, [ed]);
  useEffect(() => { remeasure(); }, [remeasure, page, base, view, theme]);
  useEffect(() => { document.fonts?.ready.then(remeasure); }, [remeasure]);

  // 각주 — 쪽마다 아래 여백에 모아 그린다
  useEffect(() => {
    if (!ed || !stackRef.current) return;
    const id = requestAnimationFrame(() => {
      const st = stackRef.current;
      if (!st) return;
      const top = st.getBoundingClientRect().top;
      const out: { n: number; text: string }[][] = [];
      let n = 0;
      ed.view.dom.querySelectorAll<HTMLElement>(".gsd-footnote").forEach((el) => {
        n++;
        const y = (el.getBoundingClientRect().top - top) / zoom;
        const pi = view === "print" ? Math.max(0, Math.floor(y / period)) : 0;
        (out[pi] = out[pi] || []).push({ n, text: el.getAttribute("data-text") || "" });
      });
      setFnPages((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
    });
    return () => cancelAnimationFrame(id);
  });

  // 현재 쪽 (커서 자리)
  useEffect(() => {
    if (!ed) return;
    const h = () => {
      const st = stackRef.current;
      if (!st || view !== "print") return setCurPage(1);
      try {
        const c = ed.view.coordsAtPos(ed.state.selection.from);
        const y = (c.top - st.getBoundingClientRect().top) / zoom;
        setCurPage(Math.max(1, Math.min(pages, Math.floor(y / period) + 1)));
      } catch {}
    };
    ed.on("selectionUpdate", h);
    return () => { ed.off("selectionUpdate", h); };
  }, [ed, zoom, period, pages, view]);

  // 웹 모양 — 창 너비만큼
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWebW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 읽기 전용 · 읽기 모드
  useEffect(() => { ed?.setEditable(!readOnly && view !== "read"); }, [ed, readOnly, view]);

  /* ── 문서 상태 ── */
  const setPage = useCallback((p: Partial<PageSetup>) => { setPageState((o) => ({ ...o, ...p, margin: p.margin ? { ...p.margin } : o.margin })); setDirty(true); }, []);
  const setBase = useCallback((b: { font?: string; size?: number }) => { setBaseState((o) => ({ ...o, ...b })); setDirty(true); }, []);
  const docData = useCallback((): DocData => ({ page, json: ed ? ed.getJSON() : { type: "doc" }, meta: { title, font: base.font, size: base.size } }), [page, ed, title, base]);
  const geom = useCallback((): Geom => ({ pageW, pageH, gap: GAP, pages, wMm: sz.w, hMm: sz.h }), [pageW, pageH, GAP, pages, sz.w, sz.h]);

  // 저장 안 한 표시 → 앱 (닫을 때 묻기)
  useEffect(() => { bridge()?.setDirty(dirty ? 1 : 0); }, [dirty]);
  useEffect(() => () => { bridge()?.setDirty(0); }, []);

  // 자동 저장 (복구용) — 고치고 4초 뒤
  useEffect(() => {
    if (!dirty || !ed) return;
    const t = setTimeout(() => {
      const json = { page, doc: ed.getJSON(), base, ext };
      const b = bridge();
      if (b) b.autosaveWrite({ id: docId.current, name: title, file, json });
      else { try { localStorage.setItem("gsd_web_autosave", JSON.stringify({ id: docId.current, name: title, at: Date.now(), json })); } catch {} }
    }, 4000);
    return () => clearTimeout(t);
  }, [dirty, ed, page, base, title, file, ext]);
  // 복구할 문서
  useEffect(() => {
    const b = bridge();
    if (b) b.autosaveList().then((l) => setRecover(l.filter((x) => x.id !== docId.current))).catch(() => {});
    else { try { const j = JSON.parse(localStorage.getItem("gsd_web_autosave") || "null"); if (j) setRecover([{ id: j.id, name: j.name, file: "", at: j.at }]); } catch {} }
  }, []);

  const reloadRecent = useCallback(() => { bridge()?.recent().then(setRecent).catch(() => {}); }, []);
  useEffect(() => { reloadRecent(); }, [reloadRecent]);

  const confirmDiscard = useCallback(() => !dirty || window.confirm("저장하지 않은 내용이 있어요. 버리고 계속할까요?"), [dirty]);
  const resetDoc = useCallback((html: string, pg: PageSetup, nm: string, path: string, ex: string, b?: { font?: string; size?: number }) => {
    if (!ed) return;
    painterCancel();
    setPageState(pg);
    const th = THEMES.find((t) => t.id === pg.theme) || THEMES[0];
    setBaseState({ font: b?.font || th.body, size: b?.size || 10 });
    ed.chain().setContent(html, { emitUpdate: false }).setTextSelection(1).run();
    const ps = pageSize(pg);
    fitTables(ed, (ps.w - pg.margin.left - pg.margin.right) * MMPX);
    findSet(ed.view, "");
    setTitle(nm);
    setFile(path);
    setExt(ex);
    setDirty(false);
    setCommentsOpen(false);
    foreignRef.current = false;
    docId.current = newId();
    setBs(null);
    cleanRef.current = ed.state.doc;
    setTimeout(() => { cleanRef.current = ed.state.doc; setDirty(false); ed.commands.focus("start"); remeasure(); }, 60);
  }, [ed, remeasure]);

  /* ── 열기 ── */
  const loadBytes = useCallback(async (bytes: Uint8Array, name: string, path: string, as?: string) => {
    const ex = (as || name.split(".").pop() || "").toLowerCase();
    const nm = name.replace(/\.[^.]+$/, "");
    const realExt = (name.split(".").pop() || "").toLowerCase();
    try {
      if (ex === "docx") {
        const { docxToDoc } = await import("./docx");
        const r = await docxToDoc(bytes);
        resetDoc(r.html, r.page, nm, path, "docx", r.meta);
      } else if (ex === "hwpx") {
        const { hwpxToDoc } = await import("./hwpx");
        const r = await hwpxToDoc(bytes);
        resetDoc(r.html, r.page, nm, path, realExt === "hwp" ? "hwp" : "hwpx", r.meta);
      } else if (["txt", "md", "html", "htm"].includes(ex)) {
        const text = new TextDecoder("utf-8").decode(bytes);
        const html = ex === "md" ? mdToHtml(text) : ex === "txt" ? textToHtml(text) : htmlBody(text);
        resetDoc(html, { ...DEFAULT_PAGE, margin: { ...DEFAULT_PAGE.margin } }, nm, "", "docx");
      } else if (ex === "doc") throw new Error("예전 워드(.doc) 파일은 열 수 없어요 — 워드에서 .docx 로 저장해 주세요");
      else if (ex === "hwp") throw new Error("한글(.hwp) 파일은 스튜디오 앱에서 열 수 있어요");
      else throw new Error("열 수 없는 파일이에요 (.docx · .hwpx · .hwp · .txt)");
      foreignRef.current = Boolean(path) && ["docx", "hwpx", "hwp"].includes(realExt);
      say(`열었어요: ${name}`);
    } catch (e) {
      say(String((e as Error).message || e), 5000);
    }
  }, [resetDoc, say]);
  const loadRef = useRef(loadBytes);
  loadRef.current = loadBytes;
  const openRes = useCallback(async (r: FileRes | null) => {
    if (!r) return;
    if (r.error) {
      if (r.code === "NO_JAVA") { setDlg({ name: "java" }); say("한글(.hwp)을 열려면 변환기를 먼저 받아 주세요", 5000); }
      else say(r.error, 5000);
      return;
    }
    if (r.bytes) await loadBytes(r.bytes, r.name, r.path, r.as);
    reloadRecent();
  }, [loadBytes, reloadRecent, say]);
  const openFile = useCallback(async () => {
    if (!confirmDiscard()) return;
    const b = bridge();
    if (b) return openRes(await b.open());
    const [f] = await pickLocal(".docx,.hwpx,.txt,.md,.html,.htm");
    if (f) await loadBytes(new Uint8Array(await f.arrayBuffer()), f.name, "");
  }, [confirmDiscard, openRes, loadBytes]);
  const openRecent = useCallback(async (r: Recent) => {
    if (!confirmDiscard()) return;
    const b = bridge();
    if (b) openRes(await b.read(r.path));
  }, [confirmDiscard, openRes]);
  const newFrom = useCallback(async (t: Template) => {
    if (!confirmDiscard()) return;
    if (t.file) {
      // 정부 원본 서식 (.hwpx) — 그대로 연다. 새 문서로 (원본 파일을 덮어쓰지 않게 경로 없음)
      try {
        say("서식을 여는 중…", 10000);
        const r = await fetch(`/doc-templates/${t.file}`);
        if (!r.ok) throw new Error(`서식 파일을 받지 못했어요 (${r.status})`);
        const { hwpxToDoc } = await import("./hwpx");
        const doc = await hwpxToDoc(new Uint8Array(await r.arrayBuffer()));
        resetDoc(doc.html, doc.page, datedTitle(t.name.replace(/[()·]/g, " ").replace(/\s+/g, " ").trim()), "", "hwpx", doc.meta);
        say(`${t.name} — ${t.source || "원본 서식"}`, 4000);
      } catch (e) { say(String((e as Error).message || e), 5000); }
      return;
    }
    const d = loadDefault();
    const pg = { ...templatePage(t), ...(d.theme ? { theme: d.theme } : {}) };
    if (!t.page?.margin && d.margin) pg.margin = { ...d.margin };
    resetDoc(t.html || "<p></p>", pg, datedTitle(t.id === "blank" ? "문서" : t.name), "", "docx", { font: d.font, size: d.size });
  }, [confirmDiscard, resetDoc, say]);

  /* ── 저장 · 내보내기 ── */
  const ensurePrintView = useCallback(async () => {
    if (view === "print") return;
    setViewState("print");
    await new Promise((r) => setTimeout(r, 450));
  }, [view]);
  const buildBytes = useCallback(async (fmt: SaveFmt): Promise<Uint8Array> => {
    if (!ed) throw new Error("편집기가 아직 준비되지 않았어요");
    const data = docData();
    if (fmt === "docx") { const { docToDocx } = await import("./docx"); return docToDocx(data); }
    if (fmt === "hwpx" || fmt === "hwp") { const { docToHwpx } = await import("./hwpx"); return docToHwpx(data); }
    if (fmt === "txt") return new TextEncoder().encode(ed.state.doc.textBetween(0, ed.state.doc.content.size, "\r\n", "\r\n"));
    if (fmt === "html") return new TextEncoder().encode(docHtmlFile(title, ed.getHTML(), base.font, sz.w));
    if (fmt === "pdf") {
      await ensurePrintView();
      const st = stackRef.current!;
      const b = bridge();
      if (b) {
        const r = await b.pdf({ html: printHtml(st, geom()), wMm: sz.w, hMm: sz.h, origin: location.origin });
        if (r.bytes) return r.bytes;
        throw new Error(r.error || "PDF 를 만들지 못했어요");
      }
      return imagePdf(await capturePages(st, geom(), 2), sz.w, sz.h);
    }
    throw new Error("모르는 형식");
  }, [ed, docData, title, base.font, sz.w, sz.h, ensurePrintView, geom]);
  const writeAs = useCallback(async (fmt: SaveFmt, ask: boolean) => {
    if (fmt === "png" || fmt === "jpg") { setDlg({ name: "images" }); return; }
    try {
      say(fmt === "pdf" ? "PDF 를 만드는 중…" : "저장하는 중…", 20000);
      const bytes = await buildBytes(fmt);
      const b = bridge();
      const isDoc = DOC_EXTS.includes(fmt);
      if (b) {
        const target = !ask && file && fmt === ext ? file : undefined;
        if (target && foreignRef.current) {
          const go = window.confirm(`원래 파일에 덮어써요: ${file.split(/[\\/]/).pop()}

이 편집기가 아직 못 다루는 서식(겹친 글상자·도형 묶음·차트 원본 등)은 빠질 수 있어요.
덮어쓸까요?

[취소]를 누르면 다른 이름으로 저장해요.`);
          if (!go) { setToast(""); setBs("saveas"); return; }
          foreignRef.current = false;
        }
        const r = await b.save({ file: target, name: title, ext: fmt, bytes, ask: ask || !target });
        if (r.canceled) { setToast(""); return; }
        if (r.error) {
          if (r.code === "NO_JAVA") { setDlg({ name: "java" }); say("한글 97~2010(.hwp)로 저장하려면 변환기를 먼저 받아 주세요", 5000); }
          else say(`저장하지 못했어요: ${r.error}`, 6000);
          return;
        }
        if (isDoc && r.path) {
          setFile(r.path);
          setExt(fmt);
          setTitle((r.name || title).replace(/\.[^.]+$/, ""));
          cleanRef.current = ed?.state.doc || null;
          setDirty(false);
          b.autosaveClear(docId.current);
          reloadRecent();
        }
        say(`저장했어요: ${r.name}`);
      } else {
        download(bytes, `${title}.${fmt}`);
        if (isDoc) { setExt(fmt); cleanRef.current = ed?.state.doc || null; setDirty(false); }
        say(`내려받았어요: ${title}.${fmt}`);
      }
      setBs(null);
    } catch (e) {
      say(`저장하지 못했어요: ${String((e as Error).message || e)}`, 6000);
    }
  }, [buildBytes, file, ext, title, say, reloadRecent, ed]);
  const save = useCallback(() => {
    if (DOC_EXTS.includes(ext) && (file || !isApp)) return writeAs(ext as SaveFmt, false);
    setBs("saveas");
  }, [ext, file, isApp, writeAs]);
  // 자동 저장 (켜면 — 파일로 저장한 문서만)
  useEffect(() => {
    if (!autoSave || !dirty || !file || !DOC_EXTS.includes(ext)) return;
    const t = setTimeout(() => writeAs(ext as SaveFmt, false), 3000);
    return () => clearTimeout(t);
  }, [autoSave, dirty, file, ext, writeAs]);

  const exportImages = useCallback(async (o: ImgExport) => {
    await ensurePrintView();
    const st = stackRef.current;
    if (!st) throw new Error("문서를 그리지 못했어요");
    const g = geom();
    const idx = o.range === "all" ? undefined : o.range === "current" ? [curPage - 1] : parseRange(o.custom, g.pages);
    if (idx && !idx.length) throw new Error("페이지 번호를 확인하세요 (예: 1, 3-5)");
    say("그림을 만드는 중…", 60000);
    let cs = await capturePages(st, g, o.hi ? 300 / 96 : 1, idx);
    if (o.mode === "one" && cs.length > 1) cs = [stitch(cs, Math.round(12 * (o.hi ? 300 / 96 : 1)), "#ffffff")];
    const files: { name: string; bytes: Uint8Array }[] = [];
    const nums = idx || Array.from({ length: g.pages }, (_, i) => i);
    for (let i = 0; i < cs.length; i++) files.push({ name: cs.length === 1 ? `${title}${o.mode === "pages" && g.pages > 1 ? `_${nums[i] + 1}` : ""}.${o.fmt}` : `${title}_${nums[i] + 1}.${o.fmt}`, bytes: await canvasBytes(cs[i], o.fmt) });
    const b = bridge();
    if (b) {
      if (o.lib) { const r = await b.libAdd({ files }); say(`내 자료에 ${r.count}장 넣었어요`); }
      const r = files.length > 1 ? await b.save({ name: title, ext: o.fmt, files }) : await b.save({ name: files[0].name.replace(/\.[^.]+$/, ""), ext: o.fmt, bytes: files[0].bytes, ask: true });
      if (r.canceled) { setToast(o.lib ? "내 자료에 넣었어요" : ""); return; }
      if (r.error) throw new Error(r.error);
      say(files.length > 1 ? `그림 ${files.length}장을 저장했어요` : `저장했어요: ${r.name}`);
    } else {
      for (const f of files) download(f.bytes, f.name, o.fmt === "png" ? "image/png" : "image/jpeg");
      say(`그림 ${files.length}장을 내려받았어요`);
    }
    setBs(null);
  }, [ensurePrintView, geom, curPage, title, say]);

  const doPrint = useCallback(async (o: PrintOpts) => {
    await ensurePrintView();
    const st = stackRef.current;
    if (!st) return;
    const g = geom();
    const only = o.range === "current" ? [curPage - 1] : o.range === "custom" ? parseRange(o.custom, g.pages) : undefined;
    const html = printHtml(st, g, only);
    const b = bridge();
    if (b) {
      say("인쇄하는 중…", 15000);
      const r = await b.print({ html, wMm: sz.w, hMm: sz.h, deviceName: o.printer, copies: o.copies, duplex: o.duplex, color: o.color, origin: location.origin });
      say(r.ok ? "인쇄를 보냈어요" : `인쇄하지 못했어요: ${r.error || ""}`, 4000);
    } else browserPrint(html);
    setBs(null);
  }, [ensurePrintView, geom, curPage, sz.w, sz.h, say]);
  const printPreview = useCallback(async () => {
    await ensurePrintView();
    await new Promise((r) => setTimeout(r, 200));
    const st = stackRef.current;
    if (!st) return [];
    const cs = await capturePages(st, geom(), 0.8);
    return cs.map((c) => c.toDataURL("image/jpeg", 0.85));
  }, [ensurePrintView, geom]);

  /* ── 보기 ── */
  const setZoom = useCallback((z: number) => setZoomState(Math.max(0.1, Math.min(5, Math.round(z * 100) / 100))), []);
  const fit = useCallback((k: "width" | "page" | "multi") => {
    const el = scrollRef.current;
    if (!el) return;
    if (k === "width") setZoom((el.clientWidth - 48) / pageW);
    else if (k === "page") setZoom(Math.min((el.clientWidth - 48) / pageW, (el.clientHeight - 40) / pageH));
    else setZoom(Math.min((el.clientWidth - 48) / pageW, (el.clientHeight - 40) / (pageH * 2 + GAP)));
  }, [pageW, pageH, GAP, setZoom]);
  const setView = useCallback((v: ViewMode) => { setViewState(v); if (v === "read") setRibbonOpen(true); }, []);
  const setNav = useCallback((b: boolean) => { setNavState(b); }, []);
  // Ctrl+휠 확대/축소
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); setZoomState((z) => Math.max(0.1, Math.min(5, Math.round((z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)) * 100) / 100))); };
    el.addEventListener("wheel", w, { passive: false });
    return () => el.removeEventListener("wheel", w);
  }, []);
  // 이동 (페이지 번호)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = (e: Event) => { const n = Number((e as CustomEvent).detail) || 1; el.scrollTo({ top: (Math.max(1, Math.min(pages, n)) - 1) * period * zoom, behavior: "smooth" }); };
    el.addEventListener("gsd-goto-page", h);
    return () => el.removeEventListener("gsd-goto-page", h);
  }, [pages, period, zoom]);

  /* ── 메모 ── */
  const docVer = ed?.state.doc;
  const comments: CommentItem[] = useMemo(() => (ed && docVer ? listComments(ed) : []), [ed, docVer]);
  const newComment = useCallback(() => {
    if (!ed) return;
    if (ed.state.selection.empty) {
      // 고른 글이 없으면 지금 낱말을 고른다
      const { $from } = ed.state.selection;
      const text = $from.parent.textContent;
      const off = $from.parentOffset;
      let s = off, e = off;
      while (s > 0 && /\S/.test(text[s - 1])) s--;
      while (e < text.length && /\S/.test(text[e])) e++;
      if (s === e) { say("메모를 달 글을 먼저 고르세요"); return; }
      ed.chain().setTextSelection({ from: $from.start() + s, to: $from.start() + e }).run();
    }
    const id = addComment(ed, "", "나");
    setCommentsOpen(true);
    setActiveCmt(id);
  }, [ed, say]);
  const stepComment = useCallback((dir: 1 | -1) => {
    if (!ed || !comments.length) return;
    const pos = ed.state.selection.from;
    const next = dir > 0 ? comments.find((c) => c.from > pos) || comments[0] : [...comments].reverse().find((c) => c.from < pos - 1) || comments[comments.length - 1];
    ed.chain().focus().setTextSelection({ from: next.from, to: next.to }).scrollIntoView().run();
    setActiveCmt(next.id);
    setCommentsOpen(true);
  }, [ed, comments]);
  const deleteComment = useCallback((all?: boolean) => {
    if (!ed) return;
    if (all) { for (const c of listComments(ed)) updateComment(ed, c.id, null); return; }
    const pos = ed.state.selection.from;
    const hit = comments.find((c) => c.id === activeCmt) || comments.find((c) => pos >= c.from && pos <= c.to);
    if (hit) updateComment(ed, hit.id, null);
  }, [ed, comments, activeCmt]);
  const stepFootnote = useCallback(() => {
    if (!ed) return;
    const pos = ed.state.selection.from;
    let first = -1, next = -1;
    ed.state.doc.descendants((n, p) => { if (n.type.name === "footnote") { if (first < 0) first = p; if (next < 0 && p > pos) next = p; } });
    const to = next >= 0 ? next : first;
    if (to >= 0) ed.chain().focus().setNodeSelection(to).scrollIntoView().run();
    else say("각주가 없어요");
  }, [ed, say]);

  /* ── 붙여넣기 · 그림 · AI ── */
  const paste = useCallback(async (mode: "keep" | "text") => {
    if (!ed) return;
    try {
      if (mode === "keep" && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const img = it.types.find((t) => t.startsWith("image/"));
          if (it.types.includes("text/html")) { const h = await (await it.getType("text/html")).text(); ed.chain().focus().insertContent(htmlBody(h)).run(); return; }
          if (img) { const bl = await it.getType(img); const src = await fileToDataUrl(new File([bl], "p.png", { type: img })); ed.chain().focus().insertContent({ type: "image", attrs: { src, align: "center" } }).run(); return; }
        }
      }
      const t = await navigator.clipboard.readText();
      ed.chain().focus().insertContent(textToHtml(t)).run();
    } catch { say("붙여넣기는 Ctrl+V 를 눌러 주세요"); }
  }, [ed, say]);
  const pickImages = useCallback(async () => {
    if (!ed) return;
    const b = bridge();
    const srcs: string[] = [];
    if (b) { for (const r of await b.pickImages()) if (r.bytes) srcs.push(await toDataUrl(r.bytes, r.name)); }
    else for (const f of await pickLocal("image/*", true)) srcs.push(await fileToDataUrl(f));
    if (srcs.length) ed.chain().focus().insertContent(srcs.map((src) => ({ type: "image", attrs: { src, align: "center" } }))).run();
  }, [ed]);
  const ai = useCallback((mode: string) => setDlg({ name: "ai", arg: mode }), []);

  const saveDefault = useCallback(() => {
    try { localStorage.setItem(DEFAULT_KEY, JSON.stringify({ theme: page.theme, font: base.font, size: base.size, margin: page.margin, paper: page.paper, w: page.w, h: page.h })); } catch {}
    say("지금 서식을 새 문서 기본값으로 정했어요");
  }, [page, base, say]);

  const setPainter = useCallback((b: boolean) => { if (!b) painterCancel(); setPainterState(b); }, []);

  /* ── 단축키 (워드와 같게) ── */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!ed) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (dlg && e.key !== "F12") return;
      if (mod && !e.altKey && key === "s") { e.preventDefault(); if (e.shiftKey) setBs("saveas"); else save(); }
      else if (e.key === "F12") { e.preventDefault(); setBs("saveas"); }
      else if (mod && key === "o") { e.preventDefault(); setBs("open"); }
      else if (mod && key === "n" && !e.shiftKey) { e.preventDefault(); newFrom(TEMPLATES[0]); }
      else if (mod && key === "p") { e.preventDefault(); setBs("print"); }
      else if (mod && key === "f") { e.preventDefault(); setNavState(true); setTimeout(() => (document.querySelector(".gsd-nav-search input") as HTMLInputElement | null)?.focus(), 30); }
      else if (mod && key === "h") { e.preventDefault(); setDlg({ name: "replace", arg: "replace" }); }
      else if (mod && key === "g") { e.preventDefault(); setDlg({ name: "replace", arg: "goto" }); }
      else if (mod && key === "k") { e.preventDefault(); setDlg({ name: "link" }); }
      else if (mod && key === "d") { e.preventDefault(); setDlg({ name: "font" }); }
      else if (mod && e.key === "]") { e.preventDefault(); growFont(ed, 1, curText(ed, base.font, base.size).size); }
      else if (mod && e.key === "[") { e.preventDefault(); growFont(ed, -1, curText(ed, base.font, base.size).size); }
      else if (mod && e.altKey && ["1", "2", "3"].includes(e.key)) { e.preventDefault(); ed.chain().focus().setHeading({ level: Number(e.key) as 1 | 2 | 3 }).run(); }
      else if (mod && e.shiftKey && key === "n") { e.preventDefault(); ed.chain().focus().setParagraph().run(); }
      else if (mod && e.altKey && key === "m") { e.preventDefault(); newComment(); }
      else if (mod && e.altKey && key === "f") { e.preventDefault(); setDlg({ name: "footnote" }); }
      else if (mod && !e.shiftKey && e.key === "=") { e.preventDefault(); ed.chain().focus().toggleSubscript().run(); }
      else if (mod && e.shiftKey && (e.key === "+" || e.key === "=")) { e.preventDefault(); ed.chain().focus().toggleSuperscript().run(); }
      else if (mod && e.shiftKey && (e.key === "*" || e.key === "8")) { e.preventDefault(); setMarks((m) => !m); }
      else if (e.key === "F7") { e.preventDefault(); ai("spell"); }
      else if (mod && e.key === "F1") { e.preventDefault(); setRibbonOpen((r) => !r); }
      else if (e.key === "Escape" && focus) setFocus(false);
      else if (e.key === "Escape" && painter) setPainter(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ed, dlg, save, newFrom, base, newComment, ai, focus, painter, setPainter]);

  // 서식 복사 — 끌어 고르고 마우스를 떼면 칠한다
  useEffect(() => {
    if (!ed || !painter) return;
    const up = () => setTimeout(() => { if (painterApply(ed)) setPainterState(false); }, 0);
    ed.view.dom.addEventListener("mouseup", up);
    return () => ed.view.dom.removeEventListener("mouseup", up);
  }, [ed, painter]);

  // 표·그림을 고르면 그 탭이 생긴다
  const inTable = !!ed?.isActive("table");
  const onImage = !!ed?.isActive("image");
  const ctxTabs: TabName[] = [...(inTable ? (["표 디자인", "표 레이아웃"] as TabName[]) : []), ...(onImage ? (["그림 서식"] as TabName[]) : [])];
  const shownTab: TabName = (["표 디자인", "표 레이아웃", "그림 서식"] as TabName[]).includes(tab) && !ctxTabs.includes(tab) ? "홈" : tab;

  const c = ed ? counts(ed) : { words: 0, chars: 0, charsNoSpace: 0, paras: 0, lines: 0 };

  if (!ed) return <div className="gsd-root" style={{ alignItems: "center", justifyContent: "center" }}><style>{DOC_CSS}</style>문서편집을 여는 중…</div>;

  const ctl: Ctl = {
    ed, page, setPage, base, setBase, open: (name, arg) => setDlg({ name, arg }), isApp,
    zoom, setZoom, fit, view, setView, ruler, setRuler, nav, setNav, marks, setMarks, grid, setGrid,
    comments: commentsOpen, setComments: setCommentsOpen, readOnly, setReadOnly, painter, setPainter,
    pickImages, paste, ai, newComment, stepComment, deleteComment, stepFootnote, wordCount: () => setDlg({ name: "wordCount" }), saveDefault,
  };
  const extra: Extra = {
    pages, curPage, author: "나", exportImages,
    javaStatus: async () => (bridge() ? bridge()!.javaStatus() : null),
    javaInstall: async (onP) => {
      const b = bridge();
      if (!b) return { ok: false, error: "스튜디오 앱에서만 돼요" };
      const off = b.onJavaProgress(onP);
      try { return await b.javaInstall(); } catch (e) { return { ok: false, error: String((e as Error).message || e) }; } finally { off(); }
    },
    javaRemove: async () => { await bridge()?.javaRemove(); },
    aiRun: async (o) => { const b = bridge(); if (!b) throw new Error("스튜디오 앱에서만 돼요"); return (await b.ai(o)).text; },
  };

  const stackH = view === "print" ? pages * period - GAP : 0;
  const webContentW = Math.max(320, webW / zoom - 80);
  const bodyW = view === "print" ? pageW - ml - mr : webContentW;
  const stackW = view === "print" ? pageW : webContentW + 80;
  const hfText = (t: string, i: number) => t.replace(/\{PAGE\}/g, String(i + 1)).replace(/\{PAGES\}/g, String(pages));
  const hfBox = (t: string, align: string, i: number) => {
    const parts = hfText(t, i).split("\t");
    if (parts.length > 1) return parts.map((p, k) => <span key={k} style={{ textAlign: k === 0 ? "left" : k === parts.length - 1 ? "right" : "center" }}>{p}</span>);
    return <span style={{ textAlign: align as React.CSSProperties["textAlign"] }}>{parts[0]}</span>;
  };
  const headY = Math.min(12.7 * MMPX, mt / 2), footY = Math.min(12.7 * MMPX, mb / 2);
  const pnum = page.pageNumber !== "none" && !/\{PAGE\}/.test(page.header + page.footer);

  // 눈금자 — 지금 문단 들여쓰기 표시 (끌어서 바꾸기)
  const pa = ed.getAttributes(ed.isActive("heading") ? "heading" : "paragraph");
  const indL = (Number(pa.indentLeft) || 0) * PT, indR = (Number(pa.indentRight) || 0) * PT, indF = (Number(pa.firstLine) || 0) * PT;
  const dragMk = (kind: "left" | "first" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    const x0 = e.clientX;
    const v0 = kind === "left" ? indL : kind === "right" ? indR : indF;
    const mv = (ev: MouseEvent) => {
      const dv = (ev.clientX - x0) / zoom;
      const v = Math.round(((kind === "right" ? v0 - dv : v0 + dv) / PT) * 2) / 2;
      cmd(ed).setParagraphAttrs(kind === "left" ? { indentLeft: Math.max(0, v) || null } : kind === "right" ? { indentRight: Math.max(0, v) || null } : { firstLine: v || null });
    };
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  };

  const rootCls = ["gsd-root", marks && "gsd-marks", grid && "gsd-show-grid", page.lineNumbers && "gsd-lines", readOnly && "gsd-readonly", painter && "gsd-painter", focus && "gsd-focus", view === "read" && "gsd-read"].filter(Boolean).join(" ");
  const curCmt = comments.find((x) => x.id === activeCmt);

  return (
    <div className={rootCls} data-pages={pages}>
      <style>{DOC_CSS}</style>
      {/* 제목 줄 */}
      <div className="gsd-title">
        <label className="gsd-auto" title={file && DOC_EXTS.includes(ext) ? "고칠 때마다 파일에 저장" : "먼저 파일로 저장하면 켤 수 있어요"}>
          자동 저장 <span className={`gsd-toggle${autoSave ? " on" : ""}`} onClick={() => { if (!file || !DOC_EXTS.includes(ext)) { say("먼저 워드·한글 파일로 저장하면 자동 저장을 켤 수 있어요"); return; } setAutoSave(!autoSave); }} />
        </label>
        <button title="저장 (Ctrl+S)" onClick={save}><RiSave3Line size={17} /></button>
        <button title="실행 취소 (Ctrl+Z)" disabled={!ed.can().undo()} onClick={() => ed.chain().focus().undo().run()}><RiArrowGoBackLine size={16} /></button>
        <button title="다시 실행 (Ctrl+Y)" disabled={!ed.can().redo()} onClick={() => ed.chain().focus().redo().run()}><RiArrowGoForwardLine size={16} /></button>
        <button title="빠른 인쇄" onClick={() => setBs("print")}><RiPrinterLine size={16} /></button>
        <div className="gsd-title-name" onClick={() => setEditTitle(true)} title="이름 바꾸기">
          {editTitle ? (
            <input autoFocus defaultValue={title} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== title) { setTitle(v); setDirty(true); } setEditTitle(false); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditTitle(false); }} />
          ) : (
            <>{title}{file ? `.${ext}` : ""} - 문서편집 {dirty && <span className="gsd-dirty">· 저장 안 됨</span>}</>
          )}
        </div>
        <TitleSearch ed={ed} onFind={(q) => { setNavState(true); setTimeout(() => findSet(ed.view, q), 30); }} onCmd={(t) => { if (t.startsWith("dlg:")) setDlg({ name: t.slice(4) }); else if (t.startsWith("tab:")) setTab(t.slice(4) as TabName); else if (t.startsWith("bs:")) setBs(t.slice(3) as typeof bs); }} />
        <div style={{ width: 8 }} />
      </div>
      {/* 탭 */}
      <div className="gsd-tabs">
        <button className="gsd-tab file" onClick={() => setBs("home")}>파일</button>
        {TABS.map((t) => (
          <button key={t} className={`gsd-tab${t === "AI" ? " ai" : ""}${shownTab === t ? " on" : ""}`} onClick={() => { setTab(t); setRibbonOpen(true); }} onDoubleClick={() => setRibbonOpen((r) => !r)}>{t}</button>
        ))}
        {ctxTabs.map((t) => <button key={t} className={`gsd-tab ctx${shownTab === t ? " on" : ""}`} onClick={() => { setTab(t); setRibbonOpen(true); }}>{t}</button>)}
        <div className="gsd-tab-right">
          <button onClick={() => { setCommentsOpen(!commentsOpen); }} title="메모"><RiChatNewLine /> 메모</button>
          <button onClick={() => setBs("share")} title="공유" style={{ background: "#185abd", color: "#fff", borderColor: "#185abd" }}><RiShareLine /> 공유</button>
          <button onClick={() => setRibbonOpen(!ribbonOpen)} title={ribbonOpen ? "리본 접기 (Ctrl+F1)" : "리본 펼치기"}>{ribbonOpen ? <RiArrowUpSLine /> : <RiArrowDownSLine />}</button>
        </div>
      </div>
      <div className={`gsd-ribbon${ribbonOpen ? "" : " collapsed"}`}><RibbonBody tab={shownTab} x={ctl} /></div>
      {recover.length > 0 && (
        <div className="gsd-banner">
          ⚠ 저장하지 않고 닫힌 문서가 있어요: <b>{recover[0].name}</b> ({new Date(recover[0].at).toLocaleString("ko-KR")})
          <button onClick={async () => {
            const b = bridge();
            const r = recover[0];
            let j: { page: PageSetup; doc: unknown; base: { font: string; size: number }; ext: string } | null = null;
            if (b) j = (await b.autosaveRead(r.id))?.json || null;
            else { try { j = JSON.parse(localStorage.getItem("gsd_web_autosave") || "null")?.json || null; } catch {} }
            if (j && ed) {
              resetDoc("<p></p>", j.page, r.name, r.file, j.ext || "docx", j.base);
              ed.commands.setContent(j.doc as never, { emitUpdate: false });
              setDirty(true);
              docId.current = r.id;
            }
            setRecover(recover.slice(1));
          }}>복구하기</button>
          <button onClick={async () => { const b = bridge(); if (b) await b.autosaveClear(recover[0].id); else { try { localStorage.removeItem("gsd_web_autosave"); } catch {} } setRecover(recover.slice(1)); }}>지우기</button>
        </div>
      )}
      <div className="gsd-main">
        {nav && <NavPane ed={ed} onClose={() => setNavState(false)} />}
        <div ref={scrollRef} className={`gsd-scroll${view === "web" ? " web" : ""}`} onMouseDown={(e) => {
          // 종이 밖 회색을 눌러도 글 끝으로
          if (e.target === e.currentTarget && !readOnly) { e.preventDefault(); ed.commands.focus("end"); }
        }}>
          {ruler && view === "print" && (
            <div className="gsd-ruler gsd-noprint" style={{ width: pageW * zoom }}>
              <div className="gsd-ruler-in" style={{ width: pageW * zoom }}>
                <div className="gsd-ruler-margin" style={{ left: 0, width: ml * zoom }} />
                <div className="gsd-ruler-margin" style={{ right: 0, width: mr * zoom }} />
                {Array.from({ length: Math.floor(sz.w / 5) + 1 }, (_, i) => {
                  const xpx = ml * zoom + (i * 5 - page.margin.left) * MMPX * zoom;
                  const cm = (i * 5 - page.margin.left) / 10;
                  if (xpx < 0 || xpx > pageW * zoom) return null;
                  const whole = Math.abs(cm - Math.round(cm)) < 0.01;
                  return <React.Fragment key={i}><span className="gsd-ruler-tick" style={{ left: xpx, height: whole ? 6 : 3 }} />{whole && cm !== 0 && <span className="gsd-ruler-num" style={{ left: xpx }}>{Math.abs(Math.round(cm))}</span>}</React.Fragment>;
                })}
                <span className="gsd-ruler-mk first" title="첫 줄 들여쓰기" style={{ left: (ml + indL + indF) * zoom }} onMouseDown={dragMk("first")} />
                <span className="gsd-ruler-mk left" title="왼쪽 들여쓰기" style={{ left: (ml + indL) * zoom }} onMouseDown={dragMk("left")} />
                <span className="gsd-ruler-mk right" title="오른쪽 들여쓰기" style={{ left: (pageW - mr - indR) * zoom }} onMouseDown={dragMk("right")} />
              </div>
            </div>
          )}
          <div className="gsd-zoomer" style={{ width: stackW * zoom, height: view === "print" ? stackH * zoom + 46 : undefined, minHeight: view === "print" ? undefined : "100%" }}>
            <div ref={stackRef} className="gsd-stack" style={{ ...cssVars, width: stackW, height: view === "print" ? stackH : undefined, minHeight: view === "print" ? undefined : `calc(100% / ${zoom})`, transform: `scale(${zoom})`, background: view === "web" ? page.pageColor || "#fff" : undefined }}>
              {view === "print" && Array.from({ length: pages }, (_, i) => (
                <div key={i} className="gsd-sheet" style={{ top: i * period, width: pageW, height: pageH, background: page.pageColor || "#fff" }}>
                  {page.watermark && <div className="gsd-wm" style={{ fontSize: Math.min(140, (pageW * 1.1) / Math.max(2, page.watermark.length)) }}>{page.watermark}</div>}
                  {page.pageBorder && <div className="gsd-pborder" style={{ borderColor: page.pageBorder }} />}
                  {page.header && <div className="gsd-hf" style={{ left: ml, right: mr, top: headY }}>{hfBox(page.header, page.headerAlign, i)}</div>}
                  {page.footer && <div className="gsd-hf" style={{ left: ml, right: mr, bottom: footY }}>{hfBox(page.footer, page.footerAlign, i)}</div>}
                  {pnum && (
                    <div className="gsd-pnum" style={{
                      ...(page.pageNumber.startsWith("top") ? { top: headY } : { bottom: footY }),
                      ...(page.pageNumber.endsWith("right") ? { right: mr } : { left: 0, right: 0, textAlign: "center" as const }),
                    }}>{i + 1}</div>
                  )}
                  {fnPages[i]?.length ? (
                    <div className="gsd-fnarea" style={{ left: ml, right: mr, bottom: Math.max(4, mb - 4 - fnPages[i].length * 14) > footY + 16 ? mb - 4 - fnPages[i].length * 14 : footY + 18 }}>
                      {fnPages[i].map((f) => <div key={f.n}><sup>{f.n}</sup> {f.text}</div>)}
                    </div>
                  ) : null}
                  {/* 여백 모서리 표시 (워드 인쇄 모양) */}
                  {[[ml, mt, "0 1px 1px 0"], [pageW - mr, mt, "0 0 1px 1px"], [ml, pageH - mb, "1px 1px 0 0"], [pageW - mr, pageH - mb, "1px 0 0 1px"]].map(([lx, ty, bw], k) => (
                    <span key={k} className="gsd-margin-mk gsd-noprint" style={{ left: (lx as number) - (k % 2 === 0 ? 12 : 0), top: (ty as number) - (k < 2 ? 12 : 0), borderWidth: bw as string }} />
                  ))}
                </div>
              ))}
              <div className="gsd-body" style={{ position: view === "print" ? "absolute" : "relative", top: view === "print" ? mt : 0, left: view === "print" ? ml : 40, width: bodyW, padding: view === "print" ? 0 : "30px 0 60px" }}
                onClick={(e) => { const cm = (e.target as HTMLElement).closest?.(".gsd-comment"); if (cm) { setActiveCmt(cm.getAttribute("data-comment") || ""); setCommentsOpen(true); } }}>
                <EditorContent editor={ed} />
              </div>
            </div>
          </div>
        </div>
        {commentsOpen && (
          <div className="gsd-cmts">
            <div className="gsd-cmts-head"><span>메모 {comments.length ? `(${comments.length})` : ""}</span><span style={{ display: "flex", gap: 6 }}><button onClick={newComment}>+ 새 메모</button><button onClick={() => setCommentsOpen(false)}><RiCloseLine /></button></span></div>
            <div className="gsd-cmts-list">
              {comments.length === 0 && <div className="gsd-muted" style={{ padding: 8 }}>메모가 없어요. 글을 고르고 [새 메모](Ctrl+Alt+M)를 누르세요.</div>}
              {comments.map((cm) => (
                <div key={cm.id} className={`gsd-cmt${cm.id === activeCmt ? " on" : ""}`} onClick={() => { setActiveCmt(cm.id); ed.chain().setTextSelection({ from: cm.from, to: cm.to }).scrollIntoView().run(); }}>
                  <div className="gsd-cmt-top"><span className="gsd-cmt-av">{(cm.author || "나").slice(0, 1)}</span><b>{cm.author || "나"}</b><span className="gsd-muted" style={{ marginLeft: "auto", fontSize: 11 }}>{cm.at ? new Date(cm.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span></div>
                  <div className="gsd-cmt-q">{cm.quote}</div>
                  {cm.id === activeCmt ? (
                    <CommentEdit key={cm.id} text={cm.text} onSave={(t) => updateComment(ed, cm.id, t)} onDelete={() => { updateComment(ed, cm.id, null); setActiveCmt(""); }} />
                  ) : <div style={{ whiteSpace: "pre-wrap" }}>{cm.text || <span className="gsd-muted">(내용 없음)</span>}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {focus && <button className="gsd-focus-exit" onClick={() => setFocus(false)}>포커스 끝내기 (Esc)</button>}
        {view === "read" && <button className="gsd-read-exit" onClick={() => setView("print")}>읽기 모드 끝내기</button>}
      </div>
      {/* 상태 표시줄 */}
      <div className="gsd-status">
        <span>{view === "print" ? `${curPage}/${pages} 페이지` : "웹 모양"}</span>
        <span>{c.words.toLocaleString()}개 단어{ed.state.selection.empty ? "" : ` 중 ${(ed.state.doc.textBetween(ed.state.selection.from, ed.state.selection.to, " ").match(/\S+/g) || []).length}개`}</span>
        <span>{c.chars.toLocaleString()}자</span>
        <span>한국어</span>
        {readOnly && <span style={{ color: "#c00" }}>편집 제한 (읽기 전용)</span>}
        {curCmt && <span className="gsd-muted">메모: {curCmt.text.slice(0, 20)}</span>}
        <div className="gsd-status-r">
          <button title="포커스" onClick={() => setFocus(true)}><RiFullscreenLine /> 포커스</button>
          <button title="읽기 모드" className={view === "read" ? "on" : ""} onClick={() => setView("read")}><RiBookReadLine /></button>
          <button title="인쇄 모양" className={view === "print" ? "on" : ""} onClick={() => setView("print")}><RiPagesFill /></button>
          <button title="웹 모양" className={view === "web" ? "on" : ""} onClick={() => setView("web")}><RiGlobalLine /></button>
          <button title="축소" onClick={() => setZoom(zoom - 0.1)}><RiSubtractLine /></button>
          <input type="range" min={10} max={500} value={Math.round(zoom * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} title="확대/축소" />
          <button title="확대" onClick={() => setZoom(zoom + 0.1)}><RiAddLine /></button>
          <button title="확대/축소" onClick={() => setDlg({ name: "zoom" })} style={{ minWidth: 44 }}>{Math.round(zoom * 100)}%</button>
        </div>
      </div>
      {bs && (
        <Backstage
          start={bs} title={title} file={file} ext={ext} isApp={isApp} dirty={dirty} pages={pages} words={c.words} chars={c.chars} page={page}
          onBack={() => { setBs(null); setTimeout(() => ed.commands.focus(), 20); }}
          onNew={newFrom} onOpen={openFile} onOpenRecent={openRecent} onSave={() => { setBs(null); save(); }} onSaveAs={(f) => writeAs(f, true)}
          onExportImages={() => { setBs(null); setDlg({ name: "images" }); }} onPrint={doPrint} onPreview={printPreview}
          onClose={() => { if (!confirmDiscard()) return; if (bridge()) bridge()!.autosaveClear(docId.current); resetDoc("<p></p>", { ...DEFAULT_PAGE, margin: { ...DEFAULT_PAGE.margin } }, datedTitle(), "", "docx"); setBs("home"); }}
          onRename={(t) => { setTitle(t); setDirty(true); }} setPage={setPage} recent={recent} reloadRecent={reloadRecent} author="나"
        />
      )}
      {dlg && <DocDialog name={dlg.name} arg={dlg.arg} x={ctl} extra={extra} close={() => { setDlg(null); setTimeout(() => ed.commands.focus(), 10); }} />}
      {toast && <div className="gsd-toast">{toast}</div>}
    </div>
  );
}

/** 메모 고치기 칸 */
function CommentEdit({ text, onSave, onDelete }: { text: string; onSave: (t: string) => void; onDelete: () => void }) {
  const [t, setT] = useState(text);
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <textarea autoFocus={!text} rows={3} value={t} placeholder="메모를 입력하세요" onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) onSave(t); }} />
      <div className="gsd-cmt-act"><button onClick={onDelete}>삭제</button><button onClick={() => onSave(t)} disabled={t === text}>저장 (Ctrl+Enter)</button></div>
    </div>
  );
}

/** 탐색 창 — 찾기 · 제목 · 결과 */
function NavPane({ ed, onClose }: { ed: Editor; onClose: () => void }) {
  const [q, setQ] = useState(() => findKey.getState(ed.state)?.q || "");
  const [tab, setTab] = useState<"heads" | "results">(q ? "results" : "heads");
  const st = findKey.getState(ed.state);
  const hits = st?.hits || [];
  const hs = headings(ed);
  const curPos = ed.state.selection.from;
  const curHead = [...hs].reverse().find((h) => h.pos <= curPos);
  useEffect(() => () => { findSet(ed.view, ""); }, [ed]);
  return (
    <div className="gsd-nav">
      <div className="gsd-nav-head">탐색<button onClick={onClose} title="닫기"><RiCloseLine /></button></div>
      <div className="gsd-nav-search">
        <input placeholder="문서 검색" value={q} onChange={(e) => { setQ(e.target.value); findSet(ed.view, e.target.value); setTab(e.target.value ? "results" : "heads"); }}
          onKeyDown={(e) => { if (e.key === "Enter") findStep(ed.view, e.shiftKey ? -1 : 1); if (e.key === "Escape") { setQ(""); findSet(ed.view, ""); } }} />
        {q ? <><button className="gsd-sm" onClick={() => findStep(ed.view, -1)} title="이전"><RiArrowUpSLine /></button><button className="gsd-sm" onClick={() => findStep(ed.view, 1)} title="다음"><RiArrowDownSLine /></button></> : <RiSearchLine />}
      </div>
      <div className="gsd-nav-tabs">
        <button className={tab === "heads" ? "on" : ""} onClick={() => setTab("heads")}>제목</button>
        <button className={tab === "results" ? "on" : ""} onClick={() => setTab("results")}>결과{q ? ` (${hits.length})` : ""}</button>
      </div>
      <div className="gsd-nav-list">
        {tab === "heads" && (hs.length ? hs.map((h) => (
          <button key={h.pos} className={curHead?.pos === h.pos ? "on" : ""} style={{ paddingLeft: 12 + (h.level - 1) * 14, fontWeight: h.level === 1 ? 600 : 400 }} onClick={() => goTo(ed, h.pos)}>{h.text || "(빈 제목)"}</button>
        )) : <div className="gsd-nav-empty">제목 1·제목 2 스타일을 쓴 문단이 여기 목록으로 나와요. 누르면 그곳으로 가요.</div>)}
        {tab === "results" && (q ? (hits.length ? hits.slice(0, 300).map((h, i) => {
          const ctx = ed.state.doc.textBetween(Math.max(0, h.from - 18), Math.min(ed.state.doc.content.size, h.to + 24), " ", " ");
          const at = ctx.toLowerCase().indexOf(q.toLowerCase());
          return (
            <button key={i} className={`hit${st?.idx === i ? " on" : ""}`} onClick={() => findSet(ed.view, q, i)}>
              {at >= 0 ? <>{ctx.slice(0, at)}<b>{ctx.slice(at, at + q.length)}</b>{ctx.slice(at + q.length)}</> : ctx}
            </button>
          );
        }) : <div className="gsd-nav-empty">찾는 글이 없어요.</div>) : <div className="gsd-nav-empty">찾을 글을 위 칸에 적으세요.</div>)}
      </div>
    </div>
  );
}

/** 제목 줄 검색 — 명령 찾기 + 문서에서 찾기 (워드 Microsoft Search 처럼) */
const COMMANDS: { k: string; label: string; to: string }[] = [
  { k: "표 삽입 table", label: "표 삽입", to: "dlg:table" }, { k: "글꼴 font", label: "글꼴…", to: "dlg:font" }, { k: "단락 줄 간격 paragraph", label: "단락…", to: "dlg:paragraph" },
  { k: "페이지 설정 여백 용지 margin", label: "페이지 설정…", to: "dlg:pageSetup" }, { k: "바꾸기 replace", label: "바꾸기…", to: "dlg:replace" }, { k: "링크 link", label: "링크 삽입…", to: "dlg:link" },
  { k: "기호 symbol 특수문자", label: "기호…", to: "dlg:symbol" }, { k: "날짜 시간 date", label: "날짜 및 시간…", to: "dlg:date" }, { k: "워터마크 watermark", label: "워터마크…", to: "dlg:watermark" },
  { k: "머리글 바닥글 header footer", label: "머리글/바닥글…", to: "dlg:headerFooter" }, { k: "각주 footnote", label: "각주 삽입…", to: "dlg:footnote" }, { k: "차트 chart 그래프", label: "차트 삽입…", to: "dlg:chart" },
  { k: "그리기 draw 펜", label: "그리기 캔버스…", to: "dlg:draw" }, { k: "단어 개수 글자 수 count", label: "단어 개수…", to: "dlg:wordCount" }, { k: "그림 저장 이미지 png jpg", label: "그림으로 저장…", to: "dlg:images" },
  { k: "pdf 내보내기 export", label: "내보내기 (PDF)", to: "bs:export" }, { k: "인쇄 print", label: "인쇄", to: "bs:print" }, { k: "다른 이름 저장 save hwp docx 한글 워드", label: "다른 이름으로 저장", to: "bs:saveas" },
  { k: "열기 open", label: "열기", to: "bs:open" }, { k: "새 문서 new 서식", label: "새로 만들기", to: "bs:new" }, { k: "ai 인공지능 쓰기", label: "AI 탭", to: "tab:AI" },
  { k: "도움말 help 단축키", label: "도움말", to: "dlg:help" }, { k: "한글 hwp java 변환기", label: "한글 변환기 (Java)", to: "dlg:java" },
];
function TitleSearch({ ed, onFind, onCmd }: { ed: Editor; onFind: (q: string) => void; onCmd: (t: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = q.trim() ? COMMANDS.filter((c) => (c.k + " " + c.label).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 7) : [];
  void ed;
  return (
    <div className="gsd-search" onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <RiSearchLine />
      <input placeholder="검색" value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) { onFind(q.trim()); setOpen(false); } if (e.key === "Escape") { setQ(""); (e.target as HTMLInputElement).blur(); } }} />
      {open && q.trim() && (
        <div className="gsd-search-pop">
          <button className="gsd-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { onFind(q.trim()); setOpen(false); }}><span className="gsd-item-ic"><RiSearchLine /></span><span className="gsd-item-lb">문서에서 &quot;{q}&quot; 찾기</span></button>
          {list.length > 0 && <div className="gsd-menu-head">작업</div>}
          {list.map((c) => <button key={c.to} className="gsd-item" onMouseDown={(e) => e.preventDefault()} onClick={() => { onCmd(c.to); setOpen(false); setQ(""); }}><span className="gsd-item-ic">›</span><span className="gsd-item-lb">{c.label}</span></button>)}
        </div>
      )}
    </div>
  );
}
