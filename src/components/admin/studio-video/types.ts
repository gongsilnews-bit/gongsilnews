// 영상 편집기 자료 모양 — 앱(studio-app/src/video/project.js)과 같다
export type Ratio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3";
export type Method = "text" | "video" | "longform" | "record" | "audio"; // audio = 오디오로 편집하기 (2026-10-20)
export type Fill = "cover" | "contain" | "blur";
// 사진 움직임 (브루처럼) — auto = 사진 클립 차례대로 줌인·좌→우·줌아웃·우→좌·위→아래 를 돌려 쓴다
export type Motion = "auto" | "none" | "zoomIn" | "zoomOut" | "leftRight" | "rightLeft" | "topBottom" | "bottomTop";
export type MotionPower = "low" | "mid" | "high";
// 사진 올리기·화면 글자 애니메이션 (브루처럼) — 등장·퇴장 / 강조 / 확대. auto = 레이어 차례대로 돌려 쓰기
export type AnimIn = "auto" | "fade" | "fly" | "zoom" | "pop" | "spin" | "flip" | "roll" | "drop" | "slideL" | "slideR" | "big" | "stretch" | "swing" | "jelly";
export type LayerAnim = {
  in?: AnimIn; out?: AnimIn; emph?: "pulse" | "shake" | "blink" | "float" | "sway" | "bounce" | "beat" | "wiggle"; grow?: "grow" | "shrink"; dur?: number /* 등장·퇴장 걸리는 초 (기본 0.5) */;
  // 효과음 — 나타날 때 (auto = 효과에 맞게, none = 없음, 그 밖 = 소리 이름 public/studio-sfx). 없으면 사진·글자는 자동, 자막은 없음
  sfx?: string; sfxVol?: number /* 0~1, 기본 0.6 */; sfxOut?: boolean /* 사라질 때도 */;
  // 단어별 (쇼츠식, 메인자막) — 말하는 때에 맞춰 한 단어씩 나타나기 · 지금 단어 강조 (2026-10-19 회의)
  wshow?: "word" | "line"; whl?: "color" | "big" | "both"; wcolor?: string /* 강조색, 기본 노랑 */; wgap?: number /* 직접 쓴 자막 — 줄(단어는 절반) 사이 초, 기본 0.6 */;
};

/**
 * 키프레임 (캡컷처럼, 2026-10-20 사장님) — 그 시각의 모습 한 장. 점과 점 사이는 저절로 채운다
 *  t: 시각 (레이어 = 나타난 때부터 초, 클립 화면 = 클립 처음부터 초)
 *  x·y: 가운데 자리 (화면 0~1) · s: 크기 배수 (1 = 원래 크기) · r: 회전 (도, 시계 방향 +) · o: 진하기 배수 (0~1)
 *  e: 다음 점까지 움직이는 방식 — 일정하게(linear) · 부드럽게(inout) · 천천히 시작(in) · 천천히 끝(out)
 */
/** 자르기 — 원본의 왼쪽·위·오른쪽·아래를 비율(0~1)로 잘라 낸다 (프리미어 효과 컨트롤 [자르기]) */
export type Crop = { l?: number; t?: number; r?: number; b?: number };
export type Ease = "linear" | "inout" | "in" | "out";
/** only — 이 점이 정하는 항목만 (캡컷처럼 항목마다 ◇, 2026-10-20). 없으면 모든 항목. 정하지 않은 항목 값은 무시한다 */
export type KfProp = "x" | "y" | "s" | "r" | "o";
export type Keyframe = { t: number; x: number; y: number; s: number; r: number; o: number; e?: Ease; only?: KfProp[] };
/**
 * 색 보정·필터 (캡컷 [필터]·[조정]) — 미리보기와 완성 영상이 같은 색 행렬 하나로 (timeline.adjMatrix)
 *  f: 필터 이름 · fi: 필터 세기 0~1 · b: 밝기 -1~1 · c: 대비 -1~1 · s: 채도 -1~1 · t: 색온도 -1(차갑게)~1(따뜻하게) · g: 색조 -1(초록)~1(보라)
 */
export type Adjust = { f?: string; fi?: number; b?: number; c?: number; s?: number; t?: number; g?: number };

export type Word = { w: string; s: number; e: number; del?: boolean; o?: [number, number] /* 상세 편집 전 처음 시각 (↺ 처음대로) */; v?: string /* AI 목소리 — 이 단어만 다른 목소리 (클립은 그대로, 소리 안에서 잇는다) */; fix?: boolean /* 프롬프터 대본으로 맞춤법을 고친 낱말 (밑줄) */ };

export type Asset = {
  id: string;
  path: string;
  edit?: string;
  url: string;
  thumb?: string;
  kind: "video" | "image" | "audio";
  name: string;
  duration: number;
  width: number;
  height: number;
  hasAudio?: boolean;
  source?: string;
  credit?: string;
  missing?: boolean;
};

