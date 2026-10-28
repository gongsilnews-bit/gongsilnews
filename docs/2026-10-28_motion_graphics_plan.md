# 모션그래픽 고도화 계획 — HyperFrames 수준의 효과 넣기

작성 2026-10-28 · 공실마케팅 앱(영상 편집기)

## 1. 지금 상태

- 앱 안에서 **HTML로 장면을 짜고 → 시간에 맞춰 한 장씩 찍고 → 영상으로 굽는** 방식으로 모션그래픽을 만든다. HyperFrames(HeyGen)와 같은 원리다.
  - 코드: `studio-app/src/video/motion.js` (굽기), `studio-app/src/video/motion/*.html` (틀), `motion/base.js` (공통 규칙)
  - 틀 규칙: `window.__setup(data)` · `window.__seek(t)` · `window.__SFX` (효과음 시각)
- 만들어 둔 틀
  - **인트로 12가지**: 기본(핀) · 가격 쾅 · 갈라짐 · 속보형 · 고급형 · 네온 · 타자기 메모 · 줌 펀치 · 폴라로이드 · 미니멀 · 도장 쾅 · 카운트다운
  - **끝 화면 5가지**: 기본 카드 · 고급형 · 뉴스형 · 미니멀 · 쇼츠 팝 (사무소 · 대표 · 등록번호 · 소재지 · 전화 · QR)
- 고르기 창: 틀 · 배경(공실 사진/내 사진·영상) · 글씨 · 색 · 글자 칸 · 소리 포함 미리보기
- 인트로를 고르면 **영상 전체 스타일**(글씨 · 자막 · 전환 · 배경음악 · 짝 끝 화면)이 함께 맞춰진다.
- 지금 틀들은 움직임을 손으로 계산한다. 그래서 고급 효과를 만드는 데 시간이 오래 걸린다.

## 2. HyperFrames 수준으로 올리는 방법 4가지

| # | 방법 | 얻는 것 | 비고 |
|---|---|---|---|
| 1 | **애니메이션 도구 넣기** (GSAP 또는 Anime.js) | 글자 쪼개 날리기, 곡선 따라 움직이기, 튕김·탄성, 선 그리기, 모양 바꾸기 | 둘 다 시간 지정 굽기가 된다. 지금 굽기 방식에 그대로 맞는다 |
| 2 | **Lottie 넣기** | 애프터이펙트급 장식(반짝임 · 화살표 · 아이콘 움직임 · 축하 효과) | 글자 칸이 있는 Lottie는 공실 정보로 글자를 채울 수 있다 |
| 3 | **HyperFrames 블록 옮겨 쓰기** | 이미 만들어진 효과 수백 개(글리치 · 필름 그레인 · 빛 번짐 · 차트 · 지도 · 숫자 카운트 등) | 우리 규칙(공실 정보 · 시간 찍기)에 맞게 옮긴다 |
| 4 | **회원 AI가 직접 장면 짜기** | 회원 요청대로 새 장면 | 1~3으로 재료가 쌓인 뒤가 안정적. 깨지면 기본 틀로 대신 |

## 3. 이용 조건 (확인한 것)

| 도구 | 이용 조건 | 우리에게 맞는가 |
|---|---|---|
| **GSAP** | Webflow가 인수한 뒤 **상업용까지 무료**가 됐다. 다만 표준 라이선스에 **"코드 없이 시각 애니메이션을 만드는 도구로서 Webflow와 경쟁하는 제품"에는 쓰지 말라**는 제한이 있다. 회원이 틀을 골라 모션을 만드는 우리 앱이 여기에 걸리는지는 **회색 지대**다 | ⚠️ 서면 확인 전에는 회원 배포용 앱에 넣지 않는 것이 안전하다 |
| **Anime.js** | MIT (자유) — 4.5.0 패키지 LICENSE 로 확인 (2026-10-28) | ✅ 채택. 앱에 넣음 (`studio-app/src/video/motion/vendor`) |
| **lottie-web** (재생 도구) | MIT (자유) | ✅ |
| **Lottie 애니메이션 파일** (LottieFiles 등) | 파일마다 이용 조건이 다르다 | ⚠️ 상업 사용이 되는 것만 골라 넣고, 출처·조건을 목록으로 남긴다 |
| **HyperFrames** (엔진·틀) | Apache 2.0 (상업 사용 가능, 출처·라이선스 표시 필요) | ✅ 옮겨 쓸 수 있다. 블록마다 따로 붙은 조건이 있는지는 하나씩 확인한다 |

