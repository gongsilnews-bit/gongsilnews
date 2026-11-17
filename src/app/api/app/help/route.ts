// 안드로이드 앱 1:1 문의 (사이트 모바일 /m/help 와 같은 내용을 앱 화면으로, 2026-11-18)
//  자주 묻는 질문은 누구나 읽고, 문의는 회원·비회원 모두 남긴다 — 저장은 사이트와 같은 함수
//  (saveBoardPost · submitGuestInquiry · uploadBoardAttachment) 라 관리자 문의관리·알림이 그대로 같다.
//
//  POST { action: "get" }                       → 분류 · 자주 묻는 질문 · 사진 장수 · (로그인 시) 문의자 정보
//  POST { action: "submit", category, title, content, name, phone, email, agreed?, elapsedMs? }
//       로그인 토큰이 있으면 회원 문의(본인 이름으로), 없으면 비회원 문의(휴대폰번호·동의 필수) → { postId? }
//  POST multipart { action: "upload", post_id, sort_order, file } → 회원 본인 문의에만 사진 1장
//  POST { action: "mine" }                      → 내 문의 목록 (내용 · 사진 · 답변)
import { NextRequest, NextResponse } from "next/server";
import { saveBoardPost, uploadBoardAttachment } from "@/app/actions/board";
import { submitGuestInquiry } from "@/app/actions/guestInquiry";
import { INQUIRY_PHOTO_LIMIT } from "@/constants/inquiry";
import { adminDb, no, whoAmI } from "../auth";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** 제목 앞 [분류] 떼기 (사이트 고객센터와 같은 규칙) */
function splitCategory(title: string) {
  const m = (title || "").match(/^\[([^\]]+)\]\s*/);
  return m ? { category: m[1], title: title.slice(m[0].length) } : { category: "", title: title || "" };
}

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);

  // ── 사진 1장 (회원 본인 문의에만) ──
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    if (!me) return no("로그인이 필요합니다.", 401);
    const form = await req.formData();
    if (String(form.get("action") || "") !== "upload") return no("알 수 없는 요청입니다.");
    const postId = str(form.get("post_id"), 64);
    const file = form.get("file");
    if (!postId || !(file instanceof File)) return no("사진 또는 문의 번호가 없습니다.");
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return no("10MB 이하 사진만 올릴 수 있습니다.");
    const { data: post } = await me.db.from("board_posts").select("author_id, board_id").eq("id", postId).maybeSingle();
    if (!post || post.board_id !== "inquiry" || post.author_id !== me.user.id) return no("내 문의에만 사진을 붙일 수 있습니다.", 403);
    const { count } = await me.db.from("board_attachments").select("id", { count: "exact", head: true }).eq("post_id", postId);
    if ((count || 0) >= INQUIRY_PHOTO_LIMIT) return no(`사진은 ${INQUIRY_PHOTO_LIMIT}장까지입니다.`);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("post_id", postId);
    fd.append("sort_order", String(Number(form.get("sort_order")) || 0));
    const r = await uploadBoardAttachment(fd);
    return r.success ? ok({ url: r.url }) : no(r.error || "사진을 올리지 못했습니다.", 500);
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const db = me?.db || adminDb();

  // ── 고객센터 내용 ──
  if (action === "get") {
    const [faqBoard, faqRes, inquiryBoard] = await Promise.all([
      db.from("boards").select("categories").eq("board_id", "faq").maybeSingle(),
      db.from("board_posts").select("id, title, content").eq("board_id", "faq").eq("is_deleted", false)
        .order("is_notice", { ascending: false }).order("created_at", { ascending: true }),
      db.from("boards").select("max_photos").eq("board_id", "inquiry").maybeSingle(),
    ]);
    const categories = String(faqBoard.data?.categories || "").split(",").map((c) => c.trim()).filter(Boolean);
    const faqs = (faqRes.data || []).map((p) => {
      const { category, title } = splitCategory(p.title);
      return { id: String(p.id), category, question: title, answer: String(p.content || "") };
    });
    const maxPhotos = Math.max(0, Math.min(INQUIRY_PHOTO_LIMIT, inquiryBoard.data?.max_photos ?? INQUIRY_PHOTO_LIMIT));
    let member = null;
    if (me) {
      const { data: m } = await db.from("members").select("name, phone, email").eq("id", me.user.id).maybeSingle();
      member = { name: m?.name || "", phone: m?.phone || "", email: m?.email || me.user.email || "" };
    }
    return ok({ categories, faqs, maxPhotos, member });
  }

  // ── 문의 남기기 ──
  if (action === "submit") {
    const category = str(body?.category, 40);
    const title = str(body?.title, 100);
    const content = str(body?.content, 5000);
    const name = str(body?.name, 40);
    const phone = str(body?.phone, 20);
    const email = str(body?.email, 120);
    if (!title) return no("제목을 입력해 주세요.");
    if (!content) return no("문의 내용을 입력해 주세요.");

    if (!me) {
      const r = await submitGuestInquiry({
        name, phone, email, category, title, content,
        agreed: !!body?.agreed, website: "", elapsedMs: Number(body?.elapsedMs) || 0,
      });
      return r.success ? ok() : no(r.error || "문의 접수에 실패했습니다.");
    }

    if (!phone && !email) return no("답변을 받으실 연락처나 이메일을 입력해 주세요.");
    const r = await saveBoardPost({
      board_id: "inquiry",
      title: category ? `[${category}] ${title}` : title,
      content,
      author_id: me.user.id,
      author_name: name || me.member.name || (me.user.email || "").split("@")[0] || "회원",
      author_phone: phone,
      author_email: email,
    });
    return r.success && r.postId ? ok({ postId: String(r.postId) }) : no(r.error || "문의 접수에 실패했습니다.", 500);
  }

  // ── 내 문의 목록 ──
  if (action === "mine") {
    if (!me) return no("로그인이 필요합니다.", 401);
    const { data, error } = await db.from("board_posts")
      .select("id, title, content, created_at, answered_at, board_attachments(file_url, sort_order), board_comments(id, author_id, author_name, content, created_at, is_deleted)")
      .eq("board_id", "inquiry").eq("author_id", me.user.id).eq("is_deleted", false)
      .order("created_at", { ascending: false }).limit(100);
    if (error) return no(error.message, 500);
    const uid = me.user.id;
    const items = (data || []).map((p) => {
      const { category, title } = splitCategory(p.title);
      const photos = [...(p.board_attachments || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((a) => a.file_url);
      const replies = (p.board_comments || []).filter((c) => !c.is_deleted)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((c) => ({ id: String(c.id), mine: c.author_id === uid, name: c.author_name || "", content: c.content || "", created_at: c.created_at }));
      return { id: String(p.id), category, title, content: p.content || "", created_at: p.created_at, answered: !!p.answered_at || replies.some((r) => !r.mine), photos, replies };
    });
    return ok({ items });
  }

  return no("알 수 없는 요청입니다.");
}
