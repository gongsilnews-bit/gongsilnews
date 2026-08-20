import { generateWithGemini } from "./core";
import { logAiUsage } from "./logger";

export interface NewsArticleRequest {
  sourceText: string; // 검색된 여러 기사들의 원문이나 요약본 (팩트 덩어리)
  category: string;   // 예: "부동산정책/정치", "AI/NEWS", "인물/인터뷰", "맛집/여행/건강" 등
  userEmail?: string; // 호출한 사용자 이메일 (기본: SYSTEM)
}

export interface NewsArticleResult {
  title: string;
  subtitle: string;
  content: string; // HTML 포맷의 본문
  keywords: string;
  imageKeyword?: string;
  youtubeSearchQuery?: string;
  mediaType?: "image" | "video";
  sourceUrl?: string;
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
      const mediaType = text.includes('"mediaType": "video"') ? 'video' : 'image';
      const isHeadline = text.includes('"isHeadline": true');
      const isImportant = text.includes('"isImportant": true') || isHeadline;
      const sourceUrl = extractField('sourceUrl') || '';

      if (title && content) {
        return {
          title,
          subtitle,
          content,
          keywords,
          imageKeyword,
          youtubeSearchQuery,
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

    // 카테고리별 성격 판별
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

    let conclusionInstruction = "";
    if (isBoxCategory) {
      conclusionInstruction = `
5. ■ 공실뉴스 시장전망 & 체크포인트:
   기사 하단에 반드시 아래 박스 포맷을 사용하여, 기사 주제에 대한 [시장 전망]과 함께 [임대인·공인중개사·투자자]가 현장에서 챙겨야 할 [핵심 실무 체크포인트]를 4~5줄의 완성도 높은 종합 리포트 문맥으로 작성하라.
   
   <div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
     <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
     <p style="margin:0;font-size:14px;color:#334155;">(향후 시장·정책·금리 전망 1~2줄 서술 후, 임대인·중개사·투자자가 현장에서 반드시 챙겨야 할 계약 특약, 절세, 공실 방어 등 실무 체크포인트 2~3줄을 매끄럽게 연결하여 서술)</p>
   </div>`;
    } else {
      // 라이프·문화·인물형 (맛집/여행/건강, 스포츠/연예/기타, 인물/인터뷰)
      conclusionInstruction = `
5. ■ 향후 트렌드 및 전망:
   억지스러운 박스나 팁을 넣지 말고, 정통 신문 문화면/오피니언 기사처럼 자연스러운 본문 문단으로 산뜻하게 기사를 마무리하라.
   
   <p><b>■ 향후 트렌드 및 전망</b><br>(해당 사안이 소비자 라이프스타일, 지역 상권 또는 업계 트렌드에 미칠 의미를 자연스러운 문단으로 2~3줄 서술)</p>`;
    }

    const systemPrompt = `너는 대한민국 1등 부동산·경제 전문 미디어 '공실뉴스'의 수석 편집국장이야.
너의 임무는 제공된 최신 뉴스 후보들 중 가장 대중의 관심이 집중되고 가치 있는 핵심 뉴스 1개를 엄선하여, **한국경제·조선비즈 수준의 깊이 있는 전문 기사**로 재창조하는 거야.

[절대 지켜야 할 리라이팅 및 저작권 원칙]
1. 완벽한 표절 방지: 제공된 원문의 문장 구조, 표현, 단어 배열을 절대로 그대로 복사하지 마라.
2. 팩트와 수치 추출: 날짜, 금액, 퍼센트(%), 지역, 정책명 등 '객관적 핵심 수치/팩트'만 추출하여 새로운 논리로 재배치하라.
3. 타사 출처 배제: "OO일보에 따르면", "OO뉴스 보도에 의하면" 등 타사 언론사 명칭은 절대 언급하지 마라.
4. 원문 링크 본문 부착 금지: 기사 본문에 원문 링크나 출처 URL을 절대 쓰지 마라. (sourceUrl 필드에만 기입)
5. JSON 내 따옴표 주의: 제목(title)이나 본문(content) 안에서 강조할 때는 쌍따옴표(") 대신 반드시 작은따옴표(')를 사용하라.

[문체 (Tone & Manner)]
- 네가 작성할 기사의 카테고리는 [${category}]야.
- 정통 경제지 전문 기자체(~로 분석된다, ~로 집계됐다, ~가 불가피할 전망이다, ~에 주목할 필요가 있다, ~라는 지적이다 등)를 사용하라.
- 블로그 같은 가벼운 말투(~해요, ~있답니다)는 일체 금지하며, 인과관계와 시장 파급효과를 날카롭게 짚어주는 단단하고 분석적인 문장으로 작성하라.
- 핵심 수치와 중요 키워드는 <b> 태그로 강조하여 전문성과 가독성을 높여라.

[소제목 작성 규칙 - ★매우 중요★]
- '■ 현황 및 핵심 지표', '■ 원인 및 파급 효과', '■ 관련 정책 및 데이터 분석' 같은 **기계적이고 고정된 틀(박제된 라벨)을 절대 쓰지 마라!**
- 대신 **기사 본문 내용의 핵심 수치, 사건 팩트, 현장 목소리가 생생하게 살아있는 [맞춤형 소제목 3개]**를 스스로 창작하여 <b> 태그로 달아라.
  - 예시 1: <b>■ 전용 84㎡ 분양가 27억 돌파… '강남 뺨치는' 고분양가 논란</b><br>
  - 예시 2: <b>■ '지금 안 사면 더 뛴다'… 공급 가뭄 공포에 쏠린 청약</b><br>
  - 예시 3: <b>■ 대출 규제 조이자 '현금 부자' 잔치… 당첨 양극화 심화</b><br>

[기사 본문 구조]
반드시 아래 구조를 엄격히 준수하여 HTML 태그(<p>, <b>, <br>, <div>)로 작성해라. (<h3>, <style> 태그 일체 금지)

1. 도입부 (3~4줄): 사건의 핵심 팩트와 함께 이 사안이 지금 경제/부동산/사회에서 갖는 배경과 중요성을 두괄식으로 서술.
2. <b>■ [핵심 팩트와 수치를 관통하는 생생한 맞춤 소제목 1]</b><br>내용 서술 (중요 수치 <b> 강조).
3. <b>■ [원인과 시장 파급력을 날카롭게 짚는 맞춤 소제목 2]</b><br>내용 서술.
4. <b>■ [제도·정책·데이터 등 심층 맥락을 담은 맞춤 소제목 3]</b><br>내용 서술.
${conclusionInstruction}

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
  "title": "시선을 사로잡으면서도 신뢰감을 주는 전문적인 기사 제목 (최대 32자)",
  "subtitle": "핵심 브리핑 1 (명사형 종결)\\n핵심 브리핑 2 (명사형 종결)\\n핵심 브리핑 3 (명사형 종결)\\n(반드시 3줄로 작성. 특수기호나 번호 없이 순수 텍스트만 줄바꿈. 문장 끝은 ~기록, ~돌파, ~전망, ~개최 등 간결한 명사형 종결)",
  "content": "<p>도입부...</p><p><b>■ 맞춤 소제목 1</b><br>내용...</p><p><b>■ 맞춤 소제목 2</b><br>내용...</p><p><b>■ 맞춤 소제목 3</b><br>내용...</p>...",
  "keywords": "키워드1,키워드2,키워드3,키워드4,키워드5",
  "imageKeyword": "고품질 배경/사옥/기술 스톡 사진 검색용 영어 키워드 2~4단어",
  "youtubeSearchQuery": "관련 유튜브 영상 검색용 한국어 키워드",
  "mediaType": "video 또는 image (카테고리가 '부동산유튜브/블로그'이거나 영상이 어울리면 video, 그 외는 image)",
  "isHeadline": true 또는 false,
  "isImportant": true 또는 false,
  "sourceUrl": "선택한 원본 기사의 URL"
}`;

    const userPrompt = `[오늘의 최신 뉴스 후보 목록]\n${req.sourceText}\n\n위 후보들 중 대중의 관심이 가장 높고 완성도 높은 1개의 뉴스를 선택하여, 기사 내용에 꼭 맞는 [생생한 맞춤형 소제목]을 적용한 [${category}] 카테고리 프리미엄 기사를 JSON으로 작성해라.`;

    try {
      const result = await generateWithGemini(`${systemPrompt}\n\n${userPrompt}`, { temperature: 0.7 });
      const parsed = safeJsonParse(result.text);

      // AI 비서실 현황판 실시간 로그 기록
      await logAiUsage({
        channelId: "article",
        userEmail: req.userEmail || "SYSTEM (크론 자동수집)",
        summary: `[기사 작성] "${(parsed.title || '').slice(0, 30)}"`,
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
        imageKeyword: parsed.imageKeyword,
        youtubeSearchQuery: parsed.youtubeSearchQuery,
        mediaType: parsed.mediaType,
        isHeadline: parsed.isHeadline === true,
        isImportant: parsed.isImportant === true || parsed.isHeadline === true,
        sourceUrl: parsed.sourceUrl,
        usage: result.usage,
      };

    } catch (error: any) {
      console.error("[NewsArticleAgent] Error:", error);
      throw new Error("뉴스 기사 재창조 중 오류가 발생했습니다: " + error.message);
    }
  }
}
