/**
 * 글쓰기 — 작성법 카드 + AI 지시문 (2026-11-03 사장님: "글이 정말 중요함", "후킹성 있게", "여러 종류로", "최적으로")
 *
 * 글 종류마다 그 글에 가장 잘 맞는 작성법(목적·읽는 사람·꼭 들어갈 것·순서·첫 줄·길이·말투·스타일·모범 틀)을 둔다.
 * AI(회원 본인 ChatGPT·Gemini·Claude)는 이 카드와 재료(공실뉴스 데이터)로 스타일이 다른 3개 버전을 쓰고,
 * 같은 답 안에서 점검표로 스스로 고친 최종본만 낸다. 숫자·주소·가격은 재료에 있는 것만 — 모르면 [빈칸].
 * 이 파일은 웹에 있어 앱을 새로 깔지 않고 고칠 수 있다. 사장님 검수로 카드를 계속 다듬는다.
 */

export type Cat = "work" | "blog" | "youtube" | "story";
export type Card = {
  id: string; cat: Cat; label: string; brief: string;
  purpose: string; reader: string; must: string[]; flow: string[]; first: string;
  length: string; tone: string; styles: string[];
  /** 모범 틀 — 지어낸 매물이 아니라 [빈칸]으로 된 틀 */
  example?: string;
  /** 어울리는 재료 (화면이 먼저 권한다) */
  materials?: ("vacancy" | "complex" | "area" | "article")[];
};

export const CATS: { id: Cat; label: string; icon: string; hint: string }[] = [
  { id: "work", label: "업무 글", icon: "💬", hint: "손님·약속·계약·만기·퇴실·집주인" },
  { id: "blog", label: "블로그 글", icon: "N", hint: "시세·거래 현황·매물·동네·정보" },
  { id: "youtube", label: "유튜브 대본", icon: "▶", hint: "시세·단지·매물·뉴스 쇼츠·영상" },
  { id: "story", label: "내 이야기", icon: "☕", hint: "일상·후기·인사·칼럼" },
];

const WORK_STYLES = ["정중하게", "친근하게", "짧고 핵심만"];
const BLOG_STYLES = ["질문형", "숫자·정보형", "공감·경험형", "경고·주의형", "비교형", "목록형(○가지)"];
const YT_STYLES = ["반전·충격 시작", "질문 시작", "숫자 시작", "이야기형", "뉴스 앵커형"];
const STORY_STYLES = ["일기처럼", "에세이", "짧은 SNS체", "따뜻하게", "유머 한 스푼"];

