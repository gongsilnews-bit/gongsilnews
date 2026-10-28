"use client";

// 공실마케팅 [동영상제작] — 브루식 영상 편집기 (원본은 회원 PC, 편집·미리보기·굽기도 PC)
// 계획서: docs/2026-10-15_studio_video_editor_plan.md
import React, { useEffect, useState } from "react";
import type { LibItem, Method, Project, Recover } from "./types";
import { errText, isRecover, videoBridge } from "./types";
import Editor from "./Editor";
import TextWizard from "./TextWizard";
import { AudioFlow, Home, LongformFlow, NewDialog, RecordFlow, VideoFlow, loadPrompter, savePrompter } from "./Flows";
import { Btn, C, FONT, Icon, Modal, ModalPage, useStudioTheme } from "./ui";
import VideoMenu, { type VideoView } from "./VideoMenu";
import { MyVoicePane } from "./MyVoice";
import { AiVoiceStudio } from "./AiVoiceStudio";

/** 동영상제작을 쓸 수 있는 가장 낮은 스튜디오 앱 버전 (.gss 저장 방식 — 0.1.4) */
const MIN_APP = "0.1.4";

export default function VideoStudio() {
  useStudioTheme(); // 밝은/어두운 화면 (2026-10-23)
  const b = videoBridge();
  const [project, setProject] = useState<Project | null>(null);
  const [flow, setFlow] = useState<"" | "new" | Method>("");
  const [recorded, setRecorded] = useState<LibItem | null>(null);
  const [recScript, setRecScript] = useState(""); // 녹화할 때 프롬프터로 읽은 대본 → 자막
  const [err, setErr] = useState("");
  const [view, setView] = useState<VideoView>("home");
  const [menuPeek, setMenuPeek] = useState(false); // 대본 쓰고 편집 페이지에서 둘째 메뉴 펴기 (기본은 숨김, 2026-10-23 사장님) // 왼쪽 메뉴 칸 (편집 화면 밖에서만)
  // .gss 를 열었는데 저장 안 한 고친 내용이 남아 있으면 — [이어서 열기 / 마지막 저장 상태로 열기]
  const [recover, setRecover] = useState<Recover | null>(null);
  const [resume, setResume] = useState<Project | null>(null); // 작성 중 초안(.gss) — 대본 쓰고 편집 그 단계로
  // 뉴스·SNS발행 › 유튜브 대본의 [이 대본으로 동영상 만들기] — 공실·대본을 받아 대본 작성으로 (2026-10-23 사장님)
  const [seed, setSeed] = useState<{ vacancyId: string; script: string; title?: string } | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem("gs-video-seed") || "null");
      sessionStorage.removeItem("gs-video-seed");
      if (v && v.vacancyId && Date.now() - (v.at || 0) < 10 * 60 * 1000) { setSeed(v); setResume(null); setFlow("text"); }
    } catch {}
  }, []);
  const take = (r: Project | Recover | null) => {
    if (!r) return;
    if (isRecover(r)) setRecover(r);
    else if ((r as unknown as { draft?: unknown }).draft) { setResume(r); setFlow("text"); }
    else setProject(r);
  };
  // 탐색기에서 .gss 파일을 두 번 눌러 앱을 열었으면 — 그 파일을 바로 연다 (앱이 켜져 있을 때 눌러도)
  useEffect(() => {
    if (!b) return;
    const openFile = (f: string) => {
      if (!f) return;
      setFlow("");
      b.project.open(f).then(take).catch((e) => setErr(errText(e)));
    };
    b.project.pendingFile?.().then(openFile).catch(() => {});
    // 첫 화면 [작업 계속하기]에서 누른 프로젝트 (StudioHomeSection, 2026-10-27)
    try {
      const v = JSON.parse(sessionStorage.getItem("gs-video-open") || "null");
      sessionStorage.removeItem("gs-video-open");
      if (v?.dir && Date.now() - (v.at || 0) < 60 * 1000) openFile(v.dir);
    } catch {}
    return b.project.onOpenFile?.(openFile);
  }, [b]);

  if (!b) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.text, fontFamily: FONT }}>
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8 }}>
          <Icon name="video" size={36} />
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>동영상제작은 공실마케팅(PC 앱)에서 이용해요</div>
          <div style={{ fontSize: 15, color: C.sub, marginTop: 10, lineHeight: 1.7 }}>찍은 영상을 PC에 그대로 두고 편집하기 때문에 앱이 필요해요. 앱에서 [동영상제작] 메뉴를 열어 주세요.</div>
        </div>
      </div>
    );
  }

  // 필수 앱 버전 — 이보다 낮은 앱이면 동영상제작을 막고 업데이트를 안내한다 (저장 방식이 바뀌는 등 큰 변경 때 올린다)
  const appVer = (typeof navigator !== "undefined" && /GongsilStudio\/([\d.]+)/.exec(navigator.userAgent)?.[1]) || "";
  const older = (a: string, z: string) => {
    const x = a.split(".").map(Number), y = z.split(".").map(Number);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
    return false;
  };
  if (appVer && older(appVer, MIN_APP)) {
    const studio = (window as unknown as { gongsilStudio?: { checkUpdate?: () => Promise<void> } }).gongsilStudio;
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.text, fontFamily: FONT }}>
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8 }}>
          <Icon name="video" size={36} />
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>공실마케팅 업데이트가 필요해요</div>
          <div style={{ fontSize: 15, color: C.sub, marginTop: 10, lineHeight: 1.7 }}>
            동영상제작이 새로워졌어요 (지금 앱 v{appVer} → v{MIN_APP} 이상).<br />
            {studio?.checkUpdate ? "[지금 업데이트]를 누르면 새 버전을 받아 다시 켜요." : "앱을 껐다 켜면 켤 때 자동으로 새 버전을 받아요."}
          </div>
          {studio?.checkUpdate && <div style={{ marginTop: 18 }}><Btn primary onClick={() => void studio.checkUpdate!()}>지금 업데이트</Btn></div>}
        </div>
      </div>
    );
  }

  const open = async (dir: string, choice?: "work" | "file") => {
    setErr("");
    try {
      take(await b.project.open(dir, choice));
    } catch (e) {
      setErr(errText(e));
    }
  };
  const openPick = async () => {
    try {
      take((await b.project.openPick()) as Project | Recover | null);
    } catch (e) {
      setErr(errText(e));
    }
  };
  // 만들기 화면이 열려 있는데 다른 메뉴를 누르면 — 물어보고 닫는다
  // 페이지로 여는 것은 [대본 쓰고 편집]만 — 촬영한 영상·녹음한 음성·녹화는 지금처럼 뜨는 창 (2026-10-23 사장님)
  const pageFlow = flow === "text";
  const leaveFlow = () => { setFlow(""); setRecorded(null); setResume(null); return true; }; // 쓴 대본은 작성 중 초안(.gss)에 저절로 저장돼요 (2026-10-23)
  const done = async (p: Project) => {
    setFlow("");
    setRecorded(null);
    // 만들기 마법사로 만든 내용은 첫 저장으로 .gss 에 담는다. 그리고 다시 열어 주소·없는 파일 표시를 맞춘다
    await b.project.flush?.(p).catch(() => {});
    b.project.open(p.dir).then((r) => take(r as Project)).catch(() => setProject(p));
  };

  // 만들기 화면 (편집 화면이 열려 있지 않으면 오른쪽 영역에 페이지로, 편집 중에 [새로 만들기]로 열면 뜨는 창으로)
  const flowEl = flow === "text" ? (
    <TextWizard key={resume?.file || resume?.dir || (seed ? `seed-${seed.vacancyId}` : "new")} resume={resume || undefined} seed={seed || undefined} onCancel={() => { setFlow(""); setResume(null); setSeed(null); }} onDone={(p) => { setResume(null); setSeed(null); void done(p); }} onRecord={(script) => {
      // 대본을 프롬프터에 넣고 녹화로 — 녹화가 끝나면 이 대본이 자막 글이 된다
      savePrompter({ ...loadPrompter(), on: true, text: script });
      setFlow("record");
    }} />
  ) : flow === "video" ? <VideoFlow onCancel={() => setFlow("")} onDone={done} />
    : flow === "longform" ? <LongformFlow onCancel={() => setFlow("")} onDone={done} />
    : flow === "audio" ? <AudioFlow onCancel={() => setFlow("")} onDone={done} />
    : flow === "record" && recorded ? <VideoFlow method="record" preset={[recorded]} script={recScript} onCancel={() => { setFlow(""); setRecorded(null); }} onDone={done} />
    : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: C.bg }}>
      {project ? (
        <Editor key={project.dir} initial={project} onHome={() => setProject(null)} onNew={() => setFlow("new")} onOpen={openPick} onSwitch={setProject} />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {pageFlow && !menuPeek ? (
            <button type="button" onClick={() => setMenuPeek(true)} title="메뉴 펴기"
              style={{ width: 18, flexShrink: 0, border: 0, borderRight: `1px solid ${C.line}`, background: C.panel, color: C.sub, cursor: "pointer", fontSize: 14, fontWeight: 800, padding: 0 }}>›</button>
          ) : (
            <div style={{ display: "flex", flexShrink: 0, position: "relative" }}>
              <VideoMenu view={view} onView={(v) => { if (leaveFlow()) { setView(v); setMenuPeek(false); } }} onMethod={(m) => { if (m === flow) return; if (leaveFlow()) { setFlow(m); setMenuPeek(false); } }} />
              {pageFlow && <button type="button" onClick={() => setMenuPeek(false)} title="메뉴 숨기기" style={{ position: "absolute", right: 6, top: 18, width: 26, height: 26, border: `1px solid ${C.line2}`, borderRadius: 6, background: C.panel, color: C.sub, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>‹</button>}
            </div>
          )}
          {pageFlow ? (
            <ModalPage.Provider value={true}>
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>{flowEl}</div>
            </ModalPage.Provider>
          ) : view === "aivoice" ? (
            <AiVoiceStudio />
          ) : view === "myvoice" ? (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", color: C.text, fontFamily: FONT }}>
              <div style={{ padding: "26px 28px 0", fontSize: 22, fontWeight: 800 }}>내 목소리</div>
              <div style={{ padding: "6px 28px 0", fontSize: 14.5, color: C.sub }}>내 목소리를 등록해 두면 영상 대본을 내 목소리로 읽어요 (이 PC 에서, 무료).</div>
              <div style={{ flex: 1, minHeight: 0, display: "flex", maxWidth: 760 }}><MyVoicePane selected={false} onPick={() => {}} /></div>
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}><Home onNew={() => setFlow("new")} onOpenPick={openPick} onOpen={open} /></div>
          )}
        </div>
      )}
      {recover && (
        <Modal title="저장하지 않은 고친 내용이 있어요" onClose={() => setRecover(null)} width={520}
          footer={<><Btn onClick={() => { const r = recover; setRecover(null); open(r.file, "file"); }}>마지막 저장 상태로 열기</Btn><Btn primary onClick={() => { const r = recover; setRecover(null); open(r.file, "work"); }}>이어서 열기</Btn></>}>
          <div style={{ padding: 20, fontSize: 15, lineHeight: 1.7 }}>
            <b>{recover.name}</b>을(를) 지난번에 고친 뒤 저장하지 않고 닫았어요 (또는 갑자기 꺼졌어요).<br />
            고친 내용을 이어서 열까요, 마지막으로 저장한 상태로 열까요?
          </div>
        </Modal>
      )}
      {err && <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", padding: "10px 16px", background: C.card, border: `1px solid ${C.danger}`, color: C.text, borderRadius: 6, fontFamily: FONT, fontSize: 14.5, zIndex: 2000 }} onClick={() => setErr("")}>{err}</div>}
      {flow === "new" && <NewDialog onPick={(m) => setFlow(m)} onClose={() => setFlow("")} />}
      {flowEl && (project || !pageFlow) && <ModalPage.Provider value={false}>{flowEl}</ModalPage.Provider>}
      {flow === "record" && !recorded && <RecordFlow onCancel={() => setFlow("")} onRecorded={(item, script) => { setRecScript(script || ""); setRecorded(item); }} />}
    </div>
  );
}
