// AI 개발실 공통 타입 — 설계: docs/2026-09-30_ai_dev_room_local_agent_meeting.md

export type DevTaskType = "bug" | "feature" | "design" | "urgent";

export type DevTaskStatus =
  | "waiting"    // 접수
  | "running"    // 작업중
  | "review"     // 승인대기
  | "merged"     // 반영완료
  | "rejected"   // 반려
  | "failed";    // 실패

export const TASK_TYPES: { key: DevTaskType; label: string; icon: string }[] = [
  { key: "bug", label: "오류수정", icon: "🐞" },
  { key: "feature", label: "기능추가", icon: "✨" },
  { key: "design", label: "디자인수정", icon: "🎨" },
  { key: "urgent", label: "긴급수정", icon: "🚨" },
];

export const TASK_STATUSES: { key: DevTaskStatus; label: string; color: string; description: string }[] = [
  { key: "waiting", label: "접수", color: "#64748b", description: "등록됨, PC가 가져가기 전" },
  { key: "running", label: "작업중", color: "#2563eb", description: "로컬 에이전트가 수정·빌드 중" },
  { key: "review", label: "승인대기", color: "#d97706", description: "브랜치 push 완료, 미리보기 확인 후 승인" },
  { key: "merged", label: "반영완료", color: "#16a34a", description: "main 병합 → 실서버 배포" },
  { key: "rejected", label: "반려", color: "#dc2626", description: "사유를 반영해 재작업" },
  { key: "failed", label: "실패", color: "#7c3aed", description: "빌드 실패 또는 원인 분석만 가능" },
];
