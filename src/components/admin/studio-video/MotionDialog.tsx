"use client";
// 모션그래픽 인트로 고르기 (2026-10-28 사장님) — 틀 · 배경(공실 사진/내 사진·영상) · 글씨 · 색을 고르고 미리보기(소리 포함)를 본 뒤 [넣기]
import React, { useEffect, useRef, useState } from "react";
import type { MotionOpts, MotionTexts, Ratio } from "./types";
import { errText, videoBridge } from "./types";
import { Btn, C, FONT, Icon, Modal, input } from "./ui";
import { packOfIntro } from "./stylePacks";
import { SUB_PRESETS } from "./SubPresets";
/** 짝 스타일의 자막 글씨 — 틀을 고르면 글씨도 그걸로 (전체가 같은 글씨) */
const packFont = (template: string) => SUB_PRESETS.flatMap((g) => g.items).find((x) => x.id === packOfIntro(template).sub)?.look.font || "Pretendard";

const COLORS = ["#E8590C", "#1a3a6b", "#16a34a", "#dc2626", "#D4AF37", "#7048e8", "#0ea5e9", "#111827"];

export default function MotionDialog({ vacancyId, ratio, onClose, onInsert, kind = "intro" }: { vacancyId: string; ratio: Ratio; onClose: () => void; onInsert: (o: MotionOpts, styleAll: boolean) => void; /** intro 인트로 · outro 끝 화면 */ kind?: "intro" | "outro" }) {
  const outro = kind === "outro";
  const b = videoBridge()!;
  const [opts, setOpts] = useState<Awaited<ReturnType<NonNullable<typeof b.project.motionOptions>>> | null>(null);
  const [pick, setPick] = useState<MotionOpts>({ template: kind === "outro" ? "outro" : "intro", vacancyId, ratio, font: "Pretendard", bg: "", accent: COLORS[0] });
  const [mine, setMine] = useState<{ file: string; url: string; kind: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [styleAll, setStyleAll] = useState(kind !== "outro"); // 영상 전체 스타일도 맞추기 (인트로만)
  const pack = packOfIntro(pick.template);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // 인트로 글자 — 공실이 있으면 그 정보가 처음 값, 없으면 직접 (2026-10-28 사장님: 공실 없이도)
  const EMPTY: MotionTexts = { place: "", kind: "", trade: "", price: "", chips: [], brand: "", info: "", phone: "", link: "" };
  const [texts, setTexts] = useState<MotionTexts>(EMPTY);
  const [vacs, setVacs] = useState<{ id: string; title: string }[]>([]);
  const loadVac = (id: string) => {
    b.project.motionOptions?.(id).then((o) => {
      setOpts(o);
      const tx = o.texts || EMPTY;
      setTexts(tx);
      setPick((p) => ({ ...p, vacancyId: id, bg: o.photo || (id ? "" : p.bg), texts: tx }));
    }).catch((e) => setErr(errText(e)));
  };
  useEffect(() => {
    loadVac(vacancyId);
    b.project.aiDesignVacancies?.().then((l) => setVacs((l || []).map((v) => ({ id: v.id, title: v.title })))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // 글자를 고치면 0.9초 멈춘 뒤 미리보기에 (칠 때마다 굽지 않게)
  useEffect(() => {
    const t = setTimeout(() => setPick((p) => (JSON.stringify(p.texts) === JSON.stringify(texts) ? p : { ...p, texts })), 900);
    return () => clearTimeout(t);
  }, [texts]);
  // 고른 것이 바뀌면 미리보기를 새로 (0.4초 모아서, 마지막 것만)
  const seq = useRef(0);
  useEffect(() => {
    if (!opts) return;
    const n = ++seq.current;
    setBusy(true);
    setErr("");
    const t = setTimeout(() => {
      b.project.motionPreview!(pick).then((r) => { if (n === seq.current) setPreview(r.url); }).catch((e) => n === seq.current && setErr(errText(e))).finally(() => n === seq.current && setBusy(false));
    }, 400);
    return () => clearTimeout(t);
  }, [opts, pick]); // eslint-disable-line react-hooks/exhaustive-deps

  const vertical = ratio === "9:16" || ratio === "4:5";
  const label: React.CSSProperties = { fontSize: 14, fontWeight: 800, marginBottom: 8, color: C.text };
  const thumb = (on: boolean): React.CSSProperties => ({ width: 64, height: 64, borderRadius: 8, border: `2px solid ${on ? C.accent : "transparent"}`, objectFit: "cover", cursor: "pointer", flexShrink: 0, background: C.panel });
  return (
    <Modal title={outro ? "끝 화면 (모션그래픽) 고르기" : "인트로 (모션그래픽) 고르기"} onClose={onClose} width={1040}
      footer={<><Btn onClick={onClose}>취소</Btn><Btn primary onClick={() => onInsert(pick, styleAll)}><Icon name="plus" size={15} />{outro ? "이 끝 화면 넣기 (맨 끝)" : styleAll ? "인트로 넣고 전체 스타일 맞추기" : "이 인트로 넣기"}</Btn></>}>
      <div style={{ display: "flex", gap: 22, fontFamily: FONT, color: C.text, minHeight: 520 }}>
        {/* 미리보기 */}
        <div style={{ width: vertical ? 300 : 460, flexShrink: 0 }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: ratio.replace(":", " / "), background: "#000", borderRadius: 10, overflow: "hidden" }}>
            {preview && <video key={preview} src={preview} autoPlay loop controls playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />}
            {busy && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 14, fontWeight: 800 }}>미리보기 만드는 중…</div>}
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>효과음도 들어가요 (소리를 켜고 들어 보세요). 글자는 이 공실의 등록 정보로 채워요.</div>
          {err && <div style={{ marginTop: 8, color: C.danger, fontSize: 13, fontWeight: 700 }}>{err}</div>}
        </div>
        {/* 고르기 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={label}>틀</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {(opts?.templates || []).filter((t) => (t.kind || "intro") === kind).map((t) => {
                const on = pick.template === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setPick(outro ? { ...pick, template: t.id } : { ...pick, template: t.id, font: packFont(t.id), accent: packOfIntro(t.id).swatch[1] })}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: `2px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{on ? "✓ " : ""}{t.label}</div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.45 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ ...label, display: "flex", alignItems: "center", gap: 8 }}>
              인트로 글자
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{pick.vacancyId ? "공실 정보로 채웠어요 · 고쳐도 돼요" : "직접 써 주세요 · 비운 칸은 안 나와요"}</span>
              <span style={{ flex: 1 }} />
              {vacs.length > 0 && (
                <select value={pick.vacancyId} onChange={(e) => loadVac(e.target.value)} style={{ ...input, width: 230, fontSize: 12.5 }} title="공실 정보로 글자·사진 채우기">
                  <option value="">공실 불러오기 (없이 쓰기)</option>
                  {vacs.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(outro
                ? ([["brand", "사무소 이름"], ["phone", "전화 (예: 010-1234-5678)"], ["info", "대표·등록번호·소재지 (표시광고 정보)"], ["link", "QR 주소 (비우면 QR 없음)"]] as const)
                : ([["place", "위 작은 글 (예: 강남구 논현동)"], ["kind", "큰 제목 (예: 빌라/연립)"], ["trade", "딱지 (예: 매매)"], ["price", "강조 글 (예: 20억)"]] as const)
              ).map(([k, ph]) => (
                <input key={k} value={texts[k] || ""} placeholder={ph} onChange={(e) => setTexts({ ...texts, [k]: e.target.value })} style={{ ...input, width: "100%", boxSizing: "border-box" }} />
              ))}
              {!outro && <><input value={texts.chips.join(", ")} placeholder="꼬리표 — 쉼표로 3개까지 (예: 전용 24평, 방 3)" onChange={(e) => setTexts({ ...texts, chips: e.target.value.split(",").map((x) => x.trim()) })} style={{ ...input, width: "100%", boxSizing: "border-box" }} />
              <input value={texts.brand} placeholder="사무소 이름 (비우면 안 나와요)" onChange={(e) => setTexts({ ...texts, brand: e.target.value })} style={{ ...input, width: "100%", boxSizing: "border-box" }} /></>}
            </div>
          </div>
          <div>
            <div style={label}>배경 사진·영상</div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {(opts?.photos || []).map((p) => <img key={p.file} src={p.url} alt="" onClick={() => setPick({ ...pick, bg: p.file })} style={thumb(pick.bg === p.file)} />)}
              {mine && (mine.kind === "video"
                ? <video src={mine.url} muted onClick={() => setPick({ ...pick, bg: mine.file })} style={thumb(pick.bg === mine.file)} />
                : <img src={mine.url} alt="" onClick={() => setPick({ ...pick, bg: mine.file })} style={thumb(pick.bg === mine.file)} />)}
              <button type="button" onClick={async () => { const f = await b.project.motionPickBg?.(); if (f) { setMine(f); setPick({ ...pick, bg: f.file }); } }}
                style={{ ...thumb(false), border: `2px dashed ${C.line2}`, color: C.sub, fontSize: 12, fontWeight: 800, fontFamily: FONT, lineHeight: 1.3 }}>＋ 내 사진·영상</button>
            </div>
          </div>
          {/* 영상 전체 분위기 — 이 인트로와 짝인 편집 스타일 (자막·전환·배경음악) */}
          {!outro && <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, border: `1px solid ${styleAll ? C.accent : C.line2}`, background: styleAll ? C.accentDim : C.card, cursor: "pointer" }}>
            <input type="checkbox" checked={styleAll} onChange={(e) => setStyleAll(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: C.accent }} />
            <span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800 }}>
                영상 전체 스타일도 맞추기
                <span style={{ display: "inline-flex", gap: 3 }}>{pack.swatch.map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 3, background: c, border: "1px solid rgba(255,255,255,.3)" }} />)}</span>
                <span style={{ color: C.accent }}>{pack.label}</span>
              </span>
              <span style={{ display: "block", fontSize: 12.5, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>이 인트로에 어울리는 글씨 · 자막 모양 · 화면 전환 · 배경 음악({pack.music}) · 짝 끝 화면(사무소·전화·QR)을 영상 전체에 한 번에 맞춰요. 넣은 뒤에도 따로 바꿀 수 있어요.</span>
            </span>
          </label>}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <div>
              <div style={label}>글씨 <span style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>— 자막·화면 글자에도 같이</span></div>
              <select value={pick.font} onChange={(e) => setPick({ ...pick, font: e.target.value })} style={{ ...input, width: 200 }}>
                {(opts?.fonts || []).map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <div style={label}>색</div>
              <div style={{ display: "flex", gap: 6 }}>
                {COLORS.map((c) => (
                  <button key={c} type="button" title={c} onClick={() => setPick({ ...pick, accent: c })}
                    style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: `3px solid ${pick.accent === c ? "#fff" : "transparent"}`, outline: pick.accent === c ? `2px solid ${C.accent}` : "none", cursor: "pointer" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
