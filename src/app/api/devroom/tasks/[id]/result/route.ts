import { NextResponse } from "next/server";
import { agentDb, isAgentRequest } from "@/devroom/agentApi";

export const dynamic = "force-dynamic";

const MAX_LOG = 20000;

/**
 * Runner가 처리 결과를 보고한다.
 * - status 가 review/failed 면 작업중(running) 작업만 승인대기 또는 실패로 바꾼다.
 * - status 가 merged/merge_failed 면 승인됨(approved) 작업의 PR 병합 결과를 기록한다.
 * - status 없이 preview_url 만 보내면 미리보기 주소만 채운다 (Vercel 배포가 늦게 끝나는 경우).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAgentRequest(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const db = agentDb();

  if (!body.status) {
    const preview = str(body.preview_url);
    if (!preview) return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });
    const { error } = await db.from("dev_tasks").update({ preview_url: preview }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // 질문에만 답하고 끝난 작업: 작업중(running) → 원래 상태로 되돌림 (다른 기록은 그대로)
  if (body.status === "restore") {
    const to = body.restore_to;
    // approved: 사장님이 대화로 "올려 줘/승인"이라고 한 경우 (Runner 가 PR 이 열려 있는지 확인한 뒤에만 보낸다)
    if (!["review", "failed", "merged", "approved"].includes(to)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    const { data, error } = await db
      .from("dev_tasks")
      .update({ status: to, finished_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "running")
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ error: "NOT_RUNNING" }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  // 병합 결과: 승인됨(approved) → 반영완료(merged) 또는 병합 실패 시 승인대기(review)로 되돌림
  if (body.status === "merged" || body.status === "merge_failed") {
    const merged = body.status === "merged";
    const { data, error } = await db
      .from("dev_tasks")
      .update(merged
        ? { status: "merged", finished_at: new Date().toISOString() }
        : { status: "review", log: str(body.log) })
      .eq("id", id)
      .eq("status", "approved")
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ error: "NOT_APPROVED" }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (body.status !== "review" && body.status !== "failed") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }
  // 보낸 칸만 바꾼다 (중간에 멈춘 작업을 정리할 때 PR·미리보기 주소가 지워지지 않도록)
  const update: Record<string, unknown> = { status: body.status, finished_at: new Date().toISOString() };
  for (const key of ["branch", "commit_sha", "pr_url", "preview_url", "result_summary"]) {
    if (key in body) update[key] = str(body[key]);
  }
  if ("changed_files" in body) {
    update.changed_files = Array.isArray(body.changed_files) ? body.changed_files.filter((f: unknown) => typeof f === "string") : [];
  }
  if ("log" in body) {
    const log = str(body.log);
    update.log = log && log.length > MAX_LOG ? "…(앞부분 생략)\n" + log.slice(-MAX_LOG) : log;
  }
  const { data, error } = await db
    .from("dev_tasks")
    .update(update)
    .eq("id", id)
    .eq("status", "running")
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "NOT_RUNNING" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
