import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const key = () => createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY!).digest();
export function sealMaterialUrl(value: string) {
  if (value.startsWith('sealed:')) return value;
  if (!value.startsWith('private:') && !/^https?:\/\//i.test(value)) throw new Error('자료 URL은 http 또는 https 주소여야 합니다.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return 'sealed:' + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function openMaterialUrl(value: string) {
  if (!value.startsWith('sealed:')) return value;
  const bytes = Buffer.from(value.slice(7), 'base64url');
  const cipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8');
}
