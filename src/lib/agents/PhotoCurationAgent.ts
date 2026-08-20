import { generateWithGemini } from "./core";
import { createClient } from "@supabase/supabase-js";

// Supabase 클라이언트 (중복 이미지 조회용)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface PhotoCurationRequest {
  category: string;
  articleTitle: string;
  articleSubtitle?: string;
  articleContent?: string;
  sourceUrl?: string;
  mediaType?: "image" | "video";
  youtubeSearchQuery?: string;
}

export interface PhotoCurationResult {
  thumbnailUrl: string;
  mediaType: "image" | "video" | "stock_image";
  youtubeUrl?: string;
  sourceType: "press_photo" | "curated_stock" | "youtube_video" | "category_fallback";
  promptUsed?: string;
}

// ── 카테고리별 검증된 고화질 한국 부동산 & 비즈니스 사진 풀 (중복 방지용 다량 구비) ──
const CURATED_CATEGORY_POOLS: Record<string, string[]> = {
  "부동산정책/정치": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800", // 고층 아파트 단지
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800", // 현대적 주거 단지
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800", // 대단지 아파트 전경
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800", // 부동산 개발 & 도면
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800", // 정부/도시 전경
  ],
  "신축/분양/경매": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800", // 신축 아파트 단지
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800", // 대규모 아파트 타운
    "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800", // 모델하우스/신축 외관
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800", // 타워크레인/신축 건설 현장
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800", // 프리미엄 주거 단지
  ],
  "상가/사무실/공장/토지": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800", // 현대식 오피스 빌딩
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800", // 번화가 상가 로드숍
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800", // 상가 점포 인테리어
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800", // 물류/공장/지식산업센터
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800", // 토지/개발 부지 전경
  ],
  "공실/임대관리": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800", // 공실 오피스 공간
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800", // 오피스 타워 외관
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800", // 주거용 임대 단지
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800", // 현대식 비어있는 룸
  ],
  "세무/법률/기타": [
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800", // 세무 계산기 & 세금 서류
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800", // 법률 법원 서류/정의의 여신상
    "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800", // 계약서 서명 & 만년필
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800", // 금융/세무 전문 상담 테이블
  ],
  "경제/재테크/주식": [
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800", // 금융 화폐 & 금리
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800", // 주식 차트 & 글로벌 경제
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800", // 자산 투자 & 시장 지표
    "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&q=80&w=800", // 글로벌 금융 센터
  ],
  "중개실무/인테리어Tip": [
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800", // 프리미엄 주거 인테리어
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800", // 상가 리모델링 공간
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800", // 인테리어 설계 도면 & 줄자
    "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&q=80&w=800", // 시공 & 리노베이션
  ],
  "인물/인터뷰": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800", // 최고경영자 오피스
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800", // 대기업 본사 사옥
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800", // 현대적 이사회 회의실
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800", // 비즈니스 라운지
  ],
  "AI/NEWS": [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800", // 생성형 AI 그래픽
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800", // 첨단 반도체 칩셋
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800", // AI 데이터 네트워크
  ],
  "부동산유튜브/블로그": [
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800", // 유튜브 & 비디오 미디어
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=800", // 영상 촬영 스튜디오
  ],
  "맛집/여행/건강": [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800", // 미식 다이닝
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800", // 여행 휴양지
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800", // 건강 웰니스
  ],
  "스포츠/연예/기타": [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800", // 스포츠 경기장
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800", // 자동차 모빌리티
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800", // 문화 공연
  ]
};

