"use client";

/**
 * 웹 쇼츠릴스studio — 유튜브 쇼츠 · 인스타그램 릴스 · 스레드 · 페이스북 올리기 (2026-11-05 사장님: "도우미가 채우고 게시는 회원이" · "인스타 스레드 페북에도")
 *  ① 제목·설명 확인(공실 정보·자막으로 채워 둠, 고칠 수 있음) → ② [유튜브 스튜디오에서 채우기]
 *  → 영상 파일을 도우미 확장에 맡기고 → 유튜브 올리기 화면을 새 탭으로 → 도우미가 영상·제목·설명을 넣는다 → 회원이 [게시]
 *  글은 서버 AI 를 쓰지 않는다 (공실 정보·자막 그대로)
 */
import React, { useEffect, useState } from "react";
import type { Project } from "./types";
import { errText } from "./types";
import { clipText } from "./timeline";
import { Btn, C, FONT, Icon, Modal } from "./ui";
import { ChannelMark } from "./PostDialog";
import { getVideoVacancy } from "@/app/actions/videoWeb";
import { helper, helperOn, helperWait } from "@/components/admin/studio-web/core";
import { HELPER_STORE_URL } from "@/components/admin/HelperInstallGuide";

const NEED = "4.1.2"; // 영상 맡기기가 들어간 작성기 버전
/** a 가 b 보다 높은 버전인가 */
const newer = (a: string, b: string) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
};
const CHUNK = 3 * 1024 * 1024; // 3MB 씩 (확장 메시지 한도 안쪽)
const b64Of = (blob: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, ""));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});

type Ch = "youtube" | "instagram" | "threads" | "facebook";
const CH: { id: Ch; name: string; open: string; how: string; done: string }[] = [
  { id: "youtube", name: "유튜브 쇼츠", open: "https://www.youtube.com/upload", how: "유튜브 올리기 화면에 영상·제목·설명을 넣어 둬요. 공개 범위와 마지막 [게시]는 직접 눌러요.", done: "다 채웠어요. 유튜브 탭에서 내용을 확인하고 [다음] → 공개 범위 → [게시]를 눌러 주세요." },
  { id: "instagram", name: "인스타그램 릴스", open: "https://www.instagram.com/", how: "인스타그램 새 게시물에 영상(릴스)과 문구를 넣어 둬요. 마지막 [공유하기]는 직접 눌러요.", done: "다 채웠어요. 인스타그램 탭에서 확인하고 [공유하기]를 눌러 주세요." },
  { id: "threads", name: "스레드", open: "https://www.threads.com/", how: "스레드 새 글에 영상과 글을 넣어 둬요. 마지막 [게시]는 직접 눌러요.", done: "다 채웠어요. 스레드 탭에서 확인하고 [게시]를 눌러 주세요." },
  { id: "facebook", name: "페이스북", open: "https://www.facebook.com/", how: "페이스북 게시물에 영상과 글을 넣어 둬요. 마지막 [게시]는 직접 눌러요.", done: "다 채웠어요. 페이스북 탭에서 확인하고 [게시]를 눌러 주세요." },
];

