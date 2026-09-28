/* ══════════════════════════════════════════════════════════════
   예상 공사비 — 단가표 × 외벽 면적

   AI 에게 금액을 묻지 않는다. 그럴듯하지만 근거 없는 숫자가 나온다.
   여기서 계산한 범위를 결과표에 싣고, 기사·블로그·유튜브는 이 숫자만 쓴다.

   ⚠ 단가는 업계 일반 수준으로 잡은 초안이다(부가세·설계비·인허가 제외).
     사장님이 확정하면 이 표만 고친다. 단위: 만 원.
   ══════════════════════════════════════════════════════════════ */

const RM_COST_NOTICE = "대략적인 예상 공사비이며, 꼭 실질적인 확인이 필요합니다.";

const RM_UNIT = {
  /* 외장재 — 만원/m² (창을 뺀 벽면에 적용) */
  materials: {
    "stone": [25, 40],
    "ceramic": [20, 32],
    "metal": [15, 25],
    "low-e-glass": [45, 70],
    "brick": [12, 20],
    "stucco": [5, 9],
    "wood": [12, 22],
  },
  /* 창호 — 만원/m² (창 면적에 적용) */
  windows: {
    "aluminum-system": [35, 55],
    "pvc-double": [20, 30],
    "curtain-wall": [45, 70],
    "wood-frame": [40, 60],
    "project-window": [30, 45],
    "fixed-window": [25, 40],
  },
  /* 파사드 구성 — 만원/m² 추가 (외벽 전체) · ground-floor-glass 만 한 건당 */
  facade: {
    "vertical-louver": [4, 8],
    "horizontal-louver": [4, 8],
    "metal-mesh": [6, 12],
    "3d-protrusion": [8, 15],
    "curved-design": [10, 20],
  },
  facadeLump: {
    "ground-floor-glass": [1500, 3500],
  },
  /* 간판/사인 — 한 건당 */
  signage: {
    "led-channel": [300, 800],
    "backlit": [400, 1000],
    "minimalist-lettering": [200, 600],
    "projecting-sign": [150, 400],
    "neon-sign": [200, 500],
    "no-signage": [0, 0],
  },
  /* 조경 — 한 건당 */
  landscaping: {
    "planter-box": [200, 600],
    "vertical-garden": [500, 1500],
    "rooftop-garden": [800, 2500],
    "gravel-finish": [100, 300],
    "deck-terrace": [300, 1000],
    "no-landscaping": [0, 0],
  },
  /* 조명 — 한 건당 */
  lighting: {
    "linear-lighting": [400, 1200],
    "uplight-spotlight": [300, 800],
    "wall-sconce": [150, 400],
    "eaves-indirect": [300, 900],
    "recessed-light": [150, 500],
    "no-lighting": [0, 0],
  },
  /* 가설(비계)·철거·폐기물 — 위 합계의 비율 */
  overhead: [0.15, 0.25],
  /* 외벽 중 창이 차지하는 비율 */
  windowRatio: 0.3,
};

/* 공사비 기준 입력의 처음 값 */
function rmDefaultCostBase() {
  return { width: 12, depth: 15, floors: 5, floorHeight: 3.3, faces: 1 };
}

/* 여러 개를 고르면 평균 단가 (한 건물에 섞어 쓰는 것으로 본다) */
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

/* 백만 원 단위로 반올림 (만 원 기준 100 단위) */
const rmRound = (man) => Math.round((Number(man) || 0) / 100) * 100;

/* 고칠 면 — 정면은 가로, 측면은 세로 길이를 쓴다 */
const RM_FACES = {
  1: { label: "정면만", len: (w, dp) => w },
  2: { label: "정면+측면 1면", len: (w, dp) => w + dp },
  3: { label: "정면+측면 2면", len: (w, dp) => w + dp * 2 },
  4: { label: "전체 4면", len: (w, dp) => (w + dp) * 2 },
};

/* ── 계산 ──
   base: { width 가로(정면 폭 m), depth 세로(측면 깊이 m), floors, floorHeight(m), faces 고칠 면 }  design: 설계 조건(id)
   외벽 면적 = 고칠 면들의 길이 합 × (층수 × 층고) */
