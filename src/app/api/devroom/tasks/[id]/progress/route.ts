import { NextResponse } from "next/server";
import { agentDb, isAgentRequest } from "@/devroom/agentApi";

export const dynamic = "force-dynamic";

const MAX_LOG = 20000;

/**
 * Runner가 작업 도중 진행 상황을 보낸다 ("파일 보는 중", "빌드 중" ...).
 * 작업중(running)인 동안 log 에 줄을 이어 붙이고, 게시판이 실시간으로 보여 준다.
 * 끝나면 결과 보고가 log 를 최종 기록으로 덮어쓴다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAgentRequest(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const lines: string[] = Array.isArray(body?.lines) ? body.lines.filter((l: unknown) => typeof l === "string") : [];
  if (lines.length === 0) return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });

  const db = agentDb();
  const { data: row } = await db.from("dev_tasks").select("log, status").eq("id", id).single();
  if (!row || row.status !== "running") return NextResponse.json({ error: "NOT_RUNNING" }, { status: 409 });

  let log = (row.log ? row.log + "\n" : "") + lines.join("\n");
  if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);
  const { error } = await db.from("dev_tasks").update({ log }).eq("id", id).eq("status", "running");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
