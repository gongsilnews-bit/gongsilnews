"use client";

// 오른쪽 위 요소 단추로 여는 넣기 칸 (회의 3-29, 2026-10-19)
//  텍스트 — 기본 글자 / 꾸민 글자(사전 설정 스타일) / 내 사전설정을 누르면 그 모양으로 바로 넣기 (캡컷 텍스트처럼)
//  효과음 — 눌러서 듣고 [넣기] = 고른 클립(단어를 골랐으면 그 단어) 시작에 한 번
import React, { useState } from "react";
import type { LayerAnim } from "./types";
import { SFX_LIST } from "./timeline";
import { Btn, C, FONT, Icon } from "./ui";
import { Side } from "./Panels";
import { LookTile, SubPresetGrid, loadMyPresets, type TextLook } from "./SubPresets";

export function TextInsertPanel({ onAdd, onClose, onTemplates }: { onAdd: (look: TextLook, anim?: LayerAnim) => void; onClose: () => void; onTemplates?: () => void }) {
  const [my] = useState(() => loadMyPresets());
  const head: React.CSSProperties = { fontSize: 14, fontWeight: 800, margin: "16px 0 8px" };
  return (
    <Side title="텍스트" onClose={onClose}>
      <div style={{ padding: "12px 16px 20px" }}>
        <Btn primary onClick={() => onAdd({})} style={{ width: "100%", justifyContent: "center" }}><Icon name="plus" size={16} />기본 글자 넣기</Btn>
        {onTemplates && <Btn onClick={onTemplates} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>글자 템플릿 (자막바·제목·말풍선 카드·이름표·예능 …)</Btn>}
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>고른 클립(없으면 지금 클립)에 들어가요. 단어를 고르고 넣으면 그 말 할 때만. 글은 미리보기에서 두 번 눌러 고쳐요.</div>
        {my.length > 0 && (
          <>
            <div style={head}>내 사전설정</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {my.map((pr) => (
                <div key={pr.id}>
                  <LookTile look={pr.look} big title={`${pr.name} — 누르면 이 모양으로 넣기`} onClick={() => onAdd(pr.look, pr.anim)} />
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 4, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.anim ? "▶ " : ""}{pr.name}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={head}>꾸민 글자 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 누르면 그 모양으로 넣기</span></div>
        <SubPresetGrid value={{}} onPick={(look) => onAdd(look)} />
      </div>
    </Side>
  );
}

export function SfxInsertPanel({ onAdd, onClose }: { onAdd: (id: string, label: string, volume: number) => void; onClose: () => void }) {
  const [vol, setVol] = useState(0.8);
  const play = (id: string) => {
    try {
      const au = new Audio(`/studio-sfx/${id}.mp3`);
      au.volume = Math.min(1, vol);
      void au.play().catch(() => {});
    } catch {}
  };
  return (
    <Side title="효과음" onClose={onClose}>
      <div style={{ padding: "12px 16px 20px" }}>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5, marginBottom: 10 }}>▶ 로 들어 보고 [넣기]를 누르면 고른 클립(없으면 지금 클립)이 시작할 때 한 번 나와요. 단어를 고르고 넣으면 그 단어에. 클립 옆 줄에 종 아이콘으로 보여요.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SFX_LIST.map((x) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, background: C.card, border: `1px solid ${C.line}` }}>
              <button type="button" onClick={() => play(x.id)} title="들어 보기"
                style={{ width: 32, height: 32, borderRadius: 16, border: 0, background: C.panel2, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="play" size={15} />
              </button>
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, fontFamily: FONT }}>{x.label}</span>
              <Btn small onClick={() => onAdd(x.id, x.label, vol)}><Icon name="plus" size={14} />넣기</Btn>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <span style={{ fontSize: 13, color: C.sub, width: 64, flexShrink: 0 }}>소리 크기</span>
          <input type="range" min={0.1} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} style={{ flex: 1, accentColor: C.accent }} />
          <span style={{ fontSize: 12.5, color: C.sub, width: 36, textAlign: "right" }}>{Math.round(vol * 100)}%</span>
        </div>
      </div>
    </Side>
  );
}
