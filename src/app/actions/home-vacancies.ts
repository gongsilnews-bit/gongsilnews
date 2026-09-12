"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { getPermissionLevel } from "@/utils/permissionCheck";

const categories = ["아파트·오피스텔", "빌라·주택", "원룸·투룸(풀옵션)", "상가·사무실·건물·공장·토지", "분양", "경매"];

export async function getHomeVacancies(category = "") {
  try {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const client = await createClient();
    const { data: { user } } = await client.auth.getUser();
    let level = 0;
    let registrationHref = "/login?returnTo=" + encodeURIComponent("/realty_admin?menu=gongsil&action=write");
    if (user) {
      const { data: member } = await admin.from("members").select("role, plan_type, agencies(status)").eq("id", user.id).maybeSingle();
      level = member ? getPermissionLevel(member) : 1;
      registrationHref = `${level === 5 ? "/admin" : ["REALTOR", "부동산회원"].includes(member?.role || "") ? "/realty_admin" : "/user_admin"}?menu=gongsil&action=write`;
    }
    let query = admin.from("vacancies")
      .select("id, trade_type, property_type, deposit, monthly_rent, dong, building_name, hosu, exposure_type, direction, exclusive_m2, room_count, bath_count, realtor_commission, commission_type, created_at, metadata, vacancy_photos(url, sort_order)")
      .eq("status", "ACTIVE");
    if (category === "경매") query = query.eq("trade_type", "경매");
    else if (categories.includes(category)) query = query.eq("property_type", category).neq("trade_type", "경매");
    const [{ data, error }, auctionResult] = await Promise.all([
      query.order("created_at", { ascending: false }).limit(20),
      admin.from("vacancies").select("id", { count: "exact", head: true }).eq("trade_type", "경매").eq("status", "ACTIVE"),
    ]);
    if (error) return { success: false as const, data: [] };
    return { success: true as const, registrationHref, auctionCount: auctionResult.error ? null : auctionResult.count, data: (data || []).map(item => {
      const masked = item.exposure_type === "부동산노출" && level < (["경매", "공매"].includes(item.trade_type) ? 1 : 2);
      const meta = item.metadata || {};
      const address = [item.dong, item.building_name, item.hosu].filter(Boolean).join(" ") || "공실광고";
      const managementNo = meta.cltrMngNo || meta.cltr_mng_no;
      return {
        id: item.id, title: masked ? address.replace(/[^\s]/g, "X") : address, masked,
        href: masked ? "/login?returnTo=%2F" : item.trade_type === "경매" && managementNo ? `/gongsil?mng=${encodeURIComponent(managementNo)}` : `/gongsil?id=${item.id}`,
        tradeType: item.trade_type, propertyType: item.property_type,
        deposit: Number(item.deposit) || 0, monthlyRent: Number(item.monthly_rent) || 0,
        auctionPrice: Number(meta.lowest_bid_price) || Number(meta.lowstBidPrcIndctCont) || Number(meta.appraisal_price) || Number(meta.apslEvlAmt) || (item.deposit > 100000 ? item.deposit : (item.deposit || 0) * 10000),
        direction: item.direction, area: item.exclusive_m2,
        commission: level >= 2 ? item.realtor_commission || item.commission_type : null,
        rooms: item.room_count, baths: item.bath_count, createdAt: item.created_at,
        photo: [...(item.vacancy_photos || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url || null,
      };
    }) };
  } catch {
    return { success: false as const, data: [] };
  }
}
