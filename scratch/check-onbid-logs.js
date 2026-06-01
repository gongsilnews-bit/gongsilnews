const { createClient } = require('@supabase/supabase-js');

const s = createClient(
  'https://aijfktzqtnwhfotfwcka.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpamZrdHpxdG53aGZvdGZ3Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4ODY3NywiZXhwIjoyMDkxMjY0Njc3fQ.LAjlpvT8Tl6QZ9Ja3A-388FE9fZxtTOxC0otjRDq_yM'
);

async function main() {
  console.log('=== 최근 온비드 동기화 로그 (최근 20건) ===\n');
  
  const { data, error } = await s
    .from('agent_chats')
    .select('content, created_at')
    .eq('channel_id', 'onbid_sync_log')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('DB 조회 에러:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('동기화 로그가 전혀 없습니다!');
    return;
  }

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    try {
      const p = JSON.parse(r.content);
      const date = new Date(r.created_at);
      const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      const dateStr = kstDate.toISOString().replace('T', ' ').substring(0, 19) + ' KST';
      
      console.log(
        (i + 1) + '. [' + dateStr + '] ' + 
        (p.target || 'unknown') + ' | ' +
        '등록:' + (p.inserted || p.registered || 0) + ' ' +
        '업데이트:' + (p.updated || 0) + ' ' +
        '삭제:' + (p.deleted || p.expired || 0) + ' ' +
        '스킵:' + (p.skipped || 0) + ' ' +
        '성공:' + p.success + ' ' +
        (p.error ? 'ERROR: ' + p.error : '') + ' ' +
        (p.isManual ? '(수동)' : '(자동)')
      );
    } catch (e) {
      console.log((i + 1) + '. [' + r.created_at + '] PARSE_ERROR: ' + r.content.substring(0, 200));
    }
  }

  // 온비드 API Key 테스트
  console.log('\n=== 온비드 API 키 테스트 ===');
  const apiKey = '0c70894217e28613a63cea5f413098c837a45e1d3fdba3fa94b9dc273cf12e7d';
  const testUrl = 'https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=' + apiKey + '&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&lctnSdnm=' + encodeURIComponent('서울특별시');
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (res.ok) {
      const text = await res.text();
      console.log('HTTP 상태:', res.status);
      console.log('응답 (처음 500자):', text.substring(0, 500));
      
      try {
        const json = JSON.parse(text);
        const header = json.header || json.response?.header;
        const body = json.body || json.response?.body;
        console.log('\nHeader:', JSON.stringify(header));
        console.log('Body totalCount:', body?.totalCount);
      } catch (e) {
        console.log('JSON 파싱 실패 - XML 응답일 수 있음');
      }
    } else {
      console.log('HTTP 에러:', res.status, res.statusText);
    }
  } catch (e) {
    console.log('API 호출 실패 (타임아웃 또는 네트워크 에러):', e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
