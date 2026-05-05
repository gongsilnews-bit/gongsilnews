import React, { Suspense } from "react";
import { getBoard, getBoardPost } from "@/app/actions/board";
import BoardWriteClient from "./BoardWriteClient";

export default async function BoardWritePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const boardId = params.board_id || "drone";
  const editPostId = params.post_id || null;

  const boardRes = await getBoard(boardId);
  const board = boardRes.success ? boardRes.data : null;

  let editPost = null;
  if (editPostId) {
    const postRes = await getBoardPost(editPostId);
    editPost = postRes.success ? postRes.data : null;
  }

  // 서버에서 유저 정보 로드 (클라이언트 중복 호출 방지)
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let serverUser = null;
  let serverUserLevel = 0;

  if (user) {
    const { getPermissionLevel } = await import("@/utils/permissionCheck");
    const { data: memberData } = await supabase.from("members").select("role, plan_type").eq("id", user.id).single();
    if (memberData) {
      serverUser = { id: user.id, role: memberData.role, email: user.email };
      serverUserLevel = getPermissionLevel(memberData);
    }
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>불러오는 중...</div>}>
      <BoardWriteClient 
        board={board} 
        editPostId={editPostId} 
        editPost={editPost} 
        serverUser={serverUser}
        serverUserLevel={serverUserLevel}
      />
    </Suspense>
  );
}
