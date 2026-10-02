"use server";

import { createClient } from "@supabase/supabase-js";
import { saveBoardPost } from "./board";

/**
 * 비회원 1:1 문의 접수.
 *
 * 비회원은 관리자페이지가 없어 문의내역을 다시 볼 곳이 없다. 그래서 조회 기능은 두지 않고
 * 최고관리자가 문의관리에서 휴대폰번호를 보고 직접 연락한다 (author_id 가 비어 있으면 비회원).
 * 로그인 없이 쓸 수 있는 창구라 서버에서 한 번 더 검사하고, 같은 번호의 연속 접수를 막는다.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** 같은 휴대폰번호로 이 시간 안에 이 건수 이상이면 막는다 */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
/** 창을 연 뒤 이보다 빨리 제출되면 사람이 쓴 글이 아니라고 본다 */
const MIN_FILL_MS = 3000;

export async function submitGuestInquiry(payload: {
  name: string;
  phone: string;
  email?: string;
  category: string;
  title: string;
  content: string;
  agreed: boolean;
  /** 사람 눈에는 안 보이는 칸. 채워져 있으면 봇 */
  website?: string;
  /** 창을 열고 제출하기까지 걸린 시간(ms) */
  elapsedMs: number;
}) {
  // 봇이면 성공한 것처럼 돌려보내고 저장하지 않는다
  if (payload.website || payload.elapsedMs < MIN_FILL_MS) return { success: true };

  const name = payload.name.trim();
  const digits = payload.phone.replace(/\D/g, "");
  const email = (payload.email || "").trim();
  const title = payload.title.trim();
  const content = payload.content.trim();

  if (!payload.agreed) return { success: false, error: "개인정보 수집·이용에 동의해 주세요." };
  if (!name) return { success: false, error: "이름을 입력해 주세요." };
  if (!/^01[016789]\d{7,8}$/.test(digits)) return { success: false, error: "휴대폰번호를 정확히 입력해 주세요." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: "이메일 형식을 확인해 주세요." };
  if (!title || title.length > 100) return { success: false, error: "제목을 100자 이내로 입력해 주세요." };
  if (!content || content.length > 5000) return { success: false, error: "문의 내용을 5,000자 이내로 입력해 주세요." };

  const phone = digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

  const { count } = await supabase
    .from("board_posts")
    .select("id", { count: "exact", head: true })
    .eq("board_id", "inquiry")
    .is("author_id", null)
    .eq("author_phone", phone)
    .gte("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());
  if ((count || 0) >= RATE_MAX) {
    return { success: false, error: "짧은 시간에 문의가 여러 번 접수되었습니다. 잠시 후 다시 시도해 주세요." };
  }

  const res = await saveBoardPost({
    board_id: "inquiry",
    title: payload.category ? `[${payload.category}] ${title}` : title,
    content,
    author_name: name,
    author_phone: phone,
    author_email: email,
  });
  if (!res.success) return { success: false, error: res.error || "문의 접수에 실패했습니다." };
  return { success: true };
}
