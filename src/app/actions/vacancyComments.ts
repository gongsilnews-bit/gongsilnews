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
      .select('*')
      .eq('vacancy_id', vacancyId)
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
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
        is_secret: data.is_secret
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: newComment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
