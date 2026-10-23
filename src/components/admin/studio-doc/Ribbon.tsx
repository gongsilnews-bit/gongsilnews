"use client";
// 문서편집 — 리본 (워드와 같은 탭 · 그룹): 홈 · 삽입 · 그리기 · 디자인 · 레이아웃 · 참조 · 편지 · 검토 · 보기 · 도움말 · AI
//  + 표를 고르면 [표 디자인] [표 레이아웃], 그림을 고르면 [그림 서식] 탭이 더 나온다 (워드처럼)
import React from "react";
import type { Editor } from "@tiptap/core";
import {
  RiClipboardLine, RiScissorsCutLine, RiFileCopyLine, RiBrushLine, RiBold, RiItalic, RiUnderline, RiStrikethrough, RiSubscript, RiSuperscript,
  RiFontColor, RiMarkPenLine, RiFormatClear, RiListUnordered, RiListOrdered, RiIndentDecrease, RiIndentIncrease, RiAlignLeft, RiAlignCenter,
  RiAlignRight, RiAlignJustify, RiLineHeight, RiPaintFill, RiSearchLine, RiFindReplaceLine, RiCursorLine, RiPagesLine, RiFileAddLine, RiTableLine,
  RiImageLine, RiShapesLine, RiEmotionLine, RiLinkM, RiChatNewLine, RiLayoutTopLine, RiLayoutBottomLine, RiHashtag, RiCalendarLine, RiOmega,
  RiPenNibLine, RiEraserLine, RiPaletteLine, RiDropLine, RiFontSize2, RiParagraph, RiSortAsc, RiFileTextLine, RiLayoutColumnLine,
  RiSeparator, RiPageSeparator, RiBookOpenLine, RiFileList3Line, RiStickyNoteLine, RiQuestionLine, RiKeyboardLine, RiFeedbackLine, RiTranslate2,
  RiCheckboxCircleLine, RiDeleteBinLine, RiArrowLeftSLine, RiArrowRightSLine, RiLockLine, RiZoomInLine, RiFileWord2Line, RiGlobalLine, RiBookReadLine,
  RiRulerLine, RiGridLine, RiLayoutLeftLine, RiFullscreenLine, RiPagesFill, RiSparkling2Line, RiQuillPenLine, RiFileEditLine, RiTextWrap,
  RiInsertRowTop, RiInsertRowBottom, RiInsertColumnLeft, RiInsertColumnRight, RiDeleteRow, RiDeleteColumn, RiMergeCellsHorizontal, RiSplitCellsHorizontal,
  RiLayoutTop2Line, RiAlignTop, RiAlignVertically, RiAlignBottom, RiCheckboxBlankLine, RiSquareLine, RiText, RiMailLine, RiContactsBook2Line, RiFileUserLine,
  RiBookmarkLine, RiListCheck2, RiDoubleQuotesL, RiFlowChart, RiFormula, RiMailSendLine, RiUserSearchLine, RiTimeLine, RiCheckDoubleLine,
  RiFileShield2Line, RiDraftLine, RiArticleLine, RiFileSearchLine, RiImageEditLine, RiCropLine, RiRefreshLine, RiAspectRatioLine,
} from "react-icons/ri";
import { Big, Small, Group, Col, Row, Item, MenuSep, MenuHead, ColorMenu, HighlightMenu, Combo, FontCombo, Spin, TableGrid, Gallery, Sep } from "./ui";
import { FONTS, SIZES, PAPERS, MARGINS, THEMES, type PageSetup } from "./model";
import {
  cmd, chainCmd, curText, growFont, changeCase, clearAll, STYLES, applyStyle, currentStyle, painterTake, sortParagraphs,
  SHAPES, shapeSvg, pictoSvg, insertSvgImage, coverPage, headings, setFontSize, insertTableHere,
} from "./actions";
import { PICTOS } from "../studio-photo/pictos";

export type ViewMode = "print" | "web" | "read";
export type Ctl = {
  ed: Editor;
  page: PageSetup;
  setPage: (p: Partial<PageSetup>) => void;
  base: { font: string; size: number };
  setBase: (b: { font?: string; size?: number }) => void;
  open: (dlg: string, arg?: unknown) => void;
  isApp: boolean;
  zoom: number; setZoom: (z: number) => void; fit: (k: "width" | "page" | "multi") => void;
  view: ViewMode; setView: (v: ViewMode) => void;
  ruler: boolean; setRuler: (b: boolean) => void;
  nav: boolean; setNav: (b: boolean) => void;
  marks: boolean; setMarks: (b: boolean) => void;
  grid: boolean; setGrid: (b: boolean) => void;
  comments: boolean; setComments: (b: boolean) => void;
  readOnly: boolean; setReadOnly: (b: boolean) => void;
  painter: boolean; setPainter: (b: boolean) => void;
  pickImages: () => void;
  paste: (mode: "keep" | "text") => void;
  ai: (mode: string) => void;
  newComment: () => void;
  stepComment: (dir: 1 | -1) => void;
  deleteComment: (all?: boolean) => void;
  stepFootnote: () => void;
  wordCount: () => void;
  saveDefault: () => void;
};

const keep = (e: React.MouseEvent) => e.preventDefault();
const c = (x: Ctl) => chainCmd(x.ed);

