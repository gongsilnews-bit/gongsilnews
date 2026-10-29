"use client";

import React, { useEffect, useState } from "react";
import { listMyStudioVacancies } from "@/app/actions/studio";
import { SNS_TONES } from "./StudioSnsPanel";
import WorkCardGrid from "./WorkCardGrid";
import { PostDialog } from "@/components/admin/studio-video/PostDialog";
import type { LibItem, PostChannel, Project, Ratio } from "@/components/admin/studio-video/types";
import { errText, videoBridge } from "@/components/admin/studio-video/types";

/**
 * 뉴스·SNS발행 › 내 영상 올리기 (2026-10-29 사장님) — 편집이 끝난 영상 파일을 다시 굽지 않고 그대로 SNS에
 *  ① 영상 고르기(PC) → ② 어느 공실 영상인지 → ③ [SNS 글 한 번에 쓰기] — 네 채널 글을 AI 한 번에 (영상 올리기 창 PostDialog, 편집기 [SNS에 올리기]와 같은 것)
 *  공실·기사 연결 · AI 글 · 글 끝(부동산 이름·홈페이지·물건 맡기기) · [크롬에서 채우기] · 홍보현황 ✓ 는 그 창이 한다
 */
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; darkMode?: boolean };

type Vac = { id: string; label: string; name: string; no: string };

