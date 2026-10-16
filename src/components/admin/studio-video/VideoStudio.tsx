"use client";

// 공실뉴스 스튜디오 [동영상제작] — 브루식 영상 편집기 (원본은 회원 PC, 편집·미리보기·굽기도 PC)
// 계획서: docs/2026-10-15_studio_video_editor_plan.md
import React, { useState } from "react";
import type { LibItem, Method, Project } from "./types";
import { errText, videoBridge } from "./types";
import Editor from "./Editor";
import TextWizard from "./TextWizard";
import { Home, LongformFlow, NewDialog, RecordFlow, VideoFlow } from "./Flows";
import { C, FONT, Icon } from "./ui";

export default function VideoStudio() {
  const b = videoBridge();
  const [project, setProject] = useState<Project | null>(null);
  const [flow, setFlow] = useState<"" | "new" | Method>("");
  const [recorded, setRecorded] = useState<LibItem | null>(null);
  const [err, setErr] = useState("");

  if (!b) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.text, fontFamily: FONT }}>
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8 }}>
          <Icon name="video" size={36} />
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 14 }}>동영상제작은 공실뉴스 스튜디오(PC 앱)에서 이용해요</div>
          <div style={{ fontSize: 15, color: C.sub, marginTop: 10, lineHeight: 1.7 }}>찍은 영상을 PC에 그대로 두고 편집하기 때문에 앱이 필요해요. 앱에서 [동영상제작] 메뉴를 열어 주세요.</div>
        </div>
      </div>
    );
  }

  const open = async (dir: string) => {
    setErr("");
    try {
      setProject(await b.project.open(dir));
    } catch (e) {
      setErr(errText(e));
    }
  };
  const openPick = async () => {
    try {
      const p = await b.project.openPick();
      if (p) setProject(p);
    } catch (e) {
      setErr(errText(e));
    }
  };
  const done = (p: Project) => {
    setFlow("");
    setRecorded(null);
    // 저장된 것을 다시 열어 주소·없는 파일 표시를 맞춘다
    b.project.open(p.dir).then(setProject).catch(() => setProject(p));
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: C.bg }}>
      {project ? (
        <Editor key={project.dir} initial={project} onHome={() => setProject(null)} onNew={() => setFlow("new")} onOpen={openPick} onSwitch={setProject} />
      ) : (
        <Home onNew={() => setFlow("new")} onOpenPick={openPick} onOpen={open} />
      )}
      {err && <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", padding: "10px 16px", background: C.card, border: `1px solid ${C.danger}`, color: C.text, borderRadius: 6, fontFamily: FONT, fontSize: 14.5, zIndex: 2000 }} onClick={() => setErr("")}>{err}</div>}
      {flow === "new" && <NewDialog onPick={(m) => setFlow(m)} onClose={() => setFlow("")} />}
      {flow === "text" && <TextWizard onCancel={() => setFlow("")} onDone={done} />}
      {flow === "video" && <VideoFlow onCancel={() => setFlow("")} onDone={done} />}
      {flow === "longform" && <LongformFlow onCancel={() => setFlow("")} onDone={done} />}
      {flow === "record" && !recorded && <RecordFlow onCancel={() => setFlow("")} onRecorded={(item) => setRecorded(item)} />}
      {flow === "record" && recorded && <VideoFlow method="record" preset={[recorded]} onCancel={() => { setFlow(""); setRecorded(null); }} onDone={done} />}
    </div>
  );
}
