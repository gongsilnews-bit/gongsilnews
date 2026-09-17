const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_ID = "e1dcc122-f243-46cd-b5c4-e06db99f4b5f";
const ADMIN_NAME = "공실뉴스";
const ADMIN_EMAIL = "gongsilnews@gmail.com";

const scheduledArticles = [
  // ── 1. 08:00 KST: 스포츠 ──
  {
    title: "손흥민 침묵 깬 '멀티골 폭발'… 토트넘 에이스의 완벽한 부활",
    subtitle: "프리미어리그 경기서 2골 몰아치며 경기 최우수선수 선정\n현지 언론 평점 9점 극찬… 주장으로서 흔들리던 팀 위기서 구출\n체력 논란 불식시키며 득점왕 경쟁 다시 합류",
    section1: "라이프·오피니언",
    section2: "스포츠/연예/기타",
    scheduledAt: "2026-09-17T08:00:00+09:00",
    isHeadline: false,
    isImportant: false,
    thumbnailUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1000",
    keywords: ["손흥민", "토트넘", "프리미어리그", "멀티골", "축구"],
    contentBody: `<p>토트넘 홋스퍼의 캡틴 <b>손흥민이 통렬한 멀티골</b>을 터뜨리며 팀의 완승을 견인했다. 시즌 초반 일부 현지 매체의 성급한 기량 저하 우려를 단 한 경기 만에 완벽히 불식시키며 잉글랜드 프리미어리그(EPL) 최정상급 윙어로서의 클래스를 다시 한번 입증했다.</p>

<p><b>■ 전반 25분 전매특허 감아차기, 후반 쐐기골까지 '원맨쇼'</b><br>
손흥민은 홈경기에서 선발 출전해 전반 25분 페널티박스 왼쪽 모서리 부근에서 특유의 오른발 감아차기 슈팅으로 골문 구석을 갈랐다. 이어 후반 32분 역습 찬스에서는 폭발적인 50m 질주 끝에 골키퍼 다리 사이를 꿰뚫는 감각적인 왼발 슈팅으로 승부에 쐐기를 박았다. 경기 내내 키패스 4회, 유효슈팅 3회를 기록하며 공격 전반을 지휘했다.</p>

<p><b>■ 현지 매체 평점 9.2점 만점급 찬사… "주장의 품격"</b><br>
경기 종료 후 영국 공영방송 BBC와 축구 통계 매체 후스코어드닷컴은 손흥민에게 <b>양 팀 통틀어 최고인 평점 9.2점</b>을 부여하며 '플레이어 오브 더 매치(Player of the Match)'로 선정했다. 현지 언론은 "손흥민이 왜 지난 10년간 토트넘의 심장이었는지 증명했다"며 "위기의 순간마다 팀을 구해내는 진정한 리더"라고 극찬을 아끼지 않았다.</p>

<p><b>■ 체력 부담 논란 털어내고 통산 득점 랭킹 단독 17위 등극</b><br>
이번 2골로 손흥민은 EPL 통산 득점 순위에서 단독 17위로 올라서며 아스널의 전설 이안 라이트의 기록을 턱밑까지 추격했다. A매치 장거리 이동에 따른 체력 저하 우려 속에서도 철저한 자기관리와 전술적 유연성을 발휘하며 팀의 4위권 안착을 이끌고 있다.</p>

<p><b>■ 향후 트렌드 및 전망</b><br>
손흥민의 화려한 부활은 토트넘의 유럽 챔피언스리그 진출 경쟁에 강력한 추진력을 제공할 전망이다. 에이스의 경기력 회복은 국내 축구 팬들의 열기를 재점화하는 동시에 스포츠 중계권 시장 및 관련 머천다이징 산업에도 긍정적인 파급효과를 미치고 있다.</p>`
  },

  // ── 2. 09:30 KST: 정치/정책 ──
  {
    title: "국회 정무위 '가계대출 청문회' 격돌… 금융위-금감원 책임론",
    subtitle: "가계빚 억제책 오락가락 정책 혼선에 여야 의원 일제히 질타\n실수요자 대출 한도 급감에 따른 서민 주거 사다리 단절 비판\n금융당국 3단계 DSR 조기 도입 검토 발표 여부에 촉각",
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    scheduledAt: "2026-09-17T09:30:00+09:00",
    isHeadline: false,
    isImportant: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=1000",
    keywords: ["국회정무위", "가계대출규제", "금융위원회", "스트레스DSR", "정책금융"],
    contentBody: `<p>국회 정무위원회가 개최한 금융당국 대상 긴급 현안 질의에서 <b>급증하는 가계부채와 은행권 대출 옥죄기 정책 혼선</b>을 두고 여야 의원들의 거센 질타가 쏟아졌다. 정부의 2단계 스트레스 DSR 시행 연기와 오락가락 가이드라인이 시장의 혼란을 키웠다는 비판이 정면으로 제기됐다.</p>

<p><b>■ "대출 막차 타기 부추긴 꼴"… 정책 엇박자 도마 위</b><br>
여야 의원들은 당초 7월로 예정됐던 2단계 스트레스 DSR 도입을 9월로 2개월 전격 유예한 결정이 <b>여름철 가계대출 폭증과 서울 집값 급등의 불씨</b>를 당겼다고 집중 성토했다. 한 야당 의원은 "금융위원회의 규제 유예 결정으로 수십조 원의 영끌 막차 대출이 쏟아져 들어왔다"며 정책 실패를 지적했고, 여당 의원 역시 "은행별 제각각 대출 중단으로 실수요자들의 피해가 극심하다"고 목소리를 높였다.</p>

<p><b>■ 무주택 서민 디딤돌·버팀목 대출 축소 논란에 금융위원장 답변</b><br>
특히 정책자금 대출 한도 축소 방침으로 인해 신혼부부와 청년층의 주거 계획이 흔들리고 있다는 지적에 대해 금융위원장은 "서민과 취약계층의 실수요 자금은 최대한 보호하되, 갭투자나 다주택자의 투기성 자금 유입은 철저히 차단하는 정밀 타격 방식을 정착시키겠다"고 해명했다.</p>

<p><b>■ 3단계 DSR 조기 도입 및 전세대출 DSR 반영 검토 수위 주목</b><br>
금융당국은 이날 질의에서 시장 불안이 지속될 경우 <b>스트레스 DSR 3단계를 조기 시행하고 전세대출 및 정책대출 원리금까지 DSR 산정에 포함</b>하는 고강도 추가 규제 카드를 만지작거리고 있음을 시사했다. 부동산 금융 시장 전반의 대출 한파가 한층 매서워질 조짐이다.</p>

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">금융당국의 대출 총량 규제가 2금융권으로 풍선효과를 차단하기 위해 확대 적용될 가능성이 매우 높다. <b>주택 매수자</b>는 기존 신용대출을 일부 상환해 DSR 여유를 선제적으로 확보해야 하며, <b>임대인</b>은 전세대출 규제 강화로 보증금 증액이 어려워진 세입자들의 월세 전환 수요에 유연하게 대응해야 한다.</p>
</div>`
  },

  // ── 3. 11:00 KST: 경제 ──
  {
    title: "한국은행 금통위 '금리 인하 고심'… 부동산 자극 vs 내수 진작",
    subtitle: "물가상승률 2% 진입으로 통화 긴축 완화 여건 조성\n수도권 집값 상승세와 가계대출 폭증이 금리 인하 최대 걸림돌\n한미 금리차 2.0%p 역전 장기화 속 환율 방어 복합 딜레마",
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
    scheduledAt: "2026-09-17T11:00:00+09:00",
    isHeadline: false,
    isImportant: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1000",
    keywords: ["한국은행", "기준금리", "금통위", "통화정책", "물가안정"],
    contentBody: `<p>한국은행 금융통화위원회의 기준금리 결정을 앞두고 이창용 총재와 금통위원들의 고심이 깊어지고 있다. 소비자물가 상승률이 한은의 목표치인 <b>2.0%에 안착하며 금리 인하의 명분</b>이 충분히 쌓였지만, 서울 수도권 아파트값 상승세와 가계부채 증가 속도가 발목을 잡고 있기 때문이다.</p>

<p><b>■ 내수 부진과 자영업 연체율 고려하면 '금리 인하' 시급</b><br>
소비와 건설투자가 동반 위축되며 2분기 경제성장률이 마이너스를 기록하는 등 실물 경제 침체 경고등이 켜졌다. 자영업자 다중채무가 740조 원을 돌파하고 연체율이 치솟으면서 정치권과 재계에서는 한은이 선제적으로 기준금리를 낮춰 내수 경기에 활력을 불어넣어야 한다는 압박 수위를 높이고 있다.</p>

<p><b>■ 집값·가계빚 폭탄 우려에 '피벗(통화정책 전환)' 지연 불가피론</b><br>
그러나 섣부른 금리 인하가 자칫 서울 강남과 마용성을 중심으로 재점화된 부동산 매수 심리에 기름을 부을 수 있다는 경계감이 팽배하다. 한은 금통위 회의록에 따르면 다수의 위원들이 "통화 완화 신호가 부동산 시장 과열과 가계대출 재확산의 기폭제가 되어서는 안 된다"는 매파적(통화 긴축 선호) 입장을 견지하고 있다.</p>

<p><b>■ 美 연준 금리 결정과 거시건전성 정책 공조가 최종 변수</b><br>
결국 한국은행의 금리 인하 시점은 미국 연준의 금리 인하 폭(0.25%p 또는 0.5%p 빅컷)과 정부의 스트레스 DSR 2단계 대출 억제 효과가 9월 중순 이후 지표로 확인되는 시점에 좌우될 전망이다. 시장 전문가들은 10월 또는 11월 베이비스텝(0.25%p 인하) 개시를 유력하게 점치고 있다.</p>

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">한은의 금리 인하가 단행되더라도 가계대출 총량 규제로 인해 은행의 가산금리가 유지되어 체감 대출금리 하락 폭은 제한적일 수 있다. <b>부동산 투자자</b>는 과도한 차입형 투자를 지양하고, 금리 인하기 자금 이동이 예상되는 고배당 리츠 및 월세 수익형 우량 부동산으로 포트폴리오를 재편해야 한다.</p>
</div>`
  },

  // ── 4. 12:30 KST: 스포츠 ──
  {
    title: "'가을야구 티켓 잡아라'… 프로야구 5강 막판 단두대 매치",
    subtitle: "5위 자리 두고 3개 팀 반 경기 차 살얼음판 승부\n선발 투수 총력전 및 불펜 조기 투입 '내일 없는' 혈투 예고\n가을야구 진출 여부에 따라 사령탑 거취와 연봉 협상 분수령",
    section1: "라이프·오피니언",
    section2: "스포츠/연예/기타",
    scheduledAt: "2026-09-17T12:30:00+09:00",
    isHeadline: false,
    isImportant: false,
    thumbnailUrl: "https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&q=80&w=1000",
    keywords: ["프로야구", "KBO리그", "가을야구", "포스트시즌", "5강싸움"],
    contentBody: `<p>2026 KBO 프로야구 정규시즌이 막바지로 치달으면서 <b>포스트시즌 진출의 마지노선인 '5위'</b>를 차지하기 위한 중위권 팀들의 혈투가 절정으로 치닫고 있다. 5위부터 7위까지 단 <b>0.5경기에서 1경기 차</b>로 촘촘히 맞물려 매 경기 결과에 따라 순위표가 롤러코스터를 타는 형국이다.</p>

<p><b>■ 선발 에이스 당겨쓰기·불펜 필승조 총동원 '총력전'</b><br>
각 팀 사령탑들은 잔여 경기에서 '내일은 없다'는 각오로 총력전을 선언했다. 주말 3연전에 선발 로테이션을 파괴하고 에이스 투수의 4일 휴식 후 등판을 감행하는가 하면, 경기 중반 승부처마다 필승 불펜진을 1이닝 이상 조기 투입하는 승부수를 띄우고 있다. 타선에서도 부상 투혼을 불사르는 베테랑들의 클러치 능력이 승패를 가르고 있다.</p>

<p><b>■ 사령탑 재계약과 선수단 연봉 직결… "가을야구는 생존권"</b><br>
5강 진출 여부는 단순히 한 시즌의 성적을 넘어 구단 프런트와 코칭스태프의 거취를 결정짓는 핵심 잣대다. 포스트시즌 진출에 실패할 경우 감독 교체와 대대적인 선수단 개편이 불가피한 만큼 벤치의 지략 대결도 한층 날카로워졌다. 관중석 역시 연일 매진을 기록하며 열기가 뜨겁게 달아오르고 있다.</p>

<p><b>■ 잔여 경기 우천 취소 변수와 더블헤더 체력 싸움이 관건</b><br>
가을장마로 인한 우천 취소 경기들이 편성되면서 잔여 일정의 빽빽한 이동 동선과 더블헤더 소화가 마지막 암초로 부상했다. 체력적 한계에 부딪힌 주전 선수들의 부상 방지와 백업 뎁스의 활약이 5강 티켓의 주인을 결정할 최종 열쇠가 될 전망이다.</p>

<p><b>■ 향후 트렌드 및 전망</b><br>
역대급 흥행 신기록을 경신 중인 KBO 리그는 막판 5강 순위 싸움이 더해지며 가을야구 열기가 사상 최고조에 달할 것으로 기대된다. 구장 인근 상권의 F&B 소비 진작과 유니폼·굿즈 판매 등 스포츠 산업 전반의 낙수효과도 두드러지고 있다.</p>`
  },

  // ── 5. 14:00 KST: 정치/정책 ──
  {
    title: "종부세 개편안 정기국회 격돌… '폐지 vs 완화' 평행선",
    subtitle: "1주택자 세 부담 축소 공감대 속 다주택자 중과세 유지 팽팽\n지방 재정 교부금 축소 우려로 야당 신중론 vs 여당 폐지론\n세법 개정안 통과 지연 시 연말 고지서 혼란 불가피 전망",
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    scheduledAt: "2026-09-17T14:00:00+09:00",
    isHeadline: false,
    isImportant: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=1000",
    keywords: ["종합부동산세", "종부세개편", "정기국회", "세제개편안", "조세정책"],
    contentBody: `<p>정기국회가 본격적인 법안 심사에 돌입한 가운데 <b>종합부동산세(종부세) 개편안</b>이 여야 간 최대 쟁점 법안으로 급부상했다. 실거주 1주택자에 대한 징벌적 과세 완화에는 여야 모두 일정 부분 공감대를 형성했으나, 다주택자 중과세 폐지와 종부세의 지방세 전환을 두고는 첨예한 시각차를 드러내고 있다.</p>

<p><b>■ 여당 "종부세 근본적 폐지 후 재산세 통합 추진"</b><br>
여당은 부동산 시장의 정상화와 조세 정의 실현을 위해 종부세를 장기적으로 폐지하고 재산세로 단일화해야 한다는 입장이다. 특히 고가 1주택자라 할지라도 소득이 없는 고령 은퇴자에게 억대 세금을 부과하는 것은 부당하다며, 1주택자 기본공제 금액을 현행 12억 원에서 <b>15억 원으로 상향</b>하고 3주택 이상 다주택자 중과세율(최고 5.0%)을 일반세율 수준으로 정상화해야 한다고 주장한다.</p>

<p><b>■ 야당 "부자 감세 불가… 지방 재정 악화 막을 대안 부재"</b><br>
반면 야당은 종부세 대폭 완화나 폐지는 자산 양극화를 심화시키는 '초부자 감세'라며 강하게 반발하고 있다. 특히 종부세 전액이 지방교부세 형태로 재정자립도가 열악한 지방자치단체에 배분되는 구조상, 종부세수를 축소할 경우 지방 소멸 위기와 지방 재정 파탄을 초래할 수 있다는 점을 핵심 반대 논리로 내세우고 있다.</p>

<p><b>■ 11월 세법 개정 시한 임박… '부분 타협안' 도출 가능성</b><br>
연말 종부세 고지서 발송 시점이 임박한 만큼 국회 기획재정위원회는 11월 예산안 처리 법정 시한까지 치열한 줄다리기를 이어갈 것으로 보인다. 전문가들은 다주택자 전면 중과 폐지 대신 <b>1주택자 세 부담 완화 및 고령·장기보유자 공제율 확대</b> 선에서 절충안이 마련될 가능성에 무게를 두고 있다.</p>

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">종부세 개편 방향은 다주택자의 '똘똘한 한 채' 쏠림 현상을 결정짓는 중대 분수령이다. <b>주택 보유자</b>는 9월 16일부터 30일까지 진행되는 종부세 합산배제(임대주택 등록) 신청을 누락 없이 마쳐야 하며, 연말 세법 개정안의 최종 국회 통과 추이를 확인한 후 매도 및 증여 계획을 수립해야 한다.</p>
</div>`
  },

  // ── 6. 15:30 KST: 경제 ──
  {
    title: "코스피 '외국인 순매수' 힘입어 반등… 반도체·금융주 견인",
    subtitle: "글로벌 AI 칩 수요 회복세에 삼성전자·SK하이닉스 동반 강세\n밸류업 프로그램 세제 지원 기대감에 은행·증권주 신고가 경신\n달러 약세 전환에 따른 아시아 신흥국 증시 자금 유입 가속화",
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
    scheduledAt: "2026-09-17T15:30:00+09:00",
    isHeadline: false,
    isImportant: false,
    thumbnailUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1000",
    keywords: ["코스피", "외국인순매수", "반도체주", "밸류업", "증시전망"],
    contentBody: `<p>국내 증시가 외국인 투자자들의 강한 매수세에 힘입어 반등에 성공하며 <b>코스피 지수가 주요 저항선을 돌파</b>했다. 미국 빅테크 기업들의 AI 데이터센터 투자 확대 지속 소식에 대형 반도체주가 지수를 견인했고, 정부의 기업 밸류업 프로그램 세제 혜택 구체화에 금융주가 화답했다.</p>

<p><b>■ 외국인 유가증권시장서 6,500억 원 순매수… 3거래일 만에 매수 전환</b><br>
한국거래소에 따르면 외국인은 코스피 시장에서 <b>6,520억 원</b> 어치를 사들이며 지수 상승을 주도했다. 기관 역시 2,300억 원의 순매수를 기록하며 힘을 보탰다. 반면 개인 투자자들은 단기 차익 실현에 나서며 8,000억 원 넘게 순매도했다.</p>

<p><b>■ SK하이닉스·삼성전자 'HBM 모멘텀' 재부각</b><br>
대장주 삼성전자와 SK하이닉스는 고대역폭메모리(HBM) 차세대 라인업 공급 계약 기대감에 나란히 <b>3~4%대 급등세</b>를 연출했다. 인공지능 수익성 거품론으로 한동안 조정을 받던 글로벌 반도체 밸류체인이 빅테크들의 실적 호조와 클라우드 수주 잔고 증가로 안도 랠리를 펼치고 있다는 분석이다.</p>

<p><b>■ 저PBR 금융지주사 52주 신고가… 주주환원율 확대 호재</b><br>
KB금융, 신한지주 등 대형 금융지주사들도 자사주 매입·소각 등 주주환원 정책을 발표하며 52주 신고가를 갈아치웠다. 배당소득 분리과세 등 밸류업 관련 세법 개정안의 정기국회 통과 기대감이 기관과 외국인 롱펀드의 유입을 자극하고 있다.</p>

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">증시 반등세가 이어지면서 자산 시장 내 '머니무브'의 향방에 주목해야 한다. <b>개인 투자자</b>는 금리 인하기 유동성 혜택을 받는 고배당 가치주와 실적 턴어라운드 반도체 소부장 종목으로 분산 투자하고, 부동산 담보대출을 활용한 무리한 레버리지 주식 투자는 변동성 확대 국면에서 엄격히 지양해야 한다.</p>
</div>`
  },

  // ── 7. 17:00 KST: 스포츠 ──
  {
    title: "한국 골프 영건들의 대반란… PGA·LPGA 동반 우승 신호탄",
    subtitle: "정교한 아이언샷과 멘털 무장으로 美 투어 리더보드 점령\n해외 명문 골프장 적응력 극대화… K-골프 세대교체 가속화\n기업 후원 열기와 함께 국내 골프장 회원권 시장에도 훈풍",
    section1: "라이프·오피니언",
    section2: "스포츠/연예/기타",
    scheduledAt: "2026-09-17T17:00:00+09:00",
    isHeadline: false,
    isImportant: false,
    thumbnailUrl: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=1000",
    keywords: ["한국골프", "PGA투어", "LPGA투어", "골프유망주", "스포츠"],
    contentBody: `<p>한국 20대 젊은 골퍼들이 미국프로골프(PGA) 투어와 미국여자프로골프(LPGA) 투어에서 <b>동시에 리더보드 최상단을 장악</b>하며 세계 골프계를 뒤흔들고 있다. 탄탄한 기본기와 현대적인 장타력, 흔들리지 않는 멘털로 무장한 '골프 영건'들이 대한민국 골프의 새로운 전성기를 열어젖혔다.</p>

<p><b>■ PGA 투어 김주형·안병훈 선두권 질주… 페덱스컵 포인트 껑충</b><br>
미국 현지에서 열린 PGA 투어 정규 대회 3라운드에서 김주형은 정교한 컴퓨터 아이언샷과 신들린 퍼팅감을 앞세워 보기 없이 버디만 7개를 낚아채며 단독 2위로 도약했다. 페어웨이 안착률 85%를 기록하며 난도 높은 코스를 완벽히 공략한 그는 최종 라운드에서 통산 4번째 우승 트로피를 정조준하고 있다.</p>

<p><b>■ LPGA 신예 루키 군단, 첫날부터 몰아치기로 단독 선두</b><br>
LPGA 무대에서도 KLPGA를 평정하고 미국으로 건너간 신예들이 압도적인 경기력을 뽐냈다. 260야드를 넘나드는 호쾌한 드라이버 샷과 날카로운 숏게임으로 코스 레코드를 갈아치우며 단독 선두로 치고 나갔다. 선배 세대의 계보를 잇는 특유의 승부사 기질이 미국 갤러리들의 뜨거운 환호를 이끌어냈다.</p>

<p><b>■ K-골프 산업 글로벌 확장과 주니어 아카데미 붐</b><br>
한국 영건들의 눈부신 활약은 국내 골프 산업 전반에도 활력을 불어넣고 있다. 유망주들을 조기 발굴해 후원하는 금융·건설 대기업들의 스포츠 마케팅 투자가 확대되고 있으며, 첨단 트랙맨 분석 시스템을 도입한 주니어 전문 아카데미와 피팅 클럽 시장도 동반 성장세를 나타내고 있다.</p>

<p><b>■ 향후 트렌드 및 전망</b><br>
한국 남녀 골프의 세계 무대 동반 강세는 단순한 일회성 돌풍이 아닌 견고한 주니어 육성 시스템의 결실이다. 글로벌 스타 플레이어의 탄생은 국내 골프장 및 레저 부동산, 스포츠 엔터테인먼트 시장의 자산가치를 한 단계 끌어올리는 기폭제가 될 것이다.</p>`
  },

  // ── 8. 18:30 KST: 정치/정책 ──
  {
    title: "'수도권 그린벨트 해제' 후속 대책… 보상 갈등과 환경단체 반발",
    subtitle: "2만 가구 신규 공급 후보지 발표 앞두고 토지 보상 협상 난항\n녹지 훼손 막기 위한 대체 생태 벨트 조성 등 보완책 요구\n토지 수용 보상금 풀릴 경우 인근 부동산 시장 유동성 자극 우려",
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    scheduledAt: "2026-09-17T18:30:00+09:00",
    isHeadline: false,
    isImportant: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000",
    keywords: ["그린벨트해제", "수도권주택공급", "토지보상", "환경정책", "도시개발"],
    contentBody: `<p>정부가 서울과 인접 수도권 개발제한구역(그린벨트)을 풀어 <b>총 2만 가구 규모의 신규 공공택지를 공급</b>하겠다는 계획의 세부 후보지 발표를 앞두고, 현지 주민들의 토지 보상 갈등과 환경단체의 거센 반발이 정면충돌하고 있다.</p>

<p><b>■ 후보지 거론되는 서초 내곡·강남 세곡 일대 투기 감시 강화</b><br>
국토교통부와 서울시는 그린벨트 해제 예정지로 유력 거론되는 서울 강남권 외곽과 하남, 고양 등 주요 접경지역 일대를 토지거래허가구역으로 묶고 기획부동산의 지분 쪼개기 투기 단속에 착수했다. 하지만 이미 호가가 30~50% 뛴 토지주들은 "공시지가 기준 헐값 수용은 절대 불가하다"며 비상대책위원회를 구성하고 실거래가 전액 보상을 요구하며 집단행동을 예고했다.</p>

<p><b>■ 환경단체 "미래 세대 허파 파괴… 난개발 악순환 멈춰야"</b><br>
환경운동연합 등 시민사회단체는 서울 도심의 열섬 현상을 막아주는 마지막 보루인 그린벨트를 훼손하는 것은 기후위기 시대에 역행하는 근시안적 정책이라고 강력히 규탄했다. 이미 지정된 3기 신도시와 도심 내 유휴 부지 개발도 지연되는 마당에 또다시 자연녹지를 파헤치는 것은 환경 파괴만 부를 뿐 집값 안정 효과는 미미할 것이라는 지적이다.</p>

<p><b>■ 수조 원 토지보상금 풀릴 경우 '주변 부동산 풍선효과' 뇌관</b><br>
부동산 경제학자들은 토지 수용 과정에서 풀려나갈 <b>수조 원대 현금 보상금</b>이 인근 토지와 상가, 아파트 시장으로 재유입되는 '유동성 풍선효과'를 우려하고 있다. 과거 2기·3기 신도시 개발 당시에도 보상금을 받은 토지주들의 대토(代土) 수요가 주변 부동산 가격을 자극했던 전례가 재현될 수 있다는 경고다.</p>

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">그린벨트 해제 후 실제 첫 입주까지는 토지 보상과 인허가 절차로 인해 최소 6~8년의 장기 시차가 발생한다. <b>토지 투자자</b>는 개발 기대감만 믿고 맹지나 분할 기획부동산 토지를 매입하는 우를 범하지 말아야 하며, <b>주택 수요자</b>는 단기 분양 환상보다는 기존 신축 및 준공 임박 분양권 매입을 현실적으로 검토해야 한다.</p>
</div>`
  },

  // ── 9. 20:00 KST: 경제 ──
  {
    title: "원·달러 환율 1,320원대 하향 안정… 외환시장 숨고르기",
    subtitle: "美 고용지표 둔화 속 연준 빅컷(0.5%p 인하) 베팅 확대\n수출 기업 결제 수요와 외국인 주식 매수세가 원화 가치 지지\n국제 유가 하락 안정세 맞물리며 무역수지 흑자 행진 기대",
    section1: "부동산·경제",
    section2: "경제/재테크/주식",
    scheduledAt: "2026-09-17T20:00:00+09:00",
    isHeadline: false,
    isImportant: false,
    thumbnailUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=1000",
    keywords: ["원달러환율", "외환시장", "미국금리인하", "빅컷", "무역수지"],
    contentBody: `<p>연초 1,400원 선을 위협하며 가파르게 치솟았던 <b>원·달러 환율이 1,320원 선으로 내려앉으며</b> 외환시장이 뚜렷한 안정세를 찾고 있다. 미국 연방준비제도(Fed)의 통화정책 완화 기대감과 국내 수출 호조세가 맞물리면서 원화 가치를 견인하는 모양새다.</p>

<p><b>■ 美 달러 인덱스 100선 붕괴 위기… 글로벌 강달러 후퇴</b><br>
서울 외환시장에서 원·달러 환율은 전일 대비 5.8원 내린 <b>1,324.5원</b>에 거래를 마감했다. 미국 노동시장의 신규 고용 지표가 둔화세를 보이자 선물 시장에서는 연준이 9월 FOMC(연방공개시장위원회)에서 기준금리를 0.5%p 내리는 '빅컷'을 단행할 확률을 40% 이상으로 점치고 있다. 이에 따라 주요국 통화 대비 달러화 가치를 나타내는 달러 인덱스가 101선 밑으로 주저앉았다.</p>

<p><b>■ 반도체·자동차 수출 호조로 무역수지 15개월 연속 흑자</b><br>
환율 하향 안정을 뒷받침하는 또 다른 기둥은 견고한 무역수지다. 반도체 수출이 전년 대비 30% 이상 폭증하고 친환경차와 하이브리드 차량의 대미 수출이 호조를 이어가며 경상수지 흑자 기조가 공고해졌다. 달러를 보유하고 있던 수출 기업들의 네고 물량(달러 매도) 출회가 환율 상단을 강하게 압박하고 있다.</p>

<p><b>■ 수입 물가 안정과 부동산 PF 자금 조달 비용 부담 완화</b><br>
환율 안정은 원유와 철근, 시멘트 등 원자재 수입 물가를 낮추어 건축비 상승 압력을 완화하는 데 직접적인 기여를 하고 있다. 환율 급등으로 외화 유동성 경색을 겪던 국내 금융권과 건설사들의 해외 자금 조달 여건도 한결 개선될 것이라는 전망이다.</p>

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">환율 하락 국면에서는 달러화 자산 일변도의 투자 비중을 조절하고 원화 기반 우량 배당 자산으로 눈을 돌릴 필요가 있다. <b>해외 부동산 및 외화 투자자</b>는 환율 변동에 따른 환차손 리스크를 헤지(Hedge)하고, 수입 원자재 가격 안정에 따른 건축·리모델링 공사비 견적을 재산정하여 시공 계약을 맺는 것이 유리하다.</p>
</div>`
  },

  // ── 10. 21:30 KST: 정치/정책 ──
  {
    title: "여야 지도부 '민생 경제 입법' 회동… 상가임대차·세법 개정 분수령",
    subtitle: "추석 앞두고 민생 안정 법안 우선 처리 원칙 잠정 합의\n소상공인 임대료 세액공제 연장 및 전통시장 활성화 방안 논의\n쟁점 법안 이견 속에서도 정기국회 첫 경제 협치 모델 주목",
    section1: "부동산·경제",
    section2: "부동산정책/정치",
    scheduledAt: "2026-09-17T21:30:00+09:00",
    isHeadline: false,
    isImportant: true,
    thumbnailUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1000",
    keywords: ["민생경제", "정기국회", "상가임대차법", "소상공인지원", "세법개정"],
    contentBody: `<p>여야 원내 지도부가 국회에서 비공개 만찬 회동을 갖고 극심한 내수 불황으로 고통받는 자영업자와 서민층을 지원하기 위한 <b>'민생 경제 법안 패스트트랙 처리'</b>에 원칙적으로 합의했다. 극한의 정쟁을 벌이던 여야가 민생 구제라는 대의명분 아래 첫 경제 협치에 나선 것이어서 법안 통과 여부에 비상한 관심이 쏠린다.</p>

<p><b>■ 착한 임대인 세액공제 일몰 연장 및 공제율 상향 논의</b><br>
이날 회동의 핵심 의제 중 하나는 상가 임대차 시장의 연착륙이었다. 여야는 올해 말로 끝나는 <b>'착한 임대인 세액공제(임대료 인하액의 최대 70% 세액공제)' 제도를 2년 추가 연장</b>하고, 공실을 털어내기 위해 초기 렌트프리를 제공한 임대인에게도 세제 혜택을 부여하는 방안을 긍정적으로 검토하기로 했다. 장기 공실 상가에 대한 세 부담 경감책도 함께 테이블에 올랐다.</p>

<p><b>■ 소상공인 전기료·배달비 지원 예산 증액 공감대</b><br>
아울러 폭염과 전기요금 인상으로 시름하는 영세 소상공인을 위해 연간 최대 50만 원의 에너지 바우처를 신설하고, 플랫폼 배달 수수료 상한제 도입 및 공공배달앱 활성화 예산을 내년도 본예산에 대폭 증액 편성하기로 의견을 모았다. 폐업한 자영업자의 재기를 돕는 브릿지 대출 보증 규모도 확대될 전망이다.</p>

<p><b>■ 전세사기 피해자 지원 특별법 보완책 조속 입법 합의</b><br>
또한 피해자 주거 안정을 위한 LH(한국토지주택공사)의 피해주택 우선매수권 활용 및 경매 차익 감정평가 세부 기준을 담은 전세사기 특별법 개정안도 이번 정기국회 첫 본회의에서 우선 처리하기로 뜻을 모았다. 벼랑 끝에 몰린 임차인 구제에 속도가 붙을 전망이다.</p>

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">민생 법안의 국회 통과 여부는 골목상권과 상가 임대차 시장의 회복 속도를 좌우할 핵심 모멘텀이다. <b>상가 건물주</b>는 착한 임대인 세제 혜택 연장 입법 추이를 살펴 임차인과의 임대료 감면 또는 유예 협의를 통해 공실 방어에 적극 나서야 하며, <b>소상공인</b>은 정부와 지자체의 공공 바우처 및 저금리 대환대출 지원 제도를 선제적으로 신청해야 한다.</p>
</div>`
  }
];

