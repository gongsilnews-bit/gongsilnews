import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * 공실뉴스 스튜디오(데스크톱 앱) "클릭 한 번 연결"용 연결 신호
 *
 * 구글은 앱 안 창에서의 구글 로그인을 막는다. 그래서 회원 크롬에 이미 되어 있는
 * 공실뉴스 로그인으로 연결 신호를 만들어 gongsilstudio:// 주소로 앱에 넘긴다.
 *
 * - 신호 안에는 Supabase 1회용 로그인 토큰(매직링크 token_hash)이 암호화되어 들어 있다.
 *   토큰은 Supabase가 한 번 쓰면 버리므로 신호도 한 번만 쓸 수 있다.
 * - 만든 지 5분이 지나면 쓸 수 없다.
 * - 암호화 키는 서비스 키에서 따로 뽑아 쓴다 (새 환경변수를 두지 않으려고).
 */

export const STUDIO_CONNECT_TTL_MS = 5 * 60 * 1000;

type Payload = { th: string; uid: string; exp: number };

function key() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY 없음");
  return createHash("sha256").update(`gongsil-studio-connect:${secret}`).digest();
}

export function sealStudioCode(tokenHash: string, userId: string): string {
  const payload: Payload = { th: tokenHash, uid: userId, exp: Date.now() + STUDIO_CONNECT_TTL_MS };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** 위조됐거나 5분이 지났으면 null */
export function openStudioCode(code: string): Payload | null {
  try {
    const raw = Buffer.from(code, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const payload = JSON.parse(text) as Payload;
    if (!payload.th || !payload.uid || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
