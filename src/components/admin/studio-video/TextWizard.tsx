"use client";

// 텍스트로 영상 만들기 — 브루와 같은 3단계: ① 스타일 고르기 ② 대본 작성 ③ 영상 꾸미기 → 확인 → 자동 만들기
// 대본은 회원 AI(기본 글쓰기 AI), 길이는 글자 수 (사장님 결정). 화면 자료: 공실 사진 → 무료 자료 → AI 그림
import React, { useMemo, useRef, useState } from "react";
import type { LibItem, Project, Ratio, Fill, Clip } from "./types";
import { RATIO_LABEL, errText, uid, videoBridge } from "./types";
import { splitScript, estimateSeconds } from "./timeline";
import { findVoice } from "@/lib/studio-video/voices";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { listMyStudioVacancies } from "@/app/actions/studio";
import { useStudioWriter, useStudioImager } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Hint, Icon, Modal, Toggle, Working, input, label } from "./ui";
import { VoiceFace, VoicePanel } from "./Panels";

export type VideoStyle = { id: string; name: string; desc: string; icon: string; prompt: string; voice: string; speed: number; music: string; ratio?: Ratio; subtitle?: "long" | "short"; chars: number };

export const STYLES: VideoStyle[] = [
  { id: "listing", name: "매물 소개", desc: "공실 사진과 함께 매물을 차분히 소개해요", icon: "image", prompt: "부동산 매물 소개 영상. 첫 문장에 위치와 물건 종류, 이어서 장점과 조건, 마지막에 공실뉴스에서 자세히 볼 수 있다는 안내", voice: "Charon", speed: 1.05, music: "잔잔한", chars: 500 },
  { id: "news", name: "부동산 뉴스 해설", desc: "뉴스처럼 또박또박 설명해요", icon: "file", prompt: "부동산 뉴스 해설 영상. 사실을 먼저, 의미와 영향은 차분하게. 단정·과장 금지", voice: "Kore", speed: 1.05, music: "고급스러운", chars: 800 },
  { id: "auction", name: "경매·공매 브리핑", desc: "감정가·최저가·일정을 정리해요", icon: "template", prompt: "경매·공매 물건 브리핑 영상. 감정가, 최저입찰가, 유찰 횟수, 입찰 일정을 정확히. 입찰 전 확인할 점으로 마무리. 투자 권유 금지", voice: "Sadaltager", speed: 1.05, music: "잔잔한", chars: 700 },
  { id: "area", name: "동네·상권 소개", desc: "교통·학군·상권을 소개해요", icon: "bg", prompt: "동네·상권 소개 영상. 교통, 생활 편의, 학군, 상권 분위기를 친근하게", voice: "Sulafat", speed: 1.05, music: "경쾌한", chars: 700 },
  { id: "info", name: "정보 전달", desc: "알아 두면 좋은 부동산 정보", icon: "info", prompt: "부동산 정보 전달 영상. 쉬운 말로 핵심부터, 예시 하나, 정리 한 문장", voice: "Achird", speed: 1.05, music: "잔잔한", chars: 900 },
  { id: "shorts", name: "짧은 쇼츠", desc: "30초 안팎, 빠르고 짧게", icon: "shorts", prompt: "30초 세로 쇼츠. 첫 문장은 궁금하게 만드는 한마디, 문장은 아주 짧게", voice: "Puck", speed: 1.15, music: "경쾌한", ratio: "9:16", subtitle: "short", chars: 250 },
];

type Hint = { desc?: string; keywords?: string; kind?: string };
type Vac = { id: string; label: string };

