// 문서편집 — 새로 만들기 서식 (빈칸은 [&nbsp;] — 회원이 채운다. 예시 값·가짜 정보는 넣지 않는다)
//  file 이 있는 서식 = 정부 원본(한글)을 .hwpx 로 바꿔 public/doc-templates 에 둔 것 — 그대로 연다 (출처: public/doc-templates/README.md)
import { DEFAULT_PAGE, MARGINS, type PageSetup } from "./model";

export type TemplateCat = "basic" | "legal" | "contract" | "office";
export const TEMPLATE_CATS: { id: TemplateCat; name: string }[] = [
  { id: "legal", name: "법정 서식" },
  { id: "contract", name: "계약서" },
  { id: "office", name: "사무소 실무" },
  { id: "basic", name: "일반" },
];
export type Template = { id: string; name: string; desc: string; cat: TemplateCat; html?: string; file?: string; source?: string; page?: Partial<PageSetup>; thumb: string[] };

const NOTE = `<p></p><p><span style="font-size:8pt;color:#7F7F7F">※ 이 서식은 참고용이며 법률 자문이 아닙니다. 법이 바뀌거나 사정이 특별하면 전문가에게 확인하세요. (공실스튜디오 서식)</span></p>`;
const th = (t: string, w?: number) => `<td data-bg="#F2F2F2" style="background-color:#F2F2F2"${w ? ` colwidth="${w}"` : ""}><p style="text-align:center"><strong>${t}</strong></p></td>`;
const td = (t = "", span = 1) => `<td${span > 1 ? ` colspan="${span}"` : ""}><p>${t}</p></td>`;
const kv = (rows: [string, string][], w = 140) => `<table>${rows.map(([a, b]) => `<tr>${th(a, w)}${td(b)}</tr>`).join("")}</table>`;
const title = (t: string) => `<p style="text-align:center"><span style="font-size:22pt"><strong>${t}</strong></span></p><p></p>`;
const sign = (roles: string[]) => `<table>${roles.map((r) => `<tr><td rowspan="3" data-bg="#F2F2F2" style="background-color:#F2F2F2;vertical-align:middle" colwidth="90"><p style="text-align:center"><strong>${r}</strong></p></td>${th("주소", 60)}${td("[주소]", 3)}</tr><tr>${th("성명", 60)}${td("[성명]")}${th("연락처", 60)}${td("[전화번호]")}</tr><tr>${th("생년월일", 60)}${td("[생년월일]")}${th("서명·날인", 60)}${td("(인)")}</tr>`).join("")}</table>`;
const date = `<p style="text-align:center">[&nbsp;&nbsp;&nbsp;&nbsp;]년  [&nbsp;&nbsp;]월  [&nbsp;&nbsp;]일</p>`;

