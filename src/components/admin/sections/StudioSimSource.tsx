"use client";

import React, { useEffect, useRef, useState } from "react";
import { findStudioVacancyByNo, listMyStudioVacancies } from "@/app/actions/studio";
import StudioChannelTabs from "./StudioChannelTabs";

/**
 * 뉴스·SNS발행 > 인테리어뉴스 · 리모델링뉴스 (크롬 확장 interior10 · remodeling10 을 앱으로 옮긴 것, 유료회원 전용)
 *
 * ① 사진: 내 공실의 등록 사진(공실 분석 결과) 또는 내 사진 올리기 → 최대 3장 고르기 (첫 장이 "지금 모습")
 * ② 조건: 인테리어 = 공간 유형 + 스타일·천장·바닥재·벽면·가구·조명 / 리모델링 = 외장재·창호·색상·파사드·간판·조경·조명, 이미지 비율
 * ③ 공사비 기준: 인테리어 = 면적·천장 높이 / 리모델링 = 가로·세로·층수·층고·고칠 면 → 예상 공사비 미리보기 (확장 단가표)
 * ④ [ChatGPT로 시뮬레이션] — 설계 지시서 → 같은 대화에 사진을 붙여 예측 이미지 → 📋 결과표
 * 결과표가 생기면 아래는 공실뉴스와 같은 채널 탭(기사 → 블로그 · SNS · 유튜브 대본).
 */

type Opt = { id: string; name: string };
type CostField = { key: string; label: string; unit?: string; step?: number; options?: { id: number; name: string }[] };
type Options = { kind: string; label: string; rooms: Opt[] | null; groups: { key: string; label: string; single?: boolean; options: Opt[] }[]; ratios: Opt[]; costFields: CostField[] };
type Cost = { rangeText: string; basisText: string; items: { label: string; basis: string; min: number; max: number }[]; notice: string; excludes: string };
type Result = {
  title: string; location: string; dateText: string; roomName: string; before: string | null;
  versions: { index: number; diffKo: string; image: string | null }[];
  design: Record<string, string[]>; designSpec: { label: string; value: string }[]; constraints: string; disclaimer: string; cost: Cost;
};
type Sim = {
  id: string; kind: string; createdAt: string; vacancyId: string | null; vacancyTitle: string;
  photos: { id: string; src: string; on: boolean; thumb: string | null }[];
  design: Record<string, string | string[] | number>; costBase: Record<string, number>; cost: Cost; result: Result | null; label: string;
};
type Recent = { id: string; createdAt: string; done: boolean; label: string };
type Bridge = {
  sim: {
    options: (kind: string) => Promise<Options>;
    create: (kind: string) => Promise<Sim>;
    get: (id: string) => Promise<Sim | null>;
    list: (kind: string) => Promise<Recent[]>;
    useVacancy: (opts: { id: string; vacancyId: string }) => Promise<Sim>;
    addPhotos: (opts: { id: string; dataUrls: string[] }) => Promise<Sim>;
    update: (opts: { id: string; pick?: string[]; design?: Record<string, unknown>; costBase?: Record<string, number> }) => Promise<Sim>;
    run: (id: string) => Promise<Sim>;
    exportResult: (opts: { id: string; what: "sheet" | "images" }) => Promise<{ folder: string; count: number }>;
    onProgress: (fn: (t: string) => void) => () => void;
  };
};
type MyVacancy = { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; address: string; photoCount: number };

