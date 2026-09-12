"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHomeVacancies } from "@/app/actions/home-vacancies";
import styles from "./HomeNewsHero.module.css";

type Vacancy = Awaited<ReturnType<typeof getHomeVacancies>>["data"][number];

function amount(value: number) {
  const units = Math.round(value / 10000);
  if (!units) return "0";
  const billions = Math.floor(units / 10000);
  const rest = units % 10000;
  return [billions ? `${billions}억` : "", rest ? `${Math.floor(rest / 1000) ? `${Math.floor(rest / 1000)}천` : ""}${rest % 1000 || ""}만` : ""].filter(Boolean).join(" ");
}

export default function HomeVacancyList() {
  const [items, setItems] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [auctionCount, setAuctionCount] = useState<number | null>(null);
  const [registrationHref, setRegistrationHref] = useState("/login?returnTo=" + encodeURIComponent("/realty_admin?menu=gongsil&action=write"));
  useEffect(() => {
    let active = true;
    let request = 0;
    async function refresh() {
      const current = ++request;
      setLoading(true);
      const result = await getHomeVacancies();
      if (!active || current !== request) return;
      setItems(result.data);
      setAuctionCount(result.auctionCount ?? null);
      if (result.registrationHref) setRegistrationHref(result.registrationHref);
      setError(!result.success);
      setLoading(false);
    }
    void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; document.removeEventListener("visibilitychange", onVisible); };
  }, [retry]);

  return <>
    <div className={styles.vacancies} aria-busy={loading}>
      {loading ? <div className={styles.empty} role="status">공실 목록을 불러오는 중입니다.</div> : error ? <div className={styles.empty} role="status">목록을 불러오지 못했습니다.<button onClick={() => setRetry(value => value + 1)}>다시 시도</button></div> : items.length === 0 ? <div className={styles.empty}>등록된 공실이 없습니다.</div> : items.map(item => <Link className={styles.vacancy} key={item.id} href={item.href} prefetch={false}>
        <div className={styles.vacancyText}>
          <h3 className={item.masked ? styles.masked : undefined}>{item.title}</h3>
          <strong>{item.tradeType === "경매" ? `경매 ${amount(item.auctionPrice)}` : ["매매", "전세"].includes(item.tradeType) ? `${item.tradeType} ${amount(item.deposit)}` : `${amount(item.deposit)}/${amount(item.monthlyRent)}`}</strong>
          <p>{item.propertyType} · {item.area ? `${item.area}㎡` : item.direction || "면적미상"}</p>
          <div className={styles.vacancyMeta}><span>{item.tradeType === "경매" ? "경매/공매" : item.commission || item.tradeType || "공실"}</span><time>{item.createdAt?.slice(0, 10).replace(/-/g, ".")}</time></div>
        </div>
        {item.photo && <div className={styles.vacancyPhoto}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/proxy-image?url=${encodeURIComponent(item.photo)}`} alt="매물 사진" loading="lazy" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />
        </div>}
      </Link>)}
    </div>
    <Link className={styles.more} href="/gongsil" prefetch={false}><strong>실시간 경공매 {auctionCount !== null && <><span className={styles.auctionCount}>{auctionCount.toLocaleString("ko-KR")}</span>건</>}</strong><span className={styles.moreLabel}>전체보기 ›</span></Link>
    <Link className={styles.banner} href={registrationHref} prefetch={false}>
      <div><strong>11만 부동산 무료 열람</strong><b>공실 무료 등록 <span aria-hidden="true">&gt;&gt;</span></b></div>
    </Link>
  </>;
}

