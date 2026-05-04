import React from "react";
import { getArticles, getAuthorProfileById } from "@/app/actions/article";
import { getVacanciesByOwnerId } from "@/app/actions/vacancy";
import PCReporterClient from "./PCReporterClient";

export const revalidate = 60;

export default async function PCReporterPage({
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

  let vacancies: any[] = [];
  if (profile?.id) {
    const vacRes = await getVacanciesByOwnerId(profile.id);
    if (vacRes.success && vacRes.data) {
      vacancies = vacRes.data;
    }
  }

  return (
    <PCReporterClient
      profile={profile || { name: "공실뉴스", role: "REALTOR", profile_image_url: null }}
      articles={articles}
      vacancies={vacancies}
      authorName={profile?.name || "기자"}
    />
  );
}
