"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getVacancyUserData(userId: string) {
  const supabase = getAdminClient();
  
  try {
    // 1. Fetch Wishlist
    const { data: wishData, error: wishError } = await supabase
      .from("vacancy_wishlist")
      .select("vacancy_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // 2. Fetch Recent Views
    const { data: recentData, error: recentError } = await supabase
      .from("vacancy_recent_views")
      .select("vacancy_id")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(50);

    const wishlist = (wishData || []).map(row => row.vacancy_id);
    const recentViews = (recentData || []).map(row => row.vacancy_id);

    return { success: true, wishlist, recentViews };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleWishlistToDB(userId: string, vacancyId: string, isWished: boolean) {
  const supabase = getAdminClient();
  const vId = vacancyId;
  if (!vId) return { success: false, error: "Invalid vacancy_id" };

  try {
    if (isWished) {
      // Add to wishlist
      await supabase.from("vacancy_wishlist").insert({ user_id: userId, vacancy_id: vId });
    } else {
      // Remove from wishlist
      await supabase.from("vacancy_wishlist").delete().eq("user_id", userId).eq("vacancy_id", vId);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addRecentViewToDB(userId: string, vacancyId: string) {
  const supabase = getAdminClient();
  const vId = vacancyId;
  if (!vId) return { success: false, error: "Invalid vacancy_id" };

  try {
    // Check if it exists
    const { data: existing } = await supabase
      .from("vacancy_recent_views")
      .select("id")
      .eq("user_id", userId)
      .eq("vacancy_id", vId)
      .single();

    if (existing) {
      // Update viewed_at
      await supabase.from("vacancy_recent_views").update({ viewed_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      // Insert new
      await supabase.from("vacancy_recent_views").insert({ user_id: userId, vacancy_id: vId });
      
      // Cleanup: Keep only top 50 recent views
      const { data: allRecents } = await supabase
        .from("vacancy_recent_views")
        .select("id")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false });
        
      if (allRecents && allRecents.length > 50) {
        const idsToDelete = allRecents.slice(50).map(r => r.id);
        await supabase.from("vacancy_recent_views").delete().in("id", idsToDelete);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
