import { GoogleGenAI, Modality } from "@google/genai";
import { generateWithGemini } from "./core";
import { logAiUsage } from "./logger";
import { createClient } from "@supabase/supabase-js";

// Supabase 클라이언트
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
  userEmail?: string;
}

export interface PhotoCurationResult {
  thumbnailUrl: string;
  mediaType: "image" | "video" | "stock_image";
  youtubeUrl?: string;
  sourceType: "press_photo" | "curated_stock" | "nano_banana_ai" | "youtube_video" | "category_fallback";
  promptUsed?: string;
}

// ── 카테고리별 검증된 고화질 한국 부동산 & 비즈니스 사진 풀 ──
const CURATED_CATEGORY_POOLS: Record<string, string[]> = {
  "부동산정책/정치": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800",
  ],
  "신축/분양/경매": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800",
  ],
  "상가/사무실/공장/토지": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
  ],
  "공실/임대관리": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
  ],
  "세무/법률/기타": [
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800",
  ],
  "경제/재테크/주식": [
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800",
  ],
  "중개실무/인테리어Tip": [
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800",
  ],
  "인물/인터뷰": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
  ],
  "AI/NEWS": [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
  ],
  "부동산유튜브/블로그": [
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=800",
  ],
  "맛집/여행/건강": [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
  ],
  "스포츠/연예/기타": [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
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
   * 2순위: 기사 맥락에 맞는 한국 부동산 최적화 영어 검색어 생성
   */
  private static async generateVisualSearchPrompt(title: string, category: string): Promise<string> {
    const prompt = `너는 대한민국 최고 언론사의 [수석 사진 에디터 AI]야.
다음 기사의 제목과 카테고리를 분석하여, 고품질 스톡 사진 검색에 가장 완벽하게 어울리는 **영어 검색어 3~5단어**를 생성해라.

[절대 지켜야 할 규칙]
1. 아파트, 분양, 청약, 재개발 기사인 경우: **'modern apartment complex seoul korea residential'** 또는 **'apartment construction site crane'**으로 검색하라.
2. 상가, 권리금, 로드숍 기사인 경우: **'modern retail shop storefront seoul street'** 또는 **'store interior commercial'**로 검색하라.
3. 지식산업센터, 오피스 공실 기사인 경우: **'modern industrial tech office building'**으로 검색하라.
4. 인물/인터뷰 기사인 경우: **'corporate headquarters modern boardroom'** 또는 **'executive office interior'**로 검색하라.
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
   * Unsplash API 실시간 검색 (중복 사진 배제)
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
        for (const item of data.results) {
          const rawUrl = item.urls?.regular || item.urls?.small;
          if (rawUrl) {
            const cleanUrl = `${rawUrl.split("?")[0]}?auto=format&fit=crop&q=80&w=800`;
            if (!usedUrls.has(cleanUrl)) {
              return cleanUrl;
            }
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 🍌 3순위 (나노바나나): 적합한 사진이 없을 때, Gemini Image Generation으로 기사 맞춤형 실사 이미지를 생성하고 Supabase에 업로드
   */
  private static async generateWithNanoBanana(title: string, category: string, userEmail?: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    const supabase = getSupabaseClient();
    if (!apiKey || !supabase) return null;

    try {
      console.log(`[PhotoCurationAgent] 🍌 Generating custom photorealistic news image with Nano Banana for: "${title}"`);

      // 기사 맞춤형 생성 프롬프트 정교화
      let subjectDesc = "South Korean modern high-rise residential apartment complex in Seoul, daytime architectural photography";
      if (category.includes("상가") || category.includes("임대") || category.includes("공실")) {
        subjectDesc = "Modern commercial retail store street in Seoul with lease signage, realistic street view, architectural photography";
      } else if (category.includes("지식산업센터") || category.includes("사무실")) {
        subjectDesc = "Modern high-tech business office building in Seoul tech valley, glass facade, bright sunlight";
      } else if (category.includes("세무") || category.includes("법률")) {
        subjectDesc = "Korean business desk with tax documents, financial calculator, neat paperwork, corporate ambiance";
      } else if (category.includes("인물") || category.includes("인터뷰")) {
        subjectDesc = "Modern executive corporate headquarters boardroom and glass office interior, high-end business setting";
      }

      const prompt = `Photorealistic editorial news photography. ${subjectDesc}. Highly detailed, 8k resolution, authentic South Korean real estate context, natural daylight, no people faces, no Korean text, no cartoon, hyper-realistic.`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: prompt,
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      let base64Data: string | null = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            base64Data = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Data) return null;

      // Supabase Storage 'news-images' 버킷에 업로드
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `nano_banana_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;

      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(fileName, buffer, { contentType: "image/png", upsert: true });

      if (uploadError) {
        console.warn("[PhotoCurationAgent] Nano Banana upload warning:", uploadError.message);
        return null;
      }

      const { data: publicData } = supabase.storage.from("news-images").getPublicUrl(fileName);
      console.log(`  -> 🍌 [Nano Banana] Successfully created & uploaded unique image: ${publicData.publicUrl}`);

      // AI 비서실 현황판 실시간 로그 기록 (나노바나나 이미지 생성)
      await logAiUsage({
        channelId: "photoCuration",
        userEmail: userEmail || "SYSTEM (나노바나나)",
        summary: `[나노바나나 AI 실사 생성] "${title.slice(0, 30)}"`,
        model: "gemini-3.1-flash-image",
        type: "image",
        imageCount: 1,
        costKrw: 40.0,
      });

      return publicData.publicUrl;

    } catch (genErr: any) {
      console.warn("[PhotoCurationAgent] Nano Banana generation failed, using fallback pool:", genErr.message);
      return null;
    }
  }

  /**
   * 4순위: 카테고리별 고화질 큐레이션 풀에서 중복 없는 사진 선택
   */
  private static getFallbackPhoto(category: string, usedUrls: Set<string>): string {
    const pool = CURATED_CATEGORY_POOLS[category] || CURATED_CATEGORY_POOLS["부동산정책/정치"];
    for (const img of pool) {
      if (!usedUrls.has(img)) {
        return img;
      }
    }
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
   * 1. 실물 보도사진 탐색 -> 2. 고품질 스톡 검색 -> 3. 없으면 🍌 나노바나나 AI 실사 생성 -> 4. 큐레이션 풀
   */
  static async resolvePhoto(req: PhotoCurationRequest): Promise<PhotoCurationResult> {
    console.log(`[PhotoCurationAgent] 📸 Resolving photo for: "${req.articleTitle}" (Category: ${req.category})`);

    const usedUrls = await this.getRecentUsedImages();

    // [영상 특화] 유튜브 카테고리일 때
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

    // 1단계: 실제 언론사/건설사 배포 원문 보도 사진 1순위 추출
    const realPhoto = await this.extractRealPressPhoto(req.sourceUrl);
    if (realPhoto && !usedUrls.has(realPhoto)) {
      console.log(`  -> [1순위] 실제 보도/현장 사진 채택: ${realPhoto.slice(0, 60)}...`);
      return {
        thumbnailUrl: realPhoto,
        mediaType: "image",
        sourceType: "press_photo",
      };
    }

    // 2단계: 한국 부동산 맥락 비주얼 검색어로 신선한 스톡 사진 탐색
    const visualPrompt = await this.generateVisualSearchPrompt(req.articleTitle, req.category);
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

    // 3단계: 🍌 [나노바나나] 적합한 사진이 없을 때 기사 맥락에 맞춘 포토리얼리스틱 실사 이미지 즉시 생성!
    const nanoBananaUrl = await this.generateWithNanoBanana(req.articleTitle, req.category, req.userEmail);
    if (nanoBananaUrl) {
      return {
        thumbnailUrl: nanoBananaUrl,
        mediaType: "image",
        sourceType: "nano_banana_ai",
        promptUsed: visualPrompt,
      };
    }

    // 4단계: 큐레이션 풀 대체 사진 매칭
    const fallbackPhoto = this.getFallbackPhoto(req.category, usedUrls);
    console.log(`  -> [4순위] 큐레이션 풀 대체 사진 매칭: ${fallbackPhoto.slice(0, 60)}...`);
    return {
      thumbnailUrl: fallbackPhoto,
      mediaType: "stock_image",
      sourceType: "category_fallback",
    };
  }
}