export class PhotoCurationAgent {
  /**
   * 최근 50개 기사의 썸네일 URL 목록을 가져와 중복을 방지합니다.
   */
  private static async getRecentUsedImages(): Promise<Set<string>> {
    const supabase = getSupabaseClient();
    if (!supabase) return new Set();

    try {
      const { data } = await supabase
        .from("articles")
        .select("thumbnail_url")
        .not("thumbnail_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      const urls = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.thumbnail_url) urls.add(row.thumbnail_url);
      });
      return urls;
    } catch {
      return new Set();
    }
  }

  /**
   * 1순위: 기사 원문 페이지에서 실제 보도/현장 사진(조감도, 현장 사진 등) 추출
   */
  private static async extractRealPressPhoto(sourceUrl?: string): Promise<string | null> {
    if (!sourceUrl || !sourceUrl.startsWith("http")) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const html = await res.text();

      // og:image 태그 추출
      const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

      if (ogMatch && ogMatch[1]) {
        let imgUrl = ogMatch[1].trim();
        if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;

        // 구글 뉴스 로고 및 포털 아이콘 철저히 배제
        const bannedDomains = [
          "googleusercontent.com",
          "news.google.com",
          "gstatic.com",
          "daumcdn.net/top",
          "pstatic.net/static",
          "favicon",
          "logo",
          "icon",
          "default",
          "blank",
        ];

        const isBanned = bannedDomains.some((b) => imgUrl.toLowerCase().includes(b));
        if (!isBanned && imgUrl.startsWith("http")) {
          return imgUrl;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 2순위: Gemini AI를 가동하여 기사 맥락(아파트, 상가, 지산, 세무 등)에 100% 부합하는 
   * 한국 부동산 최적화 영어 비주얼 검색 프롬프트를 생성
   */
  private static async generateVisualSearchPrompt(title: string, category: string): Promise<string> {
    const prompt = `너는 대한민국 최고 언론사의 [수석 사진 에디터 AI]야.
다음 기사의 제목과 카테고리를 분석하여, Unsplash 스톡 사진 검색에 가장 완벽하게 어울리는 **영어 검색어 3~5단어**를 생성해라.

[절대 지켜야 할 규칙]
1. 아파트, 분양, 청약, 재개발 기사인 경우: 절대로 서양 오피스 빌딩(office building)을 검색하지 말고, **'modern apartment complex seoul korea residential'** 또는 **'apartment construction site crane'**으로 검색하라.
2. 상가, 권리금, 로드숍 기사인 경우: **'modern retail shop storefront seoul street'** 또는 **'store interior commercial'**로 검색하라.
3. 지식산업센터, 오피스 공실 기사인 경우: **'modern industrial tech office building'**으로 검색하라.
4. 인물/인터뷰 기사인 경우: **절대로 사람 얼굴/모델을 검색하지 말고**, **'corporate headquarters modern boardroom'** 또는 **'executive office interior'**로 검색하라.
5. 세무/법률 기사인 경우: **'tax invoice calculator legal document contract'**로 검색하라.

[입력 정보]
- 카테고리: [${category}]
- 기사 제목: "${title}"

출력은 다른 부가 설명 없이 오직 [영어 검색 키워드 3~5단어]만 출력할 것.`;

    try {
      const res = await generateWithGemini(prompt, { temperature: 0.3 });
      return res.text.replace(/["\n\r]/g, "").trim();
    } catch {
      return category.includes("아파트") || category.includes("분양")
        ? "modern apartment complex residential"
        : "modern architecture city building";
    }
  }

  /**
   * Unsplash API 실시간 검색 (최근 사용된 이미지 배제)
   */
  private static async searchFreshStockPhoto(query: string, usedUrls: Set<string>): Promise<string | null> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) return null;

    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape&client_id=${accessKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // 최근 50개 기사에 사용되지 않은 새로운 사진 우선 선택
        for (const item of data.results) {
          const rawUrl = item.urls?.regular || item.urls?.small;
          if (rawUrl) {
            const cleanUrl = `${rawUrl.split("?")[0]}?auto=format&fit=crop&q=80&w=800`;
            if (!usedUrls.has(cleanUrl)) {
              return cleanUrl;
            }
          }
        }
        // 모두 사용되었더라도 첫 번째 결과 반환
        return `${data.results[0].urls.regular.split("?")[0]}?auto=format&fit=crop&q=80&w=800`;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 3순위: 카테고리별 고화질 큐레이션 풀에서 중복되지 않은 신선한 사진 선택
   */
  private static getFallbackPhoto(category: string, usedUrls: Set<string>): string {
    const pool = CURATED_CATEGORY_POOLS[category] || CURATED_CATEGORY_POOLS["부동산정책/정치"];
    
    // 중복되지 않은 사진 탐색
    for (const img of pool) {
      if (!usedUrls.has(img)) {
        return img;
      }
    }
    // 풀 내 모든 사진이 최근에 쓰였다면 랜덤으로 1장 반환
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * 유튜브 영상 검색 및 썸네일 파싱
   */
  private static async searchYouTubeMedia(query: string): Promise<{ videoUrl: string; thumbnailUrl: string } | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const videoId = item.id.videoId;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        return {
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * ⭐️ [메인 실행 함수]
   * 기사 내용과 맥락을 완벽히 파악하여 중복 없는 최고 품질의 사진/미디어를 결정합니다.
   */
  static async resolvePhoto(req: PhotoCurationRequest): Promise<PhotoCurationResult> {
    console.log(`[PhotoCurationAgent] 📸 Resolving photo for: "${req.articleTitle}" (Category: ${req.category})`);

    // 최근 사용된 이미지 중복 체크용 캐시 로드
    const usedUrls = await this.getRecentUsedImages();

    // 1단계: 유튜브 특화 카테고리이거나 영상 요청인 경우 유튜브 검색
    if (req.mediaType === "video" || req.category === "부동산유튜브/블로그") {
      const ytQuery = req.youtubeSearchQuery || `${req.category} ${req.articleTitle.slice(0, 20)}`;
      const ytResult = await this.searchYouTubeMedia(ytQuery);
      if (ytResult) {
        return {
          thumbnailUrl: ytResult.thumbnailUrl,
          youtubeUrl: ytResult.videoUrl,
          mediaType: "video",
          sourceType: "youtube_video",
        };
      }
    }

    // 2단계: 실제 언론사/기업 배포 원문 보도 사진 1순위 추출
    const realPhoto = await this.extractRealPressPhoto(req.sourceUrl);
    if (realPhoto && !usedUrls.has(realPhoto)) {
      console.log(`  -> [1순위] 실제 보도/현장 사진 채택: ${realPhoto.slice(0, 60)}...`);
      return {
        thumbnailUrl: realPhoto,
        mediaType: "image",
        sourceType: "press_photo",
      };
    }

    // 3단계: AI 비주얼 에디터가 기사 맥락(아파트, 상가, 지산 등)에 맞는 정밀 검색 쿼리 생성
    const visualPrompt = await this.generateVisualSearchPrompt(req.articleTitle, req.category);
    console.log(`  -> [2순위] AI 생성 비주얼 프롬프트: "${visualPrompt}"`);

    const freshStock = await this.searchFreshStockPhoto(visualPrompt, usedUrls);
    if (freshStock) {
      console.log(`  -> [2순위] 정밀 스톡 사진 매칭 성공: ${freshStock.slice(0, 60)}...`);
      return {
        thumbnailUrl: freshStock,
        mediaType: "stock_image",
        sourceType: "curated_stock",
        promptUsed: visualPrompt,
      };
    }

    // 4단계: 카테고리별 고화질 큐레이션 풀에서 중복 없는 사진 매칭
    const fallbackPhoto = this.getFallbackPhoto(req.category, usedUrls);
    console.log(`  -> [3순위] 큐레이션 풀 대체 사진 매칭: ${fallbackPhoto.slice(0, 60)}...`);
    return {
      thumbnailUrl: fallbackPhoto,
      mediaType: "stock_image",
      sourceType: "category_fallback",
    };
  }
}
