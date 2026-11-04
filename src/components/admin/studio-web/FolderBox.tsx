"use client";
/**
 * 왼쪽 메뉴 아래 [저장 폴더] — 앱의 "저장 위치"와 같은 자리·모양 (2026-11-04 사장님: PC 폴더 저장)
 *  정하기 → 문서\공실뉴스 · 크롬을 새로 켜서 허락이 풀렸으면 [허락하기] · 안 되는 브라우저면 칸을 안 보인다
 *  크롬은 문서·바탕 화면 폴더 자체는 못 고르게 막는다 ("이 폴더를 열 수 없음") — 그래서 처음 [정하기]는
 *  우리 안내창(새 폴더 → 공실뉴스 → 그 폴더 선택)을 먼저 보이고, 못 고르고 닫으면 다시 안내한다 (2026-11-04 사장님)
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { allowFolder, folderState, folderSupported, pickFolder, ROOT_NAME, type FolderState } from "./folder";

const btn: React.CSSProperties = { border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "#fff", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" };

const NAVY = "#1e3a8a";

/** 크롬 폴더 창을 흉내 낸 작은 그림 — 어디를 누르는지 번호로 */
function PickerPicture() {
  const num = (n: number): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 });
  const hl: React.CSSProperties = { outline: `2px solid ${NAVY}`, outlineOffset: 2, borderRadius: 4 };
  return (
    <div style={{ border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden", fontSize: 12, color: "#111827", background: "#fff" }}>
      <div style={{ padding: "6px 10px", background: "#f3f4f6", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#6b7280" }}>📁 내 PC › 문서</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={num(1)}>1</span>
          <span style={{ ...hl, padding: "2px 8px", background: "#fff", border: "1px solid #d1d5db", fontWeight: 700 }}>새 폴더</span>
        </span>
      </div>
      <div style={{ padding: "8px 10px", display: "grid", gap: 4 }}>
        <div style={{ color: "#9ca3af" }}>📁 다른 폴더</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ ...hl, padding: "2px 6px", background: "#eff6ff", fontWeight: 700 }}>📁 {ROOT_NAME}</span>
          <span style={num(2)}>2</span>
          <span style={{ color: "#6b7280" }}>이름을 {ROOT_NAME}(으)로 짓고 한 번 누르기</span>
        </div>
      </div>
      <div style={{ padding: "6px 10px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
        <span style={num(3)}>3</span>
        <span style={{ ...hl, padding: "3px 10px", background: NAVY, color: "#fff", fontWeight: 700 }}>폴더 선택</span>
        <span style={{ padding: "3px 10px", border: "1px solid #d1d5db", color: "#6b7280" }}>취소</span>
      </div>
    </div>
  );
}

function Guide({ again, onGo, onClose }: { again: boolean; onGo: () => void; onClose: () => void }) {
  const step = (n: number, t: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{n}</span>
      <span style={{ lineHeight: 1.55 }}>{t}</span>
    </div>
  );
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "100%", background: "#fff", borderRadius: 14, padding: "22px 22px 18px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", color: "#111827", fontSize: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{again ? "폴더를 아직 못 고르셨어요" : "저장 폴더 정하기"}</div>
        <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.55, marginBottom: 14 }}>
          {again
            ? <>크롬은 <b>문서·바탕 화면 폴더 자체</b>는 고를 수 없게 막아요. 그 안에 <b>새 폴더</b>를 만들어 골라 주세요.</>
            : <>만든 글·사진을 내 PC에 저장할 폴더를 정해요. 크롬은 문서·바탕 화면 폴더 자체는 고를 수 없어서, 그 안에 새 폴더를 만들어 골라야 해요.</>}
        </div>
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {step(1, <>열리는 창 위쪽의 <b>[새 폴더]</b>를 눌러요</>)}
          {step(2, <>이름을 <b>{ROOT_NAME}</b>(으)로 짓고, 그 폴더를 한 번 눌러요</>)}
          {step(3, <><b>[폴더 선택]</b>을 누르고, 크롬이 저장을 허락할지 물으면 <b>허용</b>을 눌러요</>)}
        </div>
        <PickerPicture />
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.5 }}>창은 문서 폴더에서 열려요. 바탕 화면이나 D 드라이브 등 다른 곳에 만들어도 돼요. 나중에 [바꾸기]로 옮길 수 있어요.</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>나중에</button>
          <button onClick={onGo} style={{ padding: "8px 16px", borderRadius: 8, border: 0, background: NAVY, color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{again ? "다시 고르기" : "폴더 고르기"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function FolderBox({ collapsed }: { collapsed: boolean }) {
  const [st, setSt] = useState<FolderState | null>(null);
  const [err, setErr] = useState("");
  const [guide, setGuide] = useState<"" | "first" | "again">("");
  useEffect(() => {
    const load = () => { void folderState().then(setSt); };
    load();
    window.addEventListener("gs-folder-change", load);
    window.addEventListener("focus", load);
    return () => { window.removeEventListener("gs-folder-change", load); window.removeEventListener("focus", load); };
  }, []);
  if (!folderSupported() || !st) return null;
  /** 크롬 폴더 창 — 단추를 누른 그 순간에 불러야 한다 (안내창의 [폴더 고르기]도 누른 순간) */
  const openPicker = async () => {
    setErr("");
    const wasSet = st.set;
    setGuide("");
    try {
      const r = await pickFolder();
      setSt(r);
      if (r.aborted && !wasSet && !r.set) setGuide("again"); // 문서·바탕 화면 자체를 골라 막혔거나 그냥 닫음 → 다시 안내
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  const pick = () => { if (st.set) void openPicker(); else setGuide("first"); };
  const allow = async () => { if (await allowFolder()) setSt(await folderState()); };
  const tip = st.set
    ? `만든 글·사진을 ${st.name} 폴더에 저장해요${st.granted ? "" : " — 크롬을 새로 켜서 [허락하기]를 한 번 눌러 주세요"}`
    : `만든 글·사진을 내 PC ${ROOT_NAME} 폴더에 저장해요. [정하기]를 눌러 주세요`;
  const guideEl = guide ? <Guide again={guide === "again"} onGo={() => void openPicker()} onClose={() => setGuide("")} /> : null;

  if (collapsed) {
    return (
      <>
      <button onClick={() => void (st.set && !st.granted ? allow() : pick())} title={tip}
        style={{ display: "block", margin: "10px auto 0", width: 8, height: 8, padding: 0, border: 0, borderRadius: "50%", cursor: "pointer", background: st.set && st.granted ? "#34d399" : "#fbbf24" }} />
      {guideEl}
      </>
    );
  }
  return (
    <div title={tip} style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 12, fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: st.set && st.granted ? "#34d399" : "#fbbf24" }} />
          저장 폴더
        </span>
        {st.set && !st.granted
          ? <button onClick={() => void allow()} style={btn}>허락하기</button>
          : <button onClick={pick} style={btn}>{st.set ? "바꾸기" : "정하기"}</button>}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: st.set ? "rgba(255,255,255,0.75)" : "#fbbf24", lineHeight: 1.4 }}>
        {st.set ? `📁 ${st.name}` :"아직 안 정했어요 — 다운로드 폴더로 받아요"}
      </div>
      {!st.set && <div style={{ marginTop: 6, fontSize: 10.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>문서 안에 &quot;{ROOT_NAME}&quot; 폴더를 만들어 골라요. [정하기]를 누르면 방법을 알려 드려요</div>}
      {err && <div style={{ marginTop: 4, fontSize: 10.5, color: "#fbbf24", lineHeight: 1.4 }}>{err}</div>}
      {guideEl}
    </div>
  );
}
