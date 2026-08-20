/**
 * 미디어 헬퍼 (스마트 3단계 미디어 자동 매칭 시스템)
 * 1단계: 기업/기관 보도자료, 신제품, 분양 조감도 등 원본 배포 사진 1순위 활용
 * 2단계: 영상 중심 카테고리인 경우 관련 유튜브 공식 영상 연동
 * 3단계: 저작권 100% 안전한 상업용 무료 고화질 스톡 사진 (Unsplash) 자동 매칭
 */

const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  // 부동산 / 분양 / 정책 / 상가 / 주택
  "부동산정책/정치": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
  ],
  "세무/법률/기타": [
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
  ],
  "경제/재테크/주식": [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800",
  ],
  "AI/NEWS": [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800",
  ],
  "부동산유튜브/블로그": [
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=800",
  ],
  "공실/임대관리": [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
  ],
  "인물/인터뷰": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
  ],
  "중개실무/인테리어Tip": [
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
  ],
  "맛집/여행/건강": [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800",
  ],
  "스포츠/연예/기타": [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800",
  ],
  "신축/분양/경매": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
  ],
  "상가/사무실/공장/토지": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
  ],
};

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
];

// 단순 로고 또는 제외할 기본 썸네일 패턴
const EXCLUDE_IMAGE_PATTERNS = [
  "googleusercontent.com",
  "google.com",
  "gstatic.com",
  "daumcdn.net/thumb",
  "sstatic.naver.net",
  "logo",
  "favicon",
  "default",
  "blank.gif",
  "placeholder",
  "icon",
  "banner",
  "btn_",
  "common",
  "og_default",
  "no_image",
  "empty"
];

/**
 * 원본 뉴스 기사 URL에서 대표 이미지(og:image / twitter:image) 추출
 */
export async function extractSourceOgImage(url: string): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  // 구글 뉴스 RSS 리다이렉트 링크는 구글 로고가 반환되므로 스킵하고 스톡/유튜브로 대체
  if (url.includes("news.google.com") || url.includes("google.com")) return null;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(3500),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
      || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

    if (ogMatch && ogMatch[1]) {
      let imgUrl = ogMatch[1].trim();

      // 상대 경로를 절대 경로로 변환
      if (imgUrl.startsWith("//")) {
        imgUrl = "https:" + imgUrl;
      } else if (imgUrl.startsWith("/")) {
        const urlObj = new URL(url);
        imgUrl = `${urlObj.origin}${imgUrl}`;
      }

      // 로고나 아이콘 등 부적절한 이미지 필터링
      const lower = imgUrl.toLowerCase();
      const isExcluded = EXCLUDE_IMAGE_PATTERNS.some(pat => lower.includes(pat));
      if (!isExcluded && (imgUrl.startsWith("http://") || imgUrl.startsWith("https://"))) {
        return imgUrl;
      }
    }
  } catch (e: any) {
    // console.warn(`[extractSourceOgImage] Failed to extract from ${url}:`, e.message);
  }

  return null;
}

/**
 * 1. 무료 고화질 스톡 이미지(Unsplash) 검색
 */
export async function searchStockImage(imageKeyword: string, category: string): Promise<string> {
  const cleanKeyword = (imageKeyword || "").replace(/[^\w\s]/gi, " ").trim();
  
  if (cleanKeyword) {
    try {
      const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(cleanKeyword)}&per_page=5`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (results.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(results.length, 3));
          const photo = results[randomIndex];
          const imgUrl = photo?.urls?.regular || photo?.urls?.small;
          if (imgUrl) {
            return `${imgUrl}&auto=format&fit=crop&q=80&w=800`;
          }
        }
      }
    } catch (e: any) {
      console.warn(`[searchStockImage] Unsplash search failed for keyword "${cleanKeyword}":`, e.message);
    }
  }

  // 2. 검색 실패 시 카테고리 큐레이션 풀에서 랜덤 선택
  const pool = CATEGORY_FALLBACK_IMAGES[category] || DEFAULT_IMAGES;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return picked;
}

/**
 * 2. 관련 유튜브 공식 영상 검색
 */
export async function searchYouTubeVideo(query: string): Promise<{ youtubeUrl: string; thumbnailUrl: string } | null> {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) return null;

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        const videoId = match[1];
        return {
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    }
  } catch (e: any) {
    console.warn(`[searchYouTubeVideo] YouTube search failed for query "${cleanQuery}":`, e.message);
  }

  return null;
}

/**
 * 3. 스마트 3단계 미디어 해석기 (하이브리드)
 * 1순위: 기업/기관 보도자료/신제품 원본 배포 사진
 * 2순위: 영상 카테고리 관련 유튜브 영상
 * 3순위: 상업용 무료 고화질 스톡 사진 (Unsplash)
 */
export async function resolveArticleMedia(params: {
  category: string;
  mediaType?: "image" | "video";
  sourceUrl?: string;
  useOriginalPhoto?: boolean;
  imageKeyword?: string;
  youtubeSearchQuery?: string;
  articleTitle?: string;
}): Promise<{ thumbnailUrl: string; youtubeUrl: string | null; isOriginalPhoto: boolean }> {
  const { category, mediaType, sourceUrl, useOriginalPhoto, imageKeyword, youtubeSearchQuery, articleTitle } = params;

  // 1단계: 기업/기관 보도자료 배포 사진이 요청되었거나 원본 URL이 있는 경우
  if ((useOriginalPhoto || category.includes("IT") || category.includes("스포츠") || category.includes("정책")) && sourceUrl) {
    const originalPhoto = await extractSourceOgImage(sourceUrl);
    if (originalPhoto) {
      return {
        thumbnailUrl: originalPhoto,
        youtubeUrl: null,
        isOriginalPhoto: true,
      };
    }
  }

  // 2단계: 영상 특화 카테고리이거나 AI가 video를 추천한 경우 유튜브 검색
  const isVideoFocusedCategory = category === "부동산유튜브/블로그" || category === "AI/NEWS" || mediaType === "video";

  if (isVideoFocusedCategory) {
    const ytQuery = youtubeSearchQuery || articleTitle || category;
    const ytResult = await searchYouTubeVideo(ytQuery);
    if (ytResult) {
      return {
        youtubeUrl: ytResult.youtubeUrl,
        thumbnailUrl: ytResult.thumbnailUrl,
        isOriginalPhoto: false,
      };
    }
  }

  // 3단계: 고화질 상업용 무료 스톡 사진 자동 매칭
  const stockImgUrl = await searchStockImage(imageKeyword || articleTitle || category, category);
  return {
    youtubeUrl: null,
    thumbnailUrl: stockImgUrl,
    isOriginalPhoto: false,
  };
}
