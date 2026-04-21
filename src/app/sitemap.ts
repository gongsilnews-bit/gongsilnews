import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 기본 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://gongsilnews.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // 뉴스 기사 페이지
  try {
    const { data: articles } = await supabase
      .from("articles")
      .select("id, updated_at, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1000);

    const articlePages: MetadataRoute.Sitemap = (articles || []).map((article) => ({
      url: `https://gongsilnews.com/news/${article.id}`,
      lastModified: new Date(article.updated_at || article.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...articlePages];
  } catch {
    return staticPages;
  }
}