/* ───────────────────────── 홈 ───────────────────────── */
function HomeTab({ x }: { x: Ctl }) {
  const ed = x.ed;
  const t = curText(ed, x.base.font, x.base.size);
  const hl = ed.getAttributes("highlight").color as string | undefined;
  const style = currentStyle(ed);
  const align = (["left", "center", "right", "justify"] as const).find((a) => ed.isActive({ textAlign: a })) || "left";
  const lists = (fmt: string) => ed.chain().focus().toggleOrderedList().updateAttributes("orderedList", { kind: fmt }).run();
  return (
    <>
      <Group label="클립보드">
        <Big icon={RiClipboardLine} label="붙여넣기" onClick={() => x.paste("keep")} menu={(close) => (
          <>
            <MenuHead>붙여넣기 옵션:</MenuHead>
            <Item icon={RiClipboardLine} label="원본 서식 유지" onClick={() => { x.paste("keep"); close(); }} />
            <Item icon={RiFileTextLine} label="텍스트만 유지" onClick={() => { x.paste("text"); close(); }} />
          </>
        )} />
        <Col>
          <Small icon={RiScissorsCutLine} label="잘라내기" title="잘라내기 (Ctrl+X)" onClick={() => { ed.commands.focus(); document.execCommand("cut"); }} />
          <Small icon={RiFileCopyLine} label="복사" title="복사 (Ctrl+C)" onClick={() => { ed.commands.focus(); document.execCommand("copy"); }} />
          <Small icon={RiBrushLine} label="서식 복사" on={x.painter} title="서식 복사 — 서식을 담고, 바꿀 글을 끌어 고르세요" onClick={() => { if (x.painter) x.setPainter(false); else { painterTake(ed); x.setPainter(true); } }} />
        </Col>
      </Group>
      <Group label="글꼴" launcher={() => x.open("font")}>
        <Col gap={4}>
          <Row gap={3}>
            <FontCombo value={t.font} width={130} base={FONTS} onPick={(v) => c(x).setFontFamily(v).run()} />
            <Combo value={String(t.size)} width={52} title="글꼴 크기" options={SIZES.map((s) => ({ v: String(s) }))} onPick={(v) => { const n = parseFloat(v); if (n > 0 && n <= 1638) setFontSize(ed, n); }} />
            <Small iconEl={<span className="gsd-aa">A<sup>▲</sup></span>} title="글꼴 크기 크게 (Ctrl+])" onClick={() => growFont(ed, 1, t.size)} />
            <Small iconEl={<span className="gsd-aa small">A<sup>▼</sup></span>} title="글꼴 크기 작게 (Ctrl+[)" onClick={() => growFont(ed, -1, t.size)} />
            <Small iconEl={<span className="gsd-aa">Aa</span>} title="대/소문자 바꾸기" menu={(close) => (
              <>
                {([["sentence", "문장의 첫 글자를 대문자로."], ["lower", "소문자"], ["upper", "대문자"], ["title", "각 단어를 대문자로"], ["toggle", "대/소문자 전환"], ["half", "반자"], ["full", "전자"]] as const).map(([m, l]) => (
                  <Item key={m} label={l} onClick={() => { changeCase(ed, m); close(); }} />
                ))}
              </>
            )} />
            <Small icon={RiFormatClear} title="모든 서식 지우기" onClick={() => clearAll(ed)} />
          </Row>
          <Row gap={1}>
            <Small icon={RiBold} title="굵게 (Ctrl+B)" on={ed.isActive("bold")} onClick={() => c(x).toggleBold().run()} />
            <Small icon={RiItalic} title="기울임꼴 (Ctrl+I)" on={ed.isActive("italic")} onClick={() => c(x).toggleItalic().run()} />
            <Small icon={RiUnderline} title="밑줄 (Ctrl+U)" on={ed.isActive("underline")} onClick={() => c(x).toggleUnderline().run()} />
            <Small icon={RiStrikethrough} title="취소선" on={ed.isActive("strike")} onClick={() => c(x).toggleStrike().run()} />
            <Small icon={RiSubscript} title="아래 첨자 (Ctrl+=)" on={ed.isActive("subscript")} onClick={() => c(x).toggleSubscript().run()} />
            <Small icon={RiSuperscript} title="위 첨자 (Ctrl+Shift++)" on={ed.isActive("superscript")} onClick={() => c(x).toggleSuperscript().run()} />
            <Sep />
            <Small icon={RiMarkPenLine} title="텍스트 강조 색" bar={hl || "#FFFF00"} onClick={() => (hl ? c(x).unsetHighlight().run() : c(x).setHighlight({ color: "#FFFF00" }).run())}
              menu={(close) => <HighlightMenu close={close} onPick={(col) => (col ? c(x).setHighlight({ color: col }).run() : c(x).unsetHighlight().run())} />} />
            <Small icon={RiFontColor} title="글꼴 색" bar={t.color || "#C00000"} onClick={() => c(x).setColor(t.color || "#C00000").run()}
              menu={(close) => <ColorMenu close={close} onPick={(col) => (col ? c(x).setColor(col).run() : c(x).unsetColor().run())} />} />
            <Small icon={RiDropLine} title="문자 음영" on={!!ed.getAttributes("textStyle").backgroundColor} onClick={() => (ed.getAttributes("textStyle").backgroundColor ? c(x).unsetBackgroundColor().run() : c(x).setBackgroundColor("#D9D9D9").run())} />
          </Row>
        </Col>
      </Group>
      <Group label="단락" launcher={() => x.open("paragraph")}>
        <Col gap={4}>
          <Row gap={1}>
            <Small icon={RiListUnordered} title="글머리 기호" on={ed.isActive("bulletList")} onClick={() => c(x).toggleBulletList().run()} menu={(close) => (
              <>
                <MenuHead>글머리 기호 라이브러리</MenuHead>
                <div className="gsd-bullets">
                  {[["disc", "●"], ["circle", "○"], ["square", "■"], ["check", "✓"], ["arrow", "➢"], ["diamond", "◆"]].map(([k, ch]) => (
                    <button key={k} onMouseDown={keep} onClick={() => { if (!ed.isActive("bulletList")) c(x).toggleBulletList().run(); cmd(ed).updateAttributes("bulletList", { bullet: k }); close(); }}>{ch}</button>
                  ))}
                </div>
                <MenuSep />
                <Item label="목록 수준 늘리기" onClick={() => { c(x).sinkListItem("listItem").run(); close(); }} />
                <Item label="목록 수준 줄이기" onClick={() => { c(x).liftListItem("listItem").run(); close(); }} />
              </>
            )} />
            <Small icon={RiListOrdered} title="번호 매기기" on={ed.isActive("orderedList")} onClick={() => c(x).toggleOrderedList().run()} menu={(close) => (
              <>
                <MenuHead>번호 매기기 라이브러리</MenuHead>
                <div className="gsd-numbers">
                  {[["1", "1.\n2.\n3."], ["가", "가.\n나.\n다."], ["a", "a.\nb.\nc."], ["A", "A.\nB.\nC."], ["i", "i.\nii.\niii."], ["I", "I.\nII.\nIII."], ["①", "①\n②\n③"]].map(([k, s]) => (
                    <button key={k} onMouseDown={keep} onClick={() => { if (!ed.isActive("orderedList")) lists(k); else cmd(ed).updateAttributes("orderedList", { kind: k }); close(); }}>{s}</button>
                  ))}
                </div>
                <MenuSep />
                <Item label="번호 다시 매기기 (1부터)" onClick={() => { cmd(ed).updateAttributes("orderedList", { start: 1 }); close(); }} />
              </>
            )} />
            <Small icon={RiListCheck2} title="다단계 목록" menu={(close) => (
              <>
                <MenuHead>목록 수준</MenuHead>
                <Item label="수준 늘리기 (Tab)" onClick={() => { c(x).sinkListItem("listItem").run(); close(); }} />
                <Item label="수준 줄이기 (Shift+Tab)" onClick={() => { c(x).liftListItem("listItem").run(); close(); }} />
              </>
            )} />
            <Sep />
            <Small icon={RiIndentDecrease} title="내어쓰기" onClick={() => (ed.isActive("listItem") ? c(x).liftListItem("listItem").run() : cmd(ed).indentLess())} />
            <Small icon={RiIndentIncrease} title="들여쓰기" onClick={() => (ed.isActive("listItem") ? c(x).sinkListItem("listItem").run() : cmd(ed).indentMore())} />
            <Sep />
            <Small icon={RiSortAsc} title="정렬 (가나다순)" menu={(close) => (<><Item label="오름차순 (ㄱ→ㅎ, A→Z)" onClick={() => { sortParagraphs(ed); close(); }} /><Item label="내림차순 (ㅎ→ㄱ, Z→A)" onClick={() => { sortParagraphs(ed, true); close(); }} /></>)} />
            <Small icon={RiParagraph} title="편집 기호 표시/숨기기 (Ctrl+*)" on={x.marks} onClick={() => x.setMarks(!x.marks)} />
          </Row>
          <Row gap={1}>
            <Small icon={RiAlignLeft} title="왼쪽 맞춤 (Ctrl+L)" on={align === "left"} onClick={() => c(x).setTextAlign("left").run()} />
            <Small icon={RiAlignCenter} title="가운데 맞춤 (Ctrl+E)" on={align === "center"} onClick={() => c(x).setTextAlign("center").run()} />
            <Small icon={RiAlignRight} title="오른쪽 맞춤 (Ctrl+R)" on={align === "right"} onClick={() => c(x).setTextAlign("right").run()} />
            <Small icon={RiAlignJustify} title="양쪽 맞춤 (Ctrl+J)" on={align === "justify"} onClick={() => c(x).setTextAlign("justify").run()} />
            <Sep />
            <Small icon={RiLineHeight} title="줄 및 단락 간격" menu={(close) => (
              <>
                {[1, 1.15, 1.5, 2, 2.5, 3].map((v) => <Item key={v} label={v.toFixed(v % 1 ? 2 : 1).replace(/0$/, "")} on={ed.getAttributes("paragraph").lineHeight === v} onClick={() => { cmd(ed).setParagraphAttrs({ lineHeight: v }); close(); }} />)}
                <MenuSep />
                <Item label="줄 간격 옵션…" onClick={() => { x.open("paragraph"); close(); }} />
                <MenuSep />
                <Item label="단락 앞에 공백 추가" onClick={() => { cmd(ed).setParagraphAttrs({ spaceBefore: 12 }); close(); }} />
                <Item label="단락 뒤에 공백 제거" onClick={() => { cmd(ed).setParagraphAttrs({ spaceAfter: 0 }); close(); }} />
              </>
            )} />
            <Small icon={RiPaintFill} title="음영" bar={ed.getAttributes("paragraph").shading || ""} menu={(close) => <ColorMenu close={close} none="색 없음" onPick={(col) => cmd(ed).setParagraphAttrs({ shading: col })} />}
              onClick={() => cmd(ed).setParagraphAttrs({ shading: ed.getAttributes("paragraph").shading ? null : "#F2F2F2" })} />
            <Small icon={RiCheckboxBlankLine} title="테두리" menu={(close) => (
              <>
                <Item label="아래쪽 테두리" onClick={() => { cmd(ed).setParagraphAttrs({ border: "bottom" }); close(); }} />
                <Item label="위쪽 테두리" onClick={() => { cmd(ed).setParagraphAttrs({ border: "top" }); close(); }} />
                <Item label="바깥쪽 테두리" onClick={() => { cmd(ed).setParagraphAttrs({ border: "box" }); close(); }} />
                <Item label="테두리 없음" onClick={() => { cmd(ed).setParagraphAttrs({ border: null }); close(); }} />
                <MenuSep />
                <Item label="가로줄" onClick={() => { c(x).setHorizontalRule().run(); close(); }} />
                <Item label="표 그리기 (표 삽입)" onClick={() => { x.open("table"); close(); }} />
              </>
            )} onClick={() => cmd(ed).setParagraphAttrs({ border: ed.getAttributes("paragraph").border ? null : "bottom" })} />
          </Row>
        </Col>
      </Group>
      <Group label="스타일" launcher={() => x.open("styles")}>
        <Gallery rows={1}>
          {STYLES.slice(0, 8).map((s) => (
            <button key={s.id} className={`gsd-style${style === s.id ? " on" : ""}`} onMouseDown={keep} onClick={() => applyStyle(ed, s.id)} title={s.name}>
              <span className="gsd-style-pv" style={s.preview}>가나다AaBb</span>
              <span className="gsd-style-nm">{s.name}</span>
            </button>
          ))}
        </Gallery>
      </Group>
      <Group label="편집">
        <Col>
          <Small icon={RiSearchLine} label="찾기" title="찾기 (Ctrl+F)" onClick={() => x.setNav(true)} menu={(close) => (<><Item icon={RiSearchLine} label="찾기" hint="Ctrl+F" onClick={() => { x.setNav(true); close(); }} /><Item icon={RiFileSearchLine} label="고급 찾기…" onClick={() => { x.open("replace", "find"); close(); }} /><Item label="이동…" hint="Ctrl+G" onClick={() => { x.open("replace", "goto"); close(); }} /></>)} />
          <Small icon={RiFindReplaceLine} label="바꾸기" title="바꾸기 (Ctrl+H)" onClick={() => x.open("replace", "replace")} />
          <Small icon={RiCursorLine} label="선택" title="선택" menu={(close) => (<><Item label="모두 선택" hint="Ctrl+A" onClick={() => { c(x).selectAll().run(); close(); }} /><Item label="개체 선택 (그림)" onClick={() => { close(); }} /></>)} />
        </Col>
      </Group>
    </>
  );
}

