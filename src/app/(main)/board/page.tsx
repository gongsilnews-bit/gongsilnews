import React, { Suspense } from "react";
import { getBoard, getBoardPosts } from "@/app/actions/board";
import BoardClient from "./BoardClient";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "게시판 - 공실뉴스",
};

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;
  const boardId = resolvedParams.id || "drone";

  const boardRes = await getBoard(boardId);
  const board = boardRes.success ? boardRes.data : null;

  let posts = [];
  let serverUser = null;
  let serverUserLevel = 0;

  if (board) {
    const { createClient } = await import("@/utils/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let isAdmin = false;
    if (user) {
      const { data } = await supabase.from("members").select("role, plan_type, agencies(status)").eq("id", user.id).single();
      const r = data?.role?.toUpperCase() || "";
      isAdmin = r === "ADMIN" || r === "최고관리자" || r.includes("관리자");
      
      if (data) {
        const { getPermissionLevel } = await import("@/utils/permissionCheck");
        serverUser = { id: user.id, role: data.role, email: user.email };
        serverUserLevel = getPermissionLevel(data);
      }
    }

    const postsRes = await getBoardPosts(boardId, {
      boardType: board.board_type,
      userId: user?.id,
      isAdmin
    });
    posts = postsRes.success ? postsRes.data : [];
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>게시판을 불러오는 중...</div>}>
      {board ? (
        <BoardClient board={board} initialPosts={posts} serverUser={serverUser} serverUserLevel={serverUserLevel} />
      ) : (
        <div style={{ padding: 80, textAlign: "center", fontSize: 18, color: "#666" }}>존재하지 않는 게시판입니다.</div>
      )}
    </Suspense>
  );
}
