import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";

/**
 * 예약 발행 Cron Job
 * - 매 10분마다 실행
 * - published_at이 현재 시간 이전인 APPROVED 기사가 있으면 캐시를 갱신하여
 *   공개 목록에 자동 노출되도록 함
 * - 실질적으로 getArticles의 published_at <= now() 필터가 시간 경과 후
 *   예약 기사를 자동으로 포함시키므로, 캐시만 무효화하면 됨
 */

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    // Vercel Cron 인증 검증
    const authHeader = request.headers.get("authorization");
    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      !request.headers.get("x-vercel-cron")
    ) {
      // 로컬 개발환경에서는 허용
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = getAdminClient();
    const now = new Date().toISOString();

    // 현재 시간 기준으로 발행 시간이 도래한 예약 기사 확인
    const { data: scheduledArticles, error } = await supabase
      .from("articles")
      .select("id, title, published_at")
      .eq("status", "APPROVED")
      .eq("is_deleted", false)
      .not("published_at", "is", null)
      .lte("published_at", now)
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("❌ 예약 발행 조회 오류:", error.message);
      return NextResponse.json({ success: false, error: error.message });
    }

    // 예약 기사가 있으면 캐시 무효화 (새로 발행될 기사가 목록에 노출되도록)
    const count = scheduledArticles?.length || 0;
    
    if (count > 0) {
      // @ts-ignore
      revalidateTag("articles");
      console.log(`✅ 예약 발행 캐시 갱신: ${count}건의 기사가 발행 시간 도래`);
    }

    // ⚡ 주간(views_week: 매주 월요일) / 월간(views_month: 매월 1일) 자동 리셋
    try {
      const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
      const dayOfWeek = nowKST.getUTCDay(); // 1 = 월요일
      const dayOfMonth = nowKST.getUTCDate(); // 1 = 매월 1일
      const currentWeekKey = `${nowKST.getUTCFullYear()}-W${Math.ceil(nowKST.getUTCDate() / 7)}`;
      const currentMonthKey = `${nowKST.getUTCFullYear()}-${nowKST.getUTCMonth() + 1}`;

      const { data: resetSetting } = await supabase
        .from('agent_settings')
        .select('settings')
        .eq('id', 'views_reset_status')
        .maybeSingle();

      const lastWeekReset = resetSetting?.settings?.lastWeekReset;
      const lastMonthReset = resetSetting?.settings?.lastMonthReset;
      let needSave = false;
      const newSettings = { ...(resetSetting?.settings || {}) };

      if (dayOfWeek === 1 && lastWeekReset !== currentWeekKey) {
        await supabase.from('articles').update({ views_week: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
        newSettings.lastWeekReset = currentWeekKey;
        needSave = true;
        console.log(`🔄 주간 조회수(views_week) 리셋 완료: ${currentWeekKey}`);
      }

      if (dayOfMonth === 1 && lastMonthReset !== currentMonthKey) {
        await supabase.from('articles').update({ views_month: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
        newSettings.lastMonthReset = currentMonthKey;
        needSave = true;
        console.log(`🔄 월간 조회수(views_month) 리셋 완료: ${currentMonthKey}`);
      }

      if (needSave) {
        await supabase.from('agent_settings').upsert({
          id: 'views_reset_status',
          settings: newSettings,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      console.warn("주간/월간 조회수 리셋 체크 건너뜀:", e.message);
    }

    return NextResponse.json({
      success: true,
      message: count > 0 
        ? `${count}건의 예약 기사가 공개되었습니다.`
        : "발행 대기 중인 예약 기사가 없습니다.",
      count,
      checkedAt: now,
    });
  } catch (err: any) {
    console.error("❌ 예약 발행 cron 오류:", err.message);
    return NextResponse.json({ success: false, error: err.message });
  }
}