/* ───────────────────────── 삽입 ───────────────────────── */
function InsertTab({ x }: { x: Ctl }) {
  const ed = x.ed;
  const [shapeColor] = React.useState({ fill: "#4472C4", line: "#2F528F" });
  return (
    <>
      <Group label="페이지">
        <Col>
          <Small icon={RiFileWord2Line} label="표지" menu={(close) => (
            <>
              <MenuHead>기본 제공</MenuHead>
              {([["basic", "기본 (가운데 제목)"], ["band", "띠 (색 띠 제목)"], ["report", "보고서 (제목 밑줄)"]] as const).map(([k, l]) => (
                <Item key={k} label={l} onClick={() => { ed.chain().focus().insertContentAt(0, coverPage(k)).run(); close(); }} />
              ))}
            </>
          )} />
          <Small icon={RiFileAddLine} label="빈 페이지" onClick={() => c(x).insertContent([{ type: "pageBreak" }, { type: "paragraph" }, { type: "pageBreak" }, { type: "paragraph" }]).run()} />
          <Small icon={RiPageSeparator} label="페이지 나누기" title="페이지 나누기 (Ctrl+Enter)" onClick={() => cmd(ed).insertPageBreak()} />
        </Col>
      </Group>
      <Group label="표">
        <Big icon={RiTableLine} label="표" menu={(close) => (
          <>
            <TableGrid onPick={(r, col) => { insertTableHere(ed, r, col); close(); }} />
            <MenuSep />
            <Item icon={RiTableLine} label="표 삽입…" onClick={() => { x.open("table"); close(); }} />
            <Item label="텍스트를 표로 변환…" onClick={() => { x.open("textToTable"); close(); }} />
            <Item label="빠른 표 — 매물 정보" onClick={() => { insertQuickTable(ed, "listing"); close(); }} />
            <Item label="빠른 표 — 일정표" onClick={() => { insertQuickTable(ed, "schedule"); close(); }} />
          </>
        )} />
      </Group>
      <Group label="일러스트레이션">
        <Big icon={RiImageLine} label="그림" menu={(close) => (
          <>
            <MenuHead>다음에서 그림 삽입</MenuHead>
            <Item icon={RiImageLine} label="이 디바이스…" onClick={() => { x.pickImages(); close(); }} />
            <Item icon={RiGlobalLine} label="온라인 그림 (주소)…" onClick={() => { x.open("imageUrl"); close(); }} />
          </>
        )} />
        <Big icon={RiShapesLine} label="도형" menu={(close) => (
          <div style={{ padding: 6, width: 260 }}>
            <MenuHead>기본 도형</MenuHead>
            <div className="gsd-shapes">
              {SHAPES.map((s) => (
                <button key={s.id} title={s.name} onMouseDown={keep} onClick={() => { insertSvgImage(ed, shapeSvg(s.id, shapeColor.fill, shapeColor.line), s.name); close(); }}>
                  <svg viewBox={`0 0 ${s.w || 100} ${s.h || 70}`} width="26" height="20"><path d={s.d} fill={s.stroke ? "none" : "#DAE3F3"} stroke="#2F528F" strokeWidth={s.stroke ? 5 : 3} /></svg>
                </button>
              ))}
            </div>
            <MenuSep />
            <Item label="새 그리기 캔버스" onClick={() => { x.open("draw"); close(); }} />
          </div>
        )} />
        <Big icon={RiEmotionLine} label="아이콘" menu={(close) => (
          <div style={{ padding: 6, width: 300 }}>
            <MenuHead>부동산 아이콘 (선)</MenuHead>
            <div className="gsd-icons">
              {PICTOS.map((p) => (
                <button key={p.id} title={p.name} onMouseDown={keep} onClick={() => { insertSvgImage(ed, pictoSvg(p.id, "#1F3864"), p.name); close(); }}>
                  <svg viewBox="0 0 24 24" width="22" height="22"><path d={p.d} fill="none" stroke="#1F3864" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              ))}
            </div>
            <MenuHead>원 안 아이콘</MenuHead>
            <div className="gsd-icons">
              {PICTOS.slice(0, 20).map((p) => (
                <button key={p.id} title={p.name} onMouseDown={keep} onClick={() => { insertSvgImage(ed, pictoSvg(p.id, "#1A3A6B", true), p.name); close(); }}>
                  <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="12" fill="#1A3A6B" /><g transform="translate(4 4) scale(0.6667)"><path d={p.d} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g></svg>
                </button>
              ))}
            </div>
          </div>
        )} />
        <Big icon={RiFlowChart} label="차트" onClick={() => x.open("chart")} />
      </Group>
      <Group label="링크">
        <Col>
          <Small icon={RiLinkM} label="링크" title="링크 삽입 (Ctrl+K)" on={ed.isActive("link")} onClick={() => x.open("link")} />
          <Small icon={RiBookmarkLine} label="책갈피" onClick={() => x.open("bookmark")} />
        </Col>
      </Group>
      <Group label="메모">
        <Big icon={RiChatNewLine} label="메모" title="새 메모 (Ctrl+Alt+M)" onClick={x.newComment} />
      </Group>
      <Group label="머리글/바닥글">
        <Col>
          <Small icon={RiLayoutTopLine} label="머리글" menu={(close) => <HfMenu x={x} kind="header" close={close} />} />
          <Small icon={RiLayoutBottomLine} label="바닥글" menu={(close) => <HfMenu x={x} kind="footer" close={close} />} />
          <Small icon={RiHashtag} label="페이지 번호" menu={(close) => (
            <>
              {([["top-center", "페이지 위쪽 (가운데)"], ["top-right", "페이지 위쪽 (오른쪽)"], ["bottom-center", "페이지 아래쪽 (가운데)"], ["bottom-right", "페이지 아래쪽 (오른쪽)"]] as const).map(([k, l]) => (
                <Item key={k} label={l} on={x.page.pageNumber === k} onClick={() => { x.setPage({ pageNumber: k }); close(); }} />
              ))}
              <MenuSep />
              <Item icon={RiDeleteBinLine} label="페이지 번호 제거" onClick={() => { x.setPage({ pageNumber: "none" }); close(); }} />
            </>
          )} />
        </Col>
      </Group>
      <Group label="텍스트">
        <Big icon={RiText} label="텍스트 상자" menu={(close) => (
          <>
            <Item label="단순 텍스트 상자" onClick={() => { cmd(ed).insertTextBox(); close(); }} />
            <Item label="강조 상자 (파란 배경)" onClick={() => { c(x).insertContent({ type: "textBox", attrs: { width: 100, border: "#2F5496", fill: "#DEEAF6" }, content: [{ type: "paragraph", content: [{ type: "text", text: "강조할 내용을 입력하세요" }] }] }).run(); close(); }} />
            <Item label="안내 상자 (노란 배경)" onClick={() => { c(x).insertContent({ type: "textBox", attrs: { width: 100, border: "#BF9000", fill: "#FFF2CC" }, content: [{ type: "paragraph", content: [{ type: "text", text: "안내할 내용을 입력하세요" }] }] }).run(); close(); }} />
            <Item label="오른쪽 사이드 상자" onClick={() => { c(x).insertContent({ type: "textBox", attrs: { width: 40, align: "right", border: "#7F7F7F", fill: "#F2F2F2" }, content: [{ type: "paragraph", content: [{ type: "text", text: "옆에 둘 내용" }] }] }).run(); close(); }} />
          </>
        )} />
        <Col>
          <Small icon={RiQuillPenLine} label="WordArt" menu={(close) => <WordArtMenu x={x} close={close} />} />
          <Small icon={RiFontSize2} label="단락의 첫 문자 장식" onClick={() => dropCap(ed)} />
          <Small icon={RiCalendarLine} label="날짜 및 시간" onClick={() => x.open("date")} />
        </Col>
      </Group>
      <Group label="기호">
        <Col>
          <Small icon={RiFormula} label="수식" onClick={() => x.open("symbol", "수학")} />
          <Small icon={RiOmega} label="기호" onClick={() => x.open("symbol")} />
        </Col>
      </Group>
    </>
  );
}
function insertQuickTable(ed: Editor, kind: "listing" | "schedule") {
  const row = (cells: string[], head = false) => ({ type: "tableRow", content: cells.map((t) => ({ type: head ? "tableHeader" : "tableCell", attrs: head ? { backgroundColor: "#D9E2F3" } : {}, content: [{ type: "paragraph", content: t ? [{ type: "text", text: t }] : undefined }] })) });
  const rows = kind === "listing"
    ? [row(["항목", "내용"], true), ...["소재지", "거래 종류", "보증금 / 월세", "면적", "층 / 전체 층", "관리비", "입주 가능일", "특징"].map((k) => row([k, ""]))]
    : [row(["날짜", "시간", "내용", "비고"], true), row(["", "", "", ""]), row(["", "", "", ""]), row(["", "", "", ""])];
  ed.chain().focus().insertContent({ type: "table", content: rows }).run();
}
function dropCap(ed: Editor) {
  const { $from } = ed.state.selection;
  const start = $from.start();
  const first = ed.state.doc.textBetween(start, Math.min(start + 1, $from.end()));
  if (!first) return;
  ed.chain().focus().setTextSelection({ from: start, to: start + 1 }).setFontSize("36pt").setBold().setTextSelection(start + 1).run();
}
function HfMenu({ x, kind, close }: { x: Ctl; kind: "header" | "footer"; close: () => void }) {
  const set = (text: string, align: "left" | "center" | "right") => { x.setPage(kind === "header" ? { header: text, headerAlign: align } : { footer: text, footerAlign: align }); close(); };
  const title = x.ed.state.doc.firstChild?.textContent?.slice(0, 40) || "[문서 제목]";
  return (
    <>
      <MenuHead>기본 제공</MenuHead>
      <Item label="비어 있음" onClick={() => set("[여기에 입력]", "left")} />
      <Item label="비어 있음 (3열)" onClick={() => set("[왼쪽]\t[가운데]\t[오른쪽]", "center")} />
      <Item label={`제목 (${kind === "header" ? "오른쪽" : "가운데"})`} onClick={() => set(title, kind === "header" ? "right" : "center")} />
      <Item label="페이지 번호 (X / Y)" onClick={() => set("{PAGE} / {PAGES}", "center")} />
      <Item label="회사 이름 · 페이지" onClick={() => set("[회사 이름]  |  {PAGE}", "right")} />
      <MenuSep />
      <Item icon={RiFileEditLine} label={kind === "header" ? "머리글 편집" : "바닥글 편집"} onClick={() => { x.open("headerFooter", kind); close(); }} />
      <Item icon={RiDeleteBinLine} label={kind === "header" ? "머리글 제거" : "바닥글 제거"} onClick={() => { x.setPage(kind === "header" ? { header: "" } : { footer: "" }); close(); }} />
    </>
  );
}
const WORDART = [
  { name: "채우기: 검정", st: { color: "#000000", bold: true } },
  { name: "채우기: 파랑", st: { color: "#4472C4", bold: true } },
  { name: "채우기: 주황", st: { color: "#ED7D31", bold: true } },
  { name: "채우기: 금색", st: { color: "#BF9000", bold: true } },
  { name: "채우기: 녹색", st: { color: "#0E7A4B", bold: true } },
  { name: "채우기: 남색 · 강조", st: { color: "#1F3864", bold: true, bg: "#DEEAF6" } },
  { name: "흰 글 · 파란 바탕", st: { color: "#FFFFFF", bold: true, bg: "#2F5496" } },
  { name: "흰 글 · 빨간 바탕", st: { color: "#FFFFFF", bold: true, bg: "#C00000" } },
];
function WordArtMenu({ x, close }: { x: Ctl; close: () => void }) {
  return (
    <div className="gsd-wordart">
      {WORDART.map((w) => (
        <button key={w.name} title={w.name} onMouseDown={keep} onClick={() => {
          const marks: { type: string; attrs?: Record<string, unknown> }[] = [{ type: "textStyle", attrs: { color: w.st.color, fontSize: "36pt", ...(w.st.bg ? { backgroundColor: w.st.bg } : {}) } }];
          if (w.st.bold) marks.push({ type: "bold" });
          c(x).insertContent({ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "텍스트를 입력하세요", marks }] }).run();
          close();
        }}><span style={{ color: w.st.color, background: w.st.bg || "transparent", fontWeight: 800, fontSize: 20, padding: "0 4px" }}>가</span></button>
      ))}
    </div>
  );
}

