/**
 * 포인트 거래 내역 — 같은 묶음(reference_id)의 AI 목소리 문장들을 1줄로 합쳐 보여 준다 (2026-11-06 사장님: "1건으로 통합")
 *  장부(point_transactions)는 문장마다 1줄 그대로 두고, 화면만 합친다. 줄을 누르면 문장별로 펼친다.
 *  묶음 번호가 없는 예전 기록은 그대로 1줄씩.
 *  docs/2026-11-06_point_system_review.md
 */
export type PointTx = {
  id: string;
  type: string;
  amount: number;
  reason: string;
  reference_id?: string | null;
  balance_after: number;
  created_at: string;
  [k: string]: any;
};
export type PointRow = PointTx & { items: PointTx[] };

const isVoice = (t: PointTx) => /^AI 목소리/.test(String(t.reason || ""));
const charsOf = (t: PointTx) => Number(/(\d+)자/.exec(String(t.reason || ""))?.[1]) || 0;

/** 최신순 목록 → 같은 묶음을 합친 목록 (순서는 묶음의 가장 최근 줄 자리) */
export function groupPointTx(list: PointTx[]): PointRow[] {
  const out: PointRow[] = [];
  const at = new Map<string, number>();
  for (const t of list) {
    const key = t.reference_id && isVoice(t) ? `${t.reference_id}:${t.type}` : "";
    if (key && at.has(key)) {
      out[at.get(key)!].items.push(t);
      continue;
    }
    if (key) at.set(key, out.length);
    out.push({ ...t, items: [t] });
  }
  return out.map((r) => {
    if (r.items.length < 2) return r;
    const amount = r.items.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const chars = r.items.reduce((s, x) => s + charsOf(x), 0);
    // 동시에 들어온 문장들이라 시각 순서와 잔액 순서가 다를 수 있다 — 쓰는 기록이므로 가장 작은 잔액이 마지막 잔액
    const balance = Math.min(...r.items.map((x) => Number(x.balance_after) || 0));
    const edit = r.items.every((x) => /^AI 목소리 수정/.test(String(x.reason || ""))); // 고쳐 만든 묶음 (2026-11-06)
    return { ...r, amount, balance_after: r.type === "SPEND" ? balance : r.balance_after, reason: `AI 목소리${edit ? " 수정" : ""} · ${r.items.length}문장 ${chars.toLocaleString("ko-KR")}자` };
  });
}
