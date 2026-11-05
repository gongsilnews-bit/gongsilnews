import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExtensionMember, trialMonth, type ExtensionMember } from "@/utils/extensionMember";
import { RANK_KO } from "@/lib/studio-video/elevenRank";
import { koReadNumbers } from "@/lib/studio-video/koNumber";

/**
 * 웹 동영상studio AI 목소리 — 공실뉴스 일레븐랩스 계정 하나를 모든 회원이 (2026-11-05 사장님: "회원 모두 내 계정을 사용할 수 있게 · 포인트로")
 *  키는 서버에만 (ELEVENLABS_API_KEY). 회원은 쓴 만큼 포인트가 빠진다 — 1자 1P (point_settings.ai_voice_per_100, 없으면 100)
 *  공실뉴스부동산은 매달 목소리 전용 5,000P 를 먼저 쓴다
 *  GET                       → { voices, rate, balance }  (공실뉴스 계정의 성우, 한국어 먼저)
 *  POST { text, voiceId, emotion?, prev?, next? } → mp3 (포인트를 먼저 확인하고, 만들어진 뒤에만 뺀다)
 *  POST { action: "popular", n: 50 } (최고관리자) → 보이스 라이브러리 한국어 인기 성우를 계정에 넣기
 *  GET ?ranked=1             → { ranked } 한국어 인기 순위 50 (앱과 같은 목록 · 견본 소리 · 계정에 있는지)
 *  POST { action: "ranked", ids? } (최고관리자) → 순위 성우 중 계정에 없는 것 넣기
 */
export const maxDuration = 60;
const API = "https://api.elevenlabs.io";
const MODEL = "eleven_multilingual_v2";
const STYLE: Record<string, { stability: number; similarity_boost: number; style: number }> = {
  normal: { stability: 0.5, similarity_boost: 0.75, style: 0 },
  calm: { stability: 0.75, similarity_boost: 0.75, style: 0 },
  lively: { stability: 0.3, similarity_boost: 0.75, style: 0.35 },
};
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const KEY = () => process.env.ELEVENLABS_API_KEY || "";
const NO_KEY = "AI 목소리 준비 중이에요 (공실뉴스 일레븐랩스 키 등록 전).";

function errOf(status: number, body: any) {
  const d = body && body.detail;
  const msg = (d && (d.message || (typeof d === "string" ? d : ""))) || (body && body.message) || "";
  if (status === 402 || /quota|credits/i.test(msg)) return "AI 목소리 크레딧이 모자라요. 공실뉴스에 문의해 주세요.";
  if (status === 429) return "AI 목소리 요청이 몰렸어요. 잠시 뒤 다시 해 주세요.";
  return `AI 목소리 오류 (${status})${msg ? `: ${msg}` : ""}`;
}
// 1자 = 1P (2026-11-05 사장님: "5천자 = 5천포인트") — 100자당 100P. 관리자 point_settings.ai_voice_per_100 이 있으면 그 값
async function rate() {
  const { data } = await db().from("point_settings").select("value").eq("key", "ai_voice_per_100").maybeSingle();
  const v = Number(data?.value);
  return Number.isFinite(v) && v >= 0 ? v : 100;
}
/** 공실뉴스부동산 회원 — 매달 목소리 전용 5,000P (2026-11-05 사장님). 목소리에만 쓰이고 보내기·다른 곳엔 못 쓴다 */
const VOICE_FREE = 5000;
const isPaid = (m: ExtensionMember) => m.canBlog; // admin · news_premium · study_premium
/** 이번 달(한국 시간) 쓴 목소리 전용 포인트 — 기록 이유 "… · 목소리 전용 NP" 를 더한다 */
async function freeUsed(memberId: string) {
  const ym = trialMonth();
  const start = new Date(`${ym}-01T00:00:00+09:00`).toISOString();
  const { data } = await db().from("point_transactions").select("reason").eq("member_id", memberId).gte("created_at", start).like("reason", "AI 목소리%목소리 전용%");
  return (data || []).reduce((t, r) => t + (Number(/목소리 전용 (\d+)P/.exec(String(r.reason))?.[1]) || 0), 0);
}
async function freeOf(m: ExtensionMember) {
  if (!isPaid(m)) return null;
  const used = await freeUsed(m.id);
  return { limit: VOICE_FREE, used, left: Math.max(0, VOICE_FREE - used) };
}
// 글자 수만큼 (100자당 r → 1자당 r/100, 올림) — 문장마다 100자 값을 다 받으면 짧은 문장이 많은 쇼츠가 너무 비싸다 (2026-11-05 사장님: "목소리가 엄청 들어갔네")
const costOf = (text: string, r: number) => (r <= 0 ? 0 : Math.max(1, Math.ceil((text.length * r) / 100)));

