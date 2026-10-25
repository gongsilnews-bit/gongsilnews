# Handoff: 공실뉴스부동산 소개 페이지 리뉴얼 (`/newsrealty`)

## Overview
gongsilnews.com/newsrealty ("공실뉴스부동산이란?") 페이지의 리디자인입니다. 목적은 1~2인 로컬 중개사의 **멤버십 가입 유도**. 기존 페이지의 섹션 구성·사진은 유지하고, 문구를 줄이고 밝은 흰 배경 + 오렌지 포인트로 정리했습니다.

## About the Design Files
`newsrealty_v3.dc.html`은 **HTML로 만든 디자인 레퍼런스**입니다. 그대로 배포하는 코드가 아니라, 기존 코드베이스(Next.js, `/newsrealty` 라우트)의 패턴·컴포넌트로 **재구현**해야 합니다. 브라우저에서 바로 열어 볼 수 있습니다(같은 폴더의 `support.js`, `_ds/` 필요).
- 마크업은 템플릿 영역(`<x-dc>` 안), 반복 데이터(카드 문구·사진 경로 등)는 하단 `<script data-dc-script>`의 `renderVals()`에 있습니다. **모든 최종 문구는 이 두 곳에서 그대로 가져오세요.**

## Fidelity
**High-fidelity.** 색상, 타이포, 간격, 문구 모두 확정본입니다. 픽셀 단위로 맞춰 주세요.

## Layout (공통)
- 콘텐츠 최대폭 1120px, 좌우 패딩 24px, 가운데 정렬. 좌측 정렬 레이아웃.
- 섹션 간 상단 패딩 112~128px.
- 2단 영역은 `grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr))` — 모바일에서 자동 1단.
- 카드 그리드: `minmax(min(100%,300px),1fr)` (3열), `minmax(min(100%,240px),1fr)` (4열), STEP `minmax(180px,1fr)` (5열, gap 2px로 붙은 띠).
- 반경: 카드 14px(`--radius-lg`), 작은 박스 10px(`--radius-md`), 칩 999px.