/* ── 일반 ── */
const BASIC: Template[] = [
  { id: "blank", cat: "basic", name: "새 문서", desc: "빈 문서", html: "<p></p>", thumb: [] },
  {
    id: "listing", cat: "basic", name: "매물 소개서", desc: "공실 하나를 손님에게 소개하는 문서", thumb: ["h", "t", "t", "b", "b"],
    html: `<h1 style="text-align:center">매물 소개서</h1><p style="text-align:right">작성일: [날짜]</p>
<h2>1. 매물 개요</h2>${kv([["소재지", "[주소]"], ["건물명", "[건물 이름]"], ["거래 종류", "[매매 · 전세 · 월세]"], ["금액", "[보증금 / 월세 · 매매가]"], ["면적", "[전용 ○○평 (○○㎡)]"], ["층", "[해당 층 / 전체 층]"], ["관리비", "[금액 · 포함 내역]"], ["입주 가능일", "[날짜 · 즉시]"]], 150)}
<p></p><h2>2. 매물 특징</h2><ul><li><p>[특징 1]</p></li><li><p>[특징 2]</p></li><li><p>[특징 3]</p></li></ul>
<h2>3. 주변 환경</h2><p>[교통 · 편의 시설 · 상권]</p><h2>4. 사진</h2><p>[삽입 › 그림 으로 사진을 넣으세요]</p>
<p></p><p style="text-align:right"><strong>[중개사무소 이름]</strong></p><p style="text-align:right">[대표 이름] · [전화번호]</p>`,
  },
  {
    id: "notice", cat: "basic", name: "임대 안내문", desc: "건물에 붙이는 큰 글씨 안내문", thumb: ["H", "H", "b", "t"], page: { margin: { ...MARGINS[1].m } },
    html: `<p style="text-align:center"><span style="font-size:60pt"><strong>임 대</strong></span></p><p style="text-align:center"><span style="font-size:24pt">[층 · 호수] [면적]</span></p><p></p>
<p style="text-align:center"><span style="font-size:20pt">[보증금 / 월세]</span></p><p style="text-align:center"><span style="font-size:16pt">[특징 한 줄]</span></p><p></p><p></p>
<p style="text-align:center"><span style="font-size:28pt"><strong>문의 [전화번호]</strong></span></p><p style="text-align:center"><span style="font-size:16pt">[중개사무소 이름]</span></p>`,
  },
  {
    id: "official", cat: "basic", name: "공문", desc: "수신 · 참조 · 제목 · 본문 · 발신", thumb: ["H", "l", "l", "l", "b", "b"],
    html: `<p style="text-align:center"><span style="font-size:22pt"><strong>[기관 · 회사 이름]</strong></span></p><p style="text-align:center" data-border="bottom">[주소] · 전화 [전화번호]</p><p></p>
<p>수&nbsp;&nbsp;신: [받는 곳]</p><p>참&nbsp;&nbsp;조: [참조]</p><p>제&nbsp;&nbsp;목: <strong>[제목]</strong></p><hr><p></p>
<p>1. [본문 첫째 항목]</p><p>2. [본문 둘째 항목]</p><p style="margin-left:20pt">가. [세부 내용]</p><p style="margin-left:20pt">나. [세부 내용]</p><p></p><p>붙임: [첨부 서류] 1부.&nbsp;&nbsp;끝.</p><p></p><p></p>
<p style="text-align:center"><span style="font-size:18pt"><strong>[보내는 곳] 대표 [이름]</strong></span></p>`,
  },
  {
    id: "minutes", cat: "basic", name: "회의록", desc: "일시 · 참석자 · 안건 · 결정 사항", thumb: ["h", "t", "t", "b", "b"],
    html: `<h1 style="text-align:center">회 의 록</h1>${kv([["일시", "[날짜 · 시간]"], ["장소", "[장소]"], ["참석자", "[이름]"], ["작성자", "[이름]"]])}<p></p>
<h2>안건</h2><ol><li><p>[안건 1]</p></li><li><p>[안건 2]</p></li></ol><h2>논의 내용</h2><p>[내용]</p><h2>결정 사항</h2><ul><li><p>[결정 1]</p></li></ul>
<h2>다음 할 일</h2><table><tr>${th("할 일")}${th("담당")}${th("기한")}</tr><tr>${td()}${td()}${td()}</tr><tr>${td()}${td()}${td()}</tr></table>`,
  },
  {
    id: "report", cat: "basic", name: "업무 보고서", desc: "목적 · 현황 · 문제 · 대책", thumb: ["H", "h", "b", "h", "b"],
    html: `<h1>[보고서 제목]</h1><p style="text-align:right">[부서] · [작성자] · [날짜]</p><hr>
<h2>1. 목적</h2><p>[이 보고서를 쓰는 까닭]</p><h2>2. 현황</h2><p>[지금 상황]</p><h2>3. 문제점</h2><ul><li><p>[문제 1]</p></li></ul><h2>4. 대책</h2><ul><li><p>[대책 1]</p></li></ul><h2>5. 기대 효과</h2><p>[내용]</p>`,
  },
  {
    id: "letter", cat: "basic", name: "안내 편지", desc: "손님 · 건물주에게 보내는 편지", thumb: ["t", "b", "b", "b", "t"],
    html: `<p>[받는 분] 님께</p><p></p><p>안녕하세요. [중개사무소 이름] [이름]입니다.</p><p></p><p>[전할 내용]</p><p></p><p>감사합니다.</p><p></p><p style="text-align:right">[날짜]</p><p style="text-align:right">[중개사무소 이름] [이름] 드림</p><p style="text-align:right">[전화번호]</p>`,
  },
];