/* ───────────────────────── 그리기 ───────────────────────── */
function DrawTab({ x }: { x: Ctl }) {
  return (
    <>
      <Group label="그리기 도구">
        <Big icon={RiPenNibLine} label="펜" color="#000" onClick={() => x.open("draw", { color: "#000000", width: 3 })} />
        <Big icon={RiPenNibLine} label="빨간 펜" color="#E00000" onClick={() => x.open("draw", { color: "#E00000", width: 3 })} />
        <Big icon={RiPenNibLine} label="파란 펜" color="#0050D0" onClick={() => x.open("draw", { color: "#0050D0", width: 3 })} />
        <Big icon={RiMarkPenLine} label="형광펜" color="#E6C800" onClick={() => x.open("draw", { color: "#FFE600", width: 14, alpha: 0.45 })} />
        <Big icon={RiEraserLine} label="지우개" color="#C2185B" onClick={() => x.open("draw", { eraser: true })} />
      </Group>
      <Group label="그리기 캔버스">
        <Big icon={RiSquareLine} label="그리기 캔버스" onClick={() => x.open("draw")} />
      </Group>
      <Group label="변환">
        <Big icon={RiShapesLine} label="잉크를 도형으로" onClick={() => x.open("draw", { shapes: true })} />
      </Group>
    </>
  );
}

