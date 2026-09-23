"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { isAdminRole } from "@/utils/permissionCheck";
import ArticleDraftStudio from "./ArticleDraftStudio";
import { STANDALONE_ARTICLE_DRAFT_KEY } from "./constants";
import type { ArticleDraftResult, DraftVacancy } from "./types";
import styles from "./StandaloneArticleDraftPage.module.css";

export default function StandaloneArticleDraftPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [vacancies, setVacancies] = useState<DraftVacancy[]>([]);
  const [isLoadingVacancies, setIsLoadingVacancies] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      const { data: member } = await supabase
        .from("members")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!member || !isAdminRole(member.role)) {
        alert("접근 권한이 없습니다.");
        router.replace("/");
        return;
      }

      if (active) setAuthChecked(true);
    })();

    return () => { active = false; };
  }, [router]);

  const fetchMyVacancies = useCallback(async () => {
    setIsLoadingVacancies(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("vacancies")
        .select("id, vacancy_no, building_name, property_type, sido, sigungu, dong, trade_type, deposit, monthly_rent, sale_price")
        .eq("owner_id", user.id)
        .neq("status", "DELETED")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setVacancies((data || []) as DraftVacancy[]);
    } catch (error) {
      console.error("standalone article draft vacancy list error", error);
      alert("내 매물 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingVacancies(false);
    }
  }, []);

  const applyToArticleEditor = (draft: ArticleDraftResult) => {
    sessionStorage.setItem(STANDALONE_ARTICLE_DRAFT_KEY, JSON.stringify(draft));
    router.push("/admin?menu=article&action=write&draft_source=standalone");
  };

  if (!authChecked) return <div className={styles.loading}>권한을 확인하고 있습니다...</div>;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.mark}>공</div>
          <div><strong>공실뉴스 매물기사초안 V1.0</strong><span>관리자 독립형 기사 초안 작성기</span></div>
        </div>
        <button type="button" className={styles.back} onClick={() => router.push("/admin?menu=article")}>기사관리로 돌아가기</button>
      </header>

      <ArticleDraftStudio
        variant="standalone"
        onApply={applyToArticleEditor}
        myVacancies={vacancies}
        isLoadingVacancies={isLoadingVacancies}
        fetchMyVacancies={fetchMyVacancies}
        initialVacancyId={searchParams.get("vacancy_id") || undefined}
      />
    </main>
  );
}
