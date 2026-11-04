"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { webAi, webAsk } from "./ai-ask";
import { api } from "./core";

/**
 * 웹 보고서·홍보지 AI 채우기 (2026-11-04 사장님: "그냥 웹에서 다 해결되도록 · 앱으로 가는 일은 없애")
 * 보고서(/marketing/report)·홍보지(/marketing/ai-detail)는 관리자 화면 안 틀(iframe)로 열린다.
 * 앱은 바깥 창의 gongsilStudio.marketing 을 쓰고, 웹은 바깥 창의 gongsilWebMarketing(이것)을 쓴다.
 *  - 질문은 서버(/api/studio/web marketingPrompt)가 앱과 같은 프롬프트로 만든다 — 프롬프트 파일은 화면에 안 보낸다
 *  - AI 는 회원 본인 계정 (새 탭에 붙여넣기 → 답 복사), 서버 AI 안 씀
 *  - 앱 쪽 이름(gongsilStudio)을 쓰지 않는다 — 쓰면 웹이 앱으로 오해된다
 * 같은 일을 하는 곳: studio-app/src/marketing-writer.js
 */
type Opts = { kind: string; vacancyId: string; fields: Record<string, unknown>; facts?: Record<string, unknown>; publicFacts?: string; request?: string };

const subs = new Set<(t: string) => void>();
const say = (t: string) => subs.forEach((f) => f(t));

async function fill(o: Opts) {
  if (!o.vacancyId || !/^[\w-]+$/.test(o.vacancyId)) throw new Error("공실을 먼저 골라 주세요.");
  if (/^local-/.test(o.vacancyId)) throw new Error("공실 없이 만든 보고서는 아직 웹에서 AI로 채울 수 없어요. 공실을 골라 만들어 주세요.");
  say("공실 정보를 읽는 중…");
  const d = await fetch(`/api/vacancy/detail?id=${encodeURIComponent(o.vacancyId)}`).then((r) => r.json()).catch(() => null);
  if (!d?.success || !d.data) throw new Error(d?.error || "공실 정보를 받지 못했습니다.");
  say("질문을 만드는 중…");
  const { prompt } = await api("marketingPrompt", { kind: o.kind, vacancy: d.data, fields: o.fields, publicFacts: o.publicFacts || "", request: o.request || "" });
  say(`${webAi().name} 답을 기다리는 중…`);
  const out = await webAsk(prompt, o.kind === "flyer" ? "홍보지 글을 쓰고 있습니다" : "매물보고서 글을 쓰고 있습니다", async (text) => {
    const x = await api("marketingParse", { text, fields: o.fields });
    if (!x.ok) throw new Error(x.error);
    return x.fields as Record<string, any>;
  });
  say("받은 글을 칸에 맞추는 중…");
  return out;
}

/** 관리자 화면(바깥 창)에 한 번 걸어 둔다 — 앱이면 걸지 않는다 */
export function installWebMarketing() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.gongsilStudio || w.gongsilWebMarketing) return;
  w.gongsilWebMarketing = {
    fill,
    onProgress: (fn: (t: string) => void) => { subs.add(fn); return () => { subs.delete(fn); }; },
  };
}
