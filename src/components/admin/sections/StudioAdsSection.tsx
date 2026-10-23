"use client";

// 최고관리자 — 스튜디오 광고 (2026-10-22 회의 · docs/2026-10-22_studio_wait_ads_plan.md)
//  회원이 AI·영상 만들기를 기다리는 동안 보여 줄 유튜브 영상. 광고주 · 심사 · 켜기/끄기 · 숫자
import React, { useEffect, useState } from "react";
import type { AdminTheme } from "./types";
import { deleteStudioAd, listStudioAds, lookupYoutube, saveAdvertiser, saveStudioAd, setStudioAdStatus, type AdStatus, type Advertiser, type StudioAd } from "@/app/actions/studioAds";

const PLACES: { id: string; name: string }[] = [
  { id: "ai", name: "AI 덮개 (글·대본 쓰기)" },
  { id: "export", name: "영상 만들기·내보내기 진행 화면" },
  { id: "survey", name: "AI 전수조사" },
];
const STATUS: Record<AdStatus, { name: string; color: string }> = {
  draft: { name: "작성 중", color: "#94a3b8" },
  review: { name: "검토 대기", color: "#f59e0b" },
  approved: { name: "내보내는 중", color: "#16a34a" },
  paused: { name: "멈춤", color: "#64748b" },
  ended: { name: "끝남", color: "#475569" },
};
type Draft = Partial<StudioAd> & { url?: string };
const emptyAd = (adv?: number): Draft => ({ url: "", title: "", link_url: "", places: ["ai", "export", "survey"], weight: 1, advertiser_id: adv });
const day = (s?: string | null) => (s ? s.slice(0, 10) : "");

