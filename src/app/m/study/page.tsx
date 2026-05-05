import React, { Suspense } from 'react';
import { getLectures } from '@/app/actions/lecture';
import { getBoard, getBoardPosts } from '@/app/actions/board';
import MobileStudyHubClient from './MobileStudyHubClient';

export const dynamic = 'force-dynamic';

export default async function MobileStudyPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const tab = params.tab || 'lecture';
  const subtab = params.subtab;

  // 1. 특강 데이터
  let lectures = [];
  if (tab === 'lecture') {
    const res = await getLectures({ status: "ACTIVE" });
    if (res.success && res.data) {
      lectures = res.data;
    }
  }

  // 2. 게시판(자료실, 커뮤니티) 데이터
  let board = null;
  let posts = [];
  if (tab === 'resource' || tab === 'community') {
    let boardId = '';
    if (tab === 'resource') {
      boardId = subtab || 'drone'; // 기본값: 드론영상
    } else if (tab === 'community') {
      boardId = subtab || 'free'; // 기본값: 자유게시판
    }

    if (boardId) {
      const [boardRes, postsRes] = await Promise.all([
        getBoard(boardId),
        getBoardPosts(boardId)
      ]);
      if (boardRes.success) board = boardRes.data;
      if (postsRes.success) posts = postsRes.data;
    }
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666", minHeight: "100vh", paddingTop: "100px" }}>공실스터디를 불러오는 중...</div>}>
      <MobileStudyHubClient 
        initialTab={tab}
        initialSubtab={subtab || ''}
        lectures={lectures}
        board={board}
        boardPosts={posts}
      />
    </Suspense>
  );
}
