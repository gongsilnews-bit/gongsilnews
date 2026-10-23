"use client";
// 문서편집 — 대화 상자들 (워드와 같은 이름): 글꼴 · 단락 · 페이지 설정 · 찾기/바꾸기/이동 · 표 삽입 · 링크 · 머리글/바닥글 · 날짜 및 시간 ·
//  기호 · 각주 · 캡션 · 워터마크 · 확대/축소 · 그림으로 저장 · AI · 그리기 캔버스 · 차트 · 한글 변환기(Java) · 도움말 …
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Dialog } from "./ui";
import type { Ctl } from "./Ribbon";
import { FONTS, SIZES, PAPERS, MARGINS, THEMES, esc, type PageSetup } from "./model";
import { cmd, DATE_FORMATS, SYMBOLS, counts, selectionWords, headings, goTo, insertTableHere } from "./actions";
import { findSet, findStep, replaceCur, replaceAll } from "./extensions";
import { mdToHtml } from "./convert";
import { usePcFonts } from "@/lib/pcFonts";

export type ImgExport = { fmt: "png" | "jpg"; mode: "pages" | "one"; hi: boolean; range: "all" | "current" | "custom"; custom: string; lib: boolean };
export type Extra = {
  pages: number; curPage: number; author: string;
  exportImages: (o: ImgExport) => Promise<void>;
  javaStatus: () => Promise<{ ok: boolean; from?: string; version?: number; tool?: boolean } | null>;
  javaInstall: (onP: (t: string, f: number) => void) => Promise<{ ok: boolean; error?: string }>;
  javaRemove: () => Promise<void>;
  aiRun: (o: { mode: string; text: string; request: string }) => Promise<string>;
};
type P = { name: string; arg?: unknown; x: Ctl; close: () => void; extra: Extra };

const btn = (label: string, onClick: () => void, primary = false, disabled = false) => <button key={label} className={`gsd-btn${primary ? " primary" : ""}`} disabled={disabled} onClick={onClick}>{label}</button>;
const okCancel = (ok: () => void, close: () => void, okLabel = "확인", disabled = false) => <>{btn(okLabel, ok, true, disabled)}{btn("취소", close)}</>;
const selText = (ed: Editor) => { const { from, to } = ed.state.selection; return ed.state.doc.textBetween(from, to, "\n", "\n"); };

export function DocDialog(p: P) {
  switch (p.name) {
    case "font": return <FontDlg {...p} />;
    case "paragraph": return <ParaDlg {...p} />;
    case "pageSetup": return <PageDlg {...p} />;
    case "replace": return <ReplaceDlg {...p} />;
    case "table": return <TableDlg {...p} />;
    case "textToTable": return <TextToTableDlg {...p} />;
    case "tableProps": return <TablePropsDlg {...p} />;
    case "imageUrl": return <ImageUrlDlg {...p} />;
    case "imageAlt": return <ImageAltDlg {...p} />;
    case "link": return <LinkDlg {...p} />;
    case "bookmark": return <BookmarkDlg {...p} />;
    case "headerFooter": return <HfDlg {...p} />;
    case "date": return <DateDlg {...p} />;
    case "symbol": return <SymbolDlg {...p} />;
    case "footnote": return <FootnoteDlg {...p} />;
    case "citation": return <CitationDlg {...p} />;
    case "caption": return <CaptionDlg {...p} />;
    case "captionList": return <CaptionListDlg {...p} />;
    case "watermark": return <WatermarkDlg {...p} />;
    case "themeColor": return <ThemeColorDlg {...p} />;
    case "spacingAll": return <SpacingAllDlg {...p} />;
    case "styles": return <StylesDlg {...p} />;
    case "inspect": return <InspectDlg {...p} />;
    case "zoom": return <ZoomDlg {...p} />;
    case "help": return <HelpDlg {...p} />;
    case "java": return <JavaDlg {...p} />;
    case "images": return <ImagesDlg {...p} />;
    case "ai": return <AiDlg {...p} />;
    case "draw": return <DrawDlg {...p} />;
    case "chart": return <ChartDlg {...p} />;
    case "wordCount": return <WordCountDlg {...p} />;
    default: return null;
  }
}