/* ───────────────────────── 디자인 ───────────────────────── */
function DesignTab({ x }: { x: Ctl }) {
  const th = THEMES.find((t) => t.id === x.page.theme) || THEMES[0];
  return (
    <>
      <Group label="문서 서식">
        <Gallery>
          {THEMES.map((t) => (
            <button key={t.id} className={`gsd-theme${x.page.theme === t.id ? " on" : ""}`} onMouseDown={keep} onClick={() => x.setPage({ theme: t.id })} title={t.name}>
              <span className="gsd-theme-h" style={{ fontFamily: `'${t.head}'`, color: t.color }}>제목</span>
              <span className="gsd-theme-b" style={{ fontFamily: `'${t.body}'` }}>제목 1</span>
              <span className="gsd-theme-l" />
              <span className="gsd-theme-nm">{t.name}</span>
            </button>
          ))}
        </Gallery>
      </Group>
      <Group label="">
        <Col>
          <Small icon={RiPaletteLine} label="색" menu={(close) => (
            <>
              <MenuHead>제목 색</MenuHead>
              {["#1F3864", "#2F5496", "#000000", "#0E7A4B", "#B45309", "#7030A0", "#C00000", "#1A3A6B"].map((col) => (
                <Item key={col} label={<span><span className="gsd-sw" style={{ background: col, display: "inline-block", marginRight: 8, verticalAlign: -3 }} />{col}</span>} onClick={() => { x.open("themeColor", col); close(); }} />
              ))}
            </>
          )} />
          <Small icon={RiFontSize2} label="글꼴" menu={(close) => (
            <>
              <MenuHead>본문 글꼴</MenuHead>
              {FONTS.slice(0, 12).map((f) => <Item key={f.family} on={x.base.font === f.family} label={<span style={{ fontFamily: `'${f.family}'` }}>{f.label}</span>} onClick={() => { x.setBase({ font: f.family }); close(); }} />)}
            </>
          )} />
          <Small icon={RiLineHeight} label="단락 간격" menu={(close) => (
            <>
              {([["기본 (줄 1.6, 뒤 0)", 1.6, 0], ["간격 없음", 1, 0], ["압축", 1.15, 4], ["좁게", 1.3, 6], ["보통", 1.5, 8], ["열기", 1.8, 10], ["넓게", 2, 12]] as const).map(([l, lh, sa]) => (
                <Item key={l} label={l} onClick={() => { x.open("spacingAll", { lh, sa }); close(); }} />
              ))}
            </>
          )} />
        </Col>
        <Big icon={RiCheckDoubleLine} label="기본값으로 설정" title={`지금 서식(${th.name} · ${x.base.font} ${x.base.size}pt)을 새 문서 기본으로`} onClick={x.saveDefault} />
      </Group>
      <Group label="페이지 배경">
        <Big icon={RiDraftLine} label="워터마크" menu={(close) => (
          <>
            <MenuHead>기본 제공</MenuHead>
            {["초안", "대외비", "사본", "견본", "긴급", "공실뉴스"].map((w) => <Item key={w} label={w} on={x.page.watermark === w} onClick={() => { x.setPage({ watermark: w }); close(); }} />)}
            <MenuSep />
            <Item label="사용자 지정 워터마크…" onClick={() => { x.open("watermark"); close(); }} />
            <Item icon={RiDeleteBinLine} label="워터마크 제거" onClick={() => { x.setPage({ watermark: "" }); close(); }} />
          </>
        )} />
        <Big icon={RiPaintFill} label="페이지 색" menu={(close) => <ColorMenu close={close} none="색 없음" onPick={(col) => x.setPage({ pageColor: col || "" })} />} />
        <Big icon={RiSquareLine} label="페이지 테두리" menu={(close) => (
          <>
            <Item label="없음" on={!x.page.pageBorder} onClick={() => { x.setPage({ pageBorder: "" }); close(); }} />
            {[["검정 실선", "#000000"], ["회색 실선", "#7F7F7F"], ["파랑 실선", "#2F5496"], ["녹색 실선", "#0E7A4B"], ["빨강 실선", "#C00000"]].map(([l, col]) => (
              <Item key={col} label={l} on={x.page.pageBorder === col} onClick={() => { x.setPage({ pageBorder: col }); close(); }} />
            ))}
          </>
        )} />
      </Group>
    </>
  );
}

