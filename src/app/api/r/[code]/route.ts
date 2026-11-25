import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * 고객관리 문자 속 짧은 링크 (2026-11-25, docs/2026-11-25_crm_contacts_plan.md)
 *  누르면: 링크 누름 기록 · 그 사람 연속 무반응 0 (쉬는중이면 다시 보냄가능) → 원래 주소로 보냄
 *  원래 주소에 ?ref=crm-<캠페인> 을 붙여 가입하면 어느 문자로 왔는지 남는다 (middleware gs_ref 쿠키)
 *  api 아래에 둔 까닭: middleware 가 휴대폰 접속을 /m 으로 바꾸지 않게
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const home = new URL("/", request.url);
  if (!/^[a-z0-9]{4,12}$/.test(code)) return NextResponse.redirect(home);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: link } = await db.from("crm_links").select("code, contact_id, campaign_id, url, clicked_at, click_count").eq("code", code).maybeSingle();
  if (!link) return NextResponse.redirect(home);

  // 미리보기 로봇(카톡·문자 앱 링크 미리보기)은 누름으로 세지 않는다
  const ua = request.headers.get("user-agent") || "";
  const bot = /bot|crawler|spider|preview|facebookexternalhit|kakaotalk-scrap|slackbot|twitterbot|whatsapp/i.test(ua);
  if (!bot) {
    await db.from("crm_links").update({ clicked_at: link.clicked_at || new Date().toISOString(), click_count: (link.click_count || 0) + 1 }).eq("code", code);
    if (!link.clicked_at) {
      await db.rpc("crm_mark_reaction", { p_contact: link.contact_id, p_kind: "링크누름", p_campaign: link.campaign_id, p_detail: null });
    }
  }

  let target: URL;
  try { target = new URL(link.url); } catch { return NextResponse.redirect(home); }
  if (link.campaign_id && !target.searchParams.has("ref")) target.searchParams.set("ref", `crm-${link.campaign_id}`);
  return NextResponse.redirect(target);
}
