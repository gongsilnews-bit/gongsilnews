"use server";

import { getGenAIClient } from "@/lib/agents/core";
import { ArticleReviewAgent } from "@/lib/agents/ArticleReviewAgent";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * 에이전트 채팅 메시지를 Gemini에 전송하고 응답을 DB에 저장합니다.
 */
export async function sendAgentMessage(params: {
  channelId: string;
  systemPrompt: string;
  userMessage: string;
}) {
  const supabase = getAdminClient();

  try {
    // 1. 사용자 메시지 DB 저장
    await supabase.from("agent_chats").insert({
      channel_id: params.channelId,
      role: "user",
      content: params.userMessage,
    });

    // 2. Gemini 호출
    const genAI = await getGenAIClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const fullPrompt = `${params.systemPrompt}\n\n[사용자 지시]\n${params.userMessage}`;
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // 3. 토큰 사용량 추출
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || 0;
    const outputTokens = usage?.candidatesTokenCount || 0;
    const costUsd = (inputTokens * 0.00000015) + (outputTokens * 0.0000006);
    const costKrw = Math.round(costUsd * 1350 * 100) / 100;

    // 4. 에이전트 응답 DB 저장
    await supabase.from("agent_chats").insert({
      channel_id: params.channelId,
      role: "agent",
      content: text,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      cost_krw: costKrw,
    });

    return {
      success: true,
      message: text,
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, costKrw },
    };
  } catch (error: any) {
    console.error("Agent Chat Error:", error);
    return {
      success: false,
      message: "에이전트 응답 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costKrw: 0 },
    };
  }
}

/**
 * 채널별 대화 기록을 불러옵니다.
 */
export async function loadAgentChats(channelId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("agent_chats")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Load chats error:", error);
    return { success: false, data: [] };
  }
  return { success: true, data: data || [] };
}

/**
 * 에이전트별 API 비용 및 통계를 조회합니다.
 */
export async function getAgentCostSummary() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("agent_chats")
    .select("channel_id, cost_krw, total_tokens, role")
    .eq("role", "agent");

  if (error || !data) return { totalCost: 0, totalTokens: 0, perAgent: {} };

  const perAgent: Record<string, { totalTokens: number; costKrw: number; messageCount: number }> = {};

  for (const row of data) {
    if (!perAgent[row.channel_id]) {
      perAgent[row.channel_id] = { totalTokens: 0, costKrw: 0, messageCount: 0 };
    }
    perAgent[row.channel_id].totalTokens += (row.total_tokens || 0);
    perAgent[row.channel_id].costKrw += (Number(row.cost_krw) || 0);
    perAgent[row.channel_id].messageCount += 1;
  }

  const totalCost = Object.values(perAgent).reduce((s, a) => s + a.costKrw, 0);
  const totalTokens = Object.values(perAgent).reduce((s, a) => s + a.totalTokens, 0);

  return { totalCost: Math.round(totalCost * 100) / 100, totalTokens, perAgent };
}

/**
 * 에이전트별 실제 업무 처리 현황을 조회합니다.
 * (기존 members, articles 테이블에서 읽기 전용으로 통계만 가져옴)
 */
export async function getAgentWorkStats() {
  const supabase = getAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // ── 회원승인 에이전트 업무 현황 ──
  const [approved, rejected, pending, supplement] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "REJECTED"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "SUPPLEMENT"),
  ]);

  // 오늘 처리 건수
  const [todayApproved, todayRejected] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "APPROVED").gte("updated_at", todayISO),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "REJECTED").gte("updated_at", todayISO),
  ]);

  // ── 기사작성 에이전트 업무 현황 ──
  const [articleApproved, articlePending, articleDraft, articleRejected] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "APPROVED").eq("is_deleted", false),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "PENDING").eq("is_deleted", false),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "DRAFT").eq("is_deleted", false),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "REJECTED").eq("is_deleted", false),
  ]);

  return {
    verify: {
      approved: approved.count || 0,
      rejected: rejected.count || 0,
      pending: pending.count || 0,
      supplement: supplement.count || 0,
      todayApproved: todayApproved.count || 0,
      todayRejected: todayRejected.count || 0,
    },
    article: {
      approved: articleApproved.count || 0,
      pending: articlePending.count || 0,
      draft: articleDraft.count || 0,
      rejected: articleRejected.count || 0,
    },
  };
}