/* ───────────────────────── 레이아웃 ───────────────────────── */
function LayoutTab({ x }: { x: Ctl }) {
  const ed = x.ed;
  const pa = ed.getAttributes(ed.isActive("heading") ? "heading" : "paragraph");
  const set = (a: Record<string, unknown>) => cmd(ed).setParagraphAttrs(a);
  return (
    <>
      <Group label="페이지 설정" launcher={() => x.open("pageSetup")}>
        <Big icon={RiLayoutLeftLine} label="여백" menu={(close) => (
          <>
            {MARGINS.map((m) => (
              <Item key={m.id} label={<span><b>{m.name}</b><br /><span style={{ fontSize: 11, color: "#666" }}>위쪽: {m.m.top} mm 아래쪽: {m.m.bottom} mm 왼쪽: {m.m.left} mm 오른쪽: {m.m.right} mm</span></span>}
                on={Math.abs(x.page.margin.left - m.m.left) < 0.1 && Math.abs(x.page.margin.top - m.m.top) < 0.1} onClick={() => { x.setPage({ margin: { ...m.m } }); close(); }} />
            ))}
            <MenuSep />
            <Item label="사용자 지정 여백…" onClick={() => { x.open("pageSetup"); close(); }} />
          </>
        )} />
        <Big icon={RiAspectRatioLine} label="용지 방향" menu={(close) => (
          <>
            <Item label="세로" on={!x.page.landscape} onClick={() => { x.setPage({ landscape: false }); close(); }} />
            <Item label="가로" on={x.page.landscape} onClick={() => { x.setPage({ landscape: true }); close(); }} />
          </>
        )} />
        <Big icon={RiPagesLine} label="크기" menu={(close) => (
          <>
            {PAPERS.map((p) => <Item key={p.id} on={x.page.paper === p.id} label={<span><b>{p.name}</b><br /><span style={{ fontSize: 11, color: "#666" }}>{p.w}mm x {p.h}mm</span></span>} onClick={() => { x.setPage({ paper: p.id, w: p.w, h: p.h }); close(); }} />)}
            <MenuSep />
            <Item label="다른 용지 크기…" onClick={() => { x.open("pageSetup", "paper"); close(); }} />
          </>
        )} />
        <Big icon={RiLayoutColumnLine} label="단" menu={(close) => (
          <>
            <Item label="하나 (단 풀기)" onClick={() => { unwrapColumns(ed); close(); }} />
            <Item label="둘" onClick={() => { cmd(ed).insertColumns(2); close(); }} />
            <Item label="셋" onClick={() => { cmd(ed).insertColumns(3); close(); }} />
          </>
        )} />
        <Col>
          <Small icon={RiSeparator} label="나누기" menu={(close) => (
            <>
              <MenuHead>페이지 나누기</MenuHead>
              <Item label={<span><b>페이지</b><br /><span style={{ fontSize: 11, color: "#666" }}>한 페이지가 끝나고 다음 페이지가 시작되는 지점을 표시합니다.</span></span>} onClick={() => { cmd(ed).insertPageBreak(); close(); }} />
              <Item label={<span><b>단</b><br /><span style={{ fontSize: 11, color: "#666" }}>단 안에서 다음 단으로 — 단(2·3단)을 새로 만듭니다.</span></span>} onClick={() => { cmd(ed).insertColumns(2); close(); }} />
              <Item label={<span><b>텍스트 줄 바꿈</b><br /><span style={{ fontSize: 11, color: "#666" }}>같은 문단 안에서 줄만 바꿉니다 (Shift+Enter).</span></span>} onClick={() => { c(x).setHardBreak().run(); close(); }} />
            </>
          )} />
          <Small icon={RiListOrdered} label="줄 번호" menu={(close) => (<><Item label="없음" on={!x.page.lineNumbers} onClick={() => { x.setPage({ lineNumbers: false }); close(); }} /><Item label="연속" on={!!x.page.lineNumbers} onClick={() => { x.setPage({ lineNumbers: true }); close(); }} /></>)} />
          <Small icon={RiTextWrap} label="하이픈 넣기" title="영어 단어를 줄 끝에서 나눕니다 (한글에는 영향 없음)" on={x.page.paper === "__"} onClick={() => document.querySelector(".gsd-body .ProseMirror")?.classList.toggle("gsd-hyph")} />
        </Col>
      </Group>
      <Group label="단락" launcher={() => x.open("paragraph")}>
        <Col gap={4}>
          <MenuHead>들여쓰기</MenuHead>
          <Spin label="왼쪽:" value={Number(pa.indentLeft) || 0} unit="pt" step={10} onChange={(v) => set({ indentLeft: v || null })} />
          <Spin label="오른쪽:" value={Number(pa.indentRight) || 0} unit="pt" step={10} onChange={(v) => set({ indentRight: v || null })} />
        </Col>
        <Col gap={4}>
          <MenuHead>간격</MenuHead>
          <Spin label="앞:" value={Number(pa.spaceBefore) || 0} unit="pt" step={6} onChange={(v) => set({ spaceBefore: v })} />
          <Spin label="뒤:" value={pa.spaceAfter === null || pa.spaceAfter === undefined ? 0 : Number(pa.spaceAfter)} unit="pt" step={6} onChange={(v) => set({ spaceAfter: v })} />
        </Col>
      </Group>
      <Group label="정렬">
        <Big icon={RiImageEditLine} label="위치" disabled={!ed.isActive("image")} menu={(close) => (
          <>
            {([["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]] as const).map(([k, l]) => <Item key={k} label={l} onClick={() => { cmd(ed).updateAttributes("image", { align: k }); close(); }} />)}
          </>
        )} />
        <Col>
          <Small icon={RiAlignLeft} label="맞춤" menu={(close) => (
            <>
              <Item label="왼쪽 맞춤" onClick={() => { c(x).setTextAlign("left").run(); close(); }} />
              <Item label="가운데 맞춤" onClick={() => { c(x).setTextAlign("center").run(); close(); }} />
              <Item label="오른쪽 맞춤" onClick={() => { c(x).setTextAlign("right").run(); close(); }} />
            </>
          )} />
        </Col>
      </Group>
    </>
  );
}
function unwrapColumns(ed: Editor) {
  const { $from } = ed.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d);
    if (n.type.name === "columns") {
      const pos = $from.before(d);
      const content: unknown[] = [];
      n.forEach((col) => col.forEach((b) => content.push(b)));
      ed.view.dispatch(ed.state.tr.replaceWith(pos, pos + n.nodeSize, content as never));
      return;
    }
  }
}

/* ───────────────────────── 참조 ───────────────────────── */
function RefsTab({ x }: { x: Ctl }) {
  const ed = x.ed;
  return (
    <>
      <Group label="목차">
        <Big icon={RiFileList3Line} label="목차" menu={(close) => (
          <>
            <MenuHead>기본 제공</MenuHead>
            <Item label="자동 목차 (제목 1~3)" onClick={() => { c(x).insertContent([{ type: "toc" }, { type: "paragraph" }]).run(); close(); }} />
            <Item label="자동 목차 + 다음 페이지에서 본문" onClick={() => { ed.chain().focus().insertContentAt(0, [{ type: "toc" }, { type: "pageBreak" }]).run(); close(); }} />
            <MenuSep />
            <Item icon={RiDeleteBinLine} label="목차 제거" onClick={() => { removeNodes(ed, "toc"); close(); }} />
          </>
        )} />
        <Col>
          <Small icon={RiFileEditLine} label="텍스트 추가" menu={(close) => (
            <>
              <Item label="목차에 표시 안 함" onClick={() => { c(x).setParagraph().run(); close(); }} />
              <Item label="수준 1" on={ed.isActive("heading", { level: 1 })} onClick={() => { c(x).setHeading({ level: 1 }).run(); close(); }} />
              <Item label="수준 2" on={ed.isActive("heading", { level: 2 })} onClick={() => { c(x).setHeading({ level: 2 }).run(); close(); }} />
              <Item label="수준 3" on={ed.isActive("heading", { level: 3 })} onClick={() => { c(x).setHeading({ level: 3 }).run(); close(); }} />
            </>
          )} />
          <Small icon={RiRefreshLine} label="목차 업데이트" onClick={() => ed.view.dispatch(ed.state.tr.setMeta("tocRefresh", true))} />
        </Col>
      </Group>
      <Group label="각주">
        <Big icon={RiStickyNoteLine} label="각주 삽입" title="각주 삽입 (Ctrl+Alt+F)" onClick={() => x.open("footnote")} />
        <Col>
          <Small icon={RiFileTextLine} label="미주 삽입" onClick={() => x.open("footnote", "end")} />
          <Small icon={RiArrowRightSLine} label="다음 각주" onClick={x.stepFootnote} />
          <Small icon={RiBookOpenLine} label="메모 표시" on={x.comments} onClick={() => x.setComments(!x.comments)} />
        </Col>
      </Group>
      <Group label="인용 및 참고 문헌">
        <Big icon={RiDoubleQuotesL} label="인용 삽입" onClick={() => x.open("citation")} />
        <Col>
          <Small icon={RiArticleLine} label="참고 문헌" onClick={() => c(x).insertContent([{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "참고 문헌" }] }, { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] }]).run()} />
        </Col>
      </Group>
      <Group label="캡션">
        <Big icon={RiImageLine} label="캡션 삽입" onClick={() => x.open("caption")} />
        <Col>
          <Small icon={RiTableLine} label="그림 목차 삽입" onClick={() => x.open("captionList")} />
        </Col>
      </Group>
      <Group label="목차·찾아보기">
        <Big icon={RiLayoutLeftLine} label="탐색 창" on={x.nav} onClick={() => x.setNav(!x.nav)} />
      </Group>
    </>
  );
}
function removeNodes(ed: Editor, type: string) {
  let tr = ed.state.tr;
  const hits: { pos: number; size: number }[] = [];
  ed.state.doc.descendants((n, pos) => { if (n.type.name === type) hits.push({ pos, size: n.nodeSize }); });
  for (const h of hits.reverse()) tr = tr.delete(h.pos, h.pos + h.size);
  ed.view.dispatch(tr);
}

/* ───────────────────────── 편지 (공실 정보 채우기 — 다음에) ───────────────────────── */
function MailTab() {
  return (
    <>
      <Group label="만들기">
        <Big icon={RiMailLine} label="봉투" disabled />
        <Big icon={RiContactsBook2Line} label="레이블" disabled />
      </Group>
      <Group label="편지 병합 시작">
        <Big icon={RiMailSendLine} label="편지 병합 시작" disabled />
        <Big icon={RiUserSearchLine} label="받는 사람 선택" disabled />
      </Group>
      <Group label="필드 쓰기 및 삽입">
        <Big icon={RiFileUserLine} label="공실 정보 채우기" disabled />
      </Group>
      <div className="gsd-soon">공실 정보 채우기(내 공실의 주소·가격·면적을 문서에 자동으로 넣기)는 준비 중이에요.</div>
    </>
  );
}

