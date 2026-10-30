"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";

/**
 * 공실마케팅: 번호로 공실열람에 공개 중인 공실·경매 물건을 찾는다.
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
 * 공실마케팅: 로그인한 회원이 등록한 공실 목록 (SNS뉴스발행 공실 고르기)
 * 회원 번호를 받지 않고 로그인 쿠키로 본인을 확인한다 (남의 목록을 볼 수 없게).
 * 고르기에 필요한 값과 대표 사진만 돌려준다.
 */
/** includeId — 광고종료 등 광고중이 아닌 내 공실도 이것 하나는 목록에 넣는다 (공실관리 표에서 그 공실을 눌러 들어올 때, 2026-10-30 사장님) */
export async function listMyStudioVacancies(includeId?: string) {
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
  if (includeId && /^[\w-]{8,64}$/.test(includeId) && !(data || []).some((v) => v.id === includeId)) {
    const { data: one } = await supabase
      .from("vacancies")
      .select("id, vacancy_no, building_name, trade_type, property_type, sub_category, deposit, monthly_rent, sido, sigungu, dong, created_at, vacancy_photos(url, sort_order)")
      .eq("owner_id", user.id)
      .eq("id", includeId)
      .maybeSingle();
    if (one) (data || []).unshift(one);
  }

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
    .select("id, article_no, title, subtitle, author_name, published_at, section1, thumbnail_url")
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

/**
 * 내 기사·칼럼 (2026-10-30 사장님: 포토앱 새로 만들기에서 모든 기사가 아니라 내가 쓴 것만)
 * 로그인 쿠키로 본인을 확인한다. 발행된(APPROVED) 내 글만, 최근 것부터
 */
export async function listMyStudioArticles(q?: string) {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false as const, error: "로그인이 필요합니다." };
  const kw = String(q || "").trim().replace(/[%,()]/g, " ").slice(0, 40);
  let query = publicArticles().eq("author_id", user.id);
  if (kw) query = query.or(`title.ilike.%${kw}%,subtitle.ilike.%${kw}%`);
  const { data, error } = await query.order("published_at", { ascending: false }).limit(50);
  if (error) return { success: false as const, error: error.message };
  return {
    success: true as const,
    data: (data || []).map((a) => ({ id: a.id as string, no: a.article_no as number | null, title: String(a.title || ""), author: String(a.author_name || ""), date: String(a.published_at || "").slice(0, 10), thumb: (a.thumbnail_url as string | null) || null })),
  };
}

