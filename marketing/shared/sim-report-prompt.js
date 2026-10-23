/* ══════════════════════════════════════════════════════════════
   공실마케팅 — 인테리어·리모델링 예측 시뮬레이션 보고서 [AI로 채우기] (2026-10-22)

   예측 결과(조건·AI 설계 사양·단가표 견적)를 받아 보고서의 설명 글 칸만 쓴다.
   - 금액·면적·층 등 숫자는 받은 자료 그대로만. 새 숫자(공사 기간·임대료 상승·수익률)를 만들지 않는다
   - 받은 자료에 없는 자재 브랜드·시공사·인허가·구조 진단을 지어내지 않는다
   - 견적은 "예상 범위"이며 현장 실측 후 확정된다는 태도를 지킨다
   - 표시·광고법: "최고·유일·100%·무조건·반드시 오른다" 같은 과장 금지
   이 파일은 서버 묶음으로만 앱에 내려간다 (studio-app/scripts/sync-ext.mjs, 설치 파일에 넣지 않음).
   ══════════════════════════════════════════════════════════════ */

const GW_SR_KIND = {
  interior: { label: "인테리어 예측 보고서", what: "실내 인테리어" },
  remodel: { label: "리모델링 예측 보고서", what: "건물 외관 리모델링" },
};

/* 칸 — 보고서 쪽에 들어갈 자리와 길이 */
const GW_SR_FIELDS = {
  summary: "개요 쪽의 '보고서 요약'. 이 현장과 공간별 예측의 핵심을 2~3문장(90~170자)",
  concept: "개요 쪽의 '디자인 콘셉트'. 공간 전체를 아우르는 고른 조건과 설계 사양을 풀어 쓴 3~4문장(140~230자)",
  costNote: "종합 견적서 쪽의 '견적 해설'. 어느 공간·항목이 금액을 좌우하는지, 범위가 왜 넓은지 2~3문장(90~170자). 받은 금액만 인용",
  closing: "견적서 쪽 아래 '맺음말'. 고객에게 다음 단계(현장 실측·상담)를 권하는 2문장(60~110자)",
};

function gwSrLines(r) {
  const out = [];
  const add = (k, v) => { if (v !== undefined && v !== null && String(v).trim()) out.push(`- ${k}: ${String(v).trim()}`); };
  add("현장", r.title);
  add("위치", r.location);
  add("메모", r.memo);
  /* 공간 여러 개 (거실·안방·주방·욕실…) — 공간마다 조건·견적 */
  const spaces = Array.isArray(r.spaces) ? r.spaces : [r];
  let lo = 0, hi = 0;
  spaces.forEach((sp, i) => {
    out.push(`\n[공간 ${i + 1}${sp.name ? ` · ${sp.name}` : ""}]`);
    for (const [k, v] of Object.entries(sp.design || {})) add(`고른 조건 · ${k}`, Array.isArray(v) ? v.join(", ") : v);
    for (const x of sp.designSpec || []) add(`설계 사양 · ${x.label}`, x.value);
    if (sp.cost) {
      add("견적 기준", sp.cost.basisText);
      for (const it of sp.cost.items || []) add(`견적 · ${it.label}`, `${it.basis} → ${it.min.toLocaleString()}만 ~ ${it.max.toLocaleString()}만 원`);
      add("이 공간 예상 공사비", sp.cost.rangeText);
      lo += sp.cost.min || 0;
      hi += sp.cost.max || 0;
      add("제외", sp.cost.excludes);
    }
  });
  if (spaces.length > 1) out.push(`\n- 전체 예상 공사비 합계: 약 ${lo.toLocaleString()}만 ~ ${hi.toLocaleString()}만 원`);
  return out.join("\n");
}

function gwBuildSimReportPrompt(kind, r) {
  const K = GW_SR_KIND[kind] || GW_SR_KIND.interior;
  const fields = Object.entries(GW_SR_FIELDS).map(([k, v]) => `- "${k}": ${v}`).join("\n");
  return `당신은 공인중개사무소가 고객(집주인·임대인·매수 검토자)에게 보내는 「${K.label}」의 설명 글을 쓰는 부동산 전문 에디터입니다.
아래는 ${K.what} 예측 시뮬레이션 결과입니다. 이 자료만 근거로 보고서 칸 글을 써 주세요.

[예측 결과 자료]
${gwSrLines(r)}

[쓸 칸]
${fields}

[규칙]
- 숫자(금액·면적·층·평수)는 위 자료에 있는 것만, 그대로 쓰십시오. 새 숫자를 만들지 마십시오.
- 공사 기간, 임대료·매매가 상승, 수익률, 자재 브랜드, 시공사 이름은 쓰지 마십시오 (자료에 없음).
- 견적은 단가표로 낸 "예상 범위"이며 현장 실측 후 확정된다는 점을 흐리지 마십시오.
- 과장 표현(최고·유일·100%·무조건·반드시) 금지. 정중하고 전문적인 보고서 문체(~입니다/~습니다).
- 이미지는 AI 예측이라는 점을 사실처럼 단정하지 마십시오.

[답 형식]
아래 JSON 하나만 \`\`\`json 코드 블록으로 답하십시오. 다른 말은 쓰지 마십시오.
\`\`\`json
{ ${Object.keys(GW_SR_FIELDS).map((k) => `"${k}": "..."`).join(", ")} }
\`\`\`
- JSON.parse 가 가능한지 확인하십시오.`;
}

function gwParseSimReport(text) {
  const s = String(text || "");
  const m = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
  const cands = [m ? m[1] : "", (s.match(/\{[\s\S]*\}/) || [""])[0]].filter(Boolean);
  for (const body of cands) {
    try {
      const obj = JSON.parse(body.trim());
      const fields = {};
      for (const k of Object.keys(GW_SR_FIELDS)) if (typeof obj[k] === "string" && obj[k].trim()) fields[k] = obj[k].trim();
      if (Object.keys(fields).length >= 3) return { ok: true, fields };
    } catch (_) { /* 다음 */ }
  }
  return { ok: false, reason: "AI 답에서 보고서 글을 찾지 못했습니다. 다시 눌러 주세요." };
}

if (typeof module !== "undefined") module.exports = { GW_SR_KIND, GW_SR_FIELDS, gwBuildSimReportPrompt, gwParseSimReport };
