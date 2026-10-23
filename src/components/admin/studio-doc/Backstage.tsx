"use client";
// 문서편집 — [파일] 화면 (워드 백스테이지): 홈 · 새로 만들기 · 열기 · 정보 · 저장 · 다른 이름으로 저장 · 인쇄 · 공유 · 내보내기 · 닫기
import React, { useEffect, useState } from "react";
import {
  RiArrowLeftLine, RiHome5Line, RiFileAddLine, RiFolderOpenLine, RiInformationLine, RiSave3Line, RiFileCopy2Line, RiPrinterLine, RiShareLine,
  RiFileDownloadLine, RiCloseLine, RiPushpinLine, RiPushpinFill, RiFileWord2Line, RiFileTextLine, RiImageLine, RiFilePdf2Line, RiFolderLine,
  RiDeleteBinLine, RiGlobalLine, RiSettings3Line,
} from "react-icons/ri";
import { TEMPLATES, TEMPLATE_CATS, HOME_TEMPLATES, type Template, type TemplateCat } from "./templates";
import { PAPERS, MARGINS, type PageSetup } from "./model";

export type Recent = { path: string; name: string; at: number; thumb?: string; missing?: boolean; pinned?: boolean };
export type SaveFmt = "docx" | "hwpx" | "hwp" | "pdf" | "png" | "jpg" | "txt" | "html";
export type PrintOpts = { printer: string; copies: number; range: "all" | "current" | "custom"; custom: string; duplex: "simplex" | "longEdge" | "shortEdge"; color: boolean };
type Pane = "home" | "new" | "open" | "info" | "saveas" | "print" | "share" | "export";