export const CARDS: Card[] = [
  /* ── 업무 글 — 카톡·문자 ── */
  { id: "w-reply", cat: "work", label: "문의 첫 답장", brief: "광고 보고 온 문의에 첫 답",
    purpose: "문의한 손님이 '이 사람한테 물어보길 잘했다'고 느끼고 다음 대화(방문 약속)로 이어지게", reader: "광고를 보고 처음 연락한 손님",
    must: ["문의한 매물이 아직 있는지(재료에 있으면)", "핵심 조건 1~2가지(가격·위치·입주일)", "궁금한 점을 묻는 질문 1개 또는 방문 제안"],
    flow: ["감사 인사 한 줄", "매물 상태·핵심 조건", "손님 상황을 묻는 질문 또는 방문 제안", "편하게 연락 달라는 끝인사·서명"],
    first: "인사와 함께 바로 핵심(매물 가능 여부)을 말한다", length: "카톡 한 화면 (4~6줄)", tone: "정중하고 빠르게, 영업 냄새 없이", styles: WORK_STYLES, materials: ["vacancy"],
    example: "[손님 이름]님, 문의 주셔서 감사합니다.\n말씀하신 [공실 이름]은 지금 바로 보실 수 있어요. [핵심 조건]입니다.\n혹시 입주 원하시는 날짜가 언제쯤이세요? 맞춰서 보실 시간 잡아 드릴게요.\n[사무소 이름] [내 이름] 드림" },
  { id: "w-brief", cat: "work", label: "매물 브리핑", brief: "매물을 한눈에 정리해 보내기",
    purpose: "손님이 매물을 빠르게 파악하고 보러 오고 싶게", reader: "매물을 소개받는 손님",
    must: ["위치", "가격(보증금·월세·관리비)", "면적·방·욕실·층·방향", "입주 가능일", "장점 2~3개", "같은 단지 최근 실거래(재료에 있으면)"],
    flow: ["한 줄 요약(이 매물의 가장 큰 장점)", "기본 정보 줄줄이(• 기호)", "장점 2~3개", "시세 참고(재료에 있을 때만)", "방문 제안"],
    first: "이 매물을 한 문장으로 — 손님이 얻는 이득으로", length: "카톡 한 화면 반 (8~12줄)", tone: "정리 잘하는 전문가처럼, 과장 없이", styles: WORK_STYLES, materials: ["vacancy", "complex"] },
  { id: "w-visit", cat: "work", label: "방문 약속 잡기", brief: "보러 올 날짜·시간 정하기",
    purpose: "손님이 부담 없이 날짜를 고르게", reader: "매물을 보고 싶어 하는 손님",
    must: ["가능한 시간 2~3개 제시(모르면 [가능한 시간])", "만나는 곳", "걸리는 시간(모르면 생략)"],
    flow: ["인사", "고를 수 있는 시간 제시", "만나는 곳", "편한 시간 알려 달라는 끝"],
    first: "바로 시간을 고르게 한다", length: "4~5줄", tone: "가볍고 친절하게", styles: WORK_STYLES, materials: ["vacancy"] },
  { id: "w-dayb4", cat: "work", label: "방문 하루 전 안내", brief: "내일 약속 다시 알려 주기",
    purpose: "약속을 잊거나 헛걸음하지 않게", reader: "내일 집 보러 올 손님",
    must: ["날짜·시간", "주소·만나는 곳", "주차", "바뀌면 연락 달라는 말"],
    flow: ["인사", "일정 확인(날짜·시간·주소)", "만나는 곳·주차", "변경 시 연락", "서명"],
    first: "핵심(내일 몇 시 어디)부터", length: "카톡 한 화면 (4~6줄)", tone: "정중하되 딱딱하지 않게", styles: WORK_STYLES, materials: ["vacancy"],
    example: "[손님 이름]님, 안녕하세요.\n내일 [시간]에 [주소] 보시기로 한 일정 다시 안내드립니다.\n건물 앞에서 뵙겠습니다. 주차는 [주차 안내].\n혹시 시간이 바뀌시면 편하게 연락 주세요.\n[사무소 이름] [내 이름] 드림" },
  { id: "w-contract", cat: "work", label: "계약 준비 서류", brief: "계약 전 챙길 것 안내",
    purpose: "계약 날 빠뜨리는 것 없이 준비하게", reader: "계약을 앞둔 손님(임차인·매수인)",
    must: ["계약 날짜·시간·장소", "준비물(신분증·도장 또는 서명·계약금 등 — 거래에 맞게)", "계약금 금액·보낼 곳(모르면 [빈칸])", "궁금하면 미리 물어보라는 말"],
    flow: ["인사·계약 일정", "준비물 목록(• 기호)", "계약금 안내", "끝인사"],
    first: "계약 일정부터", length: "8~12줄", tone: "꼼꼼하고 믿음 가게", styles: [...WORK_STYLES, "꼼꼼하게"], materials: ["vacancy"] },
  { id: "w-thanks", cat: "work", label: "계약 후 감사", brief: "계약 마친 손님께 감사 인사",
    purpose: "좋은 마무리 → 소개·재방문으로 이어지게", reader: "방금 계약을 마친 손님",
    must: ["감사", "다음 일정(잔금·입주) 한 줄(모르면 [빈칸])", "언제든 연락하라는 말"],
    flow: ["감사 인사", "다음 일정", "새집 축하·응원", "서명"],
    first: "진심 어린 감사로", length: "4~6줄", tone: "따뜻하게", styles: ["정중하게", "따뜻하게", "짧고 핵심만"] },
  { id: "w-movein", cat: "work", label: "잔금·입주 안내", brief: "잔금일·입주일 체크리스트",
    purpose: "잔금·입주 날 문제없이 끝나게", reader: "잔금·입주를 앞둔 손님",
    must: ["잔금 날짜·시간·장소", "잔금 금액·보낼 곳([빈칸] 가능)", "준비물", "입주 전 체크(공과금 정산·전입신고·확정일자 등 거래에 맞게)"],
    flow: ["인사·일정", "잔금 안내", "준비물", "입주 체크리스트", "끝인사"],
    first: "날짜부터", length: "10~14줄", tone: "꼼꼼하게", styles: [...WORK_STYLES, "꼼꼼하게"] },
  { id: "w-expiry", cat: "work", label: "만기 전 안내", brief: "계약 만기 몇 달 전 의사 묻기",
    purpose: "연장·이사 의사를 미리 알고 다음 계약을 준비", reader: "계약 만기가 다가오는 임차인(또는 임대인)",
    must: ["만기일", "연장·재계약·이사 중 어떻게 하실지 묻기", "대략 언제까지 알려 주면 되는지"],
    flow: ["안부 인사", "만기일 안내", "의사 묻기", "도울 수 있는 것", "끝인사"],
    first: "안부 한 줄 뒤 바로 만기일", length: "5~7줄", tone: "부담 주지 않게", styles: WORK_STYLES },
  { id: "w-moveout", cat: "work", label: "퇴실 안내", brief: "퇴실 점검·보증금 반환",
    purpose: "퇴실 날 다툼 없이 깔끔하게 끝나게", reader: "곧 이사 나가는 임차인",
    must: ["퇴실 날짜·시간", "점검할 것(원상복구·공과금 정산·열쇠 반납 등)", "보증금 돌려받는 시점·방법([빈칸] 가능)"],
    flow: ["인사·퇴실 일정", "퇴실 전 확인할 것(• 기호)", "보증금 반환 안내", "끝인사"],
    first: "퇴실 일정부터", length: "8~12줄", tone: "정중하고 분명하게", styles: [...WORK_STYLES, "꼼꼼하게"] },
  { id: "w-owner-report", cat: "work", label: "집주인 광고 보고", brief: "집주인께 진행 상황 보고",
    purpose: "집주인이 '잘 맡겼다'고 믿게, 필요하면 조건 조정 이야기를 자연스럽게", reader: "매물을 맡긴 집주인",
    must: ["광고 중인 곳", "문의·방문 현황(모르면 [빈칸])", "손님 반응", "다음 계획 또는 제안"],
    flow: ["인사", "진행 현황", "손님 반응", "다음 계획·제안", "끝인사"],
    first: "보고 핵심(지금 상황) 한 줄", length: "6~10줄", tone: "믿음직하게, 사실대로", styles: WORK_STYLES, materials: ["vacancy", "complex"] },
  { id: "w-owner-price", cat: "work", label: "집주인 시세 안내", brief: "같은 단지 실거래로 시세 알려 드리기",
    purpose: "실거래 근거로 집주인이 시세를 이해하고 매물을 맡기거나 가격을 정하게", reader: "집주인(매물을 내놓을지 고민 중이거나 가격을 정하는 분)",
    must: ["같은 단지·평형 최근 실거래(재료 숫자 그대로)", "최근 흐름 한 줄", "출처(국토교통부 실거래가, 기준일)", "상담 제안"],
    flow: ["인사", "최근 실거래 요약", "흐름 한 줄", "도와드릴 수 있는 것", "출처·서명"],
    first: "'사장님 단지 최근 거래' 같은 직접적인 한 줄", length: "6~10줄", tone: "전문가답고 차분하게", styles: WORK_STYLES, materials: ["complex", "area"] },

  /* ── 블로그 글 ── */
  { id: "b-price", cat: "blog", label: "시세 소식", brief: "동네·단지 실거래 정리",
    purpose: "검색으로 들어온 사람이 끝까지 읽고 이 블로그를 믿게", reader: "그 동네 집값이 궁금한 실거주자·집주인",
    must: ["제목에 지역명 + 시세", "실거래 숫자(재료 그대로)와 기간", "흐름 해석(과장 없이)", "출처·기준일", "궁금하면 물어보라는 끝"],
    flow: ["궁금하게 만드는 첫 문단", "한눈에 요약", "소제목으로 나눈 본문(최근 거래·최고가·흐름)", "읽는 사람에게 주는 의미", "출처·끝인사"],
    first: "첫 문단에서 '내 동네 얘기다' 싶게 — 숫자 하나나 질문으로", length: "1,500~2,500자, 소제목 3~5개", tone: "친절한 동네 전문가", styles: BLOG_STYLES, materials: ["area", "complex"] },
  { id: "b-deal-one", cat: "blog", label: "거래 소식 (한 건)", brief: "예: ○○빌라가 10억에 계약됐다",
    purpose: "눈에 띄는 거래 한 건을 뉴스처럼 알려 클릭하고 끝까지 읽게", reader: "그 동네·단지 시세가 궁금한 사람",
    must: ["단지·건물 이름과 동네", "거래 종류(매매·전세·월세)와 금액·전용면적·층·계약일(재료 그대로)", "같은 단지 이전 거래나 동네 흐름과 비교(재료에 있을 때만)", "출처(국토교통부 실거래가, 기준일)"],
    flow: ["제목·첫 줄에 '어디가 얼마에' 바로", "거래 내용 정리", "이전 거래·주변과 비교", "이 거래가 뜻하는 것(과장 없이)", "출처"],
    first: "'논현동 ○○빌라, 전용 ○㎡ ○억에 계약' 처럼 뉴스 헤드라인으로", length: "800~1,500자", tone: "뉴스처럼 정확하고 빠르게", styles: BLOG_STYLES, materials: ["complex", "area"],
    example: "[단지 이름], 전용 [면적]㎡ [금액]에 계약\n[동네] [단지 이름] 전용 [면적]㎡가 [계약일] [금액]에 [거래 종류] 계약된 것으로 나타났다. ([층]층)\n같은 평형 직전 거래는 [이전 금액]([이전 날짜])이었다.\n…\n자료: 국토교통부 실거래가 ([기준일] 기준)" },
  { id: "b-deals", cat: "blog", label: "거래 현황", brief: "이번 주·이번 달 새 거래",
    purpose: "최신 거래 소식으로 다시 찾아오게", reader: "그 지역 실거래 흐름을 보는 사람",
    must: ["기간", "거래 건수", "눈에 띄는 거래(최고가 등)", "출처·기준일"],
    flow: ["한 줄 요약", "거래 목록 정리", "눈에 띄는 점", "출처"], first: "이번 기간 가장 눈에 띄는 거래 하나로", length: "1,000~1,800자", tone: "뉴스처럼 정확하게", styles: BLOG_STYLES, materials: ["area"] },
  { id: "b-listing", cat: "blog", label: "매물 소개", brief: "내 공실 하나로 정보 글",
    purpose: "광고 티 없이 유익한 정보 글로 읽히고, 끝에서 매물로 이어지게", reader: "그 동네에서 집·사무실을 찾는 사람",
    must: ["동네·생활 정보", "매물 핵심 조건", "실제 장점", "글 끝 짧은 안내"],
    flow: ["동네 이야기로 시작", "이런 분께 맞는 집", "매물 조건", "장점", "확인할 점", "끝"], first: "매물이 아니라 '사는 사람의 하루'로", length: "1,500~2,200자", tone: "정보 글, 부동산 티 없이", styles: BLOG_STYLES, materials: ["vacancy", "complex"] },
  { id: "b-area", cat: "blog", label: "동네·단지 소개", brief: "살기 어때요",
    purpose: "그 동네·단지를 찾는 사람에게 진짜 정보", reader: "이사를 고민 중인 사람",
    must: ["교통", "생활 편의", "단지 정보(재료에 있으면)", "시세 감(재료에 있으면)", "장단점 솔직하게"],
    flow: ["궁금증 던지기", "교통", "생활", "시세", "이런 분께 추천", "끝"], first: "'○○동 살면 어때요?'처럼 검색하는 질문", length: "1,800~2,500자", tone: "솔직한 동네 사람", styles: BLOG_STYLES, materials: ["complex", "area"] },
  { id: "b-news", cat: "blog", label: "정책·뉴스 해설", brief: "뉴스 하나를 쉽게 풀기",
    purpose: "어려운 뉴스를 내 일로 이해하게", reader: "부동산 뉴스가 궁금한 일반인",
    must: ["무슨 일인지 한 줄", "누구에게 영향", "지금 할 일", "원문 출처"], flow: ["한 줄 요약", "배경", "핵심", "나에게 미치는 영향", "정리"],
    first: "'이거 나한테 무슨 상관?'에 답하는 한 줄", length: "1,200~2,000자", tone: "쉽고 차분하게", styles: BLOG_STYLES, materials: ["article"] },
  { id: "b-tip", cat: "blog", label: "계약·안전 팁", brief: "전세사기 예방·등기부 보는 법 등",
    purpose: "실수하지 않게 도와 신뢰를 쌓기", reader: "계약을 앞둔 사람",
    must: ["단계별 체크리스트", "실제로 자주 하는 실수", "확인 방법"], flow: ["경고·공감 첫 문단", "체크리스트", "자주 하는 실수", "정리"],
    first: "'이거 안 보면 큰일 납니다' 같은 경고 또는 공감", length: "1,500~2,200자", tone: "든든한 전문가", styles: BLOG_STYLES },

  /* ── 유튜브 대본 ── */
  { id: "y-area-price", cat: "youtube", label: "내 지역 시세 정보", brief: "동네 실거래 정리 쇼츠·영상",
    purpose: "첫 3초에 멈추고 끝까지 보게, 동네 사람이 구독하게", reader: "그 동네 집값이 궁금한 시청자",
    must: ["지역명", "가장 눈에 띄는 숫자(재료 그대로)", "최근 거래 몇 개", "흐름 한 줄", "출처 한마디"],
    flow: ["훅(숫자·질문·반전)", "오늘 볼 것 한 줄", "핵심 거래 2~4개", "흐름 정리", "구독·댓글 한마디"],
    first: "숫자나 반전으로 첫 문장 — 3초 안에", length: "고른 길이에 맞게 (60초 ≈ 300자 · 2분 ≈ 650자 · 5분 ≈ 1,600자)", tone: "말하듯, 한 문장은 짧게", styles: YT_STYLES, materials: ["area"] },
  { id: "y-complex", cat: "youtube", label: "내 지역 단지 정보", brief: "단지 하나 소개",
    purpose: "그 단지를 궁금해하는 사람이 끝까지 보게", reader: "그 단지에 관심 있는 시청자",
    must: ["단지 기본(세대수·준공·교통 — 재료에 있는 것)", "시세(재료 그대로)", "장점·확인할 점"], flow: ["훅", "단지 소개", "시세", "장단점", "마무리"],
    first: "'이 단지, 요즘 얼마에 거래될까요?' 같은 궁금증", length: "고른 길이에 맞게", tone: "말하듯", styles: YT_STYLES, materials: ["complex"] },
  { id: "y-deal-one", cat: "youtube", label: "거래 소식 (한 건)", brief: "예: ○○빌라 10억 계약 쇼츠",
    purpose: "거래 한 건으로 3초 안에 멈추고 끝까지 보게", reader: "그 동네 시세가 궁금한 시청자",
    must: ["어디·얼마·몇 ㎡·언제(재료 그대로)", "이전 거래나 동네와 비교 한 줄(재료에 있을 때만)", "출처 한마디"],
    flow: ["금액으로 훅", "어디의 어떤 집인지", "비교", "한 줄 해석", "구독 한마디"], first: "'논현동 빌라가 10억?' 처럼 금액과 놀라움으로", length: "고른 길이에 맞게", tone: "말하듯 빠르게", styles: YT_STYLES, materials: ["complex"] },
  { id: "y-top", cat: "youtube", label: "거래 TOP 5", brief: "이번 달 최고가 거래 순위",
    purpose: "순위 형식으로 끝까지 보게", reader: "동네 시세가 궁금한 시청자",
    must: ["기간·지역", "5위부터 1위까지(재료 그대로)", "한 줄 해석"], flow: ["훅", "5위→1위", "정리"], first: "'1위는 끝에 공개합니다' 같은 기대감", length: "고른 길이에 맞게", tone: "리듬감 있게", styles: YT_STYLES, materials: ["area"] },
  { id: "y-listing", cat: "youtube", label: "매물 소개", brief: "내 공실 영상 원고",
    purpose: "매물을 보러 오고 싶게", reader: "집·사무실을 찾는 시청자",
    must: ["위치", "핵심 조건", "장점", "확인할 점"], flow: ["훅", "위치", "조건", "장점", "확인할 점", "마무리"], first: "이 매물의 가장 강한 장점으로", length: "고른 길이에 맞게", tone: "말하듯", styles: YT_STYLES, materials: ["vacancy", "complex"] },
  { id: "y-news", cat: "youtube", label: "부동산 뉴스 해설", brief: "뉴스 하나 쉽게",
    purpose: "어려운 뉴스를 1분 안에 이해하게", reader: "부동산 뉴스가 궁금한 시청자",
    must: ["무슨 일", "누구에게 영향", "지금 할 일"], flow: ["헤드라인 훅", "배경", "핵심", "의미", "정리"], first: "헤드라인을 내 일처럼", length: "고른 길이에 맞게", tone: "뉴스 앵커처럼 또렷하게", styles: YT_STYLES, materials: ["article"] },
  { id: "y-tip", cat: "youtube", label: "계약·안전 팁", brief: "1분 체크리스트",
    purpose: "저장하고 공유하고 싶게", reader: "계약을 앞둔 시청자",
    must: ["체크리스트 3~5개", "실제 실수 사례(지어내지 말고 일반적인 유형으로)"], flow: ["경고 훅", "체크 1·2·3", "정리"], first: "경고 한 줄", length: "고른 길이에 맞게", tone: "든든하게", styles: YT_STYLES },

  /* ── 내 이야기 ── */
  { id: "s-daily", cat: "story", label: "일상·동네 이야기", brief: "맛집·산책·사무소 일상",
    purpose: "사람 냄새로 친근함과 신뢰", reader: "내 블로그·SNS 이웃", must: ["내가 적은 메모 내용"], flow: ["장면 하나로 시작", "이야기", "느낀 점"],
    first: "구체적인 장면 하나", length: "600~1,200자", tone: "솔직하고 따뜻하게, 광고 티 없이", styles: STORY_STYLES },
  { id: "s-review", cat: "story", label: "거래 후기", brief: "계약 성사 이야기",
    purpose: "실제 경험으로 믿음 주기 (손님 개인정보는 절대 쓰지 않기)", reader: "부동산을 찾는 사람", must: ["어떤 분이 어떤 집을(개인정보 없이)", "어려웠던 점과 해결", "느낀 점"],
    flow: ["그날 장면", "사연", "해결", "느낀 점"], first: "그날의 한 장면", length: "800~1,500자", tone: "진솔하게", styles: STORY_STYLES },
  { id: "s-greet", cat: "story", label: "인사·축하", brief: "명절·생일·개업 축하",
    purpose: "기억에 남는 인사", reader: "손님·지인", must: ["받는 사람에 맞는 한마디"], flow: ["인사", "마음", "덕담"], first: "받는 사람 이름·상황으로", length: "3~5줄", tone: "따뜻하게, 뻔하지 않게", styles: ["정중하게", "따뜻하게", "재치 있게"] },
  { id: "s-column", cat: "story", label: "칼럼·내 경험", brief: "내 분야 경험 정리",
    purpose: "전문가로 기억되기", reader: "부동산에 관심 있는 독자", must: ["내 경험·관점(메모)"], flow: ["질문 또는 장면", "내 경험", "배운 점", "독자에게 한마디"],
    first: "생각을 뒤집는 한 줄", length: "1,200~2,000자", tone: "차분한 전문가", styles: STORY_STYLES, materials: ["article"] },
];

