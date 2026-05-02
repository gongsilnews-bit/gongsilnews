import { getArticleDetail, getArticles } from "@/app/actions/article";
import { getVacancies } from "@/app/actions/vacancy";
import { createClient } from "@supabase/supabase-js";
import NewsReadContent from "@/components/NewsReadContent";
import Link from "next/link";

// 1시간 주기로 재생성 (ISR)
export const revalidate = 3600;
// 미리 구워지지 않은 경로도 동적으로 생성하도록 허용
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    // 가장 먼저 빌드되어야 할 기사들 (최근 기사 50개)
    const recentRes = await getArticles({ status: "APPROVED", limit: 50 });
    
    if (recentRes.success && recentRes.data) {
      // 숫자형 article_no를 우선 파라미터로 사용 (없으면 id)
      return recentRes.data.map((article: any) => ({
        article_id: (article.article_no || article.id).toString(),
      }));
    }
  } catch (error) {
    console.error("Failed to generate static params for articles", error);
  }
  return [];
}

import NewsDetailHeader from "../_components/NewsDetailHeader";

export default async function MobileNewsReadPage({ params }: { params: Promise<{ article_id: string }> }) {
  const resolvedParams = await params;
  const articleId = typeof resolvedParams.article_id === "string" ? resolvedParams.article_id : null;

  // 서버에서 미리 데이터 가져오기 — 즉시 표시!
  let article = null;
  let popular: any[] = [];

  if (articleId) {
    const [articleRes, popularRes] = await Promise.all([
      getArticleDetail(articleId),
      getArticles({ status: "APPROVED", limit: 50 }),
    ]);

    if (articleRes.success && articleRes.data) {
      article = articleRes.data;
    }

    if (popularRes.success && popularRes.data) {
      popular = [...popularRes.data]
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5);
    }
  }

  // 기사 없음
  if (!article) {
    return (
      <div className="flex flex-col w-full bg-white min-h-screen">
        <main className="container px-4" style={{ padding: "100px 0", textAlign: "center", color: "#888" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>기사를 찾을 수 없습니다.</div>
          <div style={{ fontSize: 14, color: "#aaa", marginBottom: 24 }}>삭제되었거나 존재하지 않는 기사입니다.</div>
        </main>
      </div>
    );
  }

  let authorRole = null;
  let authorEmail = null;
  let authorVacancies: any[] = [];

  if (article && article.author_id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    
    const { data: member } = await supabase.from("members").select("role, email").eq("id", article.author_id).single();
    if (member) {
      authorRole = member.role;
      authorEmail = member.email;
      if (member.role === "REALTOR") {
        const res = await getVacancies({ ownerId: article.author_id });
        if (res.success && res.data) {
          authorVacancies = res.data;
        }
      }
    }
  }

  // 모바일 전용 래퍼 클래스로 감싸주어 globals.css의 반응형 속성을 적용
  return (
    <div className="flex flex-col w-full bg-white min-h-screen mobile-news-detail-wrapper">
      {/* 공통 모바일 뉴스 헤더 (상단 고정) */}
      <NewsDetailHeader activeCategory={article.category} />

      <NewsReadContent article={article} popularArticles={popular} initialAuthorRole={authorRole} initialAuthorEmail={authorEmail} initialAuthorVacancies={authorVacancies} />
    </div>
  );
}
