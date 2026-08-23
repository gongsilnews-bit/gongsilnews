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
  userFeedback?: string; // 최고관리자 반려 사유 및 이미지 요청사항
}

export interface PhotoCurationResult {
  thumbnailUrl: string;
  mediaType: "image" | "video" | "stock_image";
  youtubeUrl?: string;
  sourceType: "press_photo" | "curated_stock" | "nano_banana_ai" | "youtube_video" | "category_fallback";
  promptUsed?: string;
}

// ── 카테고리별 검증된 고화질 한국 부동산 & 비즈니스 대규모 사진 풀 (중복 절대 방지) ──
const CURATED_CATEGORY_POOLS: Record<string, string[]> = {
  // 4대 표준 메인 카테고리
  "공실뉴스": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
  ],
  "공실현장": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
  ],
  "부동산·경제": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800",
  ],
  "정책시장": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800",
  ],
  "AI마케팅": [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800",
  ],
  "AI중개실무": [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800",
  ],
  "라이프·오피니언": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
  ],
  "기타": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800",
  ],
  "신축/분양/경매": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
  ],
  "상가/사무실/공장/토지": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&q=80&w=800",
  ],
  "공실/임대관리": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800",
  ],
  "세무/법률/기타": [
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&q=80&w=800",
  ],
  "경제/재테크/주식": [
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&q=80&w=800",
  ],
  "중개실무/인테리어Tip": [
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800",
  ],
  "인물/인터뷰": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800",
  ],
  "AI/NEWS": [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800",
  ],
  "부동산유튜브/블로그": [
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800",
  ],
  "맛집/여행/건강": [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800",
  ],
  "스포츠/연예/기타": [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800",
  ]
};