/* ── 글꼴 ── */
function FontDlg({ x, close }: P) {
  const ed = x.ed;
  const a = ed.getAttributes("textStyle");
  const pcFonts = usePcFonts();
  const [font, setFont] = useState<string>((a.fontFamily ? String(a.fontFamily).replace(/['"]/g, "") : "") || x.base.font);
  const [size, setSize] = useState<number>(a.fontSize ? parseFloat(String(a.fontSize)) : x.base.size);
  const [color, setColor] = useState<string>(a.color || "#000000");
  const [b, setB] = useState(ed.isActive("bold")), [i, setI] = useState(ed.isActive("italic")), [u, setU] = useState(ed.isActive("underline"));
  const [s, setS] = useState(ed.isActive("strike")), [sup, setSup] = useState(ed.isActive("superscript")), [sub, setSub] = useState(ed.isActive("subscript"));
  const ok = () => {
    let c = ed.chain().focus().setFontFamily(font).setFontSize(`${size}pt`).setColor(color);
    c = b ? c.setBold() : c.unsetBold();
    c = i ? c.setItalic() : c.unsetItalic();
    c = u ? c.setUnderline() : c.unsetUnderline();
    c = s ? c.setStrike() : c.unsetStrike();
    c = sup ? c.setSuperscript() : c.unsetSuperscript();
    c = sub ? c.setSubscript() : c.unsetSubscript();
    c.run();
    close();
  };
  return (
    <Dialog title="글꼴" onClose={close} width={520} foot={<>{btn("기본값으로 설정", () => { x.setBase({ font, size }); close(); })}<span style={{ flex: 1 }} />{okCancel(ok, close)}</>}>
      <div className="gsd-form3">
        <label>한글/영문 글꼴(T):<select value={font} onChange={(e) => setFont(e.target.value)}>
          {!FONTS.some((f) => f.family === font) && !(pcFonts || []).some((f) => (f.ko || f.family) === font) && <option value={font}>{font}</option>}
          <optgroup label="공실뉴스 글꼴">{FONTS.map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
          {pcFonts && pcFonts.length > 0 && <optgroup label="내 PC 글꼴">{pcFonts.filter((f) => !FONTS.some((x) => x.family === f.family || x.family === f.ko)).map((f) => <option key={f.family} value={f.ko || f.family}>{f.label}</option>)}</optgroup>}
        </select></label>
        <label>글꼴 스타일(Y):<select value={`${b ? 1 : 0}${i ? 1 : 0}`} onChange={(e) => { setB(e.target.value[0] === "1"); setI(e.target.value[1] === "1"); }}><option value="00">보통</option><option value="01">기울임꼴</option><option value="10">굵게</option><option value="11">굵은 기울임꼴</option></select></label>
        <label>크기(S):<input list="gsd-sizes" type="number" step={0.5} min={1} value={size} onChange={(e) => setSize(Number(e.target.value) || 10)} /><datalist id="gsd-sizes">{SIZES.map((z) => <option key={z} value={z} />)}</datalist></label>
      </div>
      <div className="gsd-form2" style={{ marginTop: 10 }}>
        <label>글꼴 색(C):<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
        <label>밑줄 스타일(U):<select value={u ? "1" : "0"} onChange={(e) => setU(e.target.value === "1")}><option value="0">(없음)</option><option value="1">실선</option></select></label>
      </div>
      <fieldset className="gsd-fs"><legend>효과</legend>
        <div className="gsd-form2">
          <label className="gsd-check"><input type="checkbox" checked={s} onChange={(e) => setS(e.target.checked)} /> 취소선(K)</label>
          <label className="gsd-check"><input type="checkbox" checked={sup} onChange={(e) => { setSup(e.target.checked); if (e.target.checked) setSub(false); }} /> 위 첨자(P)</label>
          <label className="gsd-check"><input type="checkbox" checked={sub} onChange={(e) => { setSub(e.target.checked); if (e.target.checked) setSup(false); }} /> 아래 첨자(B)</label>
        </div>
      </fieldset>
      <fieldset className="gsd-fs"><legend>미리 보기</legend>
        <div className="gsd-preview" style={{ fontFamily: `'${font}'`, fontSize: `${size}pt`, color, fontWeight: b ? 700 : 400, fontStyle: i ? "italic" : "normal", textDecoration: `${u ? "underline " : ""}${s ? "line-through" : ""}` || "none" }}>
          {selText(ed).slice(0, 30) || "가나다 AaBbCc"}
        </div>
      </fieldset>
    </Dialog>
  );
}

/* ── 단락 ── */
function ParaDlg({ x, close }: P) {
  const ed = x.ed;
  const pa = ed.getAttributes(ed.isActive("heading") ? "heading" : "paragraph");
  const [align, setAlign] = useState<string>(pa.textAlign || "left");
  const [left, setLeft] = useState<number>(Number(pa.indentLeft) || 0);
  const [right, setRight] = useState<number>(Number(pa.indentRight) || 0);
  const fl = Number(pa.firstLine) || 0;
  const [special, setSpecial] = useState<"none" | "first" | "hanging">(fl > 0 ? "first" : fl < 0 ? "hanging" : "none");
  const [specialV, setSpecialV] = useState<number>(Math.abs(fl) || 20);
  const [before, setBefore] = useState<number>(Number(pa.spaceBefore) || 0);
  const [after, setAfter] = useState<number>(pa.spaceAfter === null || pa.spaceAfter === undefined ? 0 : Number(pa.spaceAfter));
  const lh0 = Number(pa.lineHeight) || 0;
  const [lineKind, setLineKind] = useState<"single" | "1.5" | "double" | "multi">(lh0 === 1 ? "single" : lh0 === 1.5 ? "1.5" : lh0 === 2 ? "double" : "multi");
  const [lineV, setLineV] = useState<number>(lh0 || 1.6);
  const [keepNext, setKeepNext] = useState<boolean>(!!pa.keepNext);
  const lineHeight = lineKind === "single" ? 1 : lineKind === "1.5" ? 1.5 : lineKind === "double" ? 2 : lineV;
  const ok = () => {
    ed.chain().focus().setTextAlign(align).run();
    cmd(ed).setParagraphAttrs({ indentLeft: left || null, indentRight: right || null, firstLine: special === "none" ? null : special === "first" ? specialV : -specialV, spaceBefore: before || null, spaceAfter: after, lineHeight, keepNext: keepNext || null });
    if (special === "hanging") cmd(ed).setParagraphAttrs({ indentLeft: (left || 0) + specialV });
    close();
  };
  return (
    <Dialog title="단락" onClose={close} width={520} foot={okCancel(ok, close)}>
      <fieldset className="gsd-fs"><legend>일반</legend>
        <label className="gsd-inline">맞춤(G): <select value={align} onChange={(e) => setAlign(e.target.value)}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option><option value="justify">양쪽</option></select></label>
      </fieldset>
      <fieldset className="gsd-fs"><legend>들여쓰기</legend>
        <div className="gsd-form2">
          <label>왼쪽(L): <input type="number" step={1} value={left} onChange={(e) => setLeft(Number(e.target.value) || 0)} /> pt</label>
          <label>첫 줄(S): <select value={special} onChange={(e) => setSpecial(e.target.value as typeof special)}><option value="none">(없음)</option><option value="first">첫 줄</option><option value="hanging">내어쓰기</option></select></label>
          <label>오른쪽(R): <input type="number" step={1} value={right} onChange={(e) => setRight(Number(e.target.value) || 0)} /> pt</label>
          <label>값(Y): <input type="number" step={1} value={specialV} disabled={special === "none"} onChange={(e) => setSpecialV(Number(e.target.value) || 0)} /> pt</label>
        </div>
      </fieldset>
      <fieldset className="gsd-fs"><legend>간격</legend>
        <div className="gsd-form2">
          <label>단락 앞(B): <input type="number" step={6} min={0} value={before} onChange={(e) => setBefore(Number(e.target.value) || 0)} /> pt</label>
          <label>줄 간격(N): <select value={lineKind} onChange={(e) => setLineKind(e.target.value as typeof lineKind)}><option value="single">1줄</option><option value="1.5">1.5줄</option><option value="double">2줄</option><option value="multi">배수</option></select></label>
          <label>단락 뒤(F): <input type="number" step={6} min={0} value={after} onChange={(e) => setAfter(Number(e.target.value) || 0)} /> pt</label>
          <label>값(A): <input type="number" step={0.05} min={0.5} max={5} value={lineV} disabled={lineKind !== "multi"} onChange={(e) => setLineV(Number(e.target.value) || 1)} /> 배</label>
        </div>
      </fieldset>
      <fieldset className="gsd-fs"><legend>줄 및 페이지 나누기</legend>
        <label className="gsd-check"><input type="checkbox" checked={keepNext} onChange={(e) => setKeepNext(e.target.checked)} /> 다음 단락과 같은 페이지에(X)</label>
      </fieldset>
      <fieldset className="gsd-fs"><legend>미리 보기</legend>
        <div className="gsd-para-pv">
          <div className="pv-g" />
          <div style={{ textAlign: align as React.CSSProperties["textAlign"], marginLeft: left * 0.5, marginRight: right * 0.5, textIndent: special === "first" ? specialV * 0.5 : special === "hanging" ? -specialV * 0.5 : 0, paddingTop: before * 0.4, paddingBottom: after * 0.4, lineHeight }}>
            고친 단락이 이렇게 보입니다. 고친 단락이 이렇게 보입니다. 고친 단락이 이렇게 보입니다. 고친 단락이 이렇게 보입니다.
          </div>
          <div className="pv-g" />
        </div>
      </fieldset>
    </Dialog>
  );
}

/* ── 페이지 설정 ── */
function PageDlg({ x, close, arg }: P) {
  const [tab, setTab] = useState<"margin" | "paper" | "layout">(arg === "paper" ? "paper" : "margin");
  const [pg, setPg] = useState<PageSetup>({ ...x.page, margin: { ...x.page.margin } });
  const m = pg.margin;
  const setM = (k: keyof PageSetup["margin"], v: number) => setPg({ ...pg, margin: { ...m, [k]: Math.max(0, v) } });
  const ok = () => { x.setPage(pg); close(); };
  const W = pg.landscape ? pg.h : pg.w, H = pg.landscape ? pg.w : pg.h;
  const sc = 120 / Math.max(W, H);
  return (
    <Dialog title="페이지 설정" onClose={close} width={500} foot={okCancel(ok, close)}>
      <div className="gsd-dtabs">{(["margin", "paper", "layout"] as const).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "margin" ? "여백" : t === "paper" ? "용지" : "레이아웃"}</button>)}</div>
      {tab === "margin" && (
        <>
          <fieldset className="gsd-fs"><legend>여백</legend>
            <div className="gsd-form2">
              <label>위쪽(T): <input type="number" step={0.5} value={m.top} onChange={(e) => setM("top", Number(e.target.value))} /> mm</label>
              <label>아래쪽(B): <input type="number" step={0.5} value={m.bottom} onChange={(e) => setM("bottom", Number(e.target.value))} /> mm</label>
              <label>왼쪽(L): <input type="number" step={0.5} value={m.left} onChange={(e) => setM("left", Number(e.target.value))} /> mm</label>
              <label>오른쪽(R): <input type="number" step={0.5} value={m.right} onChange={(e) => setM("right", Number(e.target.value))} /> mm</label>
            </div>
            <div className="gsd-chips">{MARGINS.map((mm) => <button key={mm.id} className="gsd-btn" onClick={() => setPg({ ...pg, margin: { ...mm.m } })}>{mm.name}</button>)}</div>
          </fieldset>
          <fieldset className="gsd-fs"><legend>용지 방향</legend>
            <label className="gsd-check"><input type="radio" checked={!pg.landscape} onChange={() => setPg({ ...pg, landscape: false })} /> 세로(P)</label>{" "}
            <label className="gsd-check"><input type="radio" checked={pg.landscape} onChange={() => setPg({ ...pg, landscape: true })} /> 가로(S)</label>
          </fieldset>
        </>
      )}
      {tab === "paper" && (
        <fieldset className="gsd-fs"><legend>용지 크기</legend>
          <select value={pg.paper} onChange={(e) => { const pp = PAPERS.find((q) => q.id === e.target.value); setPg(pp ? { ...pg, paper: pp.id, w: pp.w, h: pp.h } : { ...pg, paper: "custom" }); }}>
            {PAPERS.map((pp) => <option key={pp.id} value={pp.id}>{pp.name}</option>)}
            <option value="custom">사용자 지정 크기</option>
          </select>
          <div className="gsd-form2" style={{ marginTop: 8 }}>
            <label>너비(W): <input type="number" step={1} value={pg.w} onChange={(e) => setPg({ ...pg, paper: "custom", w: Math.max(50, Number(e.target.value)) })} /> mm</label>
            <label>높이(E): <input type="number" step={1} value={pg.h} onChange={(e) => setPg({ ...pg, paper: "custom", h: Math.max(50, Number(e.target.value)) })} /> mm</label>
          </div>
        </fieldset>
      )}
      {tab === "layout" && (
        <fieldset className="gsd-fs"><legend>머리글/바닥글</legend>
          <div className="gsd-form2">
            <label>머리글 맞춤: <select value={pg.headerAlign} onChange={(e) => setPg({ ...pg, headerAlign: e.target.value as PageSetup["headerAlign"] })}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label>
            <label>바닥글 맞춤: <select value={pg.footerAlign} onChange={(e) => setPg({ ...pg, footerAlign: e.target.value as PageSetup["footerAlign"] })}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label>
          </div>
          <label className="gsd-check" style={{ marginTop: 8 }}><input type="checkbox" checked={!!pg.lineNumbers} onChange={(e) => setPg({ ...pg, lineNumbers: e.target.checked })} /> 줄 번호 넣기</label>
        </fieldset>
      )}
      <fieldset className="gsd-fs"><legend>미리 보기</legend>
        <div style={{ display: "flex", justifyContent: "center", padding: 6 }}>
          <div style={{ width: W * sc, height: H * sc, background: "#fff", boxShadow: "1px 1px 4px rgba(0,0,0,.35)", position: "relative" }}>
            <div style={{ position: "absolute", left: m.left * sc, right: m.right * sc, top: m.top * sc, bottom: m.bottom * sc, background: "repeating-linear-gradient(#bbb 0 1px, transparent 1px 5px)" }} />
          </div>
        </div>
      </fieldset>
    </Dialog>
  );
}

/* ── 찾기 및 바꾸기 · 이동 ── */
function ReplaceDlg({ x, close, arg }: P) {
  const ed = x.ed;
  const [tab, setTab] = useState<"find" | "replace" | "goto">((arg as "find" | "replace" | "goto") || "replace");
  const [q, setQ] = useState(selText(ed).slice(0, 100));
  const [r, setR] = useState("");
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState("");
  useEffect(() => { if (q) findSet(ed.view, q); return () => { findSet(ed.view, ""); }; }, [ed, q]);
  const goPage = () => {
    const n = Number(page);
    const host = ed.view.dom.closest(".gsd-scroll") as HTMLElement | null;
    host?.dispatchEvent(new CustomEvent("gsd-goto-page", { detail: n }));
  };
  return (
    <Dialog title="찾기 및 바꾸기" onClose={close} width={500} foot={
      tab === "goto" ? <>{btn("이동", goPage, true)}{btn("닫기", close)}</> : <>
        {tab === "replace" && btn("바꾸기(R)", () => { const n = replaceCur(ed.view, r); setMsg(n ? `남은 ${n}개` : "더 이상 없어요"); })}
        {tab === "replace" && btn("모두 바꾸기(A)", () => { const n = replaceAll(ed.view, r); setMsg(`${n}개를 바꿨어요`); })}
        {btn("다음 찾기(F)", () => { const n = findStep(ed.view, 1); setMsg(n ? `${n}개 찾음` : "찾는 글이 없어요"); }, true)}
        {btn("닫기", close)}
      </>
    }>
      <div className="gsd-dtabs">{(["find", "replace", "goto"] as const).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "find" ? "찾기(D)" : t === "replace" ? "바꾸기(P)" : "이동(G)"}</button>)}</div>
      {tab !== "goto" ? (
        <div className="gsd-form1">
          <label>찾을 내용(N): <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setMsg(e.target.value ? `${findSet(ed.view, e.target.value)}개 찾음` : ""); }} onKeyDown={(e) => { if (e.key === "Enter") findStep(ed.view, e.shiftKey ? -1 : 1); }} /></label>
          {tab === "replace" && <label>바꿀 내용(I): <input value={r} onChange={(e) => setR(e.target.value)} /></label>}
          <div className="gsd-muted">{msg}</div>
        </div>
      ) : (
        <div className="gsd-form1"><label>페이지 번호 입력(E): <input autoFocus value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && goPage()} /></label></div>
      )}
    </Dialog>
  );
}

