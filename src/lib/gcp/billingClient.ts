import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function loadCredentials(): ServiceAccountCredentials | null {
  try {
    const credPath = path.join(process.cwd(), 'src/lib/gcp/credentials.json');
    if (fs.existsSync(credPath)) {
      const raw = fs.readFileSync(credPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('GCP credentials.json load error:', err);
  }
  return null;
}

/**
 * Google OAuth2 Access Token을 생성합니다. (RS256 JWT 방식)
 */
export async function getGcpAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const sa = loadCredentials();
  if (!sa || !sa.client_email || !sa.private_key) return null;

  try {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/cloud-billing https://www.googleapis.com/auth/cloud-billing.readonly',
      aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
      exp,
      iat,
    };

    const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsignedToken = ${b64(header)}.;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt = ${unsignedToken}.;

    const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
      cache: 'no-store',
    });

    const data = await res.json();
    if (data.access_token) {
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };
      return data.access_token;
    }
  } catch (err) {
    console.error('GCP Access Token error:', err);
  }

  return null;
}

/**
 * GCP Cloud Billing 계정 정보를 실시간으로 조회합니다.
 */
export async function fetchLiveGcpBillingInfo(billingAccountId = '014C95-E62B99-958C3B') {
  const token = await getGcpAccessToken();
  if (!token) return null;

  try {
    const res = await fetch('https://cloudbilling.googleapis.com/v1/billingAccounts/' + billingAccountId, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('fetchLiveGcpBillingInfo error:', err);
  }

  return null;
}
