import React, { Suspense } from "react";
import { getBoard, getBoardPosts } from "@/app/actions/board";
import StudyCommunityClient from "./StudyCommunityClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "커뮤니티 | 공실스터디",
  description: "막히는 건 물어보고, 아는 건 나눠 주세요!",
};

export default async function StudyCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string; tab?: string; page?: string; search?: string; mine?: string }>;
}) {
  const resolvedParams = await searchParams;

  // 1. 커뮤니티 산하 2대 게시판 (스터디Q&A, 자유게시판) 정보 병합 조회
  const [qnaBoardRes, freeBoardRes] = await Promise.all([
    getBoard("studyqa"),
    getBoard("free"),
  ]);

  const qnaBoard = qnaBoardRes.success ? (qnaBoardRes as any).data : null;
  const freeBoard = freeBoardRes.success ? (freeBoardRes as any).data : null;

  // 2. 로그인 사용자 정보 및 권한 레벨
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let serverUser: any = null;
  let serverUserLevel = 0;
  let isAdmin = false;

  if (user) {
    const { data } = await supabase
      .from("members")
      .select("role, plan_type, agencies(status)")
      .eq("id", user.id)
      .single();
    const r = data?.role?.toUpperCase() || "";
    isAdmin = r === "ADMIN" || r === "최고관리자" || r.includes("관리자");

    if (data) {
      const { getPermissionLevel } = await import("@/utils/permissionCheck");
      serverUser = { id: user.id, role: data.role, email: user.email };
      serverUserLevel = getPermissionLevel(data);
    }
  }

  // 3. 두 게시판의 게시글 목록 병렬 로드
  const [qnaPostsRes, freePostsRes] = await Promise.all([
    qnaBoard ? getBoardPosts("studyqa", { boardType: qnaBoard.board_type, userId: user?.id, isAdmin }) : Promise.resolve({ data: [] }),
    freeBoard ? getBoardPosts("free", { boardType: freeBoard?.board_type, userId: user?.id, isAdmin }) : Promise.resolve({ data: [] }),
  ]);

  const qnaPosts = (qnaPostsRes as any).data || [];
  const freePosts = (freePostsRes as any).data || [];

  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#666" }}>커뮤니티를 불러오는 중...</div>}>
      <StudyCommunityClient
        qnaBoard={qnaBoard}
        qnaPosts={qnaPosts}
        freeBoard={freeBoard}
        freePosts={freePosts}
        serverUser={serverUser}
        serverUserLevel={serverUserLevel}
        initialBoardKey={resolvedParams.board === "free" ? "free" : "studyqa"}
      />
    </Suspense>
  );
}