export class PhotoCurationAgent {
  /**
   * 최근 200개 기사의 썸네일 URL 목록을 가져와 중복을 완벽히 방지합니다.
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
        .limit(200);

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
   * 1순위: 기사 원문 페이지에서 실제 보도/현장 사진(조감도, 현장 사진, 인포그래픽 등) 정밀 추출
   */
  private static async extractRealPressPhoto(sourceUrl?: string, articleTitle?: string): Promise<string | null> {
    if (!sourceUrl || !sourceUrl.startsWith("http")) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(sourceUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const html = await res.text();

      // 구글 뉴스 리다이렉트 페이지인 경우 실제 목적지 URL 추출하여 재시도
      if (res.url.includes("news.google.com") || html.includes("Opening your link")) {
        const destMatch = html.match(/href="([^"]+)"/i) || html.match(/url='([^']+)'/i);
        if (destMatch && destMatch[1] && destMatch[1].startsWith("http") && !destMatch[1].includes("google.com")) {
          return await this.extractRealPressPhoto(destMatch[1], articleTitle);
        }
      }

      // ── 원문 페이지의 제목 및 내용이 사건사고/부적절한 내용인지 검증 ──
      const pageTitleMatch = html.match(/<title>([^<]*)<\/title>/i) || html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      const pageTitle = pageTitleMatch ? pageTitleMatch[1] : "";
      
      const bannedNegativeWords = /실종|살인|사기|체포|구속|폭행|유족|빈소|사망|흉기|피살|성폭행|음주운전|마약|화재|참사|폭로|불륜|투신|자살|횡령|성추행|교도소|시신|백골|피의자|칼부림/i;
      if (bannedNegativeWords.test(pageTitle)) {
        console.warn(`[PhotoCurationAgent] ⚠️ Source page title contains negative keywords ("${pageTitle}"). Rejecting press photo.`);
        return null;
      }

      // 기사 제목과 원문 페이지 제목의 연관성 검증 (기사 제목이 있는 경우)
      if (articleTitle && pageTitle) {
        const cleanWords = (t: string) => t.replace(/[^\w\s가-힣]/g, " ").split(/\s+/).filter(w => w.length >= 2);
        const articleWords = cleanWords(articleTitle);
        const pageWords = new Set(cleanWords(pageTitle));
        const matched = articleWords.filter(w => pageWords.has(w));
        // 단어가 4개 이상인데 겹치는 단어가 아예 없는 경우 엉뚱한 원문으로 판별
        if (articleWords.length >= 4 && matched.length === 0) {
          console.warn(`[PhotoCurationAgent] ⚠️ Mismatch between article ("${articleTitle}") and source page ("${pageTitle}"). Falling back to AI photo.`);
          return null;
        }
      }

      // 1. 주요 메타태그에서 고화질 원본 보도 사진 탐색
      const metaCandidates = [
        html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1],
        html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1],
        html.match(/<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1],
        html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)?.[1],
        html.match(/<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i)?.[1],
      ];

      for (const rawImg of metaCandidates) {
        if (!rawImg) continue;
        let imgUrl = rawImg.trim();
        if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
        else if (imgUrl.startsWith("/")) {
          try {
            const urlObj = new URL(res.url);
            imgUrl = `${urlObj.origin}${imgUrl}`;
          } catch {
            continue;
          }
        }

        if (this.isValidPressPhoto(imgUrl)) {
          return imgUrl;
        }
      }

      // 2. 기사 본문 영역 내 실제 보도사진 태그 탐색
      const bodyImgMatches = html.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
      for (const m of bodyImgMatches) {
        let imgUrl = m[1]?.trim();
        if (!imgUrl) continue;
        if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
        if (this.isValidPressPhoto(imgUrl) && (imgUrl.includes("article") || imgUrl.includes("photo") || imgUrl.includes("news") || imgUrl.includes("upload") || imgUrl.includes("img"))) {
          return imgUrl;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 포털 아이콘, 배너, 트래커 등 불량 이미지 필터링
   */
  private static isValidPressPhoto(imgUrl: string): boolean {
    if (!imgUrl || !imgUrl.startsWith("http")) return false;
    const lower = imgUrl.toLowerCase();
    const bannedPatterns = [
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
      "banner",
      "btn_",
      "button",
      "avatar",
      "profile",
      "ad_",
      "advertisement",
      "1x1",
      "pixel",
      "thumb_default"
    ];
    return !bannedPatterns.some((b) => lower.includes(b));
  }

  /**
   * 스톡 사진 검색용 키워드 생성 (최후 안전망 전용)
   */
  private static async generateVisualSearchPrompt(title: string, category: string, subtitle?: string): Promise<string> {
    const prompt = `너는 대한민국 최고 권위의 뉴스 미디어 '공실뉴스'의 [수석 사진 에디터 AI]야.
다음 기사의 제목, 부제목, 카테고리를 정밀 분석하여, 기사 내용과 **100% 일치하는 고품질 스톡 사진 검색용 [영어 검색 키워드 3~5단어]**를 생성해라.

[절대 지켜야 할 원칙]
1. 아파트/건설 기사가 아닌데 'apartment'나 'building'을 넣지 마라!
2. AI/IT/에듀테크/대학 기사: **'korean university students AI classroom tech laptop'**
3. 금리/환율/주식/금융 기사: **'financial stock market trading desk charts'**
4. 상가/창업/자영업/공실 기사: **'seoul retail storefront street commercial'**
5. 세무/법률/계약 기사: **'tax legal contract documents calculator business'**
6. 인테리어/리모델링 기사: **'modern interior design renovation living room'**
7. 신축/분양/아파트 기사: **'modern apartment residential complex seoul'**
8. 맛집/상권/여행 기사: **'korean restaurant dining street food seoul'**

[입력 정보]
- 카테고리: [${category}]
- 기사 제목: "${title}"
- 부제목: "${subtitle || ''}"

출력 형식: 다른 부가 설명 없이 오직 [영어 검색 키워드 3~5단어]만 출력할 것.`;

    try {
      const res = await generateWithGemini(prompt, { temperature: 0.3 });
      const cleaned = res.text.replace(/["\n\r]/g, " ").trim();
      return cleaned || `${category} editorial news`;
    } catch {
      return `${category} editorial news photography`;
    }
  }

  /**
   * 고화질 스톡 사진 실시간 검색 (최후 안전망 전용)
   */
  private static async searchFreshStockPhoto(query: string, usedUrls: Set<string>, category?: string): Promise<string | null> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (accessKey) {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape&client_id=${accessKey}`;
        const res = await fetch(url);
        if (res.ok) {
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
        }
      } catch {
        // Unsplash API 에러 시 스톡 풀로 전환
      }
    }

    // 카테고리별 검증된 고화질 무료 실사 스톡 풀에서 최적 매칭
    if (category && CURATED_CATEGORY_POOLS[category]) {
      const pool = CURATED_CATEGORY_POOLS[category];
      const available = pool.filter(url => !usedUrls.has(url));
      if (available.length > 0) {
        const hash = Array.from(query).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const selected = available[hash % available.length];
        return selected;
      }
    }

    return null;
  }

  /**
   * 🍌 나노바나나 AI 이미지 전용 정밀 비주얼 프롬프트 생성기 (기사 본문 내용 & 반려 피드백 100% 밀착 분석)
   */
  private static async generateNanoBananaVisualPrompt(
    title: string,
    category: string,
    subtitle?: string,
    content?: string,
    feedback?: string
  ): Promise<string> {
    const cleanContent = (content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);

    const feedbackInstruction = feedback 
      ? `\n[★ 최고관리자 특별 이미지 요청 및 반려 피드백 ★]\n"${feedback}"\n-> 위 관리자의 특별 이미지 요청(예: 합성, 특정 소재 변경 등)을 100% 최우선으로 반영하여 상세한 영어 비주얼 묘사를 작성하라.\n`
      : "";

    const prompt = `너는 대한민국 1등 경제·부동산 종합 언론사 '공실뉴스'의 [수석 보도사진 에디터 & 비주얼 디렉터 AI]야.
너의 임무는 제공된 기사의 [제목], [부제목], 그리고 특히 **[본문 전문]**과 **[최고관리자 피드백]**을 철저하게 읽고 분석하여, 기사에서 다루는 구체적인 사건, 사물, 사람, 장소, 상황에 **100% 밀착된 생생한 신문 1면 보도 실사 사진(Editorial Press Photography)**을 위한 [상세한 영어 비주얼 묘사 2~3문장]을 작성하는 것이다.
${feedbackInstruction}
[절대 지켜야 할 맞춤형 비주얼 원칙 - ★가장 중요★]
1. **박제된 고정 템플릿 금지**: 카테고리에 얽매여 뻔한 아파트나 서양 사무실 전경을 기계적으로 그리지 마라.
2. **기사 본문 내용 및 관리자 피드백 1:1 밀착 묘사**: 본문에서 다루는 구체적인 핵심 소재(예: 한국 공실 상가 현수막, 정부 청사 브리핑, 한국 세무 상담 창구, 서울 신축 아파트 단지, AI 중개 앱 화면 등)를 정확하게 포착하여 **기사 본문 스토리와 1:1로 일치하는 실제 한국 현장 장면**을 묘사하라.
3. **사실적인 한국 현장감 (Authentic South Korea)**: 한국의 실제 도시 거리, 상권, 사무실, 강의실, 실내 공간의 리얼한 분위기와 자연광(natural daylight)을 반영하라.
4. **포토리얼리즘 (Press Photography Quality)**:
   - "Authentic South Korean editorial news photography, natural daylight, 8k resolution, documentary press photo, highly detailed, realistic textures"
   - 만화(Cartoon), 3D 렌더링, 판타지, 일러스트 절대 금지 (No cartoon, no 3D render, no CGI)
   - 어색한 얼굴 클로즈업이나 깨진 글자/문자 배제 (No distorted faces, no text overlays, no letters)

[입력 기사 데이터]
- 카테고리: [${category}]
- 제목: "${title}"
- 부제목: "${subtitle || ''}"
- 본문 내용: "${cleanContent}"

출력: 다른 부가 설명 없이 오직 나노바나나 이미지 모델에 전달할 **[기사 본문 및 피드백에 100% 맞춤화된 고품질 영어 비주얼 묘사 2~3문장]**만 출력할 것.`;

    try {
      const res = await generateWithGemini(prompt, { temperature: 0.3 });
      const visual = res.text.replace(/["\n\r]/g, " ").trim();
      if (visual && visual.length > 20) {
        return visual;
      }
    } catch (err) {
      console.warn("[PhotoCurationAgent] Visual prompt error:", err);
    }

    return `Authentic South Korean editorial news photography representing "${title}", authentic documentary style, natural daylight, highly detailed.`;
  }

  /**
   * 🍌 나노바나나: 기사 맥락에 100% 맞춤형 한국형 실사 이미지를 생성하고 Supabase에 업로드
   */
  private static async generateWithNanoBanana(
    title: string,
    category: string,
    userEmail?: string,
    subtitle?: string,
    content?: string,
    feedback?: string
  ): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    const supabase = getSupabaseClient();
    if (!apiKey || !supabase) return null;

    try {
      console.log(`[PhotoCurationAgent] 🍌 Generating custom photorealistic news image with Nano Banana for: "${title}" (${category}) [Feedback: ${feedback || 'none'}]`);

      // 기사 맥락 및 피드백에 100% 맞춘 정밀 영어 비주얼 묘사 생성
      const visualDesc = await this.generateNanoBananaVisualPrompt(title, category, subtitle, content, feedback);
      console.log(`  -> 🍌 [Nano Banana Prompt]: ${visualDesc.slice(0, 100)}...`);

      const prompt = `Photorealistic editorial press photography. ${visualDesc}. Highly detailed, 8k resolution, authentic South Korean setting, natural daylight, hyper-realistic documentary photo, no cartoon, no 3D render, no text.`;

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
        userEmail: userEmail || "gongsilnews@gmail.com",
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
   * 5순위: 카테고리별 고화질 큐레이션 풀에서 중복 없는 사진 선택 (최후 안전망)
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
   * ⭐️ [미디어 매칭 4단계 우선순위 파이프라인 - 대표님 2안 승인 반영]
   * 0순위: 최고관리자의 특정 사진 반려 피드백이 있는 경우 최우선 생성!
   * 1순위: 언론사/보도자료 원문 실제 보도·현장 사진 최우선 탐색
   * 2순위: 기사 관련 유튜브 영상/링크 탐색 (영상 중심 카테고리)
   * 3순위 (핵심 승격): 🍌 나노바나나 기사 본문 1:1 맞춤형 한국형 AI 보도 실사 생성 (스톡 사진 완전 대체)
   * 4순위: AI 생성 실패 시 고품질 스톡 사진 (최후 안전망)
   * 5순위: 카테고리 기본 풀 (최후 보루)
   */
  static async resolvePhoto(req: PhotoCurationRequest): Promise<PhotoCurationResult> {
    console.log(`[PhotoCurationAgent] 📸 Resolving media for: "${req.articleTitle}" (Category: ${req.category}) [Feedback: ${req.userFeedback || 'none'}]`);

    const usedUrls = await this.getRecentUsedImages();

    // ── 🍌 0순위: 최고관리자 특정 사진/이미지 피드백 감지 시 나노바나나 즉시 생성! ──
    const isExplicitPhotoFeedback = !!req.userFeedback && /사진|이미지|그림|생성|합성|만들어|바꿔|교체/i.test(req.userFeedback);
    if (isExplicitPhotoFeedback) {
      console.log(`  -> [0순위] 최고관리자 맞춤 사진 피드백 감지: "${req.userFeedback}"`);
      const customNanoBanana = await this.generateWithNanoBanana(
        req.articleTitle,
        req.category,
        req.userEmail,
        req.articleSubtitle,
        req.articleContent,
        req.userFeedback
      );
      if (customNanoBanana) {
        return {
          thumbnailUrl: customNanoBanana,
          mediaType: "image",
          sourceType: "nano_banana_ai",
          promptUsed: req.userFeedback,
        };
      }
    }

    // ── 🥇 1순위: 언론사/보도자료 원문 제공 실제 보도·현장 사진 최우선 탐색 ──
    if (req.sourceUrl) {
      const realPhoto = await this.extractRealPressPhoto(req.sourceUrl, req.articleTitle);
      if (realPhoto && !usedUrls.has(realPhoto)) {
        console.log(`  -> [1순위] 언론사/보도자료 실제 보도사진 채택: ${realPhoto.slice(0, 60)}...`);
        return {
          thumbnailUrl: realPhoto,
          mediaType: "image",
          sourceType: "press_photo",
        };
      }
    }

    // ── 🥈 2순위: 기사 관련 유튜브 영상/링크 탐색 (영상 중심 기사) ──
    if (req.mediaType === "video" || req.category === "부동산유튜브/블로그" || req.youtubeSearchQuery) {
      const ytQuery = req.youtubeSearchQuery || `${req.category} ${req.articleTitle.slice(0, 20)}`;
      const ytResult = await this.searchYouTubeMedia(ytQuery);
      if (ytResult) {
        console.log(`  -> [2순위] 관련 유튜브 공식 영상 채택: ${ytResult.videoUrl}`);
        return {
          thumbnailUrl: ytResult.thumbnailUrl,
          youtubeUrl: ytResult.videoUrl,
          mediaType: "video",
          sourceType: "youtube_video",
        };
      }
    }

    // ── 🍌 3순위 (핵심 승격!): 실제 사진이 없을 때 나노바나나 한국형 AI 실사 즉시 가동! (스톡 완전 배제) ──
    console.log(`  -> [3순위 승격] 실제 언론사 사진 부재 ➔ 🍌 나노바나나 기사 본문 1:1 맞춤형 한국형 AI 실사 생성 가동`);
    const nanoBananaUrl = await this.generateWithNanoBanana(
      req.articleTitle,
      req.category,
      req.userEmail,
      req.articleSubtitle,
      req.articleContent
    );
    if (nanoBananaUrl) {
      console.log(`  -> [3순위] 🍌 나노바나나 한국형 AI 실사 생성 및 업로드 완료: ${nanoBananaUrl.slice(0, 60)}...`);
      return {
        thumbnailUrl: nanoBananaUrl,
        mediaType: "image",
        sourceType: "nano_banana_ai",
        promptUsed: `Photorealistic Korean press photo for: ${req.articleTitle}`,
      };
    }

    // ── 🥉 4순위: AI 생성까지 오류 발생 시 최후 안전망 스톡 사진 (Unsplash) ──
    console.log(`  -> [4순위 안전망] AI 생성 예외 발생으로 스톡 사진 안전망 가동`);
    const visualPrompt = await this.generateVisualSearchPrompt(req.articleTitle, req.category, req.articleSubtitle);
    const freshStock = await this.searchFreshStockPhoto(visualPrompt, usedUrls, req.category);
    if (freshStock) {
      console.log(`  -> [4순위] 스톡 사진 안전망 채택: ${freshStock.slice(0, 60)}...`);
      return {
        thumbnailUrl: freshStock,
        mediaType: "stock_image",
        sourceType: "curated_stock",
        promptUsed: visualPrompt,
      };
    }

    // ── 5순위: 큐레이션 풀 대체 사진 (최후 보루) ──
    const fallbackPhoto = this.getFallbackPhoto(req.category, usedUrls);
    console.log(`  -> [5순위] 큐레이션 풀 대체 사진 매칭: ${fallbackPhoto.slice(0, 60)}...`);
    return {
      thumbnailUrl: fallbackPhoto,
      mediaType: "stock_image",
      sourceType: "category_fallback",
    };
  }
}
