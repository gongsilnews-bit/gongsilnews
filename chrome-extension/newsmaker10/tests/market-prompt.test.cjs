/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

/* 작업창에서는 sections.js · market-prompt.js 가 prompt.js 보다 먼저 불린다 */
Object.assign(globalThis, require("../shared/sections.js"));
Object.assign(globalThis, require("../shared/market-prompt.js"));
const p = require("../shared/prompt.js");
const m = require("../shared/market-prompt.js");

const trade = (date, price, floor = 10, area = 76.79) => ({ name: "은마", dong: "대치동", jibun: "316", area, floor, price, date, buildYear: 1979 });

const complexSource = {
  mode: "complex",
  complex: {
    query: "대치 은마",
    view: "high",
    asking: "",
    data: {
      target: { name: "은마아파트", address: "서울 강남구 대치동 316", lat: 37.49, lng: 127.06 },
      complexName: "은마",
      period: "최근 12개월 매매 · 6개월 전월세 (국토교통부 실거래가 신고 기준)",
      candidates: [],
      picked: 0,
      summary: {
        tradeCount: 2,
        buildYear: 1979,
        areas: [{
          areaKey: "76㎡", pyeong: 23, tradeCount: 2,
          latest: trade("2026-09-29", 313000, 14), previous: trade("2026-08-29", 333000),
          high: trade("2026-08-29", 333000), low: trade("2026-09-29", 313000, 14),
          jeonseCount: 1, latestJeonse: { date: "2026-09-10", deposit: 40000, floor: 5 }, jeonseRatio: 20,
        }],
        recentTrades: [],
      },
    },
  },
  local: { query: "", data: null, themes: [] },
  topic: { subject: "", memo: "" },
  angle: "",
  section1: "부동산·경제",
  section2: "",
};

const localSource = {
  mode: "local",
  complex: { query: "", data: null, view: "brief", asking: "" },
  local: {
    query: "대치동",
    themes: ["학군", "없는테마"],
    data: {
      target: { name: "서울 강남구 대치동", address: "서울 강남구 대치동", lat: 37.5, lng: 127.06 },
      period: "신고가 끝난 최근 3개월과 그 전 3개월 비교",
      candidates: [],
      picked: 0,
      summary: {
        periodRecent: "2026.06~2026.08", periodBefore: "2026.03~2026.05", pendingMonths: "2026.09~2026.10", pendingCount: 16,
        recentCount: 59, beforeCount: 136, recentMedianPerPyeong: 13197, beforeMedianPerPyeong: 12787,
        recentJeonseCount: 281, recentJeonseMedianPerPyeong: 3635, complexCount: 24,
        topComplexes: [{ name: "은마", tradeCount: 14, medianPerPyeong: 14785, latest: trade("2026-08-29", 333000) }],
      },
    },
  },
  topic: { subject: "", memo: "" },
  angle: "",
  section1: "부동산·경제",
  section2: "",
};

test("금액은 억·만 원으로 읽기 쉽게", () => {
  assert.equal(m.gwPrice(313000), "31억 3,000만 원");
  assert.equal(m.gwPrice(40000), "4억 원");
  assert.equal(m.gwPrice(9500), "9,500만 원");
  assert.equal(m.gwPrice(0), "-");
});

test("자료가 있어야 준비됨 — 거래가 0건이면 준비 안 됨", () => {
  assert.equal(p.gwSourceReady(complexSource), true);
  assert.equal(p.gwSourceReady(localSource), true);
  const empty = JSON.parse(JSON.stringify(complexSource));
  empty.complex.data.summary.tradeCount = 0;
  assert.equal(p.gwSourceReady(empty), false);
  assert.equal(p.gwSourceReady({ ...complexSource, complex: { query: "x", data: null } }), false);
});

test("단지 시세 프롬프트 — 숫자는 표에서, 인용·전망·권유 금지, 출처·신고 기준 명시", () => {
  const prompt = p.gwBuildPrompt(complexSource, { kind: "news", length: "normal" });
  assert.ok(prompt.includes("2026-09-29 31억 3,000만 원 (14층, 전용 76.79㎡)"));
  assert.ok(prompt.includes("전세가율"));
  assert.ok(prompt.includes("[분석 관점] 신고가·회복"));
  assert.ok(prompt.includes("인용하지 마십시오"));
  assert.ok(prompt.includes("국토교통부 실거래가"));
  assert.ok(prompt.includes("호가·매물 분위기는 쓰지 말 것"));
  assert.ok(!prompt.includes("[참고 메모]"), "주제 규칙이 섞이지 않는다");
  assert.ok(prompt.includes("```json"), "출력은 기존과 같은 JSON 하나");
});

test("호가는 사용자가 적었을 때만 넘긴다", () => {
  const withAsking = JSON.parse(JSON.stringify(complexSource));
  withAsking.complex.asking = "76㎡ 매매 32억~34억";
  const prompt = p.gwBuildPrompt(withAsking, {});
  assert.ok(prompt.includes("76㎡ 매매 32억~34억"));
});

test("우리동네 시세 프롬프트 — 두 기간 비교, 신고 중인 달 안내, 알려진 테마만", () => {
  const prompt = p.gwBuildPrompt(localSource, {});
  assert.ok(prompt.includes("2026.06~2026.08): 59건"));
  assert.ok(prompt.includes("거래 건수 -56.6%"));
  assert.ok(prompt.includes("신고 진행 중이라 비교에서 뺀 달: 2026.09~2026.10"));
  assert.ok(prompt.includes("1. 은마: 매매 14건"));
  assert.ok(prompt.includes("학군") && !prompt.includes("없는테마"));
  assert.ok(prompt.includes("우리동네뉴스"));
  assert.ok(prompt.includes("특정 단지를 띄우지 말고"));
});

test("소재 이름과 수정 요청도 실거래 원칙을 지킨다", () => {
  assert.equal(p.gwSourceLabel(complexSource), "은마 실거래 시세");
  assert.equal(p.gwSourceLabel(localSource), "서울 강남구 대치동 아파트 시세");
  const revise = p.gwBuildRevisePrompt("더 짧게", complexSource);
  assert.ok(revise.includes("국토교통부 실거래가"));
  assert.ok(!revise.includes("[참고 메모]"));
});

test("초보 독자도 읽게 — 어려운 용어는 처음 나올 때 풀어 쓰라고 한다", () => {
  const prompt = p.gwBuildPrompt(complexSource, {});
  assert.ok(prompt.includes("【쉽게 쓰기】"));
  assert.ok(prompt.includes("전세가율, 즉 매매가 대비 전세가 비율은"));
});

test("시세표 그림에 들어갈 표 — 화면 표와 같은 숫자", () => {
  const chart = require("../shared/market-chart.js");
  const [complexTable] = chart.gwMarketChartTables(complexSource);
  assert.deepEqual(complexTable.head, ["전용면적", "매매", "최근 거래", "최고가", "전세가율"]);
  assert.deepEqual(complexTable.rows[0][2], ["31억 3,000만 원", "2026-09-29 · 14층"]);
  assert.equal(complexTable.rows[0][4], "20%");
  const localTables = chart.gwMarketChartTables(localSource);
  assert.equal(localTables.length, 2);
  assert.deepEqual(localTables[0].rows[0], ["2026.06~2026.08 (최근 석 달)", "59건", "1억 3,197만 원"]);
  assert.equal(chart.gwMarketChartTitle(localSource).title, "서울 강남구 대치동 아파트 실거래 동향");
  assert.ok(chart.GW_MARKET_CHART_CAPTION.includes("국토교통부"));
});
