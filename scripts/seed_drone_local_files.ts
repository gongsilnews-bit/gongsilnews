import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envStr = fs.readFileSync(".env.local", "utf-8");
const env: any = {};
envStr.split('\n').forEach(line => {
  const parts = line.split('=');
  if(parts.length >= 2) {
    const k = parts[0];
    const v = parts.slice(1).join('=');
    if(k && v) env[k.trim()] = v.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl as string, supabaseServiceKey as string);

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

async function main() {
  const posts = files.map((file, i) => {
    // [드론영상] 서울 강남구 논현동 ... 01.mp4 에서 확장자를 떼고, 태그를 붙일지 결정
    // 현재 [드론영상] 이라는 제목 자체가 태그 역할을 하거나, 카테고리로 사용할 수 있음
    const cleanTitle = file.replace(".mp4", "");
    // 카테고리 추출 (예: 강남구)
    let cat = "강남";
    if (cleanTitle.includes("서초")) cat = "서초";
    if (cleanTitle.includes("여의도")) cat = "여의도";
    
    // 제목 앞에 [강남] 카테고리 태그 삽입
    const formattedTitle = `[${cat}] ${cleanTitle}`;

    return {
      board_id: "drone",
      title: formattedTitle,
      content: "구글드라이브 연동 드론 영상입니다.",
      author_id: null,
      author_name: "관리자",
      category: cat,
      view_count: Math.floor(Math.random() * 50) + 10,
      created_at: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
      // 썸네일 대신 기본 이미지가 나오도록 함. 
      // 만약 유튜브 플레이어 아이콘 등을 표시하고 싶다면 skin logic 에 맞춰 임의의 값 세팅
      drive_url: "https://drive.google.com/file/d/placeholder-need-update/view"
    };
  });

  console.log("Inserting", posts.length, "records...");
  const { data, error } = await supabase.from("board_posts").insert(posts);
  if (error) {
    console.error("Error inserting data:", error);
  } else {
    console.log("Successfully inserted", files.length, "drone videos!");
  }
}

main();
