"use client";

import React, { useState, useRef, useEffect } from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import { sendAgentMessage, loadAgentChats } from "@/app/actions/agentChat";

/* ── 채널(에이전트) 목록 ── */
const CHANNELS = [
  {
    id: "verify",
    name: "회원승인팀",
    emoji: "🛡️",
    status: "running" as const,
    systemPrompt: `너는 '공실뉴스'라는 부동산 플랫폼의 회원가입 승인 담당 에이전트야.
너의 이름은 "회원승인 에이전트"이고, 관리자에게 존댓말(해요체)로 보고해.

[주요 업무]
- 부동산 중개사 회원의 서류(사업자등록증, 중개사무소등록증) 검증 결과를 보고
- 반려 사유 요약 및 분석
- 승인/반려 통계 제공
- 회원 관련 질문에 전문적으로 답변

[행동 규칙]
- 항상 간결하고 핵심적으로 답변해요.
- 데이터가 없는 경우 솔직하게 "아직 데이터가 없습니다"라고 말해요.
- 관리자의 지시에 대해 적극적으로 "네, 알겠습니다!" 자세로 응대해요.`,
  },
  {
    id: "articleReview",
    name: "기사심사팀",
    emoji: "🔍",
    status: "running" as const,
    systemPrompt: `너는 '공실뉴스'라는 부동산 플랫폼의 기사 심사 담당 에이전트야.
너의 이름은 "기사심사 에이전트"이고, 관리자에게 존댓말(해요체)로 보고해.

[주요 업무]
- 등록된 기사의 품질을 검토 (제목·본문 적합성, 문법, 길이)
- 기사에 포함된 홍보성 문구를 탐지 (전화번호, "상담 환영", "수수료 할인" 등)
- 첨부 이미지가 기사 내용과 관련이 있는지 확인
- 허위·과장 표현 검사 ("무조건", "100% 확실" 등)
- 검토 결과를 승인/반려/수정요청으로 판정

[행동 규칙]
- 홍보성 문구가 발견되면 반드시 구체적으로 어떤 문구인지 알려줘요.
- 반려 시 명확한 수정 방향을 제시해요.
- 기사 품질 점수(0~100)를 함께 보고해요.
- 관리자가 기사 내용을 붙여넣으면 즉시 검토를 시작해요.`,
  },
  {
    id: "article",
    name: "기사작성팀",
    emoji: "📰",
    status: "running" as const,
    systemPrompt: `너는 '공실뉴스'라는 부동산 플랫폼의 기사 작성 담당 에이전트야.
너의 이름은 "기사작성 에이전트"이고, 관리자에게 존댓말(해요체)로 대화해.

[주요 업무]
- 부동산 뉴스 기사 초안 작성
- 기사 리라이팅 및 교정
- 부동산 트렌드 분석 및 키워드 추천
- 기사 제목 추천

[행동 규칙]
- 전문적이면서도 읽기 쉬운 문체를 사용해요.
- 기사 작성 시 마지막에 해시태그 3~5개를 달아요.
- 주관적 의견보다 데이터와 사실 기반으로 작성해요.`,
  },
  {
    id: "pressRelease",
    name: "보도자료팀",
    emoji: "🏛️",
    status: "running" as const,
    systemPrompt: `너는 '공실뉴스'라는 부동산 플랫폼의 보도자료 분석 및 기사 작성 전담 에이전트야.
너의 이름은 "보도자료 에이전트"이고, 관리자에게 존댓말(해요체)로 보고해.

[주요 업무]
- 국토교통부, 국세청, 한국부동산원 등 정부기관 보도자료를 분석하여 전문 기사로 변환
- 보도자료 핵심 팩트 3줄 요약 제공
- 상업용 부동산(상가, 오피스) 시장에 미칠 파급 효과 분석
- 보도자료 기반 기사 초안 자동 작성 및 수정저장

[행동 규칙]
- 감정을 배제하고 객관적인 정통 기사체(~다, ~밝혔다, ~전망이다)로 기사를 작성해요.
- 보도자료의 원문 팩트를 절대 왜곡하지 않아요.
- 기사 하단에 상업용 부동산 시장 파급 효과 분석 단락을 반드시 포함해요.
- 출처 URL을 반드시 명시해요.`,
  },
];

