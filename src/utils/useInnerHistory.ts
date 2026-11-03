"use client";
// 메뉴 안쪽 화면 전환도 뒤로가기 기록에 남긴다 (2026-11-03 사장님: 편집 화면에서 ‹ 누르면 목록으로)
//  예) 포토studio 편집 ↔ 최근 파일 · 동영상studio 편집 ↔ 처음 화면 · 뉴스·SNS 작업대 ↔ 공실 목록
//  open 이 켜지면 같은 주소로 기록 한 칸(gsInner: key)을 쌓고, 뒤로가기로 그 칸을 벗어나면 onBack,
//  앞으로가기로 다시 들어오면 onForward (없으면 그 칸은 건너뛴다). 화면 안 단추로 닫으면 쌓은 칸을 조용히 되돌린다.
//  앱 위 [‹][›]·Alt+←/→·마우스 옆 단추(StudioHistoryNav)가 모두 이 기록을 따라간다.
import { useEffect, useRef } from "react";

type Guard = (next: () => void) => void;

export function useInnerHistory(key: string, open: boolean, onBack: () => void, onForward?: () => void, guard?: () => Guard | undefined) {
  const pushed = useRef(false);
  const ignore = useRef(0);
  const back = useRef(onBack);
  back.current = onBack;
  const fwd = useRef(onForward);
  fwd.current = onForward;
  const guardRef = useRef(guard);
  guardRef.current = guard;

  // 다른 메뉴에 갔다가 뒤로가기로 이 칸에 다시 내려앉은 채로 화면이 새로 그려졌다 — 칸을 또 쌓지 않고, 닫혀 있으면 다시 연다
  useEffect(() => {
    if ((window.history.state as { gsInner?: string } | null)?.gsInner !== key) return;
    pushed.current = true;
    if (!open) fwd.current?.();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && !pushed.current) {
      window.history.pushState({ ...(window.history.state || {}), gsInner: key }, "");
      pushed.current = true;
    } else if (!open && pushed.current) {
      pushed.current = false;
      // 화면 안 단추로 닫았다 — 쌓은 칸을 조용히 되돌린다 (뒤로가기를 한 번 더 눌러야 하는 일이 없게)
      if ((window.history.state as { gsInner?: string } | null)?.gsInner === key) { ignore.current++; window.history.back(); }
    }
  }, [open, key]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (ignore.current) { ignore.current--; return; }
      const here = (e.state as { gsInner?: string } | null)?.gsInner === key;
      if (pushed.current && !here) {
        pushed.current = false;
        const g = guardRef.current?.();
        // 저장 안 한 내용이 있으면 먼저 묻는다 — [취소]하면 그 칸을 다시 쌓아 편집 화면에 머문다
        //  (일단 칸을 다시 쌓아 머물고, 저장·저장 안 함을 고르면 닫는다 — 닫히면 위 효과가 그 칸을 조용히 되돌린다)
        if (g) {
          window.history.pushState({ ...(window.history.state || {}), gsInner: key }, "");
          pushed.current = true;
          g(() => back.current());
        } else back.current();
      } else if (!pushed.current && here) {
        if (fwd.current) { pushed.current = true; fwd.current(); }
        else { ignore.current++; window.history.back(); } // 다시 열 수 없는 칸은 건너뛴다
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [key]);
}
