const { createClient } = require('@supabase/supabase-js');

const s = createClient(
  'https://aijfktzqtnwhfotfwcka.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpamZrdHpxdG53aGZvdGZ3Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4ODY3NywiZXhwIjoyMDkxMjY0Njc3fQ.LAjlpvT8Tl6QZ9Ja3A-388FE9fZxtTOxC0otjRDq_yM'
);

async function main() {
  console.log('=== 최근 온비드 동기화 로그 (최신 5건) ===\n');
  
  const { data, error } = await s
    .from('agent_chats')
    .select('content, created_at')
    .eq('channel_id', 'onbid_sync_log')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('DB 조회 에러:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('로그 없음');
    return;
  }

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    try {
      var p = JSON.parse(r.content);
      var date = new Date(r.created_at);
      var kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      var dateStr = kstDate.toISOString().replace('T', ' ').substring(0, 19) + ' KST';
      
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
      console.log((i + 1) + '. [' + r.created_at + '] PARSE_ERROR');
    }
  }
}

main().then(function() { process.exit(0); }).catch(function(e) { console.error(e); process.exit(1); });
