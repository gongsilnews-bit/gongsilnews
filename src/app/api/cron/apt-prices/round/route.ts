// 공실열람 지도 시세 — 전국 아파트·오피스텔을 매일 밤 차례로 (2026-11-03 사장님: 일단 아파트·오피스텔만)
//  크론 하나가 시각으로 자기 차례를 안다 (어디까지 했는지 따로 적지 않는다). 시각은 한국 시간.
//  ?mode=recent  새벽 2:00~6:55, 5분마다 60번 — 모든 시군구 × 아파트·오피스텔·빌라를 60 덩이로 나눠 최근 3개월만 (aptMap.syncRecent)
//                07:00~11:55 에 같은 것을 한 바퀴 더 (2026-11-04: 밤에 마포 등 30여 곳이 안 바뀌어 있었다 — 바뀐 것만 쓰니 두 번째는 가볍다)
//  ?mode=full    밤 0:00~1:55, 5분마다 24번 — 그날 차례인 시군구 하나씩 36개월 전체 (28일에 한 바퀴, aptMap.syncTrades)
//  손으로 시험: ?mode=recent&slot=3  ·  ?mode=full&slot=0&day=5  ·  ?mode=recent&lawd=11680&kind=offi
import { NextResponse } from "next/server";
import { LAWD_NAMES, RECENT_MONTHS, syncGeo, syncInfo, syncRecent, syncSupply, syncTrades, type Kind } from "@/utils/aptMap";
import { matchAuctions } from "@/utils/auctionMatch";

export const maxDuration = 300;

const JOBS: [string, Kind][] = Object.keys(LAWD_NAMES).flatMap((l) => [[l, "apt"], [l, "offi"]] as [string, Kind][]);
// 빌라는 최근 3개월만 매일 (2026-11-04 사장님: 빌라는 어떻게 갱신?) — 36개월 전체 다시 받기는 빌라 수가 많아 5분 안에 못 끝난다.
// 36개월 밖으로 나간 거래는 최근 갱신이 덜어 낸다
const RECENT_JOBS: [string, Kind][] = Object.keys(LAWD_NAMES).flatMap((l) => [[l, "apt"], [l, "offi"], [l, "villa"]] as [string, Kind][]);
const RECENT_SLOTS = 60; // 02:00~06:55 한 바퀴, 07:00~11:55 한 바퀴 더 (밤에 못 받은 곳 · 아침에 올라온 신고)
const FULL_DAYS = 28;

export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  const params = new URL(req.url).searchParams;
  const mode = params.get("mode") === "full" ? "full" : "recent";
  const kst = new Date(Date.now() + 9 * 3600_000);
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const deadline = Date.now() + 270_000;

  let jobs: [string, Kind][];
  let slot: number;
  if (mode === "recent") {
    slot = params.has("slot") ? Number(params.get("slot")) : min >= 120 ? Math.floor((min - 120) / 5) % RECENT_SLOTS : -1;
    const per = Math.ceil(RECENT_JOBS.length / RECENT_SLOTS);
    jobs = slot >= 0 && slot < RECENT_SLOTS && min < 720 + (params.has("slot") ? 1440 : 0) ? RECENT_JOBS.slice(slot * per, slot * per + per) : [];
  } else {
    slot = params.has("slot") ? Number(params.get("slot")) : Math.floor(min / 5);
    const day = params.has("day") ? Number(params.get("day")) : kst.getUTCDate();
    const today = JOBS.filter((_, i) => i % FULL_DAYS === (day - 1) % FULL_DAYS);
    jobs = slot >= 0 && slot < today.length ? [today[slot]] : [];
  }

  // 손으로 한 곳만: ?mode=recent&lawd=11680&kind=offi
  const one = params.get("lawd");
  const k1 = params.get("kind");
  if (one && LAWD_NAMES[one]) jobs = [[one, k1 === "offi" ? "offi" : k1 === "villa" ? "villa" : "apt"]];

  const done: Record<string, unknown>[] = [];
  for (const [lawd, kind] of jobs) {
    if (Date.now() > deadline - 20_000) { done.push({ lawd, kind, skipped: "시간 부족" }); continue; }
    const r: Record<string, unknown> = { lawd, kind, name: LAWD_NAMES[lawd] };
    try {
      const t = mode === "full" ? await syncTrades(lawd, kind) : await syncRecent(lawd, kind, RECENT_MONTHS);
      r.trades = t;
      // 새 단지가 생겼거나 한 달 전체를 받은 날만 위치·평형·정보 (이미 찾은 단지는 다시 찾지 않는다)
      if (mode === "full" || ("added" in t && t.added > 0)) {
        r.geo = await syncGeo(lawd, deadline);
        if (kind !== "villa") { // 빌라는 위치만 (평형·단지 정보는 아파트·오피스텔만)
          r.supply = await syncSupply(lawd, deadline);
          r.info = await syncInfo(lawd, deadline);
        }
      }
      if (kind === "apt" && mode === "recent") r.auctions = await matchAuctions(lawd); // 경매·공매 → 단지 (하루 한 번)
    } catch (e) {
      r.error = e instanceof Error ? e.message : String(e);
    }
    done.push(r);
  }
  return NextResponse.json({ success: true, mode, slot, jobs: jobs.length, done });
}
