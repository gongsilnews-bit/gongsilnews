import React, { Suspense } from "react";
import { getBoardPost, getBoard, getBoardComments, getAdjacentPosts } from "@/app/actions/board";
import MobileBoardReadClient from "./MobileBoardReadClient";

export default async function MobileBoardReadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const postId = params.id || params.post_id || "";
  const boardId = params.board_id || "";

  if (!postId) {
    return (
      <div style={{ padding: 80, textAlign: "center", fontSize: 16, color: "#999", minHeight: "100vh", paddingTop: "100px" }}>
        게시글 ID가 없습니다.
      </div>
    );
  }

  const [postRes, commentsRes] = await Promise.all([
    getBoardPost(postId),
    getBoardComments(postId),
  ]);

  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  let serverUser = null;
  let serverUserLevel = 0;

  if (user) {
    const { data } = await supabase.from("members").select("role, plan_type").eq("id", user.id).single();
    const r = data?.role?.toUpperCase() || "";
    isAdmin = r === "ADMIN" || r === "최고관리자" || r.includes("관리자");
    
    if (data) {
      const { getPermissionLevel } = await import("@/utils/permissionCheck");
      serverUser = { id: user.id, role: data.role, email: user.email };
      serverUserLevel = getPermissionLevel(data);
    }
  }

  const post = postRes.success ? postRes.data : null;
  const comments = commentsRes.success ? commentsRes.data : [];

  const resolvedBoardId = boardId || post?.board_id || "";
  let board = null;
  if (resolvedBoardId) {
    const boardRes = await getBoard(resolvedBoardId);
    board = boardRes.success ? (boardRes as any).data : null;
  }

  if (board?.board_type === "inquiry" && !isAdmin && post?.author_id !== user?.id) {
    return (
      <div style={{ padding: 80, textAlign: "center", fontSize: 16, color: "#999", minHeight: "100vh", paddingTop: "100px" }}>
        접근 권한이 없습니다.
      </div>
    );
  }

  let prevPost = null;
  let nextPost = null;
  if (post && (board || post?.board_id)) {
    const adjRes = await getAdjacentPosts(board?.board_id || post?.board_id, post.created_at, postId);
    if (adjRes.success) {
      prevPost = adjRes.prev;
      nextPost = adjRes.next;
    }
  }

  if (!post) {
    return (
      <div style={{ padding: 80, textAlign: "center", fontSize: 16, color: "#999", minHeight: "100vh", paddingTop: "100px" }}>
        게시글을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", minHeight: "100vh", paddingTop: "100px" }}>불러오는 중...</div>}>
      <MobileBoardReadClient
        post={post}
        board={board}
        comments={comments || []}
        prevPost={prevPost}
        nextPost={nextPost}
        serverUser={serverUser}
        serverUserLevel={serverUserLevel}
      />
    </Suspense>
  );
}
