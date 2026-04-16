import { getArticles } from "@/app/actions/article";
import HeroHeadlineRotate from "./HeroHeadlineRotate";

export default async function HeroSideContent() {
  const res = await getArticles({ status: "APPROVED", is_headline: true, limit: 10 });
  const articles = res.data || [];

  return (
    <div className="hero-right" style={{ marginTop: 0, display: "flex", flexDirection: "column", height: "100%", minHeight: 480, gap: 16 }}>
      <HeroHeadlineRotate articles={articles} />
    </div>
  );
}
