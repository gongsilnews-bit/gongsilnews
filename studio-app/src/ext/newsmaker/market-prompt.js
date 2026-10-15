/* ══════════════════════════════════════════════════════════════
   2단계 소재 — "단지 시세" · "우리동네 시세" (국토부 실거래가)

   단지 이름이나 동 이름만 넣으면 공실뉴스 서버(/api/extension/apt-trades)가 국토교통부 실거래가에서
   숫자를 계산해 돌려준다. AI 는 그 숫자로 문장만 쓴다 — 숫자·인용·전망을 지어내지 않게.
   기획: docs/2026-10-03_newsmaker_complex_and_local_plan.md (회의로 고친 방향)

   source.complex = { query, data, view, asking }   // data = 서버 응답, view = 분석 관점, asking = 호가(선택, 사용자 입력)
   source.local   = { query, data, view, themes[] } // view = 분석 관점(기본 객관적 브리핑), themes = 동네 테마 칩
   ══════════════════════════════════════════════════════════════ */

const GW_MARKET_VIEWS = {
  brief: { label: "객관적 브리핑", guide: "최근 거래 사실을 중립적으로 정리하는 시세 브리핑. 오르내림을 평가하지 말고 숫자를 순서대로 전할 것" },
  high: { label: "신고가·회복", guide: "기간 최고가와 최근 거래를 비교해 가격 회복·신고가 여부를 짚을 것. 표에 최고가 기록이 없으면 '신고가'라고 쓰지 말 것" },
  flow: { label: "거래 흐름", guide: "면적별 거래 건수와 거래 시점의 흐름을 중심으로 쓸 것. 매수·매도자의 심리나 분위기를 지어내지 말 것" },
  jeonse: { label: "전세가율", guide: "최근 전세 거래와 전세가율(매매가 대비 전세가 비율)을 중심으로, 실거주·임대 수요 관점에서 쓸 것" },
};

const GW_LOCAL_VIEWS = {
  brief: { label: "객관적 브리핑", guide: "동네 거래 건수·가격 변화와 거래 많은 단지를 중립적으로 정리하는 브리핑. 좋다·나쁘다 평가 없이 숫자를 차례로 전할 것" },
  story: { label: "동네 흐름 해설", guide: "숫자가 동네 실수요자에게 어떤 의미인지 풀어 주는 해설. 고른 테마를 관점으로 삼되 자료에 없는 사실은 쓰지 말 것" },
};

const GW_LOCAL_THEMES = ["학군", "역세권·교통", "재건축·재개발", "거래량 변화", "전세 시장"];

