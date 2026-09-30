// AI 개발실 공통 타입 — 설계: docs/2026-09-30_ai_dev_room_local_agent_meeting.md

export type DevTaskType = "bug" | "feature" | "design" | "urgent";

export type DevTaskStatus =
  | "waiting"    // 접수
  | "running"    // 작업중
  | "review"     // 승인대기
  | "approved"   // 승인됨 (PC 에이전트가 병합 중)
  | "merged"     // 반영완료
  | "rejected"   // 반려
  | "failed";    // 실패

export interface DevTask {
  id: number;
  task_no: string;
  type: DevTaskType;
  title: string;
  description: string;
  page_url: string | null;
  repro_steps: string | null;
  attachments: string[];
  status: DevTaskStatus;
  attempt: number;
  branch: string | null;
  commit_sha: string | null;
  pr_url: string | null;
  preview_url: string | null;
  result_summary: string | null;
  changed_files: string[];
  log: string | null;
  reject_reason: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  /** 화면 표시용 스크린샷 임시 주소 (서버가 붙여 준다) */
  attachment_urls?: string[];
  /** 사장님 ↔ 에이전트 대화 */
  messages?: DevTaskMessage[];
}

export interface DevTaskMessage {
  id: number;
  task_id: number;
  role: "admin" | "agent";
  body: string;
  attachments?: string[];
  created_at: string;
  /** 화면 표시용 이미지 임시 주소 (서버가 붙여 준다) */
  attachment_urls?: string[];
}

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
  { key: "approved", label: "승인됨", color: "#0d9488", description: "승인 완료, PC 에이전트가 main 에 병합하는 중" },
  { key: "merged", label: "반영완료", color: "#16a34a", description: "main 병합 → 실서버 배포" },
  { key: "rejected", label: "반려", color: "#dc2626", description: "사유를 반영해 재작업" },
  { key: "failed", label: "확인필요", color: "#7c3aed", description: "에이전트가 질문했거나 끝내지 못함 — 대화창을 확인해 주세요" },
];
