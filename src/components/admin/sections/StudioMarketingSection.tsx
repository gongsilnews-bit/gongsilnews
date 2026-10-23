"use client";

import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { listMyStudioVacancies } from "@/app/actions/studio";

const DocStudio = lazy(() => import("@/components/admin/studio-doc/DocStudio"));
const SimReportSection = lazy(() => import("@/components/admin/studio-sim/SimReportSection"));

/**
 * 공실마케팅 (중개사 관리자 업무 메뉴, 기사등록 아래) — 2026-10-15
 *
 * 뉴스·SNS발행처럼 왼쪽에 2차 카테고리, 오른쪽에 작업 화면.
 *  - AI 매물보고서   : /marketing/report?vacancy_id=…      (공실등록 목록의 [AI물건보고서]와 같은 도구)
 *  - 문서편집        : 워드·한글 문서 편집기 (src/components/admin/studio-doc — 2026-10-22, 공실을 고르지 않는다)
 *  - 인테리어·리모델링 예측 시뮬레이션 : 사진+조건 → 예측 이미지 + 예상 견적서 보고서 (src/components/admin/studio-sim — 2026-10-22, 유료 전용)
 *  - (AI 유리창홍보지는 2026-10-22 사장님 요청으로 이 메뉴에서 뺐다 — 이미지 편집 · 공실등록 목록 [유리창홍보지]로)
 * 공실을 고르면 그 도구를 이 화면 안에 띄운다. [새 창으로 열기]로 넓게 볼 수도 있다.
 * AI 매물보고서는 공실 없이도 만든다 (2026-10-23, docs/2026-10-23_report_without_vacancy_plan.md) —
 *   [+ 공실 없이 새로 만들기] → 매물 글 붙여넣기·사진 → 앱이 PC에 저장(rpt-…). 앱 안 · 공실스터디 멤버십 전용. 공유 링크 없음
 */

const CATEGORIES = [
  { id: "report", label: "AI 매물보고서", path: "/marketing/report", lead: "공실 하나로 매물 소개 보고서를 AI가 만듭니다. 손님에게 보내거나 인쇄해 쓰세요." },
  { id: "doc", label: "문서편집", path: "", lead: "워드(.docx)·한글(.hwpx·.hwp) 문서를 열고, 고치고, 그대로 저장합니다. PDF·그림으로도 저장돼요." },
  { id: "interior_sim", label: "인테리어 예측 시뮬레이션", path: "", lead: "실내 사진과 조건을 넣으면 AI 예측 이미지와 예상 견적서가 든 보고서를 만듭니다. 고객에게 보내거나 인쇄해 쓰세요. (유료회원 전용)" },
  { id: "remodel_sim", label: "리모델링 예측 시뮬레이션", path: "", lead: "건물 외관 사진과 조건을 넣으면 AI 예측 이미지와 예상 견적서가 든 보고서를 만듭니다. 고객에게 보내거나 인쇄해 쓰세요. (유료회원 전용)" },
];
const CATEGORY_KEY = "studio_marketing_category";
const VACANCY_KEY = "studio_marketing_vacancy";

type AiItem = { id: string; name: string; ready: boolean; ok: boolean };
type AiBridge = { openAiConnect: () => Promise<void>; ai: { list: () => Promise<AiItem[]> } };
const aiBridge = (): AiBridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: AiBridge }).gongsilStudio ?? null) : null);
type MyVacancy = { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; address: string };
type LocalReport = { id: string; title: string; createdAt: string; updatedAt: string };
type ReportBridge = {
  report: {
    create: (o: { text: string; photos: string[]; title: string }) => Promise<LocalReport>;
    list: () => Promise<LocalReport[]>;
    remove: (id: string) => Promise<boolean>;
  };
  marketing?: { onProgress?: (fn: (t: string) => void) => () => void };
};
const reportBridge = (): ReportBridge | null => {
  const g = typeof window !== "undefined" ? (window as unknown as { gongsilStudio?: ReportBridge }).gongsilStudio : undefined;
  return g?.report ? g : null;
};
const isLocal = (id: string) => /^rpt-/.test(id);
const errText = (e: unknown) => String((e as Error)?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");

/** 사진 → 긴 변 1920 webp 그림 데이터 (PC에 같이 저장된다) */
async function shrinkPhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(bmp.width * k);
  cv.height = Math.round(bmp.height * k);
  cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close();
  return cv.toDataURL("image/webp", 0.82);
}
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string; darkMode?: boolean };