function rmEstimateCost(base, design) {
  const b = Object.assign(rmDefaultCostBase(), base || {});
  const d = design || {};
  const width = Math.max(0, Number(b.width) || 0);
  const depth = Math.max(0, Number(b.depth) || 0);
  const height = Math.max(0, (Number(b.floors) || 0) * (Number(b.floorHeight) || 0));
  const faces = Math.min(4, Math.max(1, Number(b.faces) || 1));
  const area = RM_FACES[faces].len(width, depth) * height;
  const windowArea = area * RM_UNIT.windowRatio;
  const wallArea = area - windowArea;

  const items = [];
  const push = (label, basis, [lo, hi]) => { if (hi > 0) items.push({ label, basis, min: lo, max: hi }); };

  const mat = rmAvg(RM_UNIT.materials, d.materials);
  push("외장재", `${rmNames("materials", d.materials).join(", ") || "-"} · 벽면 ${Math.round(wallArea)}m²`, [mat[0] * wallArea, mat[1] * wallArea]);

  const win = rmAvg(RM_UNIT.windows, d.windows);
  push("창호", `${rmNames("windows", d.windows).join(", ") || "-"} · 창 ${Math.round(windowArea)}m²`, [win[0] * windowArea, win[1] * windowArea]);

  const fac = rmSum(RM_UNIT.facade, d.facade);
  push("파사드 구성", `${rmNames("facade", (d.facade || []).filter((id) => RM_UNIT.facade[id])).join(", ")} · 외벽 ${Math.round(area)}m²`, [fac[0] * area, fac[1] * area]);
  const lump = rmSum(RM_UNIT.facadeLump, d.facade);
  push("1층 전면 통유리", "한 건", lump);

  push("간판/사인", rmNames("signage", d.signage).join(", "), rmSum(RM_UNIT.signage, d.signage));
  push("조경", rmNames("landscaping", d.landscaping).join(", "), rmSum(RM_UNIT.landscaping, d.landscaping));
  push("조명", rmNames("lighting", d.lighting).join(", "), rmSum(RM_UNIT.lighting, d.lighting));

  const sub = items.reduce((a, it) => [a[0] + it.min, a[1] + it.max], [0, 0]);
  const [oLo, oHi] = RM_UNIT.overhead;
  if (sub[1] > 0) {
    items.push({ label: "가설·철거·폐기물", basis: `위 합계의 ${oLo * 100}~${oHi * 100}%`, min: sub[0] * oLo, max: sub[1] * oHi });
  }

  const total = items.reduce((a, it) => [a[0] + it.min, a[1] + it.max], [0, 0]);
  const min = rmRound(total[0]);
  const max = rmRound(total[1]);
  return {
    base: { width, depth, floors: Number(b.floors) || 0, floorHeight: Number(b.floorHeight) || 0, faces },
    /* "가로 12m × 세로 15m · 5층 × 층고 3.3m · 정면만" — 결과표·기사가 같은 문장을 쓴다 */
    basisText: `가로 ${width}m × 세로 ${depth}m · ${Number(b.floors) || 0}층 × 층고 ${Number(b.floorHeight) || 0}m · ${RM_FACES[faces].label}`,
    area: Math.round(area),
    windowArea: Math.round(windowArea),
    items: items.map((it) => ({ ...it, min: rmRound(it.min), max: rmRound(it.max) })),
    min,
    max,
    rangeText: `약 ${rmWon(min)} ~ ${rmWon(max)}`,
    notice: RM_COST_NOTICE,
    excludes: "부가세·설계비·인허가·구조보강 비용 제외",
  };
}

/* 공실 매물 정보에서 층수를 꺼내 공사비 기준의 처음 값으로 쓴다 ("5층 중 1층" · "지상 5층" 등) */
function rmFloorsFromVacancy(v) {
  const text = [(v && v.fields) || []].flat().map((f) => `${f.label} ${f.value}`).join(" ");
  const m = text.match(/(?:총|지상)\s*(\d{1,2})\s*층/) || text.match(/(\d{1,2})\s*층\s*중/) || text.match(/\/\s*(\d{1,2})\s*층/);
  const n = m ? Number(m[1]) : 0;
  return n > 0 && n < 60 ? n : 0;
}
