"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const DEFAULT_CATEGORIES = ["중개실무", "법률", "세무", "분양", "마케팅", "기타"];

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

/**
 * 스터디 설정 및 카테고리 목록 조회
 */
export async function getStudySettings(): Promise<{
  success: boolean;
  categories: string[];
  settings?: Record<string, any>;
  error?: string;
}> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("agent_settings")
      .select("settings")
      .eq("id", "study_settings")
      .maybeSingle();

    if (error) {
      console.warn("[getStudySettings] DB 조회 경고, 기본값 사용:", error.message);
      return { success: true, categories: DEFAULT_CATEGORIES };
    }

    const categories =
      Array.isArray(data?.settings?.categories) && data.settings.categories.length > 0
        ? data.settings.categories
        : DEFAULT_CATEGORIES;

    return {
      success: true,
      categories,
      settings: data?.settings || {},
    };
  } catch (err: any) {
    console.error("[getStudySettings] 에러:", err);
    return { success: true, categories: DEFAULT_CATEGORIES, error: err.message };
  }
}

/**
 * 카테고리별 등록된 강의 수 집계
 */
export async function getStudyCategoryUsage(): Promise<{
  success: boolean;
  counts: Record<string, number>;
  error?: string;
}> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.from("lectures").select("category");

    if (error) {
      return { success: false, counts: {}, error: error.message };
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const cat = (row.category || "").trim();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });

    return { success: true, counts };
  } catch (err: any) {
    return { success: false, counts: {}, error: err.message };
  }
}

/**
 * 카테고리 전체 목록 저장 (순서 변경, 추가, 삭제 반영)
 */
export async function saveStudyCategories(
  categories: string[]
): Promise<{ success: boolean; categories: string[]; error?: string }> {
  try {
    const cleanList = categories
      .map((c) => c.trim())
      .filter((c, idx, arr) => c.length > 0 && arr.indexOf(c) === idx);

    if (cleanList.length === 0) {
      return { success: false, categories: [], error: "최소 1개 이상의 카테고리가 필요합니다." };
    }

    const supabase = getAdminClient();

    // 기존 settings 보존
    const { data: existing } = await supabase
      .from("agent_settings")
      .select("settings")
      .eq("id", "study_settings")
      .maybeSingle();

    const mergedSettings = {
      ...(existing?.settings || {}),
      categories: cleanList,
    };

    const { error } = await supabase.from("agent_settings").upsert({
      id: "study_settings",
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, categories: cleanList, error: error.message };
    }

    // 캐시 무효화
    revalidatePath("/study");
    revalidatePath("/m/study");
    revalidatePath("/admin");

    return { success: true, categories: cleanList };
  } catch (err: any) {
    return { success: false, categories, error: err.message };
  }
}

/**
 * 카테고리명 변경 (기존 등록된 강의들의 category도 일괄 변경)
 */
export async function renameStudyCategory(
  oldName: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    if (!trimmedNew) {
      return { success: false, error: "새 카테고리명을 입력해주세요." };
    }
    if (trimmedOld === trimmedNew) {
      return { success: true };
    }

    const supabase = getAdminClient();

    // 1. settings 가져와서 카테고리 배열 치환
    const { data: existing } = await supabase
      .from("agent_settings")
      .select("settings")
      .eq("id", "study_settings")
      .maybeSingle();

    const currentList: string[] = existing?.settings?.categories || DEFAULT_CATEGORIES;
    const updatedList = currentList.map((c) => (c === trimmedOld ? trimmedNew : c));

    // 중복 제거
    const deduplicated = Array.from(new Set(updatedList));

    const mergedSettings = {
      ...(existing?.settings || {}),
      categories: deduplicated,
    };

    const { error: upsertErr } = await supabase.from("agent_settings").upsert({
      id: "study_settings",
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) return { success: false, error: upsertErr.message };

    // 2. 기존 강의들의 category도 새 이름으로 업데이트
    const { error: updateErr } = await supabase
      .from("lectures")
      .update({ category: trimmedNew })
      .eq("category", trimmedOld);

    if (updateErr) {
      console.warn("[renameStudyCategory] 강의 테이블 업데이트 경고:", updateErr.message);
    }

    // 캐시 무효화
    revalidatePath("/study");
    revalidatePath("/m/study");
    revalidatePath("/admin");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
