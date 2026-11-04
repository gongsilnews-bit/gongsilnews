"use client";
/**
 * 기사 카드 [기사 보러가기 >] 아래 "💬 댓글 N" (2026-11-04 사장님) — 지도 왼쪽 목록 · MY관심 · 사무소·단지 팝업이 같이 쓴다.
 * 카드마다 <CommentCount id /> 를 두면, 같은 순간에 그려진 카드들을 모아 서버에 한 번만 묻는다.
 * 한 번 받은 수는 이 화면에서 기억한다 (같은 기사를 다시 묻지 않는다)
 */
import React, { useEffect, useState } from "react";
import { articleCommentCounts } from "@/app/actions/mapNews";

const memo = new Map<string, number>();
const waiting = new Set<string>();
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const list = [...waiting].slice(0, 300);
    list.forEach((x) => waiting.delete(x));
    articleCommentCounts(list)
      .then((r) => { for (const x of list) memo.set(x, r[x] || 0); })
      .catch(() => { for (const x of list) memo.set(x, 0); })
      .finally(() => { subs.forEach((f) => f()); if (waiting.size) schedule(); });
  }, 40);
}
function ask(id: string) {
  if (memo.has(id) || waiting.has(id)) return;
  waiting.add(id);
  schedule();
}

export function CommentCount({ id, style }: { id: string | number; style?: React.CSSProperties }) {
  const key = String(id);
  const [n, setN] = useState<number | undefined>(memo.get(key));
  useEffect(() => {
    const on = () => setN(memo.get(key));
    subs.add(on);
    if (!memo.has(key)) ask(key); else on();
    return () => { subs.delete(on); };
  }, [key]);
  // 날짜 줄 끝에 " · 댓글 3" 처럼 조용히 — 0이거나 아직 모르면 안 보인다 (2026-11-04 사장님: "댓글 표기 촌스러워")
  if (!n) return null;
  return React.createElement("span", { style: { color: "#a1a1aa", whiteSpace: "nowrap", ...style } }, ` · 댓글 ${n}`);
}
