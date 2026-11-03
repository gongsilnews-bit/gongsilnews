// 공실열람 지도 [아파트 시세] 모으기 (매일 밤, 시군구마다): 실거래 → 위치 → 평형·세대수 → 단지 정보. src/utils/aptMap.ts
//  GET ?lawd=11680              네 단계 다 (시간이 모자라면 남은 위치·평형·정보는 다음 실행에 이어서)
//  GET ?lawd=11680&step=supply  한 단계만 (trades · geo · supply · info · agents=공실 면적 모으기 · summary=요약만 다시)
//  GET ?lawd=11680&kind=offi    실거래를 오피스텔로 (기본 apt). 위치·정보는 종류 구분 없이 남은 것을 한다
import { NextResponse } from "next/server";
import { LAWD_NAMES, resummarize, syncGeo, syncInfo, syncSupply, syncTrades } from "@/utils/aptMap";
import { harvestVacancies } from "@/utils/aptReports";
import { matchAuctions } from "@/utils/auctionMatch";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  const params = new URL(req.url).searchParams;
  const lawd = String(params.get("lawd") || "");
  const step = params.get("step");
  const kind = params.get("kind") === "offi" ? "offi" : params.get("kind") === "villa" ? "villa" : "apt"; // villa = 연립·다세대 (2026-11-03)
  if (!LAWD_NAMES[lawd]) return NextResponse.json({ error: `모르는 시군구 코드입니다: ${lawd}` }, { status: 400 });

  const deadline = Date.now() + 270_000;
  const result: Record<string, unknown> = { lawd, name: LAWD_NAMES[lawd] };
  try {
    if (!step || step === "trades") result.trades = await syncTrades(lawd, kind);
    if (!step || step === "geo") result.geo = await syncGeo(lawd, deadline);
    if (!step || step === "supply") result.supply = await syncSupply(lawd, deadline, kind === "villa" ? ["villa"] : ["apt", "offi"]);
    if (!step || step === "info") result.info = await syncInfo(lawd, deadline);
    // 공실등록 값은 모으지 않는다 (2026-11-02 사장님: 매물등록 때는 체크하지 말고 단지 수정 요청만) — 수동으로만 step=agents
    if (step === "agents") result.agents = await harvestVacancies(lawd);
    if (!step || step === "auctions") result.auctions = await matchAuctions(lawd); // 경매·공매 → 단지 (도로명은 카카오로 지번)
    if (step === "summary") result.summary = await resummarize(lawd);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ success: false, ...result, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
