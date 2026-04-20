const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envText.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  if (!supabaseKey && line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

const files = [
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 01.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 02.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 03.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 04.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 05.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 06.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 07.mp4",
  "[드론영상] 서울 강남구 논현동 문빌딩 강남대로 아크로힐스 논현 압구정 한강방향 08.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 09.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 10.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 11.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 12.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 13.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 14.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 15.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 16.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 17.mp4",
  "[드론영상] 서울 강남구 논현동 빌딩 강남대로 아크로힐스 논현 압구정 한강방향 원본.mp4"
];

async function revert() {
  console.log('Rolling back: Deleting all drone board posts...');
  const { error: delErr } = await supabase.from('board_posts').delete().eq('board_id', 'drone');
  if (delErr) {
    console.error('Failed to delete posts:', delErr);
    return;
  }
  
  console.log('Inserting original 18 posts...');
  const posts = files.map((file, i) => {
    const cleanTitle = file.replace(".mp4", "");
    let cat = "강남";
    if (cleanTitle.includes("서초")) cat = "서초";
    if (cleanTitle.includes("여의도")) cat = "여의도";
    const formattedTitle = `[${cat}] ${cleanTitle}`;

    // Removing the 'category' key here to match the current schema
    return {
      board_id: "drone",
      title: formattedTitle,
      content: "구글드라이브 연동 드론 영상입니다.",
      author_id: null,
      author_name: "관리자",
      view_count: Math.floor(Math.random() * 50) + 10,
      created_at: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
      drive_url: "https://drive.google.com/file/d/placeholder-need-update/view",
      is_deleted: false,
      is_notice: false
    };
  });

  const { error: insErr } = await supabase.from('board_posts').insert(posts);
  if (insErr) {
    console.error('Failed to insert original 18 posts:', insErr);
  } else {
    console.log('Successfully reverted database to previous state with 18 original videos!');
  }
}

revert();