/**
 * 기사를 AI 에이전트로 심사합니다.
 */
export async function reviewArticleByAI(params: {
  articleId: string;
  title: string;
  subtitle?: string;
  content: string;
  section1?: string;
  section2?: string;
  authorName?: string;
}) {
  try {
    const result = await ArticleReviewAgent.reviewArticle({
      title: params.title,
      subtitle: params.subtitle,
      content: params.content,
      section1: params.section1,
      section2: params.section2,
      authorName: params.authorName,
    });

    // AI 심사 결과를 agent_chats에 로그로 저장
    const supabase = getAdminClient();
    
    const inTokens = result.usage?.inputTokens || 0;
    const outTokens = result.usage?.outputTokens || 0;
    const totalTokens = result.usage?.totalTokens || 0;
    // Gemini 1.5/2.5 Flash 예상 비용: Input $0.075 / 1M, Output $0.30 / 1M (환율 1400원)
    const costKrw = (inTokens * 0.075 / 1000000 * 1400) + (outTokens * 0.3 / 1000000 * 1400);

    await supabase.from("agent_chats").insert({
      channel_id: "articleReview",
      role: "agent",
      content: `[기사 심사] "${params.title}" → ${result.status} (${result.score}점)\n${result.reason}`,
      input_tokens: inTokens,
      output_tokens: outTokens,
      total_tokens: totalTokens,
      cost_krw: costKrw,
    });

    return {
      status: result.status,
      score: result.score,
      reason: result.reason,
      details: result.details,
    };
  } catch (error: any) {
    console.error("Article Review Error:", error);
    return {
      status: "REVISION_NEEDED" as const,
      score: 0,
      reason: "AI 심사 중 오류가 발생했습니다: " + (error.message || ""),
      details: null,
    };
  }
}

/**
 * 에이전트별 일간 업무 보고서를 생성합니다.
 */
export async function generateDailyReport() {
  const supabase = getAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const dateStr = today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  // ── 오늘 회원 관련 데이터 수집 ──
  const [totalMembers, todayApproved, todayRejected, todayPending, todaySupplement, totalApproved, totalRejected] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "APPROVED").gte("updated_at", todayISO),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "REJECTED").gte("updated_at", todayISO),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "SUPPLEMENT"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "REJECTED"),
  ]);

  // ── 오늘 기사 관련 데이터 수집 ──
  const [totalArticles, todayArticleApproved, todayArticleRejected, articlePending, articleDraft] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "APPROVED").eq("is_deleted", false).gte("updated_at", todayISO),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "REJECTED").eq("is_deleted", false).gte("updated_at", todayISO),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "PENDING").eq("is_deleted", false),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "DRAFT").eq("is_deleted", false),
  ]);

  // ── API 비용 데이터 ──
  const { data: costData } = await supabase
    .from("agent_chats")
    .select("channel_id, cost_krw, total_tokens")
    .eq("role", "agent")
    .gte("created_at", todayISO);

  const todayCostByAgent: Record<string, { cost: number; tokens: number; count: number }> = {};
  for (const row of (costData || [])) {
    if (!todayCostByAgent[row.channel_id]) todayCostByAgent[row.channel_id] = { cost: 0, tokens: 0, count: 0 };
    todayCostByAgent[row.channel_id].cost += Number(row.cost_krw) || 0;
    todayCostByAgent[row.channel_id].tokens += row.total_tokens || 0;
    todayCostByAgent[row.channel_id].count += 1;
  }

  // ── Gemini에게 보고서 작성 요청 ──
  const genAI = await getGenAIClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const reportPrompt = `
너는 공실뉴스 AI 비서실의 총괄 비서야. 아래 데이터를 바탕으로 ${dateStr} 일간 업무 보고서를 작성해.
존댓말(해요체)로, 간결하면서도 핵심을 짚는 보고서를 작성해줘.

[회원 승인 현황]
- 전체 회원 수: ${totalMembers.count || 0}명
- 오늘 승인: ${todayApproved.count || 0}건
- 오늘 반려: ${todayRejected.count || 0}건
- 현재 승인 대기: ${todayPending.count || 0}건
- 현재 서류 보완: ${todaySupplement.count || 0}건
- 누적 승인: ${totalApproved.count || 0}건
- 누적 반려: ${totalRejected.count || 0}건

[기사 관리 현황]
- 전체 기사 수: ${totalArticles.count || 0}건
- 오늘 승인(게시): ${todayArticleApproved.count || 0}건
- 오늘 반려: ${todayArticleRejected.count || 0}건
- 현재 승인 대기: ${articlePending.count || 0}건
- 현재 작성 중: ${articleDraft.count || 0}건

[AI API 사용량 (오늘)]
${Object.entries(todayCostByAgent).map(([k, v]) => `- ${k}: ${v.count}건 대화, ${v.tokens}토큰, ₩${v.cost.toFixed(1)}`).join("\n") || "- 오늘 사용 내역 없음"}

[보고서 형식]
📊 {날짜} AI 비서실 일간보고

1. 🛡️ 승인과장 보고
   - 오늘 처리 현황 요약
   - 특이사항 (대기 건이 많으면 경고)

2. 🔍 심사과장 보고
   - 오늘 기사 심사 현황 요약
   - 특이사항

3. 💸 비용 현황
   - 오늘 API 사용량 요약

4. 📌 총괄 코멘트
   - 전반적인 운영 상태 평가 (1~2문장)
`;

  const result = await model.generateContent(reportPrompt);
  const reportText = result.response.text();

  // 보고서를 DB에 저장
  await supabase.from("agent_chats").insert({
    channel_id: "daily_report",
    role: "agent",
    content: reportText,
  });

  return { success: true, report: reportText, date: dateStr };
}