export type BackstageProps = {
  title: string; file: string; ext: string; isApp: boolean; dirty: boolean;
  pages: number; words: number; chars: number; page: PageSetup;
  start?: Pane;
  onBack: () => void;
  onNew: (t: Template) => void;
  onOpen: () => void;
  onOpenRecent: (r: Recent) => void;
  onSave: () => void;
  onSaveAs: (f: SaveFmt) => void;
  onExportImages: () => void;
  onPrint: (o: PrintOpts) => void;
  onPreview: () => Promise<string[]>;
  onClose: () => void;
  onRename: (t: string) => void;
  setPage: (p: Partial<PageSetup>) => void;
  recent: Recent[];
  reloadRecent: () => void;
  author: string;
};
type Bridge = { recentRemove?: (f: string) => Promise<boolean>; recentPin?: (f: string, p: boolean) => Promise<boolean>; reveal?: (f: string) => Promise<boolean>; info?: (f: string) => Promise<{ size: number; created: number; modified: number; dir: string } | null>; printers?: () => Promise<{ name: string; label: string; isDefault: boolean }[]> };
const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: { doc?: Bridge } }).gongsilStudio?.doc ?? null) : null);
const when = (t: number) => {
  const d = new Date(t), now = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  if (d.toDateString() === now.toDateString()) return `오늘, ${d.getHours() < 12 ? "오전" : "오후"} ${((d.getHours() + 11) % 12) + 1}:${p2(d.getMinutes())}`;
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
const extIcon = (n: string) => (/\.hwpx?$/i.test(n) ? <span className="gsd-fi hwp">한</span> : /\.docx?$/i.test(n) ? <span className="gsd-fi doc">W</span> : <span className="gsd-fi txt">T</span>);
const sizeText = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(b / 1024))}KB`);

function Thumb({ t }: { t: Template }) {
  return (
    <span className="gsd-tpl-thumb">
      {t.file && <span className="gsd-tpl-badge">한</span>}
      {t.thumb.length === 0 ? null : t.thumb.map((k, i) => <span key={i} className={`gsd-tl gsd-tl-${k}`} />)}
    </span>
  );
}

export default function Backstage(p: BackstageProps) {
  const [pane, setPane] = useState<Pane>(p.start || "home");
  const [tab, setTab] = useState<"recent" | "pinned">("recent");
  const [cat, setCat] = useState<TemplateCat | "all">("all");
  const [info, setInfo] = useState<{ size: number; created: number; modified: number; dir: string } | null>(null);
  const [printers, setPrinters] = useState<{ name: string; label: string; isDefault: boolean }[]>([]);
  const [po, setPo] = useState<PrintOpts>({ printer: "", copies: 1, range: "all", custom: "", duplex: "simplex", color: true });
  const [preview, setPreview] = useState<string[] | null>(null);
  const [pvPage, setPvPage] = useState(0);
  const b = bridge();
  useEffect(() => {
    if (pane === "info" && p.file && b?.info) b.info(p.file).then(setInfo);
    if (pane === "print") {
      if (b?.printers) b.printers().then((l) => { setPrinters(l); setPo((o) => ({ ...o, printer: o.printer || l.find((x) => x.isDefault)?.name || l[0]?.name || "" })); });
      p.onPreview().then(setPreview);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pane]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") p.onBack(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [p]);

  const nav: { id: Pane | "save" | "close"; label: string; icon: React.ElementType; sep?: boolean }[] = [
    { id: "home", label: "홈", icon: RiHome5Line },
    { id: "new", label: "새로 만들기", icon: RiFileAddLine },
    { id: "open", label: "열기", icon: RiFolderOpenLine },
    { id: "info", label: "정보", icon: RiInformationLine, sep: true },
    { id: "save", label: "저장", icon: RiSave3Line },
    { id: "saveas", label: "다른 이름으로 저장", icon: RiFileCopy2Line },
    { id: "print", label: "인쇄", icon: RiPrinterLine },
    { id: "share", label: "공유", icon: RiShareLine },
    { id: "export", label: "내보내기", icon: RiFileDownloadLine },
    { id: "close", label: "닫기", icon: RiCloseLine },
  ];
  const list = p.recent.filter((r) => (tab === "pinned" ? r.pinned : true)).sort((a, z) => Number(Boolean(z.pinned)) - Number(Boolean(a.pinned)) || z.at - a.at);
  const RecentList = ({ max }: { max?: number }) => (
    <div className="gsd-recent">
      <div className="gsd-recent-tabs">
        <button className={tab === "recent" ? "on" : ""} onClick={() => setTab("recent")}>최근 항목</button>
        <button className={tab === "pinned" ? "on" : ""} onClick={() => setTab("pinned")}>고정됨</button>
      </div>
      <div className="gsd-recent-head"><span /><span>이름</span><span>수정한 날짜</span><span /></div>
      {list.length === 0 && <div className="gsd-recent-empty">{tab === "pinned" ? "고정한 문서가 없어요. 문서 옆 📌 를 누르면 여기 남아요." : p.isApp ? "최근에 연 문서가 없어요." : "스튜디오 앱에서 열면 최근 문서가 여기 남아요."}</div>}
      {list.slice(0, max || 50).map((r) => (
        <div key={r.path} className={`gsd-recent-row${r.missing ? " missing" : ""}`} onClick={() => !r.missing && p.onOpenRecent(r)} title={r.path}>
          {extIcon(r.name)}
          <span className="gsd-recent-name"><b>{r.name.replace(/\.(docx|hwpx|hwp)$/i, "")}</b><small>{r.missing ? "파일을 찾을 수 없어요" : r.path.replace(/[\\/][^\\/]+$/, "")}</small></span>
          <span className="gsd-recent-at">{when(r.at)}</span>
          <span className="gsd-recent-act" onClick={(e) => e.stopPropagation()}>
            <button title={r.pinned ? "고정 해제" : "고정"} onClick={async () => { await b?.recentPin?.(r.path, !r.pinned); p.reloadRecent(); }}>{r.pinned ? <RiPushpinFill /> : <RiPushpinLine />}</button>
            <button title="폴더 열기" onClick={() => b?.reveal?.(r.path)}><RiFolderLine /></button>
            <button title="목록에서 지우기" onClick={async () => { await b?.recentRemove?.(r.path); p.reloadRecent(); }}><RiDeleteBinLine /></button>
          </span>
        </div>
      ))}
    </div>
  );
  const Templates = ({ all }: { all?: boolean }) => (
    <>
      {all && (
        <div className="gsd-recent-tabs" style={{ marginBottom: 16 }}>
          {([{ id: "all", name: "모두" }, ...TEMPLATE_CATS] as { id: TemplateCat | "all"; name: string }[]).map((c) => (
            <button key={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
      )}
      <div className="gsd-tpls">
        {(all ? TEMPLATES.filter((t) => cat === "all" || t.cat === cat) : HOME_TEMPLATES).map((t) => (
          <button key={t.id} className="gsd-tpl" onClick={() => p.onNew(t)} title={`${t.desc}${t.source ? `
출처: ${t.source}` : ""}`}>
            <Thumb t={t} />
            <span className="gsd-tpl-nm">{t.name}</span>
            {t.file && <span className="gsd-tpl-src">{t.cat === "legal" ? "법정 서식 원본" : "정부 표준 원본"}</span>}
          </button>
        ))}
      </div>
      {all && cat !== "basic" && <p className="gsd-muted" style={{ maxWidth: 820 }}>법정 서식은 법제처 국가법령정보센터, 표준계약서는 법무부·국토교통부가 공개한 한글 원본 그대로예요. 직접 만든 계약서·실무 문서는 참고용이며 법률 자문이 아니에요.</p>}
    </>
  );
  const fmtBtn = (f: SaveFmt, icon: React.ReactNode, name: string, desc: string, needApp = false) => (
    <button key={f} className="gsd-fmt" disabled={needApp && !p.isApp} onClick={() => p.onSaveAs(f)}>
      <span className="gsd-fmt-ic">{icon}</span>
      <span><b>{name}</b><small>{needApp && !p.isApp ? "스튜디오 앱에서만 돼요" : desc}</small></span>
    </button>
  );
  const pages = p.pages;
  return (
    <div className="gsd-bs">
      <nav className="gsd-bs-nav">
        <button className="gsd-bs-back" onClick={p.onBack} title="문서로 돌아가기 (Esc)"><RiArrowLeftLine size={22} /></button>
        {nav.map((n) => (
          <React.Fragment key={n.id}>
            {n.sep && <div className="gsd-bs-sep" />}
            <button className={`gsd-bs-item${pane === n.id ? " on" : ""}`} onClick={() => {
              if (n.id === "save") p.onSave();
              else if (n.id === "close") p.onClose();
              else setPane(n.id);
            }}><n.icon size={18} />{n.label}</button>
          </React.Fragment>
        ))}
        <div style={{ flex: 1 }} />
        <button className="gsd-bs-item" onClick={() => setPane("info")}><RiSettings3Line size={18} />옵션</button>
      </nav>
      <div className="gsd-bs-main">
        {pane === "home" && (
          <>
            <h1>{(() => { const h = new Date().getHours(); return h < 12 ? "좋은 아침입니다" : h < 18 ? "좋은 오후입니다" : "좋은 저녁입니다"; })()}</h1>
            <Templates />
            <div className="gsd-bs-more"><button onClick={() => setPane("new")}>추가 서식 파일 →</button></div>
            <RecentList max={20} />
          </>
        )}
        {pane === "new" && (<><h1>새로 만들기</h1><Templates all /></>)}
        {pane === "open" && (
          <>
            <h1>열기</h1>
            <div className="gsd-open">
              <div className="gsd-open-left">
                <button className="gsd-fmt" onClick={p.onOpen}><span className="gsd-fmt-ic"><RiFolderOpenLine size={26} /></span><span><b>찾아보기</b><small>워드(.docx) · 한글(.hwpx · .hwp) · 텍스트</small></span></button>
              </div>
              <div style={{ flex: 1 }}><RecentList /></div>
            </div>
          </>
        )}
        {pane === "info" && (
          <>
            <h1>정보</h1>
            <div className="gsd-info">
              <div>
                <div className="gsd-info-title">{extIcon(p.file || `${p.title}.${p.ext}`)} <input value={p.title} onChange={(e) => p.onRename(e.target.value)} /></div>
                <div className="gsd-info-path">{p.file || "아직 저장하지 않았어요"}</div>
                {p.file && <button className="gsd-btn" onClick={() => b?.reveal?.(p.file)}><RiFolderLine /> 파일 위치 열기</button>}
                <div className="gsd-info-box"><b>문서 검사</b><p>이 파일을 보내기 전에 메모·머리글 등 숨은 내용이 있는지 확인하세요. (검토 › 개인 정보 검사)</p></div>
                <div className="gsd-info-box"><b>호환성</b><p>워드(.docx)·한글(.hwpx)로 저장하면 MS 워드, 한컴오피스 한글(2014 이후), 한컴 무료 뷰어에서 열려요. 예전 한글(97~2010)은 .hwp 로 저장하세요.</p></div>
              </div>
              <div className="gsd-props">
                <b>속성</b>
                <dl>
                  <dt>크기</dt><dd>{info ? sizeText(info.size) : "-"}</dd>
                  <dt>페이지</dt><dd>{pages}</dd>
                  <dt>단어 수</dt><dd>{p.words}</dd>
                  <dt>글자 수</dt><dd>{p.chars}</dd>
                  <dt>용지</dt><dd>{p.page.paper} {p.page.landscape ? "가로" : "세로"}</dd>
                  <dt>제목</dt><dd>{p.title}</dd>
                </dl>
                <b>관련 날짜</b>
                <dl>
                  <dt>수정한 날짜</dt><dd>{info ? when(info.modified) : "-"}</dd>
                  <dt>만든 날짜</dt><dd>{info ? when(info.created) : "-"}</dd>
                </dl>
                <b>관련 사용자</b>
                <dl><dt>작성자</dt><dd>{p.author || "-"}</dd></dl>
              </div>
            </div>
          </>
        )}
        {pane === "saveas" && (
          <>
            <h1>다른 이름으로 저장</h1>
            <div className="gsd-fmts">
              {fmtBtn("docx", <RiFileWord2Line size={26} color="#2b579a" />, "Word 문서 (*.docx)", "MS 워드 · 한글 · 구글 문서에서 열려요")}
              {fmtBtn("hwpx", <span className="gsd-fi hwp big">한</span>, "한글 문서 (*.hwpx)", "한글 2014 이후 · 한컴 무료 뷰어")}
              {fmtBtn("hwp", <span className="gsd-fi hwp big">한</span>, "한글 97~2010 문서 (*.hwp)", "예전 한글용 — 처음 한 번 변환기(Java)를 받아요", true)}
              {fmtBtn("pdf", <RiFilePdf2Line size={26} color="#c00" />, "PDF (*.pdf)", "어디서나 같은 모양으로 · 고치지 못하게")}
              {fmtBtn("html", <RiGlobalLine size={26} color="#0e7a4b" />, "웹 페이지 (*.html)", "브라우저로 보는 파일")}
              {fmtBtn("txt", <RiFileTextLine size={26} color="#555" />, "일반 텍스트 (*.txt)", "글자만 (서식·그림 없음)")}
            </div>
          </>
        )}
        {pane === "export" && (
          <>
            <h1>내보내기</h1>
            <div className="gsd-fmts">
              {fmtBtn("pdf", <RiFilePdf2Line size={26} color="#c00" />, "PDF 문서 만들기", p.isApp ? "글자 그대로 (찾기·복사 됨) · 화면과 같은 쪽 나눔" : "그림 PDF (앱에서는 글자 그대로)")}
              <button className="gsd-fmt" onClick={p.onExportImages}><span className="gsd-fmt-ic"><RiImageLine size={26} color="#7c3aed" /></span><span><b>그림으로 저장 (PNG · JPG)</b><small>쪽마다 한 장 · 한 장으로 이어 붙이기 · 고화질 · 내 자료에 넣기</small></span></button>
              {fmtBtn("docx", <RiFileWord2Line size={26} color="#2b579a" />, "Word 문서 (*.docx)", "MS 워드용")}
              {fmtBtn("hwpx", <span className="gsd-fi hwp big">한</span>, "한글 문서 (*.hwpx)", "한컴오피스 한글용")}
              {fmtBtn("hwp", <span className="gsd-fi hwp big">한</span>, "한글 97~2010 (*.hwp)", "예전 한글용", true)}
            </div>
          </>
        )}
        {pane === "share" && (
          <>
            <h1>공유</h1>
            <div className="gsd-fmts">
              {fmtBtn("pdf", <RiFilePdf2Line size={26} color="#c00" />, "PDF 로 보내기", "받는 사람이 같은 모양으로 봐요 — 저장한 뒤 메일·카톡에 붙이세요")}
              {fmtBtn("docx", <RiFileWord2Line size={26} color="#2b579a" />, "워드 파일로 보내기", "받는 사람이 고칠 수 있어요")}
              {fmtBtn("hwpx", <span className="gsd-fi hwp big">한</span>, "한글 파일로 보내기", "관공서·학교에 낼 때")}
              <button className="gsd-fmt" onClick={p.onExportImages}><span className="gsd-fmt-ic"><RiImageLine size={26} color="#7c3aed" /></span><span><b>그림으로 보내기</b><small>카톡·문자·블로그에 바로 올리는 그림</small></span></button>
            </div>
          </>
        )}
        {pane === "print" && (
          <>
            <h1>인쇄</h1>
            <div className="gsd-print">
              <div className="gsd-print-left">
                <div className="gsd-print-go">
                  <button className="gsd-print-btn" onClick={() => p.onPrint(po)}><RiPrinterLine size={30} /><span>인쇄</span></button>
                  <label>복사본: <input type="number" min={1} max={99} value={po.copies} onChange={(e) => setPo({ ...po, copies: Math.max(1, Number(e.target.value) || 1) })} /></label>
                </div>
                <h3>프린터</h3>
                {p.isApp ? (
                  <select value={po.printer} onChange={(e) => setPo({ ...po, printer: e.target.value })}>
                    {printers.map((pr) => <option key={pr.name} value={pr.name}>{pr.label}{pr.isDefault ? " (기본)" : ""}</option>)}
                  </select>
                ) : <p className="gsd-muted">브라우저 인쇄 창에서 고릅니다</p>}
                <h3>설정</h3>
                <select value={po.range} onChange={(e) => setPo({ ...po, range: e.target.value as PrintOpts["range"] })}>
                  <option value="all">모든 페이지 인쇄</option>
                  <option value="current">현재 페이지 인쇄</option>
                  <option value="custom">사용자 지정 인쇄</option>
                </select>
                {po.range === "custom" && <input placeholder="예: 1, 3-5" value={po.custom} onChange={(e) => setPo({ ...po, custom: e.target.value })} />}
                <select value={po.duplex} onChange={(e) => setPo({ ...po, duplex: e.target.value as PrintOpts["duplex"] })}>
                  <option value="simplex">단면 인쇄</option>
                  <option value="longEdge">양면 인쇄 (긴 쪽 넘김)</option>
                  <option value="shortEdge">양면 인쇄 (짧은 쪽 넘김)</option>
                </select>
                <select value={po.color ? "c" : "g"} onChange={(e) => setPo({ ...po, color: e.target.value === "c" })}>
                  <option value="c">컬러</option>
                  <option value="g">흑백</option>
                </select>
                <select value={p.page.landscape ? "l" : "p"} onChange={(e) => { p.setPage({ landscape: e.target.value === "l" }); setPreview(null); setTimeout(() => p.onPreview().then(setPreview), 400); }}>
                  <option value="p">세로 방향</option>
                  <option value="l">가로 방향</option>
                </select>
                <select value={p.page.paper} onChange={(e) => { const pp = PAPERS.find((x) => x.id === e.target.value); if (pp) { p.setPage({ paper: pp.id, w: pp.w, h: pp.h }); setPreview(null); setTimeout(() => p.onPreview().then(setPreview), 400); } }}>
                  {PAPERS.map((pp) => <option key={pp.id} value={pp.id}>{pp.name} ({pp.w} x {pp.h} mm)</option>)}
                </select>
                <select value={MARGINS.find((m) => Math.abs(m.m.left - p.page.margin.left) < 0.1 && Math.abs(m.m.top - p.page.margin.top) < 0.1)?.id || ""} onChange={(e) => { const m = MARGINS.find((x) => x.id === e.target.value); if (m) { p.setPage({ margin: { ...m.m } }); setPreview(null); setTimeout(() => p.onPreview().then(setPreview), 400); } }}>
                  <option value="" disabled>사용자 지정 여백</option>
                  {MARGINS.map((m) => <option key={m.id} value={m.id}>{m.name} 여백</option>)}
                </select>
              </div>
              <div className="gsd-print-pv">
                {preview === null ? <div className="gsd-muted">미리 보기를 만드는 중…</div> : preview.length ? (
                  <>
                    <img src={preview[Math.min(pvPage, preview.length - 1)]} alt="" />
                    <div className="gsd-print-nav">
                      <button disabled={pvPage <= 0} onClick={() => setPvPage(pvPage - 1)}>◀</button>
                      <span>{Math.min(pvPage, preview.length - 1) + 1} / {preview.length}</span>
                      <button disabled={pvPage >= preview.length - 1} onClick={() => setPvPage(pvPage + 1)}>▶</button>
                    </div>
                  </>
                ) : <div className="gsd-muted">미리 보기를 만들지 못했어요</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
