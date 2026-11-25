"use client";

/**
 * 최고관리자 — 문자·카톡 보내기 (2026-11-09 처음 · 2026-11-25 고객관리와 합침, docs/2026-11-25_crm_contacts_plan.md)
 *  문자는 이 화면 하나에서 보낸다.
 *  [보내기]   왼쪽 글 · 오른쪽 받는 사람 — "고객 명단"(crm, 보냄가능만 · 사람마다 링크) 또는 "공실뉴스 회원"(등급·가입일·만료 예정)
 *  [저장 문자] DB(crm_templates) — 어느 PC 에서나 · 찾기·고치기·지우기 · 쓴 횟수
 *  [보낸 문자·반응] message_logs + 고객 명단 캠페인의 누름·가입·쉬는중 · 다시 쓰기 · 저장
 *  광고 문자: 맨 앞 (광고)공실뉴스 · 끝에 수신거부 · 밤 9시~아침 8시 못 보냄 (서버가 붙이고 막는다)
 *  예약 발송은 아직 없다 (가짜로 성공을 보여 주지 않는다)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTheme } from "./types";
import {
  adminFindRecipients, adminSendMemberSms, adminGetMessageLogs, adminPreviewMessage,
  type AudienceMember, type AudienceTier, type MessageLog,
} from "@/app/actions/adminMessage";
import {
  adminCrmPreview, adminCrmCountTargets, adminCrmCountUnion, adminCrmSend, adminCrmStatsByLogs, adminCrmAddNumbers, adminCrmTestSend,
  adminCrmTemplates, adminCrmSaveTemplate, adminCrmDeleteTemplate, adminCrmTemplateUsed,
  type CrmFilter, type CrmTemplate, type CrmCampaign,
} from "@/app/actions/adminCrm";
import { NAVY, HANDOFF_KEY, byteLength, fmtDate, pct, makeUI, PhonePreview, type UI } from "./crm/crmUi";
import CrmSection from "./CrmSection";

type Tab = "send" | "templates" | "sent";
type Draft = { content: string; link: string; name: string; subject: string; isAd: boolean; source?: string };

const OLD_SAVED_KEY = "gs-admin-sms-saved"; // 예전 이 브라우저 저장 문자 → DB 로 한 번 옮긴다
const TIER_LABEL: Record<string, string> = { user: "일반회원", free: "부동산회원 (무료)", pro: "공실뉴스부동산 (유료)", biz: "비즈니스회원" };
const TIER_OPTIONS: { key: AudienceTier; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "free", label: "부동산회원 (무료)" },
  { key: "pro", label: "공실뉴스부동산 (유료)" },
  { key: "biz", label: "비즈니스회원" },
  { key: "user", label: "일반회원" },
];
/** 보낸 글에서 저절로 붙은 부분을 떼어 원래 쓴 글만 */
const bodyOf = (t: string | null) => (t || "")
  .replace(/^\(광고\)공실뉴스\n/, "")
  .replace(/\n?\[\*1\*\]/, "")
  .replace(/\n\n(무료수신거부|수신거부)[^\n]*$/, "");

export default function MarketingSection({ theme }: { theme: AdminTheme }) {
  const ui = useMemo(() => makeUI(theme), [theme]);
  const [tab, setTab] = useState<Tab>("send");
  const [draft, setDraft] = useState<Draft | null>(null);

  // 저장 문자 (보내기·저장 문자 탭 같이)
  const [tpls, setTpls] = useState<CrmTemplate[]>([]);
  const [tplState, setTplState] = useState<"loading" | "missing" | "done">("loading");
  const loadTpls = useCallback(async () => {
    const r = await adminCrmTemplates();
    if (!r.success) { setTplState("missing"); return; }
    // 예전 이 브라우저에만 저장했던 문자를 DB 로 한 번 옮긴다
    try {
      const old = JSON.parse(localStorage.getItem(OLD_SAVED_KEY) || "[]");
      if (Array.isArray(old) && old.length) {
        for (const s of old) if (s?.content) await adminCrmSaveTemplate({ title: s.title || "저장한 문자", content: s.content });
        localStorage.removeItem(OLD_SAVED_KEY);
        const again = await adminCrmTemplates();
        if (again.success) { setTpls(again.list); setTplState("done"); return; }
      }
    } catch {}
    setTpls(r.list); setTplState("done");
  }, []);
  useEffect(() => { void loadTpls(); }, [loadTpls]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "send", label: "보내기" },
    { key: "templates", label: `저장 문자${tpls.length ? ` (${tpls.length})` : ""}` },
    { key: "sent", label: "보낸 문자·반응" },
  ];

  return (
    <div style={{ padding: "20px 32px", height: "calc(100vh - 64px)", overflowY: "auto", background: ui.darkMode ? "#18191c" : "#f4f5f7" }}>
      <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${ui.border}`, paddingBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: ui.textPrimary, margin: 0 }}>문자 보내기</h1>
          <span style={{ fontSize: 12.5, color: ui.textSecondary }}>뿌리오로 실제 발송돼요 · 문자 요금은 뿌리오 잔액에서 나가요</span>
        </div>

        <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${ui.darkMode ? "#333" : "#e5e7eb"}` }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "10px 22px", fontSize: 14, fontWeight: 800, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit",
                color: tab === t.key ? NAVY : ui.textSecondary, borderBottom: tab === t.key ? `3px solid ${NAVY}` : "3px solid transparent", marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "send" && <SendTab ui={ui} theme={theme} tpls={tpls} tplState={tplState} reloadTpls={loadTpls} draft={draft} clearDraft={() => setDraft(null)} />}
        {tab === "templates" && <TemplatesTab ui={ui} tpls={tpls} tplState={tplState} reload={loadTpls}
          onUse={(t) => { setDraft({ content: t.content, link: t.link || "", name: t.title, subject: "", isAd: true }); setTab("send"); }} />}
        {tab === "sent" && <SentTab ui={ui} reloadTpls={loadTpls} onReuse={(d) => { setDraft(d); setTab("send"); }} />}
      </div>
    </div>
  );
}

