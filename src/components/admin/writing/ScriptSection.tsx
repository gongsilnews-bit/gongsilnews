"use client";
/**
 * [대본 작성] 메뉴 (2026-11-03 사장님: "그냥 유튜브 대본 작성 이렇게 하자")
 *  동영상studio 대본 쓰기 화면(①~⑧)을 그대로 — 대본만 쓰고 멈춘다.
 *  ① 매물 소개 · 단지/시세 · 뉴스 기사 · 자유 주제 · 공실뉴스 → 용도 · 문체 · 첫 3초 · 영상 길이 · 쓸 AI → 대본 확인·고치기
 *  쓴 대본은 작성 중 초안(.gss)으로 내 PC 에 저절로 저장되고, [동영상studio에서 이어서]를 누르면 그 초안을 동영상studio 가 연다.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Project } from "@/components/admin/studio-video/types";
import TextWizard from "@/components/admin/studio-video/TextWizard";
import { ModalPage, C, LIGHT } from "@/components/admin/studio-video/ui";

export default function ScriptSection() {
  const router = useRouter();
  const [k, setK] = useState(0);
  // [불러오기] — 쓰던 대본(작성 중 초안 .gss)을 다시 연다 (2026-11-03 사장님: "내가 쓰던 대본은 어디에? 불러올 수가 없네")
  type Recent = { dir: string; name: string; updatedAt?: string; method?: string; draft?: number };
  const vb = () => (window as unknown as { gongsilStudio?: { video?: { project?: { recent?: () => Promise<Recent[]>; open?: (dir: string, choice?: string) => Promise<unknown> } } } }).gongsilStudio?.video?.project;
  const [list, setList] = useState<Recent[] | null>(null);
  const [resume, setResume] = useState<Project | undefined>(undefined);
  const [err, setErr] = useState("");
  const openList = async () => { setErr(""); try { const l = (await vb()?.recent?.()) || []; setList(l.filter((r) => r.draft && r.method === "text")); } catch { setList([]); } };
  const openOne = async (r: Recent) => {
    try {
      const got = (await vb()?.open?.(r.dir, "work")) as (Project & { draft?: unknown }) | null;
      if (!got || !got.draft) { setErr("이 대본을 열지 못했어요."); return; }
      setResume(got); setList(null); setK((x) => x + 1);
    } catch { setErr("이 대본을 열지 못했어요."); }
  };
  // 대본 작성은 늘 밝은 화면 (2026-11-03 사장님: "주간모드로 해야지") — 떠 있는 창·메뉴까지 같은 색이 되게 화면 전체에 넣고, 떠나면 뺀다
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, v] of Object.entries(LIGHT)) root.style.setProperty(`--st-${key}`, v);
    root.style.setProperty("color-scheme", "light");
    return () => {
      for (const key of Object.keys(LIGHT)) root.style.removeProperty(`--st-${key}`);
      root.style.removeProperty("color-scheme");
    };
  }, []);
  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", background: C.bg }}>
      <ModalPage.Provider value={true}>
        <TextWizard key={k} scriptOnly resume={resume} onCancel={() => {}} onDone={() => {}}
          onLoad={vb()?.recent ? () => void openList() : undefined}
          onNew={resume ? () => { setResume(undefined); setK((x) => x + 1); } : undefined}
          onContinue={(file) => {
            try { sessionStorage.setItem("gs-video-open", JSON.stringify({ file, at: Date.now() })); } catch {}
            router.push("?menu=video", { scroll: false });
          }} />
      </ModalPage.Provider>
      {list && (
        <div onClick={() => setList(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "92vw", maxHeight: "70vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #e5e7eb" }}>
              <b style={{ flex: 1, fontSize: 16, color: "#111827" }}>쓰던 대본 불러오기</b>
              <button type="button" onClick={() => setList(null)} style={{ border: 0, background: "none", fontSize: 18, color: "#6b7280", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", padding: 8 }}>
              {!list.length && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>저장된 대본이 없어요. 대본을 쓰면 4초마다 저절로 저장돼요.</div>}
              {list.map((r) => (
                <button key={r.dir} type="button" onClick={() => void openOne(r)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 12px", border: 0, borderBottom: "1px solid #f1f3f5", background: "#fff", cursor: "pointer" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#1f2937" }}>{r.name || "무제"}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{r.updatedAt ? new Date(r.updatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</div>
                </button>
              ))}
            </div>
            {err && <div style={{ padding: "8px 18px 14px", color: "#dc2626", fontSize: 13 }}>{err}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