async function voiceList(k: string, fresh = false) {
  const out: any[] = [];
  let token = "";
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${API}/v2/voices?page_size=100${token ? `&next_page_token=${encodeURIComponent(token)}` : ""}`, { headers: { "xi-api-key": k }, ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 600 } }) });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(errOf(r.status, body));
    for (const v of body?.voices || []) {
      const lb = v.labels || {};
      const langs = (v.verified_languages || []).map((x: any) => x.language).filter(Boolean);
      out.push({ id: `el_${v.voice_id}`, name: String(v.name || v.voice_id), gender: lb.gender || "", age: lb.age || "", useCases: [lb.use_case, lb.descriptive, lb.accent].filter(Boolean), preview: v.preview_url || "", emotions: [], type: v.category || "", korean: langs.includes("ko") || /korean/i.test(`${lb.language || ""} ${lb.accent || ""}`) });
    }
    if (!body?.has_more || !body?.next_page_token) break;
    token = body.next_page_token;
  }
  return out.sort((a, b) => Number(b.korean) - Number(a.korean));
}

/** 순위 성우를 보이스 라이브러리에서 찾기 (견본 소리·나이·주인) — 하루 저장 */
type LibInfo = { owner: string; preview: string; age: string };
let rankLib: { at: number; lib: Record<string, LibInfo> } | null = null;
async function rankLookup(k: string) {
  if (rankLib && Date.now() - rankLib.at < 24 * 3600e3) return rankLib.lib;
  const lib: Record<string, LibInfo> = {};
  const want = new Set(RANK_KO.map((x) => x[0]));
  const info = (v: any): LibInfo => ({ owner: v.public_owner_id || "", preview: v.preview_url || "", age: v.age || "" });
  for (let page = 0; page < 4; page++) {
    const r = await fetch(`${API}/v1/shared-voices?page_size=100&page=${page}&language=ko&sort=usage_character_count_1y`, { headers: { "xi-api-key": k }, next: { revalidate: 86400 } });
    const b = await r.json().catch(() => null);
    if (!r.ok) break;
    for (const v of b?.voices || []) if (want.has(v.voice_id)) lib[v.voice_id] = info(v);
    if (!b?.has_more || Object.keys(lib).length >= want.size) break;
  }
  // 못 찾은 것은 이름으로 한 번 더
  await Promise.all(RANK_KO.filter(([id]) => !lib[id]).map(async ([id, name]) => {
    const r = await fetch(`${API}/v1/shared-voices?page_size=30&search=${encodeURIComponent(name)}`, { headers: { "xi-api-key": k }, next: { revalidate: 86400 } }).catch(() => null);
    const b = r && r.ok ? await r.json().catch(() => null) : null;
    const v = (b?.voices || []).find((x: any) => x.voice_id === id);
    if (v) lib[id] = info(v);
  }));
  rankLib = { at: Date.now(), lib };
  return lib;
}
async function rankedList(k: string, mine: any[]) {
  const lib = await rankLookup(k);
  const have = new Map(mine.map((v) => [String(v.id).replace(/^el_/, ""), v]));
  return RANK_KO.map(([id, name, gender], i) => {
    const m = have.get(id);
    return { rank: i + 1, id: `el_${id}`, name, gender, age: lib[id]?.age || m?.age || "", preview: lib[id]?.preview || m?.preview || "", mine: Boolean(m), found: Boolean(lib[id]) };
  });
}

export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const k = KEY();
  if (!k) return NextResponse.json({ success: false, error: NO_KEY, needKey: true });
  try {
    if (req.nextUrl.searchParams.get("ranked")) {
      const mine = await voiceList(k, Boolean(req.nextUrl.searchParams.get("fresh")));
      return NextResponse.json({ success: true, ranked: await rankedList(k, mine) }, { headers: { "Cache-Control": "no-store" } });
    }
    const [voices, r, bal, free] = await Promise.all([voiceList(k, Boolean(req.nextUrl.searchParams.get("fresh"))), rate(), db().from("members").select("point_balance, role").eq("id", member.id).maybeSingle(), freeOf(member)]);
    return NextResponse.json({ success: true, voices, rate: r, balance: Number(bal.data?.point_balance) || 0, admin: bal.data?.role === "ADMIN", free }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const k = KEY();
  if (!k) return NextResponse.json({ success: false, error: NO_KEY }, { status: 503 });
  const body = await req.json().catch(() => ({}));

  // 최고관리자 — 한국어 인기 성우 n명을 공실뉴스 계정에 넣기
  if (body.action === "popular") {
    const { data: me } = await db().from("members").select("role").eq("id", member.id).maybeSingle();
    if (me?.role !== "ADMIN") return NextResponse.json({ success: false, error: "최고관리자만 할 수 있어요." }, { status: 403 });
    const n = Math.max(1, Math.min(60, Number(body.n) || 50));
    const mine = await voiceList(k, true).catch(() => []);
    const have = new Set(mine.map((v) => String(v.id).replace(/^el_/, "")));
    const haveName = new Set(mine.map((v) => String(v.name).toLowerCase()));
    const picks: any[] = [];
    for (let page = 0; page < 6 && picks.length < n; page++) {
      const r = await fetch(`${API}/v1/shared-voices?page_size=100&page=${page}&language=ko&sort=usage_character_count_1y`, { headers: { "xi-api-key": k } });
      const b = await r.json().catch(() => null);
      if (!r.ok) return NextResponse.json({ success: false, error: r.status === 401 || r.status === 403 ? "일레븐랩스 키에 Voices 권한(읽기·쓰기)을 켜 주세요." : errOf(r.status, b) });
      for (const v of b?.voices || []) {
        if (picks.length >= n) break;
        if (have.has(v.voice_id) || haveName.has(String(v.name).toLowerCase())) continue;
        picks.push(v);
      }
      if (!b?.has_more) break;
    }
    let added = 0, stop = "";
    for (const v of picks) {
      const r = await fetch(`${API}/v1/voices/add/${encodeURIComponent(v.public_owner_id)}/${encodeURIComponent(v.voice_id)}`, { method: "POST", headers: { "xi-api-key": k, "Content-Type": "application/json" }, body: JSON.stringify({ new_name: v.name }) });
      if (!r.ok) {
        const msg = JSON.stringify(await r.json().catch(() => ({})));
        stop = /limit|maximum|slots|quota/i.test(msg) ? "일레븐랩스 요금제의 목소리 자리가 다 찼어요. 안 쓰는 목소리를 지우거나 요금제를 올리면 더 넣을 수 있어요." : r.status === 401 || r.status === 403 ? "일레븐랩스 키에 Voices 쓰기 권한을 켜 주세요." : `추가 멈춤 (${r.status})`;
        break;
      }
      added++;
    }
    return NextResponse.json({ success: true, added, found: picks.length, stop });
  }

  // 최고관리자 — 순위 성우 중 계정에 없는 것 넣기 (ids 를 주면 그것만)
  if (body.action === "ranked") {
    const { data: me } = await db().from("members").select("role").eq("id", member.id).maybeSingle();
    if (me?.role !== "ADMIN") return NextResponse.json({ success: false, error: "최고관리자만 할 수 있어요." }, { status: 403 });
    const ids: string[] | null = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)) : null;
    const list = await rankedList(k, await voiceList(k, true).catch(() => []));
    const lib = await rankLookup(k);
    const todo = list.filter((x) => !x.mine && (!ids || ids.includes(x.id)));
    let added = 0, stop = "";
    for (const x of todo) {
      const vid = x.id.replace(/^el_/, ""), L = lib[vid];
      if (!L?.owner) continue;
      const r = await fetch(`${API}/v1/voices/add/${encodeURIComponent(L.owner)}/${encodeURIComponent(vid)}`, { method: "POST", headers: { "xi-api-key": k, "Content-Type": "application/json" }, body: JSON.stringify({ new_name: x.name }) });
      if (!r.ok) {
        const msg = JSON.stringify(await r.json().catch(() => ({})));
        stop = /limit|maximum|slots|quota/i.test(msg) ? "일레븐랩스 요금제의 목소리 자리가 다 찼어요. 안 쓰는 목소리를 지우거나 요금제를 올리면 더 넣을 수 있어요." : r.status === 401 || r.status === 403 ? "일레븐랩스 키에 Voices 쓰기 권한을 켜 주세요." : `추가 멈춤 (${r.status})`;
        break;
      }
      added++;
    }
    return NextResponse.json({ success: true, added, todo: todo.length, stop });
  }

  // 문장 하나 → 목소리 (포인트)
  const text = String(body.text || "").replace(/\[[^\]]{1,20}\]\s*/g, "").replace(/\s+/g, " ").trim();
  const voiceId = String(body.voiceId || "").replace(/^el_/, "");
  if (!text) return NextResponse.json({ success: false, error: "읽을 문장이 없어요." }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ success: false, error: "문장이 너무 길어요 (500자까지). 장면을 나눠 주세요." }, { status: 400 });
  if (!/^[\w-]{8,64}$/.test(voiceId)) return NextResponse.json({ success: false, error: "성우를 다시 골라 주세요." }, { status: 400 });
  const r0 = await rate();
  const cost = costOf(text, r0);
  const s = db();
  const { data: m } = await s.from("members").select("point_balance").eq("id", member.id).maybeSingle();
  const bal = Number(m?.point_balance) || 0;
  // 목소리 전용 포인트를 먼저, 모자라면 일반 포인트에서
  const free = await freeOf(member);
  const fromFree = Math.min(cost, free?.left || 0);
  const fromBal = cost - fromFree;
  if (bal < fromBal) return NextResponse.json({ success: false, error: `포인트가 모자라요. 이 문장은 ${cost}P (1자 ${r0 / 100}P)${free ? `, 이번 달 목소리 전용 ${free.left.toLocaleString("ko-KR")}P` : ""}, 남은 포인트 ${bal.toLocaleString("ko-KR")}P예요.`, points: true }, { status: 402 });
  const em = String(body.emotion || "normal");
  const r = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": k, "Content-Type": "application/json" },
    body: JSON.stringify({ text: koReadNumbers(text), model_id: MODEL, voice_settings: { ...(STYLE[em] || STYLE.normal), use_speaker_boost: true }, ...(body.prev ? { previous_text: koReadNumbers(String(body.prev)).slice(0, 1000) } : {}), ...(body.next ? { next_text: koReadNumbers(String(body.next)).slice(0, 1000) } : {}) }),
  });
  if (!r.ok) return NextResponse.json({ success: false, error: errOf(r.status, await r.json().catch(() => null)) }, { status: 502 });
  const audio = await r.arrayBuffer();
  // 만들어진 뒤에만 포인트를 뺀다
  const left = bal - fromBal;
  if (fromBal) await s.from("members").update({ point_balance: left }).eq("id", member.id);
  await s.from("point_transactions").insert({ member_id: member.id, type: "SPEND", amount: fromBal, reason: `AI 목소리 ${text.length}자${fromFree ? ` · 목소리 전용 ${fromFree}P` : ""}`, balance_after: left });
  return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Points-Left": String(left), "X-Points-Cost": String(cost), ...(free ? { "X-Voice-Free-Left": String(free.left - fromFree) } : {}) } });
}
