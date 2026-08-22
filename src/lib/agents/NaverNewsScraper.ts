import * as cheerio from 'cheerio';

export interface NaverNewsItem {
  title: string;
  link: string;
  snippet: string;
  press?: string;
  source: 'naver_ranking' | 'naver_section' | 'naver_search';
}

export class NaverNewsScraper {
  private static readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  /**
   * 1. 네이버 뉴스 경제/부동산 랭킹 뉴스(가장 많이 본 뉴스) 스크랩
   */
  static async fetchPopularRankingNews(): Promise<NaverNewsItem[]> {
    const items: NaverNewsItem[] = [];
    try {
      const url = 'https://news.naver.com/main/ranking/popularDay.naver?rankingType=popular_day&sectionId=101';
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        cache: 'no-store'
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);

      // 언론사별 랭킹 박스 순회
      $('.rankingnews_box').each((_, box) => {
        const pressName = $(box).find('.rankingnews_name').text().trim();
        $(box).find('.rankingnews_list li').each((_, li) => {
          const aTag = $(li).find('a');
          const title = aTag.text().trim();
          const link = aTag.attr('href') || '';
          if (title && link) {
            items.push({
              title,
              link: link.startsWith('http') ? link : `https://news.naver.com${link}`,
              snippet: `${pressName} 실시간 랭킹 뉴스`,
              press: pressName,
              source: 'naver_ranking'
            });
          }
        });
      });
    } catch (e) {
      console.error('[NaverNewsScraper] Failed to fetch ranking news:', e);
    }
    return items;
  }

  /**
   * 2. 네이버 뉴스 부동산 섹션(101/260) 최신 헤드라인 & 피드 스크랩
   */
  static async fetchRealEstateSectionNews(): Promise<NaverNewsItem[]> {
    const items: NaverNewsItem[] = [];
    try {
      const url = 'https://news.naver.com/section/101/260';
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        cache: 'no-store'
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);

      // 섹션 주요 헤드라인 및 일반 기사 리스트 추출
      $('a[class*="sa_text_title"], a.sa_text_title, .sa_text a').each((_, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href') || '';
        const snippet = $(el).closest('.sa_text').find('.sa_text_lede').text().trim();
        const press = $(el).closest('.sa_text').find('.sa_text_press').text().trim();

        if (title && link && !items.some(i => i.title === title || i.link === link)) {
          items.push({
            title,
            link: link.startsWith('http') ? link : `https://news.naver.com${link}`,
            snippet: snippet || `${press || '부동산'} 실시간 주요 보도`,
            press,
            source: 'naver_section'
          });
        }
      });
    } catch (e) {
      console.error('[NaverNewsScraper] Failed to fetch real estate section news:', e);
    }
    return items;
  }

  /**
   * 3. 네이버 뉴스 실시간 검색 (키워드 기반 최신/인기 뉴스)
   */
  static async searchNaverNews(keyword: string): Promise<NaverNewsItem[]> {
    const items: NaverNewsItem[] = [];
    try {
      const url = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(keyword)}&sort=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        cache: 'no-store'
      });

      if (!res.ok) return [];

      const html = await res.text();
      const $ = cheerio.load(html);

      $('.news_wrap').each((_, wrap) => {
        const titleTag = $(wrap).find('a.news_tit');
        const title = titleTag.text().trim();
        const link = titleTag.attr('href') || '';
        const snippet = $(wrap).find('.dsc_wrap, .news_dsc').text().trim();
        const press = $(wrap).find('.info_group a.press').text().trim();

        if (title && link) {
          items.push({
            title,
            link,
            snippet,
            press,
            source: 'naver_search'
          });
        }
      });
    } catch (e) {
      console.error(`[NaverNewsScraper] Failed to search news for "${keyword}":`, e);
    }
    return items;
  }

  /**
   * 4. 카테고리별 네이버 통합 실시간 인기 뉴스 수집기 (랭킹 + 섹션 + 검색)
   */
  static async getTopNewsForCategory(categoryKeyword: string, section2: string): Promise<NaverNewsItem[]> {
    const allItems: NaverNewsItem[] = [];

    // 부동산/경제 관련 카테고리일 경우 네이버 부동산 섹션 & 랭킹 우선 수집
    if (section2.includes('부동산') || section2.includes('아파트') || section2.includes('공실') || section2.includes('상가') || section2.includes('신축') || section2.includes('경제')) {
      const [sectionNews, rankingNews] = await Promise.all([
        this.fetchRealEstateSectionNews(),
        this.fetchPopularRankingNews()
      ]);
      allItems.push(...sectionNews, ...rankingNews);
    }

    // 카테고리별 검색어 기반 최신 인기 뉴스 보강
    const searchNews = await this.searchNaverNews(categoryKeyword);
    allItems.push(...searchNews);

    // 중복 제거 (제목 또는 링크 기준)
    const uniqueMap = new Map<string, NaverNewsItem>();
    for (const item of allItems) {
      if (!uniqueMap.has(item.title)) {
        uniqueMap.set(item.title, item);
      }
    }

    return Array.from(uniqueMap.values());
  }
}