async function publishScheduledArticles() {
  console.log(`Starting publication of ${scheduledArticles.length} scheduled articles for ${ADMIN_EMAIL}...`);

  const results = [];

  for (let i = 0; i < scheduledArticles.length; i++) {
    const item = scheduledArticles[i];
    console.log(`\n[${i + 1}/${scheduledArticles.length}] Scheduling: "${item.title}" (${item.section1} > ${item.section2}) for ${item.scheduledAt}...`);

    // 본문 상단에 썸네일 이미지 div 삽입
    const finalContent = `<div style="text-align: center;"><img src="${item.thumbnailUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" /></div><br/>${item.contentBody}`;

    try {
      // 1. articles 테이블에 INSERT (APPROVED 상태, 미래 시간의 published_at)
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .insert({
          title: item.title,
          subtitle: item.subtitle,
          content: finalContent,
          section1: item.section1,
          section2: item.section2,
          status: 'APPROVED',
          published_at: item.scheduledAt,
          thumbnail_url: item.thumbnailUrl,
          youtube_url: null,
          is_headline: item.isHeadline,
          is_important: item.isImportant,
          author_id: ADMIN_ID,
          author_name: ADMIN_NAME,
          author_email: ADMIN_EMAIL,
        })
        .select('id')
        .single();

      if (articleError) {
        console.error(`  -> Error inserting scheduled article:`, articleError.message);
        results.push({ idx: i + 1, title: item.title, status: 'error', error: articleError.message });
        continue;
      }

      console.log(`  -> Scheduled article created with ID: ${article.id}`);

      // 2. article_media 테이블에 등록
      const { error: mediaError } = await supabase
        .from('article_media')
        .insert({
          article_id: article.id,
          media_type: 'PHOTO',
          url: item.thumbnailUrl,
          sort_order: 0
        });

      if (mediaError) {
        console.warn(`  -> Warning inserting media:`, mediaError.message);
      } else {
        console.log(`  -> Media record linked.`);
      }

      // 3. article_keywords 테이블에 등록
      if (item.keywords && item.keywords.length > 0) {
        const keywordRows = item.keywords.map(kw => ({
          article_id: article.id,
          keyword: kw.trim()
        }));

        const { error: kwError } = await supabase
          .from('article_keywords')
          .insert(keywordRows);

        if (kwError) {
          console.warn(`  -> Warning inserting keywords:`, kwError.message);
        } else {
          console.log(`  -> ${item.keywords.length} keywords attached.`);
        }
      }

      results.push({ idx: i + 1, id: article.id, title: item.title, scheduledAt: item.scheduledAt, status: 'success' });
    } catch (err) {
      console.error(`  -> Unexpected error:`, err.message);
      results.push({ idx: i + 1, title: item.title, status: 'error', error: err.message });
    }
  }

  console.log("\n=================================");
  console.log(`Scheduling finished! Success: ${results.filter(r => r.status === 'success').length}/${scheduledArticles.length}`);
  console.log("=================================");
}

publishScheduledArticles();
