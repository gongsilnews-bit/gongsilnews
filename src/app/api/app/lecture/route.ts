// 앱 부동산특강 강의실 (2026-11-19 사장님: 강의는 앱에서 보고, 웹 화면으로 넘기지 않는다)
//  POST { action, id } · Authorization: Bearer <access_token> — 로그인 확인은 /api/app/auth.ts 의 whoAmI
//   status → { enrolled, canEnroll, free, membersOnly, needPoints }   (강의 상세 아래 단추 글자용)
//   enroll → 무료 강의(가격 0 · 내 등급으로 무료)만 수강 등록. 포인트가 드는 강의는 앱에서 받지 않는다 (앱에 결제 안내 없음 규칙)
//   room   → 강의실: 목차 + 모든 강의 영상 주소. 사이트 강의실(m/study_watch)과 같은 입장 규칙
//            수강 중 · 강의를 만든 사람 · 최고관리자 · 무료 강의
//  규칙은 사이트와 같은 함수(checkEnrollment · enrollLecture · getMyLectureAccess)를 그대로 쓴다
import { NextRequest, NextResponse } from "next/server";
import { checkEnrollment, enrollLecture, getLectureDetail, getMyLectureAccess } from "@/app/actions/lecture";
import { no, whoAmI } from "../auth";

type Lesson = { id: string; title: string; duration: string | null; is_preview: boolean; sort_order: number | null; video_url: string | null };

const priceOf = (l: { discount_price?: number | null; price?: number | null }) => l.discount_price || l.price || 0;

// GET ?id= → 특강 상세의 [강사]·[후기] 탭 (로그인 없이 누구나 — 사이트 특강 상세와 같은 내용, 2026-11-19)
//   { instructor_photo, description_html(AI 소개를 다듬은 것), short_description, keywords, reviews: [{ id, user_name, user_avatar, rating, content, created_at }] }
export async function GET(req: NextRequest) {
  const id = String(req.nextUrl.searchParams.get("id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return no("특강을 찾지 못했습니다.", 404);
  const d = await getLectureDetail(id);
  if (!d.success || !d.data) return no("특강을 불러오지 못했습니다.", 404);
  const L = d.data as { instructor_photo?: string | null; description_html?: string | null; short_description?: string | null; keywords?: unknown; sidebar_copy?: { keywords?: unknown } | null; reviews?: { id: string; user_name?: string | null; user_avatar?: string | null; rating: number; content: string; created_at: string }[] };
  const reviews = (L.reviews || []).map((r) => ({ id: r.id, user_name: r.user_name || "익명", user_avatar: r.user_avatar || null, rating: r.rating, content: r.content, created_at: r.created_at }));
  // 제목 아래 회색 한 줄 설명 · 녹색 딱지 (사이트 모바일 특강 상세와 같은 자료)
  const kw = Array.isArray(L.keywords) ? L.keywords : Array.isArray(L.sidebar_copy?.keywords) ? L.sidebar_copy!.keywords as unknown[] : [];
  const keywords = kw.filter((x): x is string => typeof x === "string" && !!x.trim());
  return NextResponse.json({ success: true, instructor_photo: L.instructor_photo || null, description_html: L.description_html || null, short_description: L.short_description || null, keywords, reviews });
}

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const body = (await req.json().catch(() => ({}))) as { action?: string; id?: string };
  const id = String(body.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return no("특강을 찾지 못했습니다.", 404);
  const { data: lec } = await me.db.from("lectures").select("id, author_id, price, discount_price, status, is_deleted").eq("id", id).maybeSingle();
  if (!lec || lec.is_deleted) return no("특강을 찾지 못했습니다.", 404);
  const uid = me.user.id;

  const access = async () => {
    const en = await checkEnrollment(id, uid);
    if (en.success && en.enrolled) return { enrolled: true, ok: true };
    return { enrolled: false, ok: lec.author_id === uid || me.isAdmin || priceOf(lec) <= 0 };
  };

  if (body.action === "status") {
    const [a, my] = await Promise.all([access(), getMyLectureAccess(id, uid)]);
    const needPoints = !my.free && priceOf(lec) > 0;
    return NextResponse.json({ success: true, enrolled: a.enrolled, free: my.free, membersOnly: my.membersOnly, needPoints, canEnroll: !a.enrolled && !needPoints && !(my.membersOnly && !my.free) });
  }

  if (body.action === "enroll") {
    if (lec.status !== "ACTIVE") return no("지금은 신청할 수 없는 특강입니다.");
    const [a, my] = await Promise.all([access(), getMyLectureAccess(id, uid)]);
    if (a.enrolled) return NextResponse.json({ success: true, already: true });
    if (my.membersOnly && !my.free) return no("공실뉴스부동산 회원 전용 특강입니다.");
    if (!my.free && priceOf(lec) > 0) return no("이 특강은 포인트가 필요해 앱에서는 신청할 수 없어요.");
    const r = await enrollLecture(id, uid);
    if (!r.success) return no(("error" in r && r.error) || "수강 등록에 실패했습니다.");
    return NextResponse.json({ success: true });
  }

  if (body.action === "room") {
    const a = await access();
    if (!a.ok) return no("수강 등록이 필요한 특강입니다.", 403);
    const d = await getLectureDetail(id);
    if (!d.success || !d.data) return no("특강을 불러오지 못했습니다.");
    const L = d.data as { title: string; instructor_name?: string | null; chapters?: { id: string; title: string; sort_order: number | null; lessons?: Lesson[] }[] };
    const chapters = (L.chapters || []).map((c) => ({
      id: c.id, title: c.title, sort_order: c.sort_order,
      lessons: (c.lessons || []).map((x) => ({ id: x.id, title: x.title, duration: x.duration, is_preview: x.is_preview, sort_order: x.sort_order, video_url: x.video_url || null })),
    }));
    return NextResponse.json({ success: true, title: L.title, instructor: L.instructor_name || null, chapters }, { headers: { "Cache-Control": "no-store" } });
  }

  return no("알 수 없는 요청입니다.");
}
