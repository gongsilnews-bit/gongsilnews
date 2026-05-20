# 노코드 블록형 홈페이지 빌더 기획 설계안 (Block-based No-Code Homepage Builder)

## 1. 개요 및 목적 (Overview & Purpose)
본 기획안은 유료 프리미엄 회원(부동산 및 비즈니스 제휴 회원)이 자신의 서브도메인 홈페이지(`ID.gongsilnews.com`)를 코딩 지식 없이 마우스 클릭과 간단한 텍스트 입력만으로 직접 디자인하고 꾸밀 수 있는 **'블록형 노코드 홈페이지 빌더'**의 구조와 구현 계획을 정의합니다.

- **목표:** 공실마케팅(Mgongsil) 빌더의 직관적 UX를 Next.js 현대식 구조로 재해석하여, 중개사 및 제휴사 대표님들이 즉각적으로 레이아웃, 컬러, 콘텐츠 블록을 커스텀할 수 있는 환경 제공.
- **기대 효과:** 플랫폼의 유료 구독 전환(BM) 매력도를 극대화하고, 회원별로 차별화된 맞춤 브랜딩 미니홈피 제공.

---

## 2. 데이터베이스 및 스키마 설계 (Data Model)
유연한 블록 조립식 구조를 완벽하게 수용하기 위해, 기존 `homepage_settings` 테이블의 `settings` JSONB 컬럼 구조를 다음과 같이 고도화하여 적재합니다.

### 💾 `settings` JSONB 저장 규격 설계
```json
{
  "theme_name": "template01",
  "theme_color": "#f39a11",           // 빌더에서 지정한 6자리 테마 메인 색상
  "layout_options": {
    "show_register_btn": false,       // GNB 내 회원가입 버튼 노출 여부
    "use_sidebar": false,             // PC 버전의 좌측 사이드바 메뉴 사용 여부
    "use_scroll_animation": true,     // 화면 스크롤 애니메이션 활성화 여부
    "show_footer_info": true          // 하단 사업자 정보 출력 여부
  },
  "sns_channels": {
    "blog": "https://blog.naver.com/...",
    "instagram": "",
    "youtube": "",
    "kakao": ""
  },
  "blocks": [                         // 사용자가 임의로 조합한 메인페이지 블록 배열 (조립 순서대로 렌더링)
    {
      "id": "block_hero_slider",
      "type": "hero_slider",
      "is_visible": true,
      "properties": {
        "autoplay": true,
        "slider_type": "image",       // image | youtube_video
        "images": ["/banner1.jpg", "/banner2.jpg"],
        "video_url": ""
      }
    },
    {
      "id": "block_greeting",
      "type": "text_greeting",
      "is_visible": true,
      "properties": {
        "title": "청실두꺼비공인중개사사무소에 오신 것을 환영합니다.",
        "content": "저희 중개사무소는 강남 전 지역의 상가 및 사무실 임대/매매를 전문으로 취급합니다. 최고의 신뢰를 바탕으로 최적의 매물을 매칭해 드리겠습니다.",
        "align": "left"               // left | center | right
      }
    },
    {
      "id": "block_listings",
      "type": "vacancy_grid",
      "is_visible": true,
      "properties": {
        "default_category": "",       // 아파트, 오피스텔 등 필터 기본값
        "limit": 12,
        "card_style": "premium"       // standard | premium | simple
      }
    },
    {
      "id": "block_map",
      "type": "kakao_map",
      "is_visible": true,
      "properties": {
        "level": 3,
        "show_marker": true,
        "title_inside_bubble": "청실두꺼비공인중개사"
      }
    }
  ]
}
```

---

## 3. 핵심 블록 라이브러리 명세 (Available Blocks)
사용자는 미니홈피 메인화면에 원하는 블록을 제한 없이 자유롭게 추가, 삭제, 순서 변경할 수 있습니다.