/* ── 표 ── */
function TableDlg({ x, close }: P) {
  const [cols, setCols] = useState(5), [rows, setRows] = useState(2), [head, setHead] = useState(false);
  return (
    <Dialog title="표 삽입" onClose={close} width={340} foot={okCancel(() => { insertTableHere(x.ed, rows, cols, head); close(); }, close)}>
      <fieldset className="gsd-fs"><legend>표 크기</legend>
        <div className="gsd-form1">
          <label>열 개수(C): <input type="number" min={1} max={63} value={cols} onChange={(e) => setCols(Math.max(1, Math.min(63, Number(e.target.value) || 1)))} /></label>
          <label>행 개수(R): <input type="number" min={1} max={500} value={rows} onChange={(e) => setRows(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} /></label>
        </div>
      </fieldset>
      <label className="gsd-check"><input type="checkbox" checked={head} onChange={(e) => setHead(e.target.checked)} /> 첫 행을 머리글로</label>
    </Dialog>
  );
}
function TextToTableDlg({ x, close }: P) {
  const ed = x.ed;
  const [sep, setSep] = useState<"tab" | "comma" | "space">("tab");
  const lines = selText(ed).split("\n").filter((l) => l.trim());
  const split = (l: string) => (sep === "tab" ? l.split("\t") : sep === "comma" ? l.split(",") : l.split(/\s+/)).map((s) => s.trim());
  const ok = () => {
    if (!lines.length) return close();
    const cols = Math.max(...lines.map((l) => split(l).length));
    const html = `<table>${lines.map((l) => { const cs = split(l); return `<tr>${Array.from({ length: cols }, (_, i) => `<td><p>${esc(cs[i] || "")}</p></td>`).join("")}</tr>`; }).join("")}</table>`;
    ed.chain().focus().deleteSelection().insertContent(html).run();
    close();
  };
  return (
    <Dialog title="텍스트를 표로 변환" onClose={close} width={360} foot={okCancel(ok, close, "확인", !lines.length)}>
      {!lines.length && <p className="gsd-muted">먼저 표로 바꿀 글(여러 줄)을 고르세요.</p>}
      <fieldset className="gsd-fs"><legend>텍스트 구분 기호</legend>
        {(["tab", "comma", "space"] as const).map((s) => <label key={s} className="gsd-check" style={{ marginRight: 12 }}><input type="radio" checked={sep === s} onChange={() => setSep(s)} /> {s === "tab" ? "탭" : s === "comma" ? "쉼표" : "공백"}</label>)}
      </fieldset>
      {lines.length > 0 && <p className="gsd-muted">{lines.length}행 × {Math.max(...lines.map((l) => split(l).length))}열</p>}
    </Dialog>
  );
}
function TablePropsDlg({ x, close }: P) {
  const ed = x.ed;
  const [w, setW] = useState(100);
  const ok = () => {
    const { $from } = ed.state.selection;
    for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "table") {
      const dom = ed.view.nodeDOM($from.before(d)) as HTMLElement | null;
      const t = dom?.querySelector("table") || dom;
      if (t) (t as HTMLElement).style.width = `${w}%`;
      break;
    }
    close();
  };
  return (
    <Dialog title="표 속성" onClose={close} width={340} foot={okCancel(ok, close)}>
      <label className="gsd-inline">너비: <input type="number" min={10} max={100} value={w} onChange={(e) => setW(Number(e.target.value) || 100)} /> % (화면에서만 — 칸 너비는 칸 경계를 끌어 바꾸세요)</label>
    </Dialog>
  );
}

/* ── 그림 ── */
function ImageUrlDlg({ x, close }: P) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const ok = async () => {
    try {
      const r = await fetch(url);
      const b = await r.blob();
      if (!b.type.startsWith("image/")) throw new Error();
      const src = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(b); });
      x.ed.chain().focus().insertContent({ type: "image", attrs: { src, align: "center" } }).run();
      close();
    } catch { setErr("그림을 받지 못했어요. 그림 주소(…jpg, …png)인지 확인하세요."); }
  };
  return (
    <Dialog title="온라인 그림" onClose={close} width={460} foot={okCancel(ok, close, "삽입", !url)}>
      <label className="gsd-form1">그림 주소: <input autoFocus placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
      {err && <p className="gsd-err">{err}</p>}
    </Dialog>
  );
}
function ImageAltDlg({ x, close }: P) {
  const ed = x.ed;
  const [alt, setAlt] = useState<string>(ed.getAttributes("image").alt || "");
  return (
    <Dialog title="대체 텍스트" onClose={close} width={420} foot={okCancel(() => { cmd(ed).updateAttributes("image", { alt }); close(); }, close)}>
      <p className="gsd-muted">그림을 볼 수 없는 사람에게 읽어 줄 설명이에요.</p>
      <textarea rows={4} style={{ width: "100%" }} value={alt} onChange={(e) => setAlt(e.target.value)} />
    </Dialog>
  );
}