/* ───────────────────────── 검토 ───────────────────────── */
function ReviewTab({ x }: { x: Ctl }) {
  return (
    <>
      <Group label="언어 교정">
        <Big icon={RiCheckboxCircleLine} label="맞춤법 및 문법" title="AI 로 맞춤법·띄어쓰기를 고칩니다 (F7)" onClick={() => x.ai("spell")} />
        <Col>
          <Small icon={RiBookReadLine} label="동의어 사전" onClick={() => x.ai("synonym")} />
          <Small icon={RiHashtag} label="단어 개수" onClick={x.wordCount} />
        </Col>
      </Group>
      <Group label="언어">
        <Big icon={RiTranslate2} label="번역" menu={(close) => (
          <>
            <Item label="선택 영역 번역" onClick={() => { x.ai("translate-sel"); close(); }} />
            <Item label="문서 번역" onClick={() => { x.ai("translate-doc"); close(); }} />
          </>
        )} />
      </Group>
      <Group label="메모">
        <Big icon={RiChatNewLine} label="새 메모" onClick={x.newComment} />
        <Col>
          <Small icon={RiDeleteBinLine} label="삭제" menu={(close) => (<><Item label="삭제" onClick={() => { x.deleteComment(); close(); }} /><Item label="문서의 모든 메모 삭제" onClick={() => { x.deleteComment(true); close(); }} /></>)} onClick={() => x.deleteComment()} />
          <Small icon={RiArrowLeftSLine} label="이전" onClick={() => x.stepComment(-1)} />
          <Small icon={RiArrowRightSLine} label="다음" onClick={() => x.stepComment(1)} />
        </Col>
        <Big icon={RiStickyNoteLine} label="메모 표시" on={x.comments} onClick={() => x.setComments(!x.comments)} />
      </Group>
      <Group label="추적">
        <Big icon={RiTimeLine} label="변경 내용 추적" disabled title="준비 중" />
      </Group>
      <Group label="보호">
        <Big icon={RiLockLine} label="편집 제한" on={x.readOnly} title="켜면 이 문서를 고칠 수 없게 잠급니다 (읽기 전용)" onClick={() => x.setReadOnly(!x.readOnly)} />
        <Big icon={RiFileShield2Line} label="개인 정보 검사" onClick={() => x.open("inspect")} />
      </Group>
    </>
  );
}

/* ───────────────────────── 보기 ───────────────────────── */
function ViewTab({ x }: { x: Ctl }) {
  return (
    <>
      <Group label="보기">
        <Big icon={RiBookReadLine} label="읽기 모드" on={x.view === "read"} onClick={() => x.setView("read")} />
        <Big icon={RiPagesFill} label="인쇄 모양" on={x.view === "print"} onClick={() => x.setView("print")} />
        <Big icon={RiGlobalLine} label="웹 모양" on={x.view === "web"} onClick={() => x.setView("web")} />
      </Group>
      <Group label="몰입형">
        <Big icon={RiFullscreenLine} label="포커스" onClick={() => x.open("focus")} />
      </Group>
      <Group label="표시">
        <Col>
          <label className="gsd-check"><input type="checkbox" checked={x.ruler} onChange={(e) => x.setRuler(e.target.checked)} /> <RiRulerLine /> 눈금자</label>
          <label className="gsd-check"><input type="checkbox" checked={x.grid} onChange={(e) => x.setGrid(e.target.checked)} /> <RiGridLine /> 눈금선</label>
          <label className="gsd-check"><input type="checkbox" checked={x.nav} onChange={(e) => x.setNav(e.target.checked)} /> <RiLayoutLeftLine /> 탐색 창</label>
        </Col>
      </Group>
      <Group label="확대/축소">
        <Big icon={RiZoomInLine} label="확대/축소" onClick={() => x.open("zoom")} />
        <Big iconEl={<span style={{ fontWeight: 800, fontSize: 18 }}>100</span>} label="100%" onClick={() => x.setZoom(1)} />
        <Col>
          <Small icon={RiFileTextLine} label="한 페이지" onClick={() => x.fit("page")} />
          <Small icon={RiPagesLine} label="여러 페이지" onClick={() => x.fit("multi")} />
          <Small icon={RiAspectRatioLine} label="페이지 너비" onClick={() => x.fit("width")} />
        </Col>
      </Group>
    </>
  );
}

/* ───────────────────────── 도움말 ───────────────────────── */
function HelpTab({ x }: { x: Ctl }) {
  return (
    <>
      <Group label="도움말">
        <Big icon={RiQuestionLine} label="도움말" onClick={() => x.open("help")} />
        <Big icon={RiKeyboardLine} label="바로 가기 키" onClick={() => x.open("help", "keys")} />
        <Big icon={RiFeedbackLine} label="한글·워드 파일 안내" onClick={() => x.open("help", "formats")} />
      </Group>
      {x.isApp && (
        <Group label="한글 (.hwp)">
          <Big icon={RiFileWord2Line} label="한글 변환기" title="예전 한글(.hwp) 파일을 열고 저장할 때 쓰는 Java" onClick={() => x.open("java")} />
        </Group>
      )}
    </>
  );
}

/* ───────────────────────── AI ───────────────────────── */
function AiTab({ x }: { x: Ctl }) {
  return (
    <>
      <Group label="AI 글쓰기">
        <Big icon={RiSparkling2Line} label="AI로 문서 쓰기" color="#7c3aed" onClick={() => x.ai("write")} />
        <Big icon={RiQuillPenLine} label="고쳐 쓰기" color="#7c3aed" title="고른 글(없으면 문서 전체)을 요청대로 고칩니다" onClick={() => x.ai("edit")} />
        <Big icon={RiFileList3Line} label="요약" color="#7c3aed" onClick={() => x.ai("summary")} />
      </Group>
      <Group label="AI 교정">
        <Big icon={RiCheckboxCircleLine} label="맞춤법" color="#7c3aed" onClick={() => x.ai("spell")} />
        <Big icon={RiTranslate2} label="번역" color="#7c3aed" onClick={() => x.ai("translate-sel")} />
      </Group>
      <Group label="AI 만들기">
        <Big icon={RiTableLine} label="표로 정리" color="#7c3aed" onClick={() => x.ai("table")} />
        <Big icon={RiListUnordered} label="목록으로 정리" color="#7c3aed" onClick={() => x.ai("list")} />
      </Group>
      <div className="gsd-soon">내 AI(연결한 ChatGPT 등)를 씁니다. 글에 있는 숫자·이름·금액은 바꾸지 않고, 없는 사실은 지어내지 않아요.</div>
    </>
  );
}