export type Clip = {
  id: string;
  type: "source" | "silence" | "voice";
  text: string;
  words?: Word[];
  src?: { asset: string; s: number; e: number };
  trans?: { type: string; a: number; b: number; sfx?: string /* 전환 효과음 (public/studio-sfx 이름) */ }; // 앞 클립에서 이 클립으로 넘어가는 화면전환 — 앞 클립 끝 a초 + 이 클립 시작 b초 (transitions.ts)
  cuts?: { s: number; e: number }[]; // 무음 줄이기로 건너뛰는 구간 (원본 시각) — 원래대로 하면 지운다
  // o: 소리 파일 안 시작 초 (클립을 나눠도 목소리를 다시 만들지 않고 같은 파일의 이 구간만 튼다, 2026-10-20) · duration = 이 구간 길이
  // ng: 뒤에 쉼(문장 사이 쉼)을 두지 않는다 — 나눈 앞 조각 (말이 뒤 조각으로 바로 이어진다)
  voice?: { file: string; url?: string; duration: number; id: string; text: string; o?: number; ng?: boolean } | null;
  voiceId?: string; // 클립만 다른 목소리
  speed?: number; // 클립만 다른 빠르기 (AI 목소리 클립: 목소리 빠르기 / 촬영 클립: 영상·소리 빠르기 0.5~2)
  pad?: number; // AI 목소리 클립 끝에 더 머무는 시간 (초) — 클립 길이를 늘릴 때
  visual?: { asset: string; s: number; e?: number /* 끝 (앞뒤 자르기) — 넘으면 끝 장면에서 멈춤 */ } | null; // 화면 자료 (글 클립 배경 · 촬영 클립 화면 바꾸기)
  blank?: boolean; // 빈칸으로 두기 — AI 채우기·자동 편집이 화면을 넣지 않는다. 촬영 클립이면 화면만 검게(opacity 0, 소리는 그대로) · 2026-10-21 사장님
  visualLead?: number; // 앞 클립 영상이 모자란 끝부분(초)을 이 클립 영상으로 앞당겨 채운다 — 컷편집처럼 앞 클립 끝에서 미리 시작 (visual.s = 이 클립 자기 부분 시작, 2026-10-21 사장님)
  visualCont?: boolean; // 앞 클립과 같은 화면 영상을 이어서 (시작점 = 앞 클립 시작 + 앞 클립 길이, 길이가 바뀌면 다시 맞춘다 · 2026-10-21 사장님)
  visualHold?: boolean; // 화면 영상이 클립보다 짧으면 마지막 장면에서 멈춤 (없으면 처음부터 반복) — AI 편집 화면 채우기 (2026-10-21)
  fillFrom?: "mine" | "stock" | "ai" | "reuse" | "vacancy"; // AI 편집 화면 채우기 — 어디서 온 화면인지 (화면 편집판 표시)
  // AI 편집 화면 편집판 — 클립마다 장면 설명(영어 프롬프트, 2026-10-21 사장님: 내 화면을 넣은 클립도 다 만들어 둔다)
  //  kind 자동·배경·인물·그래프 · style 이 클립만 다른 그림 스타일 (없으면 왼쪽) · media 사진/영상 (AI 영상은 나중에) · by 설명을 만든 스타일 · hand 회원이 직접 고침
  aiPic?: { prompt: string; kind?: "auto" | "background" | "character" | "graph"; style?: string; media?: "image" | "video"; by?: string; hand?: boolean; stale?: boolean /* 자동·배경·인물·그래프를 바꿈 — 그릴 때 다시 쓴다 */;
    motion?: string /* 동영상 프롬프트 — 사진을 어떻게 움직일지 (영어) */; motionId?: string /* 고른 움직임 견본 */ };
  hold?: number; // 목소리 없을 때 길이
  fitLen?: number; // 영상 위에 AI 목소리를 얹은 클립 — 이 길이(영상 구간)에 맞춘다 (목소리가 짧으면 끝에 머물기 pad)
  fill?: Fill;
  box?: { x: number; y: number; w: number }; // 화면 직접 크기 — 가운데 자리(0~1)·폭(화면 폭 비율). 있으면 채우기 대신 이 자리에
  flipX?: boolean; // 화면 좌우 반전
  flipY?: boolean; // 화면 상하 반전
  rot?: number; // 화면 회전 (도, 시계 방향 +) — 미리보기 회전 손잡이·타임라인 [회전]
  opacity?: number; // 화면 진하기 0~1 (검은 바탕 위, 기본 1)
  kf?: Keyframe[]; // 화면 키프레임 — 있으면 자리·크기·회전·진하기가 시간에 따라 (사진 자동 움직임은 쉰다)
  card?: "end" | "intro" | "outro" | "pause"; // AI 편집이 넣은 칸 — 끝 화면(중개사무소 정보) · 인트로 · 아웃트로 · 중간 쉼 (2026-10-21). 다시 AI 편집하면 고쳐 쓴다
  adj?: Adjust; // 색 보정·필터
  crop?: Crop; // 자르기 (프리미어 효과 컨트롤) — 원본 화면의 가장자리를 잘라 낸다 (잘린 곳은 아래가 보인다)
  subKf?: Keyframe[]; // 메인자막 키프레임 (클립 처음부터 초) — 자리·크기·회전·진하기
  motion?: Motion; // 사진 움직임 — 없으면 전체 설정(settings.motion, 기본 자동)
  motionPower?: MotionPower; // 움직임 크기 (기본 보통)
  muted?: boolean;
  volume?: number;
  visualVolume?: number; // 첨부한 화면 영상의 소리 (0~2, 없으면 0 = 무음) — 원본 메인 소리(말소리·AI 목소리)와 섞인다
  sub?: boolean;
  subStyle?: Partial<SubtitleSettings>; // 이 클립만 따로 바꾼 메인자막 서식 (바꾼 항목만, 나머지는 전체 서식)
  subText?: string; // 자막만 따로 쓴 글 (말소리·목소리는 그대로). 무음 클립에도 자막을 넣을 수 있다
  del?: boolean;
  hint?: { desc?: string; keywords?: string; kind?: string };
};

export type Scene = { id: string; title?: string; clips: Clip[] };

/**
 * 애셋(레이어) — 브루처럼 "클립 몇 번부터 몇 번까지"에 붙는 음악·사진·화면 글자.
 * 범위를 클립으로 잡아서 단어를 지우거나 클립 길이가 바뀌어도 저절로 따라간다.
 */
