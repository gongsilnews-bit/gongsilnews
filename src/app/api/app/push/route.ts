// 앱 휴대폰 푸시 등록 — 로그인 안 한 설치자도 (2026-11-18 사장님: 앱 설치한 사람 모두에게)
//  로그인한 회원은 /api/app/manage push.register 로 회원과 함께 등록한다. 여기는 로그인 없이 휴대폰만
//  POST { action: "register", token, platform, device } → 처음 보는 휴대폰이면 회원 없이 등록 (이미 회원 것이면 그대로 둔다)
//  POST { action: "get", token }                      → { newsOff } 로그인 안 한 설치자의 "속보·추천 기사" 끔 여부
//  POST { action: "newsoff", token, off }             → 로그인 안 한 설치자가 알림설정에서 끄고 켬
//  토큰을 아는 휴대폰 자신만 바꿀 수 있다 (Expo 토큰은 길고 맞히기 어렵다)
import { NextRequest, NextResponse } from "next/server";
import { adminDb, no } from "../auth";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });
const TOKEN = /^(Exponent|Expo)PushToken\[[\w\-]{10,200}\]$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const token = String(body?.token || "").trim();
  if (!TOKEN.test(token)) return no("푸시 토큰이 올바르지 않습니다.");
  const db = adminDb();
  const { data: row, error } = await db.from("push_tokens").select("user_id, news_off").eq("token", token).maybeSingle();
  if (error) return no(/push_tokens|news_off/.test(error.message) ? "푸시 표가 아직 준비되지 않았습니다. (SQL 실행 필요)" : error.message, 500);

  if (action === "register") {
    if (row) { // 이미 있음 — 회원 것이면 그대로, 아니면 날짜만
      await db.from("push_tokens").update({ updated_at: new Date().toISOString() }).eq("token", token);
      return ok();
    }
    const { error: e } = await db.from("push_tokens").insert({
      token, user_id: null, platform: String(body?.platform || "").slice(0, 20), device: String(body?.device || "").slice(0, 80),
    });
    return e && e.code !== "23505" ? no(e.message, 500) : ok();
  }
  if (action === "get") return ok({ newsOff: !!row?.news_off });
  if (action === "newsoff") {
    if (!row) return no("등록되지 않은 휴대폰입니다.", 404);
    await db.from("push_tokens").update({ news_off: !!body?.off }).eq("token", token);
    return ok({ newsOff: !!body?.off });
  }
  return no("알 수 없는 요청입니다.");
}
