import React from "react";
import { getArticles, getAuthorProfileByName } from "@/app/actions/article";
import MobileReporterClient from "./MobileReporterClient";

export const revalidate = 60;

export default async function MobileReporterPage({
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

  return (
    <MobileReporterClient
      profile={profile || { name: decodedName, role: "REALTOR", profile_image_url: null }}
      articles={articles}
      authorName={decodedName}
    />
  );
}