export type LayerType = "music" | "image" | "text" | "sfx"; // sfx = 효과음 (그 클립·단어 시작에 한 번, 회의 3-29)
/** 영상 이어 깔기 묶음 — items: 영상 차례 (vs·ve = 쓸 구간), end: 영상을 다 써도 모자라면 loop(처음부터 다시) / stop(거기서 끝) */
export type Roll = { id: string; from: string; to: string; items: { asset: string; vs?: number; ve?: number }[]; end?: "loop" | "stop"; volume?: number };
export type Layer = {
  id: string;
  type: LayerType;
  /** 영상 이어 깔기 묶음 id (Project.rolls) — 이 레이어는 묶음에서 저절로 만들어진다 (손으로 고치면 다음에 다시 만들어져 사라짐) */
  roll?: string;
  /** 앞당겨 채우기 조각 — 이 클립 id 의 visualLead 로 저절로 만들어진다 */
  lead?: string;
  from: string; // 시작 클립 id
  to: string; // 끝 클립 id
  // 단어 구간 (브루 [삽입]처럼) — 있으면 from 클립의 w0번째 단어부터 w1번째 단어를 말하는 동안만 나온다
  w0?: number;
  w1?: number;
  // 초 단위 구간 (타임라인에서 끌어 옮긴 것) — ts: from 클립 처음에서 몇 초 뒤에 나타나기, te: to 클립 처음에서 몇 초에 사라지기 (없으면 끝까지)
  //  클립에 붙어 있어서 앞 클립 글을 지우면 같이 움직인다 (회의 10-19 5장 3)
  ts?: number;
  te?: number;
  kf?: Keyframe[]; // 키프레임 — 있으면 자리·크기·회전·진하기가 시간에 따라 (t = 나타난 때부터 초)
  // 타임라인 트랙 (2026-10-20, 프리미어처럼) — 사진·스티커·글자·올린 영상 = V 트랙 번호(2부터, V1 = 메인), 음악·효과음 = A 트랙 번호(3부터, A1 = 메인 영상 소리, A2 = AI 목소리)
  //  겹치는 순서는 layers 배열 순서 그대로 (트랙을 옮기면 배열 순서도 맞춘다 — 텍스트 편집·굽기는 바뀐 것 없이 같은 결과)
  track?: number;
  crop?: Crop; // 자르기 (사진·스티커·올린 영상)
  vs?: number; // 올린 영상 — 영상 안 시작 초 (타임라인 V2 위, 화면 속 화면)
  muted?: boolean; // 올린 영상 소리 끄기
  name?: string;
  // 음악
  file?: string;
  url?: string;
  volume?: number; // 0~1
  fadeIn?: number; // 초
  fadeOut?: number; // 초
  offset?: number; // 음악 시작 지점 (초)
  loop?: boolean;
  // 사진
  asset?: string;
  sfx?: string; // 효과음 이름 (public/studio-sfx · studio-app/src/video/sfx 의 파일 이름)
  clicks?: number[]; // 누르는 소리 — 나온 때부터 이 초마다 큰 딸깍 (구독·좋아요 그래픽)
  sticker?: boolean; // [삽입] → 그래픽으로 넣은 것 (사진 레이어와 같이 그리고, 이름·아이콘만 "그래픽")
  stk?: { style: string; text: string; icon?: string; color?: string }; // 스티커 모양 — 넣은 뒤 글자를 고치면 이것으로 다시 그린다
  /** 굽기 때만 (저장 안 함) — 클립마다 애니메이션 칸 그림: dir 폴더의 00000.png… , s0(클립 안 시작 초), x·y(왼쪽 위) */
  bake?: Record<string, { dir: string; s0: number; n: number; x: number; y: number }>;
  x?: number; // 가운데 위치 0~1
  y?: number;
  w?: number; // 화면 폭에 대한 비율 0~1
  rot?: number; // 회전 (도, 시계 방향 +) — 미리보기 회전 손잡이 (2026-10-19 사장님)
  opacity?: number; // 0~1
  off?: boolean; // 레이어 끄기 (보이기·듣기) — 설정은 그대로
  lock?: boolean; // 잠금 — 미리보기에서 안 잡힘 (미리보기 오른쪽 클릭 [잠그기], 2026-10-21 사장님)
  anim?: LayerAnim; // 사진·화면 글자 애니메이션
  fit?: "free" | "contain" | "cover"; // free(기본) = x·y·w 자리 / contain = 비율 유지하며 채우기 / cover = 잘라서 채우기
  flipX?: boolean;
  flipY?: boolean;
  // 화면 글자
  text?: string;
  pos?: "top" | "middle" | "bottom";
  size?: number; // 100 = 기본
  color?: string;
  font?: string; // 글꼴 이름 (src/lib/studio-video/fonts.ts)
  box?: boolean; // 글자 뒤 상자
  boxColor?: string;
  boxOpacity?: number; // 0~1
  // 화면 글자 모양 더 (메인자막과 같은 이름, 회의 3-28) — 없으면 예전대로 (테두리 4, 검정/흰색 자동)
  outline?: string;
  outlineWidth?: number;
  bold?: boolean;
  shadow?: number; // 그림자 거리 (글자 크기 비율)
  shadowColor?: string;
  glow?: string; // 빛 색 ("" = 없음)
  spacing?: number; // 자간 (글자 크기 비율)
  italic?: boolean;
  underline?: boolean;
  textCase?: "upper" | "lower" | "title";
  align?: "left" | "center" | "right";
  textAlpha?: number;
  outlineAlpha?: number;
  bgPad?: number;
  shadowAlpha?: number;
  glowSize?: number;
  glowAlpha?: number;
  // 예능 자막 모양 (텍스트에도, 2026-10-20) — 메인자막과 같은 이름
  outline2?: string;
  outline2Width?: number;
  gradTo?: string;
  gradType?: "linear" | "radial" | "reflect";
  gradAngle?: number;
  gradA?: number;
  gradB?: number;
};

