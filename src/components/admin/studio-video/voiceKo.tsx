"use client";

// 성우 목록 한국어로 · 그림 얼굴 (2026-10-30 사장님: 일레븐랩스·타입캐스트 성우 이름이 영어라 읽기 어렵고, 얼굴이 첫 글자뿐)
//  - 이름: "Joon Park - Inviting and Measured" → "박준" + "친근하고 차분한". 로마자 한국 이름을 음절 사전으로 한글로 (모르는 이름은 그대로)
//  - 꼬리표·나이: 자주 쓰는 영어 낱말을 우리말로
//  - 얼굴: 실제 사람 사진이 아니라 우리가 그린 단순한 그림 (성별·나이로 모양, 성우마다 색이 달라 서로 구별)
import React from "react";

const SURNAME: Record<string, string> = {
  park: "박", bak: "박", kim: "김", gim: "김", lee: "이", yi: "이", rhee: "이", choi: "최", choe: "최", jung: "정", jeong: "정", chung: "정", kang: "강", gang: "강",
  cho: "조", jo: "조", yoon: "윤", yun: "윤", jang: "장", chang: "장", lim: "임", im: "임", han: "한", oh: "오", seo: "서", suh: "서", shin: "신", sin: "신",
  kwon: "권", gwon: "권", hwang: "황", ahn: "안", an: "안", song: "송", ryu: "류", yoo: "유", yu: "유", hong: "홍", jeon: "전", jun: "전", moon: "문", mun: "문",
  yang: "양", son: "손", bae: "배", baek: "백", paik: "백", heo: "허", huh: "허", nam: "남", noh: "노", roh: "노", ha: "하", kwak: "곽", sung: "성", seong: "성",
  cha: "차", woo: "우", min: "민", ko: "고", go: "고", ku: "구", koo: "구", na: "나", do: "도", ma: "마", byun: "변", byeon: "변", eom: "엄", um: "엄", ji: "지",
};
const SYL: Record<string, string> = {
  joon: "준", jun: "준", ji: "지", min: "민", seo: "서", yeon: "연", yun: "윤", yoon: "윤", hyun: "현", hyeon: "현", woo: "우", u: "우", soo: "수", su: "수",
  young: "영", yeong: "영", jin: "진", ho: "호", hee: "희", hui: "희", eun: "은", ha: "하", na: "나", ra: "라", mi: "미", so: "소", da: "다", yu: "유", yoo: "유",
  jae: "재", sung: "성", seong: "성", hoon: "훈", hun: "훈", won: "원", chan: "찬", kyung: "경", kyeong: "경", gyeong: "경", sook: "숙", suk: "숙", ae: "애",
  in: "인", tae: "태", dong: "동", sang: "상", il: "일", deok: "덕", duk: "덕", pal: "팔", cha: "차", bin: "빈", hye: "혜", bo: "보", ram: "람", a: "아", ah: "아",
  ri: "리", ran: "란", hwa: "화", gyu: "규", kyu: "규", je: "제", se: "세", ye: "예", rin: "린", lin: "린", seok: "석", sik: "식", ki: "기", gi: "기", mo: "모",
  chul: "철", cheol: "철", myung: "명", myeong: "명", jung: "정", jeong: "정", han: "한", sol: "솔", byul: "별", byeol: "별", kang: "강", nam: "남", gu: "구",
  ok: "옥", yong: "용", hyo: "효", jeon: "전", heon: "헌", hyuk: "혁", hyeok: "혁", wook: "욱", uk: "욱", bum: "범", beom: "범", geun: "근", keun: "근",
  ju: "주", joo: "주", si: "시", hyang: "향", yeo: "여", reum: "름", eum: "음", kyo: "교", gyo: "교", hae: "해", mun: "문", moon: "문", ga: "가", ka: "가",
  ye_: "예", nu: "누", ni: "니", hi: "히", rae: "래", lae: "래", san: "산", shin: "신", sin: "신", ung: "웅", woong: "웅", ung_: "웅", yeop: "엽", seul: "슬",
  bi: "비", ro: "로", eon: "언", un: "운", jo: "조", cho: "초", nari: "나리", sora: "소라", mina: "미나", yuna: "유나", jisoo: "지수", mirae: "미래", haeun: "하은",
  sora_: "소라", miso: "미소", hana: "하나", dami: "다미",
  chang: "창", hyung: "형", hyeong: "형", chung: "충", man: "만", do: "도", yo: "요", seung: "승", yeol: "열", ryeol: "렬", gun: "건", geon: "건",
};
/** 영어식 이름은 소리 나는 대로 (Jennie → 제니) — 인기 한국어 성우 이름에 많다 */
const EN_NAME: Record<string, string> = {
  jennie: "제니", jenny: "제니", jason: "제이슨", theo: "테오", sunny: "써니", selly: "셀리", sally: "샐리", chris: "크리스", anna: "애나", john: "존", james: "제임스",
  daniel: "다니엘", david: "데이비드", grace: "그레이스", sophia: "소피아", emily: "에밀리", lucy: "루시", amy: "에이미", kevin: "케빈", brian: "브라이언", eric: "에릭",
  tony: "토니", leo: "레오", max: "맥스", luna: "루나", olivia: "올리비아", ella: "엘라", mark: "마크", paul: "폴", peter: "피터", sam: "샘", alex: "알렉스",
};
/** 로마자 한 낱말 → 한글 음절들 (가장 긴 것부터 맞춤). 못 바꾸면 null */
function syllables(w: string): string | null {
  const s = w.toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return null;
  const memo = new Map<number, string | null>();
  const go = (i: number): string | null => {
    if (i === s.length) return "";
    if (memo.has(i)) return memo.get(i)!;
    let best: string | null = null;
    for (let n = Math.min(6, s.length - i); n >= 1 && best === null; n--) {
      const h = SYL[s.slice(i, i + n)];
      if (!h) continue;
      const rest = go(i + n);
      if (rest !== null) best = h + rest;
    }
    memo.set(i, best);
    return best;
  };
  return go(0);
}
/** 영어로 적힌 한국 이름 → 한글 ("Joon Park" → "박준", "Deokpal" → "덕팔", "Hojin Lim" → "임호진"). 못 바꾸면 그대로 */
export function koName(raw: string): string {
  const name = raw.replace(/\s*\(.*?\)\s*/g, " ").trim(); // "Chris (구 KKC HQ)" → "Chris"
  if (!name || /[가-힣]/.test(name)) return name;
  const ws = name.split(/[\s-]+/).filter(Boolean);
  if (!ws.length || ws.length > 3) return name;
  if (/^[A-Z]{2,}$/.test(name)) return name; // KKC 같은 약자는 그대로
  const en = (w: string) => EN_NAME[w.toLowerCase()];
  if (ws.length === 1) return en(ws[0]) || syllables(ws[0]) || name;
  if (en(ws[0])) { const s2 = ws.slice(1).map((w) => SURNAME[w.toLowerCase()] || en(w) || syllables(w)); if (s2.every(Boolean)) return `${en(ws[0])} ${s2.join("")}`; }
  // "Soo hyun" · "Hyun Bin" · "Do Hyeon" 처럼 이름만 띄어 쓴 것 (성이 아닌 두 음절) — 붙여서
  const joined = syllables(ws.join(""));
  if (joined && !SURNAME[ws[ws.length - 1].toLowerCase()] && ws.every((w) => w.length <= 5)) return joined;
  // 성이 뒤 (서양식) 또는 앞
  const last = ws[ws.length - 1].toLowerCase(), first = ws[0].toLowerCase();
  // 앞뒤가 다 성 같으면(Cha Woo) 적힌 순서 그대로 (차우)
  if (SURNAME[last] && SURNAME[first] && ws.length === 2) { const g = ws.map(syllables); if (g.every(Boolean)) return g.join(""); }
  if (SURNAME[last]) { const g = ws.slice(0, -1).map(syllables); if (g.every(Boolean)) return SURNAME[last] + g.join(""); }
  if (SURNAME[first]) { const g = ws.slice(1).map(syllables); if (g.every(Boolean)) return SURNAME[first] + g.join(""); }
  const all = ws.map(syllables);
  return all.every(Boolean) ? all.join("") : name;
}
const WORD: Record<string, string> = {
  calm: "차분한", clear: "또렷한", steady: "안정된", inviting: "친근한", measured: "침착한", diplomatic: "정중한", positive: "밝은", warm: "따뜻한", friendly: "친근한",
  energetic: "활기찬", bright: "밝은", soft: "부드러운", gentle: "부드러운", deep: "낮고 깊은", professional: "전문적인", confident: "자신감 있는", natural: "자연스러운",
  cheerful: "명랑한", serious: "진지한", authoritative: "믿음직한", smooth: "매끄러운", lively: "생동감 있는", young: "젊은", mature: "성숙한", narrator: "내레이션",
  news: "뉴스", conversational: "대화하듯", expressive: "표현이 풍부한", trustworthy: "믿음직한", sweet: "달콤한", crisp: "산뜻한", relaxed: "편안한", engaging: "몰입감 있는",
  storyteller: "이야기꾼", standard: "표준", reliable: "믿음직한", pleasant: "기분 좋은", kind: "다정한", lovely: "사랑스러운", cute: "귀여운", strong: "힘 있는",
  emotional: "감성적인", dynamic: "역동적인", casual: "편한", formal: "격식 있는", polite: "공손한", soothing: "편안한", husky: "허스키한", rich: "풍부한", firm: "단단한",
  playful: "장난스러운", sincere: "진심 어린", elegant: "우아한", charming: "매력적인", balanced: "균형 잡힌", neutral: "담백한", articulate: "또박또박한", upbeat: "경쾌한",
};
const SKIP = new Set(["and", "a", "an", "the", "voice", "korean", "male", "female", "with", "tone", "of", "for", "s", "30s", "20s", "40s", "50s"]);
/** 영어 설명 → 우리말 ("Inviting and Measured" → "친근하고 침착한"). 반 넘게 모르면 원래 글 */
export function koDesc(raw: string): string {
  const ws = raw.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w && !SKIP.has(w));
  if (!ws.length) return "";
  const ko = ws.map((w) => WORD[w]).filter(Boolean) as string[];
  if (ko.length * 2 < ws.length) return raw.trim();
  const uniq = [...new Set(ko)];
  // "친근한, 침착한" → "친근하고 침착한"
  return uniq.map((k, i) => (i < uniq.length - 1 && k.endsWith("한") ? `${k.slice(0, -1)}하고` : k)).join(" ");
}
/** 성우 이름 줄 나누기 — "이름 - 설명" · "이름 — 설명" · "이름, 설명" */
export function koVoice(raw: string): { name: string; desc: string } {
  const m = raw.match(/^(.+?)\s*(?:[-—–|]|,\s)\s*(.+)$/);
  if (!m) return { name: koName(raw), desc: "" };
  return { name: koName(m[1]), desc: koDesc(m[2]) };
}
const TAG: Record<string, string> = {
  social_media: "SNS", narrative_story: "이야기체", calm: "차분함", standard: "표준", conversational: "대화체", news: "뉴스", informative_educational: "교육·설명",
  advertisement: "광고", characters_animation: "캐릭터", entertainment_tv: "예능", meditation: "명상", audiobook: "오디오북", narration: "내레이션", "ko-seoul": "서울말",
  ko: "한국어", seoul: "서울말", gyeongsang: "경상도", jeolla: "전라도", professional: "전문가", young: "젊은", warm: "따뜻함", upbeat: "경쾌함", deep: "낮은 목소리",
};
export const koTag = (t: string) => TAG[t.toLowerCase().replace(/^#/, "")] || t;
export const AGE_KO: Record<string, string> = { child: "어린이", teenager: "10대", young: "청년", young_adult: "청년", middle_aged: "중년", middle_age: "중년", old: "노년", elder: "노년", elderly: "노년" };

/* ── 그림 얼굴 ── */
const hashS = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 11);
const BGS = ["#5B4B9A", "#2F6F8F", "#3E7C59", "#9A5B4B", "#7A4B8F", "#4B6A9A", "#8F7A2F", "#2F8F86"];
const SKINS = ["#F6D3B3", "#EFC39E", "#E6B48D", "#F3CBA8"];
const HAIRS = ["#2B211C", "#3B2A20", "#1E1A18", "#5A3A26"];
/** Flow 로 만든 성우 얼굴 그림 (2026-10-30 사장님) — public/studio-voices/el/<voice_id>.webp. 새로 만들면 여기에 id 만 더한다 */
const EL_PHOTOS = new Set([
  "0mlAtfsvMzFpppUuNWkV", "0oqpliV6dVSr9XomngOW", "1KNqBv4TutQtzSIACsMC", "1W00IGEmNmwmsDeYy7ag", "3MTvEr8xCMCC2mL9ujrI", "4JJwo477JUAx3HV0T7n7",
  "4p0HBzAAGyju0nYfNntV", "5I7B1di44aCL15NkP0jn", "5n5gqmaQi9Ewevrz7bOS", "7Nah3cbXKVmGX7gQUuwz", "8MwPLtBplylvbrksiBOC", "8jHHF8rMqMlg8if2mOUe",
  "AW5wrnG1jVizOYY7R1Oo", "BaW4Cx7nYOh1XNVQBrK2", "BbsagRO6ohd8MKPS2Ob0", "BpHR2xqius01V38lkvV9", "CwhRBWXzGAHq8TQ4Fs17", "CxErO97xpQgQXYmapDKX",
  "D11AWvkESE7DJwqIVi7L", "ETPP7D0aZVdEj12Aa7ho", "EXAVITQu4vr4xnSDxMaL", "F7wT70V3u09d2rY9pNa6", "FGY2WhTYpPnrIDTdsKH5", "FQ3MuLxZh0jHcZmA5vW1",
  "IKne3meq5aSn9XLyUdCD", "Ir7oQcBXWiq4oFGROCfj", "JBFqnCBsd6RMkjVDRZzb", "K3qo7ugXmpT87FDhLBbN", "KlstlYt9VVf3zgie2Oht", "Lb7qkOn5hF8p7qfCDH8q",
  "MpbDJfQJUYUnp0i1QvOZ", "N2lVS1w4EtoT3dr4eOWO", "Nhs7eitvQWFTQBsf0yiT", "OEaq3WGNtNvFJ5co9mJE", "PDoCXqBQFGsvfO0hNkEs", "QPFsEL6IBxlT15xfiD6C",
  "RU7aSi6lT4uQBXMLgDxK", "SAz9YHcvj6GT2YYXdXww", "SOYHLrjzK2X1ezoPC6cr", "TX3LPaxmHKxFdv7VOQHJ", "U1cJYS4EdbaHmfR7YzHd", "WqVy7827vjE2r3jWvbnP",
  "WzMnDIgiICcj1oXbUBO0", "Xb7hH8MSUJpSbSDYk0k2", "XrExE9yKIg1WjnnlVkGX", "YBRudLRm83BV5Mazcr42", "ZJCNdZEjYwkOElxugmW2", "ZNSVYmudV9pOqphY0x8C",
  "ZZ4xhVcc83kZBfNIlIIz", "bIHbv24MWmeRgasZH58o", "bciERhbhQhAIWwvnQA7H", "cgSgspJ2msm6clMCkdW9", "cjVigY5qzO86Huf0OWal", "fHzGR8qcnsDR2uaj9r16",
  "fLvpMIGwcTmxzsUF4z1U", "hWXqitL3DEOLD49pgNWR", "hpp4J3VqNfWAUOO0d1Us", "iP95p4xoKVk53GoZ742B", "iWLjl1zCuqXRkW6494ve", "jB1Cifc2UQbq1gR3wnb0",
  "ksaI0TCD9BstzEzlxj4q", "m3gJBS8OofDJfycyA2Ip", "mActWQg9kibLro6Z2ouY", "mYk0rAapHek2oTw18z8x", "nPczCjzI2devNBz1zQrb", "nbrxrAz3eYm9NgojrmFK",
  "onwK4e9ZLuTAKqWW03F9", "pFZP5JQG7iQjIQuC4Bku", "pNInz6obpgDQGcFmaJgB", "pb3lVZVjdFWbkhPKlelB", "pqHfZKP75CvOlQylNhV4", "s07IwTCOrCDCaETjUVjx",
  "sQ3a15DhENXU8pKTHlcc", "sf8Bpb1IU97NI9BHSMRf", "tIXHSlSWOafJawXSV1g4", "tl7lnnI5ADFNMMxMdzil", "uyVNoMrnUku1dZyVEXwD", "v1jVu1Ky28piIPEJqRrm",
  "wzMVIc8FAFmgMxFpN0uM", "xMFDeM9Ex3CdGGx9m3uS", "z6Kj0hecH20CdetSElRT", "zgDzx5jLLCqEp6Fl7Kl7",
]);
/** 성우 얼굴 — 만들어 둔 그림이 있으면 그 그림, 없으면 우리가 그린 단순한 얼굴 */
export function VoiceAvatar({ seed, gender, age, size = 56, name }: { seed: string; gender?: string; age?: string; size?: number; name?: string }) {
  const pid = String(seed || "").replace(/^el_/, "");
  const [bad, setBad] = React.useState(false);
  const [big, setBig] = React.useState(false); // 누르면 크게 (2026-10-30 사장님)
  if (EL_PHOTOS.has(pid) && !bad) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/studio-voices/el/${pid}.webp`} alt="" width={size} height={size} onError={() => setBad(true)} title="누르면 크게 보여요"
          onClick={(e) => { e.stopPropagation(); setBig(true); }}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block", cursor: "zoom-in" }} />
        {big && (
          <div onClick={(e) => { e.stopPropagation(); setBig(false); }} onKeyDown={(e) => { if (e.key === "Escape") setBig(false); }} tabIndex={-1}
            style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
            <div style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/studio-voices/el/big/${pid}.webp`} onError={(e) => { (e.currentTarget as HTMLImageElement).src = `/studio-voices/el/${pid}.webp`; }} alt={name || ""}
                style={{ width: "min(420px, 80vw)", height: "min(420px, 80vw)", borderRadius: 24, objectFit: "cover", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", display: "block" }} />
              {name && <div style={{ marginTop: 14, color: "#fff", fontSize: 20, fontWeight: 800 }}>{name}</div>}
              <div style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 13 }}>아무 곳이나 누르면 닫혀요</div>
            </div>
          </div>
        )}
      </>
    );
  }
  return <DrawnAvatar seed={seed} gender={gender} age={age} size={size} />;
}
/** 성우 그림 얼굴 (단순) — gender "female"/"male", age 영어 그대로(young·middle_aged·old 등) */
function DrawnAvatar({ seed, gender, age, size = 56 }: { seed: string; gender?: string; age?: string; size?: number }) {
  const h = hashS(seed || "v");
  const f = String(gender || "").toLowerCase() === "female";
  const a = AGE_KO[String(age || "").toLowerCase()] || "";
  const old = a === "노년", mid = a === "중년";
  const bg = BGS[h % BGS.length], skin = SKINS[(h >> 3) % SKINS.length];
  const hair = old ? "#C9C9C9" : mid && (h >> 5) % 3 === 0 ? "#4A4A4A" : HAIRS[(h >> 5) % HAIRS.length];
  const shirt = ["#F2F2F2", "#FFD166", "#8ECAE6", "#F4A6B8", "#B8E0A0"][(h >> 7) % 5];
  const style = (h >> 9) % 3;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0, borderRadius: "50%", display: "block" }} aria-hidden>
      <circle cx="50" cy="50" r="50" fill={bg} />
      {/* 긴 머리 (여성) — 얼굴 뒤 */}
      {f && <path d={style === 2 ? "M24 46 Q24 18 50 18 Q76 18 76 46 L78 70 Q66 76 60 66 L40 66 Q34 76 22 70 Z" : "M25 48 Q25 18 50 18 Q75 18 75 48 L77 84 L23 84 Z"} fill={hair} />}
      {/* 옷 · 목 */}
      <path d="M18 100 Q20 76 50 74 Q80 76 82 100 Z" fill={shirt} />
      <rect x="43" y="62" width="14" height="14" rx="5" fill={skin} />
      {/* 얼굴 */}
      <ellipse cx="50" cy="48" rx="20" ry="23" fill={skin} />
      {/* 앞머리 */}
      {f ? <path d={style === 1 ? "M29 44 Q31 22 50 22 Q69 22 71 44 Q60 30 50 34 Q40 30 29 44 Z" : "M29 46 Q30 22 50 22 Q70 22 71 46 Q66 32 56 30 Q44 38 29 46 Z"} fill={hair} />
        : old && style === 0 ? <path d="M30 40 Q32 26 40 30 M60 30 Q68 26 70 40" stroke={hair} strokeWidth="6" fill="none" strokeLinecap="round" />
        : <path d={style === 2 ? "M29 44 Q28 22 50 21 Q72 22 71 44 Q66 30 50 31 Q36 30 29 44 Z" : "M29 42 Q30 20 52 21 Q72 23 71 42 Q62 28 46 32 Q36 34 29 42 Z"} fill={hair} />}
      {/* 눈 · 입 */}
      <circle cx="42" cy="50" r="2.4" fill="#2B211C" />
      <circle cx="58" cy="50" r="2.4" fill="#2B211C" />
      {mid || old ? <path d="M37 44 L46 44 M54 44 L63 44" stroke={hair} strokeWidth="1.6" strokeLinecap="round" /> : null}
      <path d={f ? "M44 59 Q50 64 56 59" : "M44 60 Q50 63 56 60"} stroke="#B5534A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {f && <><circle cx="38" cy="56" r="3" fill="#F29C9C" opacity="0.45" /><circle cx="62" cy="56" r="3" fill="#F29C9C" opacity="0.45" /></>}
      {old && <path d="M40 66 Q50 70 60 66" stroke="#C9A58A" strokeWidth="1.2" fill="none" />}
    </svg>
  );
}