/* ── 링크 · 책갈피 ── */
function LinkDlg({ x, close }: P) {
  const ed = x.ed;
  const [href, setHref] = useState<string>(ed.getAttributes("link").href || "");
  const [text, setText] = useState(selText(ed));
  const marks = useMemo(() => {
    const out: string[] = [];
    ed.state.doc.descendants((n) => { if (n.isText) for (const m of n.marks) if (m.type.name === "link" && String(m.attrs.href).startsWith("#")) out.push(String(m.attrs.href)); });
    return out;
  }, [ed]);
  void marks;
  const ok = () => {
    const h = href.trim() ? (/^(https?:|mailto:|tel:|#)/.test(href.trim()) ? href.trim() : `https://${href.trim()}`) : "";
    if (!h) { ed.chain().focus().unsetLink().run(); return close(); }
    if (ed.state.selection.empty) ed.chain().focus().insertContent({ type: "text", text: text || h, marks: [{ type: "link", attrs: { href: h } }] }).run();
    else ed.chain().focus().extendMarkRange("link").setLink({ href: h }).run();
    close();
  };
  return (
    <Dialog title="링크 삽입" onClose={close} width={460} foot={<>{ed.isActive("link") && btn("링크 제거", () => { ed.chain().focus().extendMarkRange("link").unsetLink().run(); close(); })}<span style={{ flex: 1 }} />{okCancel(ok, close)}</>}>
      <div className="gsd-form1">
        <label>표시할 텍스트(T): <input value={text} disabled={!ed.state.selection.empty} onChange={(e) => setText(e.target.value)} /></label>
        <label>주소(E): <input autoFocus placeholder="https://… · mailto:… · tel:…" value={href} onChange={(e) => setHref(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok()} /></label>
      </div>
    </Dialog>
  );
}
function BookmarkDlg({ x, close }: P) {
  const ed = x.ed;
  const hs = headings(ed);
  return (
    <Dialog title="책갈피 (제목으로 이동)" onClose={close} width={420} foot={btn("닫기", close)}>
      {hs.length === 0 ? <p className="gsd-muted">제목 1·2·3 스타일을 쓴 문단이 책갈피가 돼요.</p> : (
        <div className="gsd-list">{hs.map((h) => <button key={h.pos} style={{ paddingLeft: 8 + (h.level - 1) * 14 }} onClick={() => { goTo(ed, h.pos); close(); }}>{h.text || "(빈 제목)"}</button>)}</div>
      )}
    </Dialog>
  );
}

/* ── 머리글/바닥글 ── */
function HfDlg({ x, close, arg }: P) {
  const [h, setH] = useState(x.page.header), [f, setF] = useState(x.page.footer);
  const [ha, setHa] = useState(x.page.headerAlign), [fa, setFa] = useState(x.page.footerAlign);
  const ins = (set: (s: string) => void, cur: string, t: string) => set(cur + t);
  return (
    <Dialog title="머리글/바닥글" onClose={close} width={520} foot={okCancel(() => { x.setPage({ header: h, footer: f, headerAlign: ha, footerAlign: fa }); close(); }, close)}>
      {[["머리글", h, setH, ha, setHa, "header"], ["바닥글", f, setF, fa, setFa, "footer"]].map(([label, val, set, al, setAl, k]) => (
        <fieldset key={k as string} className="gsd-fs"><legend>{label as string}</legend>
          <textarea autoFocus={arg === k} rows={2} style={{ width: "100%" }} value={val as string} onChange={(e) => (set as (s: string) => void)(e.target.value)} />
          <div className="gsd-chips">
            {btn("쪽 번호", () => ins(set as (s: string) => void, val as string, "{PAGE}"))}
            {btn("전체 쪽 수", () => ins(set as (s: string) => void, val as string, "{PAGES}"))}
            {btn("오늘 날짜", () => ins(set as (s: string) => void, val as string, DATE_FORMATS()[2]))}
            <select value={al as string} onChange={(e) => (setAl as (s: string) => void)(e.target.value)}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select>
          </div>
        </fieldset>
      ))}
      <p className="gsd-muted">줄을 나누려면 Enter. [쪽 번호]를 넣으면 쪽마다 번호가 바뀌어 찍혀요.</p>
    </Dialog>
  );
}

/* ── 날짜 및 시간 · 기호 ── */
function DateDlg({ x, close }: P) {
  const list = DATE_FORMATS();
  const [i, setI] = useState(2);
  return (
    <Dialog title="날짜 및 시간" onClose={close} width={360} foot={okCancel(() => { x.ed.chain().focus().insertContent(list[i]).run(); close(); }, close)}>
      <div className="gsd-list">{list.map((d, k) => <button key={k} className={k === i ? "on" : ""} onClick={() => setI(k)} onDoubleClick={() => { x.ed.chain().focus().insertContent(d).run(); close(); }}>{d}</button>)}</div>
    </Dialog>
  );
}
function SymbolDlg({ x, close, arg }: P) {
  const [set, setSet] = useState(Math.max(0, SYMBOLS.findIndex((s) => s.name === arg)));
  const [recent, setRecent] = useState<string[]>([]);
  const put = (ch: string) => { x.ed.chain().focus().insertContent(ch).run(); setRecent((r) => [ch, ...r.filter((c) => c !== ch)].slice(0, 16)); };
  return (
    <Dialog title="기호" onClose={close} width={520} foot={btn("닫기", close)}>
      <div className="gsd-dtabs">{SYMBOLS.map((s, i) => <button key={s.name} className={i === set ? "on" : ""} onClick={() => setSet(i)}>{s.name}</button>)}</div>
      <div className="gsd-symbols">{[...SYMBOLS[set].chars].map((ch, i) => <button key={i} onMouseDown={(e) => e.preventDefault()} onClick={() => put(ch)}>{ch}</button>)}</div>
      {recent.length > 0 && <><div className="gsd-menu-head">최근에 사용한 기호</div><div className="gsd-symbols">{recent.map((ch) => <button key={ch} onClick={() => put(ch)}>{ch}</button>)}</div></>}
    </Dialog>
  );
}

/* ── 각주 · 인용 · 캡션 ── */
function FootnoteDlg({ x, close, arg }: P) {
  const [t, setT] = useState("");
  const ok = () => {
    if (arg === "end") {
      // 미주 — 문서 끝 [미주] 목록에 번호를 붙여 넣는다
      const ed = x.ed;
      let n = 1;
      ed.state.doc.descendants((nd) => { if (nd.type.name === "text" && nd.marks.some((m) => m.type.name === "superscript") && /^\[\d+\]$/.test(nd.text || "")) n++; });
      ed.chain().focus().insertContent({ type: "text", text: `[${n}]`, marks: [{ type: "superscript" }] }).run();
      ed.chain().insertContentAt(ed.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: `[${n}] ${t}`, marks: [{ type: "textStyle", attrs: { fontSize: "9pt" } }] }] }).run();
    } else x.ed.chain().focus().insertContent({ type: "footnote", attrs: { text: t } }).run();
    close();
  };
  return (
    <Dialog title={arg === "end" ? "미주 삽입" : "각주 삽입"} onClose={close} width={440} foot={okCancel(ok, close, "삽입", !t.trim())}>
      <p className="gsd-muted">{arg === "end" ? "문서 맨 끝에 번호와 함께 들어가요." : "본문에는 작은 * 표시, 문서 끝 [각주] 칸에 내용이 모여요. (워드·한글로 저장하면 진짜 각주로)"}</p>
      <textarea autoFocus rows={3} style={{ width: "100%" }} value={t} onChange={(e) => setT(e.target.value)} />
    </Dialog>
  );
}
function CitationDlg({ x, close }: P) {
  const [a, setA] = useState(""), [title, setTitle] = useState(""), [y, setY] = useState(""), [pub, setPub] = useState("");
  const ok = () => { x.ed.chain().focus().insertContent(` (${[a, y].filter(Boolean).join(", ")})`).run(); x.ed.chain().insertContentAt(x.ed.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: [a, y && `(${y})`, title && `「${title}」`, pub].filter(Boolean).join(" ") }] }).run(); close(); };
  return (
    <Dialog title="원본 만들기 (인용)" onClose={close} width={460} foot={okCancel(ok, close, "확인", !a.trim() && !title.trim())}>
      <div className="gsd-form1">
        <label>저자: <input autoFocus value={a} onChange={(e) => setA(e.target.value)} /></label>
        <label>제목: <input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>연도: <input value={y} onChange={(e) => setY(e.target.value)} /></label>
        <label>출판사·출처: <input value={pub} onChange={(e) => setPub(e.target.value)} /></label>
      </div>
      <p className="gsd-muted">본문에는 (저자, 연도), 문서 끝에 참고 문헌 한 줄이 들어가요.</p>
    </Dialog>
  );
}
function CaptionDlg({ x, close }: P) {
  const [label, setLabel] = useState("그림");
  const [text, setText] = useState("");
  const n = useMemo(() => { let c = 1; x.ed.state.doc.descendants((nd) => { if (nd.isText && new RegExp(`^${label} \\d+`).test(nd.text || "")) c++; }); return c; }, [x.ed, label]);
  const ok = () => { x.ed.chain().focus().insertContent({ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: `${label} ${n}${text ? ` ${text}` : ""}`, marks: [{ type: "textStyle", attrs: { fontSize: "9pt", color: "#44546A" } }, { type: "italic" }] }] }).run(); close(); };
  return (
    <Dialog title="캡션" onClose={close} width={420} foot={okCancel(ok, close)}>
      <div className="gsd-form1">
        <label>레이블(L): <select value={label} onChange={(e) => setLabel(e.target.value)}><option>그림</option><option>표</option><option>사진</option><option>수식</option></select></label>
        <label>캡션(C): <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={`${label} ${n} 다음에 붙는 설명`} /></label>
      </div>
    </Dialog>
  );
}
function CaptionListDlg({ x, close }: P) {
  const ok = () => {
    const items: string[] = [];
    x.ed.state.doc.descendants((nd) => { if (nd.isText && /^(그림|표|사진|수식) \d+/.test(nd.text || "")) items.push(nd.text || ""); });
    x.ed.chain().focus().insertContent([{ type: "paragraph", content: [{ type: "text", text: "그림 목차", marks: [{ type: "bold" }] }] }, ...items.map((t) => ({ type: "paragraph", content: [{ type: "text", text: t }] }))]).run();
    close();
  };
  return <Dialog title="그림 목차 삽입" onClose={close} width={380} foot={okCancel(ok, close)}><p className="gsd-muted">캡션(그림 1 · 표 1 …)을 모아 지금 자리에 목록으로 넣어요.</p></Dialog>;
}