export const cardsOf = (cat: Cat) => CARDS.filter((c) => c.cat === cat);
export const cardById = (id: string) => CARDS.find((c) => c.id === id);

export type Material = { kind: "vacancy" | "complex" | "area" | "article"; title: string; text: string };

/* 누구나 지키는 글쓰기 규칙 — 점검표 */
const RULES = [
  "사실(숫자·가격·주소·날짜·이름·세대수 등)은 [재료]와 [요청]에 있는 것만 쓴다. 없으면 지어내지 말고 [손님 이름]·[시간]처럼 대괄호 빈칸으로 남긴다.",
  "AI 티 나는 말을 쓰지 않는다: '다양한', '최적의', '완벽한', '~할 수 있습니다'의 반복, '결론적으로', '요약하자면', '여러분', 과한 느낌표·이모지.",
  "한 문장은 짧게. 어려운 말 대신 쉬운 말. 같은 말을 되풀이하지 않는다.",
  "막연한 칭찬 대신 구체적인 사실. 읽는 사람이 얻는 것을 먼저, 설명은 뒤에.",
  "과장·단정 금지: '무조건 오른다', '최저가 보장', '투자 수익 확실' 같은 말은 쓰지 않는다 (부동산 표시·광고 규정).",
  "개인정보(손님·집주인 실명·연락처·동호수)를 지어내거나 넣지 않는다.",
];

