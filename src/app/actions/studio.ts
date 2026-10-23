"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";

/**
 * 공실스튜디오: 번호로 공실열람에 공개 중인 공실·경매 물건을 찾는다.
 *  - 숫자만: 공실번호(vacancy_no)
 *  - "2026-18154-001" 처럼 - 가 들어 있으면: 경매·공매 관리번호·사건번호 (공실열람 경매 화면에 보이는 번호)
 * 블로그는 공실열람의 어떤 매물로도 쓸 수 있으므로(크롬 확장과 같음) 내 공실로 한정하지 않는다.
 * 공개 화면에 나오는 값(번호·이름)만 돌려준다. 의뢰인·임대인 정보는 돌려주지 않는다.
 */
const CASE_NO_KEYS = ["cltrMngNo", "cltr_mng_no", "case_no", "caseNo"]; // auction-source API 와 같은 칸

export async function findStudioVacancyByNo(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return { success: false as const, error: "공실번호나 경매 관리번호를 입력해 주세요." };

  const supabase = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const cols = "id, vacancy_no, building_name, trade_type, property_type, sido, sigungu, dong";

  if (/^\d{1,9}$/.test(raw)) {
    const { data, error } = await supabase.from("vacancies").select(cols).eq("vacancy_no", Number(raw)).eq("status", "ACTIVE").maybeSingle();
    if (error) return { success: false as const, error: error.message };
    if (!data) return { success: false as const, error: `공실번호 ${raw} 은(는) 공실열람에 공개 중인 공실이 아닙니다.` };
    return { success: true as const, data };
  }

  for (const key of CASE_NO_KEYS) {
    const { data, error } = await supabase.from("vacancies").select(cols).eq(`metadata->>${key}`, raw).eq("status", "ACTIVE").limit(1);
    if (error) return { success: false as const, error: error.message };
    if (data && data.length) return { success: true as const, data: data[0] };
  }
  return { success: false as const, error: `${raw} 에 맞는 공실·경매 물건을 찾지 못했습니다. 공실열람에 보이는 번호를 그대로 넣어 주세요.` };
}

/**
 * 공실스튜디오: 로그인한 회원이 등록한 공실 목록 (SNS뉴스발행 공실 고르기)
 * 회원 번호를 받지 않고 로그인 쿠키로 본인을 확인한다 (남의 목록을 볼 수 없게).
 * 고르기에 필요한 값과 대표 사진만 돌려준다.
 */
export async function listMyStudioVacancies() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false as const, error: "로그인이 필요합니다." };

  const supabase = createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("vacancies")
    .select("id, vacancy_no, building_name, trade_type, property_type, sub_category, deposit, monthly_rent, sido, sigungu, dong, created_at, vacancy_photos(url, sort_order)")
    .eq("owner_id", user.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { success: false as const, error: error.message };

  return {
    success: true as const,
    data: (data || []).map((v) => {
      const photos = ((v.vacancy_photos as { url: string; sort_order: number | null }[] | null) || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return {
        id: v.id as string,
        vacancy_no: v.vacancy_no as number,
        building_name: v.building_name as string | null,
        trade_type: v.trade_type as string | null,
        property_type: (v.sub_category || v.property_type) as string | null,
        deposit: v.deposit as number | null,
        monthly_rent: v.monthly_rent as number | null,
        address: [v.sido, v.sigungu, v.dong].filter(Boolean).join(" "),
        created_at: v.created_at as string,
        photo: photos[0]?.url || null,
        photoCount: photos.length,
      };
    }),
  };
}

/* ── 동영상제작 › 대본 쓰고 편집하기 › 뉴스 기사 (2026-10-20 사장님) ──
 * 공실뉴스에 발행된 기사를 골라(또는 주소를 붙여) 영상 대본의 참고 글로 쓴다. 공개 화면에 나오는 값만 돌려준다. */
const adminSupabase = () =>
  createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
const publicArticles = () =>
  adminSupabase()
    .from("articles")
    .select("id, article_no, title, subtitle, author_name, published_at, section1")
    .eq("is_deleted", false)
    .eq("status", "APPROVED")
    .lte("published_at", new Date().toISOString());

/** 최근 기사 (검색어가 있으면 제목·부제로 찾기) — 30건 */
export async function listStudioArticles(q?: string) {
  const kw = String(q || "").trim().replace(/[%,()]/g, " ").slice(0, 40);
  let query = publicArticles();
  if (kw) query = query.or(`title.ilike.%${kw}%,subtitle.ilike.%${kw}%`);
  const { data, error } = await query.order("published_at", { ascending: false }).limit(30);
  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: (data || []).map((a) => ({ id: a.id as string, no: a.article_no as number | null, title: String(a.title || ""), author: String(a.author_name || ""), date: String(a.published_at || "").slice(0, 10) })),
  };
}

const htmlToText = (html: string) =>
  String(html || "")
    .replace(/<(script|style|figure|figcaption)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

/** 기사 한 건 — 기사 번호·id 또는 공실뉴스 기사 주소(…/news/12345) */
export async function getStudioArticle(key: string) {
  const raw = String(key || "").trim();
  const m = /gongsilnews\.com\/news\/([\w-]+)/i.exec(raw);
  const id = m ? m[1] : raw;
  if (!id || !/^[\w-]{1,40}$/.test(id)) return { success: false as const, error: "공실뉴스 기사 주소(https://www.gongsilnews.com/news/…)나 기사 번호를 넣어 주세요." };
  let query = adminSupabase().from("articles").select("id, article_no, title, subtitle, content, author_name, published_at, status, is_deleted");
  query = /^\d+$/.test(id) ? query.eq("article_no", Number(id)) : query.eq("id", id);
  const { data, error } = await query.maybeSingle();
  if (error) return { success: false as const, error: error.message };
  if (!data || data.is_deleted || data.status !== "APPROVED") return { success: false as const, error: "공실뉴스에 발행된 기사를 찾지 못했습니다." };
  return {
    success: true as const,
    data: {
      title: String(data.title || ""),
      publisher: "공실뉴스",
      publishedAt: String(data.published_at || "").slice(0, 10),
      url: `https://www.gongsilnews.com/news/${data.article_no || data.id}`,
      body: [data.subtitle ? String(data.subtitle) : "", htmlToText(String(data.content || ""))].filter(Boolean).join("\n").slice(0, 9000),
    },
  };
}

/**
 * 동영상제작 › AI 편집 › 끝 화면 (2026-10-20 사장님: 매물 광고는 표시·광고 기준에 맞게 맨 끝에 상호부터)
 * 로그인한 회원의 중개사무소 정보 — 상호 · 대표 공인중개사 · 등록번호 · 연락처 · 소재지. 없으면 빈 값 (지어내지 않음)
 */
export async function getStudioAgency() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false as const, error: "로그인이 필요합니다." };
  const { data, error } = await adminSupabase()
    .from("agencies")
    .select("name, ceo_name, reg_num, phone, cell, address, address_detail")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) return { success: false as const, error: error.message };
  const a = (data || {}) as Record<string, string | null>;
  return {
    success: true as const,
    data: {
      name: String(a.name || "").trim(),
      ceo: String(a.ceo_name || "").trim(),
      regNum: String(a.reg_num || "").trim(),
      phone: String(a.phone || a.cell || "").trim(),
      address: [a.address, a.address_detail].filter(Boolean).join(" ").trim(),
    },
  };
}
