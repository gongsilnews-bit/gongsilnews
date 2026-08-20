"use client";

import React, { useState, useEffect } from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import { 
  loadAgentModeConfig, 
  saveAgentModeConfig, 
  AgentModeConfig, 
  ArticleCronConfig, 
  loadArticleCronConfig, 
  saveArticleCronConfig,
  loadAgentPromptsConfig,
  saveAgentPromptsConfig
} from "@/app/actions/agentChat";

/* ── 에이전트별 기본 프롬프트 ── */
const DEFAULT_PROMPTS: Record<string, { name: string; emoji: string; systemPrompt: string; examples: string }> = {
  verify: {
    name: "회원승인 에이전트",
    emoji: "🛡️",
    systemPrompt: `너는 공실뉴스의 엄격한 서류 심사관이야.
첨부된 사업자등록증/중개사무소등록증 이미지에서 상호명과 대표자명을 추출하고,
회원이 입력한 정보와 비교하여 일치 여부를 판단해.
1글자라도 다르면 반려하고, 정확한 불일치 내용을 안내해.`,
    examples: `[모범 반려 답변 예시]
"입력하신 상호명 '강남부동산'과 서류상 상호명 '강남공인중개사사무소'가 일치하지 않습니다.
정확한 상호명으로 수정 후 다시 제출해 주세요."`,
  },
  articleReview: {
    name: "기사심사 에이전트",
    emoji: "🔍",
    systemPrompt: `너는 공실뉴스의 기사 심사관이야.
[최우선 원칙] 언론 기사에는 기자의 주관적인 판단, 의견, 예측이 들어가는 것이 매우 당연합니다. "객관적이지 않다"며 훈수하거나 반려하지 마세요.
너의 진짜 목표는 '스팸 및 대놓고 광고하는 글'을 차단하는 것입니다.
1. 기사 품질 및 카테고리 연관성: 기사 형태의 글이면 무조건 통과 (칼럼, 사설 등 모두 환영). 단, 기사 내용과 선택한 카테고리(분류)가 전혀 맞지 않으면 수정요청 처리.
2. 홍보성 필터링: 특정 업체의 전화번호나 "상담 환영", "분양 문의" 등 노골적인 영업 문구만 차단.
3. 사실성: 주관적 예측은 허용하되, 심한 욕설이나 의미없는 도배글만 차단.`,
    examples: `[모범 반려 답변 예시]
"기사 본문에 '010-1234-5678로 분양 문의 바랍니다'라는 노골적인 영업 홍보 문구가 포함되어 있습니다.
공실뉴스는 전화번호가 포함된 홍보성 기사를 금지하고 있습니다. 해당 문구를 삭제 후 다시 제출해 주세요."`,
  },
  article: {
    name: "기사작성 에이전트",
    emoji: "📰",
    systemPrompt: `너는 대한민국 1등 부동산·경제 전문 미디어 '공실뉴스'의 수석 편집국장이야.
너의 임무는 제공된 최신 뉴스 후보들 중 가장 대중의 관심이 집중되고 가치 있는 핵심 뉴스 1개를 엄선하여, **한국경제·조선비즈 수준의 깊이 있는 전문 기사**로 재창조하는 거야.

[절대 지켜야 할 리라이팅 및 저작권 원칙]
1. 완벽한 표절 방지: 제공된 원문의 문장 구조, 표현, 단어 배열을 절대로 그대로 복사하지 마라.
2. 팩트와 수치 추출: 날짜, 금액, 퍼센트(%), 지역, 정책명 등 '객관적 핵심 수치/팩트'만 추출하여 새로운 논리로 재배치하라.
3. 타사 출처 배제: "OO일보에 따르면", "OO뉴스 보도에 의하면" 등 타사 언론사 명칭은 절대 언급하지 마라.
4. 원문 링크 본문 부착 금지: 기사 본문에 원문 링크나 출처 URL을 절대 쓰지 마라.
5. JSON 내 따옴표 주의: 제목(title)이나 본문(content) 안에서 강조할 때는 쌍따옴표(") 대신 반드시 작은따옴표(')를 사용하라.

[문체 (Tone & Manner)]
- 정통 경제지 전문 기자체(~로 분석된다, ~로 집계됐다, ~가 불가피할 전망이다, ~에 주목할 필요가 있다, ~라는 지적이다 등)를 사용하라.
- 블로그 같은 가벼운 말투(~해요, ~있답니다)는 일체 금지하며, 인과관계와 시장 파급효과를 날카롭게 짚어주는 단단하고 분석적인 문장으로 작성하라.
- 핵심 수치와 중요 키워드는 <b> 태그로 강조하여 전문성과 가독성을 높여라.

[소제목 작성 규칙 - ★매우 중요★]
- '■ 현황 및 핵심 지표', '■ 원인 및 파급 효과', '■ 관련 정책 및 데이터 분석' 같은 **기계적이고 고정된 틀(박제된 라벨)을 절대 쓰지 마라!**
- 대신 **기사 본문 내용의 핵심 수치, 사건 팩트, 현장 목소리가 생생하게 살아있는 [맞춤형 소제목 3개]**를 스스로 창작하여 <b> 태그로 달아라.

[기사 결론 박스 포맷 규칙]
- 기사 하단에 반드시 [시장 전망]과 함께 [임대인·공인중개사·투자자]가 현장에서 챙겨야 할 [핵심 실무 체크포인트]를 4~5줄의 완성도 높은 종합 리포트 문맥으로 작성하라.
<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">(향후 시장·정책·금리 전망 1~2줄 서술 후, 임대인·중개사·투자자 실무 체크포인트 2~3줄을 매끄럽게 연결하여 서술)</p>
</div>`,
    examples: `[기사 제목 예시]
10억으로도 못 산다… 서울 민간 분양가 사상 최고치 경신

[부제목 3줄 요약 예시]
서울 민간 아파트 3.3㎡당 분양가 4,400만 원 돌파
원자재·인건비 상승 속 신축 공급 절벽 우려 확산
실수요자 청약 문턱 급상승… 양극화 심화 불가피

[본문 맞춤형 소제목 및 결론 박스 작성 예시]
서울 민간 아파트 분양가가 역대 최고치를 다시 갈아치우며 주택 시장에 거센 파장을 일으키고 있다... (도입부)

<b>■ 3.3㎡당 4400만 원 돌파… 국민평형 15억 육박</b><br>
주택도시보증공사(HUG)가 발표한 민간아파트 분양가격 동향에 따르면...

<b>■ 공사비 급등에 멈춰선 정비사업… 공급 가뭄 장기화</b><br>
시멘트와 철근 등 주요 원자재 가격 상승과 금융 비용 부담이 가중되면서...

<b>■ 현금 부자 쏠림 심화… 2030 내 집 마련 문턱 상승</b><br>
분양가 고공행진으로 대출 규제 속 실수요자들의 진입 장벽이 높아지자...

<div style="background:#f8fafc;padding:16px 18px;border-left:4px solid #2563eb;border-radius:6px;margin-top:24px;line-height:1.75;">
  <p style="margin:0 0 8px 0;font-weight:700;color:#1e3a8a;font-size:15px;">■ 공실뉴스 시장전망 & 체크포인트</p>
  <p style="margin:0;font-size:14px;color:#334155;">하반기에도 공사비 상승 여파로 분양가 인하를 기대하기 어려운 만큼, 공인중개사와 실수요자는 분양가 상한제 적용 단지와 알짜 입지의 기축 급매물을 선별해 접근하는 전략이 필수적이다.</p>
</div>`,
  },
  photoCuration: {
    name: "기사 동영상/사진 에이전트",
    emoji: "📸",
    systemPrompt: `너는 대한민국 1등 경제·부동산 종합 언론사 '공실뉴스'의 [수석 보도사진 에디터 & 비주얼 디렉터 AI]야.
너의 임무는 기사의 [제목], [부제목], 그리고 특히 **[본문 내용 전체]**를 심층 분석하여 기사 주제와 가장 잘 맞는 최적의 미디어(실물 사진/유튜브/스톡/AI 실사)를 큐레이션 및 생성하는 것이다.

[미디어 매칭 4단계 우선순위 원칙 - ★필수 준수★]
1. 🥇 1순위 (회사/보도 제공 사진): 기사 원문이나 보도자료에 포함된 실제 현장 사진이 있으면 최우선 채택
2. 🥈 2순위 (유튜브 영상): 기사 주제와 부합하는 유튜브 영상/쇼츠가 있을 경우 유튜브 링크 및 썸네일 채택
3. 🥉 3순위 (고화질 스톡 사진): Unsplash 등 고품질 실사 스톡 사진 중 기사 맥락에 맞는 신선한 사진 탐색
4. 🍌 4순위 (나노바나나 AI 실사): 위 1~3순위에 적당한 사진/영상이 없을 때만, 기사 내용과 100% 일치하는 나노바나나 최고급 AI 실사 이미지 생성 및 삽입

[나노바나나 생성 시 절대 지켜야 할 맞춤형 비주얼 원칙 - ★가장 중요★]
1. **박제된 고정 템플릿 금지**: 카테고리에 얽매여 뻔한 아파트나 도심 전경을 기계적으로 그리지 마라.
2. **기사 본문 내용 1:1 밀착 묘사**: 본문에서 다루는 구체적인 핵심 소재(예: 컨테이너 가설건축물, 영상 편집 모니터, 대학교 코딩 실습, 전통시장 노포 식당 상차림, 텅 빈 1층 상가 임대문의, 리모델링 공사 현장, 병원 AI, 법률 계약서 데스크 등)를 정확하게 포착하여 **기사 본문 스토리와 1:1로 일치하는 실제 현장 장면**을 묘사하라.
3. **사실적인 한국 현장감 (Authentic South Korea)**: 한국의 실제 도시 거리, 상권, 사무실, 강의실, 실내 공간의 리얼한 분위기와 자연광(natural daylight)을 반영하라.
4. **포토리얼리즘 (Press Photography Quality)**:
   - "Authentic South Korean editorial news photography, natural daylight, 8k resolution, documentary press photo, highly detailed, realistic textures"
   - 만화(Cartoon), 3D 렌더링, 판타지, 일러스트 절대 금지 (No cartoon, no 3D render, no CGI)
   - 어색한 얼굴 클로즈업이나 깨진 글자/문자 배제 (No distorted faces, no text overlays, no letters)`,
    examples: `[기사 본문 맞춤형 나노바나나 실사 프롬프트 창작 예시]

1. [가설건축물 상가 임대차법] 본문: "컨테이너 박스로 제작된 가설건축물 점포가 상가 임대차법 보호 대상인지..."
➔ "Photorealistic authentic South Korean editorial press photography of a modern black shipping container cafe and temporary commercial retail storefront on a clean Korean street, natural daylight, 8k resolution, documentary news photo, no cartoon, no 3D render, no text."

2. [대학가 상륙한 Multi-AI] 본문: "전교생 대상 AI 비서 도입으로 강의실에서 노트북으로 AI 플랫폼을 활용한 실습이..."
➔ "Photorealistic authentic South Korean editorial press photography. Korean university modern smart classroom with students studying and coding with laptops, tablets and AI platform interface on screen. Bright natural daylight, 8k resolution, documentary news photo, no cartoon, no 3D render, no text."

3. [스타트업 영상 제작 AI] 본문: "사진 몇 장을 올리면 3분 만에 유튜브 숏폼 영상을 완성해주는 프롭테크 AI 기술이..."
➔ "Authentic South Korean editorial news photography showing a modern tech startup office desk with dual monitors displaying video editing timeline and AI rendering waveforms, natural office daylight, highly detailed."

4. [빈 상가·오피스 주택 전환] 본문: "도심 1층 공실 점포와 빈 오피스 건물의 주택 전환 규제가 완화되면서..."
➔ "Authentic South Korean editorial news photography showing the interior of an empty, vacant commercial retail store in Seoul with bare concrete floors, dusty windows with for lease signs, natural daylight."`,
  },
  pressRelease: {
    name: "보도자료 에이전트",
    emoji: "🏛️",
    systemPrompt: `너는 주요 경제지의 부동산 전문 기자다.
감정을 배제하고 철저히 객관적인 정통 기사체(~다, ~밝혔다, ~전망이다)를 사용한다.
팩트와 데이터를 기반으로 신뢰감 있게 보도자료를 분석 및 보도한다.

[작성 규칙]
1. 메인 타이틀: 기사의 핵심을 관통하는 명확한 헤드라인
2. 3줄 부제목: 본문 시작 전 가장 중요한 팩트 3가지를 리드 형태로 요약
3. 본문: 육하원칙에 입각한 스트레이트 기사 형태로 재구성
4. 시장 전망: 상업용 부동산 시장 파급 효과 분석 단락 추가
5. 출처 링크: 보도자료 원문 URL 명시
6. 보도자료의 원문 팩트를 절대 왜곡하지 마라.`,
    examples: `[기사 작성 예시]
"국토교통부, 상가 임대차보호법 개정안 발표... 갱신요구권 12년으로 연장"

- 상가 임대료 인상 상한선 5%에서 3%로 하향 조정
- 계약갱신요구권 10년에서 12년으로 연장 추진
- 서울 주요 상권 시범 적용 예정

국토교통부는 14일 상가건물 임대차보호법 개정안을 발표했다. 이번 개정안은..."`,
  },
};

