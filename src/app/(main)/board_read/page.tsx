import React, { Suspense } from "react";
import Link from "next/link";
import { getBoardPost, getBoard, getBoardPosts, getBoardComments } from "@/app/actions/board";
import BoardReadClient from "./BoardReadClient";

export default async function BoardReadPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const postId = params.id || params.post_id || "";
  const boardId = params.board_id || "";

  if (!postId) {
    return (
      <div style={{ padding: 80, textAlign: "center", fontSize: 16, color: "#999" }}>
        게시글 ID가 없습니다.
      </div>
    );
  }

  const [postRes, commentsRes] = await Promise.all([
    getBoardPost(postId),
    getBoardComments(postId),
  ]);

  const post = postRes.success ? postRes.data : null;
  const comments = commentsRes.success ? commentsRes.data : [];

  // board_id가 URL에 없으면 post.board_id로 fallback 조회
  const resolvedBoardId = boardId || post?.board_id || "";
  let board = null;
  if (resolvedBoardId) {
    const boardRes = await getBoard(resolvedBoardId);
    board = boardRes.success ? (boardRes as any).data : null;
  }

  // 이전/다음 글
  let prevPost = null;
  let nextPost = null;
  if (board || post?.board_id) {
    const allRes = await getBoardPosts(board?.board_id || post?.board_id);
    if (allRes.success && allRes.data) {
      const all = allRes.data;
      const idx = all.findIndex((p: any) => p.id === postId);
      prevPost = idx > 0 ? all[idx - 1] : null;
      nextPost = idx < all.length - 1 ? all[idx + 1] : null;
    }
  }

  if (!post) {
    return (
      <div style={{ padding: 80, textAlign: "center", fontSize: 16, color: "#999" }}>
        게시글을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>불러오는 중...</div>}>
      <BoardReadClient
        post={post}
        board={board}
        comments={comments || []}
        prevPost={prevPost}
        nextPost={nextPost}
      />
    </Suspense>
  );
}
