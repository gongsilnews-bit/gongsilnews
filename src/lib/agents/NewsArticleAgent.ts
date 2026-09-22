import { generateWithGemini } from "./core";
import { logAiUsage } from "./logger";

export interface NewsArticleRequest {
  sourceText: string; // 검색된 여러 기사들의 원문이나 요약본 (팩트 덩어리)
  category: string;   // 예: "부동산정책/정치", "AI/NEWS", "인물/인터뷰", "맛집/여행/건강" 등
  userEmail?: string; // 호출한 사용자 이메일 (기본: SYSTEM)
  articleStyle?: "auto" | "narration" | "editorial"; // 기사 스타일 (auto: AI 자동 분석, narration: 방송 자막·나레이션 대본형, editorial: 정통 신문 분석형)
  userFeedback?: string; // 관리자 특별 지시 및 스타일 요청사항
}

export interface NewsArticleResult {
  title: string;
  subtitle: string;
  content: string; // HTML 포맷의 본문
  keywords: string;
  articleStyle?: "narration" | "editorial"; // 실제 채택된 스타일
  imageKeyword?: string;
  youtubeSearchQuery?: string;
  mediaType?: "image" | "video";
  sourceUrl?: string;
  chosenCandidateId?: string;
  isHeadline?: boolean;
  isImportant?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

function safeJsonParse(rawText: string): any {
  let text = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  
  // 1차 시도: 표준 파싱
  try {
    return JSON.parse(text);
  } catch {
    // 2차 시도: 개행 및 제어 문자 보정 파싱
    try {
      const sanitized = text.replace(/[\u0000-\u001F]+/g, (match) => {
        if (match === '\n') return '\\n';
        if (match === '\r') return '';
        if (match === '\t') return '\\t';
        return '';
      });
      return JSON.parse(sanitized);
    } catch {
      // 3차 시도: 정규식 기반 안전 추출 (따옴표 충돌 완벽 방어)
      const extractField = (key: string): string => {
        const regex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"[a-zA-Z]+"\\s*:|\\s*}\\s*$)`, 'i');
        const match = text.match(regex);
        return match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
      };

      const title = extractField('title') || '공실뉴스 부동산 전문 리포트';
      const subtitle = extractField('subtitle') || '';
      const content = extractField('content') || '';
      const keywords = extractField('keywords') || '부동산,경제,공실뉴스';
      const imageKeyword = extractField('imageKeyword') || 'korean real estate';
      const youtubeSearchQuery = extractField('youtubeSearchQuery') || '';
      const chosenCandidateId = extractField('chosenCandidateId') || '';
      const mediaType = text.includes('"mediaType": "video"') ? 'video' : 'image';
      const isHeadline = text.includes('"isHeadline": true');
      const isImportant = text.includes('"isImportant": true') || isHeadline;
      const sourceUrl = extractField('sourceUrl') || '';
      const articleStyle = (text.includes('"articleStyle": "narration"') || text.includes('"articleStyle":"narration"')) ? 'narration' : 'editorial';

      if (title && content) {
        return {
          title,
          subtitle,
          content,
          keywords,
          articleStyle,
          imageKeyword,
          youtubeSearchQuery,
          chosenCandidateId,
          mediaType,
          isHeadline,
          isImportant,
          sourceUrl
        };
      }
      throw new Error("JSON 파싱 복구 실패");
    }
  }
}

export class NewsArticleAgent {
  /**
   * 고정된 틀(현황/원인 등)을 탈피하여, 
   * 기사 내용에 꼭 맞는 [생생한 맞춤형 소제목]과 [공실뉴스 시장전망 & 체크포인트]를 적용한 
   * 독보적인 프리미엄 전문 기사를 작성합니다.
   */
  static async writeArticle(req: NewsArticleRequest): Promise<NewsArticleResult> {
    const category = req.category;

    // 1. 수동 요청 감지 (userFeedback, sourceText, articleStyle)
    const rawHint = `${req.articleStyle || ''} ${req.userFeedback || ''} ${req.sourceText.slice(0, 300)}`.toLowerCase();
    const isExplicitNarration = req.articleStyle === 'narration' || /나레이션|대본|자막뉴스|존댓말|방송\s*뉴스/i.test(rawHint);
    const isExplicitEditorial = req.articleStyle === 'editorial' || /신문\s*기사|평서체|분석형|소제목/i.test(rawHint);

    let styleMode: 'narration' | 'editorial' | 'auto' = 'auto';
    if (isExplicitNarration) {
      styleMode = 'narration';
    } else if (isExplicitEditorial) {
      styleMode = 'editorial';
    } else {
      styleMode = 'auto';
    }

    // 2. 카테고리별 성격 판별
    const isBoxCategory = [
      "부동산정책/정치",
      "세무/법률/기타",
      "공실/임대관리",
      "중개실무/인테리어Tip",
      "상가/사무실/공장/토지",
      "경제/재테크/주식",
      "AI/NEWS",
      "신축/분양/경매",
      "부동산유튜브/블로그"
    ].includes(category);

    let styleGuidance = "";
    if (styleMode === 'narration') {
      styleGuidance = `
[★ 기사 스타일: 방송 자막·나레이션 대본형 (최고관리자 수동 지정) ★]
- 문체: 방송 앵커 및 기자의 신뢰감 있고 귀에 쏙쏙 박히는 정중한 표준 존댓말 리포트체 (~했습니다, ~인 겁니다, ~것으로 나타났습니다, ~조언했습니다, ~있습니다).
- 구조 및 호흡:
  1. ★ [절대 금지 1] '■ 소제목'을 절대 넣지 마라! (소제목 일체 배제)
  2. ★ [절대 금지 2] '[왜 올랐나]', '[주의사항]' 등 미니 라벨도 절대 넣지 마라!
  3. ★ [문단 나열] 오직 1~2문장 단위로 짧고 호흡감 있게 끊어서 <p> 태그로 나열하라.
     (모바일 화면에서 한눈에 들어오고, 숏폼 자막 및 TTS 음성 나레이션으로 바로 낭독 가능한 자연스러운 대본 호흡)
  4. ★ [전개 흐름]:
     - 1~2문단: 사건/이슈 핵심 팩트 브리핑
     - 3~4문단: 원인, 시장 심리, 배경 상황 분석
     - 5~6문단: 현상 확장 및 유사 사례/과거 비교/파급 효과
     - 마지막 1~2문단: 전문가 조언 및 투자자/소비자 주의사항 당부로 자연스럽게 마무리
  5. ★ 하단 [■ 공실뉴스 시장전망 & 체크포인트] 박스는 일체 넣지 마라!`;
    } else if (styleMode === 'editorial') {
      styleGuidance = `
[★ 기사 스타일: 정통 신문 분석형 (최고관리자 수동 지정) ★]
- 문체: 정통 경제지 전문 기자 평서체 (~로 분석된다, ~로 집계됐다, ~라는 지적이다, ~가 불가피할 전망이다).
- 구조:
  1. 도입부 문단 (3~4줄)
  2. 본문 내 3개의 생생한 맞춤형 소제목 ('<b>■ [맞춤 소제목]</b><br>내용' - 숫자 1, 2, 3 제외!)
  3. ${isBoxCategory ? `기사 최하단에 [■ 공실뉴스 시장전망 & 체크포인트] 심층 분석 박스 포함:
     <div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
       <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
       <p style="margin:0;font-size:14px;color:#334155;">(시장 전망 및 임대인·중개사·투자자 실무 체크포인트 서술)</p>
     </div>` : `기사 마지막에 <p><b>■ 향후 트렌드 및 전망</b><br>내용</p> 문단으로 마무리`}`;
    } else {
      // auto: AI가 소재와 카테고리를 정밀 분석하여 결정
      styleGuidance = `
[★ 기사 스타일: AI 자동 스마트 분석 모드 (기본값) ★]
너는 제공된 뉴스 소재와 카테고리를 정밀 분석하여 아래 2가지 스타일 중 가장 적합한 스타일을 스스로 판단하여 작성하고, JSON의 "articleStyle" 필드에 명시하라:

1) 【스타일 A: 방송 자막·나레이션 대본형 (narration)】 선택 기준:
   - 카테고리가 'AI/NEWS', '경제/재테크/주식', '부동산유튜브/블로그', '맛집/여행/건강', '스포츠/연예/기타', '인물/인터뷰'이거나,
   - 소재가 화제성 테마주(예: 상어 출몰과 주가 급등 등), 밈, 소비자 트렌드, 사건 브리핑, 실시간 이슈처럼 방송 앵커 브리핑이나 숏폼 자막뉴스 형태로 전달할 때 전달력과 몰입감이 훨씬 뛰어난 경우.
   - [작성 규칙]:
     * 문체: 방송 앵커/기자 리포트 존댓말 대본체 (~했습니다, ~인 겁니다, ~있습니다, ~조언했습니다).
     * ★ 소제목('■') 완전 배제! 미니라벨('[...]')도 완전 배제!
     * 오직 1~2문장 단위로 짧게 끊어서 <p> 태그로 나열.
     * 하단 분석 박스 없이, 마지막 문단에서 전문가 제언과 주의 당부로 자연스럽게 마무리.

2) 【스타일 B: 정통 신문 분석형 (editorial)】 선택 기준:
   - 카테고리가 '부동산정책/정치', '세무/법률/기타', '상가/사무실/공장/토지', '신축/분양/경매', '공실/임대관리' 등 제도 개편, 법률 판례, 세무 쟁점, 심층 수급 통계 분석 중심인 경우.
   - [작성 규칙]:
     * 문체: 정통 경제지 전문 기자 평서체 (~로 분석된다, ~로 집계됐다).
     * 맞춤형 소제목 3개 ('<b>■ [맞춤 소제목]</b><br>내용' - 숫자 1, 2, 3 제외).
     * ${isBoxCategory ? `기사 최하단에 [■ 공실뉴스 시장전망 & 체크포인트] 심층 분석 박스 포함:
       <div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
         <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
         <p style="margin:0;font-size:14px;color:#334155;">(시장 전망 및 임대인·중개사·투자자 실무 체크포인트 서술)</p>
       </div>` : `기사 마지막에 <p><b>■ 향후 트렌드 및 전망</b><br>내용</p> 문단으로 마무리`}`;
    }

    const systemPrompt = `너는 대한민국 1등 부동산·경제 전문 미디어 '공실뉴스'의 수석 편집국장이야.
너의 임무는 제공된 최신 뉴스 후보들 중 가장 가치 있는 핵심 뉴스를 엄선하여 독보적인 고품질 기사로 작성하는 것이다.

[절대 지켜야 할 리라이팅 및 저작권 원칙]
1. 완벽한 표절 방지: 제공된 원문의 문장 구조, 표현, 단어 배열을 절대로 그대로 복사하지 마라.
2. 팩트와 수치 추출: 날짜, 금액, 퍼센트(%), 지역, 정책명 등 '객관적 핵심 수치/팩트'만 추출하여 새로운 논리로 재배치하라.
3. 타사 출처 배제: "OO일보에 따르면", "OO뉴스 보도에 의하면" 등 타사 언론사 명칭은 절대 언급하지 마라.
4. 원문 링크 본문 부착 금지: 기사 본문에 원문 링크나 출처 URL을 절대 쓰지 마라. (sourceUrl 필드에만 기입)
5. JSON 내 따옴표 주의: 제목(title)이나 본문(content) 안에서 강조할 때는 쌍따옴표(") 대신 반드시 작은따옴표(')를 사용하라.
6. 핵심 수치와 중요 키워드는 <b> 태그로 강조하여 전문성과 가독성을 높여라.
7. HTML 태그는 오직 <p>, <b>, <br>, <div>만 사용하라. (<h3>, <style> 태그 일체 금지)

${styleGuidance}

[이미지 키워드 작성 주의사항]
- 기사가 [인물/인터뷰] 카테고리이거나 실존 인물에 관한 내용인 경우, 외국인 모델이나 사람 얼굴 사진 검색을 절대 하지 마라.
- 대신 해당 인물이 속한 기업 사옥, 오피스 전경, 기술, 회의실 등 세련된 배경 키워드로 작성하라.

[광고/노출 등급 판정 (중요기사 및 헤드라인)]
- isHeadline: 정부 주요 부동산/금융 종합 대책, 기준금리 결정, 전국적 파급력이 큰 특종/주요 이슈인 경우 true, 그 외 false
- isImportant: 임대인/중개사/투자자에게 필수적인 세무/법률/공실/핵심 지표 분석 기사이거나 시장 주요 분석인 경우 true, 그 외 false
- 일반 일상/단신 기사는 둘 다 false

[출력 JSON 형식]
응답은 반드시 마크다운 백틱 없는 순수 JSON 형식으로만 출력할 것. (문자열 내부 따옴표는 작은따옴표 사용)

{
  "chosenCandidateId": "CANDIDATE_1 등 선택한 후보의 ID",
  "articleStyle": "narration 또는 editorial",
  "title": "시선을 사로잡으면서도 신뢰감을 주는 전문적인 기사 제목 (최대 32자)",
  "subtitle": "핵심 브리핑 1 (명사형 종결)\\n핵심 브리핑 2 (명사형 종결)\\n핵심 브리핑 3 (명사형 종결)\\n(반드시 3줄로 작성. 특수기호나 번호 없이 순수 텍스트만 줄바꿈. 문장 끝은 ~기록, ~돌파, ~전망, ~개최 등 간결한 명사형 종결)",
  "content": "<p>내용...</p>",
  "keywords": "키워드1,키워드2,키워드3,키워드4,키워드5",
  "imageKeyword": "고품질 배경/사옥/기술 스톡 사진 검색용 영어 키워드 2~4단어",
  "youtubeSearchQuery": "관련 유튜브 영상 검색용 한국어 키워드",
  "mediaType": "video 또는 image (카테고리가 '부동산유튜브/블로그'이거나 영상이 어울리면 video, 그 외는 image)",
  "isHeadline": true 또는 false,
  "isImportant": true 또는 false,
  "sourceUrl": "선택한 원본 기사의 URL"
}`;

    const userPrompt = `[오늘의 최신 뉴스 후보 목록]\n${req.sourceText}\n\n위 후보들 중 대중의 관심이 가장 높고 완성도 높은 1개의 뉴스를 선택하여, 반드시 해당 후보의 [ID]와 [URL]을 정확히 매칭하고, 기사 소재에 가장 어울리는 최적의 스타일을 적용한 [${category}] 카테고리 프리미엄 기사를 JSON으로 작성해라.`;

    try {
      const result = await generateWithGemini(`${systemPrompt}\n\n${userPrompt}`, { temperature: 0.7 });
      const parsed = safeJsonParse(result.text);

      // AI 비서실 현황판 실시간 로그 기록
      await logAiUsage({
        channelId: "article",
        userEmail: req.userEmail || "gongsilnews@gmail.com",
        summary: `[기사 작성 (${parsed.articleStyle || styleMode})] "${(parsed.title || '').slice(0, 30)}"`,
        model: "gemini-3.6-flash",
        type: "text",
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      });

      return {
        title: parsed.title,
        subtitle: parsed.subtitle,
        content: parsed.content,
        keywords: parsed.keywords,
        articleStyle: parsed.articleStyle || (styleMode === 'narration' ? 'narration' : 'editorial'),
        imageKeyword: parsed.imageKeyword,
        youtubeSearchQuery: parsed.youtubeSearchQuery,
        mediaType: parsed.mediaType,
        isHeadline: parsed.isHeadline === true,
        isImportant: parsed.isImportant === true || parsed.isHeadline === true,
        sourceUrl: parsed.sourceUrl,
        chosenCandidateId: parsed.chosenCandidateId,
        usage: result.usage,
      };

    } catch (error: any) {
      console.error("[NewsArticleAgent] Error:", error);
      throw new Error("뉴스 기사 재창조 중 오류가 발생했습니다: " + error.message);
    }
  }
}