/* ── 디자인 ── */
function WatermarkDlg({ x, close }: P) {
  const [t, setT] = useState(x.page.watermark || "");
  return (
    <Dialog title="워터마크" onClose={close} width={380} foot={okCancel(() => { x.setPage({ watermark: t }); close(); }, close)}>
      <div className="gsd-form1"><label>텍스트(X): <input autoFocus value={t} onChange={(e) => setT(e.target.value)} placeholder="예: 초안 · 대외비" /></label></div>
      <p className="gsd-muted">쪽마다 가운데에 비스듬히 흐리게 찍혀요. (그림·PDF·인쇄에도)</p>
    </Dialog>
  );
}
function ThemeColorDlg({ x, close, arg }: P) {
  // 제목 색 바꾸기 — 지금 서식의 제목 색만 이 문서에서
  const col = String(arg || "#1F3864");
  useEffect(() => {
    const ed = x.ed;
    let tr = ed.state.tr;
    ed.state.doc.descendants((n, pos) => { if (n.type.name === "heading") tr = tr.addMark(pos + 1, pos + n.nodeSize - 1, ed.state.schema.marks.textStyle.create({ color: col })); });
    ed.view.dispatch(tr);
    close();
  }, [x.ed, col, close]);
  return null;
}
function SpacingAllDlg({ x, close, arg }: P) {
  const a = (arg || {}) as { lh: number; sa: number };
  useEffect(() => {
    const ed = x.ed;
    let tr = ed.state.tr;
    ed.state.doc.descendants((n, pos) => { if (n.type.name === "paragraph" || n.type.name === "heading") tr = tr.setNodeMarkup(pos, undefined, { ...n.attrs, lineHeight: a.lh, spaceAfter: a.sa }); });
    ed.view.dispatch(tr);
    close();
  }, [x.ed, a.lh, a.sa, close]);
  return null;
}
function StylesDlg({ x, close }: P) {
  const th = THEMES.find((t) => t.id === x.page.theme) || THEMES[0];
  return (
    <Dialog title="스타일" onClose={close} width={360} foot={btn("닫기", close)}>
      <div className="gsd-list">
        {[["표준", `${x.base.font} ${x.base.size}pt`], ["제목 1", `${th.head} ${th.h1}pt 굵게 · ${th.color}`], ["제목 2", `${th.head} ${th.h2}pt 굵게`], ["제목 3", `${th.head} ${th.h3}pt 굵게`], ["인용", "기울임 · 왼쪽 선"]].map(([n, d]) => (
          <div key={n} className="gsd-kv"><b>{n}</b><span>{d}</span></div>
        ))}
      </div>
      <p className="gsd-muted">디자인 › 문서 서식에서 묶음째 바꾸고, [기본값으로 설정]으로 새 문서에도 쓰세요.</p>
    </Dialog>
  );
}
function InspectDlg({ x, close }: P) {
  const ed = x.ed;
  const res = useMemo(() => {
    let comments = 0, links = 0, foot = 0, images = 0;
    ed.state.doc.descendants((n) => {
      if (n.isText) for (const m of n.marks) { if (m.type.name === "comment") comments++; if (m.type.name === "link") links++; }
      if (n.type.name === "footnote") foot++;
      if (n.type.name === "image") images++;
    });
    return { comments, links, foot, images, hf: Boolean(x.page.header || x.page.footer), wm: Boolean(x.page.watermark) };
  }, [ed, x.page]);
  return (
    <Dialog title="문서 검사" onClose={close} width={420} foot={<>{res.comments > 0 && btn("메모 모두 지우기", () => { x.deleteComment(true); close(); })}{btn("닫기", close)}</>}>
      <div className="gsd-list">
        <div className="gsd-kv"><b>메모</b><span>{res.comments ? `${res.comments}곳` : "없음"}</span></div>
        <div className="gsd-kv"><b>머리글·바닥글</b><span>{res.hf ? "있음" : "없음"}</span></div>
        <div className="gsd-kv"><b>워터마크</b><span>{res.wm ? x.page.watermark : "없음"}</span></div>
        <div className="gsd-kv"><b>링크</b><span>{res.links ? `${res.links}곳` : "없음"}</span></div>
        <div className="gsd-kv"><b>각주</b><span>{res.foot ? `${res.foot}개` : "없음"}</span></div>
        <div className="gsd-kv"><b>그림</b><span>{res.images ? `${res.images}개` : "없음"}</span></div>
      </div>
    </Dialog>
  );
}

