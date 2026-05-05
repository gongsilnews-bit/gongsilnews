import React, { Suspense } from "react";
import { getBoard, getBoardPosts } from "@/app/actions/board";
import MobileBoardClient from "./MobileBoardClient";

export const metadata = {
  title: "자료실 - 공실뉴스",
};

export default async function MobileBoardPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;
  const boardId = resolvedParams.id || "drone";

  const [boardRes, postsRes] = await Promise.all([
    getBoard(boardId),
    getBoardPosts(boardId)
  ]);

  const board = boardRes.success ? boardRes.data : null;
  const posts = postsRes.success ? postsRes.data : [];

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666", minHeight: "100vh", paddingTop: "100px" }}>자료실을 불러오는 중...</div>}>
      {board ? (
        <MobileBoardClient board={board} initialPosts={posts} />
      ) : (
        <div style={{ padding: 80, textAlign: "center", fontSize: 16, color: "#666", minHeight: "100vh", paddingTop: "100px" }}>존재하지 않는 자료실입니다.</div>
      )}
    </Suspense>
  );
}
