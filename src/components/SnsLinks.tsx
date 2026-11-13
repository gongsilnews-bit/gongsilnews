// 공실뉴스 SNS 바로가기 아이콘 (2026-11-13 사장님) — PC 푸터 오른쪽 · 모바일 푸터 법적 링크 위
// 주소가 없는 SNS 는 보이지 않는다. 새 SNS 주소가 생기면 href 만 채우면 된다 (짐작한 주소 넣지 않기)
import React from "react";

type Sns = { id: string; name: string; href: string; color: string; path: React.ReactNode };

const SNS: Sns[] = [
  {
    id: "youtube", name: "유튜브", color: "#FF0000",
    href: "https://www.youtube.com/@%EA%B3%B5%EC%8B%A4%EB%89%B4%EC%8A%A4_1555",
    path: <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />,
  },
  {
    id: "kakao", name: "카카오톡 채널", color: "#FEE500",
    href: "https://pf.kakao.com/_ckHkG",
    path: <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.6.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />,
  },
  {
    id: "instagram", name: "인스타그램", color: "#E1306C", href: "https://www.instagram.com/gongsilnews/",
    path: <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM12 2c-2.7 0-3.1 0-4.1.1C4.3 2.2 2.2 4.3 2.1 7.9 2 8.9 2 9.3 2 12s0 3.1.1 4.1c.1 3.6 2.2 5.7 5.8 5.8 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c3.6-.1 5.7-2.2 5.8-5.8.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c-.1-3.6-2.2-5.7-5.8-5.8C15.1 2 14.7 2 12 2zm0 1.8c2.7 0 3 0 4 .1 2.6.1 3.9 1.4 4 4 .1 1 .1 1.3.1 4s0 3-.1 4c-.1 2.6-1.4 3.9-4 4-1 .1-1.3.1-4 .1s-3 0-4-.1c-2.6-.1-3.9-1.4-4-4-.1-1-.1-1.3-.1-4s0-3 .1-4c.1-2.6 1.4-3.9 4-4 1-.1 1.3-.1 4-.1z" />,
  },
  {
    id: "blog", name: "네이버 블로그", color: "#03C75A", href: "https://blog.naver.com/mygongsil",
    path: <path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5.2L12 21l-2.8-3H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3.2 4.2v6.6h2.6c1.4 0 2.3-.7 2.3-1.9 0-.8-.5-1.3-1.1-1.5.5-.2.9-.7.9-1.3 0-1.1-.8-1.9-2.2-1.9H7.2zm1.6 1.3h.9c.5 0 .8.2.8.6s-.3.7-.8.7h-.9V8.5zm0 2.5h1c.6 0 .9.3.9.7s-.3.8-.9.8h-1V11zm5-3.8v6.6h1.6V7.2h-1.6z" />,
  },
  {
    id: "facebook", name: "페이스북", color: "#1877F2", href: "https://www.facebook.com/profile.php?id=61570688973294",
    path: <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />,
  },
  {
    id: "threads", name: "스레드", color: "#000000", href: "https://www.threads.com/@gongsilnews",
    path: <path d="M17.7 11.1c-.1 0-.2-.1-.3-.1-.2-3-1.8-4.7-4.6-4.7-1.7 0-3 .7-3.9 2l1.5 1c.6-.9 1.6-1.1 2.3-1.1 1 0 1.7.3 2.2.9.3.4.5 1 .6 1.7-.8-.1-1.6-.2-2.6-.1-2.6.1-4.2 1.6-4.1 3.7.1 2 1.9 3.2 4 3.1 2.6-.1 4.1-2.1 4.3-4.6.9.5 1.4 1.3 1.6 2.1.4 1.6-.4 3.6-2.2 4.8-1.3.9-2.9 1.3-4.6 1.3-4.2 0-6.9-2.8-6.9-7.8s2.7-7.8 6.9-7.8c4.2 0 6.4 2.4 7 5.3l1.8-.5C21.8 4.8 19 2 13.9 2 8.4 2 5 5.7 5 12s3.4 10 8.9 10c2.2 0 4.1-.6 5.6-1.7 2.4-1.8 3.3-4.6 2.6-6.9-.4-1.3-1.4-2.4-2.9-3.1-.5-.1-1-.2-1.5-.2zm-4.5 5c-1.1.1-2.2-.4-2.2-1.4 0-.7.5-1.6 2.4-1.7h.6c.7 0 1.3.1 1.9.2-.2 2.2-1.3 2.8-2.7 2.9z" />,
  },
];

/** tone="dark" — 어두운 바탕(PC 푸터) · tone="light" — 밝은 바탕(모바일 푸터) */
export default function SnsLinks({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const items = SNS.filter((s) => s.href);
  if (!items.length) return null;
  return (
    <div className={`sns-links sns-${tone}`}>
      <style>{`
        .sns-links { display: flex; gap: 10px; align-items: center; }
        .sns-links a { width: 38px; height: 38px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; transition: background .15s, border-color .15s, color .15s; text-decoration: none; }
        .sns-dark a { border: 1px solid rgba(255,255,255,0.35); color: #e2e8f0; background: rgba(255,255,255,0.04); }
        .sns-light a { border: 1px solid #e5e7eb; color: #4b5563; background: #fff; }
        .sns-links a:hover { background: var(--c); border-color: var(--c); color: var(--t); }
      `}</style>
      {items.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`공실뉴스 ${s.name}`}
          aria-label={`공실뉴스 ${s.name}`}
          style={{ ["--c" as string]: s.color, ["--t" as string]: s.id === "kakao" ? "#3C1E1E" : "#fff" } as React.CSSProperties}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{s.path}</svg>
        </a>
      ))}
    </div>
  );
}