출처
- GSAP 무료화: [Webflow makes GSAP 100% free](https://webflow.com/blog/gsap-becomes-free) · [GSAP Standard License](https://gsap.com/community/standard-license/) · [라이선스 원문 정리](https://scancode-licensedb.aboutcode.org/gsap-standard-no-charge-2025.html)
- lottie-web: [airbnb/lottie-web package.json (MIT)](https://www.github.com/airbnb/lottie-web/blob/master/package.json)
- HyperFrames: [HeyGen Open-Sources HyperFrames](https://themenonlab.blog/blog/heygen-hyperframes-video-as-code) (공식 저장소 `github.com/heygen-com/hyperframes`, Apache 2.0)

## 4. 권하는 순서

1. **엔진에 Anime.js + lottie-web 넣기** — ✅ 2026-10-28 완료 (출처 목록 `studio-app/src/video/motion/CREDITS.md`). Anime.js 로 만든 첫 틀: 인트로 "키네틱" · "럭셔리 라인"
   - GSAP는 Webflow에 서면으로 확인받기 전까지 넣지 않는다.
   - 틀 규칙(`__setup` · `__seek`)은 그대로 두고, 틀 안에서 도구만 골라 쓰게 한다.
2. **기존 틀 2~3개를 새 도구로 다시 만들어 품질 비교**
   - 예: 인트로 "고급형", 끝 화면 "기본 카드"
3. **HyperFrames 블록 옮기기**
   - 라이선스를 블록마다 확인하고, 쓸 수 있는 것만 우리 규칙으로 옮긴다.
   - 옮긴 블록은 출처 목록(`motion/CREDITS.md`)에 남긴다.
4. **다음 틀 종류 늘리기**: 정보 카드(숫자 올라가기) · 위치 장면(지도 확대 + 핀) · 하단 자막 바(투명 겹치기) · 장면 제목 카드
5. **대본 분석 → 모션그래픽 자동 배치**
   - 가격 문장 → 정보 카드, 위치 문장 → 지도 장면, 장점 나열 → 체크 카드
   - 클로드 설계도(JSON)에서도 `{"motion": "intro"}`처럼 쓰게 한다.
6. **회원 AI가 장면 짜기 (2층)**
   - 회원 클로드·ChatGPT가 우리 규칙의 코드로 장면을 짜면 앱이 굽는다. 실패하면 기본 틀로 대신한다.

## 5. 지켜야 할 것

- 글자는 공실의 **실제 등록 값만** 쓴다. 지어내지 않는다. 없는 값은 비운다.
- 끝 화면에는 **표시·광고 필수 정보**(사무소 · 대표 · 등록번호 · 소재지 · 전화)를 넣는다.
- 회원 배포용 앱에 넣는 외부 도구·그림·소리는 **모두 이용 조건을 확인**하고 출처 목록을 남긴다.
- 효과음은 지금처럼 `studio-app/src/video/sfx`(출처: `sfx/CREDITS.md`)에서만 쓴다.

## 6. 정할 것

- [x] GSAP 대신 **Anime.js** 로 간다 (2026-10-28 사장님 결정)
- [ ] Lottie 애니메이션 파일: 무료 상업용만 쓸지, 유료 묶음을 살지
- [ ] 고급 틀을 유료 등급(공실마케팅 이용권) 혜택으로 묶을지