export default function TextWizard({ onCancel, onDone }: { onCancel: () => void; onDone: (p: Project) => void }) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const imager = useStudioImager();
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<VideoStyle | null>(null);
  // ② 대본
  const [src, setSrc] = useState<"topic" | "vacancy" | "direct">("topic");
  const [topic, setTopic] = useState("");
  const [request, setRequest] = useState("");
  const [useChars, setUseChars] = useState(true);
  const [chars, setChars] = useState(500);
  const [script, setScript] = useState("");
  const hints = useRef<Record<string, Hint>>({});
  const [writing, setWriting] = useState("");
  const [err, setErr] = useState("");
  const [vacs, setVacs] = useState<Vac[] | null>(null);
  const [vacId, setVacId] = useState("");
  const [vacInfo, setVacInfo] = useState<{ vacancy: unknown; photos: LibItem[] } | null>(null);
  // ③ 꾸미기
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [subOn, setSubOn] = useState(true);
  const [subPos, setSubPos] = useState<"bottom" | "middle-low" | "middle" | "top">("bottom");
  const [subLen, setSubLen] = useState<"long" | "short">("long");
  const [voiceOn, setVoiceOn] = useState(true);
  const [motionOn, setMotionOn] = useState(true); // 사진 자동 움직임 (줌인·좌우·상하)
  const [voiceId, setVoiceId] = useState("Charon");
  const [voicePick, setVoicePick] = useState(false); // 목소리 고르기 창 (편집 화면과 같은 얼굴 카드 창)
  const [speed, setSpeed] = useState(1);
  const [musicOn, setMusicOn] = useState(true);
  const [mood, setMood] = useState<string>("잔잔한");
  const [usePhotos, setUsePhotos] = useState(true);
  const [useStock, setUseStock] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [visualLater, setVisualLater] = useState(false); // 화면은 나중에 — 목소리(·자막·음악)만 먼저 만들고 편집 화면에서 클립마다 넣기 (2026-10-18 사장님)
  const [fill, setFill] = useState<Fill>("cover");
  const [confirm, setConfirm] = useState(false);
  const [gen, setGen] = useState<{ title: string; detail?: string; frac?: number } | null>(null);

  const pickStyle = (s: VideoStyle | null) => {
    setStyle(s);
    if (s) {
      setVoiceId(s.voice);
      setSpeed(s.speed);
      setMood(s.music);
      setChars(s.chars);
      if (s.ratio) setRatio(s.ratio);
      if (s.subtitle) setSubLen(s.subtitle);
      if (s.id === "listing") setSrc("vacancy");
    }
  };

  const loadVacs = () => {
    if (vacs) return;
    listMyStudioVacancies().then((r) => setVacs(r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address} · 사진 ${v.photoCount}장` })) : [])).catch(() => setVacs([]));
  };
  const chooseVac = async (id: string) => {
    setVacId(id);
    setVacInfo(null);
    if (!id) return;
    setWriting("공실 정보와 사진을 받는 중…");
    try {
      setVacInfo(await b.vacancy(id));
    } catch (e) {
      setErr(errText(e));
    }
    setWriting("");
  };

  const write = async () => {
    setErr("");
    setWriting(`${writer}가 대본을 쓰는 중… (1~2분)`);
    const off = b.onProgress((t) => setWriting(t));
    try {
      const r = await b.ai.script({ topic, style: style ? `${style.name} — ${style.prompt}` : "", request, chars: useChars ? chars : 0, vacancy: src === "vacancy" ? vacInfo?.vacancy : null });
      hints.current = {};
      const text = r.scenes.map((s) => s.lines.map((l) => {
        hints.current[l.text] = { desc: l.desc, keywords: l.keywords, kind: l.kind };
        return l.text;
      }).join("\n")).join("\n\n");
      setScript(text);
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setWriting("");
    }
  };

  const scenes = useMemo(() => splitScript(script), [script]);
  const lineCount = scenes.reduce((a, s) => a + s.length, 0);
  const seconds = useMemo(() => scenes.flat().reduce((a, t) => a + estimateSeconds(t, speed) + 0.12, 0), [scenes, speed]);
  const photoCount = src === "vacancy" && usePhotos && !visualLater ? vacInfo?.photos.length || 0 : 0;

  /* ── 자동 만들기 ── */
  const build = async () => {
    setConfirm(false);
    setErr("");
    const off = b.onProgress((t, f) => setGen((g) => ({ title: g?.title || "만드는 중…", detail: t, frac: typeof f === "number" ? f : g?.frac })));
    try {
      setGen({ title: "프로젝트를 만드는 중…", frac: 0.02 });
      const p = await b.project.create({ method: "text", ratio, vacancyId: src === "vacancy" ? vacId : "", name: style ? `${style.name}_${new Date().getMonth() + 1}월${new Date().getDate()}일` : "" });
      p.settings.fill = fill;
      p.settings.subtitle = { ...p.settings.subtitle, on: subOn, position: subPos, length: subLen };
      p.settings.voice = { id: voiceId, speed, volume: 1 };
      p.settings.motion = motionOn ? "auto" : "none";
      // 클립
      p.scenes = scenes.map((ls) => ({ id: uid(), clips: ls.map((t) => ({ id: uid(), type: "voice", text: t, words: t.split(/\s+/).map((w) => ({ w, s: 0, e: 0 })), voice: null, visual: null, hint: hints.current[t] }) as Clip) }));
      const clips = p.scenes.flatMap((s) => s.clips);
      // 음악
      if (musicOn) {
        const track = MUSIC_LIBRARY.find((t) => t.mood === mood) || MUSIC_LIBRARY[0];
        try {
          const r = await b.musicGet(p.dir, `bgm/lib/${track.id.slice(4)}.mp3`);
          p.settings.music = { on: true, file: r.file, url: r.url, name: track.label, mood, volume: 0.15 };
        } catch {}
      }
      // 화면 자료
      const used = new Set<string>();
      const addAsset = async (item: LibItem) => {
        const a = await b.project.addAsset(item.id);
        p.assets[a.id] = a;
        return a.id;
      };
      const photos: string[] = [];
      if (photoCount && vacInfo) {
        setGen({ title: "공실 사진을 넣는 중…", frac: 0.08 });
        for (const ph of vacInfo.photos) photos.push(await addAsset(ph));
      }
      // 화면 검색어가 없는 문장은 회원 AI 에게 한 번에 묻는다
      const needHint = clips.filter((c) => !c.hint?.keywords);
      if (!visualLater && (useStock || useAi) && needHint.length && (!photos.length || photos.length < clips.length)) {
        setGen({ title: `${writer}가 문장마다 어울리는 화면을 고르는 중…`, frac: 0.12 });
        try {
          const hs = await b.ai.scenes(needHint.map((c) => c.text));
          needHint.forEach((c, i) => (c.hint = hs[i]));
        } catch {}
      }
      let stockOk = useStock;
      let aiLeft = useAi ? 8 : 0;
      for (let i = 0; i < (visualLater ? 0 : clips.length); i++) {
        const c = clips[i];
        setGen({ title: `화면 자료를 고르는 중… (${i + 1}/${clips.length})`, frac: 0.15 + (i / clips.length) * 0.45 });
        if (photos.length && (i < photos.length || (!stockOk && !aiLeft))) {
          c.visual = { asset: photos[i % photos.length], s: 0 };
          continue;
        }
        if (stockOk && c.hint?.keywords) {
          try {
            const orient = ratio === "9:16" || ratio === "4:5" ? "portrait" : ratio === "1:1" ? "square" : "landscape";
            const r = await b.stock.search(c.hint.keywords, c.hint.kind === "image" ? "photo" : "video", orient);
            if (!r.success) {
              if (r.needKey) stockOk = false;
            } else {
              const pick = (r.items || []).find((x) => !used.has(x.id));
              if (pick) {
                used.add(pick.id);
                const it = await b.stock.get(p.dir, pick);
                c.visual = { asset: await addAsset(it), s: 0 };
                continue;
              }
            }
          } catch {}
        }
        if (aiLeft > 0) {
          aiLeft--;
          setGen({ title: `${imager}가 그림을 그리는 중… (${i + 1}/${clips.length})`, detail: "한 장에 30초~1분 걸려요", frac: 0.15 + (i / clips.length) * 0.45 });
          try {
            const it = await b.ai.image(p.dir, `${c.hint?.desc || c.text} — 부동산 영상에 쓸 실사 사진, 글자·사람 얼굴 없이, ${ratio === "9:16" ? "세로" : "가로"} 화면`);
            c.visual = { asset: await addAsset(it), s: 0 };
            continue;
          } catch {}
        }
        // 못 찾았으면 앞 화면을 이어서
        const prev = clips[i - 1]?.visual;
        if (prev) c.visual = { ...prev };
        else if (photos.length) c.visual = { asset: photos[0], s: 0 };
      }
      // AI 목소리
      if (voiceOn) {
        let done = 0;
        let k = 0;
        const one = async () => {
          while (k < clips.length) {
            const c = clips[k++];
            try {
              const r = await b.voice(p.dir, c.text, voiceId);
              c.voice = { file: r.file, url: r.url, duration: r.duration, id: r.id, text: r.text };
              c.words = r.words;
            } catch {}
            done++;
            setGen({ title: `AI 목소리를 만드는 중… (${done}/${clips.length})`, frac: 0.6 + (done / clips.length) * 0.38 });
          }
        };
        await Promise.all([one(), one(), one()]);
      } else {
        clips.forEach((c) => (c.hold = estimateSeconds(c.text, speed)));
      }
      await b.project.save(p);
      setGen({ title: "편집 화면을 여는 중…", frac: 1 });
      onDone(p);
    } catch (e) {
      setErr(errText(e));
      setGen(null);
    } finally {
      off();
    }
  };

  if (gen) {
    return (
      <Modal title="" width={760}>
        <Working title={gen.title} detail={gen.detail || "이 창을 닫으면 영상이 만들어지지 않아요"} frac={gen.frac ?? null} />
      </Modal>
    );
  }

  const chip = (on: boolean): React.CSSProperties => ({ height: 36, padding: "0 14px", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "14px 0", borderBottom: `1px solid ${C.line}` };
  const steps = ["스타일 고르기", "대본 작성", "영상 꾸미기"];

  const footer = (
    <>
      {step > 0 && <Btn onClick={() => setStep(step - 1)}>이전</Btn>}
      {step < 2 && <Btn primary onClick={() => setStep(step + 1)} disabled={step === 1 && !script.trim()}>다음 <Icon name="chevron" size={16} /></Btn>}
      {step === 2 && <Btn primary onClick={() => setConfirm(true)} disabled={!lineCount}>완료 <Icon name="chevron" size={16} /></Btn>}
    </>
  );

  return (
    <Modal steps={steps} step={step} onClose={onCancel} width={1100} footer={footer}>
      {step === 0 && (
        <div style={{ padding: "22px 28px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center", marginBottom: 18 }}>원하는 영상 스타일을 고르세요</div>
          <button type="button" onClick={() => { pickStyle(null); setStep(1); }}
            style={{ width: "100%", height: 64, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 17, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
            스타일 없이 바로 시작하기
          </button>
          <div style={{ ...label, margin: "22px 0 10px" }}>추천 스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {STYLES.map((s) => (
              <button key={s.id} type="button" onClick={() => pickStyle(s)}
                style={{ textAlign: "left", padding: "18px 18px", borderRadius: 6, border: `1px solid ${style?.id === s.id ? C.accent : C.line2}`, background: style?.id === s.id ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
                <Icon name={s.icon} size={26} />
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 12 }}>{s.name}</div>
                <div style={{ fontSize: 14, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>{s.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}><Hint>스타일을 누른 뒤 아래 [다음]을 누르세요. 스타일마다 대본 말투·목소리·음악이 정해져 있어요.</Hint></div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", minHeight: 520 }}>
          <div style={{ width: 400, flexShrink: 0, padding: "20px 22px", borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 15, color: C.sub }}>{style ? `${style.name} 스타일` : "스타일 없음"}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setSrc("topic")} style={chip(src === "topic")}>주제로 쓰기</button>
              <button type="button" onClick={() => { setSrc("vacancy"); loadVacs(); }} style={chip(src === "vacancy")}>공실로 쓰기</button>
              <button type="button" onClick={() => setSrc("direct")} style={chip(src === "direct")}>직접 쓰기</button>
            </div>
            {src === "vacancy" && (
              <div>
                <div style={{ ...label, marginBottom: 6 }}>공실</div>
                <select value={vacId} onFocus={loadVacs} onChange={(e) => chooseVac(e.target.value)} style={{ ...input, fontSize: 14 }}>
                  <option value="">{vacs === null ? "내 공실 불러오는 중…" : `공실을 고르세요 (${vacs.length}개)`}</option>
                  {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
                {vacInfo && <div style={{ fontSize: 13.5, color: C.sub, marginTop: 6 }}>사진 {vacInfo.photos.length}장을 PC에 받아 뒀어요. 가격·면적은 등록된 값 그대로 써요.</div>}
              </div>
            )}
            {src !== "direct" && (
              <>
                {src === "topic" && (
                  <div>
                    <div style={{ ...label, marginBottom: 6 }}>주제</div>
                    <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 전세 계약할 때 꼭 확인할 것" style={input} />
                  </div>
                )}
                <div>
                  <div style={{ ...label, marginBottom: 6 }}>대본 요청 <span style={{ color: C.dim, fontWeight: 600 }}>(선택)</span></div>
                  <textarea value={request} onChange={(e) => setRequest(e.target.value)} rows={3} placeholder="말투·보는 사람·꼭 넣을 내용 (예: 신혼부부에게, 친근하게)" style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...label, flex: 1 }}>글자 수 정하기</span>
                  <Toggle on={useChars} onChange={setUseChars} />
                  <input type="number" min={100} max={5000} step={50} value={chars} onChange={(e) => setChars(Number(e.target.value))} disabled={!useChars} style={{ ...input, width: 96, textAlign: "right" }} />
                  <span style={{ fontSize: 14, color: C.sub }}>자</span>
                </div>
                <Btn primary onClick={write} disabled={Boolean(writing) || (src === "topic" && !topic.trim()) || (src === "vacancy" && !vacInfo)} style={{ height: 50, fontSize: 16 }}>
                  <Icon name="pen" size={18} />{writer}로 대본 쓰기
                </Btn>
                {writing && <div style={{ fontSize: 14, color: C.sub }}>{writing}</div>}
              </>
            )}
            {src === "direct" && <Hint>오른쪽 칸에 대본을 쓰거나 붙여 넣으세요. 빈 줄로 나누면 씬이 나뉘고, 문장마다 클립이 돼요.</Hint>}
            {err && <div style={{ fontSize: 14, color: C.danger, lineHeight: 1.5 }}>{err}</div>}
          </div>
          <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column" }}>
            <div style={{ ...label, marginBottom: 8 }}>대본</div>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="직접 대본을 쓰거나, 왼쪽에서 AI로 쓰기를 눌러 보세요."
              style={{ flex: 1, minHeight: 400, padding: 14, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 16, lineHeight: 1.8, fontFamily: FONT, resize: "none", outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 8, fontSize: 14, color: C.sub }}>
              <span>클립 {lineCount}개</span>
              <span>약 {Math.floor(seconds / 60) ? `${Math.floor(seconds / 60)}분 ` : ""}{Math.round(seconds % 60)}초</span>
              <span>{script.length.toLocaleString()} / 10,000자</span>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", minHeight: 520 }}>
          <div style={{ width: 460, flexShrink: 0, padding: "8px 22px 18px", borderRight: `1px solid ${C.line}` }}>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, width: "100%" }}>화면 비율</span>
              {(Object.keys(RATIO_LABEL) as Ratio[]).map((r) => <button key={r} type="button" onClick={() => setRatio(r)} style={chip(ratio === r)}>{r}</button>)}
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>자막</span>
              <Toggle on={subOn} onChange={setSubOn} />
              {subOn && (
                <div style={{ width: "100%", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([["top", "상단"], ["middle", "중단"], ["middle-low", "중하단"], ["bottom", "하단"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setSubPos(k)} style={chip(subPos === k)}>{l}</button>)}
                  <span style={{ width: 10 }} />
                  <button type="button" onClick={() => setSubLen("long")} style={chip(subLen === "long")}>길게</button>
                  <button type="button" onClick={() => setSubLen("short")} style={chip(subLen === "short")}>짧게</button>
                </div>
              )}
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>AI 목소리</span>
              <Toggle on={voiceOn} onChange={setVoiceOn} />
              {voiceOn && (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* 목록 대신 — 고른 성우 얼굴 카드, 누르면 얼굴 카드 창 */}
                  {(() => {
                    const v = findVoice(voiceId);
                    return (
                      <button type="button" onClick={() => setVoicePick(true)} title="눌러서 목소리 바꾸기"
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}>
                        {v && <VoiceFace id={v.id} name={v.name} size={56} />}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{v?.name || "목소리"}</span>
                          {v && <span style={{ display: "block", fontSize: 14, color: C.sub, marginTop: 3 }}>{v.kind}{"age" in v && "mood" in v ? ` · ${v.age} · ${v.mood}` : ""}</span>}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.sub, display: "inline-flex", alignItems: "center", gap: 4 }}>바꾸기<Icon name="chevron" size={14} /></span>
                      </button>
                    );
                  })()}
                  {voicePick && <VoicePanel initial={{ id: voiceId, speed }} pickLabel="이 목소리로" targetCount={0}
                    onApply={(o) => { setVoiceId(o.id); setSpeed(o.speed); setVoicePick(false); }} onClose={() => setVoicePick(false)} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, color: C.sub, width: 50 }}>빠르기</span>
                    <input type="range" min={0.7} max={1.6} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ flex: 1, accentColor: C.accent }} />
                    <span style={{ fontSize: 14, width: 44, textAlign: "right" }}>{speed.toFixed(2)}배</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>사진 자동 움직임 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· 줌인·좌우·상하로 천천히</span></span>
              <Toggle on={motionOn} onChange={setMotionOn} />
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>배경 음악</span>
              <Toggle on={musicOn} onChange={setMusicOn} />
              {musicOn && <div style={{ width: "100%", display: "flex", gap: 6, flexWrap: "wrap" }}>{MUSIC_MOODS.map((m) => <button key={m} type="button" onClick={() => setMood(m)} style={chip(mood === m)}>{m}</button>)}</div>}
            </div>
            <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              <span style={label}>화면 자료</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setVisualLater(false)} style={chip(!visualLater)}>지금 함께 넣기</button>
                <button type="button" onClick={() => setVisualLater(true)} style={chip(visualLater)}>나중에 넣기 (목소리만 먼저)</button>
              </div>
              {visualLater && <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>목소리·자막·음악만 먼저 만들어요 (빨라요). 화면은 검게 두고, 편집 화면에서 클립마다 [사진·영상]으로 넣으면 돼요.</div>}
              {!visualLater && src === "vacancy" && vacInfo && <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 15 }}>공실 사진 쓰기 ({vacInfo.photos.length}장)</span><Toggle on={usePhotos} onChange={setUsePhotos} /></div>}
              {!visualLater && <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 15 }}>무료 영상·사진 (Pexels·Pixabay)</span><Toggle on={useStock} onChange={setUseStock} /></div>}
              {!visualLater && <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 15 }}>AI 그림 ({imager}, 느림 · 최대 8장)</span><Toggle on={useAi} onChange={setUseAi} /></div>}
            </div>
            <div style={{ ...row, flexWrap: "wrap", borderBottom: 0 }}>
              <span style={{ ...label, width: "100%" }}>채우기</span>
              {([["cover", "꽉 채우기"], ["contain", "맞추기"], ["blur", "흐린 배경"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setFill(k)} style={chip(fill === k)}>{l}</button>)}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, gap: 14 }}>
            <div style={{ fontSize: 14, color: C.sub }}>예시 화면</div>
            {(() => {
              const [w, h] = ratio.split(":").map(Number);
              const W = w >= h ? 460 : (340 * w) / h;
              const H = (W * h) / w;
              return (
                <div style={{ position: "relative", width: W, height: H, background: "#2a2b30", border: `1px solid ${C.line2}`, borderRadius: 4, overflow: "hidden" }}>
                  {subOn && (
                    <div style={{ position: "absolute", left: 10, right: 10, textAlign: "center", ...(subPos === "top" ? { top: H * 0.08 } : subPos === "middle" ? { top: "45%" } : subPos === "middle-low" ? { bottom: H * 0.24 } : { bottom: H * 0.07 }) }}>
                      <span style={{ fontFamily: "'Malgun Gothic', sans-serif", fontWeight: 700, fontSize: Math.min(W, H) * 0.075, color: "#fff", WebkitTextStroke: "2px #000", paintOrder: "stroke fill" }}>자막은 이 위치에 보여요</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", fontSize: 14, color: C.sub }}>
              <span>{ratio} {RATIO_LABEL[ratio]}</span>
              {voiceOn && <span>{findVoice(voiceId)?.name}</span>}
              {musicOn && <span>{mood} 음악</span>}
              <span>클립 {lineCount}개 · 약 {Math.round(seconds)}초</span>
            </div>
            {err && <div style={{ fontSize: 14, color: C.danger }}>{err}</div>}
          </div>
        </div>
      )}

      {confirm && (
        <Modal title="확인" onClose={() => setConfirm(false)} width={520} footer={<><Btn onClick={() => setConfirm(false)}>취소</Btn><Btn primary onClick={build}>확인</Btn></>}>
          <div style={{ padding: 22, fontSize: 16, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>영상 만들기를 시작할까요?</div>
            <div style={{ color: C.sub, fontSize: 15 }}>
              클립 {lineCount}개 · {voiceOn ? findVoice(voiceId)?.name : "목소리 없음"}
              {visualLater ? " · 화면은 나중에" : <>{photoCount ? ` · 공실 사진 ${photoCount}장` : ""}{useStock ? " · 무료 영상" : ""}{useAi ? ` · AI 그림(${imager})` : ""}</>}
              <br />예상 {visualLater ? "1분 안팎" : useAi ? "5~10분" : lineCount > 20 ? "2~4분" : "1~2분"}
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
