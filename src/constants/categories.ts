export interface CategoryOption {
  value: string;
  label: string;
}

export const BANNER_TARGET_CATEGORIES: CategoryOption[] = [
  { value: "all", label: "전체뉴스" },
  { value: "gongsil", label: "공실뉴스" },
  { value: "politics", label: "부동산·경제" },
  { value: "marketing", label: "AI마케팅" },
  { value: "etc", label: "라이프·오피니언" },
];

export function matchCategory(targets: string[], category: string): boolean {
  if (targets.includes("all")) return true;
  
  const normalizedCategory = category.toLowerCase().trim();
  
  const mapping: Record<string, string[]> = {
    "all": ["all"],
    "공실뉴스": ["gongsil", "공실뉴스", "news_gongsil"],
    "news_gongsil": ["gongsil", "공실뉴스", "news_gongsil"],
    "부동산·경제": ["politics", "부동산·경제", "news_politics"],
    "news_politics": ["politics", "부동산·경제", "news_politics"],
    "ai마케팅": ["marketing", "ai마케팅", "news_marketing"],
    "news_marketing": ["marketing", "ai마케팅", "news_marketing"],
    "라이프·오피니언": ["etc", "라이프·오피니언", "news_etc"],
    "news_etc": ["etc", "라이프·오피니언", "news_etc"],
    
    // Legacy support
    "부동산·주식·재테크": ["finance", "부동산·주식·재테크", "news_finance"],
    "news_finance": ["finance", "부동산·주식·재테크", "news_finance"],
    "우리동네뉴스": ["map", "우리동네뉴스", "news_map"],
    "news_map": ["map", "우리동네뉴스", "news_map"],
    "세무·법률": ["law", "세무·법률", "news_law"],
    "news_law": ["law", "세무·법률", "news_law"],
    "여행·건강·생활": ["life", "여행·건강·생활", "news_life"],
    "news_life": ["life", "여행·건강·생활", "news_life"],
    "it·가전·가구": ["etc_it", "it·가전·가구"],
    "스포츠·연예·car": ["etc_sports", "스포츠·연예·car"],
    "인물·미션·기타": ["etc_mission", "인물·미션·기타"],
  };

  const allowedTargets = mapping[normalizedCategory] || [normalizedCategory];
  return targets.some(target => allowedTargets.includes(target.toLowerCase().trim()));
}
