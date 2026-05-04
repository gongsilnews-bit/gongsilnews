import React from "react";
import { getArticles, getAuthorProfileByName } from "@/app/actions/article";
import { getAllActiveVacancies } from "@/app/actions/vacancy";
import PCReporterClient from "./PCReporterClient";

export const revalidate = 60;

export default async function PCReporterPage({
  params,
}: {
  params: { name: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const decodedName = decodeURIComponent(resolvedParams.name);

  const [profileRes, articlesRes] = await Promise.all([
    getAuthorProfileByName(decodedName),
    getArticles({ status: "APPROVED", author_name: decodedName }),
  ]);

  const profile = profileRes.success ? profileRes.data : null;
  const articles = articlesRes.success ? articlesRes.data || [] : [];

  let vacancies: any[] = [];
  const vacRes = await getAllActiveVacancies();
  if (vacRes.success && vacRes.data) {
    vacancies = vacRes.data;
  }

  return (
    <PCReporterClient
      profile={profile || { name: decodedName, role: "REALTOR", profile_image_url: null }}
      articles={articles}
      vacancies={vacancies}
      authorName={decodedName}
    />
  );
}
