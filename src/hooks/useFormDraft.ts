"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* ──────────────────────────────────────────────
   작성 중인 폼 자동 보관 (브라우저 저장소)
   - 사용자가 입력/클릭해서 내용이 실제로 바뀐 뒤부터만 보관한다 (그냥 둘러보고 나가면 보관하지 않음)
   - 다른 메뉴로 가거나 새로고침해도 다시 들어오면 "불러오기"로 되살릴 수 있다
   - 등록/임시저장이 끝나면 clear()로 지운다
   ────────────────────────────────────────────── */

const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 2주 지난 보관본은 버린다

interface StoredDraft<T> {
  savedAt: number;
  data: T;
}

function readDraft<T>(key: string): StoredDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function removeDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function useFormDraft<T>(key: string | null, snapshot: T) {
  /* 들어왔을 때 남아 있던 보관본 — 사용자가 불러오기/지우기를 고를 때까지 보여 준다 */
  const [pending, setPending] = useState<StoredDraft<T> | null>(null);
  /* 사용자가 처음 손댄 순간의 내용 — 이것과 달라져야 보관을 시작한다 */
  const baselineRef = useRef<string | null>(null);
  const changedRef = useRef(false);
  const doneRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  useLayoutEffect(() => {
    snapshotRef.current = snapshot;
  });

  useEffect(() => {
    if (!key) return;
    baselineRef.current = null;
    changedRef.current = false;
    doneRef.current = false;
    // 브라우저 저장소는 화면이 뜬 뒤에만 읽을 수 있다
    const timer = window.setTimeout(() => setPending(readDraft<T>(key)), 0);
    return () => window.clearTimeout(timer);
  }, [key]);

  const write = useCallback(() => {
    if (!key || doneRef.current) return;
    const current = JSON.stringify(snapshotRef.current);
    if (!changedRef.current) {
      if (baselineRef.current === null || current === baselineRef.current) return;
      changedRef.current = true;
    }
    try {
      const payload: StoredDraft<T> = { savedAt: Date.now(), data: snapshotRef.current };
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {}
  }, [key]);

  /* 입력이 멈추고 0.8초 뒤 보관 */
  const serialized = JSON.stringify(snapshot);
  useEffect(() => {
    if (baselineRef.current === null) return;
    const timer = window.setTimeout(write, 800);
    return () => window.clearTimeout(timer);
  }, [serialized, write]);

  /* 화면을 떠나거나 창을 닫을 때 마지막 내용까지 보관 */
  useEffect(() => {
    window.addEventListener("pagehide", write);
    return () => {
      window.removeEventListener("pagehide", write);
      write();
    };
  }, [write]);

  /** 사용자가 폼에서 무언가 입력/클릭했을 때 호출 (바뀌기 직전 내용을 기준으로 잡는다) */
  const markDirty = useCallback(() => {
    if (baselineRef.current === null) baselineRef.current = JSON.stringify(snapshotRef.current);
  }, []);

  /** 남아 있던 보관본을 꺼내 준다 (꺼낸 뒤 배너는 닫힘) */
  const takePending = useCallback(() => {
    const data = pending?.data ?? null;
    setPending(null);
    changedRef.current = true;
    if (baselineRef.current === null) baselineRef.current = "";
    return data;
  }, [pending]);

  /** 남아 있던 보관본을 버린다 */
  const discardPending = useCallback(() => {
    if (key) removeDraft(key);
    setPending(null);
    baselineRef.current = null;
    changedRef.current = false;
  }, [key]);

  /** 등록·저장이 끝났을 때 — 보관본을 지우고 이후 보관을 멈춘다 */
  const clear = useCallback(() => {
    doneRef.current = true;
    if (key) removeDraft(key);
    setPending(null);
  }, [key]);

  return { pendingSavedAt: pending?.savedAt ?? null, takePending, discardPending, markDirty, clear };
}

/** "3분 전" 같은 짧은 시간 표시 */
export function formatDraftAge(savedAt: number) {
  const diffMin = Math.floor((Date.now() - savedAt) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}
