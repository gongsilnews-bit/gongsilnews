/**
 * 공실뉴스 회원승인 AI 백그라운드 데몬 (Member Verify Agent Daemon)
 * 
 * - Supabase Realtime 웹소켓 감시 (0.1초 즉시 반응)
 * - 10초 주기 안전망 폴링
 * - Google Gemini Flash Vision API를 이용한 서류 진위/정보 검증
 * - 자동 승인(APPROVED) or 서류보완(REJECTED) 처리 및 관리자 AI 워크스페이스(agent_chats) 자동 로깅
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error('[VerifyDaemon] ❌ 필수 환경변수(SUPABASE_URL, SERVICE_ROLE_KEY, GEMINI_API_KEY) 누락');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 이미지 URL -> Buffer 다운로드 함수
async function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} 실패: ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || 'image/jpeg';
        resolve({ buffer, mimeType: contentType.split(';')[0] });
      });
    }).on('error', reject);
  });
}

// Gemini Vision 서류 분석 함수
async function analyzeDocumentWithGemini(buffer, mimeType) {
  const base64Data = buffer.toString('base64');
  const prompt = `
너는 공인중개사사무소 개설등록증 및 사업자등록증을 검토하는 전문 심사 에이전트야.
첨부된 이미지를 읽고 반드시 아래 JSON 규격으로만 응답해.

[판단 기준]
1. 실제 관공서/국세청에서 발급한 '사업자등록증' 또는 '중개사무소 개설등록증' 서류 문서인지 확인해.
2. 만약 일반 인물 사진, 모델, 프로필, 풍경, 일러스트, 명함 등 공식 등록증 서류가 아니라면 반드시 isDocument: false로 응답해.

[추출할 정보]
- isDocument: true | false (공식 증명 서류 여부)
- documentType: "사업자등록증" | "중개사무소개설등록증" | "일반사진/인물/기타"
- companyName: 상호명 또는 명칭
- representative: 대표자 성명
- registrationNumber: 등록번호 (사업자등록번호 또는 중개사등록번호)
- address: 사업장/사무소 소재지
- reason: 서류 판단 사유 (한국어 1문장)

[응답 형식 - 반드시 JSON만 출력]
{
  "isDocument": true,
  "documentType": "사업자등록증",
  "companyName": "행복공인중개사사무소",
  "representative": "홍길동",
  "registrationNumber": "123-45-67890",
  "address": "서울시 강남구 테헤란로 123",
  "reason": "사업자등록증 원본 서류로 정상 확인됨"
}
`;

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.1 }
      };

      const res = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
      });

      if (res.statusCode === 200) {
        const json = JSON.parse(res.body);
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const clean = text.replace(/```json\n?|```/g, '').trim();
          const parsed = JSON.parse(clean);
          return { success: true, data: parsed, usage: json.usageMetadata };
        }
      }
    } catch (e) {
      // 다음 모델 시도
    }
  }

  return { success: false, error: 'Gemini 모델 호출 실패' };
}

// 중개사무소(agencies) 심사 처리
async function processPendingAgency(agency) {
  const agencyId = agency.id;
  const memberId = agency.owner_id;
  console.log(`\n[🛡️ VerifyDaemon] 심사 시작: [${agency.name}] (대표: ${agency.ceo_name || '미상'}, ID: ${agencyId})`);

  // 1. 회원 정보 조회
  const { data: member } = await supabase.from('members').select('*').eq('id', memberId).single();
  const applicantName = member?.name || agency.ceo_name || '신청자';

  // 서류 URL 확인
  const bizUrl = agency.biz_cert_url;
  const regUrl = agency.reg_cert_url;

  if (!bizUrl && !regUrl) {
    const reason = '사업자등록증 및 개설등록증 서류가 첨부되지 않았습니다.';
    await rejectAgency(agencyId, memberId, reason, applicantName, agency.name);
    return;
  }

  // 2. 서류 다운로드 및 AI 판독
  const targetUrl = bizUrl || regUrl;
  try {
    const { buffer, mimeType } = await fetchImageBuffer(targetUrl);
    const aiResult = await analyzeDocumentWithGemini(buffer, mimeType);

    if (!aiResult.success) {
      console.warn(`[VerifyDaemon] AI 판독 불가 (${aiResult.error || 'API 응답 없음'}) - 기본 규칙 검증 진행`);
      // 파일 크기나 URL 유효성 검사: 만약 이미지가 깨졌거나 불러올 수 없다면 즉시 반려
      const reason = '사업자등록증 및 개설등록증 서류를 정상적으로 판독할 수 없습니다. 원본 증빙 서류를 선명하게 다시 업로드해 주세요.';
      await rejectAgency(agencyId, memberId, reason, applicantName, agency.name);
      return;
    }

    const doc = aiResult.data;
    console.log('[VerifyDaemon] AI 판독 결과:', doc);

    // 판정 1: 실제 서류가 아닌 경우 (인물 사진, 풍경 등)
    if (!doc.isDocument) {
      const reason = `제출된 파일이 공식 등록 서류가 아닙니다 (${doc.documentType || '일반 이미지/사진'}: ${doc.reason || '서류 양식 불일치'}). 정식 사업자등록증/개설등록증 원본을 업로드해 주세요.`;
      await rejectAgency(agencyId, memberId, reason, applicantName, agency.name, aiResult.usage);
      return;
    }

    // 판정 2: 정보 대조 (상호 또는 대표자명 확인)
    const expectedName = (agency.name || '').replace(/\s+/g, '');
    const expectedCeo = (agency.ceo_name || member?.name || '').replace(/\s+/g, '');
    const actualName = (doc.companyName || '').replace(/\s+/g, '');
    const actualCeo = (doc.representative || '').replace(/\s+/g, '');

    const nameMatch = expectedName && actualName && (actualName.includes(expectedName) || expectedName.includes(actualName));
    const ceoMatch = expectedCeo && actualCeo && (actualCeo.includes(expectedCeo) || expectedCeo.includes(actualCeo));

    if (!nameMatch && !ceoMatch) {
      const reason = `서류상의 정보(상호: ${doc.companyName || '미상'}, 대표: ${doc.representative || '미상'})가 신청 정보(상호: ${agency.name}, 대표: ${agency.ceo_name})와 일치하지 않습니다.`;
      await rejectAgency(agencyId, memberId, reason, applicantName, agency.name, aiResult.usage);
      return;
    }

    // 판정 3: 적합 서류 -> 승인!
    await approveAgency(agencyId, memberId, applicantName, agency.name, doc, aiResult.usage);
  } catch (err) {
    console.error('[VerifyDaemon] 심사 중 오류 발생 (파일 누락 또는 404):', err.message);
    const reason = '제출된 서류 파일이 손상되었거나 정상적으로 등록되지 않았습니다 (파일 누락). 원본 서류를 다시 첨부해 주세요.';
    await rejectAgency(agencyId, memberId, reason, applicantName, agency.name);
  }
}

// 승인 처리
async function approveAgency(agencyId, memberId, applicantName, agencyName, doc, usage) {
  console.log(`[🛡️ VerifyDaemon] ✅ [승인 결정] ${applicantName} (${agencyName})`);

  // 1. agencies 승인
  await supabase.from('agencies').update({
    status: 'APPROVED',
    reject_reason: null,
    updated_at: new Date().toISOString()
  }).eq('id', agencyId);

  // 2. members 등급 REALTOR로 승격
  await supabase.from('members').update({
    role: 'REALTOR',
    signup_completed: true,
    updated_at: new Date().toISOString()
  }).eq('id', memberId);

  // 3. AI 워크스페이스 채팅에 결과 기록
  await logToAgentWorkspace(`[✅ 회원승인 완료] ${agencyName} (${applicantName})\n- 서류 구분: ${doc.documentType || '등록증'}\n- 추출 상호: ${doc.companyName || agencyName}\n- 대표자: ${doc.representative || applicantName}\n- 판정: 서류 확인 완료 및 부동산회원 즉시 승인`, usage);

  // 4. 회원 알림(NotificationBell) 발송
  try {
    await supabase.from('notifications').insert({
      recipient_id: memberId,
      type: 'realtor_approved',
      title: '🎉 부동산회원 승인 완료',
      body: '공인중개사 서류 심사가 통과되어 부동산회원으로 승인되었습니다.',
      link: '/realty_admin',
      mobile_link: '/m/admin',
    });
  } catch (ne) {}
}

// 반려(서류보완) 처리
async function rejectAgency(agencyId, memberId, reason, applicantName, agencyName, usage) {
  console.log(`[🛡️ VerifyDaemon] ❌ [서류보완 결정] ${applicantName} (${agencyName}) - 사유: ${reason}`);

  // 1. agencies 반려 및 사유 저장
  await supabase.from('agencies').update({
    status: 'REJECTED',
    reject_reason: reason,
    updated_at: new Date().toISOString()
  }).eq('id', agencyId);

  // 2. members는 USER 유지
  await supabase.from('members').update({
    role: 'USER',
    updated_at: new Date().toISOString()
  }).eq('id', memberId);

  // 3. AI 워크스페이스 채팅에 결과 기록
  await logToAgentWorkspace(`[⚠️ 서류보완 요청] ${agencyName} (${applicantName})\n- 반려 사유: ${reason}\n- 조치: 회원에게 서류 재업로드 안내 상태로 전환`, usage);

  // 4. 회원 알림(NotificationBell) 발송
  try {
    await supabase.from('notifications').insert({
      recipient_id: memberId,
      type: 'realtor_rejected',
      title: '🚨 부동산회원 신청 서류보완 요청',
      body: `사유: ${reason}`,
      link: '/user_admin?menu=settings',
      mobile_link: '/m/admin/settings',
    });
  } catch (ne) {}
}

// AI 워크스페이스(agent_chats)에 보고 기록
async function logToAgentWorkspace(content, usage) {
  try {
    const inTokens = usage?.promptTokenCount || 0;
    const outTokens = usage?.candidatesTokenCount || 0;
    const totalTokens = usage?.totalTokenCount || (inTokens + outTokens);
    const costKrw = (inTokens * 0.075 / 1000000 * 1400) + (outTokens * 0.3 / 1000000 * 1400);

    await supabase.from('agent_chats').insert({
      channel_id: 'verify',
      role: 'agent',
      content,
      input_tokens: inTokens,
      output_tokens: outTokens,
      total_tokens: totalTokens,
      cost_krw: costKrw,
    });
  } catch (e) {
    console.error('[VerifyDaemon] agent_chats 로깅 실패:', e.message);
  }
}

// 대기 목록 일괄 스캔 (안전망)
async function scanPending() {
  try {
    const { data: agencies, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('status', 'PENDING');

    if (!error && agencies && agencies.length > 0) {
      console.log(`[🛡️ VerifyDaemon] 승인 대기 건 발견: ${agencies.length}건 처리 시작`);
      for (const ag of agencies) {
        await processPendingAgency(ag);
      }
    }
  } catch (e) {
    console.error('[VerifyDaemon] scanPending 에러:', e.message);
  }
}

// 메인 데몬 시작
async function startDaemon() {
  console.log('====================================================');
  console.log('🛡️  공실뉴스 회원승인 AI 백그라운드 데몬 가동 시작');
  console.log('⚡  Supabase Realtime 웹소켓 연결 및 10초 폴링 안전망 활성화');
  console.log('====================================================');

  // 1. 기동 즉시 현재 남아있는 대기건 1회 스캔
  await scanPending();

  // 2. Supabase Realtime 웹소켓 구독 (실시간 0.1초 반응)
  const channel = supabase
    .channel('verify-daemon-agencies')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agencies' }, async (payload) => {
      if (payload.new && payload.new.status === 'PENDING') {
        console.log(`[🛡️ VerifyDaemon] ⚡ 실시간 신규 신청 감지: ${payload.new.name}`);
        await processPendingAgency(payload.new);
      }
    })
    .subscribe((status) => {
      console.log(`[🛡️ VerifyDaemon] Supabase Realtime 상태: ${status}`);
    });

  // 3. 10초 주기 안전망 폴링 (네트워크 끊김 대비)
  setInterval(() => {
    scanPending();
  }, 10000);
}

startDaemon();
