/* eslint-disable @typescript-eslint/no-explicit-any */
// 안드로이드 앱 [SNS 올리기] (2026-11-22 사장님: 공실을 앱에서 인스타그램·스레드·페이스북으로)
//  웹 뉴스·SNS자동화와 같은 계산(utils/studio-web/writer.ts)을 그대로 쓴다 → 같은 질문·같은 글 모양·같은 글 끝 출처
//  글은 회원 본인 ChatGPT·Gemini 가 쓴다 (서버 AI 안 씀 — 회원 글쓰기 원칙). 서버는 질문을 만들고 답을 나눌 뿐.
//  한도는 아직 두지 않는다 (2026-11-22 사장님: "한도는 일단 만들지 마봐")
//
//  POST { op: "prompt", vacancy, only? }   → { prompt, keys, vacancy }   vacancy = 앱이 만든 매물 정보 { vacancyId, title, priceText, fields, themes, infra, images }
//  POST { op: "parse", text, keys, vacancy } → { channels: { instagram|threads|facebook: { text, posts, media } }, miss }
import { NextRequest, NextResponse } from "next/server";
import { studioWebOp } from "@/utils/studio-web/writer";
import { vacancyListing } from "@/utils/vacancyListing";
import { myVacancy, no, whoAmI } from "../auth";

export const runtime = "nodejs";

const SITE = "https://www.gongsilnews.com";
const CHANNELS = ["instagram", "threads", "facebook"];
// 웹 처음 문체와 같게 (StudioSnsPanel defaultTone): 인스타 체크체 · 스레드 스레드감성 · 페북 동네소식체, 인스타 끝맺음 DM
const TONE = { instagram: "check", threads: "thread", facebook: "local", igEnd: "dm" };

/** 글 끝 출처 (웹 fetchListing 과 같은 모양) */
async function listingOf(id: string, uid: string) {
  const l = await vacancyListing(id, uid);
  if (!l) return null;
  return { detailUrl: `${SITE}${l.detailPath}`, location: l.location, propertyType: l.propertyType, tradeType: l.tradeType, owner: l.owner, capturedAt: new Date().toISOString() };
}

/** 앱이 보낸 매물 정보 — 필요한 칸만, 글의 주인공(중개사무소 이름)은 서버가 붙인다 (웹 analyze 와 같다) */
function cleanVacancy(v: any, listing: any) {
  const s = (x: unknown) => String(x ?? "").trim();
  const out: any = {
    vacancyId: s(v?.vacancyId),
    title: s(v?.title),
    priceText: s(v?.priceText),
    fields: (Array.isArray(v?.fields) ? v.fields : []).filter((f: any) => f && s(f.label) && s(f.value)).map((f: any) => ({ label: s(f.label), value: s(f.value) })),
    themes: (Array.isArray(v?.themes) ? v.themes : []).map(s).filter(Boolean),
    infra: s(v?.infra),
    images: (Array.isArray(v?.images) ? v.images : []).map(s).filter((u: string) => /^https?:\/\//.test(u)),
    url: listing?.detailUrl || "",
  };
  const o = listing?.owner;
  if (o?.type === "agency" && o.name) { out.office = o.name; if (o.homepage) out.homepage = o.homepage; }
  else if (o?.type === "general" && o.name) out.landlord = o.name;
  return out;
}

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const b = await req.json().catch(() => ({} as any));
  const id = String(b?.vacancy?.vacancyId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return no("공실 번호가 올바르지 않습니다.");
  if (!(await myVacancy(me.db, id, me.user.id, me.isAdmin))) return no("내가 등록한 공실만 올릴 수 있어요.", 403);

  try {
    const listing = await listingOf(id, me.user.id);
    if (!listing) return no("공실을 찾지 못했습니다.", 404);
    const vacancy = cleanVacancy(b.vacancy, listing);
    if (!vacancy.fields.length) return no("공실 정보를 읽지 못했습니다. 다시 열어 주세요.");

    if (b.op === "prompt") {
      const only = (Array.isArray(b.only) ? b.only : []).filter((c: unknown) => typeof c === "string" && CHANNELS.includes(c));
      const P = studioWebOp("allPrompt", { vacancy, want: { sns: true }, tone: TONE, snsOnly: only }) as any;
      return NextResponse.json({ success: true, prompt: P.prompt, keys: P.keys, vacancy });
    }

    if (b.op === "parse") {
      const r = studioWebOp("allParse", { text: String(b.text || ""), keys: ["sns"], vacancy }) as any;
      if (!r.ok) return no(r.error || "AI 답을 읽지 못했어요.");
      if (!r.sns) return no("답에 SNS 글이 없어요. 답이 다 나온 뒤 [복사]를 눌러 주세요.");
      const posts = r.sns as Record<string, any>;
      const pool = vacancy.images.map((u: string, i: number) => ({ id: u, kind: "photo", caption: `등록 사진 ${i + 1}` }));
      const picked = (studioWebOp("snsPick", { pool }) as any).media as Record<string, string[]>;
      const composed = (studioWebOp("snsCompose", { vacancy, posts, noun: "매물", listing }) as any).channels as Record<string, any>;
      const channels: Record<string, unknown> = {};
      for (const ch of CHANNELS) {
        const c = composed[ch]?.composed || { posts: [], text: "" };
        if (!posts[ch] || !String(c.text || "").trim()) continue;
        channels[ch] = { text: String(c.text || ""), posts: Array.isArray(c.posts) ? c.posts : [], media: picked?.[ch]?.length ? picked[ch] : vacancy.images };
      }
      return NextResponse.json({ success: true, channels, miss: r.miss || [] });
    }

    return no("알 수 없는 요청입니다.");
  } catch (e) {
    return no(e instanceof Error ? e.message : String(e));
  }
}