/* ── 보기 ── */
function ZoomDlg({ x, close }: P) {
  const [z, setZ] = useState(Math.round(x.zoom * 100));
  return (
    <Dialog title="확대/축소" onClose={close} width={340} foot={okCancel(() => { x.setZoom(z / 100); close(); }, close)}>
      <div className="gsd-form2">
        {[200, 100, 75].map((v) => <label key={v} className="gsd-check"><input type="radio" checked={z === v} onChange={() => setZ(v)} /> {v}%</label>)}
        <label className="gsd-check"><input type="radio" onChange={() => { x.fit("width"); close(); }} /> 페이지 너비</label>
        <label className="gsd-check"><input type="radio" onChange={() => { x.fit("page"); close(); }} /> 전체 페이지</label>
        <label className="gsd-check"><input type="radio" onChange={() => { x.fit("multi"); close(); }} /> 여러 페이지</label>
      </div>
      <label className="gsd-inline" style={{ marginTop: 10 }}>백분율(E): <input type="number" min={10} max={500} value={z} onChange={(e) => setZ(Math.max(10, Math.min(500, Number(e.target.value) || 100)))} /> %</label>
    </Dialog>
  );
}
function WordCountDlg({ x, close }: P) {
  const c = counts(x.ed);
  const sel = selectionWords(x.ed);
  return (
    <Dialog title="단어 개수" onClose={close} width={340} foot={btn("닫기", close, true)}>
      <div className="gsd-list">
        <div className="gsd-kv"><b>페이지</b><span>{x.ed.view.dom.closest(".gsd-root")?.getAttribute("data-pages") || 1}</span></div>
        <div className="gsd-kv"><b>단어</b><span>{c.words.toLocaleString()}{sel ? ` (선택 ${sel})` : ""}</span></div>
        <div className="gsd-kv"><b>문자 (공백 제외)</b><span>{c.charsNoSpace.toLocaleString()}</span></div>
        <div className="gsd-kv"><b>문자 (공백 포함)</b><span>{c.chars.toLocaleString()}</span></div>
        <div className="gsd-kv"><b>단락</b><span>{c.paras.toLocaleString()}</span></div>
        <div className="gsd-kv"><b>줄</b><span>{c.lines.toLocaleString()}</span></div>
        <div className="gsd-kv"><b>원고지 (200자)</b><span>{Math.ceil(c.chars / 200).toLocaleString()}매</span></div>
      </div>
    </Dialog>
  );
}
const KEYS: [string, string][] = [
  ["Ctrl+N", "새 문서"], ["Ctrl+O", "열기"], ["Ctrl+S", "저장"], ["F12", "다른 이름으로 저장"], ["Ctrl+P", "인쇄"], ["Ctrl+Z / Ctrl+Y", "실행 취소 / 다시 실행"],
  ["Ctrl+B / I / U", "굵게 / 기울임 / 밑줄"], ["Ctrl+E / L / R / J", "가운데 / 왼쪽 / 오른쪽 / 양쪽 맞춤"], ["Ctrl+] / Ctrl+[", "글꼴 크게 / 작게"], ["Ctrl+D", "글꼴"],
  ["Ctrl+M / Ctrl+Shift+M", "들여쓰기 / 내어쓰기"], ["Ctrl+1 / 2 / 5", "줄 간격 1 / 2 / 1.5"], ["Ctrl+Alt+1 / 2 / 3", "제목 1 / 2 / 3"], ["Ctrl+Shift+N", "표준 스타일"],
  ["Ctrl+Enter", "페이지 나누기"], ["Shift+Enter", "줄 바꿈"], ["Ctrl+K", "링크"], ["Ctrl+F", "찾기 (탐색 창)"], ["Ctrl+H", "바꾸기"], ["Ctrl+G", "이동"],
  ["Ctrl+Alt+M", "새 메모"], ["Ctrl+Alt+F", "각주"], ["Ctrl+=", "아래 첨자"], ["Ctrl+Shift++", "위 첨자"], ["Ctrl+Shift+8", "편집 기호 표시"], ["Ctrl+휠", "확대/축소"], ["F7", "맞춤법 (AI)"],
];
function HelpDlg({ close, arg }: P) {
  const [tab, setTab] = useState<string>((arg as string) || "start");
  return (
    <Dialog title="도움말" onClose={close} width={560} foot={btn("닫기", close, true)}>
      <div className="gsd-dtabs">{[["start", "시작하기"], ["keys", "바로 가기 키"], ["formats", "파일 형식"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "start" && (
        <div className="gsd-help">
          <p><b>워드와 똑같이</b> — 위 리본의 탭(홈·삽입·디자인·레이아웃…)에서 고르고, [파일]에서 열고·저장하고·인쇄해요.</p>
          <p><b>저장</b> — Ctrl+S. 처음 저장할 때 워드(.docx)·한글(.hwpx) 중 고르세요. 연 파일은 그 형식 그대로 저장돼요.</p>
          <p><b>그림으로</b> — 파일 › 내보내기 › 그림으로 저장. 쪽마다 한 장, 또는 한 장으로 이어 붙여요. 고화질(300dpi)도 돼요.</p>
          <p><b>AI</b> — [AI] 탭. 내 AI(연결한 ChatGPT 등)로 문서를 쓰고 고쳐요. 숫자·사실은 지어내지 않아요.</p>
        </div>
      )}
      {tab === "keys" && <div className="gsd-keys">{KEYS.map(([k, d]) => <div key={k} className="gsd-kv"><b>{k}</b><span>{d}</span></div>)}</div>}
      {tab === "formats" && (
        <div className="gsd-help">
          <p><b>워드 (.docx)</b> — MS 워드 2007 이후, 한글, 구글 문서에서 열려요.</p>
          <p><b>한글 (.hwpx)</b> — 한컴오피스 한글 2014 이후, 한컴 무료 뷰어에서 열려요. 한글 프로그램이 없어도 이 편집기로 열고 고치고 저장해요.</p>
          <p><b>예전 한글 (.hwp)</b> — 한글 97~2010 형식. 앱 안 변환기(Java)를 처음 한 번 받아 열고 저장해요. PC 에 따로 설치하지 않아요.</p>
          <p><b>PDF</b> — 앱에서는 글자가 그대로 살아 있는 PDF(찾기·복사 됨), 웹에서는 그림 PDF 로 저장돼요.</p>
          <p className="gsd-muted">아주 복잡한 서식(글상자 겹침, 도형 그룹, 차트 원본 등)은 그림·표로 바뀌거나 빠질 수 있어요.</p>
        </div>
      )}
    </Dialog>
  );
}

/* ── 한글 변환기 (Java) ── */
function JavaDlg({ close, extra }: P) {
  const [st, setSt] = useState<{ ok: boolean; from?: string; version?: number; tool?: boolean } | null>(null);
  const [busy, setBusy] = useState<{ t: string; f: number } | null>(null);
  const [err, setErr] = useState("");
  const load = React.useCallback(() => { extra.javaStatus().then(setSt); }, [extra]);
  useEffect(() => { load(); }, [load]);
  const install = async () => {
    setErr(""); setBusy({ t: "받을 준비…", f: 0 });
    const r = await extra.javaInstall((t, f) => setBusy({ t, f }));
    setBusy(null);
    if (!r.ok) setErr(r.error || "받지 못했어요");
    load();
  };
  return (
    <Dialog title="한글(.hwp) 변환기" onClose={close} width={460} foot={<>{st?.ok && st.from === "app" && btn("변환기 지우기", async () => { await extra.javaRemove(); load(); })}<span style={{ flex: 1 }} />{!st?.ok && btn(busy ? "받는 중…" : "받기 (약 50MB)", install, true, !!busy)}{btn("닫기", close)}</>}>
      <p>예전 한글(97~2010) <b>.hwp</b> 파일을 열고 저장할 때만 써요. (.hwpx · .docx 는 필요 없어요)</p>
      <p className="gsd-muted">공개 Java(Eclipse Temurin)를 이 앱 폴더에만 받아요. PC 에 설치하거나 설정을 바꾸지 않고, 관리자 권한도 필요 없어요.</p>
      <div className="gsd-info-box">
        {st === null ? "확인하는 중…" : st.ok ? <>✅ 준비됨 — Java {st.version} ({st.from === "app" ? "앱 폴더" : "이 PC 에 설치된 것"}){st.tool === false && <><br />⚠ 변환기 파일이 없어요 — 앱을 새로 받아 주세요</>}</> : "아직 받지 않았어요"}
      </div>
      {busy && <div className="gsd-progress"><div style={{ width: `${Math.round(busy.f * 100)}%` }} /><span>{busy.t}</span></div>}
      {err && <p className="gsd-err">{err}</p>}
    </Dialog>
  );
}

/* ── 그림으로 저장 ── */
function ImagesDlg({ close, extra, x }: P) {
  const [o, setO] = useState<ImgExport>({ fmt: "png", mode: "pages", hi: false, range: "all", custom: "", lib: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    try { await extra.exportImages(o); close(); } catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(false); }
  };
  return (
    <Dialog title="그림으로 저장" onClose={close} width={460} foot={okCancel(go, close, busy ? "만드는 중…" : "저장", busy)}>
      <fieldset className="gsd-fs"><legend>형식</legend>
        <label className="gsd-check" style={{ marginRight: 14 }}><input type="radio" checked={o.fmt === "png"} onChange={() => setO({ ...o, fmt: "png" })} /> PNG (선명 · 글자 문서에 좋음)</label>
        <label className="gsd-check"><input type="radio" checked={o.fmt === "jpg"} onChange={() => setO({ ...o, fmt: "jpg" })} /> JPG (가벼움 · 사진 많을 때)</label>
      </fieldset>
      <fieldset className="gsd-fs"><legend>나누기</legend>
        <label className="gsd-check" style={{ marginRight: 14 }}><input type="radio" checked={o.mode === "pages"} onChange={() => setO({ ...o, mode: "pages" })} /> 쪽마다 한 장씩</label>
        <label className="gsd-check"><input type="radio" checked={o.mode === "one"} onChange={() => setO({ ...o, mode: "one" })} /> 한 장으로 이어 붙이기 (블로그·카톡용 세로 그림)</label>
      </fieldset>
      <fieldset className="gsd-fs"><legend>화질</legend>
        <label className="gsd-check" style={{ marginRight: 14 }}><input type="radio" checked={!o.hi} onChange={() => setO({ ...o, hi: false })} /> 보통 (화면용 · 96dpi)</label>
        <label className="gsd-check"><input type="radio" checked={o.hi} onChange={() => setO({ ...o, hi: true })} /> 고화질 (인쇄용 · 300dpi)</label>
      </fieldset>
      <fieldset className="gsd-fs"><legend>페이지 ({extra.pages}쪽)</legend>
        <label className="gsd-check" style={{ marginRight: 14 }}><input type="radio" checked={o.range === "all"} onChange={() => setO({ ...o, range: "all" })} /> 모두</label>
        <label className="gsd-check" style={{ marginRight: 14 }}><input type="radio" checked={o.range === "current"} onChange={() => setO({ ...o, range: "current" })} /> 현재 페이지 ({extra.curPage})</label>
        <label className="gsd-check"><input type="radio" checked={o.range === "custom"} onChange={() => setO({ ...o, range: "custom" })} /> 지정: <input style={{ width: 90 }} placeholder="1, 3-5" value={o.custom} onChange={(e) => setO({ ...o, range: "custom", custom: e.target.value })} /></label>
      </fieldset>
      {x.isApp && <label className="gsd-check"><input type="checkbox" checked={o.lib} onChange={(e) => setO({ ...o, lib: e.target.checked })} /> 내 자료에도 넣기 (영상·이미지 편집에서 바로 쓰기)</label>}
      {err && <p className="gsd-err">{err}</p>}
    </Dialog>
  );
}

/* ── AI ── */
const AI_MODES: Record<string, { title: string; hint: string; needText: boolean; ph: string }> = {
  write: { title: "AI로 문서 쓰기", hint: "어떤 문서를 쓸지 적어 주세요. 지금 커서 자리에 들어가요.", needText: false, ph: "예: 상가 임대 안내문 (1층, 보증금·월세 칸은 비워 두기)" },
  edit: { title: "고쳐 쓰기", hint: "고른 글(없으면 문서 전체)을 요청대로 고쳐요.", needText: true, ph: "예: 더 정중하게 · 짧게 · 공문 말투로" },
  summary: { title: "요약", hint: "고른 글(없으면 문서 전체)을 짧게 줄여요.", needText: true, ph: "예: 세 줄로" },
  spell: { title: "맞춤법 및 문법", hint: "맞춤법·띄어쓰기·오타만 고쳐요. 내용은 그대로예요.", needText: true, ph: "" },
  "translate-sel": { title: "번역", hint: "고른 글(없으면 문서 전체)을 번역해요.", needText: true, ph: "예: 영어로 · 중국어로 · 일본어로" },
  "translate-doc": { title: "문서 번역", hint: "문서 전체를 번역해요.", needText: true, ph: "예: 영어로" },
  table: { title: "표로 정리", hint: "고른 글을 표로 정리해요.", needText: true, ph: "예: 항목 · 내용 두 칸으로" },
  list: { title: "목록으로 정리", hint: "고른 글을 글머리 목록으로 정리해요.", needText: true, ph: "" },
  synonym: { title: "동의어 사전", hint: "고른 낱말과 뜻이 비슷한 말을 알려 줘요.", needText: true, ph: "" },
};
function AiDlg({ x, close, arg, extra }: P) {
  const mode = String(arg || "write");
  const m = AI_MODES[mode] || AI_MODES.write;
  const ed = x.ed;
  const { from, to, empty } = ed.state.selection;
  const whole = mode === "translate-doc" || (empty && m.needText && mode !== "synonym");
  const text = whole ? ed.state.doc.textBetween(0, ed.state.doc.content.size, "\n", "\n") : ed.state.doc.textBetween(from, to, "\n", "\n");
  const [req, setReq] = useState(mode === "translate-sel" || mode === "translate-doc" ? "영어로" : "");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr(""); setOut("");
    const sendMode = mode.startsWith("translate") ? "translate" : mode === "table" ? "edit" : mode === "list" ? "edit" : mode === "synonym" ? "edit" : mode;
    const extraReq = mode === "table" ? "마크다운 표로 정리해 주세요. " : mode === "list" ? "\"- \" 글머리 목록으로 정리해 주세요. " : mode === "synonym" ? "이 낱말의 동의어·비슷한 말을 \"- \" 목록으로 5~10개 알려 주세요. " : "";
    try { setOut(await extra.aiRun({ mode: sendMode, text, request: extraReq + req })); } catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(false); }
  };
  const apply = (replace: boolean) => {
    const html = mdToHtml(out);
    if (replace && whole) ed.chain().focus().setContent(html).run();
    else if (replace) ed.chain().focus().insertContentAt({ from, to }, html).run();
    else ed.chain().focus().insertContentAt(to, html).run();
    close();
  };
  if (!x.isApp) return <Dialog title={m.title} onClose={close} width={420} foot={btn("닫기", close)}><p>AI 는 공실스튜디오 앱에서 내 AI 를 연결하면 쓸 수 있어요.</p></Dialog>;
  const noText = m.needText && !text.trim();
  return (
    <Dialog title={m.title} onClose={close} width={600} foot={out ? <>{mode !== "write" && mode !== "synonym" && btn(whole ? "문서 바꾸기" : "선택 영역 바꾸기", () => apply(true), true)}{btn(mode === "write" ? "삽입" : "아래에 넣기", () => apply(false), mode === "write")}{btn("다시", run)}{btn("닫기", close)}</> : <>{btn(busy ? "쓰는 중…" : "실행", run, true, busy || noText)}{btn("닫기", close)}</>}>
      <p className="gsd-muted">{m.hint}{m.needText && !noText && ` (${whole ? "문서 전체" : "고른 글"} ${text.length.toLocaleString()}자)`}</p>
      {noText && <p className="gsd-err">문서에 글이 없어요.</p>}
      {(m.ph || mode === "write") && <textarea autoFocus rows={3} style={{ width: "100%" }} placeholder={m.ph} value={req} onChange={(e) => setReq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) run(); }} />}
      {busy && <div className="gsd-progress indeterminate"><div /><span>내 AI 가 쓰고 있어요…</span></div>}
      {err && <p className="gsd-err">{err}</p>}
      {out && <div className="gsd-ai-out" dangerouslySetInnerHTML={{ __html: mdToHtml(out) }} />}
    </Dialog>
  );
}

