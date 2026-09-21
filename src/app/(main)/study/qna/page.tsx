import React, { Suspense } from "react";
import { getBoard, getBoardPosts } from "@/app/actions/board";
import StudyQnaClient from "./StudyQnaClient";

export const dynamic = "force-dynamic";

/** 최고관리자 게시판관리에서 만든 "스터디Q&A" 게시판 고유 ID */
const BOARD_ID = "studyqa";

export const metadata = {
  title: "Q&A게시판 | 공실스터디",
  description:
    "공실스터디 수강 중 생긴 AI·영상편집·블로그·유튜브 실무 질문을 남기고 강사와 운영진의 답변을 받는 Q&A 게시판",
};

export default async function StudyQnaPage() {
  const boardRes = await getBoard(BOARD_ID);
  const board = boardRes.success ? (boardRes as any).data : null;

  let posts: any[] = [];
  let serverUser: any = null;
  let serverUserLevel = 0;

  if (board) {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const postsRes = await getBoardPosts(BOARD_ID, {
      boardType: board.board_type,
      userId: user?.id,
      isAdmin,
    });
    posts = postsRes.success ? postsRes.data : [];
  }

  if (!board) {
    return (
      <div style={{ padding: 80, textAlign: "center", fontSize: 18, color: "#666" }}>
        스터디 Q&A 게시판이 아직 준비되지 않았습니다.
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>게시판을 불러오는 중...</div>}>
      <StudyQnaClient
        board={board}
        initialPosts={posts}
        serverUser={serverUser}
        serverUserLevel={serverUserLevel}
      />
    </Suspense>
  );
}