/* 만원 → "24억 5,000만 원" */
function gwPrice(manwon) {
  const value = Number(manwon) || 0;
  if (!value) return "-";
  const eok = Math.floor(value / 10000);
  const rest = value % 10000;
  if (!eok) return `${rest.toLocaleString("ko-KR")}만 원`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}만 원` : `${eok}억 원`;
}

const gwTradeLine = (t) => (t ? `${t.date} ${gwPrice(t.price)} (${t.floor}층, 전용 ${t.area}㎡)` : "기록 없음");

function gwMarketReady(source) {
  if (!source) return false;
  if (source.mode === "complex") return Boolean(source.complex && source.complex.data && source.complex.data.summary && source.complex.data.summary.tradeCount > 0);
  if (source.mode === "local") return Boolean(source.local && source.local.data && source.local.data.summary && (source.local.data.summary.recentCount + source.local.data.summary.beforeCount) > 0);
  return false;
}

function gwMarketLabel(source) {
  if (source.mode === "complex") {
    const d = source.complex && source.complex.data;
    return d ? `${d.complexName || d.target.name} 실거래 시세` : "";
  }
  const d = source.local && source.local.data;
  return d ? `${d.target.name} 아파트 시세` : "";
}

/* 서버 자료 → AI 에 주는 표 (사람이 읽어도 되는 모양) */
function gwComplexDataText(c) {
  const d = c.data;
  const s = d.summary;
  const lines = [
    `- 단지: ${d.complexName || d.target.name}`,
    `- 소재지: ${d.target.address}`,
    s.buildYear ? `- 준공: ${s.buildYear}년` : "",
    `- 자료 기간: ${d.period}`,
    `- 기간 안 매매 신고: ${s.tradeCount}건`,
  ].filter(Boolean);
  for (const a of s.areas.slice(0, 4)) {
    lines.push(`\n[전용 ${a.areaKey} · 약 ${a.pyeong}평] 매매 ${a.tradeCount}건`);
    lines.push(`- 가장 최근 매매: ${gwTradeLine(a.latest)}`);
    if (a.previous) lines.push(`- 그 직전 매매: ${gwTradeLine(a.previous)}`);
    lines.push(`- 기간 최고가: ${gwTradeLine(a.high)}`);
    lines.push(`- 기간 최저가: ${gwTradeLine(a.low)}`);
    if (a.latestJeonse) lines.push(`- 가장 최근 전세: ${a.latestJeonse.date} 보증금 ${gwPrice(a.latestJeonse.deposit)} (${a.latestJeonse.floor}층)`);
    if (a.jeonseRatio) lines.push(`- 전세가율(최근 6개월 전세 중앙값 ÷ 매매 중앙값): 약 ${a.jeonseRatio}%`);
  }
  const asking = String(c.asking || "").trim();
  lines.push(`\n[호가 — 사용자가 직접 적은 현재 매물 가격]\n${asking || "없음 — 호가·매물 분위기는 쓰지 말 것"}`);
  return lines.join("\n");
}

function gwLocalDataText(l) {
  const d = l.data;
  const s = d.summary;
  const change = (now, before) => (before ? `${now > before ? "+" : ""}${Math.round(((now - before) / before) * 1000) / 10}%` : "비교 불가");
  const lines = [
    `- 지역: ${d.target.name}`,
    `- 자료 기간: ${d.period}`,
    `- 아파트 매매 신고 (최근 ${s.periodRecent}): ${s.recentCount}건 · 3.3㎡당 중앙값 ${gwPrice(s.recentMedianPerPyeong)}`,
    `- 아파트 매매 신고 (그 전 ${s.periodBefore}): ${s.beforeCount}건 · 3.3㎡당 중앙값 ${gwPrice(s.beforeMedianPerPyeong)}`,
    `- 변화: 거래 건수 ${change(s.recentCount, s.beforeCount)} · 3.3㎡당 중앙값 ${change(s.recentMedianPerPyeong, s.beforeMedianPerPyeong)}`,
    `- 전세 신고 (최근 ${s.periodRecent}): ${s.recentJeonseCount}건 · 3.3㎡당 보증금 중앙값 ${gwPrice(s.recentJeonseMedianPerPyeong)}`,
    `- 신고 진행 중이라 비교에서 뺀 달: ${s.pendingMonths} (이 기간 매매 ${s.pendingCount}건이 지금까지 신고됨 — 더 늘어날 수 있음)`,
    `- 최근 ${s.periodRecent} 매매가 있었던 단지 수: ${s.complexCount}곳`,
    `\n[거래가 많았던 단지 — 최근 ${s.periodRecent}]`,
  ];
  s.topComplexes.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name}: 매매 ${c.tradeCount}건 · 3.3㎡당 중앙값 ${gwPrice(c.medianPerPyeong)} · 가장 최근 ${gwTradeLine(c.latest)}`);
  });
  const themes = (l.themes || []).filter((t) => GW_LOCAL_THEMES.includes(t));
  lines.push(`\n[사용자가 고른 동네 테마 — 기사 관점]\n${themes.length ? themes.join(", ") : "없음"}`);
  return lines.join("\n");
}

function gwMarketText(source) {
  const angle = String(source.angle || "").trim();
  const angleText = angle ? `\n\n[추가 요청 — 사용자가 바라는 관점]\n${angle}` : "";
  if (source.mode === "complex") {
    const view = GW_MARKET_VIEWS[source.complex.view] || GW_MARKET_VIEWS.brief;
    return `[아파트 단지 실거래 자료 — 국토교통부 실거래가 공개 자료를 공실뉴스가 정리]\n${gwComplexDataText(source.complex)}\n\n[분석 관점] ${view.label}\n- ${view.guide}${angleText}`;
  }
  const localView = GW_LOCAL_VIEWS[source.local.view] || GW_LOCAL_VIEWS.brief;
  return `[동네 아파트 실거래 자료 — 국토교통부 실거래가 공개 자료를 공실뉴스가 정리]\n${gwLocalDataText(source.local)}\n\n[분석 관점] ${localView.label}\n- ${localView.guide}${angleText}`;
}

