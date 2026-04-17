# 📁 공실뉴스 프로젝트 문서 (Docs)

프로젝트의 모든 기획, 설계, 개발 기록을 체계적으로 관리하는 공간입니다.

---

## 폴더 구조

```
docs/
├── ideas/          ← 아이디어 메모, 기획 초안, 브레인스토밍
├── architecture/   ← 개발 설계도, 기술 구조, DB 스키마, API 명세
│   └── sql/        ← SQL 마이그레이션 및 스키마 파일
└── devlog/         ← 개발 일지, 날짜별 변경 기록
```

## 📐 architecture/ — 개발 설계도

| 파일 | 내용 |
|------|------|
| `01_ARCHITECTURE_AND_SPEED_STRATEGY.md` | 전체 아키텍처 및 초고속 렌더링 전략 |
| `02_FOLDER_STRUCTURE_AND_COMPONENTS.md` | 프론트엔드 폴더 구조 및 컴포넌트 설계 |
| `03_GONGSIL_MAP_ARCHITECTURE.md` | 공실열람 지도 아키텍처 및 UX 설계 |
| `04_ADMIN_ROLE_AND_LAYOUT_STRATEGY.md` | 관리자 권한별 라우팅 및 레이아웃 전략 |
| `05_NEWS_CATEGORY_SHARED_COMPONENT_STRATEGY.md` | 뉴스 카테고리 공통 컴포넌트 전략 |
| `06_SOCIAL_LOGIN_ARCHITECTURE.md` | 소셜 로그인 (Google/Kakao/Naver) 설계 |
| `07_FRONTEND_COMPONENT_AND_PERFORMANCE_STRATEGY.md` | 프론트엔드 모듈화 및 성능 최적화 |
| `09_MULTI_TENANT_LAYOUT_ARCHITECTURE.md` | 멀티 테넌트 서브도메인 레이아웃 설계 |
| `11_MEMBER_DATA_ARCHITECTURE.md` | 회원 데이터 아키텍처 (3-role 시스템) |
| `13_BANNER_MANAGEMENT_PROPOSAL.md` | 배너/광고 관리 시스템 설계 |
| `13_SSR_AND_PPR_RENDERING_STRATEGY.md` | SSR/PPR 렌더링 전략 |
| `14_ARTICLE_LOAD_PERFORMANCE_PLAN.md` | 기사 로딩 속도 극대화 플랜 |
| `15_DATABASE_SCHEMA.md` | Supabase DB & Storage 스키마 정리 |
| `16_캐싱모드_속도가_느릴때_해결하는_방법.md` | ISR 캐싱 트러블슈팅 가이드 |
| `17_ADMIN_PAGE_MODULARIZATION.md` | 관리자 페이지 모듈 분할 전략 |

## 📝 devlog/ — 개발 일지

| 파일 | 내용 |
|------|------|
| `08_MAIN_PAGE_MODULARIZATION_PROCESS.md` | 메인 페이지 모듈화 리팩토링 완료 기록 |
| `10_ADMIN_AND_MAP_PERFORMANCE_TIPS.md` | 관리자 페이지 리팩토링 전략 메모 |
| `12_REALTOR_APPROVAL_WORKFLOW.md` | 부동산 회원 승인 파이프라인 구현 완료 기록 |
| `2026-04-17.md` | 댓글 시스템, 키워드 검색, 업로드 최적화 |

## 💡 ideas/ — 아이디어 & 기획

새로운 기능 아이디어나 기획 초안을 자유롭게 작성하는 공간입니다.