## Sections (위→아래)
1. **Header (sticky)** — 로고 텍스트 "공실뉴스부동산" / 메뉴: 혜택, 금액안내(#pricing), FAQ(#faq) / "신청하기" 아웃라인 버튼. 배경 90% 불투명 + blur(10px).
2. **Hero** — 좌: 태그 "11만 부동산 무료 열람 채널", H1 "유튜브, 블로그, SNS / 이제, 공실만 등록하면 자동으로" (clamp 34–50px, 700, lh 1.2, ls -0.025em), 본문 17px, 버튼 2개:
   - Primary "공실뉴스부동산 신청 >" — **배경 accent-700, 흰색 700 굵기**, padding 12×20, 15px.
   - Secondary "부동산 혜택 >" — 아웃라인, 텍스트색.
   - 우: 히어로 사진 4:3, radius 14.
3. **Feature chips** — 7개 pill (surface 배경, 14px). 마지막 "강의 채널 개설 (수익화)".
4. **무엇이 좋아질까요?** — 카드 3개 (아이콘 32px, 라벨 13px accent-700, 제목 19px 700, 설명 14px).
5. **내가 꾸준히 할 수 있을까?** — STEP 01~05 띠 (아이콘 28px, "STEP 0n" 12px accent, 제목 16px 700, 설명 13px).
6. **Market Reality** — "대형 부동산…" 사진 카드 3개 → 가운데 VS 구분선(accent, 22px 700) → "1~2인 로컬 부동산…" 사진 카드 3개. 사진 3:2.
7. **Solution** — 오렌지 그라데이션 박스(`linear-gradient(120deg, oklch(0.5 0.14 42), oklch(0.6 0.16 52))`), 좌 텍스트(H2 "공실만 등록하면 / AI가 알아서 다 해줍니다.", 흰색) / 우 사진(cover, min-height 300). 아래 혜택 카드 4개(아이콘 + 라벨 + 제목 + 불릿 리스트).
8. **이런 부동산에게 추천합니다** — 사진 4:3 카드 3개.
9. **Pricing (#pricing)** — H2 "월 3만 원, 12개월 36만 원", 부제 "12개월 단위 멤버십 · VAT 포함". "공실뉴스부동산 12개월 뒤" 박스(채널 5개: 블로그/인스타그램/페이스북/쓰레드/유튜브 + 아이콘). 비교표: 일반 부동산(무료) vs 공실뉴스부동산(₩30,000/월 + "12개월 36만 원").
10. **FAQ (#faq)** — `<details>` 아코디언 6개. 상하 1px divider.
11. **CTA** — "내 지역 · 단지 / 로컬 부동산 기자가 되세요." + 신청 / 상담 1555-5343(tel:) 버튼.
12. **Footer** — 회사 정보 3줄, 12px.

## Interactions & Behavior
- 앵커 스크롤(smooth): 금액안내 → #pricing, FAQ → #faq.
- FAQ: 네이티브 `<details>` 토글(기본 마커 숨김).
- 버튼 hover: 아웃라인 버튼은 accent 틴트, primary는 accent 한 단계 진하게. 포커스: `outline 2px solid accent; offset 2px`.
- 링크 색: accent `oklch(0.6 0.17 48)`, hover accent-700.
- 반응형: 모든 그리드 auto-fit으로 자동 줄바꿈, 제목은 clamp().

## 링크 (실서비스로 교체 필요)
- 신청: `https://www.gongsilnews.com/newsrealty/apply` (네이버 쇼핑몰 결제 페이지로 바꿀지 확인)
- 혜택: 시안에서는 `공실뉴스부동산 혜택.dc.html`(이 패키지의 `benefits.dc.html`) → 실제 혜택 페이지 라우트로 교체
- 상담: `tel:15555343`

## Design Tokens
| 역할 | 값 | 대략 HEX |
|---|---|---|
| bg | oklch(0.995 0 0) | #FDFDFD |
| surface (카드) | oklch(0.965 0.012 70) | #F7F1EB |
| text | oklch(0.27 0.02 55) | #2E2621 |
| text-muted 300 | oklch(0.38 0.02 55) | #4B413B |
| text-muted 400 | oklch(0.48 0.02 55) | #675C55 |
| text-muted 500 | oklch(0.52 0.02 55) | #706560 |
| accent | oklch(0.6 0.17 48) | #D9661F |
| accent-700 | oklch(0.48 0.14 45) | #A5440F |
| accent-200 (태그 배경) | oklch(0.93 0.05 60) | #FDE3CC |
| divider | text 14% 알파 | — |

- **Font:** Pretendard (CDN `cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`). 제목·강조 700, 본문 400. `word-break: keep-all`.
- **Type scale:** H1 clamp(34,5vw,50) / H2 clamp(26,3.4vw,34) / 카드 제목 18–19 / 본문 15–17 / 보조 13–14 / 라벨 12.
- **Spacing:** 섹션 112–128px, 카드 패딩 24–28px, 그리드 gap 24px.

## Assets
- 사진: 모두 기존 서버 경로 사용 (`/images/newsrealty/hero_gangnam_multichannel_agent.jpg`, `/images/newsrealty/newsrealty_partner_trio_success.jpg`, `/images/study/study-real-corp-*.webp`, `/images/study/study-real-local-*.webp`, `/images/study/recommend_real_*.jpg`).
- 아이콘: 24×24 라인 아이콘(stroke 1.6, round, 색 #D9661F). SVG path는 `renderVals()`의 `P` 객체에 있음. Phosphor 아이콘(regular)으로 대체해도 무방.

## Files
- `newsrealty_v3.dc.html` — 소개 페이지 디자인 레퍼런스 (`/newsrealty`)
- `benefits.dc.html` — 혜택 페이지 디자인 레퍼런스 (`/newsrealty/benefits/...`)
- `support.js`, `_ds/`, `image-slot.js` — 레퍼런스 파일 렌더링용 (구현에는 불필요)

---

# 혜택 페이지 (`benefits.dc.html`)

소개 페이지와 동일한 토큰(흰 배경, 오렌지, Pretendard)을 씁니다. 기존 혜택 페이지 4개(brokerage-article, blog-automation, ai-youtube, lecture-upload)를 **한 페이지 + 상단 탭**으로 합칩니다.

## Layout
- **Header (sticky):** 로고 + 신청하기 버튼, 그 아래 탭 바(공동중개 / 매매보고서 / 블로그·SNS / 릴스·유튜브 / 강의 업로딩). 탭 클릭 시 해당 섹션으로 앱커 스크롤(`scroll-padding-top:120px`), 활성 탭은 하단 2px accent 보더 + 텍스트색 + 500 굵기, 비활성은 neutral-400.
  - 구현 시 스크롤 위치에 따라 활성 탭이 바뀌도록 IntersectionObserver 권장.
- **Intro:** 라벨 "멤버십 기본 혜택" + H1 2줄(Bold 700).
- **섹션 01~05:** 각각 2단(좌 텍스트 max 480px / 우 4:3 이미지, radius 14). 라벨 13px accent("0n · 이름"), H2 clamp(26,3.4vw,34), 불릿 15px.
  - 04 릴스·유튜브: 툴 태그(브루 AI / 캡컷 / 챗GPT 대본) + 12개월 로드맵 4단 띠(`renderVals().roadmap`). **로드맵 내용은 임시 문구 — 실제 커리큘럼으로 교체 필요.**
- **편집장 카드:** 원형 사진 + 이름/이력 — **플레이스홀더, 실제 내용 필요.**
- **CTA:** 가격 요약 + 신청 / 상담 버튼.

## 이미지
`<image-slot>`은 시안용 드롭 영역입니다. 구현 시 실제 이미지(`<img>`/`next/image`)로 교체하고, 파일은 기존 혜택 페이지의 사진을 사용하세요.

## Claude Code에 줄 요청 예시
```
design_handoff_newsrealty/README.md를 읽고,
1) newsrealty_v3.dc.html 기준으로 /newsrealty 페이지를,
2) benefits.dc.html 기준으로 혜택 페이지를
기존 Next.js 코드 패턴에 맞게 다시 만들어줘. 문구는 파일 내용 그대로.
```
