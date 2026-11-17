// 공실 오류제보 (2026-11-17 사장님: "허위공실광고신고" → 직방처럼 "오류제보하기")
//  로그인한 회원만. 1:1 문의 게시판(board_posts, board_id='inquiry')에 [오류제보] 글로 넣어 최고관리자 문의관리에서 보이게 하고,
//  최고관리자와 그 공실을 등록한 회원에게 알림을 보낸다. DB 표는 새로 만들지 않는다.
//  웹(actions/vacancyReport, 쿠키 로그인) · 앱(/api/app/manage vac.report, 토큰 로그인)이 같이 쓴다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/app/actions/notification";

/** 화면에 보이는 사유 4가지 — 앱 src/lib/vacancyReport.ts 와 같은 글 */
export const REPORT_REASONS = [
  "거래 완료되었거나 의뢰가 철회된 매물입니다.",
  "매매가, 보증금, 월세 등 금액이 다릅니다.",
  "등록된 사진이 실제 매물과 다릅니다.",
  "방, 화장실 수, 구조, 방향, 옵션 및 용도 등의 정보가 다릅니다.",
] as const;

/** 알림·제목에 쓰는 짧은 사유 */
const SHORT: Record<string, string> = {
  [REPORT_REASONS[0]]: "거래완료·의뢰철회",
  [REPORT_REASONS[1]]: "금액이 다름",
  [REPORT_REASONS[2]]: "사진이 다름",
  [REPORT_REASONS[3]]: "매물 정보가 다름",
};

export async function submitVacancyReport(db: SupabaseClient, reporterId: string, vacancyId: string, reason: string): Promise<{ success: boolean; error?: string; already?: boolean }> {
  if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) return { success: false, error: "사유를 골라 주세요." };
  if (!vacancyId) return { success: false, error: "공실 번호가 없습니다." };

  const [{ data: v }, { data: me }] = await Promise.all([
    db.from("vacancies").select("id, vacancy_no, owner_id, status, sido, sigungu, dong, building_name, property_type, trade_type").eq("id", vacancyId).maybeSingle(),
    db.from("members").select("name, phone, email").eq("id", reporterId).maybeSingle(),
  ]);
  if (!v) return { success: false, error: "공실을 찾지 못했습니다." };

  const no = v.vacancy_no || "-";
  const short = SHORT[reason];
  const title = `[오류제보] 공실번호 ${no} · ${short}`;

  // 같은 사람이 같은 공실에 같은 사유로 하루 안에 다시 누르면 한 번만 (누른 횟수 = 기록 줄이 되지 않게)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db.from("board_posts").select("id", { count: "exact", head: true })
    .eq("board_id", "inquiry").eq("author_id", reporterId).eq("title", title).gte("created_at", since);
  if (count) return { success: true, already: true };

  const where = [v.sido, v.sigungu, v.dong, v.building_name].filter(Boolean).join(" ");
  const content = [
    `공실번호: ${no}`,
    `매물: ${[where, v.property_type, v.trade_type].filter(Boolean).join(" · ")}`,
    `사유: ${reason}`,
    "",
    `모바일: https://www.gongsilnews.com/m/gongsil?id=${v.id}`,
    `PC: https://www.gongsilnews.com/gongsil?id=${v.id}`,
  ].join("\n");

  const { data: post, error } = await db.from("board_posts").insert({
    board_id: "inquiry",
    author_id: reporterId,
    author_name: me?.name || "회원",
    author_phone: me?.phone || null,
    author_email: me?.email || null,
    title,
    content,
  }).select("id").single();
  if (error || !post) return { success: false, error: error?.message || "제보를 저장하지 못했습니다." };

  await createNotification({
    recipientRole: "ADMIN",
    type: "inquiry_new",
    title: "공실 오류제보가 접수되었습니다",
    body: `공실번호 ${no} · ${short} · ${me?.name || "회원"}`,
    link: "/admin?menu=inquiry_board",
    mobileLink: "/m/board?id=inquiry",
    sourceId: String(post.id),
  });
  // 등록한 회원에게도 — 직접 고치거나 광고를 내릴 수 있게 (본인이 제보한 경우는 빼고)
  if (v.owner_id && v.owner_id !== reporterId) {
    await createNotification({
      recipientId: v.owner_id,
      type: "vacancy_report",
      title: "등록하신 공실에 오류제보가 들어왔어요",
      body: `공실번호 ${no} · ${short}`,
      link: "/admin?menu=vacancy",
      mobileLink: "/m/admin/vacancy",
      sourceId: String(post.id),
    });
  }
  return { success: true };
}
