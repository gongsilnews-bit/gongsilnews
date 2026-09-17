"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { INQUIRY_PAGE_SIZE } from "@/constants/inquiry";

/**
 * 1:1 문의 전용 조회/답변 액션
 *
 * 1:1 문의는 board_posts(board_id='inquiry') + board_comments 위에 올라가 있다.
 * 전단지/매물에서 들어오는 site_inquiries 와는 성격이 달라(단발 접수 vs 글타래)
 * 별도 화면에서 다룬다.
 *
 * 상태는 board_posts.answered_at 으로 판정한다. 댓글을 전부 읽어 계산하면
 * 문의가 쌓일수록 목록 전체를 실어 날라야 해서, 답변 시각을 글에 기록해 둔다.
 *   answered_at IS NULL → 신규 / NOT NULL → 답변완료
 */

const INQUIRY_BOARD_ID = "inquiry";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type InquiryStatus = "신규" | "답변완료";

export type InquiryListItem = {
  id: string;
  post_no: number | null;
  title: string;
  category: string;
  author_id: string | null;
  author_name: string;
  author_phone: string;
  author_email: string;
  created_at: string;
  answered_at: string | null;
  reply_count: number;
  status: InquiryStatus;
};

type ListFilters = {
  authorId?: string;
  status?: InquiryStatus | "전체";
  category?: string;
  keyword?: string;
};

/** 제목 앞 [카테고리] 뱃지를 분리한다 (글쓰기 폼이 붙이는 규칙) */
function splitCategory(title: string): { category: string; clean: string } {
  const m = (title || "").match(/^\[([^\]]+)\]\s*/);
  if (!m) return { category: "", clean: title || "" };
  return { category: m[1], clean: (title || "").slice(m[0].length) };
}

/** 목록/건수가 똑같은 조건을 쓰도록 필터를 한 곳에서 건다 */
function applyFilters<T extends { eq: (c: string, v: unknown) => T; is: (c: string, v: null) => T; not: (c: string, op: string, v: null) => T; ilike: (c: string, v: string) => T; or: (v: string) => T }>(
  query: T,
  filters: ListFilters
): T {
  let q = query.eq("board_id", INQUIRY_BOARD_ID).eq("is_deleted", false);

  if (filters.authorId) q = q.eq("author_id", filters.authorId);
  if (filters.status === "신규") q = q.is("answered_at", null);
  else if (filters.status === "답변완료") q = q.not("answered_at", "is", null);

  // 카테고리는 제목 앞의 [카테고리] 뱃지로 저장된다
  if (filters.category && filters.category !== "전체") q = q.ilike("title", `[${filters.category}]%`);

  const kw = (filters.keyword || "").trim();
  if (kw) {
    const p = `%${kw}%`;
    q = q.or(`title.ilike.${p},content.ilike.${p},author_name.ilike.${p},author_phone.ilike.${p},author_email.ilike.${p}`);
  }
  return q;
}

/**
 * 1:1 문의 목록 (30건씩 페이징, 필터·검색·정렬 모두 DB 처리)
 * @param options.authorId 지정하면 그 회원의 문의만 (회원 관리자페이지용)
 */
export async function getInquiryPosts(options?: ListFilters & { page?: number }) {
  const supabase = getAdminClient();
  const filters: ListFilters = options || {};
  const page = Math.max(1, options?.page || 1);

  try {
    const from = (page - 1) * INQUIRY_PAGE_SIZE;
    const to = from + INQUIRY_PAGE_SIZE - 1;

    const base = supabase
      .from("board_posts")
      .select("id, post_no, title, author_id, author_name, author_phone, author_email, created_at, answered_at, comment_count", { count: "exact" });

    const { data: posts, count, error } = await applyFilters(base, filters)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message, data: [] as InquiryListItem[], total: 0, page };

    const data: InquiryListItem[] = (posts || []).map((p) => {
      const { category, clean } = splitCategory(p.title);
      return {
        id: p.id,
        post_no: p.post_no ?? null,
        title: clean,
        category,
        author_id: p.author_id ?? null,
        author_name: p.author_name || "",
        author_phone: p.author_phone || "",
        author_email: p.author_email || "",
        created_at: p.created_at,
        answered_at: p.answered_at ?? null,
        reply_count: p.comment_count ?? 0,
        status: p.answered_at ? "답변완료" : "신규",
      };
    });

    return { success: true, data, total: count || 0, page };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "문의 목록 조회 실패";
    return { success: false, error: message, data: [] as InquiryListItem[], total: 0, page };
  }
}