export type SubtitleSettings = {
  on: boolean; position: "top" | "middle-high" | "middle" | "middle-low" | "bottom"; /* middle-high = 중상단 (위에서 24%, 중하단과 짝) */ length: "long" | "short"; /** 한 화면 최대 줄 수 (1·2·3) — 있으면 length 대신 이것 (2026-10-19) */ maxLines?: 1 | 2 | 3; size: number; font: string; color: string; outline: string; outlineWidth: number; bg: boolean; bgColor?: string; bgOpacity?: number; bold: boolean;
  x?: number; y?: number; // 미리보기에서 끌어 옮긴 자리 (가운데 기준 0~1). 있으면 position 대신
  rot?: number; // 메인자막 회전 (도, 시계 방향 +) — 돌리면 x·y 자리로 바뀐다
  posAuto?: boolean; // 위치 자동 — 영상 비율에 맞춰 (세로 9:16·4:5 = 중하단, 나머지 = 하단). 비율을 바꾸면 따라간다
  wrap?: number; // 줄 너비 (1 = 기본, 0.3~1) — 한 줄 글자 수를 그만큼 줄인다
  spacing?: number; // 자간 — 글자 크기에 대한 비율 (-0.1~0.5, 0 = 기본)
  leading?: number; // 행간 — 줄 높이 = 글자 크기 × 이 값 (0.9~2.5, 없으면 1.25)
  italic?: boolean; // 기울임 (패턴 I)
  underline?: boolean; // 밑줄 (패턴 U)
  textCase?: "upper" | "lower" | "title"; // 대소문자 TT · tt · Tt (영어만)
  align?: "left" | "center" | "right"; // 정렬 (없으면 가운데)
  textAlpha?: number; // 글자 투명도 0~1 (0 = 진하게)
  outlineAlpha?: number; // 테두리 투명도 0~1 (0 = 진하게)
  bgPad?: number; // 상자 두께 (글자 둘레 여백 배수, 기본 1)
  shadowAlpha?: number; // 그림자 투명도 0~1 (0 = 진하게)
  glowSize?: number; // 빛 두께 (번지는 크기 배수, 기본 1)
  glowAlpha?: number; // 빛 투명도 0~1
  shadow?: number; // 그림자 거리 — 글자 크기에 대한 비율 (0 = 없음, 0.06 안팎) · 상자일 때는 안 씀
  shadowColor?: string;
  glow?: string; // 네온 빛 색 ("" = 없음) — 테두리를 그 색으로 번지게 (사전 설정 스타일, 2026-10-18)
  // 예능 자막 (2026-10-19 사장님) — 이중 테두리: 안쪽 테두리(outline) 바깥에 한 겹 더 · 그라데이션: 글자 위(color) → 아래(gradTo)
  outline2?: string; // 바깥 테두리 색
  outline2Width?: number; // 바깥 테두리 두께 (0 = 없음, 안쪽 테두리와 같은 단위)
  gradTo?: string; // 그라데이션 끝 색 ("" = 없음) — 시작 색은 글자 색(color)
  gradType?: "linear" | "radial" | "reflect"; // 모양 — 선형(기본) · 방사형 · 반사형 (포토샵처럼)
  gradAngle?: number; // 선형·반사형 각도 (CSS 와 같게 180 = 위→아래, 기본 180)
  gradA?: number; // 시작 투명도 0~1 (0 = 진하게)
  gradB?: number; // 끝 투명도 0~1
  tag?: string; // 머리 딱지 — 자막 위 왼쪽에 붙는 작은 글 (NEWS·속보 등, "" = 없음, 2026-10-22)
  tagColor?: string; // 머리 딱지 바탕 색
  anim?: LayerAnim; // 메인자막 애니메이션 — 자막 한 줄(조각)마다 나타나고 사라질 때
};

export type Settings = {
  fill: Fill;
  subtitle: SubtitleSettings;
  voice: { id: string; speed: number; volume: number; gap?: number /* 문장 사이 쉼 (초, 기본 0.4) */ };
  music: { on: boolean; mood?: string; file: string; url?: string; name: string; volume: number };
  sourceVolume: number;
  /** 사진 자동 움직임 — "none" 이면 끔 (클립에서 따로 고른 움직임은 그대로). 없으면 자동 */
  motion?: "auto" | "none";
  /** 레이어 켜고 끄기 (프리미어의 눈·스피커) — 클립마다 맞춘 값은 그대로 두고 이것만 켜고 끈다 */
  off?: { visual?: boolean; source?: boolean; voice?: boolean };
  /** 메인자막 잠금 — 미리보기에서 안 잡힘 (2026-10-21) */
  subLock?: boolean;
  /** 텍스트로 만들기 [AI가 다 꾸미기] — 편집 화면이 열리면 AI 편집(자막 스타일·효과·스티커)을 저절로 시작하고 지운다 */
  aiAuto?: boolean;
  /** 대본 쓰고 편집 [편집 요청 사항] — 편집 화면 AI 자동 편집이 이 요청으로 한 번 (영상 꾸미기에서 고른 것은 지킨다, 2026-10-22) */
  aiAutoReq?: { request: string; keepTrans: boolean };
};

export type Project = {
  v: number;
  id: string;
  name: string;
  file?: string; // .gss 파일 위치 (예전 폴더 방식이면 없음) — dir 은 보이지 않는 작업 폴더
  savedAt?: string; // 마지막으로 [저장]한 시각 (비면 한 번도 저장 안 한 새 프로젝트)
  method: Method;
  ratio: Ratio;
  vacancyId?: string;
  /** 영상 종류 — 대본 쓰고 편집하기에서 고른 갈래 (AI 편집 ① 처음 값, 2026-10-20) */
  kind?: "vacancy" | "news" | "topic";
  /** AI 편집 그림 스타일 [자동] — AI 가 대본을 읽고 고른 스타일 (모든 클립 같음, 2026-10-21) */
  aiStyle?: string;
  /** 이 영상 자료 — 대본 단계에서 모은 매물 사진·검증·지도·로드뷰·기사 캡쳐 (AI 편집 ② 에 저절로). 파일은 PC 원래 자리, 여기는 목록만 */
  materials?: LibItem[];
  /** 영상 이어 깔기 (컷편집처럼, 2026-10-21 사장님) — from~to 클립 구간에 영상을 시간 순서로 꽉 채워 깐다. 영상이 끝나는 순간 다음 영상 (클립 경계와 상관없이) */
  rolls?: Roll[];
  /** 오디오로 편집하기 — 편집 화면을 처음 열 때 받아쓰기(자동 자막)를 바로 시작한다 (한 번 하고 지운다) */
  autoSubOnOpen?: boolean;
  /** 녹화할 때 프롬프터 대본 — 받아쓰기 뒤 "거의 같은 낱말"만 대본 글자로 고치는 데 쓰고 지운다 (scriptFix.ts) */
  recScript?: string;
  createdAt: string;
  updatedAt: string;
  settings: Settings;
  assets: Record<string, Asset>;
  scenes: Scene[];
  layers?: Layer[];
  /** 1 = 겹치는 순서를 layers 배열 순서 그대로 (뒤→앞, 스티커·사진·화면 글자 함께). 없으면 예전대로 사진 먼저·글자 위 (회의 3-26) */
  layerZ?: number;
  /** 타임라인 트랙 (2026-10-20, 프리미어처럼) — v: V 트랙 수(1 = 메인만), a: A 트랙 수(2 = 메인 소리·AI 목소리), 이름·잠금 (화면 결과와는 상관없음) */
  tl?: { v?: number; a?: number; names?: Record<string, string>; lock?: string[] };
  dir: string;
  duration?: number;
  thumb?: string;
};

