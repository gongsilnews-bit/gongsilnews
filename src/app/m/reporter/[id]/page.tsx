import React from "react";
import { getArticles, getAuthorProfileById } from "@/app/actions/article";
import { getVacanciesByOwnerId } from "@/app/actions/vacancy";
import MobileReporterClient from "./MobileReporterClient";

export const revalidate = 60;

export default async function MobileReporterPage({
  params,
}: {
  params: { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const decodedId = decodeURIComponent(resolvedParams.id);

  const [profileRes, articlesRes] = await Promise.all([
    getAuthorProfileById(decodedId),
    getArticles({ status: "APPROVED", author_id: decodedId }),
  ]);

  const profile = profileRes.success ? profileRes.data : null;
  const articles = articlesRes.success ? articlesRes.data || [] : [];

  // 프로필에서 member id를 가져와 해당 기자의 공실 목록도 조회
  let vacancies: any[] = [];
  if (profile?.id) {
    const vacRes = await getVacanciesByOwnerId(profile.id);
    if (vacRes.success && vacRes.data) {
      vacancies = vacRes.data;
    }
  }

  return (
    <MobileReporterClient
      profile={profile || { name: "공실뉴스", role: "REALTOR", profile_image_url: null }}
      articles={articles}
      vacancies={vacancies}
      authorName={profile?.name || "기자"}
    />
  );
}