export default function StudioAdsSection({ theme }: { theme: AdminTheme }) {
  const [ads, setAds] = useState<StudioAd[] | null>(null);
  const [advs, setAdvs] = useState<Advertiser[]>([]);
  const [missing, setMissing] = useState(false);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [advEdit, setAdvEdit] = useState<Partial<Advertiser> | null>(null);
  const [preview, setPreview] = useState("");
  const load = () =>
    listStudioAds().then((r) => {
      if (!r.success) return setMsg(r.error || "불러오지 못했습니다.");
      setMissing(Boolean(r.missing));
      setAds(r.ads || []);
      setAdvs(r.advertisers || []);
    });
  useEffect(() => { load(); }, []);

  const lookup = async (url: string) => {
    if (!edit) return;
    const r = await lookupYoutube(url);
    if (!r.success) return setMsg(r.error || "");
    setEdit({ ...edit, url, youtube_id: r.id, title: edit.title || r.title || "" });
    setPreview(r.id || "");
  };
  const save = async () => {
    if (!edit) return;
    const r = await saveStudioAd(edit);
    setMsg(r.success ? (edit.id ? "고쳤어요" : "광고를 넣었어요 — [승인]을 누르면 회원 화면에 나가요") : r.error || "실패했습니다.");
    if (r.success) { setEdit(null); setPreview(""); load(); }
  };
  const status = async (id: number, s: AdStatus) => {
    const r = await setStudioAdStatus(id, s);
    setMsg(r.success ? `${STATUS[s].name}(으)로 바꿨어요` : r.error || "실패했습니다.");
    load();
  };
  const del = async (a: StudioAd) => {
    if (!window.confirm(`"${a.title}" 광고를 지울까요? 숫자 기록도 함께 지워져요.`)) return;
    const r = await deleteStudioAd(a.id);
    setMsg(r.success ? "지웠어요" : r.error || "실패했습니다.");
    load();
  };
  const saveAdv = async () => {
    if (!advEdit) return;
    const r = await saveAdvertiser(advEdit);
    setMsg(r.success ? "광고주를 저장했어요" : r.error || "실패했습니다.");
    if (r.success) { setAdvEdit(null); load(); }
  };

  const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: `1px solid ${theme.border}`, fontSize: 13.5, color: theme.textPrimary, verticalAlign: "middle" };
  const head: React.CSSProperties = { ...cell, fontWeight: 700, color: theme.textSecondary, fontSize: 12.5, background: theme.bg };
  const btn = (bg: string): React.CSSProperties => ({ padding: "6px 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: bg, color: bg === "transparent" ? theme.textPrimary : "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 6, whiteSpace: "nowrap" });
  const input: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.textPrimary, fontSize: 14, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
  const lab: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 700, color: theme.textSecondary };
  const advName = (id: number) => advs.find((a) => a.id === id)?.name || "-";

  return (
    <div style={{ flex: 1, margin: 16, marginBottom: 0, padding: "22px 26px", overflowY: "auto", background: theme.cardBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: theme.textPrimary, flex: 1 }}>스튜디오 광고</h2>
        <button style={btn("transparent")} onClick={() => setAdvEdit({ name: "" })} disabled={missing}>+ 광고주</button>
        <button style={btn("#1a3a6b")} onClick={() => { setEdit(emptyAd(advs.find((a) => a.is_house)?.id)); setPreview(""); }} disabled={missing}>+ 광고 넣기</button>
      </div>
      <p style={{ margin: "8px 0 18px", fontSize: 14, color: theme.textSecondary, lineHeight: 1.7 }}>
        회원이 스튜디오에서 AI·영상 만들기를 기다리는 동안 이 유튜브 영상이 나옵니다 (모든 회원 · 소리 끈 채 자동 재생). <b style={{ color: theme.textPrimary }}>[승인]</b>한 광고만 나가요.<br />
        숫자는 노출·시청 초·클릭만 모으고, 어느 회원이 봤는지는 남기지 않습니다. 영상 아래에는 &quot;AD&quot; 표시만 붙어요.
      </p>
      {missing && (
        <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #f59e0b", background: "rgba(245,158,11,0.1)", color: theme.textPrimary, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
          아직 광고 표가 없어요. Supabase › SQL Editor 에서 <code>supabase/migrations/20261022_studio_ads.sql</code> 을 실행한 뒤 새로 고쳐 주세요.
        </div>
      )}
      {msg && <div style={{ fontSize: 13.5, color: "#2563eb", marginBottom: 12 }}>{msg}</div>}

      {/* 광고 넣기·고치기 */}
      {edit && (
        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={lab}>유튜브 영상 주소
              <input style={input} value={edit.url ?? (edit.youtube_id ? `https://youtu.be/${edit.youtube_id}` : "")} placeholder="https://www.youtube.com/watch?v=… 또는 https://youtu.be/…"
                onChange={(e) => setEdit({ ...edit, url: e.target.value })} onBlur={(e) => e.target.value && void lookup(e.target.value)} />
            </label>
            <label style={lab}>광고 이름 (관리용 · 화면에 안 나감)
              <input style={input} value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </label>
            <label style={lab}>광고주
              <select style={input} value={edit.advertiser_id || ""} onChange={(e) => setEdit({ ...edit, advertiser_id: Number(e.target.value) || undefined })}>
                <option value="">광고주 고르기</option>
                {advs.map((a) => <option key={a.id} value={a.id}>{a.name}{a.is_house ? " (자체)" : ""}</option>)}
              </select>
            </label>
            <label style={lab}>광고주 링크 — 회원이 영상이나 [광고주 사이트 열기 ↗]를 누르면 새 창으로 열려요 (비우면 단추 없음)
              <input style={input} value={edit.link_url || ""} placeholder="https://…" onChange={(e) => setEdit({ ...edit, link_url: e.target.value })} />
            </label>
            <div style={lab}>보여 줄 자리
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontWeight: 500, color: theme.textPrimary }}>
                {PLACES.map((p) => (
                  <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                    <input type="checkbox" checked={(edit.places || []).includes(p.id)} onChange={(e) => setEdit({ ...edit, places: e.target.checked ? [...(edit.places || []), p.id] : (edit.places || []).filter((x) => x !== p.id) })} />{p.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <label style={lab}>시작일<input type="date" style={input} value={day(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: e.target.value ? `${e.target.value}T00:00:00+09:00` : null })} /></label>
              <label style={lab}>끝일<input type="date" style={input} value={day(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: e.target.value ? `${e.target.value}T23:59:59+09:00` : null })} /></label>
              <label style={lab}>목표 노출 수<input type="number" min={0} style={input} value={edit.max_views ?? ""} placeholder="없음" onChange={(e) => setEdit({ ...edit, max_views: e.target.value ? Number(e.target.value) : null })} /></label>
              <label style={lab}>하루 최대<input type="number" min={0} style={input} value={edit.daily_cap ?? ""} placeholder="없음" onChange={(e) => setEdit({ ...edit, daily_cap: e.target.value ? Number(e.target.value) : null })} /></label>
            </div>
            <label style={lab}>비중 (1~100 · 여러 광고 중 자주 나오는 정도)
              <input type="number" min={1} max={100} style={{ ...input, width: 120 }} value={edit.weight ?? 1} onChange={(e) => setEdit({ ...edit, weight: Number(e.target.value) || 1 })} />
            </label>
            <label style={lab}>메모 (계약 금액·조건 등)
              <textarea style={{ ...input, minHeight: 60 }} value={edit.memo || ""} onChange={(e) => setEdit({ ...edit, memo: e.target.value })} />
            </label>
            <div>
              <button style={btn("#1a3a6b")} onClick={() => void save()}>{edit.id ? "고친 것 저장" : "광고 넣기 (검토 대기로)"}</button>
              <button style={btn("transparent")} onClick={() => { setEdit(null); setPreview(""); }}>닫기</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSecondary, marginBottom: 6 }}>미리보기 (회원 화면처럼)</div>
            <div style={{ aspectRatio: "16 / 9", background: "#000", borderRadius: 8, overflow: "hidden" }}>
              {(preview || edit.youtube_id) ? (
                <iframe title="미리보기" src={`https://www.youtube-nocookie.com/embed/${preview || edit.youtube_id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`} allow="autoplay; encrypted-media" style={{ width: "100%", height: "100%", border: 0 }} />
              ) : <div style={{ color: "#94a3b8", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>주소를 넣으면 여기 나와요</div>}
            </div>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 6 }}>
              AD{edit.link_url ? " · [광고주 사이트 열기 ↗]" : ""}
            </div>
          </div>
        </div>
      )}

      {/* 광고주 넣기·고치기 */}
      {advEdit && (
        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <label style={lab}>광고주 이름 (화면에 나감)<input style={input} value={advEdit.name || ""} onChange={(e) => setAdvEdit({ ...advEdit, name: e.target.value })} /></label>
          <label style={lab}>사업자등록번호<input style={input} value={advEdit.biz_no || ""} onChange={(e) => setAdvEdit({ ...advEdit, biz_no: e.target.value })} /></label>
          <label style={lab}>담당자<input style={input} value={advEdit.contact_name || ""} onChange={(e) => setAdvEdit({ ...advEdit, contact_name: e.target.value })} /></label>
          <label style={lab}>전화<input style={input} value={advEdit.contact_phone || ""} onChange={(e) => setAdvEdit({ ...advEdit, contact_phone: e.target.value })} /></label>
          <label style={lab}>이메일<input style={input} value={advEdit.contact_email || ""} onChange={(e) => setAdvEdit({ ...advEdit, contact_email: e.target.value })} /></label>
          <label style={lab}>메모<input style={input} value={advEdit.memo || ""} onChange={(e) => setAdvEdit({ ...advEdit, memo: e.target.value })} /></label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button style={btn("#1a3a6b")} onClick={() => void saveAdv()}>광고주 저장</button>
            <button style={btn("transparent")} onClick={() => setAdvEdit(null)}>닫기</button>
          </div>
        </div>
      )}

      {/* 광고 목록 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["영상", "광고 · 광고주", "자리", "기간", "상태", "노출 (오늘)", "평균 시청", "클릭", ""].map((h) => <th key={h} style={{ ...head, textAlign: "left" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {ads === null && <tr><td style={cell} colSpan={9}>불러오는 중…</td></tr>}
          {ads && !ads.length && !missing && <tr><td style={{ ...cell, color: theme.textSecondary }} colSpan={9}>아직 광고가 없어요. [+ 광고 넣기]로 유튜브 영상을 넣어 주세요.</td></tr>}
          {(ads || []).map((a) => (
            <tr key={a.id}>
              <td style={cell}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${a.youtube_id}/mqdefault.jpg`} alt="" style={{ width: 120, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 4, display: "block" }} />
              </td>
              <td style={cell}><b>{a.title}</b><div style={{ fontSize: 12, color: theme.textSecondary }}>{advName(a.advertiser_id)} · 비중 {a.weight}</div></td>
              <td style={{ ...cell, fontSize: 12.5 }}>{a.places.map((p) => PLACES.find((x) => x.id === p)?.name.replace(/ \(.*\)/, "") || p).join(", ")}</td>
              <td style={{ ...cell, fontSize: 12.5 }}>{day(a.starts_at) || "바로"} ~ {day(a.ends_at) || "끝 없음"}{a.max_views ? <div>목표 {a.max_views.toLocaleString()}회</div> : null}</td>
              <td style={cell}><span style={{ padding: "3px 8px", borderRadius: 10, background: STATUS[a.status].color, color: "#fff", fontSize: 12, fontWeight: 700 }}>{STATUS[a.status].name}</span></td>
              <td style={cell}>{(a.stats?.views || 0).toLocaleString()} <span style={{ color: theme.textSecondary }}>({a.stats?.today || 0})</span></td>
              <td style={cell}>{a.stats?.watchAvg ? `${a.stats.watchAvg}초` : "-"}</td>
              <td style={cell}>{(a.stats?.clicks || 0).toLocaleString()}{a.stats?.views ? <span style={{ color: theme.textSecondary }}> ({((a.stats.clicks / a.stats.views) * 100).toFixed(1)}%)</span> : null}</td>
              <td style={{ ...cell, whiteSpace: "nowrap" }}>
                {a.status !== "approved" && <button style={btn("#16a34a")} onClick={() => void status(a.id, "approved")}>승인</button>}
                {a.status === "approved" && <button style={btn("#64748b")} onClick={() => void status(a.id, "paused")}>멈춤</button>}
                <button style={btn("transparent")} onClick={() => { setEdit({ ...a }); setPreview(a.youtube_id); }}>고치기</button>
                <button style={btn("#dc2626")} onClick={() => void del(a)}>지우기</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {advs.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, margin: "0 0 8px" }}>광고주</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {advs.map((a) => (
              <button key={a.id} style={btn("transparent")} onClick={() => setAdvEdit({ ...a })} title={[a.contact_name, a.contact_phone, a.biz_no].filter(Boolean).join(" · ")}>
                {a.name}{a.is_house ? " (자체)" : ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
