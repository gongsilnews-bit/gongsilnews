"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import baseStyles from "./home/HomeNewsHero.module.css";
import layoutStyles from "./CategoryImportantHero.module.css";

const styles: Record<string, string> = {
  ...baseStyles,
  hero: `${baseStyles.hero} ${layoutStyles.hero}`,
  editorial: `${baseStyles.editorial} ${layoutStyles.editorial}`,
  supporting: `${baseStyles.supporting} ${layoutStyles.supporting}`,
  lead: `${baseStyles.lead} ${layoutStyles.lead}`,
  controls: `${baseStyles.controls} ${layoutStyles.controls}`,
  supportArticle: `${baseStyles.supportArticle} ${layoutStyles.supportArticle}`,
  image: `${baseStyles.image} ${layoutStyles.image}`,
};

interface Article {
  id: string;
  article_no?: number | null;
  title: string;
  subtitle?: string | null;
  section1?: string | null;
  thumbnail_url?: string | null;
  youtube_url?: string | null;
}

function videoIdFor(article: Article) {
  const url = article.youtube_url || "";
  return url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/))([\w-]{11})/)?.[1]
    || url.match(/[?&]v=([\w-]{11})/)?.[1]
    || article.thumbnail_url?.match(/(?:img\.youtube\.com|i\.ytimg\.com)\/vi(?:_webp)?\/([\w-]{11})\//)?.[1];
}

function thumbnailFor(article: Article) {
  const videoId = videoIdFor(article);
  return article.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
}

function ArticleImage({ article, lead = false, children }: { article: Article; lead?: boolean; children?: ReactNode }) {
  const videoId = videoIdFor(article);
  const source = thumbnailFor(article);
  const [failed, setFailed] = useState(false);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const videoSource = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  return <div className={styles.image}>
    {/* Article photos retain their original source, as in the existing news grid. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {source && !failed ? <img src={useVideoFallback && videoSource ? videoSource : source} alt="" loading={lead ? "eager" : "lazy"} fetchPriority={lead ? "high" : "auto"} onError={() => { if (videoSource && source !== videoSource && !useVideoFallback) setUseVideoFallback(true); else setFailed(true); }} /> : <span className={styles.noImage}>공실뉴스</span>}
    {videoId && <span className={styles.play} role="img" aria-label="유튜브 영상 기사"><svg width="24" height="26" viewBox="0 0 24 26" aria-hidden="true"><path d="M5 3L22 13L5 23Z" fill="currentColor" /></svg></span>}
    {children}
  </div>;
}

export default function CategoryImportantHero({ articles: source, memberName, mentalText }: { articles: Article[]; memberName: string; mentalText: string }) {
  const articles = useMemo(() => [...new Map(source.map(article => [article.id, article])).values()], [source]);
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const pages = articles.length;
  const currentPage = pages ? page % pages : 0;
  const lead = articles[currentPage];
  const supporting = Array.from({ length: Math.min(2, Math.max(0, pages - 1)) }, (_, index) => articles[(currentPage + index + 1) % pages]);
  const stopped = hovered || focused || paused || hidden;

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (pages <= 1 || stopped) return;
    const timer = window.setTimeout(() => setPage(value => (value + 1) % pages), 8000);
    return () => window.clearTimeout(timer);
  }, [page, pages, stopped]);

  // The next lead is already visible; only warm the one incoming thumbnail.
  useEffect(() => {
    if (pages <= 1 || hidden) return;
    let timer: number | undefined;
    const preload = () => {
      timer = window.setTimeout(() => {
        const next = articles[(currentPage + 3) % pages];
        const source = thumbnailFor(next);
        if (source) { const image = new window.Image(); image.src = source; }
      }, 1000);
    };
    if (document.readyState === "complete") preload();
    else window.addEventListener("load", preload, { once: true });
    return () => { window.clearTimeout(timer); window.removeEventListener("load", preload); };
  }, [articles, currentPage, pages, hidden]);

  return <section className={styles.hero} aria-label="중요기사">
    <div className={styles.news} aria-label="중요기사 뉴스" aria-roledescription="캐러셀"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>

      {lead ? <div className={styles.editorial} aria-live={stopped ? "polite" : "off"}>
        <article key={lead.id} className={styles.lead}>
          <Link href={`/news/${lead.article_no || lead.id}`} prefetch={false}>
            <ArticleImage key={lead.id} article={lead} lead>
              <div className={layoutStyles.greeting}>
                <span><strong>{memberName} 대표님</strong>을 위한</span>
                <h2>{mentalText} <span>News</span></h2>
              </div>
            </ArticleImage>
            <h1>{lead.title}</h1>
          </Link>
        </article>
        <div className={styles.supporting}>
          <div className={layoutStyles.supportImages}>
          {supporting.map((article) => <article key={article.id} className={styles.supportArticle}>
            <Link href={`/news/${article.article_no || article.id}`} prefetch={false}>
              <ArticleImage article={article} />
              <h3>{article.title}</h3>
            </Link>
          </article>)}
          </div>

      {pages > 1 && <div className={styles.controls}>
        <button type="button" aria-label="이전 중요기사" onClick={() => setPage((currentPage - 1 + pages) % pages)}>‹</button>
        <span aria-label={`중요기사 ${pages}개 중 ${currentPage + 1}번째`}>{currentPage + 1} / {pages}</span>
        <button type="button" aria-label="다음 중요기사" onClick={() => setPage((currentPage + 1) % pages)}>›</button>
        <button type="button" aria-label={paused ? "자동 전환 재생" : "자동 전환 일시정지"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "▶" : "Ⅱ"}</button>
      </div>}
        </div>
      </div> : <div className={styles.empty}>등록된 주요 뉴스가 없습니다.</div>}
    </div>

  </section>;
}
