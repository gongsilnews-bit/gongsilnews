/* ══════════════════════════════════════════════════════════════
   예상 공사비 — 단가표 × 공간 면적

   AI 에게 금액을 묻지 않는다. 그럴듯하지만 근거 없는 숫자가 나온다.
   여기서 계산한 범위를 결과표에 싣고, 기사·블로그·유튜브는 이 숫자만 쓴다.

   ⚠ 단가는 업계 일반 수준으로 잡은 초안이다(자재+시공, 부가세·설계비 제외).
     사장님이 확정하면 이 표만 고친다. 단위: 만 원.
   ══════════════════════════════════════════════════════════════ */

const RM_COST_NOTICE = "대략적인 예상 공사비이며, 꼭 실질적인 확인이 필요합니다.";

const RM_UNIT = {
  /* 바닥재 — 만원/m² (바닥 면적) */
  floor: {
    "light-wood": [8, 15],
    "dark-wood": [8, 15],
    "porcelain-tile": [10, 18],
    "marble": [12, 22],
    "herringbone": [12, 22],
    "concrete": [6, 12],
  },
  /* 벽면 마감 — 만원/m² (창·문을 뺀 벽 면적) */
  wall: {
    "white-wallpaper": [1.5, 3],
    "paint-color": [2, 4],
    "wood-panel": [8, 15],
    "stone-tile": [12, 25],
    "brick": [6, 12],
    "wainscoting": [5, 10],
  },
  /* 천장 — 만원/m² (천장 면적 = 바닥 면적) */
  ceiling: {
    "flat": [2, 4],
    "well": [6, 12],
    "exposed": [3, 6],
    "molding": [4, 8],
    "wood-beam": [8, 15],
    "louver": [8, 15],
  },
  /* 조명 — 한 공간당 */
  lighting: {
    "warm-white": [20, 50],
    "daylight": [20, 50],
    "indirect": [50, 150],
    "spotlight": [40, 120],
    "pendant": [20, 80],
    "chandelier": [50, 300],
  },
  /* 공간 유형별 설비 — 한 건당 (욕실 도기·수전·방수, 주방 싱크대·상판, 현관 중문·신발장) */
  room: {
    "bathroom": { label: "욕실 설비 (방수·도기·수전)", cost: [500, 1000] },
    "kitchen": { label: "주방 가구 (싱크대·상판)", cost: [400, 1000] },
    "entrance": { label: "중문·신발장", cost: [150, 400] },
  },
  /* 철거·폐기물·보양 — 위 합계의 비율 */
  overhead: [0.15, 0.25],
  /* 벽 중 창·문이 차지하는 비율 */
  openingRatio: 0.25,
};

/* 공간 유형별 처음 면적(m²) — 국민평형(84m²) 아파트 기준의 흔한 크기 */
const RM_ROOM_AREA = {
  "living-room": 25,
  "bedroom": 12,
  "kitchen": 12,
  "bathroom": 5,
  "entrance": 5,
  "balcony": 6,
};

/* 공사비 기준 입력의 처음 값 */
function rmDefaultCostBase(roomType) {
  return { area: RM_ROOM_AREA[roomType] || RM_ROOM_AREA["living-room"], height: 2.3 };
}

/* 여러 개를 고르면 평균 단가 (한 공간에 섞어 쓰는 것으로 본다) */
function rmAvg(table, ids) {
  const hits = (ids || []).map((id) => table[id]).filter(Boolean);
  if (!hits.length) return [0, 0];
  const sum = hits.reduce((a, [lo, hi]) => [a[0] + lo, a[1] + hi], [0, 0]);
  return [sum[0] / hits.length, sum[1] / hits.length];
}

function rmSum(table, ids) {
  return (ids || []).map((id) => table[id]).filter(Boolean).reduce((a, [lo, hi]) => [a[0] + lo, a[1] + hi], [0, 0]);
}