/** 내 기사 한 건에 쓴 사진들 — 대표 사진 + 본문 사진 (포토앱 새로 만들기의 배경 고르기, 2026-10-30 사장님). 내 글만 */
export async function getMyStudioArticlePhotos(id: string) {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false as const, error: "로그인이 필요합니다." };
  if (!/^[\w-]{1,40}$/.test(String(id || ""))) return { success: false as const, error: "기사를 찾지 못했습니다." };
  const { data, error } = await adminSupabase().from("articles").select("thumbnail_url, content").eq("id", id).eq("author_id", user.id).maybeSingle();
  if (error) return { success: false as const, error: error.message };
  if (!data) return { success: false as const, error: "내 기사를 찾지 못했습니다." };
  const inBody = [...String(data.content || "").matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
  const urls = [...new Set([data.thumbnail_url as string | null, ...inBody].filter((u): u is string => Boolean(u) && /^https:\/\//.test(u!)))].slice(0, 24);
  return { success: true as const, data: urls };
}

/**
 * 내 AI 매물보고서 — 내 공실로 저장한 보고서 (vacancy_flyers.flyer_state.report), 최근 것부터 (2026-10-30 사장님: 홈 카드)
 * thumb = 저장할 때 찍은 표지 그림, 없으면 공실 대표 사진
 */
export async function listMyStudioReports(type: "report" | "flyer" = "report") {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return { success: false as const, error: "로그인이 필요합니다." };
  const db = adminSupabase();
  const { data: vacs, error } = await db.from("vacancies").select("id, vacancy_no, building_name, property_type, dong, trade_type, vacancy_photos(url, sort_order)").eq("owner_id", user.id).eq("status", "ACTIVE").limit(300); // 보고서·홍보지에서 열 수 있는 공실만
  if (error) return { success: false as const, error: error.message };
  const ids = (vacs || []).map((v) => v.id as string);
  if (!ids.length) return { success: true as const, data: [] };
  // 보고서 전체(쪽마다 그림·HTML, 수 MB)는 받지 않고 표지 그림과 "보고서 있음" 표시만 (2026-10-30 — 1.1초 → 0.2초)
  const { data: fl } = await db.from("vacancy_flyers").select(`vacancy_id, updated_at, cover:flyer_state->${type}->>coverThumb, layout:flyer_state->${type}->>layoutTheme`).in("vacancy_id", ids);
  const out = ((fl || []) as unknown as { vacancy_id: string; updated_at: string | null; cover: string | null; layout: string | null }[]).flatMap((f) => {
    const rep = f.layout != null || f.cover != null ? { coverThumb: f.cover || "" } : null;
    if (!rep) return [];
    const v = (vacs || []).find((x) => x.id === f.vacancy_id);
    if (!v) return [];
    const photos = ((v.vacancy_photos as { url: string; sort_order: number | null }[] | null) || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const name = [v.dong, v.building_name || v.property_type].filter(Boolean).join(" ") || "매물보고서";
    return [{ id: v.id as string, no: v.vacancy_no as number, title: name, updatedAt: String(f.updated_at || ""), thumb: (typeof rep.coverThumb === "string" && rep.coverThumb.startsWith("data:image/") ? rep.coverThumb : photos[0]?.url) || "" }];
  });
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { success: true as const, data: out.slice(0, 30) };
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
/** 명함에 찍을 짧은 SNS 주소 — 인스타·유튜브·스레드는 @아이디, 나머지는 주소에서 https://·www. 를 뗀 것 */
function snsShort(key: string, url: string) {
  const u = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").replace(/\?.*$/, "");
  const last = u.split("/").filter(Boolean).pop() || "";
  if (["instagram", "threads", "youtube", "twitter"].includes(key) && u.includes("/") && last) return `@${last.replace(/^@/, "")}`;
  return u;
}
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
  // 명함 QR·SNS (2026-10-30 사장님) — 홈페이지는 물건접수홈페이지(켜 둔 것) 먼저, 없으면 정보설정의 홈페이지 주소.
  // SNS 는 정보설정 › 마케팅 정보의 주소만 (로그인 정보는 절대 내보내지 않는다)
  const [{ data: hs }, { data: mem }] = await Promise.all([
    adminSupabase().from("homepage_settings").select("subdomain, is_active").eq("owner_id", user.id).maybeSingle(),
    adminSupabase().from("members").select("sns_links").eq("id", user.id).maybeSingle(),
  ]);
  const links = ((mem as { sns_links?: Record<string, unknown> } | null)?.sns_links || {}) as Record<string, unknown>;
  const urlOf = (k: string) => {
    const v = links[k];
    return String((typeof v === "string" ? v : (v as { url?: string } | null)?.url) || "").trim();
  };
  const sub = (hs as { subdomain?: string; is_active?: boolean } | null);
  const homepage = sub?.subdomain && sub.is_active !== false ? `https://${sub.subdomain}.gongsilnews.com` : urlOf("homepage");
  const sns = ["blog", "instagram", "youtube", "kakao", "cafe", "threads", "facebook", "twitter"]
    .map((k) => [k, urlOf(k)])
    .filter(([, u]) => /^https?:\/\/|^[\w-]+\./i.test(u))
    .map(([k, u]) => `${k}|${snsShort(k, u)}`)
    .join("\n");
  return {
    success: true as const,
    data: {
      name: String(a.name || "").trim(),
      ceo: String(a.ceo_name || "").trim(),
      regNum: String(a.reg_num || "").trim(),
      phone: String(a.phone || a.cell || "").trim(),
      address: [a.address, a.address_detail].filter(Boolean).join(" ").trim(),
      homepage,
      sns,
    },
  };
}