/** [AI 편집] 이 고를 수 있는 목록 — AI 는 이 안에서만 고른다 */
export type AiEditCatalog = { presets: { id: string; label: string }[]; ins: { id: string; label: string }[]; emphs: { id: string; label: string }[]; whl: { id: string; label: string }[]; stickers: { id: string; label: string }[]; sfx: { id: string; label: string }[]; examples: string[] };

/** 완성 영상 SNS 올리기 (2026-10-21) — text = 링크·출처·해시태그까지 붙인 최종 글 */
export type PostChannel = "youtube" | "instagram";
export type PostDraft = {
  youtube: { title: string; description: string; hashtags: string[]; text: string };
  instagram: { caption: string; hashtags: string[]; text: string };
  tail: { url: string; hasListing: boolean };
};
export type LibItem = { id: string; path?: string; name: string; kind: "video" | "image" | "audio"; source: string; fav: boolean; /** 내 폴더 (이름표) */ tags?: string[]; addedAt?: number; credit?: string; duration: number; width: number; height: number; url: string; thumb: string; ready: boolean };
export type LibTag = { id: string; name: string; count: number };
/** .gss 를 열 때 저장 안 한 고친 내용이 남아 있으면 — [이어서 열기 / 마지막 저장 상태로] 를 묻는다 */
export type Recover = { recover: true; file: string; name: string };
export const isRecover = (x: unknown): x is Recover => Boolean(x && (x as Recover).recover);
export type Folders = { projectDir: string; recordDir: string; exportDir: string; aiAudioDir?: string; defaults: { projectDir: string; recordDir: string; exportDir: string; aiAudioDir?: string } };
export type TrashItem = { id: string; name: string; from: string; at: string; deletedAt: string; thumb: string; ratio: Ratio; duration: number };
export type Recent = { dir: string; name: string; ratio: Ratio; method: Method; updatedAt: string; thumb: string; duration: number };
export type StockItem = { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string };

/** 위치 자동 — 세로(9:16·4:5)는 쇼츠·릴스 아래쪽 글·단추에 안 가리게 중하단, 나머지는 하단 */
export const autoSubPosition = (r?: string): "middle-low" | "bottom" => (r === "9:16" || r === "4:5" ? "middle-low" : "bottom");
export const RATIO_SIZE: Record<Ratio, [number, number]> = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350], "4:3": [1440, 1080] };
export const RATIO_LABEL: Record<Ratio, string> = { "16:9": "유튜브", "9:16": "쇼츠·릴스", "1:1": "정방형", "4:5": "인스타그램", "4:3": "클래식" };

