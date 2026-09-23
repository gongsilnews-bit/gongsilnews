'use server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '@/utils/supabase/server';
import { isAdminRole } from '@/utils/permissionCheck';
import { openMaterialUrl } from '@/utils/lectureMaterialSecrets';
import { canTakeFree } from '@/utils/lectureAccess';

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const bucket = 'lecture-materials';

export async function uploadLectureMaterial(file: { name: string; size: number }) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다.');
    if (!file.name || !file.size || file.size > 20 * 1024 * 1024) throw new Error('20MB 이하 파일을 선택해 주세요.');
    const client = db();
    const { data: existing, error: bucketError } = await client.storage.getBucket(bucket);
    if (!existing) {
      if (bucketError && !/not found/i.test(bucketError.message)) throw bucketError;
      const { error } = await client.storage.createBucket(bucket, { public: false, fileSizeLimit: 20 * 1024 * 1024 });
      if (error && !/already exists/i.test(error.message)) throw error;
    } else if (existing.public) throw new Error('자료 저장소의 비공개 설정을 확인해 주세요.');
    const path = `${user.id}/${crypto.randomUUID()}.${file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'bin'}`;
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw error;
    return { success: true, url: `private:${path}`, path, token: data.token };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : '자료 업로드 실패' }; }
}

export async function getLectureMaterialUrl(lectureId: string, index: number) {
  try {
    const client = db();
    const { data: lecture, error } = await client.from('lectures').select('author_id,status,is_deleted,materials,free_for_plans').eq('id', lectureId).single();
    if (error || !lecture || lecture.is_deleted) throw new Error('강의를 찾을 수 없습니다.');
    if (!Number.isInteger(index) || index < 0) throw new Error('자료를 찾을 수 없습니다.');
    const material = lecture.materials?.[index];
    if (!material) throw new Error('자료를 찾을 수 없습니다.');
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    let editor = false;
    let enrolled = false;
    if (user) {
      const { data: member } = await client.from('members').select('role, plan_type, plan_end_date').eq('id', user.id).single();
      editor = lecture.author_id === user.id || isAdminRole(member?.role);
      const { data: enrollments } = await client.from('lecture_enrollments').select('expires_at, granted_by_plan').eq('lecture_id', lectureId).eq('user_id', user.id).eq('status', 'ACTIVE');
      /*
       * 등급 덕분에 공짜로 듣던 수강은 그 등급이 살아 있어야 자료도 열린다.
       * 요금제가 끝나면 영상뿐 아니라 자료도 같이 닫혀야 한다.
       */
      enrolled = (enrollments || []).some(
        (e: any) =>
          (!e.expires_at || Date.parse(e.expires_at) > Date.now()) &&
          (!e.granted_by_plan || canTakeFree(member, (lecture as any).free_for_plans))
      );
    }
    if (!editor && (lecture.status !== 'ACTIVE' || (!enrolled && !material.is_preview))) throw new Error('수강 등록 후 이용할 수 있는 자료입니다.');
    const url = openMaterialUrl(material.url || '');
    if (url.startsWith('private:')) {
      const { data, error } = await client.storage.from(bucket).createSignedUrl(url.slice(8), 60, { download: material.label || true });
      if (error) throw error;
      return { success: true, url: data.signedUrl };
    }
    if (!/^https?:\/\//i.test(url)) throw new Error('유효하지 않은 자료 주소입니다.');
    return { success: true, url };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : '자료를 열 수 없습니다.' }; }
}