/* ── 법정 서식 (공인중개사법 시행규칙 — 법제처 원본 그대로) ── */
const LAW = "법제처 국가법령정보센터 · 공인중개사법 시행규칙";
const LEGAL: Template[] = [
  { id: "brokerage-exclusive", cat: "legal", name: "전속중개계약서", desc: "[별지 제15호서식]", file: "brokerage-exclusive.hwpx", source: LAW, thumb: ["H", "t", "b", "b", "b", "b"] },
  { id: "brokerage-general", cat: "legal", name: "일반중개계약서", desc: "[별지 제14호서식]", file: "brokerage-general.hwpx", source: LAW, thumb: ["H", "t", "b", "b", "b", "b"] },
  { id: "confirm-1", cat: "legal", name: "확인·설명서 Ⅰ (주거용)", desc: "[별지 제20호서식] 중개대상물 확인·설명서 — 주거용 건축물", file: "confirm-1-housing.hwpx", source: LAW, thumb: ["H", "t", "t", "t", "t"] },
  { id: "confirm-2", cat: "legal", name: "확인·설명서 Ⅱ (비주거용)", desc: "[별지 제20호의2서식] — 비주거용 건축물 (상가·사무실 등)", file: "confirm-2-nonhousing.hwpx", source: LAW, thumb: ["H", "t", "t", "t", "t"] },
  { id: "confirm-3", cat: "legal", name: "확인·설명서 Ⅲ (토지)", desc: "[별지 제20호의3서식] — 토지", file: "confirm-3-land.hwpx", source: LAW, thumb: ["H", "t", "t", "t", "t"] },
  { id: "confirm-4", cat: "legal", name: "확인·설명서 Ⅳ (입목·공장 등)", desc: "[별지 제20호의4서식] — 입목·광업재단·공장재단", file: "confirm-4-factory.hwpx", source: LAW, thumb: ["H", "t", "t", "t", "t"] },
];