/* 앱 통로 (preload gongsilStudio.video) */
export type VideoBridge = {
  lib: {
    list: (o?: { kind?: string; fav?: boolean; q?: string; source?: string }) => Promise<LibItem[]>;
    pick: (o?: { kinds?: "media" | "audio"; source?: "sfx" }) => Promise<(LibItem & { path?: string })[]>;
    /** 다운로드 폴더에서 since(ms) 이후 받은 소리 파일 · 내 음악에 넣기 — 0.1.11부터 */
    downloadsAudio?: (since: number) => Promise<{ path: string; name: string; at: number; size: number }[]>;
    addDownloads?: (files: string[], source?: "sfx") => Promise<LibItem[]>;
    fav: (id: string, fav: boolean) => Promise<boolean>;
    /** 내 폴더 (이름표 — 원본 파일은 그대로, 2026-10-22) */
    tags?: () => Promise<LibTag[]>;
    tagAdd?: (name: string) => Promise<LibTag[]>;
    tagRename?: (id: string, name: string) => Promise<LibTag[]>;
    tagRemove?: (id: string) => Promise<LibTag[]>;
    tagSet?: (ids: string[], tag: string, on: boolean) => Promise<LibTag[]>;
    remove: (id: string) => Promise<void>;
    folders: () => Promise<string[]>;
    addFolder: () => Promise<string[]>;
    removeFolder: (dir: string) => Promise<string[]>;
    musicFolder: () => Promise<string>;
    /** AI 그림 모음 폴더 — 문서\공실스튜디오\08 AI생성물\AI이미지 (2026-10-23 번호 폴더) */
    aiFolder?: () => Promise<string>;
    /** 편집기에서 그린 그림(PNG data URL)을 프로젝트에 저장 — 스티커 (앱 0.1.10부터) */
    saveImage?: (dir: string, dataUrl: string, name: string) => Promise<LibItem>;
  };
  project: {
    create: (o: { method: Method; ratio: Ratio; name?: string; vacancyId?: string; folder?: string }) => Promise<Project>;
    /** 새 프로젝트 기본 폴더 (0.1.11부터) */
    defaultDir?: () => Promise<string>;
    open: (dir: string, choice?: "work" | "file") => Promise<Project | Recover>;
    openPick: () => Promise<Project | null>;
    save: (p: Project) => Promise<{ updatedAt: string; duration: number }>;
    // .gss 파일 (옛 앱에는 없음)
    flush?: (p: Project) => Promise<{ savedAt: string }>;
    discard?: (p: Project) => Promise<boolean>;
    setDirty?: (v: boolean, dir?: string, file?: string) => Promise<boolean>;
    backup?: (p: Project) => Promise<string>;
    backups?: (p: Project) => Promise<{ file: string; at: string; size: number }[]>;
    closeNow?: () => Promise<boolean>;
    onWantClose?: (fn: () => void) => () => void;
    convert?: (p: Project) => Promise<Project>;
    packageInfo?: (p: Project) => Promise<{ count: number; bytes: number; missing: string[] }>;
    makePackage?: (p: Project) => Promise<{ dir: string; file: string; count: number; bytes: number } | null>;
    relink?: (p: Project, assetId: string) => Promise<{ path: string; edit: string; missing: boolean; url: string } | null>;
    pendingFile?: () => Promise<string>;
    onOpenFile?: (fn: (file: string) => void) => () => void;
    saveAs?: (p: Project, name: string, parent?: string) => Promise<Project>; // 앱 0.1.4부터
    pickFolder?: (title: string, defaultPath?: string) => Promise<string | null>;
    recent: () => Promise<Recent[]>;
    // 저장 폴더 설정 — 비어 있으면 기본 폴더 (옛 앱에는 없음)
    folders?: () => Promise<Folders>;
    setFolders?: (patch: Partial<Omit<Folders, "defaults">>) => Promise<Folders>;
    rename?: (dir: string, name: string) => Promise<string>; // 이름만 바꾸기 (폴더는 그대로, 옛 앱에는 없음)
    // 휴지통 (옛 앱에는 없음)
    trash?: (dir: string) => Promise<string>; // 휴지통 항목 id (되돌리기용)
    trashList?: () => Promise<TrashItem[]>;
    restore?: (id: string) => Promise<string>;
    purge?: (id: string | "all") => Promise<number>;
    addAsset: (libId: string) => Promise<Asset>;
    exportText: (p: Project, kind: "srt" | "txt", outFile?: string) => Promise<string>;
  };
  /** 내 목소리 성우 — 앱 0.1.10부터 (없으면 앱을 새로 받아야 함) */
  sttWords?: { add: (pairs: { wrong: string; right: string; context?: string }[]) => Promise<number> }; // 받아쓰기 낱말장 (앱 0.1.10부터)
  myVoice?: {
    status: () => Promise<MyVoiceStatus>;
    install: () => Promise<MyVoiceStatus>;
    record: (bytes: ArrayBuffer, text: string) => Promise<MyVoiceStatus>;
    file: () => Promise<MyVoiceStatus | null>;
    sample: () => Promise<MyVoiceStatus>;
    remove: () => Promise<MyVoiceStatus>;
    update?: (patch: { name?: string; text?: string }) => Promise<MyVoiceStatus>;
    onProgress: (fn: (text: string, frac: number) => void) => () => void;
  };
  voiceJoin?: (dir: string, files: string[]) => Promise<{ file: string; url: string; duration: number }>; // 앱 0.1.8부터
  /** 타입캐스트 성우 — 회원 자기 키 (키는 이 PC 에만, 0.1.11부터) */
  typecast?: {
    status: () => Promise<{ has: boolean; masked: string; count: number; at: number }>;
    setKey: (k: string) => Promise<{ has: boolean; masked: string; count: number; at: number }>;
    clear: () => Promise<{ has: boolean; masked: string; count: number; at: number }>;
    voices: (refresh?: boolean) => Promise<TypecastVoice[]>;
  };
  /** 일레븐랩스 성우 — 회원 자기 키 (0.1.11부터). 성우 id 는 "el_…" */
  eleven?: {
    status: () => Promise<{ has: boolean; masked: string; count: number; at: number }>;
    setKey: (k: string) => Promise<{ has: boolean; masked: string; count: number; at: number }>;
    clear: () => Promise<{ has: boolean; masked: string; count: number; at: number }>;
    voices: (refresh?: boolean) => Promise<TypecastVoice[]>;
    /** 세부 설정 들어 보기 (2026-10-20) */
    sample?: (voiceId: string, emotion: string, text?: string) => Promise<string>;
  };
  voice: (dir: string, text: string, voiceId: string, opts?: { fresh?: boolean; emotion?: string; prev?: string; next?: string }) => Promise<{ file: string; url: string; duration: number; id: string; text: string; words: Word[] }>;
  transcribe: (p: Project, assetId: string) => Promise<{ clips: Clip[] }>;
  // 무음 줄이기 — 영상별 실제 말소리 구간 (PC에서, 옛 앱에는 없음)
  speech?: (p: Project, assetIds: string[]) => Promise<Record<string, { s: number; e: number }[]>>;
  // 상세 편집 — 원본 영상 소리 파형 (1초 rate 칸, data = 0~255 base64, 앱 0.1.8부터)
  peaks?: (p: Project, assetId: string) => Promise<{ rate: number; data: string }>;
  // 자막 시각 맞추기 — 글은 그대로, 단어 시각만 실제 말소리에 (무료, 옛 앱에는 없음)
  realign?: (p: Project, items: { id: string; asset: string; s: number; e: number; text: string }[]) => Promise<{ id: string; words: Word[] }[]>;
  // 자동 자막 — 지금 클립은 그대로, 글만 채우기 (옛 앱에는 없음)
  transcribeClips?: (p: Project, targets: { id: string; asset: string; s: number; e: number }[]) => Promise<{ id: string; text: string; words: Word[]; sents?: { text: string; s: number; e: number; words: Word[] }[] }[]>;
  split?: (p: Project, assetId: string) => Promise<{ clips: Clip[] }>; // 받아쓰기 없이 말소리 구간으로만 (무료, 앱 0.1.4부터)
  ai: {
    script: (o: { topic?: string; style?: string; request?: string; chars?: number; vacancy?: unknown; source?: string; /** 이번 대본만 쓸 AI (계정/API 키) */ ai?: { provider: string; mode: "account" | "api" } | null }) => Promise<{ title?: string; scenes: { title: string; lines: { text: string; desc: string; keywords: string; kind: string }[] }[] }>;
    scenes: (lines: string[]) => Promise<{ desc: string; keywords: string; kind: string }[]>;
    shorts: (clips: Clip[], o: { count: number; maxSec: number; request?: string }) => Promise<{ title: string; start: number; end: number; reason: string }[]>;
    /** 대본 + 내 영상 → 문장마다 장면 (v: 자료 번호, -1 = 없음 · t: 시작 초). 앱 0.1.10부터 */
    footage?: (lines: string[], items: { path: string; kind: string; duration: number }[]) => Promise<{ v: number; t: number }[]>;
    /** [AI 편집] 글 AI 의 편집 계획 — 앱 0.1.10부터 */
    edit?: (lines: string[], items: { path: string; kind: string; duration: number }[], opts: { aiMax: number; moods: string[]; screen?: boolean; ratio?: string; catalog?: AiEditCatalog; kind?: string; request?: string; locked?: number[]; stock?: boolean; graphics?: string; sfx?: string; ai?: { provider: string; mode: string } | null; packs?: { id: string; label: string; desc: string }[] }) => Promise<{
      music: string;
      clips: { act: "keep" | "foot" | "ai" | "stock" | "same"; v?: number; t?: number; desc?: string; keywords?: string; title?: string; emph?: boolean; trans?: boolean; sticker?: { text: string; style: string }; sfx?: string }[];
      /** 영상 전체 자막 모양 (catalog 를 보냈을 때) — 0.1.11부터 */
      look?: { preset: string; in: string; out: string; emph: string; wshow: string; whl: string; wcolor: string; lines: number } | null;
      pack?: string; // [자동] 스타일 팩 — AI 가 고른 것
    }>;
    /** opts.ratio — 영상 비율로 그리기 (0.1.11부터) */
    image: (dir: string, prompt: string, opts?: { ratio?: string; files?: string[] /* 참고 사진 (캐릭터 시트) */; ai?: unknown /* 쓸 AI */ }) => Promise<LibItem>;
    /** AI 영상 — 회원 Gemini API 키 (Gemini Omni Flash). image: 첫 장면 그림 파일 (앱 0.1.12부터) */
    video?: (dir: string, prompt: string, opts?: { ratio?: string; image?: string }) => Promise<LibItem>;
    /** 클립별 AI 그림 — 클립 글 → 영어 장면 설명 (0.1.11부터) */
    imagePrompts?: (lines: string[], opts: { kinds?: string[]; style?: string; character?: string; modify?: { current: string; request: string }; ai?: unknown }) => Promise<string[]>;
    /** 이미지 + 동영상(움직임) 프롬프트 한 번에 (앱 0.1.12부터) */
    clipPrompts?: (lines: string[], opts: { kinds?: string[]; style?: string; character?: string; extra?: string; ai?: unknown; styles?: { id: string; label: string; desc?: string; character?: string }[] }) => Promise<{ image: string; motion: string }[] | { style: string; clips: { image: string; motion: string }[] }>;
    /** [씬 정리] 클립 글 → 씬 나누기 (from = 시작 클립 번호, 1부터) — 앱 0.1.10부터 */
    group?: (lines: string[]) => Promise<{ title: string; from: number }[]>;
  };
  vacancy: (id: string) => Promise<{ vacancy: { title?: string; fields?: { label: string; value: string }[] }; photos: LibItem[]; /** 공실열람 검증·지도·로드뷰 화면 */ shots?: LibItem[] }>;
  /** 기사·보도자료 화면 캡쳐 — head: 제목 부분 1장, full: 제목부터 몇 장 (2026-10-20) */
  capturePage?: (url: string, opts: { mode: "head" | "full"; title?: string; credit?: string; max?: number }) => Promise<LibItem[]>;
  stock: {
    search: (q: string, type: "photo" | "video", orientation: string, page?: number) => Promise<{ success: boolean; items?: StockItem[]; error?: string; needKey?: boolean }>;
    get: (dir: string, item: StockItem) => Promise<LibItem>;
  };
  musicGet: (dir: string, rel: string) => Promise<{ file: string; url: string }>;
  musicUse: (dir: string, libId: string) => Promise<{ file: string; url: string; name: string }>;
  /** 내 효과음 → 프로젝트 assets/sfx 로 복사 (앱 0.1.11부터) */
  sfxUse?: (dir: string, libId: string) => Promise<{ file: string; url: string; name: string }>;
  fonts: { ensure: (family: string) => Promise<{ family: string; url: string }> };
  render: (p: Project, o?: { scope?: string; sceneId?: string; clipIds?: string[]; height?: number; outFile?: string }) => Promise<{ file: string; seconds: number; took: number; encoder: string; url?: string }>;
  /** 이 앱이 완성 영상에 그릴 수 있는 것 — "kf"(키프레임·화면 회전·진하기·초 단위 구간), "adj"(색 보정·필터). 2026-10-20 키프레임 들어간 앱부터 */
  features?: string[];
  /** 애니메이션 칸 그림 저장 (투명 PNG data URL 들) → 폴더 경로. 앱 0.1.10부터 */
  animFrames?: (dir: string, key: string, start: number, urls: string[]) => Promise<string>;
  renderCancel: (id: string) => Promise<void>;
  /** [내보내기] 저장할 곳 고르기 — 취소하면 null (0.1.11부터) */
  exportPick?: (p: Project, kind: "mp4" | "mp3" | "wav" | "srt" | "txt") => Promise<string | null>;
  /** 대본을 .txt 로 저장 (저장 창) — 고른 파일 경로, 취소면 null */
  saveText?: (name: string, text: string) => Promise<string | null>;
  /** 목소리만 파일로 — 문장마다 AI 목소리를 만들어 쉼을 두고 이어 mp3·wav 하나 (프로젝트 없이, 2026-10-20) */
  voiceSave?: (texts: string[], voiceId: string, opts: { kind: "mp3" | "wav"; outFile: string; speed?: number; gap?: number; emotion?: string; noOverwrite?: boolean; /** 이미 만든 문장 목소리 — 다시 만들지 않고 잇기만 */ files?: string[]; /** 미리 듣기 — 처음 세 문장, 임시 파일 (url 로 돌려줌) */ preview?: boolean }) => Promise<{ file: string; seconds: number; url?: string }>;
  /** 예전 앱(0.1.9 이하)은 파일 경로(string)만, 범위(opts)도 무시 */
  exportAudio: (p: Project, kind: "mp3" | "wav", o?: { scope?: string; sceneId?: string; clipIds?: string[]; outFile?: string }) => Promise<string | { file: string; seconds: number; took: number }>;
  snapshot: (p: Project, file: string, at: number) => Promise<string>;
  record: {
    sources: () => Promise<{ id: string; name: string; thumb: string }[]>;
    choose: (id: string) => Promise<boolean>;
    start: (name: string, opt?: { dir?: string; fileName?: string }) => Promise<string>;
    // 저장할 곳 (옛 앱에는 없음)
    defaultDir?: () => Promise<string>;
    pickDir?: (cur?: string) => Promise<string>;
    chunk: (token: string, buf: ArrayBuffer) => Promise<boolean>;
    stop: (token: string) => Promise<LibItem>;
    // 녹화 중 작게 하기 (옛 앱에는 없음)
    live?: (on: boolean, startedAt?: number, opt?: { console?: boolean }) => Promise<boolean>;
    // 녹화 조정실 창 (앱 0.1.8부터) — drag-start·drag(dx, dy)·opacity(0.3~1)·min·max(→ 크게인지)·show
    console?: (act: "drag-start" | "drag" | "opacity" | "min" | "max" | "show" | "big" | "place", a?: number, b?: number, c?: number, d?: number, e?: number) => Promise<boolean>;
    // 녹화 중 앱 창을 내렸다·올렸다 — 작은 녹화 창(카톡 크기)을 띄우고 닫으려고 (앱 0.1.8부터)
    onMinimized?: (fn: () => void) => () => void;
    onRestored?: (fn: () => void) => () => void;
    tiny?: () => Promise<boolean>; // [더 작게 하기] — 얇은 막대 (앱 0.1.8부터)
    onTinyExpand?: (fn: () => void) => () => void; // 얇은 막대 [크게 보기] → 작은 창
    minimize?: () => Promise<boolean>;
    onMiniStop?: (fn: () => void) => () => void;
    // 프롬프터 — 녹화하는 모니터 위쪽 대본 창, 녹화에 안 찍힘 (앱 0.1.8부터)
    prompterOpen?: (o: { text: string; cps: number; size: number; opacity: number; mine: { cps: number; size: number } | null; startAt: number; rehearse?: boolean }) => Promise<boolean>;
    prompterClose?: () => Promise<boolean>;
    prompterShow?: () => Promise<boolean>;
    onPrompterClosed?: (fn: () => void) => () => void;
    onPrompterPrefs?: (fn: (o: { cps: number; size: number; opacity?: number; mine: { cps: number; size: number } | null }) => void) => () => void;
  };
  showFile: (file: string) => Promise<void>;
  /** 완성 영상 SNS 올리기 — 반자동 (앱 0.1.11부터) · [게시]는 회원이 */
  post?: {
    draft: (o: { title: string; lines: string[]; vacancyId?: string; saleKind?: string; ratio: string; seconds: number }) => Promise<PostDraft>;
    thumbs: (o: { file: string; title: string; duration: number }) => Promise<{ at: number; plain: { file: string; url: string }; title: { file: string; url: string } | null }[]>;
    fill: (o: { channel: PostChannel; file: string; title: string; text: string; visibility?: "public" | "unlisted" | "private"; thumb?: string }) => Promise<{ ok: boolean; partial?: string; thumb?: string; vis?: string }>;
    login: (ch: PostChannel) => Promise<boolean>;
    finishLogin: () => Promise<void>;
    open: (ch: PostChannel, what?: "verify") => Promise<boolean>;
  };
  openSettings?: (what: "camera" | "microphone") => Promise<void>; // 윈도우 설정 화면 (옛 앱에는 없음)
  openDeviceSettings?: (what: "camera" | "microphone") => Promise<void>; // 윈도우 장치 설정 — 밝기·쓸 장치·입력 크기 (앱 0.1.8부터)
  openPath: (p: string) => Promise<string>;
  onProgress: (fn: (text: string, frac?: number) => void) => () => void;
  /** x — 방금 만든 클립 영상 (진행 창에서 바로 틀기, 2026-10-22) */
  onRender: (fn: (text: string, frac: number, jobId?: string, x?: { clip?: string; i?: number; n?: number; dur?: number }) => void) => () => void;
};