/* ── 그리기 캔버스 ── */
type Stroke = { pts: [number, number][]; color: string; width: number; alpha: number };
function DrawDlg({ x, close, arg }: P) {
  const a = (arg || {}) as { color?: string; width?: number; alpha?: number; eraser?: boolean; shapes?: boolean };
  const cv = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState({ color: a.color || "#000000", width: a.width || 3, alpha: a.alpha || 1, eraser: !!a.eraser });
  const [toShape, setToShape] = useState(!!a.shapes);
  const cur = useRef<Stroke | null>(null);
  const W = 640, H = 400;
  const draw = React.useCallback((list: Stroke[]) => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, W, H);
    for (const s of list) {
      g.globalAlpha = s.alpha;
      g.strokeStyle = s.color;
      g.lineWidth = s.width;
      g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath();
      s.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    }
    g.globalAlpha = 1;
  }, []);
  useEffect(() => { draw(strokes); }, [strokes, draw]);
  const pos = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height] as [number, number]; };
  const down = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (tool.eraser) { erase(pos(e)); return; }
    cur.current = { pts: [pos(e)], color: tool.color, width: tool.width, alpha: tool.alpha };
  };
  const erase = (p: [number, number]) => setStrokes((l) => l.filter((s) => !s.pts.some(([px, py]) => Math.hypot(px - p[0], py - p[1]) < 10)));
  const move = (e: React.PointerEvent) => {
    if (tool.eraser && e.buttons) { erase(pos(e)); return; }
    if (!cur.current) return;
    cur.current.pts.push(pos(e));
    draw([...strokes, cur.current]);
  };
  const up = () => {
    if (!cur.current) return;
    let s = cur.current;
    cur.current = null;
    if (toShape) s = shapeOf(s);
    setStrokes((l) => [...l, s]);
  };
  const insert = () => {
    if (!strokes.length) return close();
    // 그린 곳만 잘라 PNG 로
    const xs = strokes.flatMap((s) => s.pts.map((p) => p[0])), ys = strokes.flatMap((s) => s.pts.map((p) => p[1]));
    const pad = 12;
    const x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad), x1 = Math.min(W, Math.max(...xs) + pad), y1 = Math.min(H, Math.max(...ys) + pad);
    const out = document.createElement("canvas");
    const k = 2;
    out.width = (x1 - x0) * k; out.height = (y1 - y0) * k;
    out.getContext("2d")!.drawImage(cv.current!, x0, y0, x1 - x0, y1 - y0, 0, 0, out.width, out.height);
    x.ed.chain().focus().insertContent({ type: "image", attrs: { src: out.toDataURL("image/png"), alt: "그림", width: Math.round(x1 - x0), height: Math.round(y1 - y0), align: "center" } }).run();
    close();
  };
  const PENS = [{ c: "#000000", w: 3, a: 1, n: "검정 펜" }, { c: "#E00000", w: 3, a: 1, n: "빨간 펜" }, { c: "#0050D0", w: 3, a: 1, n: "파란 펜" }, { c: "#0E7A4B", w: 3, a: 1, n: "녹색 펜" }, { c: "#FFE600", w: 14, a: 0.45, n: "형광펜" }];
  return (
    <Dialog title="그리기 캔버스" onClose={close} width={700} foot={<><button className="gsd-btn" onClick={() => setStrokes([])}>모두 지우기</button><button className="gsd-btn" onClick={() => setStrokes((l) => l.slice(0, -1))}>실행 취소</button><span style={{ flex: 1 }} /><button className="gsd-btn primary" onClick={() => insert()}>문서에 넣기</button><button className="gsd-btn" onClick={close}>취소</button></>}>
      <div className="gsd-chips">
        {PENS.map((p) => <button key={p.n} className={`gsd-btn${!tool.eraser && tool.color === p.c ? " primary" : ""}`} onClick={() => setTool({ color: p.c, width: p.w, alpha: p.a, eraser: false })}><span className="gsd-sw" style={{ background: p.c, display: "inline-block", marginRight: 4, verticalAlign: -3 }} />{p.n}</button>)}
        <button className={`gsd-btn${tool.eraser ? " primary" : ""}`} onClick={() => setTool({ ...tool, eraser: true })}>지우개</button>
        <label className="gsd-inline">굵기 <input type="range" min={1} max={30} value={tool.width} onChange={(e) => setTool({ ...tool, width: Number(e.target.value) })} /></label>
        <input type="color" value={tool.color} onChange={(e) => setTool({ ...tool, color: e.target.value, eraser: false, alpha: 1 })} />
        <label className="gsd-check"><input type="checkbox" checked={toShape} onChange={(e) => setToShape(e.target.checked)} /> 잉크를 도형으로</label>
      </div>
      <canvas ref={cv} width={W} height={H} className="gsd-draw" onPointerDown={down} onPointerMove={move} onPointerUp={up} style={{ cursor: tool.eraser ? "cell" : "crosshair" }} />
    </Dialog>
  );
}
/** 잉크를 도형으로 — 닫힌 선은 원·사각형·삼각형, 곧은 선은 직선 */
function shapeOf(s: Stroke): Stroke {
  const pts = s.pts;
  if (pts.length < 5) return s;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = x1 - x0, h = y1 - y0, diag = Math.hypot(w, h);
  const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
  const closed = Math.hypot(ex - sx, ey - sy) < diag * 0.25;
  if (!closed) {
    // 곧은 선인지 — 시작·끝 잇는 선에서 멀어진 정도
    const L = Math.hypot(ex - sx, ey - sy) || 1;
    const dev = Math.max(...pts.map(([px, py]) => Math.abs((ey - sy) * px - (ex - sx) * py + ex * sy - ey * sx) / L));
    return dev < L * 0.08 ? { ...s, pts: [[sx, sy], [ex, ey]] } : s;
  }
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; area += ax * by - bx * ay; }
  const fill = Math.abs(area / 2) / Math.max(1, w * h);
  if (fill > 0.86) return { ...s, pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]] };
  if (fill > 0.62) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; return { ...s, pts: Array.from({ length: 49 }, (_, i) => [cx + (w / 2) * Math.cos((i / 48) * Math.PI * 2), cy + (h / 2) * Math.sin((i / 48) * Math.PI * 2)] as [number, number]) }; }
  return { ...s, pts: [[(x0 + x1) / 2, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, y0]] };
}

