import React, { Suspense } from "react";
import { getBoard, getBoardPosts } from "@/app/actions/board";
import BoardClient from "./BoardClient";

export const metadata = {
  title: "게시판 - 공실뉴스",
};

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;
  const boardId = resolvedParams.id || "drone";

  const [boardRes, postsRes] = await Promise.all([
    getBoard(boardId),
    getBoardPosts(boardId)
  ]);

  const board = boardRes.success ? boardRes.data : null;
  const posts = postsRes.success ? postsRes.data : [];

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>게시판을 불러오는 중...</div>}>
      {board ? (
        <BoardClient board={board} initialPosts={posts} />
      ) : (
        <div style={{ padding: 80, textAlign: "center", fontSize: 18, color: "#666" }}>존재하지 않는 게시판입니다.</div>
      )}
    </Suspense>
  );
}