export const videoBridge = (): VideoBridge | null => {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { gongsilStudio?: { video?: VideoBridge } }).gongsilStudio?.video) || null;
};

export const uid = () => Math.random().toString(36).slice(2, 10);
/** 기본 파일 이름 앞 — 년월일 8자리 (20261021, 2026-10-21 사장님: 연도 2026 을 온전하게) */
export const ymd = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
/** 기본 파일 이름 — "20261021 제목" (파일 이름에 못 쓰는 글자는 빼고, 제목은 30자까지) */
export const datedName = (title?: string, d?: Date) => `${ymd(d)} ${String(title || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 30) || "무제"}`;
export const errText = (e: unknown) => {
  const m = String(e instanceof Error ? e.message : e);
  // 앱 본체가 영상 기능보다 먼저 켜졌거나(옛 버전) — 화면만 새것이라 통로가 없다
  if (/No handler registered for 'video:/.test(m)) return "공실스튜디오를 다시 켜 주세요. (앱을 껐다 켜면 새 영상 기능이 연결돼요. 계속 이러면 앱을 최신 버전으로 업데이트해 주세요.)";
  // 스튜디오 크롬(AI 웹 창)이 닫혔을 때 — 사람이 보기 어려운 영어 대신 (2026-10-21)
  if (/Target page, context or browser has been closed|Target closed|browser has been closed|Browser closed/i.test(m)) return "AI 크롬 창이 닫혀 있었어요 — 다시 눌러 주세요. 계속 이러면 [AI 설정]에서 AI를 다시 연결해 주세요.";
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
};
/** AI 덮개에서 [중지]를 눌렀다 (앱 ai-busy "중지했어요") — 여러 장 만드는 돌기는 여기서 멈춘다 */
export const isStopped = (e: unknown) => /중지했어요/.test(errText(e));
export const fmtTime = (t: number, cs = true) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return cs ? `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}` : `${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}`;
};

