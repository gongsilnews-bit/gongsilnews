"use client";
/**
 * 왼쪽 메뉴 아래 [저장 폴더] — 앱의 "저장 위치"와 같은 자리·모양 (2026-11-04 사장님: PC 폴더 저장)
 *  정하기 → 문서\공실뉴스 · 크롬을 새로 켜서 허락이 풀렸으면 [허락하기] · 안 되는 브라우저면 칸을 안 보인다
 */
import React, { useEffect, useState } from "react";
import { allowFolder, folderState, folderSupported, pickFolder, ROOT_NAME, type FolderState } from "./folder";

const btn: React.CSSProperties = { border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "#fff", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" };

export default function FolderBox({ collapsed }: { collapsed: boolean }) {
  const [st, setSt] = useState<FolderState | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const load = () => { void folderState().then(setSt); };
    load();
    window.addEventListener("gs-folder-change", load);
    window.addEventListener("focus", load);
    return () => { window.removeEventListener("gs-folder-change", load); window.removeEventListener("focus", load); };
  }, []);
  if (!folderSupported() || !st) return null;
  const pick = async () => {
    setErr("");
    try { setSt(await pickFolder()); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  const allow = async () => { if (await allowFolder()) setSt(await folderState()); };
  const tip = st.set
    ? `만든 글·사진을 문서\\${ROOT_NAME} 폴더에 저장해요${st.granted ? "" : " — 크롬을 새로 켜서 [허락하기]를 한 번 눌러 주세요"}`
    : `만든 글·사진을 내 PC 문서\\${ROOT_NAME} 폴더에 저장해요. [정하기]를 눌러 주세요`;

  if (collapsed) {
    return (
      <>
      <button onClick={() => void (st.set && !st.granted ? allow() : pick())} title={tip}
        style={{ display: "block", margin: "10px auto 0", width: 8, height: 8, padding: 0, border: 0, borderRadius: "50%", cursor: "pointer", background: st.set && st.granted ? "#34d399" : "#fbbf24" }} />
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
          : <button onClick={() => void pick()} style={btn}>{st.set ? "바꾸기" : "정하기"}</button>}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: st.set ? "rgba(255,255,255,0.75)" : "#fbbf24", lineHeight: 1.4 }}>
        {st.set ? `📁 ${st.name} (01·02·04·10 폴더)` :"아직 안 정했어요 — 다운로드 폴더로 받아요"}
      </div>
      {/* 크롬은 문서·바탕 화면 폴더 자체는 못 고르게 막는다 ("이 폴더를 열 수 없음") — 그 안에 새 폴더를 만들어 고르게 (2026-11-04) */}
      {!st.set && <div style={{ marginTop: 6, fontSize: 10.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>위치만 고르면 {ROOT_NAME} 폴더가 저절로 생겨요</div>}
      {err && <div style={{ marginTop: 4, fontSize: 10.5, color: "#fbbf24", lineHeight: 1.4 }}>{err}</div>}
    </div>
  );
}
