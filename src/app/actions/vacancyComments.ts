"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  });
}

export async function getVacancyComments(vacancyId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('vacancy_comments')
      .select('*, members:author_id(profile_image_url)')
      .eq('vacancy_id', vacancyId)
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    
    // members 조인 결과를 flat하게 변환
    const flatData = (data || []).map((c: any) => ({
      ...c,
      profile_image_url: c.members?.profile_image_url || null,
      members: undefined
    }));
    
    return { success: true, data: flatData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createVacancyComment(data: {
  vacancy_id: string;
  author_id: string;
  author_name: string;
  content: string;
  is_secret: boolean;
  parent_id?: string;
}) {
  const supabase = getAdminClient();
  try {
    const { data: newComment, error } = await supabase
      .from('vacancy_comments')
      .insert({
        vacancy_id: data.vacancy_id,
        author_id: data.author_id,
        author_name: data.author_name,
        content: data.content,
        is_secret: data.is_secret,
        parent_id: data.parent_id
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: newComment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
