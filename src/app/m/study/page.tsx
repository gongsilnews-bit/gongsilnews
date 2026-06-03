import React, { Suspense } from 'react';
import { getLectures } from '@/app/actions/lecture';
import MobileStudyHubClient from './MobileStudyHubClient';

export const dynamic = 'force-dynamic';

export default async function MobileStudyPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const tab = params.tab || 'lecture';
  const subtab = params.subtab;

  // 1. 특강 데이터
  let lectures = [];
  const res = await getLectures({ status: "ACTIVE" });
  if (res.success && res.data) {
    lectures = res.data;
  }

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666", minHeight: "100vh", paddingTop: "100px" }}>특강을 불러오는 중...</div>}>
      <MobileStudyHubClient 
        lectures={lectures}
      />
    </Suspense>
  );
}
