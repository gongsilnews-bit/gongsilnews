import React, { Suspense } from 'react';
import { getLectures } from '@/app/actions/lecture';
import { getStudySettings } from '@/app/actions/studySettings';
import MobileStudyHubClient from './MobileStudyHubClient';

export const dynamic = 'force-dynamic';

export default async function MobileStudyPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const tab = params.tab || 'lecture';
  const subtab = params.subtab;

  // 1. 특강 데이터 & 카테고리 설정 병렬 로드
  const [res, settingsRes] = await Promise.all([
    getLectures({ status: "ACTIVE" }),
    getStudySettings(),
  ]);

  const lectures = res.success && res.data ? res.data : [];
  const categories =
    settingsRes.success && settingsRes.categories && settingsRes.categories.length > 0
      ? ["전체", ...settingsRes.categories]
      : ["전체", "중개실무", "법률", "세무", "분양", "마케팅", "기타"];

  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#666", minHeight: "100vh", paddingTop: "100px" }}>특강을 불러오는 중...</div>}>
      <MobileStudyHubClient 
        lectures={lectures}
        categories={categories}
      />
    </Suspense>
  );
}