/* ── 차트 — 회원이 적은 값으로 막대·꺾은선·원형 그림 ── */
function ChartDlg({ x, close }: P) {
  const [kind, setKind] = useState<"bar" | "line" | "pie">("bar");
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<{ label: string; value: string }[]>([{ label: "", value: "" }, { label: "", value: "" }, { label: "", value: "" }]);
  const cv = useRef<HTMLCanvasElement>(null);
  const data = useMemo(() => rows.filter((r) => r.label.trim() && r.value.trim() && Number.isFinite(Number(r.value.replace(/,/g, "")))).map((r) => ({ label: r.label.trim(), v: Number(r.value.replace(/,/g, "")) })), [rows]);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const W = c.width, H = c.height;
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.font = "bold 22px 'Malgun Gothic', sans-serif"; g.fillStyle = "#222"; g.textAlign = "center";
    if (title) g.fillText(title, W / 2, 34);
    if (!data.length) { g.font = "16px 'Malgun Gothic'"; g.fillStyle = "#999"; g.fillText("왼쪽에 이름과 값을 적으면 차트가 그려져요", W / 2, H / 2); return; }
    const COLORS = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47", "#264478", "#9E480E"];
    const top = title ? 60 : 24, bottom = H - 50, left = 70, right = W - 24;
    g.font = "14px 'Malgun Gothic', sans-serif";
    if (kind === "pie") {
      const total = data.reduce((s, d) => s + Math.max(0, d.v), 0) || 1;
      const cx = W / 2 - 90, cy = (top + bottom) / 2 + 10, r = Math.min(150, (bottom - top) / 2);
      let a0 = -Math.PI / 2;
      data.forEach((d, i) => {
        const a1 = a0 + (Math.max(0, d.v) / total) * Math.PI * 2;
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath(); g.fillStyle = COLORS[i % COLORS.length]; g.fill();
        g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
        a0 = a1;
        g.fillStyle = COLORS[i % COLORS.length]; g.fillRect(W - 220, top + 10 + i * 26, 14, 14);
        g.fillStyle = "#333"; g.textAlign = "left"; g.fillText(`${d.label} (${Math.round((d.v / total) * 1000) / 10}%)`, W - 200, top + 22 + i * 26);
      });
      return;
    }
    const max = Math.max(...data.map((d) => d.v), 0), min = Math.min(0, ...data.map((d) => d.v));
    const span = max - min || 1;
    const yOf = (v: number) => bottom - ((v - min) / span) * (bottom - top);
    g.strokeStyle = "#D9D9D9"; g.lineWidth = 1; g.textAlign = "right"; g.fillStyle = "#595959";
    for (let i = 0; i <= 5; i++) { const v = min + (span * i) / 5; const y = yOf(v); g.beginPath(); g.moveTo(left, y); g.lineTo(right, y); g.stroke(); g.fillText(String(Math.round(v * 100) / 100), left - 8, y + 5); }
    const step = (right - left) / data.length;
    g.textAlign = "center";
    if (kind === "bar") data.forEach((d, i) => { const bx = left + step * i + step * 0.2; g.fillStyle = COLORS[0]; g.fillRect(bx, Math.min(yOf(d.v), yOf(0)), step * 0.6, Math.abs(yOf(d.v) - yOf(0))); g.fillStyle = "#333"; g.fillText(d.label, left + step * (i + 0.5), bottom + 22); });
    else {
      g.strokeStyle = COLORS[0]; g.lineWidth = 3; g.beginPath();
      data.forEach((d, i) => { const px = left + step * (i + 0.5), py = yOf(d.v); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
      data.forEach((d, i) => { const px = left + step * (i + 0.5), py = yOf(d.v); g.fillStyle = COLORS[0]; g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill(); g.fillStyle = "#333"; g.fillText(d.label, px, bottom + 22); });
    }
  }, [kind, title, data]);
  const ok = () => {
    if (!data.length || !cv.current) return;
    x.ed.chain().focus().insertContent({ type: "image", attrs: { src: cv.current.toDataURL("image/png"), alt: title || "차트", width: 560, height: 350, align: "center" } }).run();
    close();
  };
  return (
    <Dialog title="차트 삽입" onClose={close} width={860} foot={<><button className="gsd-btn primary" disabled={!data.length} onClick={() => ok()}>삽입</button><button className="gsd-btn" onClick={close}>취소</button></>}>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 250 }}>
          <div className="gsd-chips">{(["bar", "line", "pie"] as const).map((k) => <button key={k} className={`gsd-btn${kind === k ? " primary" : ""}`} onClick={() => setKind(k)}>{k === "bar" ? "세로 막대" : k === "line" ? "꺾은선" : "원형"}</button>)}</div>
          <label className="gsd-form1">차트 제목: <input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="gsd-chart-rows">
            <div className="gsd-chart-row head"><span>이름</span><span>값</span></div>
            {rows.map((r, i) => (
              <div key={i} className="gsd-chart-row">
                <input value={r.label} onChange={(e) => setRows(rows.map((q, k) => (k === i ? { ...q, label: e.target.value } : q)))} />
                <input value={r.value} inputMode="decimal" onChange={(e) => setRows(rows.map((q, k) => (k === i ? { ...q, value: e.target.value } : q)))} />
              </div>
            ))}
            <button className="gsd-btn" onClick={() => setRows([...rows, { label: "", value: "" }])}>+ 줄 더하기</button>
          </div>
        </div>
        <canvas ref={cv} width={800} height={500} style={{ flex: 1, width: 560, height: 350, border: "1px solid #ddd" }} />
      </div>
    </Dialog>
  );
}