const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null) : null);
const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
/* 시뮬레이션 진행 — 글자만 바뀌면 지루하니, 단계별 쉬운 말 + 공실뉴스 로딩 점 + 걸린 시간 */
const SIM_STEPS = [
  { key: 1, head: "AI가 설계 지시서를 쓰고 있어요" },
  { key: 2, head: "AI가 열심히 {what} 예측 이미지를 만들고 있어요" },
  { key: 3, head: "결과표를 정리하고 있어요" },
];
function SimProgress({ text, what }: { text: string; what: string }) {
  const [stage, setStage] = useState(1);
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (text.startsWith("②")) setStage(2);
    else if (text.startsWith("③")) setStage(3);
  }, [text]);
  const head = SIM_STEPS[stage - 1].head.replace("{what}", what);
  return (
    <div style={{ marginTop: 12, padding: "18px 20px", borderRadius: 12, background: "#f0f5ff", border: "1px solid #d6e4ff", textAlign: "center" }}>
      <style>{`@keyframes gwSimDot { 0%, 60%, 100% { transform: translateY(0); opacity: .45 } 30% { transform: translateY(-7px); opacity: 1 } }`}</style>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 6, height: 20, marginBottom: 10 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "#2563eb", animation: `gwSimDot 1.1s ease-in-out ${i * 0.16}s infinite` }} />
        ))}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 800, color: "#1a3a6b" }}>{head}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>잠시만 기다려 주세요 · {Math.floor(sec / 60) ? `${Math.floor(sec / 60)}분 ` : ""}{sec % 60}초</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {SIM_STEPS.map((x) => (
          <span key={x.key} style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
            background: x.key < stage ? "#16a34a" : x.key === stage ? "#1a3a6b" : "#e2e8f0", color: x.key <= stage ? "#fff" : "#64748b" }}>
            {x.key < stage ? "✓ " : ""}{["설계 지시서", "예측 이미지", "결과표"][x.key - 1]}
          </span>
        ))}
      </div>
      {text && <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>{text.replace(/^[①②③]\s*/, "")}</div>}
    </div>
  );
}