/* ───────────────────────── 표 · 그림 (고를 때만) ───────────────────────── */
const TABLE_STYLES = [
  { name: "표 눈금", head: "", band: "", line: "#000000" },
  { name: "파랑 머리글", head: "#4472C4", band: "#D9E2F3", line: "#8EAADB", headText: "#FFFFFF" },
  { name: "주황 머리글", head: "#ED7D31", band: "#FBE4D5", line: "#F4B083", headText: "#FFFFFF" },
  { name: "녹색 머리글", head: "#70AD47", band: "#E2EFD9", line: "#A8D08D", headText: "#FFFFFF" },
  { name: "회색 머리글", head: "#7F7F7F", band: "#EDEDED", line: "#BFBFBF", headText: "#FFFFFF" },
  { name: "남색 머리글", head: "#1F3864", band: "#DEEAF6", line: "#9CC3E5", headText: "#FFFFFF" },
  { name: "연한 파랑", head: "#D9E2F3", band: "", line: "#8EAADB" },
  { name: "연한 녹색", head: "#E2EFD9", band: "", line: "#A8D08D" },
];
function applyTableStyle(ed: Editor, st: (typeof TABLE_STYLES)[number]) {
  const { $from } = ed.state.selection;
  let tpos = -1, tnode = null as null | import("@tiptap/pm/model").Node;
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "table") { tpos = $from.before(d); tnode = $from.node(d); break; }
  if (!tnode) return;
  let tr = ed.state.tr;
  let ri = 0;
  tnode.forEach((row, rOff) => {
    row.forEach((cell, cOff) => {
      const pos = tpos + 1 + rOff + 1 + cOff;
      const bg = ri === 0 ? st.head || null : st.band && ri % 2 === 0 ? st.band : null;
      tr = tr.setNodeMarkup(pos, undefined, { ...cell.attrs, backgroundColor: bg, borderColor: st.line });
      if (ri === 0 && st.headText) tr = tr.addMark(pos + 1, pos + cell.nodeSize - 1, ed.state.schema.marks.textStyle.create({ color: st.headText }));
      else tr = tr.removeMark(pos + 1, pos + cell.nodeSize - 1, ed.state.schema.marks.textStyle);
      if (ri === 0) tr = tr.addMark(pos + 1, pos + cell.nodeSize - 1, ed.state.schema.marks.bold.create());
    });
    ri++;
  });
  ed.view.dispatch(tr);
}
function TableDesignTab({ x }: { x: Ctl }) {
  const ed = x.ed;
  return (
    <>
      <Group label="표 스타일 옵션">
        <Col>
          <label className="gsd-check"><input type="checkbox" checked={ed.isActive("tableHeader")} onChange={() => c(x).toggleHeaderRow().run()} /> 머리글 행</label>
          <label className="gsd-check"><input type="checkbox" onChange={() => c(x).toggleHeaderColumn().run()} /> 첫째 열</label>
        </Col>
      </Group>
      <Group label="표 스타일">
        <Gallery>
          {TABLE_STYLES.map((s) => (
            <button key={s.name} className="gsd-tstyle" title={s.name} onMouseDown={keep} onClick={() => applyTableStyle(ed, s)}>
              {[0, 1, 2, 3].map((r) => <span key={r} style={{ background: r === 0 ? s.head || "#fff" : s.band && r % 2 === 0 ? s.band : "#fff", borderColor: s.line }} />)}
            </button>
          ))}
        </Gallery>
        <Col>
          <Small icon={RiPaintFill} label="음영" menu={(close) => <ColorMenu close={close} none="색 없음" onPick={(col) => c(x).setCellAttribute("backgroundColor", col).run()} />} />
          <Small icon={RiCheckboxBlankLine} label="테두리 색" menu={(close) => <ColorMenu close={close} onPick={(col) => c(x).setCellAttribute("borderColor", col).run()} />} />
        </Col>
      </Group>
    </>
  );
}
function TableLayoutTab({ x }: { x: Ctl }) {
  return (
    <>
      <Group label="표">
        <Col>
          <Small icon={RiCursorLine} label="선택" menu={(close) => (<><Item label="셀 선택" onClick={() => { c(x).selectParentNode().run(); close(); }} /><Item label="표 선택" onClick={() => { selectTable(x.ed); close(); }} /></>)} />
          <Small icon={RiGridLine} label="눈금선 보기" on={x.grid} onClick={() => x.setGrid(!x.grid)} />
          <Small icon={RiFileEditLine} label="속성" onClick={() => x.open("tableProps")} />
        </Col>
      </Group>
      <Group label="행 및 열">
        <Big icon={RiDeleteBinLine} label="삭제" menu={(close) => (
          <>
            <Item icon={RiDeleteRow} label="행 삭제" onClick={() => { c(x).deleteRow().run(); close(); }} />
            <Item icon={RiDeleteColumn} label="열 삭제" onClick={() => { c(x).deleteColumn().run(); close(); }} />
            <Item icon={RiDeleteBinLine} label="표 삭제" onClick={() => { c(x).deleteTable().run(); close(); }} />
          </>
        )} />
        <Big icon={RiInsertRowTop} label="위에 삽입" onClick={() => c(x).addRowBefore().run()} />
        <Col>
          <Small icon={RiInsertRowBottom} label="아래에 삽입" onClick={() => c(x).addRowAfter().run()} />
          <Small icon={RiInsertColumnLeft} label="왼쪽에 삽입" onClick={() => c(x).addColumnBefore().run()} />
          <Small icon={RiInsertColumnRight} label="오른쪽에 삽입" onClick={() => c(x).addColumnAfter().run()} />
        </Col>
      </Group>
      <Group label="병합">
        <Col>
          <Small icon={RiMergeCellsHorizontal} label="셀 병합" onClick={() => c(x).mergeCells().run()} />
          <Small icon={RiSplitCellsHorizontal} label="셀 분할" onClick={() => c(x).splitCell().run()} />
          <Small icon={RiLayoutTop2Line} label="머리글 행 반복" on={x.ed.isActive("tableHeader")} onClick={() => c(x).toggleHeaderRow().run()} />
        </Col>
      </Group>
      <Group label="맞춤">
        <Row>
          <Small icon={RiAlignTop} title="위쪽 맞춤" onClick={() => c(x).setCellAttribute("verticalAlign", "top").run()} />
          <Small icon={RiAlignVertically} title="가운데 맞춤" onClick={() => c(x).setCellAttribute("verticalAlign", "middle").run()} />
          <Small icon={RiAlignBottom} title="아래쪽 맞춤" onClick={() => c(x).setCellAttribute("verticalAlign", "bottom").run()} />
        </Row>
        <Row>
          <Small icon={RiAlignLeft} title="왼쪽" onClick={() => c(x).setTextAlign("left").run()} />
          <Small icon={RiAlignCenter} title="가운데" onClick={() => c(x).setTextAlign("center").run()} />
          <Small icon={RiAlignRight} title="오른쪽" onClick={() => c(x).setTextAlign("right").run()} />
        </Row>
      </Group>
    </>
  );
}
function selectTable(ed: Editor) {
  const { $from } = ed.state.selection;
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "table") { ed.chain().focus().setNodeSelection($from.before(d)).run(); return; }
}
function ImageTab({ x }: { x: Ctl }) {
  const ed = x.ed;
  const a = ed.getAttributes("image");
  return (
    <>
      <Group label="조정">
        <Big icon={RiRefreshLine} label="원래 크기로" onClick={() => cmd(ed).updateAttributes("image", { width: null, height: null })} />
        <Big icon={RiCropLine} label="자르기 · 고치기" title="이미지 편집에서 고치려면 그림을 저장한 뒤 열어 주세요" onClick={() => x.open("imageAlt")} />
      </Group>
      <Group label="그림 스타일">
        <Gallery>
          {[["없음", ""], ["얇은 테두리", "line"], ["회색 테두리", "gray"], ["흰 액자", "white"], ["그림자", "shadow"], ["둥근 모서리", "round"]].map(([l, v]) => (
            <button key={l} className={`gsd-istyle${(a.frame || "") === v ? " on" : ""}`} title={l} onMouseDown={keep} onClick={() => cmd(ed).updateAttributes("image", { frame: v || null })}><span data-frame={v}>{l}</span></button>
          ))}
        </Gallery>
      </Group>
      <Group label="정렬">
        <Row>
          <Small icon={RiAlignLeft} title="왼쪽" on={a.align === "left"} onClick={() => cmd(ed).updateAttributes("image", { align: "left" })} />
          <Small icon={RiAlignCenter} title="가운데" on={a.align === "center"} onClick={() => cmd(ed).updateAttributes("image", { align: "center" })} />
          <Small icon={RiAlignRight} title="오른쪽" on={a.align === "right"} onClick={() => cmd(ed).updateAttributes("image", { align: "right" })} />
        </Row>
        <Small icon={RiText} label="대체 텍스트" onClick={() => x.open("imageAlt")} />
      </Group>
      <Group label="크기">
        <Col gap={4}>
          <Spin label="너비:" value={Number(a.width) || 0} unit="px" step={10} max={2000} onChange={(v) => {
            const w0 = Number(a.width) || v, h0 = Number(a.height) || 0;
            cmd(ed).updateAttributes("image", { width: v || null, height: h0 && w0 ? Math.round((h0 * v) / w0) : null });
          }} width={80} />
          <Spin label="높이:" value={Number(a.height) || 0} unit="px" step={10} max={3000} onChange={(v) => {
            const w0 = Number(a.width) || 0, h0 = Number(a.height) || v;
            cmd(ed).updateAttributes("image", { height: v || null, width: w0 && h0 ? Math.round((w0 * v) / h0) : null });
          }} width={80} />
        </Col>
      </Group>
    </>
  );
}

export const TABS = ["홈", "삽입", "그리기", "디자인", "레이아웃", "참조", "편지", "검토", "보기", "도움말", "AI"] as const;
export type TabName = (typeof TABS)[number] | "표 디자인" | "표 레이아웃" | "그림 서식";

export function RibbonBody({ tab, x }: { tab: TabName; x: Ctl }) {
  switch (tab) {
    case "홈": return <HomeTab x={x} />;
    case "삽입": return <InsertTab x={x} />;
    case "그리기": return <DrawTab x={x} />;
    case "디자인": return <DesignTab x={x} />;
    case "레이아웃": return <LayoutTab x={x} />;
    case "참조": return <RefsTab x={x} />;
    case "편지": return <MailTab />;
    case "검토": return <ReviewTab x={x} />;
    case "보기": return <ViewTab x={x} />;
    case "도움말": return <HelpTab x={x} />;
    case "AI": return <AiTab x={x} />;
    case "표 디자인": return <TableDesignTab x={x} />;
    case "표 레이아웃": return <TableLayoutTab x={x} />;
    case "그림 서식": return <ImageTab x={x} />;
  }
}
export { headings };