/* ── 계약서 (정부 표준계약서 원본 + 매매계약서) ── */
const CONTRACT: Template[] = [
  { id: "lease-housing", cat: "contract", name: "주택임대차 표준계약서", desc: "법무부 (2023.10.6. 개정) — 공공누리 1유형", file: "lease-housing-standard.hwpx", source: "법무부 주택임대차 표준계약서", thumb: ["H", "t", "t", "b", "b"] },
  { id: "lease-shop", cat: "contract", name: "상가건물 임대차 표준계약서", desc: "법무부 (2026.5.12. 개정) — 공공누리 1유형", file: "lease-shop-standard.hwpx", source: "법무부 상가건물 임대차 표준계약서", thumb: ["H", "t", "t", "b", "b"] },
  { id: "premium", cat: "contract", name: "권리금 계약서 (표준)", desc: "국토교통부 작성 상가건물 임대차 권리금계약서", file: "premium-standard.hwpx", source: "국토교통부 상가건물 임대차 권리금 표준계약서", thumb: ["H", "t", "t", "b", "b"] },
  {
    id: "sale", cat: "contract", name: "부동산 매매계약서", desc: "토지·건물 매매 (정부 표준 서식이 없어 일반 조항으로)", thumb: ["H", "t", "t", "b", "b", "b"],
    html: `${title("부동산 매매계약서")}<p>매도인과 매수인은 아래 표시 부동산에 관하여 다음 계약 내용과 같이 매매계약을 체결한다.</p><p></p>
<p><strong>1. 부동산의 표시</strong></p><table><tr>${th("소재지", 90)}${td("[주소]", 3)}</tr><tr>${th("토지", 90)}${th("지목", 60)}${td("[지목]")}${td("면적 [&nbsp;]㎡")}</tr><tr>${th("건물", 90)}${th("구조·용도", 60)}${td("[구조 · 용도]")}${td("면적 [&nbsp;]㎡")}</tr></table><p></p>
<p><strong>2. 계약 내용</strong></p>
<p><strong>제1조 (목적)</strong> 위 부동산의 매매에 대하여 매도인과 매수인은 합의에 의하여 매매대금을 아래와 같이 지불하기로 한다.</p>
<table><tr>${th("매매대금", 90)}${td("금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정 (₩[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;])")}</tr><tr>${th("계약금", 90)}${td("금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정은 계약 시에 지불하고 영수함. 영수자 (인)")}</tr><tr>${th("융자금", 90)}${td("금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정은 [승계 · 말소]하기로 한다.")}</tr><tr>${th("중도금", 90)}${td("금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정은 [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일에 지불한다.")}</tr><tr>${th("잔금", 90)}${td("금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정은 [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일에 지불한다.")}</tr></table>
<p><strong>제2조 (소유권 이전 등)</strong> 매도인은 매매대금의 잔금 수령과 동시에 매수인에게 소유권 이전등기에 필요한 모든 서류를 교부하고 등기 절차에 협력하며, 위 부동산의 인도일은 [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일로 한다.</p>
<p><strong>제3조 (제한물권 등의 소멸)</strong> 매도인은 위 부동산에 설정된 저당권, 지상권, 임차권 등 소유권의 행사를 제한하는 사유가 있거나 제세공과금 기타 부담금의 미납 등이 있을 때에는 잔금 수수일까지 그 권리의 하자 및 부담 등을 제거하여 완전한 소유권을 매수인에게 이전한다. 다만, 승계하기로 합의하는 권리 및 금액은 그러하지 아니하다.</p>
<p><strong>제4조 (지방세 등)</strong> 위 부동산에 관하여 발생한 수익의 귀속과 제세공과금 등의 부담은 위 부동산의 인도일을 기준으로 하되, 지방세의 납부의무 및 납부책임은 지방세법의 규정에 의한다.</p>
<p><strong>제5조 (계약의 해제)</strong> 매수인이 매도인에게 중도금(중도금이 없을 때에는 잔금)을 지불하기 전까지 매도인은 계약금의 배액을 상환하고, 매수인은 계약금을 포기하고 본 계약을 해제할 수 있다.</p>
<p><strong>제6조 (채무불이행과 손해배상)</strong> 매도인 또는 매수인이 본 계약상의 내용에 대하여 불이행이 있을 경우 그 상대방은 불이행한 자에 대하여 서면으로 최고하고 계약을 해제할 수 있다. 이 경우 계약 당사자는 계약 해제에 따른 손해배상을 각각 상대방에게 청구할 수 있으며, 손해배상에 대하여 별도의 약정이 없는 한 계약금을 손해배상의 기준으로 본다.</p>
<p><strong>제7조 (중개보수)</strong> 개업공인중개사는 매도인 또는 매수인의 본 계약 불이행에 대하여 책임을 지지 않는다. 또한 중개보수는 본 계약 체결에 따라 계약 당사자 쌍방이 각각 지불하며, 개업공인중개사의 고의나 과실 없이 본 계약이 무효·취소 또는 해제되어도 중개보수는 지급한다.</p>
<p><strong>제8조 (중개대상물 확인·설명서 교부 등)</strong> 개업공인중개사는 중개대상물 확인·설명서를 작성하고 업무보증관계증서(공제증서 등) 사본을 첨부하여 거래당사자 쌍방에게 교부한다.</p>
<p></p><p><strong>특약사항</strong></p><table><tr>${td("[특약 내용]")}</tr><tr>${td("")}</tr><tr>${td("")}</tr></table><p></p>
<p>본 계약을 증명하기 위하여 계약 당사자가 이의 없음을 확인하고 각각 서명·날인 후 매도인, 매수인, 개업공인중개사는 매 장마다 간인하여야 하며, 각각 1통씩 보관한다.</p>${date}
${sign(["매도인", "매수인"])}<p></p><table><tr><td rowspan="3" data-bg="#F2F2F2" style="background-color:#F2F2F2;vertical-align:middle" colwidth="110"><p style="text-align:center"><strong>개업공인중개사</strong></p></td>${th("사무소", 60)}${td("[사무소 이름 · 소재지]", 3)}</tr><tr>${th("대표", 60)}${td("[성명] (인)")}${th("등록번호", 60)}${td("[등록번호]")}</tr><tr>${th("전화", 60)}${td("[전화번호]")}${th("소속공인중개사", 60)}${td("[성명] (인)")}</tr></table>${NOTE}`,
  },
];

