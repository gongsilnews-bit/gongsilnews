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
    const [
      totalCount,
      activeCount,
      coordsCount,
      auctionCount,
      activeAuctionCount,
      activeAuctionCoordsCount
    ] = await Promise.all([
      supabase.from('vacancies').select('*', { count: 'exact', head: true }),
      supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE').not('lat', 'is', null).not('lng', 'is', null),
      supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('trade_type', '경매'),
      supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('trade_type', '경매').eq('status', 'ACTIVE'),
      supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('trade_type', '경매').eq('status', 'ACTIVE').not('lat', 'is', null).not('lng', 'is', null),
    ]);

    return NextResponse.json({
      totalCount: totalCount.count,
      activeCount: activeCount.count,
      coordsCount: coordsCount.count,
      auctionCount: auctionCount.count,
      activeAuctionCount: activeAuctionCount.count,
      activeAuctionCoordsCount: activeAuctionCoordsCount.count,
      error: totalCount.error || activeCount.error || coordsCount.error || auctionCount.error
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
