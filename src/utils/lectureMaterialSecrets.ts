import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function getCandidateKeys(): Buffer[] {
  const secrets: string[] = [];

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    secrets.push(process.env.SUPABASE_SERVICE_ROLE_KEY);
    secrets.push(process.env.SUPABASE_SERVICE_ROLE_KEY.trim());
    secrets.push(process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/^["']|["']$/g, '').trim());
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    secrets.push(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    secrets.push(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim());
    secrets.push(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.replace(/^["']|["']$/g, '').trim());
  }

  const unique = Array.from(new Set(secrets.filter(Boolean)));
  return unique.map(s => createHash('sha256').update(s).digest());
}

const primaryKey = () => {
  const secret = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'default_fallback_secret'
  ).trim();
  return createHash('sha256').update(secret).digest();
};

export function sealMaterialUrl(value: string) {
  if (!value) return value;
  if (value.startsWith('sealed:')) return value;
  if (!value.startsWith('private:') && !/^https?:\/\//i.test(value)) {
    throw new Error('자료 URL은 http 또는 https 주소여야 합니다.');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', primaryKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return 'sealed:' + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function openMaterialUrl(value: string) {
  if (!value || typeof value !== 'string') return value || '';
  if (!value.startsWith('sealed:')) return value;

  try {
    const raw = Buffer.from(value.slice(7), 'base64url');
    if (raw.length < 28) return value;

    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const candidateKeys = getCandidateKeys();
    for (const k of candidateKeys) {
      try {
        const decipher = createDecipheriv('aes-256-gcm', k, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
        if (decrypted) return decrypted;
      } catch {
        // Continue to next key candidate
      }
    }
  } catch (err: any) {
    console.error('[openMaterialUrl] Decryption error:', err?.message);
  }

  console.warn('[openMaterialUrl] Unable to authenticate data with current keys, returning original value.');
  return value;
}
