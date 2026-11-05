"use client";

/**
 * 웹 동영상studio [공실로 자동 만들기] — 대본 → 목소리 → 영상 (2026-11-05 사장님: "먼저 대본을 넣고 voice 를 만들어야")
 *  ① 공실 · 화면(9:16 · 16:9)
 *  ② 대본 — 뉴스·SNS자동화 › 유튜브 대본(회원 ChatGPT·Gemini 로 쓴 것)이 있으면 그것, 없으면 공실 정보로 만든 기본 문장. 여기서 고친다
 *     [유튜브 대본 쓰러 가기] — 이미 있는 대본 쓰기 화면으로 (새로 만들지 않음)
 *  ③ 목소리 — 타입캐스트·일레븐랩스(회원 본인 키) / 내 목소리 녹음 / 목소리 없이 자막만
 *  → 대본 한 문단 = 클립 하나 = 사진 한 장 (문장이 자막, AI 목소리면 문장마다 저절로 읽는다)
 *  첫 장면 동네·종류 · 마지막 사무소 화면 · 배경음악은 저절로
 */
import React, { useEffect, useState } from "react";
import type { Clip, Layer, Project, Ratio, TypecastVoice } from "./types";
import { datedName, errText, uid, videoBridge } from "./types";
import { listMyStudioVacancies } from "@/app/actions/studio";
import type { VideoVacancy } from "@/app/actions/videoWeb";
import { getVideoVacancy } from "@/app/actions/videoWeb";
import { studioBridge } from "@/components/admin/studio-web";
import { Btn, C, FONT, Icon, Modal } from "./ui";
import { estimateSeconds } from "./timeline";
import { WEB_VOICE_SPEED } from "./webBridge";
import { VoiceFace, VoicePanel } from "./Panels";
import { koVoice } from "./voiceKo";
import WebThemePick from "./WebThemePick";
import { applyKit } from "./webThemeKit";
import { pointsLine, type VoiceFree } from "./webVoice";
import { SHORTS_THEMES, lastThemeId, loadBaseThemes, loadMyThemes, rememberTheme, type ShortsTheme } from "./webThemes";

const PHOTO_SEC = 3; // 목소리 없을 때 사진 한 장 (초)
const MAX_PHOTOS = 16;
const MAX_SEC = 60; // 웹 영상 대본은 60초까지 (2026-11-05 사장님)

type Vac = { id: string; label: string; photo: string | null };
type VoiceMode = "none" | "ai"; // 웹 — 내 목소리 녹음은 뺐다 (2026-11-05 사장님)
export type VideoSeed = { vacancyId: string; script: string; title?: string };

/** 공실 정보 → 기본 대본 (문단 = 클립). 숫자는 공실 값 그대로 */
function baseScript(v: VideoVacancy) {
  const out: string[] = [];
  out.push(`${v.intro.place} ${v.intro.kind}${v.intro.price ? `, ${v.intro.price}` : ""}입니다.`.replace(/\s+/g, " ").trim());
  for (const c of v.captions) out.push(`${c}.`);
  if (v.outro?.name) out.push(`자세한 내용은 ${v.outro.name}로 문의해 주세요.`);
  return out.join("\n\n");
}

