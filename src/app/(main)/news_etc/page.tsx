import NewsListLayout from "@/components/NewsListLayout";

export default async function NewsEtcPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const cat = typeof resolvedParams.cat === 'string' ? resolvedParams.cat : undefined;

  let displayTitle = "기타 전체보기";
  let categoryFilter = "기타";

  if (cat === "it") {
    displayTitle = "IT·가전·가구";
    categoryFilter = "IT·가전·가구";
  } else if (cat === "sports") {
    displayTitle = "스포츠·연예·Car";
    categoryFilter = "스포츠·연예·Car";
  } else if (cat === "mission") {
    displayTitle = "인물·미션·기타";
    categoryFilter = "인물·미션·기타";
  }

  return <NewsListLayout category={categoryFilter} title={displayTitle} />;
}
