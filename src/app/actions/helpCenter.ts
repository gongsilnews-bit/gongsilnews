"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { INQUIRY_PHOTO_LIMIT } from "@/constants/inquiry";

/**
 * 고객센터(/help) 데이터.
 *
 * FAQ 는 board_posts(board_id='faq') 에 관리자만 쓰고, 1:1 문의는 기존
 * board_posts(board_id='inquiry') 비밀글을 그대로 쓴다. 두 게시판은 분류를
 * 같은 이름으로 맞춰 두었고, 분류는 제목 앞 [분류] 로 저장된다.
 * 내 문의 목록은 고객센터에 두지 않고 각자의 관리자 페이지 1:1문의 메뉴로 보낸다.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FAQ_BOARD_ID = "faq";

export type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export type HelpCenterData = {
  categories: string[];
  faqs: FaqItem[];
  /** 로그인 회원의 PC "내 문의내역" 주소. null = 비로그인 */
  myInquiryUrl: string | null;
  /** 문의 창 자동 채움용 회원 정보. null = 비로그인 */
  member: { id: string; name: string; phone: string; email: string } | null;
  /** 문의 사진 첨부 허용 장수 (게시판 설정) */
  inquiryMaxPhotos: number;
  isAdmin: boolean;
};

function splitCategory(title: string): { category: string; clean: string } {
  const m = (title || "").match(/^\[([^\]]+)\]\s*/);
  if (!m) return { category: "", clean: title || "" };
  return { category: m[1], clean: (title || "").slice(m[0].length) };
}

export async function getHelpCenterData(): Promise<HelpCenterData> {
  const server = await createServerClient();
  const { data: { user } } = await server.auth.getUser();

  const [boardRes, faqRes, memberRes, inquiryBoardRes] = await Promise.all([
    supabase.from("boards").select("categories").eq("board_id", FAQ_BOARD_ID).maybeSingle(),
    // 고정(is_notice)한 질문이 맨 위, 나머지는 먼저 등록한 순서대로
    supabase
      .from("board_posts")
      .select("id, title, content")
      .eq("board_id", FAQ_BOARD_ID)
      .eq("is_deleted", false)
      .order("is_notice", { ascending: false })
      .order("created_at", { ascending: true }),
    user
      ? supabase.from("members").select("role, name, phone, email").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("boards").select("max_photos").eq("board_id", "inquiry").maybeSingle(),
  ]);

  const role = String(memberRes.data?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN" || role.includes("관리자");

  const categories = (boardRes.data?.categories || "")
    .split(",")
    .map((c: string) => c.trim())
    .filter(Boolean);

  const faqs: FaqItem[] = (faqRes.data || []).map((p) => {
    const { category, clean } = splitCategory(p.title);
    return { id: String(p.id), category, question: clean, answer: p.content || "" };
  });

  // 중개사는 부동산 관리자, 그 외 회원은 일반회원 관리자 페이지에 1:1문의 메뉴가 있다
  const myInquiryUrl = user
    ? `/${role === "REALTOR" ? "realty_admin" : isAdmin ? "admin" : "user_admin"}?menu=inquiry_board`
    : null;

  const member = user
    ? {
        id: user.id,
        name: memberRes.data?.name || "",
        phone: memberRes.data?.phone || "",
        email: memberRes.data?.email || user.email || "",
      }
    : null;

  const inquiryMaxPhotos = Math.max(0, Math.min(INQUIRY_PHOTO_LIMIT, inquiryBoardRes.data?.max_photos ?? INQUIRY_PHOTO_LIMIT));

  return { categories, faqs, myInquiryUrl, isAdmin, member, inquiryMaxPhotos };
}
