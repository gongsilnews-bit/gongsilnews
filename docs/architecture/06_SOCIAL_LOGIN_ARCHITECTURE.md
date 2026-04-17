# 📂 06. 공실뉴스 통합 소셜 로그인 아키텍처 설계안

본 문서는 Supabase와 Next.js 14 환경에서 **Google, Kakao, Naver** 3대 핵심 소셜 로그인을 통합 지원하기 위한 하이브리드 인증 전략을 명시합니다.

---

## 🏗️ 1. 하이브리드 소셜 로그인 전략

Supabase는 글로벌 표준인 OIDC(OpenID Connect)와 OAuth 2.0을 지원합니다. 구글과 카카오는 대시보드 옵션으로 간단하게 원클릭 연동이 가능하지만, 네이버는 OIDC 표준 Discovery Document 기능을 제공하지 않아 고도화된 커스텀 서버 우회 전략(Next.js API Route)이 필수적입니다.

### 🟡 [Kakao] & 🔵 [Google] (Supabase Native 지원)
*   **방식**: Supabase 대시보드의 Authentication > Providers 에서 카카오 및 구글 Provider 활성화.
*   **동작 흐름**: 
    1. 프론트엔드에서 `@supabase/supabase-js`의 `signInWithOAuth({ provider: 'kakao' })` 호출.
    2. Supabase가 카카오/구글 로그인 창 렌더링.
    3. 인증 성공 시 Supabase 서버가 자동으로 콜백을 처리하여 `auth.users` DB에 유저 적재.
    4. JWT(세션 토큰) 발급 후 프론트엔드로 리다이렉트되어 즉시 로그인 완료.

### 🟢 [Naver] (Next.js API 우회 및 강제 주입)
*   **방식**: 네이버 고유의 OAuth 2.0 방식과 Next.js 서버(Route Handler) + Supabase Admin API를 병합 활용.
*   **동작 흐름**:
    1. 프론트엔드에서 네이버 로그인 요청 창(URL)을 직접 호출 (Client ID 포함).
    2. 유저 동의 후 네이버가 우리 서버 `app/api/auth/naver/callback/route.ts`로 인가 코드(Code) 전송.
    3. Next.js 서버에서 네이버에 접속해 유저 정보(이메일, 이름, 프로필)를 탈취(?)하여 수신.
    4. Next.js 서버가 **Supabase Admin API (Service Role Key)**를 이용해 `auth.users`에 해당 이메일로 강제 회원가입(Create) 또는 세션 생성 처리.
    5. 생성된 인증 토큰 정보를 기반으로 프론트엔드 브라우저 쿠키(Cookie)에 구워 로그인 상태를 인가.

---

## 🗄️ 2. 데이터베이스 매핑 (사용자 테이블 통합)

소셜 로그인으로 가입한 유저 정보는 Supabase의 🔒 보안 영역인 `auth.users`에 저장됩니다. 하지만 공실뉴스 서비스 자체의 추가 정보(중개사 여부, 결제내역 등)를 담기 위해서는 `public.members` 테이블과의 자동 동기화(Trigger)가 필수입니다.

### 🔄 회원가입 트리거 (PostgreSQL)
소셜 로그인 성공으로 `auth.users`에 레코드가 새롭게 찍히면, 백그라운드에서 동작하는 데이터베이스 트리거(Trigger)가 즉시 감지하여 `public.members` 테이블에 유저의 기본 프로필을 복제합니다.

```sql
-- (동기화 트리거 예시 흐름)
1. 구글/카카오/네이버 계정 최초 로그인 성공
2. auth.users 테이블 Insert
3. Trigger 동작 -> public.members 에 id(uuid), email, name, avatar_url 복사
4. role 필드는 기본 '일반유저'로 세팅
```

---

## 🎨 3. 프론트엔드 로그인 컴포넌트 플로우

`app/login/page.tsx` 등에 구현될 소셜 로그인 통합 버튼의 아키텍처입니다.

```tsx
import { supabase } from '@/lib/supabase';

export default function LoginUI() {

  // 구글 & 카카오 로그인 (Supabase 내장 기능)
  const loginWithSupabase = async (provider: 'google' | 'kakao') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  // 네이버 로그인 (서버 API 우회 요청)
  const loginWithNaver = () => {
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?client_id=네이버ID&response_type=code&redirect_uri=${window.location.origin}/api/auth/naver/callback&state=랜덤코드`;
    window.location.href = naverAuthUrl;
  };

  return (
    <div className="login-board">
      <button onClick={() => loginWithSupabase('kakao')} className="btn-kakao">카카오로 1초 만에 시작하기</button>
      <button onClick={() => loginWithNaver()} className="btn-naver">네이버로 로그인</button>
      <button onClick={() => loginWithSupabase('google')} className="btn-google">구글로 로그인</button>
    </div>
  );
}
```

---

## 📝 향후 작업 (TODO 리스트)

1. **API 키 확보**: 구글 클라우드 계정(OAuth), 카카오 데브, 네이버 개발자 센터에서 Client ID 및 Secret Key 각각 발급.
2. **Supabase 대시보드 세팅**: Authentication -> Providers 에서 구글/카카오 Key 세팅.
3. **Next.js 네이버 라우터 제작**: `src/app/api/auth/naver/callback` API 라우트를 만들어 서버 로직 구성 및 Supabase Admin 통신 포트 개방.
4. **리다이렉트 화이트리스트 등록**: 로컬호스트(`http://localhost:3000`)와 Vercel 도메인을 콜백 URL 주소로 일괄 허용 처리.
