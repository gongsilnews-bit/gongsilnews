import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = getAdminClient();
    
    // 서울 강남 근방 경위도 바운딩 박스
    // swLat = 37.45, neLat = 37.55
    // swLng = 126.98, neLng = 127.08
    const [
      totalCount,
      activeAuctionCount,
      gangnamAuctionCount
    ] = await Promise.all([
      supabase.from('vacancies').select('*', { count: 'exact', head: true }),
      supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('trade_type', '경매').eq('status', 'ACTIVE'),
      supabase.from('vacancies').select('*', { count: 'exact', head: true })
        .eq('trade_type', '경매')
        .eq('status', 'ACTIVE')
        .gte('lat', 37.45)
        .lte('lat', 37.55)
        .gte('lng', 126.98)
        .lte('lng', 127.08)
    ]);

    return NextResponse.json({
      totalCount: totalCount.count,
      activeAuctionCount: activeAuctionCount.count,
      gangnamAuctionCount: gangnamAuctionCount.count,
      error: totalCount.error || activeAuctionCount.error || gangnamAuctionCount.error
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