function gwMarketIntro(source) {
  return source.mode === "complex"
    ? "아래 아파트 단지의 실거래 자료로 공실뉴스 독자를 위한 시세 기사 1건을 작성하십시오."
    : "아래 동네의 아파트 실거래 자료로 공실뉴스 우리동네뉴스에 실을 동네 시세 기사 1건을 작성하십시오.";
}

function gwMarketRules(source) {
  const local = source.mode === "local";
  return `════════ 실거래 기사 원칙 — 가장 먼저 지키십시오 ════════

【숫자 원칙】
- 금액·면적·층·건수·날짜·비율은 위 자료에 있는 숫자만 쓰십시오. 계산하거나 반올림해 새 숫자를 만들지 마십시오.
- 출처를 밝히십시오: "국토교통부 실거래가 공개시스템에 따르면", "신고 기준" 같은 표현을 넣으십시오.
- 실거래는 계약 후 30일 안에 신고되므로 최근 거래는 더 늘어날 수 있다는 점을 한 번 밝히십시오.
- 자료에 없는 시세·호가·대출·금리·입주 물량·개발 계획·학교 배정 같은 사실이나 수치를 만들지 마십시오.
- ${local ? "고른 테마는 기사의 관점일 뿐입니다. 자료에 없는 학군 순위·역 개통 일정·재건축 진행 단계 같은 구체적 사실은 쓰지 말고, 필요하면 \"~를 확인할 필요가 있다\"로 쓰십시오." : "호가는 사용자가 적은 내용이 있을 때만 \"현재 매물 호가는 ~로 확인된다\"처럼 쓰십시오. 없으면 호가·매물 분위기를 쓰지 마십시오."}

【인용·전망 금지】
- 중개업소·전문가·주민의 말을 인용하지 마십시오. 인터뷰한 것처럼 쓰지 마십시오.
- 가격 전망("오를 것", "바닥을 찍었다")을 단정하지 마십시오. 해석이 필요하면 자료로 확인되는 범위에서 "~로 나타났다"로 쓰십시오.
- 매수·매도를 권하거나 집값을 부추기는 표현("지금이 기회", "막차", "급등")을 쓰지 마십시오.

【쉽게 쓰기】   ★ 부동산을 잘 모르는 독자도 읽게
- 전세가율·3.3㎡당 가격·중앙값·전용면적·실거래가 신고 기준 같은 말은 처음 나올 때 쉬운 말로 한 번 풀어 주십시오.
  (예: "전세가율, 즉 매매가 대비 전세가 비율은", "3.3㎡(1평)당 가격의 가운데 값은")
- 큰 금액은 "31억 3,000만 원"처럼 읽기 쉽게 쓰고, 한 문장에 숫자를 세 개 넘게 몰아 넣지 마십시오.

【구성】
- 첫 문단에 ${local ? "동네 이름과 최근 거래 흐름(건수·3.3㎡당 가격 변화)" : "단지 이름과 가장 최근 실거래(날짜·면적·가격)"}을 밝히십시오.
- ${local ? "특정 단지를 띄우지 말고 동네 전체 흐름을 먼저 전한 뒤 거래가 많았던 단지를 차례로 비교하십시오." : "면적별로 최근 거래, 직전 거래 대비 변화, 기간 최고·최저가를 비교하십시오."}
- 마지막 문단은 자료의 한계(신고 기준, 최근 달 집계 중)와 실제 거래 전에 확인할 점으로 마무리하십시오.`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GW_MARKET_VIEWS, GW_LOCAL_VIEWS, GW_LOCAL_THEMES, gwPrice, gwMarketReady, gwMarketLabel, gwMarketText, gwMarketIntro, gwMarketRules,
  };
}