function common(card: Card, mats: Material[], more: string) {
  return [
    `[재료 — 공실뉴스 데이터, 사실은 여기 있는 것만]`,
    mats.length ? mats.map((m) => m.text).join("\n\n") : "(재료 없음 — 사실이 필요한 칸은 [빈칸]으로)",
    "",
    `[요청 — 회원이 적은 말, 꼭 반영]`,
    more.trim() || "(없음)",
    "",
    `[글 규칙 — 반드시 지킨다]`,
    ...RULES.map((r, i) => `${i + 1}. ${r}`),
    ...(card.cat === "blog" ? ["7. 회원 블로그 글은 정보 글이다 — 부동산 사무소·중개·물건번호를 본문에 광고처럼 쓰지 않는다. 출처는 글 끝에 작게."] : []),
  ].join("\n");
}

const DUR: Record<string, string> = { "60s": "60초 쇼츠 (말하는 글 280~380자)", "2m": "약 2분 (600~850자)", "5m": "약 5분 (1,500~2,100자)" };

/** 초안 — 스타일이 다른 3개 버전 (style 을 고르면 그 스타일로 3가지 다르게) */
export function draftPrompt(card: Card, o: { mats: Material[]; more: string; style?: string; duration?: string; mine?: string[] }) {
  const styles = o.style ? [o.style, o.style, o.style] : card.styles.slice(0, 3);
  return [
    `당신은 대한민국 부동산 현장을 잘 아는 최고의 카피라이터이자 작가다. 아래 작성법으로 "${card.label}"을(를) 쓴다.`,
    "",
    `[작성법 — ${card.label}]`,
    `- 목적: ${card.purpose}`,
    `- 읽는 사람: ${card.reader}`,
    `- 꼭 들어갈 것: ${card.must.join(" / ")}`,
    `- 순서(뼈대): ${card.flow.join(" → ")}`,
    `- 첫 줄: ${card.first} — 읽는 사람이 멈추게(후킹). 뻔한 인사로 시작하지 않는다${card.cat === "work" ? " (업무 글은 정중한 인사 한 줄 뒤 바로 핵심)" : ""}.`,
    `- 길이: ${card.cat === "youtube" ? DUR[o.duration || "60s"] || card.length : card.length}`,
    `- 말투: ${card.tone}`,
    ...(card.cat === "youtube" ? ["- 대본은 사람이 소리 내어 읽는 원고다: 말하듯, 한 문장은 짧게, 숫자는 읽기 쉽게(예: '12억 3천만 원'). 장면·자막 지시는 쓰지 않는다. 문장마다 줄을 바꾼다."] : []),
    ...(card.example ? [`- 모범 틀(그대로 베끼지 말고 수준을 맞춘다):\n${card.example}`] : []),
    ...(o.mine && o.mine.length ? [`- 이 회원이 좋아한 글(말투·리듬을 닮게, 내용은 베끼지 않는다):\n${o.mine.slice(0, 2).map((t) => `«${t.slice(0, 600)}»`).join("\n")}`] : []),
    "",
    common(card, o.mats, o.more),
    "",
    `[쓰는 방법]`,
    `1) 스타일이 서로 다른 3개 버전을 쓴다: ${styles.map((s, i) => `${String.fromCharCode(65 + i)}=${s}`).join(", ")}${o.style ? " (같은 스타일 안에서 첫 줄·전개를 서로 다르게)" : ""}.`,
    `2) 각 버전을 다 쓴 뒤 스스로 점검하고 고친다: 첫 줄이 멈추게 하는가 · 핵심이 앞에 있는가 · 꼭 들어갈 것이 다 있는가 · 문장이 짧은가 · AI 티·과장이 없는가 · 사실이 재료에 있는 것뿐인가 · 끝에 다음 행동 한 줄이 있는가.`,
    `3) 고친 최종본만 낸다. 버전마다 어울리는 제목(블로그·대본은 검색·클릭을 부르는 제목, 업무 글은 짧은 이름)을 붙인다.`,
    "",
    `[답 형식 — 설명 없이 JSON 하나만]`,
    `{"versions":[{"style":"${styles[0]}","title":"…","text":"…"},{"style":"${styles[1]}","title":"…","text":"…"},{"style":"${styles[2]}","title":"…","text":"…"}]}`,
    `text 안의 줄바꿈은 \\n 으로.`,
  ].join("\n");
}