/* ───────────────────────── 보내기 ─────────────────────────
   뿌리오 발송 화면처럼: 오른쪽 "받는사람" 칸에 묶음을 담는다 (2026-11-25 사장님)
   [주소록에서 불러오기] = 주소록 화면 그대로 뜨는 창 · [공실뉴스 회원 불러오기] · 직접입력(번호 붙여넣기)
   담은 묶음은 줄마다 ✕ · 겹치는 번호는 한 번만 · 수신거부·쉬는 중은 보낼 때 빠진다 */
type RItem = { key: string; kind: "crm" | "members"; label: string; count: number | null; filter?: CrmFilter; memberIds?: string[] };

function SendTab({ ui, theme, tpls, tplState, reloadTpls, draft, clearDraft }: {
  ui: UI; theme: AdminTheme; tpls: CrmTemplate[]; tplState: "loading" | "missing" | "done"; reloadTpls: () => Promise<void>; draft: Draft | null; clearDraft: () => void;
}) {
  const [name, setName] = useState("");
  const [isAdChoice, setIsAdChoice] = useState(true);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [usedTpl, setUsedTpl] = useState<number | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [preview, setPreview] = useState<{ text: string; type: "SMS" | "LMS"; noFree080?: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  // 받는사람
  const [items, setItems] = useState<RItem[]>([]);
  const [directText, setDirectText] = useState("");
  const [directBusy, setDirectBusy] = useState(false);
  const [excludeRecent, setExcludeRecent] = useState(true);
  const [limit, setLimit] = useState("");
  const [total, setTotal] = useState<number | null>(0);
  const [counting, setCounting] = useState(false);
  const [picker, setPicker] = useState<null | "crm" | "members">(null);

  const crmItems = items.filter((i) => i.kind === "crm");
  const memberIds = Array.from(new Set(items.flatMap((i) => i.memberIds || [])));
  const isAd = crmItems.length > 0 ? true : isAdChoice; // 주소록에 보내는 문자는 늘 광고
  const excludeSentDays = excludeRecent ? 14 : 0;

  const addItem = (it: Omit<RItem, "key">) => {
    const key = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setItems((cur) => [...cur, { ...it, key }]);
    setResult(null);
    if (it.kind === "crm" && it.filter) {
      void adminCrmCountTargets(it.filter).then((r) => setItems((cur) => cur.map((x) => (x.key === key ? { ...x, count: r.success ? r.count : x.count } : x))));
    }
  };

  // 주소록에서 넘겨받은 사람
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(HANDOFF_KEY);
      if (!v) return;
      sessionStorage.removeItem(HANDOFF_KEY);
      const h = JSON.parse(v);
      const filter: CrmFilter = h?.filter ? { ...h.filter, status: "" } : { ...h, status: "" };
      addItem({ kind: "crm", label: h?.label || "주소록에서 고른 사람", count: null, filter });
    } catch {}
  }, []);

  // 저장 문자·보낸 문자에서 넘어온 글
  useEffect(() => {
    if (!draft) return;
    setContent(draft.content); setLink(draft.link); setName(draft.name); setSubject(draft.subject); setIsAdChoice(draft.isAd);
    setUsedTpl(null); setResult(null); clearDraft();
  }, [draft, clearDraft]);

  // 실제로 나갈 글
  const crmFormat = crmItems.length > 0 || (isAd && memberIds.length === 0);
  useEffect(() => {
    if (!content.trim()) { setPreview(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      const p = crmFormat ? adminCrmPreview(content, link) : adminPreviewMessage(content, isAd);
      void p.then((x) => { if (alive) setPreview(x); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [content, link, isAd, crmFormat]);

  // 받는사람 전체 수 (겹치는 번호 한 번)
  const countKey = JSON.stringify({ f: crmItems.map((i) => i.filter), m: memberIds, d: excludeSentDays });
  useEffect(() => {
    const { f, m, d } = JSON.parse(countKey) as { f: CrmFilter[]; m: string[]; d: number };
    if (!f.length) { setTotal(m.length); setCounting(false); return; }
    let alive = true;
    setCounting(true);
    const t = setTimeout(() => {
      void adminCrmCountUnion(f, d, m).then((r) => { if (alive) { setTotal(r.success ? r.count + m.length : null); setCounting(false); } });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [countKey]);

  const n = total === null ? 0 : Math.min(total, Number(limit) > 0 ? Number(limit) : Infinity);
  const msgType = preview?.type || (byteLength(content) > 90 ? "LMS" : "SMS");
  const canSend = !sending && n > 0 && !!content.trim();

  const addDirect = async () => {
    if (!isAd) { alert("직접 넣은 번호는 광고 문자로만 보내요. 종류를 광고 문자로 바꿔 주세요."); return; }
    setDirectBusy(true);
    const r = await adminCrmAddNumbers(directText, "직접입력");
    setDirectBusy(false);
    if (!r.success) { alert(r.error); return; }
    addItem({ kind: "crm", label: `직접 넣은 번호 ${r.ids.length.toLocaleString()}개`, count: null, filter: { ids: r.ids } });
    setDirectText("");
    if (r.bad) alert(`휴대폰 번호가 아닌 ${r.bad}개는 뺐어요.`);
  };

  const send = async () => {
    if (!canSend) return;
    const ok = window.confirm(
      `[보내기 확인]\n\n${name ? `이름: ${name}\n` : ""}종류: ${isAd ? "광고 문자" : "안내 문자 (정보성)"} · ${msgType === "LMS" ? "장문" : "단문"}\n받는사람: ${items.map((i) => i.label).join(", ")}\n보낼 사람: ${n.toLocaleString()}명 (겹치는 번호·수신거부 빠짐)\n${link && crmItems.length ? `링크: ${link} (사람마다 다른 짧은 주소)\n` : ""}\n정말 보낼까요? 보낸 뒤에는 되돌릴 수 없어요.`
    );
    if (!ok) return;
    setSending(true); setResult(null);
    const msgs: string[] = [];
    let anyOk = false;
    const cap = Number(limit) > 0 ? Number(limit) : undefined;
    if (crmItems.length) {
      const r = await adminCrmSend({
        filters: crmItems.map((i) => i.filter!), content, subject: subject || undefined, campaignName: name, link, limit: cap,
        excludeSentDays, excludeMemberIds: memberIds, labels: crmItems.map((i) => i.label),
      });
      if (r.accepted > 0) { anyOk = true; msgs.push(`주소록 ${r.accepted.toLocaleString()}명에게 보냈어요${r.total > r.accepted ? ` (${(r.total - r.accepted).toLocaleString()}명 못 보냄)` : ""}.${r.warning ? ` ${r.warning}` : ""}`); }
      else msgs.push(r.error || "주소록 쪽을 보내지 못했어요.");
    }
    if (memberIds.length) {
      const r = await adminSendMemberSms({ memberIds, content, subject: subject || undefined, isAd });
      if (r.accepted > 0) { anyOk = true; msgs.push(`공실뉴스 회원 ${r.accepted.toLocaleString()}명에게 보냈어요${r.failed ? ` (${r.failed.toLocaleString()}명 못 보냄)` : ""}.${r.warning ? ` ${r.warning}` : ""}`); }
      else msgs.push(r.error || "공실뉴스 회원 쪽을 보내지 못했어요.");
    }
    setSending(false);
    if (anyOk && usedTpl) void adminCrmTemplateUsed(usedTpl).then(reloadTpls);
    setResult({ ok: anyOk, text: msgs.join(" ") + (anyOk ? " [보낸 문자·반응]에서 결과를 볼 수 있어요." : "") });
    if (anyOk) setItems([]);
  };

  const testSend = async () => {
    if (!content.trim()) { alert("내용을 써 주세요."); return; }
    setTesting(true);
    const r = await adminCrmTestSend({ to: testTo, content, subject: subject || undefined, link: crmItems.length ? link : "", isAd });
    setTesting(false);
    alert(r.success ? `${testTo} 로 테스트 문자를 보냈어요. 앞에 [테스트] 가 붙어요.` : r.error);
  };

  const saveTpl = async () => {
    if (!content.trim()) { alert("저장할 내용을 써 주세요."); return; }
    const title = window.prompt("저장할 이름", name || subject || content.trim().split("\n")[0].slice(0, 20));
    if (title === null) return;
    const r = await adminCrmSaveTemplate({ title, content, link });
    if (!r.success) { alert(r.error); return; }
    await reloadTpls();
    alert("저장했어요. [저장 문자]에서 고치거나 지울 수 있어요.");
  };

  const fullInput: React.CSSProperties = { ...ui.field, width: "100%", boxSizing: "border-box" };
  const boxTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: ui.textPrimary, marginBottom: 8 };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: 16, alignItems: "start" }}>
        {/* ── 왼쪽: 메시지 입력 ── */}
        <div style={{ ...ui.card, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: ui.textPrimary }}>메시지 입력</div>
          <div>
            <div style={ui.label}>이름 <span style={{ fontWeight: 500, color: ui.textSecondary }}>(보낸 문자·반응에 보여요)</span></div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 11월 사전모집 1차" style={fullInput} />
          </div>
          <div>
            <div style={ui.label}>종류</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={ui.chip(isAd)} onClick={() => setIsAdChoice(true)}>광고 문자</button>
              <button style={ui.chip(!isAd)} disabled={crmItems.length > 0} onClick={() => setIsAdChoice(false)}
                title={crmItems.length ? "주소록 사람에게는 광고 문자로만 보내요" : ""}>안내 문자</button>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: isAd ? "#9a3412" : NAVY, marginTop: 6 }}>
              {isAd ? "맨 앞 \"(광고)공실뉴스\", 끝에 수신거부가 저절로 붙어요. 밤 9시~아침 8시에는 못 보내요."
                : "공실뉴스 회원에게 꼭 알릴 내용(만료·공지·새 기능)만. 홍보·가입 권유는 광고 문자로."}
            </div>
          </div>
          <div>
            <div style={ui.label}>제목 <span style={{ fontWeight: 500, color: ui.textSecondary }}>(장문일 때만 보여요)</span></div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 2027 공실뉴스부동산 사전모집" style={fullInput} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ ...ui.label, marginBottom: 0 }}>내용</span>
              <span style={{ fontSize: 12, color: ui.textSecondary }}>{byteLength(preview?.text || content)} byte · {msgType === "LMS" ? "장문" : "단문"}</span>
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={9}
              placeholder={isAd ? "알릴 내용만 쓰세요. (광고) 표시와 수신거부는 저절로 붙어요." : "회원에게 알릴 내용을 쓰세요."}
              style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `1px solid ${ui.border}`, borderRadius: 6, background: ui.inputBg, color: ui.textPrimary, fontSize: 13.5, lineHeight: 1.6, fontFamily: "inherit", resize: "vertical" }} />
          </div>
          <div>
            <div style={ui.label}>링크 <span style={{ fontWeight: 500, color: ui.textSecondary }}>(선택 · 주소록 사람마다 다른 짧은 주소 → 누가 눌렀는지 남아요)</span></div>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://gongsilnews.com/newsrealty" style={fullInput} />
            <div style={{ fontSize: 11.5, color: ui.textSecondary, marginTop: 4 }}>내용에 {"{링크}"} 라고 쓰면 그 자리에, 안 쓰면 맨 끝에 들어가요.</div>
          </div>
          <div style={{ display: "flex", gap: 6, position: "relative" }}>
            <button style={ui.secBtn} onClick={() => setTplOpen((v) => !v)}>저장 문자 불러오기 ▾</button>
            <button style={ui.secBtn} onClick={() => void saveTpl()}>지금 글 저장</button>
            {tplOpen && (
              <div style={{ position: "absolute", top: 36, left: 0, zIndex: 20, width: 380, maxHeight: 320, overflowY: "auto", background: ui.cardBg, border: `1px solid ${ui.border}`, borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
                {tplState === "missing" && <div style={{ padding: 14, fontSize: 12.5, color: ui.textSecondary }}>저장 문자 표가 아직 없어요.</div>}
                {tplState === "done" && tpls.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: ui.textSecondary }}>저장한 문자가 없어요.</div>}
                {tpls.map((t) => (
                  <div key={t.id} onClick={() => { setContent(t.content); setLink(t.link || ""); if (!name) setName(t.title); setUsedTpl(t.id); setTplOpen(false); }}
                    style={{ padding: "10px 12px", borderBottom: `1px solid ${ui.border}`, cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ui.textPrimary }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: ui.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.content.replace(/\n/g, " ")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={ui.label}>받는 사람 휴대폰에 이렇게 보여요 {link ? <span style={{ fontWeight: 500, color: ui.textSecondary }}>(링크는 예시 주소)</span> : null}</div>
            {preview ? <PhonePreview text={preview.text} type={preview.type} ui={ui} />
              : <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: ui.textSecondary, border: `1px dashed ${ui.border}`, borderRadius: 8 }}>내용을 쓰면 여기에 보여요.</div>}
            {crmFormat && preview?.noFree080 && (
              <div style={{ fontSize: 12, color: "#9a3412", marginTop: 8, lineHeight: 1.5 }}>080 무료 수신거부 번호가 아직 없어 발신번호로 거부를 받게 돼 있어요. 뿌리오 [광고문자]에서 080 번호를 받으면 넣어 드릴게요.</div>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 수신번호 입력 · 받는사람 · 발송 ── */}
        <div style={{ ...ui.card, position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: ui.textPrimary }}>수신번호 입력</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={{ ...ui.secBtn, height: 42, fontSize: 13.5 }} disabled={!isAd} title={isAd ? "" : "안내 문자는 공실뉴스 회원에게만 보내요"} onClick={() => setPicker("crm")}>📒 주소록에서 불러오기</button>
            <button style={{ ...ui.secBtn, height: 42, fontSize: 13.5 }} onClick={() => setPicker("members")}>👥 공실뉴스 회원 불러오기</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)", gap: 10 }}>
            {/* 직접입력 */}
            <div style={{ border: `1px solid ${ui.border}`, borderRadius: 8, padding: 12, background: ui.darkMode ? "#202124" : "#f8fafc", display: "flex", flexDirection: "column" }}>
              <div style={boxTitle}>직접입력</div>
              <textarea value={directText} onChange={(e) => setDirectText(e.target.value)} rows={8}
                placeholder={"휴대폰번호 입력\n여러 개 붙여넣기 가능\n(한 줄에 하나씩)"}
                style={{ flex: 1, width: "100%", boxSizing: "border-box", padding: 10, border: `1px solid ${ui.border}`, borderRadius: 6, background: ui.inputBg, color: ui.textPrimary, fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }} />
              <button style={{ ...ui.secBtn, height: 36, marginTop: 8 }} disabled={directBusy || !directText.trim()} onClick={() => void addDirect()}>{directBusy ? "넣는 중…" : "번호추가 +"}</button>
            </div>

            {/* 받는사람 */}
            <div style={{ border: `1px solid ${ui.border}`, borderRadius: 8, display: "flex", flexDirection: "column", minHeight: 260 }}>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${ui.border}` }}>
                <span style={{ ...boxTitle, marginBottom: 0, flex: 1 }}>받는사람</span>
                <button style={{ ...ui.secBtn, height: 28 }} disabled={!items.length} onClick={() => setItems([])}>전체 제거</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", maxHeight: 260 }}>
                {items.length === 0 && (
                  <div style={{ padding: "40px 12px", textAlign: "center", fontSize: 12.5, color: ui.textSecondary, lineHeight: 1.7 }}>추가된 받는사람이 없어요.<br />주소록·회원에서 불러오거나 번호를 넣어 주세요.</div>
                )}
                {items.map((i) => (
                  <div key={i.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: `1px solid ${ui.border}`, fontSize: 13, color: ui.textPrimary }}>
                    <span>{i.kind === "crm" ? "📒" : "👥"}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={i.label}>{i.label}</span>
                    <b style={{ color: NAVY, whiteSpace: "nowrap" }}>{i.count === null ? "…" : i.count.toLocaleString()}</b>
                    <button title="빼기" onClick={() => setItems((cur) => cur.filter((x) => x.key !== i.key))} style={{ border: "none", background: "none", cursor: "pointer", color: ui.textSecondary, fontSize: 14 }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${ui.border}`, fontSize: 13.5, color: ui.textPrimary }}>
                전체 <b style={{ fontSize: 18, color: NAVY }}>{counting ? "…" : n.toLocaleString()}</b>명
                <div style={{ fontSize: 11.5, color: ui.textSecondary, marginTop: 2 }}>겹치는 번호는 한 번 · 수신거부한 사람만 빠져요</div>
              </div>
            </div>
          </div>

          {/* 발송 설정 */}
          <div style={{ borderTop: `1px solid ${ui.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: ui.textPrimary }}>발송 설정</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: ui.textPrimary, cursor: "pointer" }}>
              <input type="checkbox" checked={excludeRecent} onChange={(e) => setExcludeRecent(e.target.checked)} /> 최근 14일 안에 받은 사람 빼기
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: ui.textPrimary }}>
              <span>먼저</span>
              <input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} placeholder="전부" style={{ ...ui.field, width: 90 }} />
              <span>명만 보내기 <span style={{ color: ui.textSecondary }}>(시험 삼아 조금만)</span></span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="내 휴대폰 번호" style={{ ...ui.field, flex: 1, height: 40 }} />
              <button style={{ ...ui.secBtn, height: 40 }} disabled={testing || !testTo.trim() || !content.trim()} onClick={() => void testSend()}>{testing ? "보내는 중…" : "테스트 발송"}</button>
            </div>
            <button onClick={() => void send()} disabled={!canSend}
              style={{ width: "100%", height: 50, border: "none", borderRadius: 6, fontSize: 16, fontWeight: 900, fontFamily: "inherit", background: canSend ? NAVY : "#9aa6b8", color: "#fff", cursor: canSend ? "pointer" : "default" }}>
              {sending ? "보내는 중…" : `${n ? `${n.toLocaleString()}명에게 ` : ""}발송하기`}
            </button>
            {result && <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: result.ok ? "#16a34a" : "#dc2626" }}>{result.text}</div>}
          </div>
        </div>
      </div>

      {picker === "crm" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }} onClick={() => setPicker(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1400px, 100%)", height: "min(92vh, 1000px)", borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <CrmSection theme={theme} pick={{ onAdd: (it) => { addItem({ kind: "crm", label: it.label, count: null, filter: it.filter }); setPicker(null); }, onClose: () => setPicker(null) }} />
          </div>
        </div>
      )}
      {picker === "members" && (
        <MembersPicker ui={ui} isAd={isAd} onClose={() => setPicker(null)}
          onAdd={(label, ids) => { addItem({ kind: "members", label, count: ids.length, memberIds: ids }); setPicker(null); }} />
      )}
    </>
  );
}

/* 공실뉴스 회원 불러오기 — 등급·가입일·만료 예정 (광고면 수신 동의한 회원만) */
function MembersPicker({ ui, isAd, onClose, onAdd }: { ui: UI; isAd: boolean; onClose: () => void; onAdd: (label: string, ids: string[]) => void }) {
  const [tier, setTier] = useState<AudienceTier>("all");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [found, setFound] = useState<AudienceMember[] | null>(null);
  const [consentMissing, setConsentMissing] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [finding, setFinding] = useState(false);
  const [err, setErr] = useState("");
  const find = async () => {
    setFinding(true); setErr("");
    const r = await adminFindRecipients({ tier, joinedFrom: joinedFrom || undefined, joinedTo: joinedTo || undefined, expiringSoon, isAd });
    setFinding(false);
    if (!r.success) { setErr(r.error || "회원을 불러오지 못했어요."); return; }
    setFound(r.members); setConsentMissing(r.consentMissing); setChecked(new Set(r.members.map((m) => m.id)));
  };
  const all = !!found && found.length > 0 && found.every((m) => checked.has(m.id));
  const label = `공실뉴스 회원 · ${TIER_OPTIONS.find((o) => o.key === tier)?.label || "전체"}${expiringSoon ? " · 30일 안에 만료" : ""}${joinedFrom || joinedTo ? ` · 가입 ${joinedFrom || "…"}~${joinedTo || "…"}` : ""}`;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "50px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...ui.card, width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 17, color: ui.textPrimary, flex: 1 }}>공실뉴스 회원 불러오기</b>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: ui.textSecondary }}>✕</button>
        </div>
        <div style={ui.label}>등급</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TIER_OPTIONS.map((o) => <button key={o.key} onClick={() => setTier(o.key)} style={ui.chip(tier === o.key)}>{o.label}</button>)}
        </div>
        <div style={{ ...ui.label, marginTop: 14 }}>가입일</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="date" value={joinedFrom} onChange={(e) => setJoinedFrom(e.target.value)} style={ui.field} />
          <span style={{ color: ui.textSecondary }}>~</span>
          <input type="date" value={joinedTo} onChange={(e) => setJoinedTo(e.target.value)} style={ui.field} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: ui.textPrimary, cursor: "pointer" }}>
          <input type="checkbox" checked={expiringSoon} onChange={(e) => setExpiringSoon(e.target.checked)} /> 공실뉴스부동산 이용 기간이 30일 안에 끝나는 회원만
        </label>
        <div style={{ fontSize: 12, color: ui.textSecondary, marginTop: 6 }}>휴대폰 번호가 있는 회원만{isAd ? " · 광고 문자라 수신 동의한 회원만" : ""}</div>
        <button onClick={() => void find()} disabled={finding} style={{ ...ui.priBtn, width: "100%", height: 38, marginTop: 12 }}>{finding ? "찾는 중…" : "회원 찾기"}</button>
        {err && <div style={{ marginTop: 8, fontSize: 12.5, color: "#dc2626" }}>{err}</div>}
        {isAd && consentMissing && found && <div style={{ marginTop: 8, fontSize: 12.5, color: "#9a3412" }}>아직 회원 정보에 문자 수신 동의 칸이 없어요.</div>}
        {found && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: ui.textPrimary, marginBottom: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={all} onChange={() => setChecked(all ? new Set() : new Set(found.map((m) => m.id)))} disabled={!found.length} /> 모두 ({found.length.toLocaleString()}명)
            </label>
            <div style={{ border: `1px solid ${ui.border}`, borderRadius: 6, maxHeight: 280, overflowY: "auto" }}>
              {found.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: ui.textSecondary, textAlign: "center" }}>조건에 맞는 회원이 없어요.</div>}
              {found.map((m) => (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: `1px solid ${ui.border}`, fontSize: 13, color: ui.textPrimary, cursor: "pointer" }}>
                  <input type="checkbox" checked={checked.has(m.id)} onChange={() => setChecked((p) => { const s = new Set(p); if (s.has(m.id)) s.delete(m.id); else s.add(m.id); return s; })} />
                  <span style={{ flex: 1 }}>{m.name}</span>
                  <span style={{ fontSize: 11.5, color: ui.textSecondary }}>{TIER_LABEL[m.tier] || ""}</span>
                  <span style={{ fontSize: 12, color: ui.textSecondary, width: 56, textAlign: "right" }}>…{m.phoneTail}</span>
                </label>
              ))}
            </div>
            <button disabled={!checked.size} onClick={() => onAdd(`${label} ${checked.size.toLocaleString()}명`, Array.from(checked))}
              style={{ ...ui.priBtn, width: "100%", height: 42, marginTop: 10, fontSize: 14 }}>고른 {checked.size.toLocaleString()}명 담기 →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── 저장 문자 ───────────────────────── */
function TemplatesTab({ ui, tpls, tplState, reload, onUse }: { ui: UI; tpls: CrmTemplate[]; tplState: "loading" | "missing" | "done"; reload: () => Promise<void>; onUse: (t: CrmTemplate) => void }) {
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<{ id?: number; title: string; content: string; link: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = useMemo(() => { const s = q.trim(); return s ? tpls.filter((t) => t.title.includes(s) || t.content.includes(s)) : tpls; }, [tpls, q]);

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    const r = await adminCrmSaveTemplate(edit);
    setBusy(false);
    if (!r.success) { alert(r.error); return; }
    setEdit(null); await reload();
  };
  const del = async (t: CrmTemplate) => {
    if (!window.confirm(`"${t.title}" 저장 문자를 지울까요?`)) return;
    const r = await adminCrmDeleteTemplate(t.id);
    if (!r.success) { alert(r.error); return; }
    await reload();
  };
  const fullInput: React.CSSProperties = { ...ui.field, width: "100%", boxSizing: "border-box" };

  // 고치기 창 아래 휴대폰 미리보기 (보내기 화면과 같은 광고 문자 모양)
  const [preview, setPreview] = useState<{ text: string; type: "SMS" | "LMS"; noFree080?: boolean } | null>(null);
  const eContent = edit?.content ?? "", eLink = edit?.link ?? "";
  useEffect(() => {
    if (!eContent.trim()) { setPreview(null); return; }
    let alive = true;
    const t = setTimeout(() => { void adminCrmPreview(eContent, eLink).then((x) => { if (alive) setPreview(x); }); }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [eContent, eLink]);

  return (
    <div style={ui.card}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="저장 문자 찾기 (이름·내용)" style={{ ...ui.field, flex: 1 }} />
        <button style={ui.priBtn} onClick={() => setEdit({ title: "", content: "", link: "" })}>+ 새 저장 문자</button>
      </div>
      {tplState === "loading" && <div style={{ padding: 30, textAlign: "center", color: ui.textSecondary }}>불러오는 중…</div>}
      {tplState === "missing" && <div style={{ padding: 30, textAlign: "center", color: ui.textSecondary, lineHeight: 1.7 }}>저장 문자 표가 아직 없어요.<br />Supabase SQL Editor 에서 <b>supabase/migrations/20261125_crm.sql</b> 을 실행해 주세요.</div>}
      {tplState === "done" && shown.length === 0 && <div style={{ padding: 30, textAlign: "center", color: ui.textSecondary }}>{q ? "찾는 저장 문자가 없어요." : "저장한 문자가 없어요. 보내기 화면에서 [지금 글 저장]을 누르거나 위 [+ 새 저장 문자]로 만들 수 있어요."}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {shown.map((t) => (
          <div key={t.id} style={{ border: `1px solid ${ui.border}`, borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 8, background: ui.inputBg }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b style={{ fontSize: 14, color: ui.textPrimary }}>{t.title}</b>
              <span style={{ fontSize: 11.5, color: ui.textSecondary, whiteSpace: "nowrap" }}>{t.used_count ? `${t.used_count}번 보냄` : "아직 안 보냄"}</span>
            </div>
            <div style={{ fontSize: 12.5, color: ui.textSecondary, whiteSpace: "pre-wrap", lineHeight: 1.55, maxHeight: 120, overflow: "hidden" }}>{t.content}</div>
            {t.link && <div style={{ fontSize: 11.5, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔗 {t.link}</div>}
            <div style={{ fontSize: 11, color: ui.textSecondary }}>고친 날 {fmtDate(t.updated_at, false)}{t.last_used_at ? ` · 마지막 보냄 ${fmtDate(t.last_used_at, false)}` : ""}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
              <button style={{ ...ui.priBtn, flex: 1 }} onClick={() => onUse(t)}>이 글로 보내기</button>
              <button style={ui.secBtn} onClick={() => setEdit({ id: t.id, title: t.title, content: t.content, link: t.link || "" })}>고치기</button>
              <button style={ui.secBtn} onClick={() => void del(t)}>지우기</button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <div onClick={() => setEdit(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...ui.card, width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 12 }}>
            <b style={{ fontSize: 16, color: ui.textPrimary }}>{edit.id ? "저장 문자 고치기" : "새 저장 문자"}</b>
            <div><div style={ui.label}>이름</div><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="예: 사전모집 안내" style={fullInput} /></div>
            <div><div style={ui.label}>내용 <span style={{ fontWeight: 500, color: ui.textSecondary }}>({byteLength(edit.content)} byte)</span></div>
              <textarea value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} rows={9}
                style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `1px solid ${ui.border}`, borderRadius: 6, background: ui.inputBg, color: ui.textPrimary, fontSize: 13.5, lineHeight: 1.6, fontFamily: "inherit", resize: "vertical" }} /></div>
            <div><div style={ui.label}>링크 (선택)</div><input value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="https://" style={fullInput} /></div>
            <div>
              <div style={ui.label}>받는 사람 휴대폰에 이렇게 보여요 {edit.link ? <span style={{ fontWeight: 500, color: ui.textSecondary }}>(링크는 예시 주소)</span> : null}</div>
              {preview ? <PhonePreview text={preview.text} type={preview.type} ui={ui} />
                : <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: ui.textSecondary, border: `1px dashed ${ui.border}`, borderRadius: 8 }}>내용을 쓰면 여기에 보여요.</div>}
              {preview?.noFree080 && (
                <div style={{ fontSize: 12, color: "#9a3412", marginTop: 8, lineHeight: 1.5 }}>080 무료 수신거부 번호가 아직 없어 발신번호로 거부를 받게 돼 있어요. 뿌리오 [광고문자]에서 080 번호를 받으면 넣어 드릴게요.</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", position: "sticky", bottom: 0, background: ui.cardBg, paddingTop: 8 }}>
              <button style={ui.secBtn} onClick={() => setEdit(null)}>닫기</button>
              <button style={ui.priBtn} disabled={busy || !edit.content.trim()} onClick={() => void save()}>{busy ? "저장 중…" : "저장"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 보낸 문자·반응 ───────────────────────── */
function SentTab({ ui, onReuse, reloadTpls }: { ui: UI; onReuse: (d: Draft) => void; reloadTpls: () => Promise<void> }) {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [stats, setStats] = useState<Record<string, CrmCampaign>>({});
  const [state, setState] = useState<"loading" | "missing" | "error" | "done">("loading");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const r = await adminGetMessageLogs(100);
    if (!r.success) { if (r.missingTable) setState("missing"); else { setErr(r.error || ""); setState("error"); } return; }
    setLogs(r.logs);
    setStats(await adminCrmStatsByLogs(r.logs.map((l) => l.id)));
    setState("done");
  }, []);
  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => {
    const cs = Object.values(stats);
    return { sent: cs.reduce((a, c) => a + c.sent_count, 0), click: cs.reduce((a, c) => a + c.click_count, 0), signup: cs.reduce((a, c) => a + c.signup_count, 0) };
  }, [stats]);

  const saveAsTpl = async (l: MessageLog, c?: CrmCampaign) => {
    const title = window.prompt("저장할 이름", c?.name || l.subject || bodyOf(l.content).split("\n")[0].slice(0, 20));
    if (title === null) return;
    const r = await adminCrmSaveTemplate({ title, content: l.is_ad ? bodyOf(l.content) : l.content, link: c?.filter?.link || "" });
    if (!r.success) { alert(r.error); return; }
    await reloadTpls();
    alert("저장 문자에 넣었어요.");
  };
  const num: React.CSSProperties = { padding: "10px 6px", textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.keys(stats).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[["고객 명단에 보냄", totals.sent, ""], ["링크 누름", totals.click, pct(totals.click, totals.sent)], ["가입", totals.signup, pct(totals.signup, totals.sent)]].map(([k, v, p]) => (
            <div key={k as string} style={{ ...ui.card, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: ui.textSecondary, fontWeight: 700 }}>{k}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: NAVY, marginTop: 4 }}>{(v as number).toLocaleString()} <span style={{ fontSize: 12, color: ui.textSecondary, fontWeight: 600 }}>{p}</span></div>
            </div>
          ))}
        </div>
      )}
      <div style={ui.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: ui.textPrimary }}>보낸 문자 <span style={{ fontSize: 12, fontWeight: 500, color: ui.textSecondary }}>고객 명단은 보냄 → 누름 → 가입까지</span></div>
          <button style={ui.secBtn} onClick={() => void load()}>새로고침</button>
        </div>
        {state === "loading" && <div style={{ padding: 30, textAlign: "center", color: ui.textSecondary }}>불러오는 중…</div>}
        {state === "missing" && <div style={{ padding: 30, textAlign: "center", color: ui.textSecondary, lineHeight: 1.7 }}>보낸 기록 표가 아직 없어요.<br />Supabase SQL Editor 에서 <b>supabase/migrations/20261109_message_logs.sql</b> 을 실행해 주세요.</div>}
        {state === "error" && <div style={{ padding: 30, textAlign: "center", color: "#dc2626" }}>기록을 불러오지 못했어요. {err}</div>}
        {state === "done" && logs.length === 0 && <div style={{ padding: 30, textAlign: "center", color: ui.textSecondary }}>아직 보낸 문자가 없어요.</div>}
        {state === "done" && logs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ui.border}`, color: ui.textSecondary, textAlign: "left" }}>
                  <th style={{ padding: "8px 6px", width: 130 }}>보낸 때</th>
                  <th style={{ padding: "8px 6px", width: 92 }}>받는 곳</th>
                  <th style={{ padding: "8px 6px" }}>이름 · 내용</th>
                  <th style={{ ...num, padding: "8px 6px" }}>보냄</th>
                  <th style={{ ...num, padding: "8px 6px" }}>누름</th>
                  <th style={{ ...num, padding: "8px 6px" }}>가입</th>
                  <th style={{ ...num, padding: "8px 6px" }}>쉬는중</th>
                  <th style={{ padding: "8px 6px", width: 130 }} />
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const c = stats[l.id];
                  return (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${ui.border}`, color: ui.textPrimary, verticalAlign: "top" }}>
                      <td style={{ padding: "10px 6px", whiteSpace: "nowrap" }}>{fmtDate(l.created_at)}</td>
                      <td style={{ padding: "10px 6px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{c ? "고객 명단" : "공실뉴스 회원"}</div>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: l.is_ad ? "#fef3c7" : "#eef1f7", color: l.is_ad ? "#92400e" : NAVY }}>{l.is_ad ? "광고" : "안내"}</span>
                      </td>
                      <td style={{ padding: "10px 6px", maxWidth: 420 }}>
                        {c?.name || l.subject ? <b>{c?.name || l.subject}</b> : null}
                        <div onClick={() => setOpen(open === l.id ? null : l.id)} title="눌러서 전체 보기"
                          style={{ fontSize: 12, color: ui.textSecondary, cursor: "pointer", whiteSpace: open === l.id ? "pre-wrap" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.5, marginTop: 2 }}>
                          {open === l.id ? l.content : l.content.replace(/\n/g, " ")}
                        </div>
                      </td>
                      <td style={num}>{l.success_count.toLocaleString()}<div style={{ fontSize: 11, color: l.fail_count ? "#dc2626" : ui.textSecondary }}>{l.fail_count ? `못 보냄 ${l.fail_count.toLocaleString()}` : `/ ${l.recipient_count.toLocaleString()}`}</div></td>
                      <td style={num}>{c ? <>{c.click_count.toLocaleString()}<div style={{ fontSize: 11, color: ui.textSecondary }}>{pct(c.click_count, c.sent_count)}</div></> : <span style={{ color: ui.textSecondary }}>-</span>}</td>
                      <td style={num}>{c ? <>{c.signup_count.toLocaleString()}<div style={{ fontSize: 11, color: ui.textSecondary }}>{pct(c.signup_count, c.sent_count)}</div></> : <span style={{ color: ui.textSecondary }}>-</span>}</td>
                      <td style={num}>{c ? c.resting_count.toLocaleString() : <span style={{ color: ui.textSecondary }}>-</span>}</td>
                      <td style={{ padding: "10px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button style={{ ...ui.secBtn, height: 26, padding: "0 8px", fontSize: 11.5 }}
                          onClick={() => onReuse({ content: l.is_ad ? bodyOf(l.content) : l.content, link: c?.filter?.link || "", name: c ? `${c.name} (다시)` : "", subject: l.subject || "", isAd: l.is_ad, source: c ? "crm" : "members" })}>다시 쓰기</button>{" "}
                        <button style={{ ...ui.secBtn, height: 26, padding: "0 8px", fontSize: 11.5 }} onClick={() => void saveAsTpl(l, c)}>저장</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
