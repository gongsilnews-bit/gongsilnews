// 공실 릴스 정리 (매시간): 24시간 지난 완성 영상, 30일 안 쓴 올린 영상(변환본)을 저장소에서 지운다.
import { NextResponse } from "next/server";
import { purgeUnusedMedia } from "@/lib/reels/media";
import { purgeUnusedMusic } from "@/lib/reels/music";
import { purgeExpiredReels } from "@/lib/reels/retention";

export const maxDuration = 120;

export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  try {
    const removed = await purgeExpiredReels();
    const media = await purgeUnusedMedia();
    const music = await purgeUnusedMusic();
    return NextResponse.json({ success: true, removed, media, music });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
