/**
 * 관리 화면의 ?action= (write·detail 등) — 그 메뉴 주소에 붙은 것만 따른다 (2026-11-03 사장님)
 *  메뉴를 누르면 화면은 먼저 바뀌고 주소는 잠깐 예전 것(예: 공실관리 ?menu=gongsil&action=write)이 남는다.
 *  그때 다른 메뉴(기사관리)가 그 action 을 따르면 "기사 등록"이 깜빡 보였다 목록으로 넘어간다 → 메뉴가 다르면 무시.
 *  menu 가 없는 주소(공실 홈페이지 등)는 예전처럼 action 을 그대로 쓴다.
 */
export function actionFor(params: { get(name: string): string | null }, menu: string): string | null {
  const m = params.get("menu");
  if (m && m !== menu) return null;
  return params.get("action");
}
