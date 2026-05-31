# 2026-06-01 온비드 동기화 장애 복구

## 📌 개요

온비드 공매 자동 동기화(매일 새벽 1시 cron)가 **최근 3일간 연속 실패**하는 장애 발생.
원인 분석 및 즉시 복구 완료.

## ❌ 장애 현상

- **증상**: 새벽 1시 Vercel Cron이 정상 트리거되지만, 전국 17개 시도 모두 `API Key missing` 에러로 실패
- **영향 기간**: 최소 3일 이상 (5/29 ~ 6/1)
- **영향 범위**: 신규 매물 수집 중단, 만료 매물 자동 삭제 중단

### 장애 로그 (DB: `agent_chats` → `onbid_sync_log`)

```
[2026-06-01 01:00:29 KST] 서울특별시 → 성공:false ERROR: API Key missing (자동)
[2026-06-01 01:00:29 KST] 경기도     → 성공:false ERROR: API Key missing (자동)
[2026-06-01 01:00:30 KST] 인천광역시 → 성공:false ERROR: API Key missing (자동)
... (전국 17개 시도 모두 동일 에러)
```

## 🔍 원인 분석

### 코드 흐름

```
vercel.json (cron: 0 16 * * * UTC = 새벽 1시 KST)
  → /api/cron/onbid (route.ts)
    → syncOnbidProperties() (onbidSync.ts)
      → process.env.ONBID_API_KEY 체크 ← ❌ 여기서 실패
```

### 환경변수 체크 로직 (`onbidSync.ts:148-157`)

```typescript
let serviceKey = process.env.ONBID_API_KEY 
  || process.env.DATA_GO_KR_API_KEY 
  || process.env.NEXT_PUBLIC_BROKERAGE_API_KEY;

if (!serviceKey) {
  return { success: false, error: "API Key missing" };
}
```

### 근본 원인

| 구분 | 상태 |
|------|------|
| 로컬 `.env.local` | ✅ `ONBID_API_KEY=0c70894...` 정상 설정 |
| Vercel 환경변수 `ONBID_API_KEY` | ❌ **잘못된 값 (`sk_live_a12...`)** 저장됨 |
| Vercel 환경변수 `DATA_GO_KR_API_KEY` | ❌ 미등록 |
| Vercel 환경변수 `NEXT_PUBLIC_BROKERAGE_API_KEY` | ❌ 미등록 |

> **결론**: Vercel Production 환경에 온비드 API 키가 잘못된 값으로 저장되어 있어, 3개 환경변수 폴백 체크가 모두 실패하여 `API Key missing` 에러 발생.

## ✅ 복구 조치

### 1단계: Vercel 환경변수 수정

- `ONBID_API_KEY` → 올바른 공공데이터포털 API 키로 교체
- `DATA_GO_KR_API_KEY` → 동일한 키로 신규 등록 (이중 안전장치)

### 2단계: Vercel Production 재배포

- 환경변수 변경 후 즉시 Redeploy 실행
- 배포 상태: Ready ✅

### 3단계: 실증 테스트

세종특별자치시 단일 지역 수동 동기화 테스트:

```
POST /api/cron/onbid?manual=true&sido=세종특별자치시

결과:
{
  "success": true,
  "elapsed": "5.8초",
  "results": [{
    "sido": "세종특별자치시",
    "inserted": 23,    ← 신규 등록
    "updated": 35,     ← 가격/일자 갱신
    "deleted": 59,     ← 만료 삭제
    "skipped": 5       ← 좌표 없어 스킵
  }]
}
```

## 📋 관련 파일

| 파일 | 역할 |
|------|------|
| `vercel.json` | Cron 스케줄 정의 (`0 16 * * *` = KST 01:00) |
| `src/app/api/cron/onbid/route.ts` | Cron 엔드포인트, 인증 및 시도별 순차 실행 |
| `src/app/actions/onbidSync.ts` | UPSERT 기반 동기화 엔진 v2 |

## 🛡️ 재발 방지 체크리스트

- [ ] Vercel 환경변수 변경 시 Production 환경 포함 여부 반드시 확인
- [ ] 공공데이터포털 API 키 갱신 시 Vercel + `.env.local` 동시 업데이트
- [ ] 동기화 실패 시 Slack/이메일 알림 연동 검토 (현재는 DB 로그만 기록)