/* 가로·세로로 비율 — 세로면 쇼츠·릴스 */
function ratioOf(w: number, h: number): Ratio {
  if (!w || !h) return "16:9";
  const r = w / h;
  if (r < 0.7) return "9:16";
  if (r < 0.9) return "4:5";
  if (r < 1.15) return "1:1";
  return "16:9";
}
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export default function StudioMyVideoPanel({ theme, onListView }: { theme: Theme; onListView?: (on: boolean) => void }) {
  const b = videoBridge();
  const [item, setItem] = useState<(LibItem & { path?: string }) | null>(null);
  // 처음 화면은 목록 (2026-10-29 사장님: 공실뉴스와 같이) — 맨 앞 [+ 새로 만들기] = PC에서 영상 고르기, 이어서 내 자료의 영상 카드
  const [view, setView] = useState<"list" | "work">("list");
  useEffect(() => { onListView?.(view === "list"); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const [videos, setVideos] = useState<(LibItem & { path?: string })[] | null>(null);
  // 내가 올린 영상만 (2026-10-29 사장님) — [크롬에서 채우기] 기록(gsv:postLog, 편집기·여기 같이)으로. 사진·길이는 내 자료에서 찾는다
  const [posted, setPosted] = useState<Record<string, { at: number; done: Record<string, boolean> }>>({});
  const loadPosted = () => {
    let log: { at: number; ch: string; file: string }[] = [];
    try { log = JSON.parse(localStorage.getItem("gsv:postLog") || "[]"); } catch {}
    const by: Record<string, { at: number; done: Record<string, boolean> }> = {};
    for (const e of log) {
      if (!e || !e.file) continue;
      const k = e.file;
      by[k] = by[k] || { at: 0, done: {} };
      by[k].at = Math.max(by[k].at, e.at || 0);
      by[k].done[e.ch] = true;
    }
    setPosted(by);
    return by;
  };
  useEffect(() => {
    const by = loadPosted();
    const files = Object.keys(by);
    if (!files.length) return setVideos([]);
    const norm = (p: string) => p.replace(/\\/g, "/").toLowerCase();
    const fromPath = (f: string) => ({ id: f, path: f, name: f.split(/[\\/]/).pop() || f, kind: "video", source: "mine", fav: false, duration: 0, width: 0, height: 0, url: "", thumb: "", ready: true } as LibItem & { path?: string });
    (b?.lib.list ? b.lib.list({ kind: "video" }) : Promise.resolve([] as LibItem[])).then((l) => {
      const byPath = new Map(l.filter((x) => x.path).map((x) => [norm(String(x.path)), x]));
      setVideos(files.map((f) => ({ ...(byPath.get(norm(f)) || fromPath(f)), id: f, path: f })).sort((x, y) => (by[y.id]?.at || 0) - (by[x.id]?.at || 0)));
    }).catch(() => setVideos(files.map(fromPath)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [ch, setCh] = useState<PostChannel | "">("");
  const [err, setErr] = useState("");
  const [vacs, setVacs] = useState<Vac[] | null>(null);
  const [vacId, setVacId] = useState("");
  const [tone, setTone] = useState(() => { try { return localStorage.getItem("gs-myvideo-tone") || "polite"; } catch { return "polite"; } });
  const pickTone = (t: string) => { setTone(t); try { localStorage.setItem("gs-myvideo-tone", t); } catch {} };
  useEffect(() => {
    listMyStudioVacancies().then((r) => {
      const list = (r.success ? r.data : []) as { id: string; vacancy_no?: number | null; building_name?: string | null; property_type?: string | null; dong?: string | null }[];
      setVacs(list.map((v) => ({ id: v.id, name: v.building_name || "", no: v.vacancy_no ? String(v.vacancy_no) : "", label: `${v.vacancy_no ? `${v.vacancy_no} · ` : ""}${[v.dong, v.building_name || v.property_type].filter(Boolean).join(" ")}` })));
    }).catch(() => setVacs([]));
  }, []);
  // 파일 이름으로 공실을 미리 고른다 (건물 이름·물건번호가 하나만 맞을 때)
  useEffect(() => {
    if (!item || !vacs) return;
    const sq = (t: string) => t.replace(/[\s\[\]()「」"'·,._-]/g, "");
    const nm = sq(item.name);
    const hit = vacs.filter((v) => (v.no && nm.includes(v.no)) || (v.name && nm.includes(sq(v.name))));
    setVacId(hit.length === 1 ? hit[0].id : "");
  }, [item, vacs]);

  const pick = async () => {
    setErr("");
    if (!b?.lib.pick) return setErr("공실마케팅 앱에서 쓸 수 있어요.");
    try {
      const got = await b.lib.pick({ kinds: "media" });
      const v = got.find((x) => x.kind === "video" && x.path);
      if (!v) return got.length ? setErr("영상 파일을 골라 주세요 (사진은 [이미지제작]에서).") : undefined;
      setItem(v);
      setView("work");
    } catch (e) {
      setErr(errText(e));
    }
  };

  const ratio = item ? ratioOf(item.width, item.height) : "16:9";
  const name = item ? item.name.replace(/\.[^.]+$/, "") : "";
  // 영상 올리기 창이 쓰는 칸만 채운 작업 — 편집 작업(.gss)은 만들지 않는다
  const project = item
    ? ({ name, vacancyId: vacId, ratio, scenes: [], assets: {}, settings: {}, dir: String(item.path || "").replace(/[\\/][^\\/]+$/, "") } as unknown as Project)
    : null;

  const card: React.CSSProperties = { background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 };
  const step = (n: number, t: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{t}</h3>
    </div>
  );

  if (view === "list") {
    const dateOf = (ms?: number) => (ms ? new Date(ms).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\s/g, "") : "");
    return (
      <div>
        <WorkCardGrid theme={theme} addLabel="새로 만들기" onAdd={() => void pick()} placeholder={<span style={{ fontSize: 30 }}>🎬</span>}
          empty="아직 올린 영상이 없어요. [+ 새로 만들기]로 PC에서 영상을 골라 올려 보세요."
          channels={[["youtube", "유튜브"], ["instagram", "인스타그램 릴스"], ["threads", "스레드"], ["facebook", "페이스북"]]}
          cards={videos && videos.map((v) => {
            const r = ratioOf(v.width, v.height);
            const p = posted[v.id];
            return { id: v.id, badge: v.width ? (r === "16:9" ? "가로" : "세로") : undefined, date: dateOf(p?.at || v.addedAt), title: v.name.replace(/\.[^.]+$/, ""),
              headline: v.duration ? clock(v.duration) : undefined, line1: v.width ? (r === "16:9" ? "유튜브 일반 영상" : "유튜브 쇼츠 · 인스타 릴스") : undefined, thumb: v.thumb || null,
              done: p?.done || {} };
          })}
          onOpen={(id, t) => {
            const v = (videos || []).find((x) => x.id === id);
            if (!v || !v.path) return void pick();
            setItem(v);
            setView("work");
            if (["youtube", "instagram", "threads", "facebook"].includes(t)) setCh(t as PostChannel); // 채널 아이콘을 누르면 그 채널로 바로 올리기 창
          }} />
        {err && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{err}</div>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setView("list")}
          style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>← 목록</button>
      </div>
      {step(1, "올릴 영상 고르기")}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {item?.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumb} alt="" style={{ width: ratio === "16:9" ? 160 : 72, height: ratio === "16:9" ? 90 : 128, objectFit: "cover", borderRadius: 8, background: "#000" }} />
          )}
          <div style={{ flex: 1, minWidth: 220 }}>
            {item ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary, wordBreak: "break-all" }}>{item.name}</div>
                <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
                  {clock(item.duration || 0)} · {ratio === "9:16" || ratio === "1:1" || ratio === "4:5" ? "세로 영상 → 유튜브 쇼츠 · 인스타 릴스" : "가로 영상 → 유튜브 일반 영상"}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.6 }}>
                편집이 끝난 영상을 <b>다시 굽지 않고 그대로</b> 올립니다. 공실마케팅에서 만든 영상은 <b>06 완성영상</b> 폴더에 있어요.
              </div>
            )}
          </div>
          <button onClick={() => void pick()}
            style={{ padding: "10px 18px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            {item ? "다른 영상 고르기" : "PC에서 영상 고르기"}
          </button>
        </div>
        {err && <div style={{ marginTop: 12, fontSize: 14, color: "#c53030" }}>{err}</div>}
      </div>

      {step(2, "어느 공실 영상인가요?")}
      <div style={{ ...card, opacity: item ? 1 : 0.55 }}>
        <select value={vacId} onChange={(e) => setVacId(e.target.value)} disabled={!item}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 14 }}>
          <option value="">공실 없음 · 기사 영상 (다음 창에서 기사를 고를 수 있어요)</option>
          {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
        <div style={{ marginTop: 8, fontSize: 13, color: theme.textSecondary }}>
          공실을 고르면 글 끝에 물건 상세 링크와 법에 필요한 표시가 붙고, 올린 주소가 그 공실 홍보현황에 ✓ 로 남아요.
        </div>
      </div>

      {step(3, "SNS 글 한 번에 쓰기")}
      <div style={{ ...card, opacity: item ? 1 : 0.55 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.textSecondary, marginBottom: 8 }}>문체 — 네 채널 같이</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, marginBottom: 16 }}>
          {SNS_TONES.map((t) => (
            <button key={t.id} type="button" onClick={() => pickTone(t.id)}
              style={{ textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer", color: theme.textPrimary,
                border: `1px solid ${tone === t.id ? "#1a3a6b" : theme.border}`, background: tone === t.id ? "rgba(26,58,107,0.08)" : "transparent" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{t.label}{tone === t.id ? " ✓" : ""}</div>
              <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{t.brief}</div>
            </button>
          ))}
        </div>
        <button disabled={!item} onClick={() => setCh("youtube")}
          style={{ padding: "12px 22px", borderRadius: 10, border: 0, background: item ? "#16a34a" : "#94a3b8", color: "#fff", fontSize: 15, fontWeight: 800, cursor: item ? "pointer" : "default" }}>
          유튜브 · 인스타 릴스 · 스레드 · 페이스북 글 한 번에 쓰기
        </button>
        <div style={{ marginTop: 12, fontSize: 13, color: theme.textSecondary, lineHeight: 1.7 }}>
          AI가 네 채널 글을 <b>한 번에</b> 씁니다. 열린 창 위쪽 탭으로 채널을 옮겨 다니며 고치고, [크롬에서 채우기]로 평소 크롬에 영상과 글을 넣어요. 마지막 [게시]는 직접 눌러요.
        </div>
      </div>

      {project && item?.path && ch && (
        <PostDialog project={project} file={item.path} seconds={item.duration || 0} channel={ch} lines={[]} tone={tone} onClose={() => { setCh(""); loadPosted(); }} />
      )}
    </div>
  );
}
