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

  const paths: string[] = task.attachments || [];
  let attachment_urls: string[] = [];
  if (paths.length > 0) {
    const { data: signed } = await db.storage.from("devroom").createSignedUrls(paths, 60 * 60);
    attachment_urls = (signed || []).map((s) => s.signedUrl).filter(Boolean) as string[];
  }
  return NextResponse.json({ task: { ...task, attachment_urls } });
}
