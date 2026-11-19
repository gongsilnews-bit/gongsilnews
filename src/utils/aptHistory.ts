// 모바일 단지 창 위에 다른 화면(사무소 목록·공실·기사·뉴스 목록)을 덮을 때 — 뒤로가기 칸에 단지 창 표시(aptDetail)를 이어 받는다 (2026-11-19 사장님)
//  AptDetailPanel(모바일)은 뒤로가기로 닿은 칸에 aptDetail 이 있으면 "아직 단지 창 차례가 아니다"로 보고 그대로 둔다.
//  이 표시가 빠지면 공실·기사에서 뒤로가기 한 번에 단지 창까지 닫혀 버렸다 → 한 칸씩: 상세 → 사무소 목록 → 단지 창 → 지도
export const keepAptMark = (): { aptDetail?: number } =>
  typeof window !== "undefined" && window.history.state?.aptDetail ? { aptDetail: 1 } : {};
