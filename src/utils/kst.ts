/**
 * 🇰🇷 KST (Korea Standard Time, UTC+9) 중앙 유틸리티
 * 
 * Vercel 서버는 UTC 기준으로 동작하므로, 한국 시간을 정확히 표시하려면
 * 반드시 이 유틸리티를 사용해야 합니다.
 * 
 * ⚠️ 주의: new Date()나 toLocaleDateString() 등을 직접 사용하면
 *    Vercel(UTC)과 로컬(KST)에서 서로 다른 결과가 나옵니다.
 *    반드시 이 모듈의 함수를 사용하세요!
 * 
 * @example
 * import { kstNow, kstTodayStart, formatKSTDate, formatKSTTime, kstISOString } from "@/utils/kst";
 * 
 * const now = kstNow();                    // 현재 KST 시각의 Date 객체
 * const todayStart = kstTodayStart();      // 오늘 KST 자정의 ISO 문자열
 * const dateStr = formatKSTDate(someDate); // "6월 1일" 형태
 * const timeStr = formatKSTTime(someDate); // "오전 08:51" 형태
 * const iso = kstISOString();              // KST 기준 ISO 문자열 (DB 저장용)
 */

const KST_TIMEZONE = "Asia/Seoul";

// ─── 현재 KST 시각 ────────────────────────────────────────────

/**
 * 현재 KST 시각을 Date 객체로 반환합니다.
 * 주의: 반환된 Date의 내부 값은 UTC이지만, KST 기준으로 시/분/초가 맞춰져 있습니다.
 */
export function kstNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: KST_TIMEZONE }));
}

/**
 * 현재 KST 시각의 시(hour)를 반환합니다 (0~23).
 */
export function kstHour(): number {
  return kstNow().getHours();
}

// ─── KST 기준 날짜 경계 ──────────────────────────────────────

/**
 * 오늘 KST 자정(00:00:00)의 ISO 문자열을 반환합니다.
 * Supabase 쿼리의 `.gte("created_at", ...)` 등에 사용합니다.
 */
export function kstTodayStart(): string {
  const now = new Date();
  const kstStr = now.toLocaleDateString("en-CA", { timeZone: KST_TIMEZONE }); // "2026-06-01" 형태
  return new Date(`${kstStr}T00:00:00+09:00`).toISOString();
}

/**
 * 어제 KST 자정(00:00:00)의 ISO 문자열을 반환합니다.
 */
export function kstYesterdayStart(): string {
  const todayMs = new Date(kstTodayStart()).getTime();
  return new Date(todayMs - 24 * 60 * 60 * 1000).toISOString();
}

/**
 * 어제 KST 23:59:59.999의 ISO 문자열을 반환합니다.
 */
export function kstYesterdayEnd(): string {
  const todayMs = new Date(kstTodayStart()).getTime();
  return new Date(todayMs - 1).toISOString();
}

/**
 * 오늘 KST 날짜 문자열을 반환합니다 ("2026-06-01" 형태).
 */
export function kstTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: KST_TIMEZONE });
}

// ─── KST 기준 ISO 문자열 (DB 저장용) ─────────────────────────

/**
 * 현재 KST 시각의 ISO 문자열을 반환합니다 (DB의 created_at, updated_at 저장용).
 * Supabase timestamptz 컬럼에 저장하면 KST 기준의 정확한 시각이 기록됩니다.
 */
export function kstISOString(): string {
  return new Date().toISOString();
  // 참고: toISOString()은 항상 UTC이지만, Supabase timestamptz는 UTC로 저장 후
  // 조회 시 자동 변환하므로 이것이 올바릅니다. 진짜 문제는 "표시"에서 발생합니다.
}

// ─── KST 포맷팅 (표시용) ─────────────────────────────────────

/**
 * Date 또는 ISO 문자열을 KST 기준 날짜 문자열로 포맷합니다.
 * @example formatKSTDate(someDate) → "6월 1일"
 */
export function formatKSTDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", {
    timeZone: KST_TIMEZONE,
    month: "short",
    day: "numeric",
    ...options,
  });
}

/**
 * Date 또는 ISO 문자열을 KST 기준 시간 문자열로 포맷합니다.
 * @example formatKSTTime(someDate) → "오전 08:51"
 */
export function formatKSTTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("ko-KR", {
    timeZone: KST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/**
 * Date 또는 ISO 문자열을 KST 기준 날짜+시간 문자열로 포맷합니다.
 * @example formatKSTDateTime(someDate) → "2026년 6월 1일 오전 08:51"
 */
export function formatKSTDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("ko-KR", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/**
 * Date 또는 ISO 문자열을 KST 기준 짧은 날짜 문자열로 포맷합니다.
 * @example formatKSTShortDate(someDate) → "06. 01."
 */
export function formatKSTShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", {
    timeZone: KST_TIMEZONE,
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Date 또는 ISO 문자열을 KST 기준 전체 날짜 문자열로 포맷합니다 (보고서용).
 * @example formatKSTFullDate(someDate) → "2026년 6월 1일"
 */
export function formatKSTFullDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── KST 기준 N일 전 ────────────────────────────────────────

/**
 * KST 기준 N일 전 자정(00:00:00)의 ISO 문자열을 반환합니다.
 */
export function kstDaysAgoStart(days: number): string {
  const todayMs = new Date(kstTodayStart()).getTime();
  return new Date(todayMs - days * 24 * 60 * 60 * 1000).toISOString();
}