/* ── 빠른 명령어 버튼 ── */
const QUICK_COMMANDS: Record<string, { label: string; command: string }[]> = {
  verify: [
    { label: "자기소개", command: "너는 누구야? 어떤 업무를 할 수 있어?" },
    { label: "오늘 업무 보고", command: "오늘 회원 서류 검증 현황을 보고해줘" },
    { label: "반려 기준 설명", command: "회원 서류 반려 기준을 자세히 설명해줘" },
  ],
  articleReview: [
    { label: "자기소개", command: "너는 누구야? 어떤 업무를 할 수 있어?" },
    { label: "심사 기준 설명", command: "기사 심사 기준을 자세히 설명해줘" },
    { label: "홍보성 판별 기준", command: "어떤 문구가 홍보성으로 분류되는지 설명해줘" },
    { label: "오늘 심사 현황", command: "오늘 기사 심사 현황을 보고해줘" },
  ],
  article: [
    { label: "자기소개", command: "너는 누구야? 어떤 업무를 할 수 있어?" },
    { label: "기사 초안 생성", command: "이번 주 서울 아파트 전세 시장 동향에 대한 기사를 써줘" },
    { label: "제목 추천", command: "강남구 오피스텔 공실률 증가 관련 기사 제목 5개를 추천해줘" },
  ],
  pressRelease: [
    { label: "자기소개", command: "너는 누구야? 어떤 업무를 할 수 있어?" },
    { label: "오늘 보도자료 확인", command: "오늘 국토부에서 새로운 보도자료가 나왔는지 확인해줘" },
    { label: "보도자료 분석 요청", command: "아래 보도자료 내용을 분석해서 기사 초안을 작성해줘" },
    { label: "작성 현황 보고", command: "지금까지 작성한 보도자료 기사 현황을 보고해줘" },
  ],
};

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number; costKrw: number };
}

interface Props {
  theme: AdminTheme;
  agentNames: Record<string, string>;
}