/**
 * 저장된 일간보고서 목록을 불러옵니다.
 */
export async function loadDailyReports(limit: number = 10) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("agent_chats")
    .select("id, content, created_at")
    .eq("channel_id", "daily_report")
    .eq("role", "agent")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { success: false, data: [] };
  return { success: true, data: data || [] };
}

/**
 * 에이전트 모드 설정 타입
 */
export interface AgentModeConfig {
  [agentId: string]: {
    mode: "manual" | "auto" | "scheduled";  // 수동 / 자동 / 시간대별
    scheduleStart?: number;  // 자동 시작 시간 (0~23)
    scheduleEnd?: number;    // 자동 종료 시간 (0~23)
  };
}

/**
 * 에이전트 모드 설정을 저장합니다.
 */
export async function saveAgentModeConfig(config: AgentModeConfig) {
  const supabase = getAdminClient();

  // 기존 설정 삭제 후 새로 저장
  await supabase
    .from("agent_chats")
    .delete()
    .eq("channel_id", "agent_config")
    .eq("role", "system");

  await supabase.from("agent_chats").insert({
    channel_id: "agent_config",
    role: "system",
    content: JSON.stringify(config),
  });

  return { success: true };
}

/**
 * 에이전트 모드 설정을 불러옵니다.
 */
export async function loadAgentModeConfig(): Promise<AgentModeConfig> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("agent_chats")
    .select("content")
    .eq("channel_id", "agent_config")
    .eq("role", "system")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data?.content) {
    try {
      return JSON.parse(data.content);
    } catch { /* ignore */ }
  }

  // 기본값: 승인과장 자동, 심사과장 자동, 기사작성 수동
  return {
    verify: { mode: "auto" },
    articleReview: { mode: "auto" },
    article: { mode: "manual" },
  };
}

/**
 * 특정 에이전트가 현재 시점에서 자동 모드인지 확인합니다.
 */
export async function isAgentAutoMode(agentId: string): Promise<boolean> {
  const config = await loadAgentModeConfig();
  const agentConfig = config[agentId];

  if (!agentConfig) return false;

  if (agentConfig.mode === "auto") return true;
  if (agentConfig.mode === "manual") return false;

  // scheduled 모드: 현재 시간이 설정 범위 안에 있는지 확인
  if (agentConfig.mode === "scheduled") {
    const now = new Date();
    const currentHour = now.getHours();
    const start = agentConfig.scheduleStart ?? 0;
    const end = agentConfig.scheduleEnd ?? 23;

    if (start <= end) {
      // 같은 날: 09~18 → 9시~18시
      return currentHour >= start && currentHour <= end;
    } else {
      // 자정 걸침: 22~06 → 22시~다음날 6시
      return currentHour >= start || currentHour <= end;
    }
  }

  return false;
}
