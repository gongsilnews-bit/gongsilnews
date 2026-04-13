"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ── 게시판 목록 조회 ── */
export async function getBoards() {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}

/* ── 게시판 단건 조회 ── */
export async function getBoard(boardId: string) {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("board_id", boardId)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/* ── 게시판 생성/수정 ── */
export async function saveBoard(payload: {
  id?: string;
  board_id: string;
  name: string;
  subtitle?: string;
  description?: string;
  categories?: string;
  skin_type?: string;
  columns_count?: number;
  perm_list?: number;
  perm_read?: number;
  perm_write?: number;
  sort_order?: number;
  is_active?: boolean;
}) {
  if (payload.id) {
    // 수정
    const { error } = await supabase
      .from("boards")
      .update(payload)
      .eq("id", payload.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } else {
    // 생성
    const { error } = await supabase.from("boards").insert(payload);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
}

/* ── 게시판 삭제 ── */
export async function deleteBoard(boardId: string) {
  const { error } = await supabase
    .from("boards")
    .delete()
    .eq("board_id", boardId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ── 게시글 목록 조회 ── */
export async function getBoardPosts(boardId: string) {
  const { data, error } = await supabase
    .from("board_posts")
    .select("*, board_attachments(*)")
    .eq("board_id", boardId)
    .eq("is_deleted", false)
    .order("is_notice", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}

/* ── 게시글 단건 조회 ── */
export async function getBoardPost(postId: string) {
  const { data, error } = await supabase
    .from("board_posts")
    .select("*, board_attachments(*), board_comments(*)")
    .eq("id", postId)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/* ── 게시글 저장 (생성/수정) ── */
export async function saveBoardPost(payload: {
  id?: string;
  board_id: string;
  author_id?: string;
  author_name?: string;
  title: string;
  content?: string;
  thumbnail_url?: string;
  youtube_url?: string;
  drive_url?: string;
  drive_label?: string;
  external_url?: string;
  is_notice?: boolean;
}) {
  if (payload.id) {
    const { error } = await supabase
      .from("board_posts")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", payload.id);
    if (error) return { success: false, error: error.message };
    return { success: true, postId: payload.id };
  } else {
    const { data, error } = await supabase
      .from("board_posts")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, postId: data?.id };
  }
}

/* ── 게시글 삭제 (소프트) ── */
export async function deleteBoardPost(postId: string) {
  const { error } = await supabase
    .from("board_posts")
    .update({ is_deleted: true })
    .eq("id", postId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ── 첨부파일 업로드 ── */
export async function uploadBoardAttachment(formData: FormData) {
  const file = formData.get("file") as File;
  const postId = formData.get("post_id") as string;
  const sortOrder = parseInt(formData.get("sort_order") as string || "0");

  if (!file || !postId) return { success: false, error: "파일 또는 게시글ID 없음" };

  const ext = file.name.split(".").pop() || "bin";
  const path = `boards/${postId}/${Date.now()}_${sortOrder}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("article-media")
    .upload(path, file, { upsert: true });
  if (uploadError) return { success: false, error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from("article-media")
    .getPublicUrl(path);

  const { error: dbError } = await supabase.from("board_attachments").insert({
    post_id: postId,
    file_url: urlData.publicUrl,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    sort_order: sortOrder,
  });
  if (dbError) return { success: false, error: dbError.message };

  return { success: true, url: urlData.publicUrl };
}

/* ── 썸네일 업로드 및 반영 ── */
export async function uploadBoardThumbnail(formData: FormData) {
  const file = formData.get("file") as File;
  const postId = formData.get("post_id") as string;

  if (!file || !postId) return { success: false, error: "파일 또는 게시글ID 없음" };

  const ext = file.name.split(".").pop() || "webp";
  const path = `boards/${postId}/thumb_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("article-media")
    .upload(path, file, { upsert: true });
  if (uploadError) return { success: false, error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from("article-media")
    .getPublicUrl(path);

  // 업로드 후 바로 board_posts 에 썸네일 주소 업데이트
  const { error: dbError } = await supabase
    .from("board_posts")
    .update({ thumbnail_url: urlData.publicUrl })
    .eq("id", postId);
    
  if (dbError) return { success: false, error: dbError.message };

  return { success: true, url: urlData.publicUrl };
}


/* ── 댓글 목록 조회 ── */
export async function getBoardComments(postId: string) {
  const { data, error } = await supabase
    .from("board_comments")
    .select("*")
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data };
}

/* ── 댓글 작성 ── */
export async function saveBoardComment(payload: {
  post_id: string;
  author_id?: string;
  author_name?: string;
  content: string;
  parent_id?: string;
}) {
  const { error } = await supabase.from("board_comments").insert(payload);
  if (error) return { success: false, error: error.message };

  // comment_count 증가
  try {
    await supabase.rpc("increment_comment_count", { p_post_id: payload.post_id });
  } catch (err) {
    // rpc가 없으면 무시 (수동 카운트)
  }

  return { success: true };
}

/* ── 댓글 삭제 ── */
export async function deleteBoardComment(commentId: string) {
  const { error } = await supabase
    .from("board_comments")
    .update({ is_deleted: true })
    .eq("id", commentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