| 블록 타입 | 블록 명칭 | 주요 제공 기능 및 속성 |
|:---|:---|:---|
| `hero_slider` | **풀사이즈 슬라이더** | 유튜브 동영상 백그라운드 재생 또는 여러 장의 이미지 롤링 배너 기능 |
| `text_greeting` | **인사말 및 설명** | 리치 텍스트 타이틀, 본문 단락, 정렬 방식(좌/우/가운데) 지정 |
| `vacancy_grid` | **보유 매물 목록** | 부동산 회원전용: 자신이 올린 active 매물 목록 그리드 출력 및 카테고리 필터링 |
| `article_grid` | **작성 기사 목록** | 비즈니스 회원전용: 자신이 기고한 부동산 경제 상식 및 제휴 뉴스 카드 배치 |
| `kakao_map` | **오시는길 지도** | 카카오 지도 API 연동 및 입력한 주소의 자동 지오코딩 핀 매칭 |
| `contact_form` | **빠른 문의 상담** | 성함, 연락처, 문의 내용을 입력받아 Supabase 고객 문의 DB로 즉시 전송 |
| `youtube_video` | **유튜브 영상 삽입** | 특정 유튜브 동영상 URL을 입력하여 메인 화면에 크게 삽입 재생 |
| `divider_space` | **구분선 및 여백** | 레이아웃 가독성을 위해 블록 사이에 위아래 높이 여백 및 라인 추가 |

---

## 4. 사용자 편집 UI/UX 설계 (Editor Experience)

보내주신 Mgongsil 빌더의 직관적인 디자인 에디팅 기능을 실현하기 위해 **'실시간 미리보기 & 퀵 셋팅 에디터'** 구조를 구축합니다.

### 4.1. 편집 모드 가동 (Main Editor Mode)
* **인라인 편집 ON/OFF**: 
  * 중개사/제휴사 대표 본인이 자신의 서브도메인 홈페이지(`ID.gongsilnews.com`)에 로그인 상태로 들어가면, 화면 우측 하단에 **[디자인 편집모드 ON/OFF]** 및 **[퀵 세팅 헬퍼 열기]** 플로팅 제어반이 활성화됩니다.
  * 편집 모드가 활성화되면 각 블록의 상/하단에 `[+ 컨텐츠 추가]` 버튼이 노출되며, 활성화된 블록 테두리에 점선과 함께 **`[▲ 위로]` `[▼ 아래로]` `[🗑️ 삭제]`** 제어 툴바가 즉시 띄워집니다.

### 4.2. 퀵 셋팅 헬퍼 (Quick Setting Helper - 우측 슬라이드 패널)
화면 우측에서 부드럽게 스르륵 열리는 슬라이드 오버 패널을 제공하여 복잡하지 않고 직관적인 커스텀 창을 구현합니다.
* **레이아웃 설정**: 
  * 마인드맵형 테마 색상 지정기(Color Picker).
  * 네비게이션 회원가입 버튼 토글, 스크롤 애니메이션 ON/OFF, 하단 정보 레이아웃 제어.
* **블록 목록 관리**: 
  * 추가되어 있는 블록 목록이 미니 리스트로 노출되며, 드래그나 위아래 이동 버튼으로 전체 윤곽을 한눈에 보며 관리할 수 있습니다.
* **메타태그 & SNS 설정**: 
  * Naver Blog, Instagram, YouTube, KakaoTalk 바로가기 링크 실시간 수정 적용.

---

## 5. 단계별 개발 로드맵 (Action Plan)

안정적인 론칭을 위해 본 빌더 기능은 아래 4단계의 순서로 개발 및 적용을 진행합니다.

1. **[Phase 1] JSON Schema 선언 및 목업 컴포넌트 격리 개발**
   * `SubdomainClient.tsx`를 고도화하여, 고정형 레이아웃 대신 `settings.blocks` 데이터를 순회(Map)하며 `BlockContainer` 안에 블록별 규격 컴포넌트를 호출해 주는 뼈대 구축.
2. **[Phase 2] 우측 퀵 셋팅 헬퍼(Quick Setting Helper) 패널 UI 구축**
   * 어드민 및 인라인 빌더에서 공용으로 사용할 우측 고화질 슬라이더 패널 개발.
   * 컬러 피커 모듈 및 레이아웃 토글 스위치 컴포넌트 탑재.
3. **[Phase 3] 블록 추가/삭제 및 위하래(Up/Down) 정렬 엔진 구축**
   * 초보 대표님들의 사용성에 최적화된 블록 정렬 기능 구현.
   * 수정 사항 발생 시 Supabase `saveHomepageSettings` 서버 액션과 연동하여 로딩 없이 부드럽게 즉시 저장되는 비동기 UI 연동.
4. **[Phase 4] 실시간 프리뷰 렌더링 및 완성도 최적화**
   * 모바일 뷰/데스크톱 뷰 분기 미리보기 지원.
   * 사용자가 수정한 빌더 레이아웃이 로딩 없이 0.1초 만에 Vercel 엣지 서버와 Supabase 단에서 출력될 수 있도록 캐시 및 렌더링 파이프라인 최종 점검.
