import { NextResponse } from "next/server";
import { agentDb, isAgentRequest } from "@/devroom/agentApi";

export const dynamic = "force-dynamic";

/** Runner가 병합할 작업 목록: 사장님이 [승인]한(approved) 작업 */
export async function GET(request: Request) {
  if (!isAgentRequest(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { data, error } = await agentDb()
    .from("dev_tasks")
    .select("id, task_no, title, branch, pr_url")
    .eq("status", "approved")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data || [] });
}