/* 만 원 → "1억 2,000만 원" */
function rmWon(man) {
  const v = Math.round(Number(man) || 0);
  if (v <= 0) return "0원";
  const eok = Math.floor(v / 10000);
  const rest = v % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString()}만 원`;
  if (eok) return `${eok}억 원`;
  return `${rest.toLocaleString()}만 원`;
}

/* 10만 원 단위로 반올림 (만 원 기준 10 단위) — 방 하나 공사라 백만 원 단위는 너무 거칠다 */
const rmRound = (man) => Math.round((Number(man) || 0) / 10) * 10;

/* ── 계산 ──
   base: { area 공간 바닥 면적(m²), height 천장 높이(m) }  design: 인테리어 조건(id)
   바닥·천장 면적 = area / 벽 면적 = 둘레(정사각형으로 봄 4√area) × 천장 높이 × (1 − 창·문 비율)
   가구·가전·소품은 사는 물건이라 공사비에 넣지 않는다 */
function rmEstimateCost(base, design) {
  const d = design || {};
  const b = Object.assign(rmDefaultCostBase(d.roomType), base || {});
  const area = Math.max(0, Number(b.area) || 0);
  const height = Math.max(0, Number(b.height) || 0);
  const wallArea = 4 * Math.sqrt(area) * height * (1 - RM_UNIT.openingRatio);

  const items = [];
  const push = (label, basis, [lo, hi]) => { if (hi > 0) items.push({ label, basis, min: lo, max: hi }); };

  const fl = rmAvg(RM_UNIT.floor, d.floor);
  push("바닥재", `${rmNames("floor", d.floor).join(", ") || "-"} · 바닥 ${Math.round(area)}m²`, [fl[0] * area, fl[1] * area]);

  const wl = rmAvg(RM_UNIT.wall, d.wall);
  push("벽면 마감", `${rmNames("wall", d.wall).join(", ") || "-"} · 벽 ${Math.round(wallArea)}m²`, [wl[0] * wallArea, wl[1] * wallArea]);

  const ce = rmAvg(RM_UNIT.ceiling, d.ceiling);
  push("천장", `${rmNames("ceiling", d.ceiling).join(", ") || "-"} · 천장 ${Math.round(area)}m²`, [ce[0] * area, ce[1] * area]);

  push("조명", rmNames("lighting", d.lighting).join(", "), rmSum(RM_UNIT.lighting, d.lighting));

  const room = RM_UNIT.room[d.roomType];
  if (room) push(room.label, "한 건", room.cost);

  const sub = items.reduce((a, it) => [a[0] + it.min, a[1] + it.max], [0, 0]);
  const [oLo, oHi] = RM_UNIT.overhead;
  if (sub[1] > 0) {
    items.push({ label: "철거·폐기물·보양", basis: `위 합계의 ${oLo * 100}~${oHi * 100}%`, min: sub[0] * oLo, max: sub[1] * oHi });
  }

  const total = items.reduce((a, it) => [a[0] + it.min, a[1] + it.max], [0, 0]);
  const min = rmRound(total[0]);
  const max = rmRound(total[1]);
  const pyeong = Math.round((area / 3.3058) * 10) / 10;
  return {
    base: { area, height },
    /* "거실 25m²(약 7.6평) · 천장 높이 2.3m" — 결과표·기사가 같은 문장을 쓴다 */
    basisText: `${rmRoomShort(d.roomType)} ${area}m²(약 ${pyeong}평) · 천장 높이 ${height}m`,
    /* "바닥 약 25m² · 벽 약 35m²" — 결과표의 면적 줄 */
    areaText: `바닥 약 ${Math.round(area)}m² · 벽 약 ${Math.round(wallArea)}m²`,
    area: Math.round(area),
    wallArea: Math.round(wallArea),
    items: items.map((it) => ({ ...it, min: rmRound(it.min), max: rmRound(it.max) })),
    min,
    max,
    rangeText: `약 ${rmWon(min)} ~ ${rmWon(max)}`,
    notice: RM_COST_NOTICE,
    excludes: "부가세·설계비·가구·가전·소품 구입비 제외",
  };
}
