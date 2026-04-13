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

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>불러오는 중...</div>}>
      <BoardWriteClient board={board} editPostId={editPostId} editPost={editPost} />
    </Suspense>
  );
}