const MAX_PICK = 1; // 사진 한 장 = 공간 하나
const won = (man: number) => {
  const v = Math.round(man || 0);
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString()}만`;
  if (eok) return `${eok}억`;
  return `${rest.toLocaleString()}만`;
};
function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function StudioSimSource({ theme, kind, allowed, tab, onTab, onUsed }: {
  theme: Theme; kind: "interior" | "remodel"; allowed: boolean | null; tab: string; onTab: (id: string) => void; onUsed: () => void;
}) {
  const LAST_KEY = `studio_last_sim_${kind}`;
  const [opts, setOpts] = useState<Options | null>(null);
  const [sim, setSim] = useState<Sim | null>(null);
  const [open, setOpen] = useState(true);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [mine, setMine] = useState<MyVacancy[] | null>(null);
  const [pickVacancy, setPickVacancy] = useState("");
  const [noInput, setNoInput] = useState("");
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [fresh, setFresh] = useState(false); // 방금 끝난 결과 — 완성 안내를 띄운다
  const name = kind === "interior" ? "인테리어" : "리모델링";
  const full = kind === "interior" ? "인테리어" : "건물 외관 리모델링"; // 리모델링은 꼭 건물 외관이라고 밝힌다

  const choose = (s: Sim | null) => {
    setSim(s);
    setFresh(false);
    setOpen(!s?.result);
    try {
      if (s) localStorage.setItem(LAST_KEY, s.id);
    } catch {}
  };

  useEffect(() => {
    const b = bridge();
    if (!b || allowed === false) return;
    b.sim.options(kind).then(setOpts).catch((e) => setError(cleanErr(e)));
    b.sim.list(kind).then(setRecent).catch(() => {});
    let id = "";
    try {
      id = localStorage.getItem(LAST_KEY) || "";
    } catch {}
    if (id) b.sim.get(id).then((s) => s && choose(s)).catch(() => {});
    listMyStudioVacancies().then((r) => setMine(r.success ? r.data : [])).catch(() => setMine([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, allowed]);

  const [errorAt, setErrorAt] = useState<"photo" | "run">("photo"); // 오류를 보여 줄 자리
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    setErrorAt(label === "시뮬레이션 중…" ? "run" : "photo");
    const b = bridge();
    const off = b ? b.sim.onProgress(setProgress) : () => {};
    try {
      await fn();
    } catch (e) {
      setError(cleanErr(e));
    } finally {
      off();
      setProgress("");
      setBusy("");
    }
  };
  const ensureSim = async (): Promise<Sim> => {
    if (sim) return sim;
    const s = await bridge()!.sim.create(kind);
    choose(s);
    return s;
  };
  const newSim = () => run("새로 준비하는 중…", async () => {
    choose(await bridge()!.sim.create(kind));
    setOpen(true);
  });
  const fromVacancy = (vacancyId: string) => run("공실 사진을 가져오는 중…", async () => {
    const s = await ensureSim();
    choose(await bridge()!.sim.useVacancy({ id: s.id, vacancyId }));
    setOpen(true);
  });
  const byNo = async () => {
    setError("");
    const res = await findStudioVacancyByNo(noInput);
    if (!res.success) return setError(res.error);
    fromVacancy((res.data as { id: string }).id);
  };
  const upload = (files: FileList | null) => {
    if (!files || !files.length) return;
    // 파일 칸을 비우면 FileList 도 비므로 지금 바로 꺼내 둔다
    const list = Array.from(files).slice(0, 10);
    run("사진을 넣는 중…", async () => {
      const s = await ensureSim();
      const dataUrls = await Promise.all(list.map(readAsDataUrl));
      choose(await bridge()!.sim.addPhotos({ id: s.id, dataUrls }));
      setOpen(true);
    });
  };
  const update = async (patch: { pick?: string[]; design?: Record<string, unknown>; costBase?: Record<string, number> }) => {
    if (!sim) return;
    try {
      setSim(await bridge()!.sim.update({ id: sim.id, ...patch }));
    } catch (e) {
      setError(cleanErr(e));
    }
  };
  const togglePhoto = (pid: string) => {
    if (!sim) return;
    if (sim.photos.find((p) => p.id === pid)?.on) return; // 한 장은 늘 골라 둔다
    update({ pick: [pid] }); // 다른 사진을 누르면 그 사진으로 바뀐다
  };
  const toggleOpt = (key: string, id: string, single?: boolean) => {
    if (!sim) return;
    if (single) return update({ design: { [key]: [id] } });
    const cur = (sim.design[key] as string[]) || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (!next.length) return; // 하나는 남긴다
    update({ design: { [key]: next } });
  };
  /* 확장과 같은 결과표 버튼: 결과표 한 장 PNG · 예측 이미지 저장 (PC 문서 폴더) */
  const [saveNote, setSaveNote] = useState("");
  const saveResult = async (what: "sheet" | "images") => {
    if (!sim) return;
    setSaveNote(what === "sheet" ? "결과표를 그리는 중…" : "이미지를 저장하는 중…");
    try {
      const r = await bridge()!.sim.exportResult({ id: sim.id, what });
      setSaveNote(`${what === "sheet" ? "결과표 이미지" : `이미지 ${r.count}장`}을 저장하고 폴더를 열었습니다: ${r.folder}`);
    } catch (e) {
      setSaveNote(cleanErr(e));
    }
  };
  const toArticle = () => {
    setFresh(false);
    onTab("article");
    setOpen(false);
    setTimeout(() => window.scrollTo?.({ top: 0 }), 0);
  };

  const start = () => run("시뮬레이션 중…", async () => {
    if (!sim) return;
    const s = await bridge()!.sim.run(sim.id);
    choose(s);
    // 끝나면 결과표부터 펼쳐 보여 준다 (기사 쓰기는 결과표의 [이 결과로 기사 쓰기]로)
    setOpen(true);
    setFresh(true);
    onTab("article");
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    bridge()?.sim.list(kind).then(setRecent).catch(() => {});
    onUsed();
  });

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const plainBtn: React.CSSProperties = { padding: "9px 14px", background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
  const chip = (on: boolean): React.CSSProperties => ({
    padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
    border: `1px solid ${on ? "#1a3a6b" : theme.border}`, background: on ? "#1a3a6b" : "transparent", color: on ? "#fff" : theme.textPrimary,
  });
  const step = (n: number, t: string, extra?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 12px" }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary, flex: 1 }}>{t}</h3>
      {extra}
    </div>
  );
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: theme.textSecondary, margin: "10px 0 6px" };

  // 유료 전용 잠금 (확장과 같다 — 무료 체험 없음)
  if (allowed === false) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "44px 24px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{name}뉴스는 공실스터디 멤버십(유료) 전용입니다</div>
        <div style={{ marginTop: 8, fontSize: 13.5, color: theme.textSecondary, lineHeight: 1.7 }}>
          사진 한 장으로 {kind === "interior" ? "실내 인테리어" : "건물 외관 리모델링"} 예측 이미지와 예상 공사비를 만들고, 기사·블로그·SNS·유튜브 대본까지 씁니다.
        </div>
        <a href="/study" target="_blank" rel="noreferrer"
          style={{ display: "inline-block", marginTop: 16, padding: "11px 20px", borderRadius: 8, background: "#059669", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
          공실스터디 멤버십 알아보기 →
        </a>
      </div>
    );
  }

  const r = sim?.result || null;
  const picked = sim ? sim.photos.filter((p) => p.on).length : 0;

  return (
    <>
      {/* 접힌 요약 (결과표가 있으면) */}
      {sim && r && !open && (
        <div style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[r.before, r.versions[0]?.image].map((src, i) => (
              <div key={i} style={{ width: 52, height: 40, borderRadius: 8, overflow: "hidden", background: "#e5e7eb" }}>
                {src && <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>{r.title}{r.roomName ? ` · ${r.roomName}` : ""}</div>
            <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{full} 시뮬레이션 · 예상 공사비 {r.cost.rangeText} · {r.dateText}</div>
          </div>
          <button onClick={() => setOpen(true)} style={plainBtn}>결과표·조건 보기</button>
          <button onClick={newSim} style={plainBtn}>새 시뮬레이션</button>
        </div>
      )}

      {(!sim || open) && (
        <div style={card}>
          {step(1, "사진 고르기", sim && r ? <button onClick={() => setOpen(false)} style={{ ...plainBtn, padding: "6px 12px", fontSize: 12.5 }}>접기</button> : null)}
          <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 10, lineHeight: 1.6 }}>
            {kind === "interior" ? "고칠 방의 실내 사진" : <b>바깥에서 찍은 건물 외관 사진</b>}을 1장 골라 주세요.{kind === "remodel" && " (실내 사진은 안 돼요)"} 다른 사진을 누르면 바뀝니다. 공실 사진이면 기사에 매물 정보가 함께 들어갑니다.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* 고르면 바로 그 공실의 등록 사진을 가져온다 */}
            <select value={pickVacancy} disabled={Boolean(busy)} onChange={(e) => { setPickVacancy(e.target.value); if (e.target.value) fromVacancy(e.target.value); }}
              style={{ flex: 1, minWidth: 240, maxWidth: 480, padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary }}>
              <option value="">{mine === null ? "내 공실 불러오는 중…" : `내 공실에서 고르기 (${mine.length}개)`}</option>
              {(mine || []).map((v) => (
                <option key={v.id} value={v.id}>[{v.trade_type || "-"}] {v.building_name || "무제"} ({v.address || ""}) · 사진 {v.photoCount}장</option>
              ))}
            </select>
            <input value={noInput} onChange={(e) => setNoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && byNo()} placeholder="또는 공실번호"
              style={{ width: 130, padding: "9px 12px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary }} />
            <button onClick={byNo} disabled={!noInput.trim() || Boolean(busy)} style={plainBtn}>불러오기</button>
            <span style={{ fontSize: 13, color: theme.textSecondary }}>또는</span>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={Boolean(busy)} style={plainBtn}>내 사진 올리기</button>
          </div>
          {sim && sim.vacancyId && <div style={{ marginTop: 8, fontSize: 12.5, color: "#1a3a6b" }}>공실 사진: {sim.vacancyTitle}</div>}
          {/* 사진을 넣는 동안·실패하면 바로 여기서 알린다 (시뮬레이션 진행은 아래 버튼 옆) */}
          {busy && busy !== "시뮬레이션 중…" && <div style={{ marginTop: 10, fontSize: 14, color: "#1a3a6b", fontWeight: 600 }}>{progress || busy}</div>}
          {error && busy !== "시뮬레이션 중…" && errorAt === "photo" && <div style={{ marginTop: 10, fontSize: 14, color: "#c53030", lineHeight: 1.6 }}>{error}</div>}

          {sim && sim.photos.length > 0 && (
            <>
              <div style={{ ...label, marginTop: 14 }}>고른 사진 {picked}/{MAX_PICK}<span style={{ fontWeight: 500 }}> · {kind === "interior" ? "아래 공간 유형도 이 사진에 맞게 골라 주세요" : "건물 외관이 잘 보이는 사진인지 확인해 주세요"}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {sim.photos.map((p) => {
                  const order = sim.photos.filter((x) => x.on).findIndex((x) => x.id === p.id);
                  return (
                    <button key={p.id} onClick={() => togglePhoto(p.id)}
                      style={{ position: "relative", padding: 0, border: 0, borderRadius: 10, overflow: "hidden", cursor: "pointer", aspectRatio: "4 / 3", background: "#e5e7eb",
                        boxShadow: p.on ? "0 0 0 3px #1a3a6b" : `0 0 0 1px ${theme.border}`, opacity: p.on ? 1 : 0.7 }}>
                      {p.thumb && <img src={p.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                      {p.on && <span style={{ position: "absolute", top: 6, left: 6, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#1a3a6b", color: "#fff" }}>{order === 0 ? "지금 모습" : order + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {sim && opts && (
            <>
              <div style={{ borderTop: `1px solid ${theme.border}`, margin: "20px 0 14px" }} />
              {step(2, kind === "interior" ? "인테리어 조건" : "건물 외관 리모델링 설계 조건")}
              {opts.rooms && (
                <>
                  <div style={label}>공간 유형</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {opts.rooms.map((o) => (
                      <button key={o.id} onClick={() => update({ design: { roomType: o.id } })} style={chip(sim.design.roomType === o.id)}>{o.name.replace(/\s*\(.*\)$/, "")}</button>
                    ))}
                  </div>
                </>
              )}
              {opts.groups.map((g) => (
                <div key={g.key}>
                  <div style={label}>{g.label} <span style={{ fontWeight: 500 }}>· {g.single ? "하나만 골라요" : "여러 개 고를 수 있어요"}</span></div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {g.options.map((o) => (
                      <button key={o.id} onClick={() => toggleOpt(g.key, o.id, g.single)} style={chip(((sim.design[g.key] as string[]) || []).includes(o.id))}>{o.name}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={label}>이미지 비율</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {opts.ratios.map((o) => (
                  <button key={o.id} onClick={() => update({ design: { aspectRatio: o.id } })} style={chip(sim.design.aspectRatio === o.id)}>{o.name}</button>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${theme.border}`, margin: "20px 0 14px" }} />
              {step(3, "공사비 기준")}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                {opts.costFields.map((f) => (
                  <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 700, color: theme.textSecondary }}>
                    {f.label}
                    {f.options ? (
                      <select value={sim.costBase[f.key]} onChange={(e) => update({ costBase: { [f.key]: Number(e.target.value) } })}
                        style={{ padding: "8px 10px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary }}>
                        {f.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" min={0} step={f.step || 1} value={sim.costBase[f.key] ?? ""} onChange={(e) => update({ costBase: { [f.key]: Number(e.target.value) } })}
                          style={{ width: 90, padding: "8px 10px", border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13.5, background: theme.cardBg, color: theme.textPrimary }} />
                        <span style={{ fontWeight: 600 }}>{f.unit}</span>
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: theme.bg || "#f6f8fa", fontSize: 13.5, color: theme.textPrimary, lineHeight: 1.7 }}>
                예상 공사비 <b style={{ color: "#1a3a6b" }}>{sim.cost.rangeText}</b> <span style={{ color: theme.textSecondary }}>({sim.cost.basisText})</span>
                <div style={{ fontSize: 12, color: theme.textSecondary }}>{sim.cost.notice} · {sim.cost.excludes}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260, fontSize: 13, color: theme.textSecondary, lineHeight: 1.6 }}>
                  ChatGPT가 ① 설계 지시서를 쓰고 ② 고른 사진을 고쳐 예측 이미지를 그립니다. 2~4분 걸리고, AI 이미지 하루 한도에서 1장으로 셉니다.
                </div>
                <button onClick={start} disabled={!picked || Boolean(busy)}
                  style={{ padding: "11px 20px", background: !picked || busy ? "#94a3b8" : "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: !picked || busy ? "default" : "pointer" }}>
                  {busy === "시뮬레이션 중…" ? "시뮬레이션 중…" : r ? "다시 시뮬레이션" : "ChatGPT로 시뮬레이션"}
                </button>
              </div>
            </>
          )}

          {!sim && (
            <div style={{ marginTop: 14 }}>
              <button onClick={newSim} disabled={Boolean(busy)} style={plainBtn}>새 시뮬레이션 시작</button>
            </div>
          )}
          {busy === "시뮬레이션 중…" && <SimProgress text={progress} what={kind === "interior" ? "인테리어" : "건물 외관"} />}
          {error && errorAt === "run" && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030", lineHeight: 1.6 }}>{error}</div>}

          {recent.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>최근 {full} 시뮬레이션 (이 PC)</div>
              {recent.map((c) => (
                <button key={c.id} onClick={() => bridge()?.sim.get(c.id).then((s) => s && choose(s))}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "8px 10px", border: 0, borderRadius: 8, background: sim?.id === c.id ? "rgba(26,58,107,0.08)" : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c.done ? "#16a34a" : "#b45309", flexShrink: 0 }}>{c.done ? "완료" : "만드는 중"}</span>
                  <span style={{ flex: 1, fontSize: 13.5, color: theme.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
                  <span style={{ fontSize: 12, color: theme.textSecondary, flexShrink: 0 }}>{c.createdAt.slice(0, 10)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📋 결과표 */}
      {sim && r && open && (
        <div ref={resultRef} style={{ ...card, ...(fresh ? { boxShadow: "0 0 0 2px #16a34a" } : {}) }}>
          {fresh && (
            <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", color: "#166534", fontSize: 14, fontWeight: 700 }}>
              ✓ {full} 시뮬레이션이 완성됐어요! 결과를 확인하고, 아래 버튼으로 결과표를 저장하거나 기사를 써 보세요.
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.textPrimary }}>📋 시뮬레이션 결과표</h3>
            <span style={{ fontSize: 13, color: theme.textSecondary }}>{[r.title, r.location, r.dateText].filter(Boolean).join(" · ")}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ src: r.before, cap: "지금 모습" }, { src: r.versions[0]?.image || null, cap: `${full} 예측 (AI)` }].map((x, i) => (
              <figure key={i} style={{ margin: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${theme.border}`, background: "#111" }}>
                {x.src && <img src={x.src} alt={x.cap} style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "contain" }} />}
                <figcaption style={{ padding: "7px 10px", fontSize: 12.5, fontWeight: 700, background: theme.cardBg, color: i ? "#1a3a6b" : theme.textSecondary }}>{x.cap}</figcaption>
              </figure>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
            <div>
              <div style={label}>고른 조건</div>
              {Object.entries(r.design).map(([k, v]) => (
                <div key={k} style={{ fontSize: 13, color: theme.textPrimary, padding: "3px 0" }}><span style={{ color: theme.textSecondary }}>{k}</span> · {v.join(", ")}</div>
              ))}
              {r.designSpec.length > 0 && <div style={label}>예측 디자인 사양</div>}
              {r.designSpec.map((x) => (
                <div key={x.label} style={{ fontSize: 13, color: theme.textPrimary, padding: "3px 0", lineHeight: 1.5 }}><span style={{ color: theme.textSecondary }}>{x.label}</span> · {x.value}</div>
              ))}
            </div>
            <div>
              <div style={label}>예상 공사비</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1a3a6b" }}>{r.cost.rangeText}</div>
              <div style={{ fontSize: 12, color: theme.textSecondary, margin: "2px 0 8px" }}>{r.cost.basisText}</div>
              {r.cost.items.map((it) => (
                <div key={it.label} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "3px 0", borderBottom: `1px dashed ${theme.border}`, color: theme.textPrimary }}>
                  <span>{it.label}</span><span>{won(it.min)} ~ {won(it.max)}원</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12, color: "#b45309", lineHeight: 1.6 }}>{r.cost.notice}<br />{r.cost.excludes}</div>
            </div>
          </div>
          {r.disclaimer && <div style={{ marginTop: 12, fontSize: 12.5, color: theme.textSecondary, lineHeight: 1.6 }}>※ {r.disclaimer}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 18 }}>
            <button onClick={() => saveResult("sheet")}
              style={{ textAlign: "left", padding: "12px 16px", border: 0, borderRadius: 10, background: "#1d4ed8", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>📋 결과표 이미지 저장</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{kind === "interior" ? "집주인·손님에게" : "임대인에게"} 보낼 수 있는 한 장짜리 결과표(PNG)</div>
            </button>
            <button onClick={() => saveResult("images")}
              style={{ textAlign: "left", padding: "12px 16px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>🖼 예측 이미지 저장 ({r.versions.length}장)</div>
              <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>지금 모습 사진과 함께 저장</div>
            </button>
            <button onClick={toArticle}
              style={{ textAlign: "left", padding: "12px 16px", border: 0, borderRadius: 10, background: "#16a34a", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>이 결과로 기사 쓰기 →</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>공실뉴스 기사 탭으로 갑니다</div>
            </button>
          </div>
          {saveNote && <div style={{ marginTop: 10, fontSize: 13, color: /못|실패|없/.test(saveNote) ? "#c53030" : "#16a34a", lineHeight: 1.6, wordBreak: "break-all" }}>{saveNote}</div>}
        </div>
      )}

      {sim && r && <StudioChannelTabs key={sim.id} theme={theme} workId={sim.id} kind="sim" tab={tab} onTab={onTab} onUsed={onUsed} />}
    </>
  );
}
