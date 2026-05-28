"use server";

import { generateWithGemini } from "@/lib/agents/core";
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

    // --- 수동 보도자료 기사 생성 연동 (pressRelease 채널) ---
    if (params.channelId === "pressRelease" && params.userMessage.length > 50) {
      const { PressReleaseAgent } = await import("@/lib/agents/PressReleaseAgent");
      
      // 혹시 URL이 포함되어 있으면 출처로 사용하기 위해 추출
      const urlMatch = params.userMessage.match(/https?:\/\/[^\s]+/);
      const sourceUrl = urlMatch ? urlMatch[0] : "수동 입력 (AI 비서실)";

      const aiResult = await PressReleaseAgent.writeArticle({
        pressReleaseText: params.userMessage,
        sourceUrl: sourceUrl
      });

      // 출처 추가
      let finalContent = aiResult.content;
      finalContent += `\n<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">📎 출처: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceUrl}</a></p>`;

      // 어드민 정보
      const { data: admin } = await supabase.from('members').select('id, name, email').eq('email', 'gongsilnews@gmail.com').single();

      // DB 저장
      const { data: article } = await supabase
        .from('articles')
        .insert({
          title: aiResult.title,
          subtitle: aiResult.subtitle,
          content: finalContent,
          section1: "부동산·경제",
          section2: aiResult.section2 || "부동산 정책/동향",
          status: 'DRAFT',
          author_id: admin?.id || null,
          author_name: admin?.name || '공실뉴스 AI 비서',
          author_email: admin?.email || 'gongsilnews@gmail.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select('id').single();

      const text = `✅ **기사 초안이 성공적으로 작성되었습니다!**\n\n📌 **제목:** ${aiResult.title}\n📂 **카테고리:** 부동산·경제 > ${aiResult.section2 || '부동산 정책/동향'}\n\n[기사관리 > 작성중] 탭에서 확인 및 승인해주세요.`;
      
      const tokens = aiResult.usage?.totalTokens || 0;
      const costKrw = Math.round((tokens * 0.00000045) * 1350 * 100) / 100; // 대략적인 계산

      await supabase.from("agent_chats").insert({
        channel_id: params.channelId,
        role: "agent",
        content: text,
        input_tokens: aiResult.usage?.inputTokens || 0,
        output_tokens: aiResult.usage?.outputTokens || 0,
        total_tokens: tokens,
        cost_krw: costKrw,
      });

      // 캐시 갱신
      require("next/cache").revalidateTag("articles");

      return {
        success: true,
        message: text,
        usage: { inputTokens: aiResult.usage?.inputTokens || 0, outputTokens: aiResult.usage?.outputTokens || 0, totalTokens: tokens, costKrw },
      };
    }
    
    // --- 수동 기사 작성 에이전트 연동 (article 채널) ---
    if (params.channelId === "article" && params.userMessage.length > 10) {
      const { NewsArticleAgent } = await import("@/lib/agents/NewsArticleAgent");

      // AI에게 지시받은 내용을 기반으로 기사를 작성하도록 요청
      const aiResult = await NewsArticleAgent.writeArticle({
        sourceText: params.userMessage, // 키워드나 지시사항을 소스로 전달
        category: "부동산·경제" // 기본값, 실제로는 AI가 판별하게 고도화 가능
      });

      const { data: admin } = await supabase.from('members').select('id, name, email').eq('email', 'gongsilnews@gmail.com').single();

      // 출처 URL 본문 하단에 추가
      let finalContent = aiResult.content;
      if (aiResult.sourceUrl && aiResult.sourceUrl.startsWith('http')) {
        finalContent += `\n<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">📎 원문 참고: <a href="${aiResult.sourceUrl}" target="_blank" rel="noopener noreferrer">${aiResult.sourceUrl}</a></p>`;
      }

      // DB 저장
      const { data: article } = await supabase
        .from('articles')
        .insert({
          title: aiResult.title,
          subtitle: aiResult.subtitle,
          content: finalContent,
          section1: "부동산·경제",
          section2: "부동산 정책/동향",
          status: 'DRAFT',
          author_id: admin?.id || null,
          author_name: admin?.name || '공실뉴스 AI 비서',
          author_email: admin?.email || 'gongsilnews@gmail.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select('id').single();

      // 키워드를 별도 테이블에 저장
      if (article?.id && aiResult.keywords) {
        const keywordList = aiResult.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
        if (keywordList.length > 0) {
          const keywordRows = keywordList.map((kw: string) => ({
            article_id: article.id,
            keyword: kw,
          }));
          await supabase.from("article_keywords").insert(keywordRows);
        }
      }

      const text = `✅ **기사 초안이 성공적으로 작성되었습니다!**\n\n📌 **제목:** ${aiResult.title}\n\n[기사관리 > 작성중] 탭에서 확인 및 승인해주세요.`;
      
      const tokens = aiResult.usage?.totalTokens || 0;
      const costKrw = Math.round((tokens * 0.00000045) * 1350 * 100) / 100;

      await supabase.from("agent_chats").insert({
        channel_id: params.channelId,
        role: "agent",
        content: text,
        input_tokens: aiResult.usage?.inputTokens || 0,
        output_tokens: aiResult.usage?.outputTokens || 0,
        total_tokens: tokens,
        cost_krw: costKrw,
      });

      // 캐시 갱신
      require("next/cache").revalidateTag("articles");

      return {
        success: true,
        message: text,
        usage: { inputTokens: aiResult.usage?.inputTokens || 0, outputTokens: aiResult.usage?.outputTokens || 0, totalTokens: tokens, costKrw },
      };
    }
    // ----------------------------------------------------

    // 2. 일반 Gemini 채팅 호출
    const fullPrompt = `${params.systemPrompt}\n\n[사용자 지시]\n${params.userMessage}`;
    const result = await generateWithGemini(fullPrompt, { temperature: 0.7 });
    const text = result.text;

    // 3. 토큰 사용량 추출
    const inputTokens = result.usage?.inputTokens || 0;
    const outputTokens = result.usage?.outputTokens || 0;
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
export async function getAgentCostSummary(startDate?: string, endDate?: string) {
  const supabase = getAdminClient();
  let query = supabase
    .from("agent_chats")
    .select("channel_id, cost_krw, total_tokens, role")
    .eq("role", "agent");

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data, error } = await query;

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
export async function getAgentWorkStats(startDate?: string, endDate?: string) {
  const supabase = getAdminClient();

  const getCount = async (table: string, filters: Record<string, any>) => {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    for (const [k, v] of Object.entries(filters)) {
      query = query.eq(k, v);
    }
    if (startDate) query = query.gte("updated_at", startDate);
    if (endDate) query = query.lte("updated_at", endDate);
    const { count } = await query;
    return count || 0;
  };

  const [
    approved, rejected, pending, supplement,
    articleApproved, articlePending, articleDraft, articleRejected
  ] = await Promise.all([
    getCount("members", { status: "APPROVED" }),
    getCount("members", { status: "REJECTED" }),
    getCount("members", { status: "PENDING" }),
    getCount("members", { status: "SUPPLEMENT" }),
    getCount("articles", { status: "APPROVED", is_deleted: false }),
    getCount("articles", { status: "PENDING", is_deleted: false }),
    getCount("articles", { status: "DRAFT", is_deleted: false }),
    getCount("articles", { status: "REJECTED", is_deleted: false }),
  ]);

  return {
    verify: { approved, rejected, pending, supplement },
    article: { approved: articleApproved, pending: articlePending, draft: articleDraft, rejected: articleRejected },
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

  // ── 오늘 온비드 관련 데이터 수집 ──
  const [totalOnbid, todayOnbidCount] = await Promise.all([
    supabase.from("vacancies").select("id", { count: "exact", head: true }).eq("trade_type", "경매").neq("status", "DELETED"),
    supabase.from("vacancies").select("id", { count: "exact", head: true }).eq("trade_type", "경매").neq("status", "DELETED").gte("created_at", todayISO),
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

[온비드 경공매 수집 현황]
- 전체 수집 매물: ${totalOnbid.count || 0}건
- 오늘 신규 등록: ${todayOnbidCount.count || 0}건

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

3. 🤖 온비드 동기화 에이전트 보고
   - 오늘 온비드 경공매 매물 수집 현황 및 만료 매물 자동 정리 사항 브리핑

4. 💸 비용 현황
   - 오늘 API 사용량 요약

5. 📌 총괄 코멘트
   - 전반적인 운영 상태 평가 (1~2문장)
`;

  const reportResult = await generateWithGemini(reportPrompt, { temperature: 0.5 });
  const reportText = reportResult.text;

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

// ── 기사작성 스케줄러(Cron) DB 설정 함수 ──
export interface ArticleCronConfig {
  isActive: boolean;
  hours: number[];
  categories: string[];
}

export async function loadArticleCronConfig(): Promise<ArticleCronConfig> {
  const supabase = getAdminClient();
  const { data } = await supabase.from('agent_settings').select('settings').eq('id', 'article_cron').single();
  if (data?.settings) {
    return data.settings as ArticleCronConfig;
  }
  return {
    isActive: true,
    hours: [8, 14, 23],
    categories: [
      "부동산 정책/동향", "법률/세무 지식", "경제/재테크/주식",
      "AI/NEWS", "부동산유튜브/블로그", "맛집/여행/건강", "IT/가전/가구", "스포츠/연예/Car"
    ]
  };
}

export async function saveArticleCronConfig(config: ArticleCronConfig) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('agent_settings')
    .upsert({ id: 'article_cron', settings: config, updated_at: new Date().toISOString() });
  
  if (error) {
    console.error("saveArticleCronConfig error:", error);
    return false;
  }
  return true;
}

export async function getOnbidCount() {
  const supabase = getAdminClient();
  const { count } = await supabase.from("vacancies").select("id", { count: "exact", head: true }).eq("trade_type", "경매").neq("status", "DELETED");
  return count || 0;
}

export async function getOnbidHistoryStats() {
  const supabase = getAdminClient();

  // KST(UTC+9) 기준으로 오늘/어제를 계산 (Vercel UTC 서버와 로컬 KST 서버 모두 동일 결과)
  const nowUtc = Date.now();
  const KST_OFFSET = 9 * 60 * 60 * 1000;

  // KST 기준 오늘 00:00:00 → UTC timestamp
  const kstNow = new Date(nowUtc + KST_OFFSET);
  const kstTodayStr = `${kstNow.getUTCFullYear()}-${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}-${String(kstNow.getUTCDate()).padStart(2, '0')}`;
  const today = new Date(`${kstTodayStr}T00:00:00+09:00`);

  const yesterdayStart = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = new Date(today.getTime() - 1);

  // 1. 최근 7일 로그 가져오기
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: logs } = await supabase
    .from("agent_chats")
    .select("content, created_at")
    .eq("channel_id", "onbid_sync_log")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  let todayRegistered = 0;
  let todayExpired = 0;
  let yesterdayRegistered = 0;
  let yesterdayExpired = 0;
  
  const historyList: any[] = [];

  if (logs) {
    for (const log of logs) {
      try {
        const parsed = JSON.parse(log.content);
        const logDate = new Date(log.created_at);
        
        // v2 호환: inserted || registered, deleted || expired
        const registered = parsed.inserted || parsed.registered || 0;
        const expired = parsed.deleted || parsed.expired || 0;

        // 오늘 분산 집계
        if (logDate >= today) {
          todayRegistered += registered;
          todayExpired += expired;
        } 
        // 어제 분산 집계
        else if (logDate >= yesterdayStart && logDate <= yesterdayEnd) {
          yesterdayRegistered += registered;
          yesterdayExpired += expired;
        }

        historyList.push({
          date: logDate.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
          time: logDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          target: parsed.target || "전국",
          registered,
          updated: parsed.updated || 0,
          skipped: parsed.skipped || 0,
          expired,
          isManual: parsed.isManual || false,
          rawDate: log.created_at
        });
      } catch {}
    }
  }

  return {
    success: true,
    todayRegistered,
    todayExpired,
    yesterdayRegistered,
    yesterdayExpired,
    historyList
  };
}