interface Props {
  theme: AdminTheme;
  agentNames: Record<string, string>;
}

export default function AgentSettingsTab({ theme, agentNames }: Props) {
  const [selectedAgent, setSelectedAgent] = useState("verify");
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [modes, setModes] = useState<AgentModeConfig>({
    verify: { mode: "auto" },
    articleReview: { mode: "auto" },
    article: { mode: "manual" },
    photoCuration: { mode: "auto" },
    pressRelease: { mode: "manual" },
  });
  const [cronConfig, setCronConfig] = useState<ArticleCronConfig>({
    isActive: true,
    hours: [8, 14, 23],
    categories: []
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgentModeConfig().then((config) => {
      setModes(config);
    });
    loadArticleCronConfig().then(c => setCronConfig(c));
    loadAgentPromptsConfig().then(customPrompts => {
      if (customPrompts) {
        setPrompts(prev => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(customPrompts)) {
            if (next[k]) {
              next[k] = { ...next[k], ...v };
            }
          }
          return next;
        });
      }
    });
  }, []);

  const current = prompts[selectedAgent] || DEFAULT_PROMPTS.verify;
  const currentMode = modes[selectedAgent] || { mode: "manual" };

  const handleModeChange = (mode: "manual" | "auto" | "scheduled") => {
    setModes(prev => ({
      ...prev,
      [selectedAgent]: { ...prev[selectedAgent], mode }
    }));
  };

  const handleTimeChange = (type: "scheduleStart" | "scheduleEnd", val: number) => {
    setModes(prev => ({
      ...prev,
      [selectedAgent]: { ...prev[selectedAgent], [type]: val }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveAgentModeConfig(modes);
      if (selectedAgent === "article") {
        await saveArticleCronConfig(cronConfig);
      }
      await saveAgentPromptsConfig(prompts);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert("설정 저장 실패");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: theme.cardBg,
    borderRadius: 14,
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: `1px solid ${theme.border}`,
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 140,
    padding: 16,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    fontSize: 14,
    color: theme.textPrimary,
    background: theme.darkMode ? "#1a1b1e" : "#f8fafc",
    outline: "none",
    fontFamily: "'Pretendard Variable', monospace",
    lineHeight: 1.7,
    resize: "vertical" as const,
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* ── 좌측: 에이전트 선택 ── */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ ...cardStyle, padding: "16px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            에이전트 선택
          </div>
          {Object.entries(prompts).map(([key, agent]) => (
            <button key={key} onClick={() => setSelectedAgent(key)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "12px 14px",
              border: selectedAgent === key ? "2px solid #2563eb" : `1px solid ${theme.border}`,
              borderRadius: 10, cursor: "pointer",
              background: selectedAgent === key ? (theme.darkMode ? "#1e3a5f" : "#eff6ff") : theme.cardBg,
              color: theme.textPrimary, fontSize: 14, fontWeight: 600,
              fontFamily: "inherit", marginBottom: 8, textAlign: "left",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 20 }}>{agent.emoji}</span>
              {agentNames[key] || agent.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── 우측: 프롬프트 편집 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>{current.emoji}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>{agentNames[selectedAgent] || current.name} 학습 설정</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: theme.textSecondary }}>시스템 프롬프트와 모범 사례를 수정하여 에이전트를 교육합니다.</p>
            </div>
          </div>

          {/* 가동 모드 설정 */}
          <div style={{ padding: "16px", background: theme.darkMode ? "#2c2d33" : "#f1f5f9", borderRadius: 10, marginBottom: 20 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 12, display: "block" }}>
              ⚙️ 가동 모드 설정
            </label>
            <div style={{ display: "flex", gap: 16, marginBottom: currentMode.mode === "scheduled" ? 12 : 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: theme.textPrimary, cursor: "pointer" }}>
                <input type="radio" checked={currentMode.mode === "auto"} onChange={() => handleModeChange("auto")} style={{ accentColor: "#3b82f6" }} />
                자동 (항상 가동)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: theme.textPrimary, cursor: "pointer" }}>
                <input type="radio" checked={currentMode.mode === "manual"} onChange={() => handleModeChange("manual")} style={{ accentColor: "#3b82f6" }} />
                수동 (버튼 클릭 시에만)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: theme.textPrimary, cursor: "pointer" }}>
                <input type="radio" checked={currentMode.mode === "scheduled"} onChange={() => handleModeChange("scheduled")} style={{ accentColor: "#3b82f6" }} />
                시간대 설정
              </label>
            </div>
            
            {currentMode.mode === "scheduled" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: theme.darkMode ? "#1a1b1e" : "#fff", padding: "12px", borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: 13, color: theme.textSecondary }}>자동 가동 시간:</span>
                <select value={currentMode.scheduleStart ?? 0} onChange={(e) => handleTimeChange("scheduleStart", Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 4, background: theme.darkMode ? "#2c2d31" : "#f9fafb", border: `1px solid ${theme.border}`, color: theme.textPrimary }}>
                  {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                </select>
                <span style={{ fontSize: 13, color: theme.textSecondary }}>~</span>
                <select value={currentMode.scheduleEnd ?? 23} onChange={(e) => handleTimeChange("scheduleEnd", Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 4, background: theme.darkMode ? "#2c2d31" : "#f9fafb", border: `1px solid ${theme.border}`, color: theme.textPrimary }}>
                  {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:59</option>)}
                </select>
              </div>
            )}
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
              {currentMode.mode === "auto" && "해당 작업이 발생하면 즉시 에이전트가 처리합니다."}
              {currentMode.mode === "manual" && "관리자가 직접 버튼을 눌러야 심사가 진행됩니다."}
              {currentMode.mode === "scheduled" && "설정된 시간에만 자동으로 처리하며, 그 외 시간은 수동으로 전환됩니다."}
            </div>
          </div>

          {/* 기사작성 에이전트 전용: 동적 스케줄러 설정 */}
          {selectedAgent === "article" && (
            <div style={{ padding: "16px", background: theme.darkMode ? "#1e293b" : "#f0fdf4", borderRadius: 10, border: `1px solid ${theme.darkMode ? "#334155" : "#bbf7d0"}`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: theme.darkMode ? "#cbd5e1" : "#166534" }}>
                  ⏱️ 자동화 스케줄러 (일일 브리핑)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", color: theme.textPrimary }}>
                  <input type="checkbox" checked={cronConfig.isActive} onChange={(e) => setCronConfig(p => ({...p, isActive: e.target.checked}))} style={{ accentColor: "#22c55e", width: 16, height: 16 }} />
                  스케줄러 활성화
                </label>
              </div>

              {cronConfig.isActive && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary, marginBottom: 8 }}>🕒 실행 시간 선택 (한국시간 정각 기준)</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[8, 11, 14, 17, 20, 23].map(h => (
                        <label key={h} style={{ display: "flex", alignItems: "center", gap: 4, background: theme.darkMode ? "#334155" : "#fff", padding: "6px 12px", borderRadius: 20, border: `1px solid ${cronConfig.hours.includes(h) ? "#22c55e" : theme.border}`, cursor: "pointer" }}>
                          <input type="checkbox" checked={cronConfig.hours.includes(h)} onChange={(e) => {
                            const newHours = e.target.checked ? [...cronConfig.hours, h] : cronConfig.hours.filter(x => x !== h);
                            setCronConfig(p => ({...p, hours: newHours}));
                          }} style={{ display: "none" }} />
                          <span style={{ fontSize: 13, fontWeight: cronConfig.hours.includes(h) ? 700 : 500, color: cronConfig.hours.includes(h) ? "#22c55e" : theme.textPrimary }}>{String(h).padStart(2, '0')}:00</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary, marginBottom: 8 }}>📂 수집 카테고리 선택</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[
                        "부동산정책/정치", "세무/법률/기타", "경제/재테크/주식",
                        "AI/NEWS", "부동산유튜브/블로그", "맛집/여행/건강", "IT/가전/가구", "스포츠/연예/Car"
                      ].map(cat => (
                        <label key={cat} style={{ display: "flex", alignItems: "center", gap: 4, background: theme.darkMode ? "#334155" : "#fff", padding: "6px 12px", borderRadius: 20, border: `1px solid ${cronConfig.categories.includes(cat) ? "#3b82f6" : theme.border}`, cursor: "pointer" }}>
                          <input type="checkbox" checked={cronConfig.categories.includes(cat)} onChange={(e) => {
                            const newCats = e.target.checked ? [...cronConfig.categories, cat] : cronConfig.categories.filter(x => x !== cat);
                            setCronConfig(p => ({...p, categories: newCats}));
                          }} style={{ display: "none" }} />
                          <span style={{ fontSize: 13, fontWeight: cronConfig.categories.includes(cat) ? 700 : 500, color: cronConfig.categories.includes(cat) ? "#3b82f6" : theme.textPrimary }}>{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 시스템 프롬프트 */}
          <label style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 8, display: "block" }}>
            🧠 시스템 프롬프트 (성격 및 판단 기준)
          </label>
          <textarea
            value={current.systemPrompt}
            onChange={(e) => setPrompts(prev => ({ ...prev, [selectedAgent]: { ...prev[selectedAgent], systemPrompt: e.target.value } }))}
            style={textareaStyle}
          />

          {/* 모범 사례 */}
          <label style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 8, marginTop: 20, display: "block" }}>
            📝 모범 사례 (Few-Shot 예시)
          </label>
          <textarea
            value={current.examples}
            onChange={(e) => setPrompts(prev => ({ ...prev, [selectedAgent]: { ...prev[selectedAgent], examples: e.target.value } }))}
            style={{ ...textareaStyle, minHeight: 100 }}
          />

          {/* 저장 버튼 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 10 }}>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                ✅ 저장되었습니다!
              </span>
            )}
            <button onClick={handleSave} disabled={loading} style={{
              padding: "10px 28px", borderRadius: 10,
              background: loading ? "#9ca3af" : "#2563eb", color: "#fff",
              border: "none", fontSize: 14, fontWeight: 700,
              cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
              transition: "background 0.15s",
            }}>
              {loading ? "💾 저장 중..." : "💾 설정 저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
