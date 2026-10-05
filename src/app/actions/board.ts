"use server";

import { createClient } from "@supabase/supabase-js";
import { createNotification } from "./notification";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { getPermissionLevel, isAdminRole } from "@/utils/permissionCheck";

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
  board_type?: string;
  columns_count?: number;
  perm_list?: number;
  perm_read?: number;
  perm_write?: number;
  /** 게시판 상세에서 댓글 영역을 사용할지 여부 */
  comments_enabled?: boolean;
  /** 댓글을 작성할 수 있는 최소 회원 레벨(0~5) */
  perm_comment?: number;
  /** 1:1 문의 사진 첨부 허용 장수 (0~5) */
  max_photos?: number;
  sort_order?: number;
  is_active?: boolean;
}) {
  // max_photos 는 마이그레이션(20260917) 이후에 생기는 컬럼이다. 아직 적용되지
  // 않은 환경에서 게시판 저장이 통째로 막히지 않도록, 그 컬럼이 없다는 오류일
  // 때만 빼고 한 번 더 시도한다.
  const isMissingMaxPhotos = (message?: string) =>
    !!message && /max_photos/.test(message);

  const withoutMaxPhotos = () => {
    const rest: Record<string, unknown> = { ...payload };
    delete rest.max_photos;
    return rest;
  };

  if (payload.id) {
    // 수정
    const update = (body: Record<string, unknown>) =>
      supabase.from("boards").update(body).eq("id", payload.id!);

    let { error } = await update(payload);
    if (error && isMissingMaxPhotos(error.message)) {
      console.warn("[saveBoard] max_photos 컬럼 없음 — 마이그레이션 20260917 적용 필요");
      ({ error } = await update(withoutMaxPhotos()));
    }
    if (error) return { success: false, error: error.message };
    return { success: true };
  } else {
    // 생성
    const insert = (body: Record<string, unknown>) => supabase.from("boards").insert(body);

    let { error } = await insert(payload);
    if (error && isMissingMaxPhotos(error.message)) {
      console.warn("[saveBoard] max_photos 컬럼 없음 — 마이그레이션 20260917 적용 필요");
      ({ error } = await insert(withoutMaxPhotos()));
    }
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
export async function getBoardPosts(boardId: string, options?: { boardType?: string; userId?: string; isAdmin?: boolean }) {
  let query = supabase
    .from("board_posts")
    .select("id, board_id, title, author_id, author_name, created_at, view_count, is_notice, thumbnail_url, youtube_url, drive_url, external_url, board_comments(id)")
    .eq("board_id", boardId)
    .eq("is_deleted", false)
    .eq("board_comments.is_deleted", false)
    .order("is_notice", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.boardType === "inquiry" && !options?.isAdmin) {
    query = query.eq("author_id", options?.userId || "anonymous");
  }

  const { data, error } = await query;

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

/* ── 게시글 조회수 증가 ── */
export async function incrementBoardView(postId: string) {
  try {
    const { error } = await supabase.rpc('increment_board_view', { p_post_id: postId });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: "조회수 증가 실패" };
  }
}

/* ── 게시글 저장 (생성/수정) ── */
export async function saveBoardPost(payload: {
  id?: string;
  board_id: string;
  author_id?: string;
  author_name?: string;
  /** 1:1 문의 전용: 작성 시점의 회신용 연락처 */
  author_phone?: string;
  /** 1:1 문의 전용: 작성 시점의 회신용 이메일 */
  author_email?: string;
  title: string;
  content?: string;
  thumbnail_url?: string;
  youtube_url?: string;
  drive_url?: string;
  drive_label?: string;
  external_url?: string;
  is_notice?: boolean;
}) {
  // author_phone/author_email 은 마이그레이션(20260917) 이후에 생기는 컬럼이다.
  // 아직 적용되지 않은 환경에서 문의 작성이 통째로 실패하지 않도록, 컬럼이 없다는
  // 오류일 때만 연락처를 빼고 한 번 더 시도한다.
  const isMissingContactColumn = (message?: string) =>
    !!message && /author_(phone|email)/.test(message) && /column|does not exist/i.test(message);

  const withoutContact = () => {
    const rest: Record<string, unknown> = { ...payload };
    delete rest.author_phone;
    delete rest.author_email;
    return rest;
  };

  if (payload.id) {
    const update = async (body: Record<string, unknown>) =>
      supabase.from("board_posts").update({ ...body, updated_at: new Date().toISOString() }).eq("id", payload.id!);

    let { error } = await update(payload);
    if (error && isMissingContactColumn(error.message)) {
      console.warn("[saveBoardPost] 연락처 컬럼 없음 — 마이그레이션 20260917 적용 필요");
      ({ error } = await update(withoutContact()));
    }
    if (error) return { success: false, error: error.message };
    return { success: true, postId: payload.id };
  } else {
    const insert = async (body: Record<string, unknown>) =>
      supabase.from("board_posts").insert(body).select("id").single();

    let { data, error } = await insert(payload);
    if (error && isMissingContactColumn(error.message)) {
      console.warn("[saveBoardPost] 연락처 컬럼 없음 — 마이그레이션 20260917 적용 필요");
      ({ data, error } = await insert(withoutContact()));
    }
    if (error) return { success: false, error: error.message };

    // 1:1 문의는 최고관리자가 답해야 하는 일이라 알림을 남긴다
    if (payload.board_id === "inquiry" && data?.id) {
      await createNotification({
        recipientRole: "ADMIN",
        type: "inquiry_new",
        title: "1:1 문의가 접수되었습니다",
        body: `${payload.author_name || "회원"} · ${payload.title}`,
        link: "/admin?menu=inquiry_board",
        mobileLink: "/m/board?id=inquiry",
        sourceId: String(data.id),
      });
    }

    return { success: true, postId: data?.id };
  }
}

/* ── 게시글 일괄 저장 (벌크 등록) ── */
export async function saveBoardPostsBatch(posts: {
  board_id: string;
  author_id?: string;
  author_name?: string;
  title: string;
  content?: string;
  drive_url?: string;
  youtube_url?: string;
  external_url?: string;
}[]) {
  const { data, error } = await supabase
    .from("board_posts")
    .insert(posts)
    .select("id");

  if (error) return { success: false, error: error.message };
  return { success: true, count: data?.length || 0 };
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
/**
 * 1:1 문의는 댓글이 곧 답변이다.
 *
 * 상태(answered_at)와 알림을 여기 한 곳에서 처리한다. 예전에는 관리자
 * 문의관리에만 이 로직이 있어서, 게시판 상세(PC/모바일)에서 답글을 달면
 * 댓글만 쌓이고 계속 "신규"로 남았다.
 *
 *   관리자·제3자가 달면 → 답변완료 + 문의한 회원에게 알림
 *   작성자 본인이 다시 달면 → 신규로 되돌리고 관리자에게 알림
 */
async function syncInquiryAfterComment(postId: string, commenterId?: string, commenterName?: string) {
  // 글과 게시판 종류를 한 번에 가져온다 (문의 게시판이 아니면 바로 빠진다)
  const { data: post } = await supabase
    .from("board_posts")
    .select("author_id, title, boards(board_type)")
    .eq("id", postId)
    .single();

  const boards = post?.boards as { board_type?: string } | { board_type?: string }[] | null;
  const boardType = Array.isArray(boards) ? boards[0]?.board_type : boards?.board_type;
  if (boardType !== "inquiry") return;

  const isAuthorReply = !!commenterId && commenterId === post?.author_id;

  await supabase
    .from("board_posts")
    .update({ answered_at: isAuthorReply ? null : new Date().toISOString() })
    .eq("id", postId);

  if (isAuthorReply) {
    // 회원이 추가 질문 → 관리자에게
    await createNotification({
      recipientRole: "ADMIN",
      type: "inquiry_reply",
      title: "1:1 문의에 추가 질문이 달렸습니다",
      body: `${commenterName || "회원"} · ${post?.title || ""}`,
      link: "/admin?menu=inquiry_board",
      mobileLink: "/m/board?id=inquiry",
      sourceId: `${postId}-${Date.now()}`,
    });
  } else if (post?.author_id) {
    // 관리자 답변 → 문의한 회원에게
    await createNotification({
      recipientId: post.author_id,
      type: "inquiry_answered",
      title: "1:1 문의에 답변이 등록되었습니다",
      body: post.title || "",
      link: "/user_admin?menu=inquiry_board",
      mobileLink: "/m/board?id=inquiry",
      sourceId: `${postId}-${Date.now()}`,
    });
  }
}

export async function saveBoardComment(payload: {
  post_id: string;
  author_id?: string;
  author_name?: string;
  content: string;
  parent_id?: string;
}) {
  const content = payload.content.trim();
  if (!content) return { success: false, error: "댓글 내용을 입력해주세요." };
  if (content.length > 400) return { success: false, error: "댓글은 400자까지 작성할 수 있습니다." };

  // Server Action은 화면을 거치지 않고 직접 호출할 수 있으므로, 게시판 설정과
  // 실제 로그인 회원 등급을 서버에서 다시 확인한다. 클라이언트가 보내는 author_id는
  // 신뢰하지 않고 현재 세션의 사용자 ID로 덮어쓴다.
  const { data: post, error: postError } = await supabase
    .from("board_posts")
    .select("id, board_id, author_id")
    .eq("id", payload.post_id)
    .maybeSingle();

  if (postError || !post) {
    return { success: false, error: postError?.message || "게시글을 찾을 수 없습니다." };
  }

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("board_type, comments_enabled, perm_comment")
    .eq("board_id", post.board_id)
    .maybeSingle();

  if (boardError || !board) {
    return { success: false, error: boardError?.message || "게시판 설정을 찾을 수 없습니다." };
  }
  if (board.comments_enabled === false) {
    return { success: false, error: "이 게시판은 댓글을 사용하지 않습니다." };
  }

  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  let member: {
    name?: string;
    role?: string;
    plan_type?: string;
    agencies?: { status?: string } | { status?: string }[] | null;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("members")
      .select("name, role, plan_type, agencies(status)")
      .eq("id", user.id)
      .maybeSingle();
    member = data;
  }

  const requiredLevel = Math.min(5, Math.max(0, Number(board.perm_comment ?? 1)));
  const userLevel = getPermissionLevel(member);
  if (userLevel < requiredLevel) {
    return { success: false, error: "댓글쓰기 권한이 없습니다." };
  }

  // 1:1 문의는 글 작성자와 최고관리자만 대화를 이어갈 수 있다.
  if (board.board_type === "inquiry") {
    const canReplyToInquiry = !!user && (post.author_id === user.id || isAdminRole(member?.role));
    if (!canReplyToInquiry) {
      return { success: false, error: "이 문의에 답변할 권한이 없습니다." };
    }
  }

  const authorName = user
    ? (isAdminRole(member?.role) ? "최고관리자" : member?.name || payload.author_name?.trim() || user.email?.split("@")[0] || "회원")
    : payload.author_name?.trim() || "게스트";

  const comment = {
    post_id: payload.post_id,
    author_id: user && member ? user.id : null,
    author_name: authorName,
    content,
    parent_id: payload.parent_id || null,
  };

  const { data: inserted, error } = await supabase.from("board_comments").insert(comment).select().single();
  if (error) return { success: false, error: error.message };

  // comment_count 증가
  try {
    await supabase.rpc("increment_comment_count", { p_post_id: payload.post_id });
  } catch (err) {
    // rpc가 없으면 무시 (수동 카운트)
  }

  // 1:1 문의면 답변 상태와 알림을 맞춘다 (일반 게시판이면 조회 한 번에 끝)
  await syncInquiryAfterComment(payload.post_id, user?.id, authorName);

  return { success: true, data: inserted };
}

/**
 * 댓글 수정·삭제 권한: 본인 댓글(로그인 회원) 또는 최고관리자만.
 * 게스트 댓글은 본인 확인 수단이 없어 최고관리자만 정리할 수 있다.
 */
async function checkBoardCommentOwner(commentId: string) {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };

  const { data: comment, error } = await supabase
    .from("board_comments")
    .select("id, author_id, is_deleted")
    .eq("id", commentId)
    .maybeSingle();
  if (error || !comment || comment.is_deleted) {
    return { ok: false as const, error: error?.message || "댓글을 찾을 수 없습니다." };
  }
  if (comment.author_id === user.id) return { ok: true as const };

  const { data: member } = await supabase.from("members").select("role").eq("id", user.id).maybeSingle();
  if (isAdminRole(member?.role)) return { ok: true as const };
  return { ok: false as const, error: "본인이 작성한 댓글만 수정·삭제할 수 있습니다." };
}

/* ── 댓글 수정 ── */
export async function updateBoardComment(commentId: string, rawContent: string) {
  const content = rawContent.trim();
  if (!content) return { success: false, error: "댓글 내용을 입력해주세요." };
  if (content.length > 400) return { success: false, error: "댓글은 400자까지 작성할 수 있습니다." };

  const check = await checkBoardCommentOwner(commentId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await supabase
    .from("board_comments")
    .update({ content })
    .eq("id", commentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ── 댓글 삭제 ── */
export async function deleteBoardComment(commentId: string) {
  const check = await checkBoardCommentOwner(commentId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await supabase
    .from("board_comments")
    .update({ is_deleted: true })
    .eq("id", commentId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ── 이전/다음 게시글 조회 (경량 쿼리) ── */
export async function getAdjacentPosts(boardId: string, currentCreatedAt: string, currentId: string) {
  // 이전 글 (현재 글보다 나중에 작성된 글 중 가장 오래된 글 - 내림차순 기준)
  const { data: prevData } = await supabase
    .from("board_posts")
    .select("id, title, created_at")
    .eq("board_id", boardId)
    .eq("is_deleted", false)
    .gt("created_at", currentCreatedAt)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  // 다음 글 (현재 글보다 먼저 작성된 글 중 가장 최신 글 - 내림차순 기준)
  const { data: nextData } = await supabase
    .from("board_posts")
    .select("id, title, created_at")
    .eq("board_id", boardId)
    .eq("is_deleted", false)
    .lt("created_at", currentCreatedAt)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return { success: true, prev: prevData || null, next: nextData || null };
}

/** 사이드바 인기 게시물 (조회수 상위 N건만 - 목록 전체를 끌어오지 않는다) */
export async function getPopularBoardPosts(boardId: string, limit = 5) {
  const { data, error } = await supabase
    .from("board_posts")
    .select("id, title, view_count")
    .eq("board_id", boardId)
    .eq("is_deleted", false)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) return { success: false, error: error.message, data: [] };
  return { success: true, data: data || [] };
}
