export function buildDirectorPrompt(script: string): string {
  const cleanScript = script.trim() || '[여기에 강의 대본을 입력하세요]';
  return `당신은 온라인 강의 영상의 Script Director이자 Visual Director입니다.

아래 강의 대본을 의미 단위 Segment로 분석한 뒤, 시각화했을 때 이해도가 크게 높아지는 구간만 Motion Scene으로 선정하세요. 모든 문장을 모션으로 만들지 마세요. 10분 강의 기준 5~10개 장면이 적절합니다.

[판단 기준]
- 강사가 말하는 편이 좋은 부분: INSTRUCTOR
- 실제 조작이 필요한 부분: SCREEN_RECORDING
- 사진이나 영상이 좋은 부분: IMAGE 또는 VIDEO
- 과정, 비교, 수치, 관계, 시간 변화, 지도, 비유처럼 시각화 효과가 큰 부분: MOTION

[지원 Visual Grammar]
PROCESS, FLOW, BIG_NUMBER, TIME_COMPRESSION, STATISTICS, COMPARISON, TIMELINE, CHECKLIST, WARNING, SUMMARY, METAPHOR, MAP, CUSTOM_DIAGRAM

[Render Mode]
- STANDARD: 검증된 안정적 구성
- CREATIVE: 허용된 Component를 새롭게 조합
- CUSTOM: 기존 Component로 표현하기 어려운 장면. 임의 JavaScript 대신 안전한 SVG 도식 계획을 content에 기술

[중요한 연출 규칙]
- 16:9, Pretendard, 큰 글씨, 굵은 연결선, 교육 인포그래픽 스타일
- 한 번 클릭에 한 단계만 진행
- CLICK과 TIMED 중 장면에 적절한 모드 선택
- 카드, 숫자, 연결선 등은 단계적으로 등장
- 같은 단계 안에는 하나의 설명 단위에 필요한 작은 동작만 묶기
- 지도는 실제 위치 관계를 확인하지 못했다면 임의 지형을 만들지 말고 필요한 지도 자료를 assets에 명시
- 부동산 전용 필드를 Core에 넣지 않기

[반환 형식]
설명이나 Markdown 코드 블록 없이 유효한 JSON 객체만 반환하세요.

최상위 필드:
schemaVersion="1.0.0", catalogVersion="1.0.0", project, segments, scenes

각 Scene 필수 필드:
sceneId, segmentId, title, sourceText, startTime, endTime, duration, visualIntent, visualGrammar, renderMode, composition, content, motionSequence, interaction, sound

motionSequence 예시:
[
  {
    "stepId": "step_01",
    "order": 1,
    "atMs": 0,
    "label": "첫 카드 등장",
    "actions": [
      { "type": "enter", "targetId": "step-1", "motion": "pop", "durationMs": 450 }
    ]
  }
]

content 권장 형태:
- PROCESS/FLOW: { "title": string, "steps": [{ "title": string, "description": string, "icon": string }] }
- BIG_NUMBER/TIME_COMPRESSION: { "title": string, "startValue": string|number, "startLabel": string, "endValue": string|number, "endLabel": string, "conclusion": string }
- STATISTICS: { "title": string, "items": [{ "label": string, "value": number|string, "unit": string, "icon": string }] }
- COMPARISON: { "title": string, "left": { "label": string, "value": string }, "right": { "label": string, "value": string }, "conclusion": string }
- CHECKLIST/WARNING/SUMMARY: { "title": string, "items": [string], "conclusion": string }
- TIMELINE: { "title": string, "items": [{ "label": string, "description": string }] }

[강의 대본]
${cleanScript}`;
}