export default function WebPostDialog({ project, url, onClose, channel = "youtube" }: { project: Project; url: string; onClose: () => void; channel?: Ch }) {
  const [ch, setCh] = useState<Ch>(channel);
  const info = CH.find((x) => x.id === ch)!;
  const [title, setTitle] = useState(project.name.replace(/^\d{8}\s*/, ""));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [noHelper, setNoHelper] = useState(false);

  // 처음 글 — 공실 정보 · 자막 · 해시태그 · 끝에 사무소 표시 (지어내지 않음)
  useEffect(() => {
    let live = true;
    const lines = project.scenes.flatMap((s) => s.clips).map((c) => (clipText(c) || String((c as { subText?: string }).subText || "")).trim()).filter(Boolean); // 목소리 없는 클립은 자막이 subText 에
    (async () => {
      const r = project.vacancyId ? await getVideoVacancy(project.vacancyId).catch(() => null) : null;
      if (!live) return;
      const v = r && r.success ? r.data : null;
      if (v) setTitle(`${v.intro.place} ${v.intro.kind}${v.intro.price ? ` ${v.intro.price}` : ""}`.replace(/\s+/g, " ").trim().slice(0, 90));
      const tags = ["#shorts", "#부동산", v?.dong && `#${v.dong}`, v?.intro.kind && `#${v.intro.kind.replace(/[\s/]+/g, "")}`].filter(Boolean).join(" ");
      const office = v?.outro ? [v.outro.name, ...v.outro.lines].filter(Boolean).join("\n") : "";
      setText([lines.join("\n"), tags, office].filter(Boolean).join("\n\n"));
    })();
    void helperOn().then((on) => { if (live) setNoHelper(!on); });
    return () => { live = false; };
  }, [project]);

  const fill = async () => {
    setErr(""); setDone("");
    try {
      if (!(await helperOn())) { setNoHelper(true); return; }
      // 영상 맡기기는 작성기 4.1.2 부터 — 예전 작성기면 버전을 알려 준다
      const pv = await helper({ op: "ping" }, 1500);
      const ver = String(pv?.version || "");
      if (ver && newer(NEED, ver)) throw new Error(`지금 크롬의 공실뉴스 작성기는 ${ver}이에요. 영상 올리기는 ${NEED} 이상에서 돼요. 작성기를 새로 받은 뒤 이 화면을 새로 고쳐 주세요.`);
      setBusy("영상을 도우미에 맡기는 중…");
      const blob = await fetch(url).then((r) => r.blob());
      const fileId = `yt-${Date.now().toString(36)}`;
      const s0 = await helper({ op: "fileStart" }, 10000);
      if (!s0?.ok) throw new Error("도우미가 응답하지 않았어요. 공실뉴스 작성기(크롬 확장)를 4.1.2 이상으로 새로 받아 주세요.");
      const chunks = Math.ceil(blob.size / CHUNK);
      for (let i = 0; i < chunks; i++) {
        setBusy(`영상을 도우미에 맡기는 중… ${Math.round(((i + 1) / chunks) * 100)}%`);
        const b64 = await b64Of(blob.slice(i * CHUNK, (i + 1) * CHUNK));
        const r = await helper({ op: "fileChunk", fileId, i, b64 }, 30000);
        if (!r?.ok) throw new Error("영상을 도우미에 맡기지 못했어요. 이 화면을 새로 고친 뒤 다시 눌러 주세요.");
      }
      const fileName = `${project.name || "shorts"}.mp4`.replace(/[\\/:*?"<>|]+/g, "");
      // 유튜브는 제목·설명 따로, 인스타·스레드·페북은 제목을 글 첫 줄로
      const payload = ch === "youtube" ? { title: title.trim(), text: text.trim() } : { label: info.name, text: [title.trim(), text.trim()].filter(Boolean).join("\n\n") };
      const job = await helper({ op: "job", target: ch, payload: { ...payload, fileId, fileName, chunks, size: blob.size } });
      if (!job?.ok) throw new Error("도우미에 일감을 맡기지 못했어요. 작성기를 4.1.2 이상으로 새로 받아 주세요.");
      window.open(info.open, "_blank");
      setBusy(`${info.name} 화면에서 도우미가 채우는 중… (로그인이 필요해요)`);
      const res = await helperWait(job.id, "done", 4 * 60 * 1000);
      setBusy("");
      if (!res) setErr(`${info.name} 화면에서 응답이 없어요. 새 탭이 열렸는지, 로그인했는지 확인해 주세요.`);
      else if (res.ok) setDone(info.done);
      else if (res.partial) setDone(`${info.name} 탭에서 도우미 상자 안내대로 이어서 해 주세요.`);
      else setErr(String(res.error || "채우지 못했어요."));
    } catch (e) {
      setBusy("");
      setErr(errText(e));
    }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(`${title}\n\n${text}`); setDone("제목·설명을 복사했어요"); } catch {} };

  const box: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 15, fontFamily: FONT, padding: "10px 12px" };
  return (
    <Modal title="SNS에 올리기" onClose={busy ? () => {} : onClose} width={640}
      footer={<>
        <Btn onClick={() => void copy()} disabled={Boolean(busy)}><Icon name="copy" size={15} />글 복사</Btn>
        <span style={{ flex: 1 }} />
        <Btn onClick={onClose} disabled={Boolean(busy)}>닫기</Btn>
        <Btn primary onClick={() => void fill()} disabled={Boolean(busy) || !title.trim()}><ChannelMark ch={ch} />{busy ? "채우는 중…" : `${info.name}에 채우기`}</Btn>
      </>}>
      <div style={{ padding: "16px 22px 20px", fontFamily: FONT, color: C.text }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
          {CH.map((x) => (
            <button key={x.id} type="button" disabled={Boolean(busy)} onClick={() => { setCh(x.id); setDone(""); setErr(""); }}
              style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 8, border: `2px solid ${ch === x.id ? C.accent : C.line2}`, background: ch === x.id ? C.accentDim : "transparent", color: C.text, fontSize: 13.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
              <ChannelMark ch={x.id} />{x.name}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.7, marginBottom: 12 }}>도우미가 {info.how}</div>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{ch === "youtube" ? "제목" : "첫 줄"} <span style={{ fontWeight: 600, color: C.dim, fontSize: 12.5 }}>{title.length}/100</span></div>
        <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ ...box, height: 42 }} />
        <div style={{ fontSize: 14, fontWeight: 800, margin: "14px 0 6px" }}>{ch === "youtube" ? "설명" : "문구"}</div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} rows={10} style={{ ...box, lineHeight: 1.6, resize: "vertical" }} />
        {noHelper && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line2}`, fontSize: 14, lineHeight: 1.7 }}>
            공실뉴스 작성기(크롬 확장)가 필요해요. <a href={HELPER_STORE_URL} target="_blank" rel="noreferrer" style={{ color: C.accent, fontWeight: 800 }}>설치·새로 받기 ›</a> 설치한 뒤 이 화면을 새로 고쳐 주세요.
          </div>
        )}
        {busy && <div style={{ marginTop: 12, fontSize: 14, color: C.accent, fontWeight: 700 }}>{busy}</div>}
        {done && <div style={{ marginTop: 12, fontSize: 14, color: "#6ee7b7", fontWeight: 700 }}>{done}</div>}
        {err && <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.danger}`, fontSize: 14 }}>{err}</div>}
      </div>
    </Modal>
  );
}