export default function WebAutoFlow({ onCancel, onDone, seed }: { onCancel: () => void; onDone: (p: Project) => void; seed?: VideoSeed | null }) {
  const [vacs, setVacs] = useState<Vac[] | null>(null);
  const [vac, setVac] = useState(seed?.vacancyId || "");
  const ratio: Ratio = "9:16"; // 웹은 60초 세로 쇼츠만 (2026-11-05 사장님: 가로 16:9 없앰)
  const [info, setInfo] = useState<VideoVacancy | null>(null);
  const [script, setScript] = useState(seed?.script || "");
  const [from, setFrom] = useState<"seed" | "youtube" | "base" | "">(seed?.script ? "seed" : "");
  const [mode, setMode] = useState<VoiceMode>("none");
  const [voiceId, setVoiceId] = useState("");
  const [voices, setVoices] = useState<TypecastVoice[] | null>(null);
  const [busy, setBusy] = useState("");
  const [pts, setPts] = useState<{ rate: number; balance: number; free?: VoiceFree } | null>(null);
  const [picker, setPicker] = useState(false);
  const [err, setErr] = useState("");
  // 디자인 테마 (2026-11-05 사장님) — 고르면 성우·자막·제목 상자·음악까지 한 번에, 세부는 아래 줄에서
  const [theme, setTheme] = useState<ShortsTheme>(SHORTS_THEMES[0]);
  useEffect(() => { void loadBaseThemes().then((bs) => { const id = lastThemeId(); const t = [...bs, ...loadMyThemes()].find((x) => x && x.id === id) || bs[0]; if (t) setTheme(t); }); }, []);
  const voiceOf = (t: ShortsTheme, list: TypecastVoice[] | null) => (list || []).find((x) => x.id === t.voice)?.id || list?.[0]?.id || "";

  useEffect(() => {
    listMyStudioVacancies(seed?.vacancyId).then((r) =>
      setVacs(r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address}`, photo: v.photo })) : []),
    ).catch(() => setVacs([]));
    // 내 키로 연결한 성우 (타입캐스트·일레븐랩스)
    void import("./webVoice").then((m) => m.elPoints()).then(setPts).catch(() => {});
    const b = videoBridge();
    Promise.all([b?.typecast?.voices().catch(() => []) || [], b?.eleven?.voices().catch(() => []) || []]).then(([a, z]) => {
      const list = [...(a || []), ...(z || [])] as TypecastVoice[];
      setVoices(list);
      if (list.length) { setVoiceId((cur) => cur || voiceOf(theme, list)); setMode("ai"); }

    });
  }, [seed?.vacancyId]);

  // 공실을 고르면 — 정보 + 대본 (유튜브 대본이 있으면 그것)
  useEffect(() => {
    if (!vac) { setInfo(null); return; }
    let live = true;
    (async () => {
      const r = await getVideoVacancy(vac);
      if (!live) return;
      if (!r.success) { setErr(r.error); return; }
      setInfo(r.data);
      if (seed?.script && vac === seed.vacancyId) return; // 유튜브 대본에서 넘어온 대본 그대로
      const yt = await studioBridge<{ youtube?: { get: (id: string) => Promise<{ narration?: string[] } | null> } }>()?.youtube?.get(vac).catch(() => null);
      if (!live) return;
      if (yt?.narration?.length) { setScript(yt.narration.join("\n\n")); setFrom("youtube"); }
      else { setScript(baseScript(r.data)); setFrom("base"); }
    })();
    return () => { live = false; };
  }, [vac]); // eslint-disable-line react-hooks/exhaustive-deps

  const paras = script.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  // 읽는 데 걸리는 시간 (목소리 없으면 장면마다 3초)
  const secs = Math.round(mode === "none" ? paras.length * PHOTO_SEC : paras.reduce((t, p) => t + estimateSeconds(p, WEB_VOICE_SPEED) + 0.2, 0));
  const over = secs > MAX_SEC;

  const make = async () => {
    const b = videoBridge();
    if (!b) return;
    setErr("");
    try {
      if (!paras.length) throw new Error("대본을 한 줄 이상 써 주세요.");
      if (over) throw new Error(`대본이 약 ${secs}초예요. 웹에서는 ${MAX_SEC}초까지 만들 수 있어요. 문장을 줄여 주세요.`);
      const ai = mode === "ai" && voiceId;
      const p = await b.project.create({ method: "text", ratio, name: datedName(info?.title || seed?.title || "쇼츠"), vacancyId: vac || "" });
      // 공실을 골랐으면 그 사진을 차례로 (없으면 화면은 편집에서 넣는다)
      const assetIds: string[] = [];
      if (vac) {
        setBusy("공실 사진을 불러오는 중…");
        const r = await b.vacancy(vac);
        for (const ph of r.photos.slice(0, MAX_PHOTOS)) { const a = await b.project.addAsset(ph.id); p.assets[a.id] = a; assetIds.push(a.id); }
      }
      const clips: Clip[] = paras.map((t, i) => ({
        id: uid(), type: "voice", text: ai ? t : "", words: [], voice: null,
        ...(assetIds.length ? { visual: { asset: assetIds[i % assetIds.length], s: 0 } } : {}),
        hold: PHOTO_SEC, ...(ai ? {} : { subText: t }),
      }) as Clip);
      if (ai) {
        for (let i = 0; i < clips.length; i++) {
          setBusy(`AI 목소리를 만드는 중… (${i + 1}/${clips.length})`);
          const v = await b.voice(p.dir, paras[i], voiceId, { prev: paras[i - 1] || "", next: paras[i + 1] || "" });
          clips[i].voice = { file: v.file, url: v.url, duration: v.duration, id: v.id, text: v.text };
          clips[i].words = v.words;
        }
        p.settings.voice = { ...p.settings.voice, id: voiceId, speed: WEB_VOICE_SPEED };
      }
      // 공실이면 — 첫 장면 동네·종류, 마지막 사무소 화면 (법정 표시)
      const last: Clip | null = info?.outro && assetIds.length ? ({ id: uid(), type: "voice", text: "", words: [], voice: null, visual: { asset: assetIds[0], s: 0 }, hold: 4 } as Clip) : null;
      if (last) clips.push(last);
      p.scenes = [{ id: uid(), clips }];
      const first = clips[0].id, end = clips[clips.length - 1].id;
      p.settings.subtitle = { ...p.settings.subtitle, ...theme.sub }; // 테마 자막
      const layers: Layer[] = [];
      if (info) layers.push({ ...(theme.kit?.titleStyle as Partial<Layer> | undefined), id: uid(), type: "text", from: first, to: first, text: [info.intro.place, info.intro.kind].filter(Boolean).join(" · "), pos: (theme.kit?.titleStyle?.pos as Layer["pos"]) || "top", size: Number(theme.kit?.titleStyle?.size) || 90, color: theme.title.color, font: theme.title.font, bold: true, box: true, boxColor: theme.title.boxColor, boxOpacity: 0.85, name: "동네·종류" });
      // 끝 장면 — 테마에 표시광고가 있고 사무소 글 모양을 따로 저장하지 않았으면 표시광고만 (글 상자와 겹치지 않게)
      if (last && info?.outro && !(theme.kit?.legal && !theme.kit.officeStyle)) {
        layers.push({ ...(theme.kit?.officeStyle as Partial<Layer> | undefined), id: uid(), type: "text", from: last.id, to: last.id, text: info.outro.name, pos: "middle", size: 120, color: theme.office.color, font: theme.office.font, bold: true, box: true, boxColor: theme.office.boxColor, boxOpacity: 0.95, name: "사무소" });
        if (info.outro.lines.length) layers.push({ ...(theme.kit?.officeInfoStyle as Partial<Layer> | undefined), id: uid(), type: "text", from: last.id, to: last.id, text: info.outro.lines.join("\n"), pos: "bottom", size: 62, color: "#FFFFFF", box: true, boxColor: "#000000", boxOpacity: 0.65, name: "사무소 정보" });
      }
      if (theme.music) layers.push({ id: uid(), type: "music", from: first, to: end, url: theme.music, file: theme.music, volume: ai ? 0.12 : 0.35, loop: true, fadeOut: 1.5, name: theme.musicName || "배경음악" });
      p.layers = layers;
      // 테마 꾸러미 — 그래픽·화면 전환·드론·끝 장면 표시광고 (2026-11-05 사장님)
      let notes: string[] = [];
      if (theme.kit) {
        setBusy("테마(그래픽·전환·드론·표시광고)를 넣는 중…");
        notes = await applyKit(p, theme.kit, { b, info, clips, officeClip: last, say: setBusy });
      }
      await b.project.save(p);
      if (notes.length) window.alert(notes.join("\n"));
      onDone(p);
    } catch (e) {
      setErr(errText(e));
      setBusy("");
    }
  };

  const box: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 15, fontFamily: FONT };
  const head = (t: string) => <div style={{ fontSize: 15, fontWeight: 800, margin: "16px 0 8px" }}>{t}</div>;

  // 심플하게 (2026-11-05 사장님: "대본 넣고 · 목소리 고르고 · 영상 편집 바로") — 세로 9:16 · 60초. 더 원하면 앱
  return (
    <Modal title="쇼츠 만들기" onClose={busy ? () => {} : onCancel} width={780}
      footer={<><span style={{ marginRight: "auto" }} />
        <Btn onClick={onCancel} disabled={Boolean(busy)}>취소</Btn><Btn primary onClick={() => void make()} disabled={!paras.length || Boolean(busy) || over}><Icon name="video" size={16} />{busy || "편집 시작"}</Btn></>}>
      <div style={{ padding: "4px 24px 20px", fontFamily: FONT, color: C.text, maxHeight: "72vh", overflowY: "auto" }}>
        {head("① 대본")}
        <select value={vac} onChange={(e) => { setVac(e.target.value); setErr(""); }} disabled={Boolean(busy)} style={{ ...box, height: 40, fontSize: 14, padding: "0 10px", marginBottom: 8, color: vac ? C.text : C.sub }}>
          <option value="">{vacs === null ? "내 공실 불러오는 중…" : "공실에서 가져오기 (사진·정보·대본) — 선택"}</option>
          {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
        <textarea value={script} onChange={(e) => { setScript(e.target.value); setFrom(""); }} disabled={Boolean(busy)} rows={8} placeholder={"대본을 넣으세요. 한 줄 = 한 장면이에요.\n\n예) 논현동 신축 빌라, 월세 100만입니다.\n전용 21평, 방 셋에 욕실 둘."}
          style={{ ...box, padding: "12px 14px", lineHeight: 1.7, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 13 }}>
          <b style={{ color: over ? C.danger : C.accent }}>약 {secs}초 / {MAX_SEC}초{over ? ` — ${secs - MAX_SEC}초쯤 줄여 주세요` : ""}</b>
          <span style={{ color: C.dim }}>{from === "youtube" || from === "seed" ? "쇼츠릴스 대본에서 가져왔어요" : from === "base" ? "공실 정보로 만든 문장이에요" : ""}</span>
        </div>

        {head("② 테마 — 누르면 성우·자막·음악까지 한 번에")}
        <WebThemePick theme={theme} disabled={Boolean(busy)}
          onTheme={(t, fromTile) => { setTheme(t); if (fromTile) { rememberTheme(t.id); if (voices?.length) setVoiceId(voiceOf(t, voices)); } }}
          photo={info?.photos[0] || ""} place={info ? [info.intro.place, info.intro.kind].filter(Boolean).join(" · ") : "우리 동네 · 빌라"}
          sample="바로 입주 가능해요"
          voices={voices} voiceId={voiceId} voiceOn={mode === "ai"} onVoiceOn={(on) => setMode(on ? "ai" : "none")} onPickVoice={() => setPicker(true)} />
        {picker && <VoicePanel web pickLabel="이 성우로" targetCount={0} initial={{ id: voiceId || "", speed: WEB_VOICE_SPEED, volume: 1 }}
          onApply={(v) => { if (v.id) { setVoiceId(v.id); setMode("ai"); } setPicker(false); }} onClose={() => setPicker(false)} />}
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>{voices?.length ? `AI 성우 ${voices.length}명${pts ? ` · ${pointsLine(pts)}` : ""}` : "AI 성우를 준비하고 있어요."}</div>
        {err && <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.danger}`, fontSize: 14 }}>{err}</div>}
      </div>
    </Modal>
  );
}
