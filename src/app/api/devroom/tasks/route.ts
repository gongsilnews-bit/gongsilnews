import { NextResponse } from "next/server";
import { agentDb, isAgentRequest } from "@/devroom/agentApi";

export const dynamic = "force-dynamic";

/**
 * Runner가 처리할 작업 1건을 가져간다. 가져가는 순간 running 으로 바뀐다.
 * 없으면 { task: null }. 스크린샷은 1시간짜리 임시 주소로 같이 내려준다.
 */
export async function GET(request: Request) {
  if (!isAgentRequest(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const db = agentDb();
  const { data, error } = await db.rpc("claim_next_dev_task");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const task = Array.isArray(data) ? data[0] : data;
  if (!task) return NextResponse.json({ task: null });

  // 이번 작업의 실시간 진행 상황을 새로 쌓도록 지난 기록을 비운다
  await db.from("dev_tasks").update({ log: null }).eq("id", task.id);

  // 지금까지의 대화 (재작업 때 사장님 메시지와 첨부 이미지를 지시서에 넣는다)
  const { data: rows } = await db
    .from("dev_task_messages")
    .select("*")
    .eq("task_id", task.id)
    .order("created_at");
  const messages = (rows || []) as { role: string; body: string; created_at: string; attachments?: string[] }[];

  // 작업·대화 첨부 이미지를 1시간짜리 임시 주소로
  const taskPaths: string[] = task.attachments || [];
  const allPaths = [...taskPaths, ...messages.flatMap((m) => m.attachments || [])];
  const urlOf = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await db.storage.from("devroom").createSignedUrls(allPaths, 60 * 60);
    for (const s of signed || []) if (s.path && s.signedUrl) urlOf.set(s.path, s.signedUrl);
  }
  const toUrls = (ps: string[] = []) => ps.map((p) => urlOf.get(p) || "").filter(Boolean);

  return NextResponse.json({
    task: {
      ...task,
      attachment_urls: toUrls(taskPaths),
      messages: messages.map((m) => ({ role: m.role, body: m.body, created_at: m.created_at, attachment_urls: toUrls(m.attachments) })),
    },
  });
}