/** 다듬기 — 전체 또는 고른 부분만. 회원이 손으로 쓴 줄(keep)은 그대로 둔다 */
export const POLISH: Record<string, string> = {
  spell: "맞춤법·띄어쓰기·어색한 문장만 바로잡는다. 내용·길이·말투는 바꾸지 않는다.",
  polite: "더 정중하고 공손하게. 내용은 그대로.",
  short: "핵심만 남겨 더 짧게. 꼭 들어갈 정보는 빼지 않는다.",
  long: "읽는 사람에게 도움이 되는 구체적인 내용을 더해 조금 더 길게. 사실은 재료에 있는 것만.",
  hook: "첫 줄(첫 문장)을 훨씬 강하게 — 멈춰서 읽게. 나머지는 거의 그대로.",
  read: "더 잘 읽히게: 문장을 짧게 끊고, 순서를 정리하고, 군더더기를 뺀다.",
  friendly: "더 친근하고 부드럽게. 내용은 그대로.",
  strong: "더 설득력 있고 힘 있게. 과장 없이.",
  again: "같은 뜻으로 완전히 새로 쓴다.",
};

export function polishPrompt(card: Card | undefined, o: { text: string; how: string; ask?: string; part?: string; keep?: string[]; mats: Material[] }) {
  const job = o.ask ? `회원 요청: ${o.ask}` : POLISH[o.how] || o.how;
  const head = [
    `당신은 대한민국 부동산 현장을 잘 아는 최고의 편집자다. ${card ? `"${card.label}" 글을` : "글을"} 다듬는다.`,
    `[할 일] ${job}`,
    ...(o.keep && o.keep.length ? [`[그대로 둘 문장 — 회원이 직접 쓴 것, 한 글자도 바꾸지 않는다]\n${o.keep.map((k) => `- ${k}`).join("\n")}`] : []),
    `[재료 — 사실은 여기 있는 것만]\n${o.mats.length ? o.mats.map((m) => m.text).join("\n\n") : "(없음)"}`,
    `[규칙]\n${RULES.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
  ];
  if (o.part) {
    return [...head,
      `[전체 글 — 흐름 참고용, 이 중 아래 부분만 바꾼다]\n${o.text}`,
      `[바꿀 부분]\n${o.part}`,
      `[답 형식 — 설명 없이 JSON 하나만] {"replace":"바꾼 부분만 (앞뒤 글과 자연스럽게 이어지게)"}`].join("\n\n");
  }
  return [...head, `[글]\n${o.text}`, `[답 형식 — 설명 없이 JSON 하나만] {"title":"(바꿀 필요 없으면 빈 글자)","text":"다듬은 전체 글 (줄바꿈은 \\n)"}`].join("\n\n");
}

/** AI 답에서 JSON 꺼내기 — 코드 울타리·앞뒤 말이 있어도 */
export function parseJson<T = unknown>(raw: string): T | null {
  const s = String(raw || "").replace(/```(?:json)?/gi, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)) as T; } catch {
    try { return JSON.parse(s.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1")) as T; } catch { return null; }
  }
}