/** "#RRGGBB" + 진하기 → CSS rgba (글자 뒤 상자) */
export const rgba = (hex: string | undefined, a: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "#000000");
  const n = parseInt(m ? m[1] : "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
};

/** 오른쪽 자료 칸에서 끌어 놓기 — dataTransfer 종류 이름 */
export const DRAG_MEDIA = "application/x-gsv-media";
/** 스티커·템플릿 칸에서 끌어 놓기 (2026-10-20 사장님) — 놓는 순간 그림을 그려 넣는다 (make 는 끌기 시작할 때 칸이 채워 둔다) */
export const DRAG_STICKER = "application/x-gsv-sticker";
export type StickerDrop = { item: LibItem; o: { anim: LayerAnim; w: number; y?: number; spec: { style: string; text: string; icon?: string; color?: string } } };
export const stickerDrag: { make: null | (() => Promise<StickerDrop>) } = { make: null };

/** 내 목소리 성우 상태 (앱) */
export type MyVoiceStatus = { engine: boolean; installing: boolean; voice: boolean; registeredAt: string; sampleUrl: string; readText: string; name?: string; text?: string; refUrl?: string };

/** 타입캐스트 성우 (앱이 회원 키로 받아 온 목록) */
export type TypecastVoice = { id: string; name: string; gender: string; age: string; useCases: string[]; preview: string; emotions: string[]; type: string; korean?: boolean };
