"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ==========================================
// 북마크 카테고리 (bookmark_categories)
// ==========================================

export async function getBookmarkCategories(userId: string, type: 'ARTICLE' | 'VACANCY') {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("bookmark_categories")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .order("created_at", { ascending: true });
      
    if (error) return { success: false, error: error.message };
    return { success: true, categories: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBookmarkCategory(userId: string, name: string, type: 'ARTICLE' | 'VACANCY') {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("bookmark_categories")
      .insert({ user_id: userId, name, type })
      .select()
      .single();
      
    if (error) return { success: false, error: error.message };
    return { success: true, category: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateBookmarkCategory(categoryId: string, name: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("bookmark_categories")
      .update({ name })
      .eq("id", categoryId);
      
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBookmarkCategory(categoryId: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("bookmark_categories")
      .delete()
      .eq("id", categoryId);
      
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setArticleBookmarkCategory(userId: string, articleId: string | number, categoryId: string | null) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("article_bookmarks")
      .update({ category_id: categoryId })
      .eq("user_id", userId)
      .eq("article_id", articleId);
      
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setVacancyBookmarkCategory(userId: string, vacancyId: string, categoryId: string | null) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("vacancy_wishlist")
      .update({ category_id: categoryId })
      .eq("user_id", userId)
      .eq("vacancy_id", vacancyId);
      
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 기사 북마크 (article_bookmarks)
// ==========================================

export async function toggleArticleBookmark(userId: string, articleId: string | number, categoryId?: string | null) {
  const supabase = getAdminClient();
  try {
    // 1. 기존 북마크 확인
    const { data: existing, error: checkError } = await supabase
      .from("article_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("article_id", articleId)
      .maybeSingle();

    if (checkError) return { success: false, error: checkError.message };

    let isBookmarked = false;

    if (existing) {
      // 2. 존재하면 삭제 (언찜)
      const { error: deleteError } = await supabase
        .from("article_bookmarks")
        .delete()
        .eq("id", existing.id);
      
      if (deleteError) return { success: false, error: deleteError.message };
      isBookmarked = false;
    } else {
      // 3. 존재하지 않으면 추가 (찜)
      const { error: insertError } = await supabase
        .from("article_bookmarks")
        .insert({ user_id: userId, article_id: articleId, category_id: categoryId || null });
      
      if (insertError) return { success: false, error: insertError.message };
      isBookmarked = true;
    }

    return { success: true, isBookmarked };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getArticleBookmarks(userId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("article_bookmarks")
      .select("article_id, category_id")
      .eq("user_id", userId);
      
    if (error) return { success: false, error: error.message };
    
    const bookmarkIds = data.map((b) => b.article_id);
    return { success: true, bookmarkIds, bookmarks: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 공실 북마크 (vacancy_wishlist)
// ==========================================

export async function toggleVacancyBookmark(userId: string, vacancyId: string, categoryId?: string | null) {
  const supabase = getAdminClient();
  try {
    // 1. 기존 북마크 확인
    const { data: existing, error: checkError } = await supabase
      .from("vacancy_wishlist")
      .select("id")
      .eq("user_id", userId)
      .eq("vacancy_id", vacancyId)
      .maybeSingle();

    if (checkError) return { success: false, error: checkError.message };

    let isBookmarked = false;

    if (existing) {
      // 2. 존재하면 삭제 (언찜)
      const { error: deleteError } = await supabase
        .from("vacancy_wishlist")
        .delete()
        .eq("id", existing.id);
      
      if (deleteError) return { success: false, error: deleteError.message };
      isBookmarked = false;
    } else {
      // 3. 존재하지 않으면 추가 (찜)
      const { error: insertError } = await supabase
        .from("vacancy_wishlist")
        .insert({ user_id: userId, vacancy_id: vacancyId, category_id: categoryId || null });
      
      if (insertError) return { success: false, error: insertError.message };
      isBookmarked = true;
    }

    return { success: true, isBookmarked };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getVacancyBookmarks(userId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("vacancy_wishlist")
      .select("vacancy_id")
      .eq("user_id", userId);
      
    if (error) return { success: false, error: error.message };
    
    const bookmarkIds = data.map((b) => b.vacancy_id);
    return { success: true, bookmarkIds };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
