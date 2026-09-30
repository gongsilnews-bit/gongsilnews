import { NextResponse } from "next/server";
import { agentDb, isAgentRequest } from "@/devroom/agentApi";

export const dynamic = "force-dynamic";

/** 에이전트가 작업 대화창에 메시지를 남긴다 (시작·질문·결과) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAgentRequest(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 8000) : "";
  if (!text) return NextResponse.json({ error: "EMPTY" }, { status: 400 });

  const { error } = await agentDb().from("dev_task_messages").insert({ task_id: Number(id), role: "agent", body: text });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