/* ── 사무소 실무 ── */
const OFFICE: Template[] = [
  {
    id: "loan", cat: "office", name: "차용증", desc: "돈을 빌리고 갚기로 한 증서", thumb: ["H", "t", "b", "b"],
    html: `${title("차 용 증")}${kv([["차용 금액", "금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정 (₩[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;])"], ["빌린 날", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"], ["갚을 날", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"], ["이자", "연 [&nbsp;&nbsp;&nbsp;]% (매월 [&nbsp;]일 지급) · 이자 없음 [&nbsp;]"], ["갚는 방법", "[현금 · 계좌이체 — 은행 · 계좌번호]"]])}<p></p>
<p>1. 채무자는 위 금액을 채권자로부터 틀림없이 빌렸으며, 위 날까지 갚기로 한다.</p><p>2. 이자는 위에서 정한 대로 지급하며, 갚을 날을 넘기면 [지연 이자 연  %]를 더하여 지급한다.</p><p>3. 채무자가 이자를 [&nbsp;&nbsp;]회 이상 밀리면 채권자는 남은 원금과 이자를 한꺼번에 갚으라고 요구할 수 있다.</p><p>4. 이 증서와 관련한 다툼은 [채권자 주소지] 관할 법원에서 처리한다.</p><p>5. 그 밖의 약정: [내용]</p><p></p>${date}${sign(["채권자", "채무자", "연대보증인"])}${NOTE}`,
  },
  {
    id: "receipt", cat: "office", name: "영수증", desc: "계약금 · 중도금 · 잔금 받은 확인", thumb: ["H", "t", "b"],
    html: `${title("영 수 증")}${kv([["금액", "금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정 (₩[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;])"], ["명목", "[&nbsp;] 계약금   [&nbsp;] 중도금   [&nbsp;] 잔금   [&nbsp;] 그 밖의 것 ( )"], ["부동산 표시", "[소재지 · 동 · 호]"], ["계약 일자", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일 체결한 [매매 · 임대차] 계약"], ["받은 방법", "[현금 · 계좌이체 — 은행 · 계좌번호]"]])}<p></p>
<p>위 금액을 정히 영수합니다.</p>${date}${sign(["받은 사람", "준 사람"])}${NOTE}`,
  },
  {
    id: "proxy", cat: "office", name: "위임장", desc: "계약 체결 · 대금 수령 등을 대리인에게 맡김", thumb: ["H", "t", "b", "b"],
    html: `${title("위 임 장")}<p><strong>1. 대리인 (위임받는 사람)</strong></p>${kv([["성명", "[성명]"], ["생년월일", "[생년월일]"], ["주소", "[주소]"], ["연락처", "[전화번호]"], ["본인과의 관계", "[관계]"]])}<p></p>
<p><strong>2. 위임하는 일</strong></p>${kv([["부동산 표시", "[소재지 · 동 · 호]"], ["위임 내용", "[&nbsp;] 매매계약 체결   [&nbsp;] 임대차계약 체결   [&nbsp;] 계약금·잔금 수령   [&nbsp;] 그 밖의 것 ( )"], ["조건", "[금액 · 기간 등 대리인이 지켜야 할 조건]"], ["위임 기간", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일 ~ [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"]])}<p></p>
<p>본인은 위 사람을 대리인으로 정하고 위 일을 맡깁니다. 본인의 인감증명서를 붙입니다.</p>${date}${sign(["위임인 (본인)"])}${NOTE}`,
  },
  {
    id: "lease-end", cat: "office", name: "임대차 계약 해지 통보서", desc: "계약을 끝내겠다고 알림", thumb: ["H", "t", "b", "b"],
    html: `${title("임대차 계약 해지 통보서")}${kv([["받는 사람", "[성명] · [주소]"], ["보내는 사람", "[성명] · [주소] · [전화번호]"], ["부동산 표시", "[소재지 · 동 · 호]"], ["계약 내용", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일 체결 · 보증금 [&nbsp;&nbsp;&nbsp;]원 · 월세 [&nbsp;&nbsp;&nbsp;]원 · 기간 [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일까지"]])}<p></p>
<p>1. 위 부동산에 관한 임대차 계약을 [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일자로 해지(종료)함을 알려 드립니다.</p><p>2. 해지 사유: [사유]</p><p>3. 보증금 반환 · 부동산 인도 · 원상복구 · 관리비 정산은 [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일에 하기를 요청합니다.</p><p>4. 보증금을 받을 계좌: [은행 · 계좌번호 · 예금주]</p><p></p>${date}<p style="text-align:right">보내는 사람 [성명] (인)</p>
<p><span style="font-size:9pt;color:#595959">※ 보낸 날을 증명하려면 우체국 내용증명으로 보내세요. 계약 기간 중 해지는 계약서·법에서 정한 사유가 있어야 합니다.</span></p>${NOTE}`,
  },
  {
    id: "renew-refuse", cat: "office", name: "계약 갱신 거절 통지서", desc: "임대인이 계약을 연장하지 않겠다고 알림", thumb: ["H", "t", "b", "b"],
    html: `${title("계약 갱신 거절 통지서")}${kv([["받는 사람 (임차인)", "[성명] · [주소]"], ["보내는 사람 (임대인)", "[성명] · [주소] · [전화번호]"], ["부동산 표시", "[소재지 · 동 · 호]"], ["계약 기간", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일 ~ [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"]])}<p></p>
<p>1. 위 임대차 계약은 [&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일로 기간이 끝나며, 임대인은 계약을 갱신하지 않음을 알려 드립니다.</p><p>2. 갱신 거절 사유: [사유]</p><p>3. 계약이 끝나는 날 부동산 인도와 보증금 반환을 하겠습니다.</p><p></p>${date}<p style="text-align:right">임대인 [성명] (인)</p>
<p><span style="font-size:9pt;color:#595959">※ 법에서 정한 기간 안에 알려야 합니다 — 주택은 계약 끝나기 6개월 전부터 2개월 전까지, 상가는 6개월 전부터 1개월 전까지. 임차인의 계약갱신요구를 거절하려면 법에서 정한 사유가 있어야 합니다. 내용증명으로 보내세요.</span></p>${NOTE}`,
  },
  {
    id: "deposit-return", cat: "office", name: "계약금 반환 합의서", desc: "계약을 없던 일로 하고 계약금을 돌려주기로 함", thumb: ["H", "t", "b", "b"],
    html: `${title("계약금 반환 합의서")}${kv([["부동산 표시", "[소재지 · 동 · 호]"], ["원래 계약", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일 체결한 [매매 · 임대차] 계약"], ["받은 계약금", "금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정"], ["돌려줄 금액", "금 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원정"], ["돌려줄 날 · 방법", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일 · [계좌]"]])}<p></p>
<p>1. 갑과 을은 위 계약을 합의하여 해제하며, 갑은 위 금액을 을에게 돌려준다.</p><p>2. 위 금액을 돌려주면 갑과 을은 이 계약에 관하여 서로 더 이상 어떠한 청구도 하지 않는다.</p><p>3. 중개보수 처리: [내용]</p><p>4. 그 밖의 합의: [내용]</p><p></p>${date}${sign(["갑", "을"])}${NOTE}`,
  },
  {
    id: "agreement", cat: "office", name: "합의서 (일반)", desc: "두 사람이 합의한 내용을 적는 문서", thumb: ["H", "t", "b", "b"],
    html: `${title("합 의 서")}${kv([["합의 일자", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"], ["관련 부동산", "[소재지 · 동 · 호]"], ["합의 대상", "[무엇에 관한 합의인지]"]])}<p></p>
<p><strong>합의 내용</strong></p><p>1. [내용]</p><p>2. [내용]</p><p>3. [내용]</p><p>4. 갑과 을은 위 내용을 성실히 지키며, 이 합의와 관련하여 앞으로 서로 다른 청구를 하지 않는다.</p><p></p>${date}${sign(["갑", "을"])}${NOTE}`,
  },
  {
    id: "restore", cat: "office", name: "원상복구 확인서", desc: "임차인이 나갈 때 복구 상태 확인", thumb: ["H", "t", "t", "b"],
    html: `${title("원상복구 확인서")}${kv([["부동산 표시", "[소재지 · 동 · 호]"], ["임대인", "[성명]"], ["임차인", "[성명]"], ["확인 일자", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"]])}<p></p>
<table><tr>${th("항목")}${th("확인 내용")}${th("상태")}${th("비고")}</tr>${["벽·바닥", "천장·조명", "문·창호", "전기·설비", "간판·시설물 철거", "열쇠 반납"].map((x) => `<tr>${td(x)}${td("")}${td("[&nbsp;] 양호  [&nbsp;] 보수 필요")}${td("")}</tr>`).join("")}</table><p></p>
<p>보수가 필요한 부분 · 비용 처리: [내용]</p><p></p><p>위와 같이 원상복구 상태를 확인합니다.</p>${date}${sign(["임대인", "임차인"])}${NOTE}`,
  },
  {
    id: "handover", cat: "office", name: "시설물 인수인계 확인서", desc: "입주·퇴거 때 시설물 넘겨주고 받음", thumb: ["H", "t", "t", "b"],
    html: `${title("시설물 인수인계 확인서")}${kv([["부동산 표시", "[소재지 · 동 · 호]"], ["넘겨주는 사람", "[성명]"], ["넘겨받는 사람", "[성명]"], ["인수인계 일자", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"]])}<p></p>
<table><tr>${th("시설물")}${th("수량")}${th("상태")}${th("비고")}</tr>${["열쇠 · 출입카드", "에어컨", "보일러 · 난방", "조명", "주방 시설", "그 밖의 것"].map((x) => `<tr>${td(x)}${td("")}${td("")}${td("")}</tr>`).join("")}</table><p></p>
<table><tr>${th("검침")}${th("인수인계 때 숫자")}${th("비고")}</tr>${["전기", "수도", "가스"].map((x) => `<tr>${td(x)}${td("")}${td("")}</tr>`).join("")}</table><p></p>${date}${sign(["넘겨주는 사람", "넘겨받는 사람"])}${NOTE}`,
  },
  {
    id: "fee-settle", cat: "office", name: "관리비 정산서", desc: "퇴거·잔금 때 관리비·공과금 정산", thumb: ["H", "t", "t", "b"],
    html: `${title("관리비 정산서")}${kv([["부동산 표시", "[소재지 · 동 · 호]"], ["정산 기준일", "[&nbsp;&nbsp;]년 [&nbsp;]월 [&nbsp;]일"], ["정산 당사자", "[성명] ↔ [성명]"]])}<p></p>
<table><tr>${th("항목")}${th("기간")}${th("금액 (원)")}${th("부담하는 사람")}</tr>${["관리비", "전기요금", "수도요금", "가스요금", "그 밖의 것"].map((x) => `<tr>${td(x)}${td("")}${td("")}${td("")}</tr>`).join("")}<tr>${th("합계")}${td("")}${td("")}${td("")}</tr></table><p></p>
<p>정산 금액 [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]원은 [보증금에서 빼고 돌려줌 · 따로 지급] 한다.</p>${date}${sign(["갑", "을"])}${NOTE}`,
  },
  {
    id: "listing-intake", cat: "office", name: "매물 접수 카드", desc: "건물주가 매물을 맡길 때 받아 적는 카드", thumb: ["H", "t", "t", "t"],
    html: `${title("매물 접수 카드")}${kv([["접수일", "[날짜]"], ["의뢰인", "[성명] · [연락처] · [&nbsp;] 소유자 [&nbsp;] 대리인"], ["소재지", "[주소 · 동 · 호]"], ["거래 종류", "[&nbsp;] 매매  [&nbsp;] 전세  [&nbsp;] 월세  [&nbsp;] 그 밖의 것"], ["희망 금액", "[매매가 · 보증금 / 월세]"], ["면적", "[전용 · 공급 · 대지 ㎡ (평)]"], ["층 · 방향", "[해당 층 / 전체 층 · 방향]"], ["입주 가능일", "[날짜 · 협의]"], ["관리비", "[금액 · 포함 내역]"], ["주차 · 승강기", "[&nbsp;]"], ["융자 · 권리관계", "[근저당 · 임차인 현황 등 — 등기부로 확인]"], ["보여 주기", "[연락 후 방문 · 비밀번호 · 열쇠 위치]"], ["공실뉴스 등록", "[&nbsp;] 동의  [&nbsp;] 동의 안 함"], ["메모", "[&nbsp;]"]], 130)}${NOTE}`,
  },
  {
    id: "client-card", cat: "office", name: "손님 상담 카드", desc: "찾는 손님의 조건을 적는 카드", thumb: ["H", "t", "t", "t"],
    html: `${title("손님 상담 카드")}${kv([["상담일", "[날짜]"], ["손님", "[성명] · [연락처]"], ["찾는 것", "[&nbsp;] 매매  [&nbsp;] 전세  [&nbsp;] 월세 · [&nbsp;] 주택 [&nbsp;] 상가 [&nbsp;] 사무실 [&nbsp;] 토지"], ["지역", "[원하는 동네 · 역]"], ["예산", "[매매가 · 보증금 / 월세 범위]"], ["면적 · 방", "[&nbsp;]"], ["입주 시기", "[날짜]"], ["꼭 필요한 조건", "[주차 · 층 · 반려동물 등]"], ["업종 (상가)", "[&nbsp;]"], ["연락 방법", "[&nbsp;] 전화 [&nbsp;] 문자 [&nbsp;] 카톡"], ["개인정보 수집 동의", "[&nbsp;] 동의 — 상담·매물 안내에만 쓰고, 끝나면 지웁니다"], ["메모", "[&nbsp;]"]], 130)}${NOTE}`,
  },
  {
    id: "certified", cat: "office", name: "내용증명", desc: "발신인 · 수신인 · 제목 · 내용 (형식만)", thumb: ["H", "t", "b", "b", "b"],
    html: `<p style="text-align:center"><span style="font-size:24pt"><strong>내 용 증 명</strong></span></p><p></p>
${kv([["발신인", "[이름] / [주소] / [연락처]"], ["수신인", "[이름] / [주소]"], ["제목", "[제목]"]])}<p></p>
<p>1. 귀하의 무궁한 발전을 기원합니다.</p><p>2. [사실 관계]</p><p>3. [요구 사항]</p><p>4. [기한 · 조치]</p><p></p><p style="text-align:center">[날짜]</p><p></p>
<p style="text-align:right">위 발신인&nbsp;&nbsp;[이름]&nbsp;&nbsp;(인)</p>`,
  },
];

export const TEMPLATES: Template[] = [...BASIC, ...LEGAL, ...CONTRACT, ...OFFICE];
/** 파일 홈 화면 첫 줄 — 자주 쓰는 것 */
export const HOME_TEMPLATES = ["blank", "brokerage-exclusive", "confirm-1", "lease-housing", "sale", "loan", "receipt"].map((id) => TEMPLATES.find((t) => t.id === id)!).filter(Boolean);

export const templatePage = (t: Template): PageSetup => ({ ...DEFAULT_PAGE, margin: { ...DEFAULT_PAGE.margin }, ...(t.page || {}) });
