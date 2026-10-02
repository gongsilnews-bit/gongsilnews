/**
 * 게시판 "목록" 경로 계산기.
 *
 * 기본은 공용 게시판(/board?id=xxx)이지만, 전용 섹션 안에 놓인 게시판은
 * 글 읽기/쓰기에서 목록으로 돌아갈 때도 그 섹션의 목록 페이지로 가야
 * 헤더와 흐름이 끊기지 않는다.
 */
const SECTION_BOARD_PATHS: Record<string, string> = {
  // 공실스터디 자료실 5대 게시판
  doc: "/study/resources?board=doc",
  drone: "/study/resources?board=drone",
  prompt: "/study/resources?board=prompt",
  sound: "/study/resources?board=sound",
  app: "/study/resources?board=app",
  // 공실스터디 커뮤니티 2대 게시판
  studyqa: "/study/community?board=studyqa",
  free: "/study/community?board=free",
  // 고객센터 자주 묻는 질문
  faq: "/help",
};

export function getBoardListUrl(
  boardId: string,
  params?: { page?: string | number; tab?: string; search?: string }
): string {
  const sectionPath = SECTION_BOARD_PATHS[boardId];
  const base = sectionPath || "/board";

  const qs = new URLSearchParams();
  if (!sectionPath) qs.set("id", boardId);

  const page = params?.page ? String(params.page) : "";
  if (page && page !== "1") qs.set("page", page);
  if (params?.tab && params.tab !== "전체") qs.set("tab", params.tab);
  if (params?.search?.trim()) qs.set("search", params.search.trim());

  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}
