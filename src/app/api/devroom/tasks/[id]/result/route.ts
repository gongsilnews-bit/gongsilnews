import { NextResponse } from "next/server";
import { agentDb, isAgentRequest } from "@/devroom/agentApi";

export const dynamic = "force-dynamic";

const MAX_LOG = 20000;

/**
 * Runner가 처리 결과를 보고한다.
 * - status 가 있으면 작업중(running) 작업만 review(승인대기) 또는 failed(실패)로 바꾼다.
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

  if (body.status !== "review" && body.status !== "failed") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }
  const log = str(body.log);
  const { data, error } = await db
    .from("dev_tasks")
    .update({
      status: body.status,
      branch: str(body.branch),
      commit_sha: str(body.commit_sha),
      pr_url: str(body.pr_url),
      preview_url: str(body.preview_url),
      result_summary: str(body.result_summary),
      changed_files: Array.isArray(body.changed_files) ? body.changed_files.filter((f: unknown) => typeof f === "string") : [],
      log: log && log.length > MAX_LOG ? "…(앞부분 생략)\n" + log.slice(-MAX_LOG) : log,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "running")
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "NOT_RUNNING" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
