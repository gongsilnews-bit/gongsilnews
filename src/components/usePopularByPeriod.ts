"use client";

import { useEffect, useState } from "react";
import { getPopularNewsByPeriod, type PopularPeriod } from "@/app/actions/popularNews";
import { formatSection1 } from "@/utils/formatCategory";

/**
 * 많이 본 뉴스 네 곳(PC·모바일 기사 화면, 목록 옆 칸 PC·모바일)이 같이 쓰는 기간별 순위 (2026-11-24)
 *  서버가 그 카테고리 전체에서 기간별 상위 5개를 뽑아 준다. 받기 전(또는 실패하면)엔 null → 화면은 예전 목록을 그대로 보여 준다.
 */
export function usePopularByPeriod(args: { section1?: string | null; section2?: string | null; period: PopularPeriod; excludeId?: string | number | null }) {
  const { section1, section2, period, excludeId } = args;
  const [data, setData] = useState<any[] | null>(null);
  useEffect(() => {
    let alive = true;
    getPopularNewsByPeriod({ section1, section2, period, excludeId })
      .then((r) => { if (alive && r.success && r.data.length > 0) setData(r.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [section1, section2, period, excludeId]);
  return data;
}

/** 목록 화면 — 받아 둔 기사들이 모두 같은 대분류면 그 대분류 (전체 목록이면 null) */
export function commonSection1(list: any[]): string | null {
  if (!list.length || !list[0]?.section1) return null;
  const s = formatSection1(list[0].section1); // 옛 이름(공실현장 등)도 같은 대분류로
  return list.every((a) => a?.section1 && formatSection1(a.section1) === s) ? s : null;
}