export default function StudioMarketingSection({ theme }: { theme: Theme }) {
  // .gsm(공실마케팅 작업 파일)에서 연 작업 (2026-10-23, docs/2026-10-23_gsn_plan.md) — 앱이 주소 ?gsm=<id>&cat=<report|interior_sim|remodel_sim> 로 연다.
  // 아래 "이 기기 기억"을 먼저 바꿔 두면 각 화면이 그 작업을 고른 채 시작한다 (처음 그릴 때 한 번)
  useState(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    const id = u.searchParams.get("gsm") || "";
    const cat = u.searchParams.get("cat") || "";
    if (!/^(rpt|srp)-[\w-]+$/.test(id) || !["report", "interior_sim", "remodel_sim"].includes(cat)) return "";
    try {
      localStorage.setItem(CATEGORY_KEY, cat);
      if (cat === "report") localStorage.setItem(VACANCY_KEY, id);
      else localStorage.setItem(`studio_sim_proj_${cat.replace("_sim", "")}`, id);
    } catch {}
    u.searchParams.delete("gsm");
    u.searchParams.delete("cat");
    window.history.replaceState(window.history.state, "", u.toString());
    return id;
  });
  // 메뉴를 누른 뒤에만 그려지는 화면이라 처음 값을 이 기기 기억에서 바로 꺼낸다
  const remembered = (key: string) => {
    try {
      return typeof window === "undefined" ? "" : localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  };
  const [category, setCategoryState] = useState(() => {
    const c = remembered(CATEGORY_KEY);
    return CATEGORIES.some((x) => x.id === c) ? c : "report";
  });
  const [mine, setMine] = useState<MyVacancy[] | null>(null);
  const [vacancyId, setVacancyIdState] = useState(() => remembered(VACANCY_KEY));
  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  // 내 AI 연결 상태 (뉴스·SNS발행과 같다 — [AI로 채우기]가 이 ChatGPT 를 쓴다). 앱에서만 보인다
  const [ai, setAi] = useState<AiItem[] | null>(null);
  const loadAi = useCallback(async () => {
    const b = aiBridge();
    if (b) setAi(await b.ai.list().catch(() => []));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAi();
    window.addEventListener("focus", loadAi);
    return () => window.removeEventListener("focus", loadAi);
  }, [loadAi]);
  const connectedAi = (ai || []).filter((a) => a.ok);

  useEffect(() => {
    listMyStudioVacancies().then((r) => setMine(r.success ? r.data : [])).catch(() => setMine([]));
  }, []);

  // 공실 없이 만든 보고서 (PC) · 멤버십 여부
  const [locals, setLocals] = useState<LocalReport[]>([]);
  const loadLocals = () => {
    reportBridge()?.report.list().then(setLocals).catch(() => setLocals([]));
  };
  const [paid, setPaid] = useState<boolean | null>(null);
  useEffect(() => {
    reportBridge()?.report.list().then(setLocals).catch(() => setLocals([]));
    fetch("/api/studio/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPaid(d.success ? d.simAllowed === true : false))
      .catch(() => setPaid(false));
  }, []);
  const [newOpen, setNewOpen] = useState(false);

  const setCategory = (id: string) => {
    setCategoryState(id);
    try {
      localStorage.setItem(CATEGORY_KEY, id);
    } catch {}
  };
  const setVacancyId = (id: string) => {
    setVacancyIdState(id);
    try {
      localStorage.setItem(VACANCY_KEY, id);
    } catch {}
  };

  // vacancyId 칸은 공실 id 또는 공실 없이 만든 보고서 id(rpt-…) — 공실 없는 것은 AI 매물보고서에서만
  const localPick = cat.id === "report" && isLocal(vacancyId) && locals.some((r) => r.id === vacancyId);
  const known = localPick || mine?.some((v) => v.id === vacancyId);
  // 만들어 둔 도구 파일(public/marketing/…/index.html)을 바로 연다 — 개발 PC에서 도구 개발 서버를 안 켜도 열리게
  const url = !known ? "" : localPick ? `${cat.path}/index.html?local=${encodeURIComponent(vacancyId)}` : `${cat.path}/index.html?vacancy_id=${encodeURIComponent(vacancyId)}`;
  const canLocal = cat.id === "report" && Boolean(reportBridge());
  const removeLocal = async () => {
    const r = locals.find((x) => x.id === vacancyId);
    if (!r || !window.confirm(`"${r.title}" 보고서를 지울까요? PC에서 지워지고 되살릴 수 없어요.\n(내보낸 PDF·이미지 파일은 그대로 남아요)`)) return;
    await reportBridge()?.report.remove(r.id);
    setVacancyId("");
    loadLocals();
  };
  // 열 때마다·[새로 고침] 때마다 최신 도구 화면을 받는다 (예전 화면이 남아 새 기능이 안 보이던 것)
  const [fresh, setFresh] = useState(() => Date.now());
  const frameUrl = url ? `${url}&v=${fresh}` : "";
  const openNew = () => {
    if (!url || localPick) return;
    const full = `${window.location.origin}${url}`;
    const studio = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => Promise<void> } }).gongsilStudio;
    if (studio?.openInBrowser) studio.openInBrowser(full);
    else window.open(full, "_blank", "noopener");
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* 왼쪽: 2차 카테고리 (뉴스·SNS발행과 같은 모양) */}
      <aside style={{ width: 210, flexShrink: 0, background: theme.cardBg, borderRight: `1px solid ${theme.border}`, padding: "22px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ margin: "0 4px", fontSize: 19, fontWeight: 800, color: theme.textPrimary }}>공실마케팅</h2>
        {ai && (
          <button onClick={() => aiBridge()?.openAiConnect()} title="내 AI 연결"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              background: connectedAi.length ? (theme.darkMode ? "rgba(34,197,94,0.12)" : "#ecfdf5") : theme.cardBg, border: `1px solid ${connectedAi.length ? (theme.darkMode ? "rgba(110,231,183,0.6)" : "#6ee7b7") : theme.border}`, color: connectedAi.length ? (theme.darkMode ? "#6ee7b7" : "#047857") : theme.textPrimary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: connectedAi.length ? "#22c55e" : "#cbd5e1", boxShadow: connectedAi.length ? "0 0 0 3px rgba(34,197,94,0.2)" : "none" }} />
            {connectedAi.length ? `${connectedAi.map((a) => a.name).join(", ")} 연결됨` : "내 AI 연결하기"}
          </button>
        )}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{ textAlign: "left", padding: "9px 12px", border: 0, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
                  fontWeight: on ? 700 : 500, color: on ? (theme.darkMode ? "#ffffff" : "#1a3a6b") : theme.textSecondary, background: on ? (theme.darkMode ? "rgba(255,255,255,0.10)" : "rgba(26,58,107,0.08)") : "transparent",
                  boxShadow: on ? `inset 3px 0 0 ${(theme.darkMode ? "#ffffff" : "#1a3a6b")}` : "none" }}>
                {c.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 오른쪽: 문서편집은 편집기를 바로 (공실 고르기 없음) */}
      {cat.id === "doc" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Suspense fallback={<div style={{ padding: 40, color: theme.textSecondary }}>문서편집을 여는 중…</div>}>
            <DocStudio />
          </Suspense>
        </div>
      ) : cat.id === "interior_sim" || cat.id === "remodel_sim" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 0", minWidth: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>{cat.label}</h3>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: theme.textSecondary }}>{cat.lead}</p>
          </div>
          <Suspense fallback={<div style={{ padding: 40, color: theme.textSecondary }}>여는 중…</div>}>
            <SimReportSection theme={theme} kind={cat.id === "interior_sim" ? "interior" : "remodel"} />
          </Suspense>
        </div>
      ) : (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "24px 24px 0" }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary }}>{cat.label}</h3>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: theme.textSecondary }}>{cat.lead}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {mine !== null && mine.length === 0 && !(canLocal && locals.length) ? (
            <span style={{ fontSize: 13.5, color: "#b45309" }}>아직 등록한 공실이 없습니다. 공실등록 메뉴에서 공실을 등록하면 여기에 나옵니다.{canLocal && " 공실 없이 만들 수도 있어요 →"}</span>
          ) : (
            <select value={known ? vacancyId : ""} onChange={(e) => setVacancyId(e.target.value)}
              style={{ flex: 1, minWidth: 260, maxWidth: 560, padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, background: theme.cardBg, color: theme.textPrimary }}>
              <option value="">{mine === null ? "내 공실 불러오는 중…" : canLocal && locals.length ? "공실이나 보고서를 골라 주세요" : `공실을 골라 주세요 (${mine.length}개)`}</option>
              {canLocal && locals.length > 0 && (
                <optgroup label={`공실 없이 만든 보고서 (${locals.length}개)`}>
                  {locals.map((r) => (
                    <option key={r.id} value={r.id}>{r.title} · {new Date(r.updatedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</option>
                  ))}
                </optgroup>
              )}
              {(mine || []).length > 0 && (
                <optgroup label={`내 공실 (${(mine || []).length}개)`}>
                  {(mine || []).map((v) => (
                    <option key={v.id} value={v.id}>[{v.trade_type || "-"}] {v.building_name || "무제"} ({v.address || ""}) · {v.vacancy_no}</option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          {canLocal && (
            <button onClick={() => setNewOpen(true)} title="공실을 등록하지 않고 매물 글·사진으로 보고서를 만들어 PC에 저장해요 (공실스터디 멤버십 전용)"
              style={{ padding: "10px 14px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              + 공실 없이 새로 만들기
            </button>
          )}
          {localPick ? (
            <button onClick={removeLocal} title="이 보고서를 PC에서 지워요"
              style={{ padding: "10px 14px", background: theme.cardBg, color: "#dc2626", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              삭제
            </button>
          ) : (
            <button onClick={openNew} disabled={!url}
              style={{ padding: "10px 14px", background: theme.cardBg, color: url ? theme.textPrimary : theme.textSecondary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: url ? "pointer" : "default" }}>
              새 창으로 열기
            </button>
          )}
          <button onClick={() => setFresh(Date.now())} disabled={!url} title="도구 화면을 다시 불러옵니다 (저장하지 않은 편집은 사라집니다)"
            style={{ padding: "10px 14px", background: theme.cardBg, color: url ? theme.textPrimary : theme.textSecondary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: url ? "pointer" : "default" }}>
            ↻ 새로 고침
          </button>
        </div>

        {url ? (
          <iframe key={frameUrl} src={frameUrl} title={cat.label}
            style={{ flex: 1, width: "100%", border: `1px solid ${theme.border}`, borderBottom: 0, borderRadius: "12px 12px 0 0", background: "#fff" }} />
        ) : (
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", fontSize: 14, color: theme.textSecondary }}>
            위에서 공실을 고르면 {cat.label} 화면이 여기에 열립니다.
            {canLocal && <div style={{ marginTop: 8 }}>공실을 등록하지 않았다면 <b>[+ 공실 없이 새로 만들기]</b>로 매물 글·사진만으로 만들 수 있어요.</div>}
          </div>
        )}
      </div>
      )}
      {newOpen && (
        <NewLocalReport theme={theme} paid={paid} onClose={() => setNewOpen(false)}
          onMade={(r) => {
            setNewOpen(false);
            setLocals((list) => [r, ...list.filter((x) => x.id !== r.id)]);
            setVacancyId(r.id);
          }} />
      )}
    </div>
  );
}

/** [+ 공실 없이 새로 만들기] 창 — 매물 글 붙여넣기(AI가 정리) · 사진 · 이름. 둘 다 비우면 빈 보고서(직접 입력) */
function NewLocalReport({ theme, paid, onClose, onMade }: { theme: Theme; paid: boolean | null; onClose: () => void; onMade: (r: LocalReport) => void }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const addPhotos = async (files: FileList | null) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/")).slice(0, 7 - photos.length);
    if (!list.length) return;
    setBusy("사진을 줄이는 중…");
    try {
      const out: string[] = [];
      for (const f of list) out.push(await shrinkPhoto(f));
      setPhotos((p) => [...p, ...out].slice(0, 7));
    } catch (e) {
      setErr("사진을 읽지 못했습니다: " + errText(e));
    } finally {
      setBusy("");
    }
  };
  const make = async () => {
    const b = reportBridge();
    if (!b) return;
    setErr("");
    setBusy(text.trim() ? "AI에 요청하는 중…" : "만드는 중…");
    const off = b.marketing?.onProgress?.((t) => setBusy(t));
    try {
      onMade(await b.report.create({ text, photos, title }));
    } catch (e) {
      setErr(errText(e));
    } finally {
      off?.();
      setBusy("");
    }
  };
  const box: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: theme.cardBg, color: theme.textPrimary };
  const label: React.CSSProperties = { display: "block", fontSize: 13.5, fontWeight: 700, color: theme.textPrimary, margin: "16px 0 6px" };
  const sub: React.CSSProperties = { fontWeight: 500, color: theme.textSecondary };
  return (
    <div onClick={busy ? undefined : onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px, 100%)", maxHeight: "90vh", overflowY: "auto", background: theme.cardBg, borderRadius: 14, padding: "24px 26px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: theme.textPrimary }}>공실 없이 매물보고서 만들기</h3>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.textSecondary, lineHeight: 1.6 }}>
          공실을 등록하지 않고 보고서를 만들어 <b>이 PC에 저장</b>해요. 공유 링크는 없고, PDF·이미지·인쇄로 보내요.
        </p>
        {paid === false ? (
          <div style={{ marginTop: 18, padding: "22px 18px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #6ee7b7", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46" }}>공실 없이 만드는 매물보고서는 공실스터디 멤버십 전용입니다</div>
            <div style={{ fontSize: 13.5, color: "#047857", marginTop: 6 }}>등록한 공실로 만드는 매물보고서는 지금처럼 쓸 수 있어요.</div>
            <a href="/study" target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 14, padding: "10px 18px", borderRadius: 8, background: "#059669", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>공실스터디 멤버십 알아보기 →</a>
          </div>
        ) : (
          <>
            <label style={label}>매물 글 붙여넣기 <span style={sub}>— 문자·메모·다른 사이트 매물 설명. AI가 가격·면적·층을 정리해요</span></label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} disabled={Boolean(busy)}
              placeholder={"예) 논현동 무지개빌라 전세 5억 / 전용 59㎡ 3층(총 5층) 방3 욕실2 / 남향, 주차 1대, 즉시 입주\n\n비우면 빈 보고서로 시작해 직접 입력해요."}
              style={{ ...box, resize: "vertical", lineHeight: 1.6 }} />
            <label style={label}>사진 <span style={sub}>— 7장까지, 첫 장이 표지 사진 (보고서에서 바꿀 수 있어요)</span></label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {photos.map((src, i) => (
                <div key={i} style={{ position: "relative", width: 84, height: 64 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6, border: `1px solid ${theme.border}` }} />
                  <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} title="빼기"
                    style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: 0, background: "#111827", color: "#fff", fontSize: 12, cursor: "pointer", lineHeight: "20px", padding: 0 }}>×</button>
                </div>
              ))}
              {photos.length < 7 && (
                <label style={{ width: 84, height: 64, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px dashed ${theme.border}`, borderRadius: 6, fontSize: 13, color: theme.textSecondary, cursor: "pointer" }}>
                  + 사진
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
            <label style={label}>보고서 이름 <span style={sub}>— 비우면 매물 정보로 지어요</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 논현동 무지개빌라 전세" style={box} disabled={Boolean(busy)} />
          </>
        )}
        {err && <div style={{ marginTop: 14, fontSize: 13.5, color: "#dc2626", lineHeight: 1.5 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 20 }}>
          {busy && <span style={{ flex: 1, fontSize: 13.5, color: theme.textSecondary }}>{busy}</span>}
          <button onClick={onClose} disabled={Boolean(busy)}
            style={{ padding: "10px 16px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>
            닫기
          </button>
          {paid !== false && (
            <button onClick={make} disabled={Boolean(busy) || paid === null}
              style={{ padding: "10px 18px", background: "#1a3a6b", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy || paid === null ? 0.6 : 1 }}>
              {text.trim() ? "AI로 정리해서 만들기" : "만들기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
