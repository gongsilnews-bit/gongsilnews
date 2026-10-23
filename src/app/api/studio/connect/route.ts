import { NextResponse } from "next/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { sealStudioCode } from "@/utils/studioConnect";

/**
 * 공실스튜디오 연결 신호 만들기 (크롬의 /studio/connect 화면이 부름)
 * 로그인 쿠키로 회원을 확인하고, 그 회원의 1회용 로그인 토큰을 암호화해 돌려준다.
 * generateLink 는 메일을 보내지 않는다.
 */
/** 연결 화면에 보여 줄 회원 이름 */
export async function GET() {
  const supabase = await createCookieSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ loggedIn: false });
  const { data: member } = await supabase.from("members").select("name").eq("id", user.id).maybeSingle();
  return NextResponse.json({ loggedIn: true, name: member?.name || user.email, email: user.email });
}

export async function POST() {
  const supabase = await createCookieSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!user.email) {
    return NextResponse.json({ error: "이메일이 없는 계정이라 연결할 수 없습니다. 고객센터로 문의해 주세요." }, { status: 400 });
  }

  const admin = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[studio/connect] generateLink 실패", error);
    return NextResponse.json({ error: "연결 신호를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }

  return NextResponse.json({ code: sealStudioCode(tokenHash, user.id) });
}