/** 상태별 건수 (목록과 같은 조건, 본문 없이 개수만 세는 HEAD 쿼리) */
export async function getInquiryCounts(options?: Omit<ListFilters, "status">) {
  const supabase = getAdminClient();
  const filters: ListFilters = options || {};

  const countOf = async (status: InquiryStatus | "전체") => {
    const base = supabase.from("board_posts").select("id", { count: "exact", head: true });
    const { count, error } = await applyFilters(base, { ...filters, status });
    if (error) throw new Error(error.message);
    return count || 0;
  };

  try {
    const [전체, 신규, 답변완료] = await Promise.all([countOf("전체"), countOf("신규"), countOf("답변완료")]);
    return { success: true, data: { 전체, 신규, 답변완료 } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "문의 건수 조회 실패";
    return { success: false, error: message, data: { 전체: 0, 신규: 0, 답변완료: 0 } };
  }
}

/** 1:1 문의 단건 (첨부/댓글 포함) */
export async function getInquiryPost(postId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("board_posts")
      .select("*, board_attachments(*), board_comments(*)")
      .eq("id", postId)
      .single();
    if (error) return { success: false, error: error.message };

    const { category, clean } = splitCategory(data.title);
    const comments = (data.board_comments || [])
      .filter((c: { is_deleted?: boolean }) => !c.is_deleted)
      .sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    return { success: true, data: { ...data, category, title: clean, board_comments: comments } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "문의 조회 실패";
    return { success: false, error: message };
  }
}

/**
 * 문의에 답변/답글 달기
 * 게시판 댓글로 저장되어 회원은 1:1 문의 게시판에서 그대로 본다.
 * 관리자가 답하면 답변완료, 작성자 본인이 다시 남기면 신규로 되돌린다.
 */
export async function replyToInquiry(payload: {
  postId: string;
  authorId?: string;
  authorName: string;
  content: string;
}) {
  const supabase = getAdminClient();
  try {
    if (!payload.content.trim()) return { success: false, error: "답변 내용을 입력해주세요." };

    const { data: post } = await supabase
      .from("board_posts")
      .select("author_id")
      .eq("id", payload.postId)
      .single();

    const { error } = await supabase.from("board_comments").insert({
      post_id: payload.postId,
      author_id: payload.authorId || null,
      author_name: payload.authorName,
      content: payload.content.trim(),
    });
    if (error) return { success: false, error: error.message };

    const isAuthorReply = !!payload.authorId && payload.authorId === post?.author_id;
    await supabase
      .from("board_posts")
      .update({ answered_at: isAuthorReply ? null : new Date().toISOString() })
      .eq("id", payload.postId);

    // comment_count 동기화 (rpc 가 없으면 무시)
    try {
      await supabase.rpc("increment_comment_count", { p_post_id: payload.postId });
    } catch {
      /* 수동 카운트 환경 */
    }

    revalidatePath(`/board_read`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "답변 등록 실패";
    return { success: false, error: message };
  }
}

/** 1:1 문의 카테고리 목록 (게시판 설정에서 읽는다) */
export async function getInquiryCategories() {
  const supabase = getAdminClient();
  const { data } = await supabase.from("boards").select("categories").eq("board_id", INQUIRY_BOARD_ID).single();
  const list = (data?.categories || "")
    .split(",")
    .map((c: string) => c.trim())
    .filter(Boolean);
  return { success: true, data: list as string[] };
}