export default function AgentChatTab({ theme, agentNames }: Props) {
  const [activeChannel, setActiveChannel] = useState("verify");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages[activeChannel] || [];
  const currentChannel = CHANNELS.find(c => c.id === activeChannel)!;
  const quickCmds = QUICK_COMMANDS[activeChannel] || [];

  // DB에서 대화 기록 불러오기
  useEffect(() => {
    const fetchChats = async () => {
      if (messages[activeChannel]) return; // 이미 로드된 채널은 스킵
      const res = await loadAgentChats(activeChannel);
      if (res.success && res.data.length > 0) {
        const loaded: Message[] = res.data.map((row: any) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          timestamp: new Date(row.created_at),
          usage: row.role === "agent" ? {
            inputTokens: row.input_tokens || 0,
            outputTokens: row.output_tokens || 0,
            totalTokens: row.total_tokens || 0,
            costKrw: Number(row.cost_krw) || 0,
          } : undefined,
        }));
        setMessages(prev => ({ ...prev, [activeChannel]: loaded }));
        const agentCosts = loaded.filter(m => m.usage).reduce((sum, m) => sum + (m.usage?.costKrw || 0), 0);
        if (agentCosts > 0) setTotalCost(prev => prev + agentCosts);
      }
    };
    fetchChats();
  }, [activeChannel]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), userMsg],
    }));
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const result = await sendAgentMessage({
        channelId: activeChannel,
        systemPrompt: currentChannel.systemPrompt,
        userMessage: userInput,
      });

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: result.message || "응답을 생성하지 못했습니다.",
        timestamp: new Date(),
        usage: result.usage,
      };
      setMessages(prev => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), agentMsg],
      }));

      if (result.usage?.costKrw) {
        setTotalCost(prev => prev + result.usage!.costKrw);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: "⚠️ 에이전트 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date(),
      };
      setMessages(prev => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), errorMsg],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex", gap: 0, height: "calc(100vh - 240px)",
      border: `1px solid ${theme.border}`, borderRadius: 14, overflow: "hidden",
      background: theme.cardBg,
    }}>
      {/* ── 좌측: 채널 목록 ── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: theme.darkMode ? "#1a1b1e" : "#f1f3f5",
        borderRight: `1px solid ${theme.border}`,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 16px 12px", fontSize: 13, fontWeight: 800, color: theme.textSecondary, letterSpacing: 0.5 }}>
          에이전트 채널
        </div>
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", border: "none", cursor: "pointer",
              background: activeChannel === ch.id ? (theme.darkMode ? "#2c2d33" : "#fff") : "none",
              color: activeChannel === ch.id ? theme.textPrimary : theme.textSecondary,
              fontWeight: activeChannel === ch.id ? 700 : 500,
              fontSize: 14, fontFamily: "inherit", textAlign: "left",
              borderLeft: activeChannel === ch.id ? "3px solid #2563eb" : "3px solid transparent",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 18 }}>{ch.emoji}</span>
            <span style={{ flex: 1 }}># {agentNames[ch.id] || ch.name}</span>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: ch.status === "running" ? "#22c55e" : "#facc15",
            }} />
          </button>
        ))}

        {/* 비용 요약 */}
        {totalCost > 0 && (
          <div style={{
            margin: "auto 12px 12px", padding: "10px 12px",
            background: theme.darkMode ? "#2c2d33" : "#fff",
            borderRadius: 8, border: `1px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>💸 이번 세션 비용</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>₩{totalCost.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* ── 우측: 대화창 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 채널 헤더 */}
        <div style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>{currentChannel.emoji}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>
            # {agentNames[activeChannel]}
          </span>
          <span style={{
            padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
            background: currentChannel.status === "running" ? "#dcfce7" : "#fef9c3",
            color: currentChannel.status === "running" ? "#16a34a" : "#ca8a04",
          }}>
            {currentChannel.status === "running" ? "가동 중" : "대기 중"}
          </span>
        </div>

        {/* 빠른 명령어 */}
        <div style={{
          padding: "10px 20px",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex", gap: 8, flexWrap: "wrap",
          background: theme.darkMode ? "#1e1f24" : "#fafbfc",
        }}>
          <span style={{ fontSize: 12, color: theme.textSecondary, display: "flex", alignItems: "center", marginRight: 4 }}>⚡ 빠른 명령:</span>
          {quickCmds.map((cmd, i) => (
            <button key={i} onClick={() => { setInput(cmd.command); }} style={{
              padding: "5px 12px", fontSize: 12, fontWeight: 600,
              background: theme.darkMode ? "#2c2d33" : "#e8f0fe",
              color: "#2563eb", border: "none", borderRadius: 16,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {cmd.label}
            </button>
          ))}
        </div>

        {/* 메시지 영역 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {channelMessages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: theme.textSecondary }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{currentChannel.emoji}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                {agentNames[activeChannel]}에 오신 것을 환영합니다!
              </div>
              <div style={{ fontSize: 13 }}>상단의 빠른 명령 버튼을 누르거나, 아래 입력창에 직접 지시를 내려보세요.</div>
            </div>
          ) : (
            channelMessages.map((msg) => (
              <div key={msg.id} style={{
                display: "flex", gap: 10, marginBottom: 16,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: msg.role === "user" ? "#3b82f6" : (theme.darkMode ? "#2c2d33" : "#f1f3f5"),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: msg.role === "user" ? 14 : 18,
                  color: msg.role === "user" ? "#fff" : theme.textPrimary,
                  fontWeight: 700,
                }}>
                  {msg.role === "user" ? "나" : currentChannel.emoji}
                </div>
                <div style={{ maxWidth: "70%" }}>
                  <div style={{
                    padding: "10px 16px", borderRadius: 12,
                    background: msg.role === "user" ? "#2563eb" : (theme.darkMode ? "#2c2d33" : "#f1f3f5"),
                    color: msg.role === "user" ? "#fff" : theme.textPrimary,
                    fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: theme.textSecondary }}>
                      {msg.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.usage && msg.usage.totalTokens > 0 && (
                      <span style={{ fontSize: 10, color: "#f59e0b", background: "#fef9c3", padding: "1px 6px", borderRadius: 8 }}>
                        {msg.usage.totalTokens}토큰 · ₩{msg.usage.costKrw.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: theme.darkMode ? "#2c2d33" : "#f1f3f5",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>
                {currentChannel.emoji}
              </div>
              <div style={{
                padding: "14px 20px", borderRadius: 12,
                background: theme.darkMode ? "#2c2d33" : "#f1f3f5",
                color: theme.textSecondary, fontSize: 14,
              }}>
                <span style={{ animation: "pulse 1.5s infinite" }}>💭 생각하고 있어요...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div style={{
          padding: "12px 20px",
          borderTop: `1px solid ${theme.border}`,
          display: "flex", gap: 10,
          background: theme.cardBg,
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`${agentNames[activeChannel]}에게 업무를 지시하세요...`}
            disabled={isLoading}
            style={{
              flex: 1, height: 44, padding: "0 16px",
              border: `1px solid ${theme.border}`, borderRadius: 10,
              fontSize: 14, color: theme.textPrimary,
              background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
              outline: "none", fontFamily: "inherit",
              opacity: isLoading ? 0.6 : 1,
            }}
          />
          <button onClick={handleSend} disabled={isLoading} style={{
            padding: "0 20px", height: 44, borderRadius: 10,
            background: isLoading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none",
            fontSize: 14, fontWeight: 700, cursor: isLoading ? "wait" : "pointer",
            fontFamily: "inherit",
          }}>
            {isLoading ? "⏳" : "전송"}
          </button>
        </div>
      </div>
    </div>
  );
}
