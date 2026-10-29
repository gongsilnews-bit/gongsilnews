import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";
import { FEATURES } from "@/components/studio-site/studioFeatures";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 실제 주소는 www 가 붙은 쪽 (gongsilnews.com 은 www 로 넘어간다)
const SITE = "https://www.gongsilnews.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 기본 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // 공실마케팅 소개 페이지 — 네이버·구글에서 "공실마케팅" 으로 찾히게
  const marketingPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/marketing`, changeFrequency: "weekly", priority: 0.9 },
    ...["pricing", "benefits", "guide", "resources", "community", "apply"].map((p) => ({
      url: `${SITE}/marketing/${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...FEATURES.map((f) => ({
      url: `${SITE}/marketing/feature/${f.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // 뉴스 기사 페이지 (발행된 기사는 status APPROVED)
  try {
    const { data: articles } = await supabase
      .from("articles")
      .select("id, article_no, updated_at, created_at")
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(1000);

    const articlePages: MetadataRoute.Sitemap = (articles || []).map((article) => ({
      url: `${SITE}/news/${article.article_no || article.id}`,
      lastModified: new Date(article.updated_at || article.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...marketingPages, ...articlePages];
  } catch {
    return [...staticPages, ...marketingPages];
  }
}
