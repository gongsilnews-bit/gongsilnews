/**
 * 공실스튜디오(/studio) 소속 게시판 — 글 읽기 · 쓰기(/board_read · /board_write)에서도
 * 메인 헤더 · 부동산특강 머리 대신 공실스튜디오 머리 · 풋터를 쓴다 (2026-10-26 사장님)
 */
export const STUDIO_BOARDS = ["doc", "drone", "prompt", "sound", "app", "studyqa", "free", "studio_guide"];

export const isStudioBoard = (boardId?: string | null) => !!boardId && STUDIO_BOARDS.includes(boardId);

/** 지금 주소가 공실스튜디오 게시판의 글 읽기 · 쓰기인가 (헤더 · 풋터 숨김용) */
export function onStudioBoardPage(pathname?: string | null, search?: string): boolean {
  if (!pathname || !/^\/(board_read|board_write)/.test(pathname)) return false;
  const id = new URLSearchParams(search || "").get("board_id");
  return isStudioBoard(id);
}
