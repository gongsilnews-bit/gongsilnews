"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidateTag } from "next/cache"
import type { LectureMaterial } from '@/types/lectureMaterial';
import { createClient as createSessionClient } from '@/utils/supabase/server';
import { isAdminRole } from '@/utils/permissionCheck';
import { sealMaterialUrl, openMaterialUrl } from '@/utils/lectureMaterialSecrets';
import { canTakeFree, lecturePlanOf, LECTURE_PLAN_KEYS } from '@/utils/lectureAccess';

async function lectureEditor(lectureAuthor?: string | null) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: member } = await getAdminClient().from('members').select('role').eq('id', user.id).single();
  return isAdminRole(member?.role) || lectureAuthor === user.id ? user : null;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) }
  });
}

// ── 강의 저장 (신규 + 수정 겸용) ──
export async function saveLecture(data: {
  id?: string;
  author_id?: string;
  status?: string;
  category: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  description?: string;
  lecture_guide_id?: string | null;
  sidebar_copy?: { benefits?: string; assurance_title?: string; assurance_body?: string; keywords?: string[] };
  thumbnail_url?: string;
  images?: string[];
  instructor_name?: string;
  instructor_bio?: string;
  instructor_photo?: string;
  price?: number;
  discount_price?: number;
  discount_label?: string;
  duration_months?: number;
  /** 포인트 없이 들을 수 있는 등급 목록 */
  free_for_plans?: string[];
  total_duration?: string;
  materials?: LectureMaterial[];
  chapters?: {
    id?: string;
    chapter_no: number;
    title: string;
    sort_order: number;
    lessons: {
      id?: string;
      lesson_no: number;
      title: string;
      description?: string;
      video_url?: string;
      duration?: string;
      is_preview?: boolean;
      sort_order: number;
    }[];
  }[];
}) {
  const supabase = getAdminClient();

  try {
    const { data: existingLecture } = data.id
      ? await supabase.from('lectures').select('author_id,materials,sidebar_copy').eq('id', data.id).single()
      : { data: null };
    const editor = await lectureEditor(data.id ? existingLecture?.author_id : data.author_id);
    if (!editor) return { success: false, error: '강의를 편집할 권한이 없습니다.' };
    if (data.chapters?.some(ch => ch.lessons.length > 0)) {
      const { error } = await supabase.from('lecture_lessons').select('description').limit(0);
      if (error) return { success: false, error: '강의 설명 저장 준비가 필요합니다: ' + error.message };
    }
    const existingMaterialUrls = new Set(
      (existingLecture?.materials || [])
        .map((m: LectureMaterial) => {
          try {
            return openMaterialUrl(m.url);
          } catch {
            return m.url;
          }
        })
        .filter(Boolean)
    );
    const storedMaterials = (data.materials || []).map(material => {
      if (!material.url.trim()) throw new Error('자료 주소 또는 파일을 입력해 주세요.');
      if (material.scope === 'chapter' || material.scope === 'lesson') {
        const chapter = data.chapters?.find(ch => ch.chapter_no === material.chapter_no);
        if (!chapter || (material.scope === 'lesson' && !chapter.lessons.some(ls => ls.lesson_no === material.lesson_no))) throw new Error('자료를 연결할 챕터 또는 강의를 확인해 주세요.');
      }
      if (material.url.startsWith('sealed:')) {
        return { ...material, is_preview: !!material.is_preview };
      }
      if (material.url.startsWith('private:') && !material.url.startsWith(`private:${editor.id}/`) && !existingMaterialUrls.has(material.url)) throw new Error('사용할 수 없는 자료 파일입니다.');
      return { ...material, url: sealMaterialUrl(material.url.trim()), is_preview: !!material.is_preview };
    });
    const statusMap: Record<string, string> = {
      "임시저장": "DRAFT",
      "등록신청": "PENDING",
      "공개": "ACTIVE",
      "종료": "CLOSED",
      "삭제": "DELETED",
    };

    const mergedSidebarCopy = {
      ...(existingLecture?.sidebar_copy || {}),
      ...(data.sidebar_copy || {}),
      ...(data.keywords !== undefined ? { keywords: data.keywords } : {}),
    };
    delete mergedSidebarCopy.assurance_title;
    delete mergedSidebarCopy.assurance_body;

    const lectureData = {
      author_id: existingLecture?.author_id || editor.id,
      status: statusMap[data.status || ""] || data.status || "DRAFT",
      category: data.category,
      title: data.title,
      subtitle: data.subtitle || null,
      description: data.description || null,
      ...(data.lecture_guide_id !== undefined ? { lecture_guide_id: data.lecture_guide_id || null } : {}),
      sidebar_copy: mergedSidebarCopy,
      thumbnail_url: data.thumbnail_url || null,
      images: data.images || [],
      instructor_name: data.instructor_name || null,
      instructor_bio: data.instructor_bio || null,
      instructor_photo: data.instructor_photo || null,
      price: data.price || 0,
      discount_price: data.discount_price || null,
      discount_label: data.discount_label || null,
      duration_months: data.duration_months || 5,
      free_for_plans: data.free_for_plans || [],
      total_duration: data.total_duration || null,
      materials: storedMaterials,
      updated_at: new Date().toISOString(),
    };

    let lectureId = data.id;

    if (lectureId) {
      // 수정
      const { error } = await supabase
        .from("lectures")
        .update(lectureData)
        .eq("id", lectureId);
      if (error) return { success: false, error: error.message };
    } else {
      // 신규
      const { data: inserted, error } = await supabase
        .from("lectures")
        .insert(lectureData)
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };
      lectureId = inserted.id;
    }

    // 챕터 + 레슨 저장
    if (lectureId && data.chapters && data.chapters.length > 0) {
      // 기존 챕터 삭제 (CASCADE로 lessons도 삭제됨)
      const { error: deleteError } = await supabase
        .from("lecture_chapters")
        .delete()
        .eq("lecture_id", lectureId);
      if (deleteError) throw new Error(deleteError.message);

      await Promise.all(
        data.chapters.map(async (chapter) => {
          const { data: insertedChapter, error: chapterError } = await supabase
            .from("lecture_chapters")
            .insert({
              lecture_id: lectureId,
              chapter_no: chapter.chapter_no,
              title: chapter.title,
              sort_order: chapter.sort_order,
            })
            .select("id")
            .single();

          if (chapterError) {
            throw new Error(chapterError.message);
          }

          if (chapter.lessons && chapter.lessons.length > 0) {
            const lessonRows = chapter.lessons.map((lesson) => ({
              chapter_id: insertedChapter.id,
              lesson_no: lesson.lesson_no,
              title: lesson.title,
              description: lesson.description?.trim() || null,
              video_url: lesson.video_url || null,
              duration: lesson.duration || null,
              is_preview: lesson.is_preview || false,
              sort_order: lesson.sort_order,
            }));

            const { error: lessonError } = await supabase
              .from("lecture_lessons")
              .insert(lessonRows);

            if (lessonError) {
              throw new Error(lessonError.message);
            }
          }
        })
      );
    }

    // @ts-ignore
    revalidateTag("lectures");

    return { success: true, lectureId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 강의 목록 조회 ──
export async function getLectures(filters?: {
  status?: string;
  category?: string;
  authorId?: string;
  all?: boolean;
  limit?: number;
}) {
  const supabase = getAdminClient();
  try {
    let query = supabase
      .from("lectures")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.authorId && !filters?.all) query = query.eq("author_id", filters.authorId);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    const guideIds = Array.from(new Set((data || []).map((lec: any) => lec.lecture_guide_id).filter(Boolean)));
    const guideNames = new Map<string, string>();
    if (guideIds.length > 0) {
      const { data: guides } = await supabase.from("lecture_guides").select("id,name").in("id", guideIds);
      for (const guide of guides || []) guideNames.set(guide.id, guide.name);
    }
    const mapped = (data || []).map((lec: any) => ({
      ...lec,
      keywords: lec.keywords || lec.sidebar_copy?.keywords || [],
      lecture_guide_name: lec.lecture_guide_id ? guideNames.get(lec.lecture_guide_id) || null : null,
    }));
    return { success: true, data: mapped };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 강의 상세 조회 (챕터 + 레슨 포함) ──
export async function getLectureDetail(lectureId: string) {
  const supabase = getAdminClient();
  try {
    // 강의 기본 정보
    const { data: lecture, error } = await supabase
      .from("lectures")
      .select("*")
      .eq("id", lectureId)
      .single();

    if (error) return { success: false, error: error.message };

    const keywords = lecture.keywords || lecture.sidebar_copy?.keywords || [];
    let lectureGuide = null;
    if (lecture.lecture_guide_id) {
      const { data: guide } = await supabase
        .from("lecture_guides")
        .select("id,name,title,body,is_active")
        .eq("id", lecture.lecture_guide_id)
        .maybeSingle();
      lectureGuide = guide;
    }

    // 챕터 조회
    const editor = await lectureEditor(lecture.author_id);
    lecture.materials = (lecture.materials || []).map((material: LectureMaterial) => {
      let resolvedUrl = "";
      if (editor) {
        try {
          resolvedUrl = openMaterialUrl(material.url || "");
        } catch {
          resolvedUrl = material.url || "";
        }
      }
      return { ...material, url: resolvedUrl };
    });
    const { data: chapters } = await supabase
      .from("lecture_chapters")
      .select("*")
      .eq("lecture_id", lectureId)
      .order("sort_order", { ascending: true });

    // 각 챕터의 레슨 조회 (N+1 문제 해결)
    const chaptersWithLessons = [];
    if (chapters && chapters.length > 0) {
      const chapterIds = chapters.map(c => c.id);
      const { data: allLessons } = await supabase
        .from("lecture_lessons")
        .select("*")
        .in("chapter_id", chapterIds)
        .order("sort_order", { ascending: true });

      const lessonsByChapter = (allLessons || []).reduce((acc: any, lesson: any) => {
        if (!acc[lesson.chapter_id]) acc[lesson.chapter_id] = [];
        acc[lesson.chapter_id].push(lesson);
        return acc;
      }, {});

      for (const chapter of chapters) {
        const lessons = (lessonsByChapter[chapter.id] || []).map((les: any) => ({
          ...les,
          chapter_no: chapter.chapter_no,
          materials: (lecture.materials || []).filter(
            (m: any) => m.scope === "lesson" && m.chapter_no === chapter.chapter_no && m.lesson_no === les.lesson_no
          ),
        }));
        chaptersWithLessons.push({
          ...chapter,
          lessons,
        });
      }
    }

    // 리뷰 조회
    const { data: reviews } = await supabase
      .from("lecture_reviews")
      .select("*")
      .eq("lecture_id", lectureId)
      .order("created_at", { ascending: false })
      .limit(20);

    // 리뷰 작성자의 프로필 이미지 및 최신 닉네임 병합
    let enrichedReviews = reviews || [];
    if (enrichedReviews.length > 0) {
      const userIds = enrichedReviews.map(r => r.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: members } = await supabase
          .from("members")
          .select("id, profile_image_url, name")
          .in("id", userIds);

        if (members) {
          const memberMap = new Map(members.map(m => [m.id, m]));
          enrichedReviews = enrichedReviews.map(r => {
            const member = memberMap.get(r.user_id);
            return {
              ...r,
              user_avatar: member?.profile_image_url || null,
              user_name: member?.name || r.user_name || "익명",
            };
          });
        }
      }
    }

    return {
      success: true,
      data: {
        ...lecture,
        keywords,
        lecture_guide: lectureGuide,
        sidebar_copy: lectureGuide
          ? { ...(lecture.sidebar_copy || {}), assurance_title: lectureGuide.title, assurance_body: lectureGuide.body }
          : lecture.sidebar_copy,
        chapters: chaptersWithLessons,
        reviews: enrichedReviews,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 강의 삭제 (소프트) ──
export async function deleteLecture(lectureId: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("lectures")
      .update({ is_deleted: true, status: "DELETED" })
      .eq("id", lectureId);
    
    if (error) {
      console.error("deleteLecture error:", error);
      return { success: false, error: error.message };
    }

    try {
      const { revalidateTag, revalidatePath } = require("next/cache");
      revalidateTag("lectures");
      revalidatePath("/");
    revalidatePath("/m");
    } catch (cacheErr) {
      console.error("Cache revalidate error:", cacheErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteLecture exception:", err);
    return { success: false, error: err.message };
  }
}

// ── 강의 상태 변경 ──
export async function updateLectureStatus(lectureId: string, newStatus: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("lectures")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", lectureId);
    if (error) return { success: false, error: error.message };

    // @ts-ignore
    revalidateTag("lectures");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 리뷰 수정 ──
export async function updateLectureReview(data: {
  review_id: string;
  user_id: string;
  rating: number;
  content: string;
}) {
  const content = typeof data.content === 'string' ? data.content.trim() : '';
  if (!content) return { success: false, error: '후기 내용을 입력해주세요.' };
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    return { success: false, error: '별점은 1점부터 5점까지 선택해주세요.' };
  }
  if (!data.user_id) {
    return { success: false, error: '권한이 없습니다.' };
  }

  const supabase = getAdminClient();
  try {
    const { data: existing, error: findError } = await supabase
      .from('lecture_reviews')
      .select('id, user_id, lecture_id')
      .eq('id', data.review_id)
      .single();

    if (findError || !existing) {
      return { success: false, error: '수정할 후기를 찾을 수 없습니다.' };
    }

    let hasPermission = existing.user_id === data.user_id;
    if (!hasPermission) {
      const { data: member } = await supabase
        .from('members')
        .select('role')
        .eq('id', data.user_id)
        .single();
      if (member && (member.role === 'ADMIN' || member.role === 'admin')) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return { success: false, error: '본인이 작성한 후기만 수정할 수 있습니다.' };
    }

    const { error: updateError } = await supabase
      .from('lecture_reviews')
      .update({
        rating: data.rating,
        content,
      })
      .eq('id', data.review_id);

    if (updateError) return { success: false, error: updateError.message };

    // 평점 재계산
    const { data: reviews } = await supabase
      .from('lecture_reviews')
      .select('rating')
      .eq('lecture_id', existing.lecture_id);

    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await supabase
        .from('lectures')
        .update({
          rating: Math.round(avg * 10) / 10,
          review_count: reviews.length,
        })
        .eq('id', existing.lecture_id);
    }

    // @ts-ignore
    revalidateTag('lectures');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 리뷰 삭제 ──
export async function deleteLectureReview(data: {
  review_id: string;
  user_id: string;
}) {
  if (!data.review_id || !data.user_id) {
    return { success: false, error: '권한이 없습니다.' };
  }

  const supabase = getAdminClient();
  try {
    const { data: existing, error: findError } = await supabase
      .from('lecture_reviews')
      .select('id, user_id, lecture_id')
      .eq('id', data.review_id)
      .single();

    if (findError || !existing) {
      return { success: false, error: '삭제할 후기를 찾을 수 없습니다.' };
    }

    let hasPermission = existing.user_id === data.user_id;
    if (!hasPermission) {
      const { data: member } = await supabase
        .from('members')
        .select('role')
        .eq('id', data.user_id)
        .single();
      if (member && (member.role === 'ADMIN' || member.role === 'admin')) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return { success: false, error: '본인이 작성한 후기만 삭제할 수 있습니다.' };
    }

    const { error: deleteError } = await supabase
      .from('lecture_reviews')
      .delete()
      .eq('id', data.review_id);

    if (deleteError) return { success: false, error: deleteError.message };

    // 평점 재계산
    const { data: reviews } = await supabase
      .from('lecture_reviews')
      .select('rating')
      .eq('lecture_id', existing.lecture_id);

    const count = reviews ? reviews.length : 0;
    const avg = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    await supabase
      .from('lectures')
      .update({
        rating: Math.round(avg * 10) / 10,
        review_count: count,
      })
      .eq('id', existing.lecture_id);

    // @ts-ignore
    revalidateTag('lectures');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 강의 이미지 업로드 (썸네일 + 에디터 인라인) ──
// 버킷: "lecture-media" (Supabase Storage에서 미리 생성 필요)
export async function uploadLectureImage(formData: FormData) {
  const file = formData.get("file") as File;
  const lectureId = formData.get("lecture_id") as string;
  const imageType = (formData.get("type") as string) || "content"; // "thumbnail" | "content"

  if (!file) return { success: false, error: "파일이 누락되었습니다." };

  const supabase = getAdminClient();
  try {
    const ext = file.name.split(".").pop() || "webp";
    const folder = imageType === "thumbnail" ? "thumbnails" : "content";
    const path = `${folder}/${lectureId || "temp"}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("lecture-media")
      .upload(path, file, { upsert: true });
    if (uploadError) return { success: false, error: uploadError.message };

    const { data: urlData } = supabase.storage
      .from("lecture-media")
      .getPublicUrl(path);

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 하위호환: 기존 uploadLectureThumbnail → uploadLectureImage로 위임
export async function uploadLectureThumbnail(formData: FormData) {
  formData.set("type", "thumbnail");
  return uploadLectureImage(formData);
}

// ── 리뷰 작성 ──
export async function createLectureReview(data: {
  lecture_id: string;
  user_id?: string;
  user_name?: string;
  rating: number;
  content: string;
}) {
  const content = typeof data.content === "string" ? data.content.trim() : "";
  if (!content) return { success: false, error: "후기 내용을 입력해주세요." };
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    return { success: false, error: "별점은 1점부터 5점까지 선택해주세요." };
  }
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("lecture_reviews")
      .insert({
        lecture_id: data.lecture_id,
        user_id: data.user_id || null,
        user_name: data.user_name || "익명",
        rating: data.rating,
        content,
      });

    if (error) return { success: false, error: error.message };

    // 강의 평점/리뷰수 업데이트
    const { data: reviews } = await supabase
      .from("lecture_reviews")
      .select("rating")
      .eq("lecture_id", data.lecture_id);

    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await supabase
        .from("lectures")
        .update({
          rating: Math.round(avg * 10) / 10,
          review_count: reviews.length,
        })
        .eq("id", data.lecture_id);
    }

    // @ts-ignore
    revalidateTag("lectures");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── 포인트 결제 수강 등록 (100% 강의등록자 지급) ──
export async function enrollLecture(lectureId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    const { data: existingData } = await supabase
      .from("lecture_enrollments").select("id, status, expires_at")
      .eq("user_id", userId).eq("lecture_id", lectureId)
      .order("created_at", { ascending: false }).limit(1);
      
    const existing = existingData && existingData.length > 0 ? existingData[0] : null;
    
    if (existing && existing.status === "ACTIVE") {
      if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
        await supabase.from("lecture_enrollments").delete().eq("id", existing.id);
      } else {
        // 뺐던 강의를 다시 신청했다. 숨김만 풀어 준다 — 포인트를 또 받지 않는다.
        await supabase.from("lecture_enrollments").update({ hidden_at: null }).eq("id", existing.id);
        return { success: true, already: true, message: "이미 수강 중인 강의입니다." };
      }
    }
    const { data: lecture, error: lErr } = await supabase
      .from("lectures").select("price, discount_price, author_id, duration_months, title, free_for_plans")
      .eq("id", lectureId).single();
    if (lErr || !lecture) return { success: false, error: "강의 정보를 찾을 수 없습니다." };

    /*
     * 등급 덕분에 공짜로 듣는 사람인가.
     *
     * 무엇 때문에 공짜였는지 적어 둔다. 적어두지 않으면 나중에 요금제가
     * 끝났을 때 이 수강을 닫아야 하는지 가릴 방법이 없다.
     */
    const { data: me } = await supabase
      .from("members").select("role, plan_type, plan_end_date").eq("id", userId).single();
    const freePlan = canTakeFree(me, lecture.free_for_plans) ? (lecturePlanOf(me) || "admin") : null;

    const pointsRequired = freePlan ? 0 : (lecture.discount_price || lecture.price || 0);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (lecture.duration_months || 5));

    if (pointsRequired <= 0) {
      await supabase.from("lecture_enrollments").insert({ user_id: userId, lecture_id: lectureId, points_paid: 0, expires_at: expiresAt.toISOString(), status: "ACTIVE", granted_by_plan: freePlan });
      const { count } = await supabase.from("lecture_enrollments").select("*", { count: "exact", head: true }).eq("lecture_id", lectureId).eq("status", "ACTIVE");
      await supabase.from("lectures").update({ student_count: count || 0 }).eq("id", lectureId);
      return { success: true, pointsPaid: 0 };
    }

    const { data: student } = await supabase.from("members").select("point_balance").eq("id", userId).single();
    if (!student) return { success: false, error: "회원 정보를 찾을 수 없습니다." };
    const bal = student.point_balance || 0;
    if (bal < pointsRequired) return { success: false, error: "insufficient_points", balance: bal, required: pointsRequired };

    const newBal = bal - pointsRequired;
    await supabase.from("members").update({ point_balance: newBal }).eq("id", userId);
    await supabase.from("point_transactions").insert({ member_id: userId, type: "SPEND", amount: pointsRequired, reason: `특강수강: ${lecture.title || "강의"}`, counterpart_id: lecture.author_id || null, balance_after: newBal });

    if (lecture.author_id) {
      const { data: author } = await supabase.from("members").select("point_balance").eq("id", lecture.author_id).single();
      if (author) {
        const newAuthorBal = (author.point_balance || 0) + pointsRequired;
        await supabase.from("members").update({ point_balance: newAuthorBal }).eq("id", lecture.author_id);
        await supabase.from("point_transactions").insert({ member_id: lecture.author_id, type: "EARN", amount: pointsRequired, reason: `특강수익: ${lecture.title || "강의"}`, counterpart_id: userId, balance_after: newAuthorBal });
      }
    }

    await supabase.from("lecture_enrollments").insert({ user_id: userId, lecture_id: lectureId, points_paid: pointsRequired, expires_at: expiresAt.toISOString(), status: "ACTIVE" });
    const { count } = await supabase.from("lecture_enrollments").select("*", { count: "exact", head: true }).eq("lecture_id", lectureId).eq("status", "ACTIVE");
    await supabase.from("lectures").update({ student_count: count || 0 }).eq("id", lectureId);
    return { success: true, pointsPaid: pointsRequired, balance: newBal };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 목록에서 무료 등급을 바로 고친다.
 *
 * 강의 하나 고치려고 편집 화면까지 들어갔다 나오는 것이 성가시다. 수강안내를
 * 목록에서 바꾸는 것과 같은 방식이다.
 */
export async function setLectureFreePlans(lectureId: string, plans: string[]) {
  const supabase = getAdminClient();
  try {
    const allowed = (plans || []).filter((p) => (LECTURE_PLAN_KEYS as readonly string[]).includes(p));
    const { error } = await supabase.from("lectures").update({ free_for_plans: allowed }).eq("id", lectureId);
    if (error) return { success: false, error: error.message };
    revalidateTag("lectures");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── 수강 등록 여부 확인 ──
export async function checkEnrollment(lectureId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase.from("lecture_enrollments")
      .select("id, status, expires_at, points_paid, granted_by_plan")
      .eq("user_id", userId).eq("lecture_id", lectureId).eq("status", "ACTIVE")
      .order("created_at", { ascending: false }).limit(1);
    
    if (error) {
      console.error("checkEnrollment query error:", error);
      return { success: false, enrolled: false, error: error.message };
    }
    if (!data || data.length === 0) return { success: true, enrolled: false };
    const latest = data[0];
    if (latest.expires_at && new Date(latest.expires_at) < new Date()) return { success: true, enrolled: false, expired: true };

    /*
     * 등급 덕분에 공짜로 듣던 사람은 그 등급이 살아 있어야 계속 본다.
     * 요금제가 끝나는 날 강의도 닫힌다 — 끊고도 계속 보는 일이 없어야 한다.
     * 포인트로 산 수강(granted_by_plan 이 비어 있다)은 이 검사를 타지 않는다.
     */
    if (latest.granted_by_plan) {
      const [{ data: me }, { data: lec }] = await Promise.all([
        supabase.from("members").select("role, plan_type, plan_end_date").eq("id", userId).single(),
        supabase.from("lectures").select("free_for_plans").eq("id", lectureId).single(),
      ]);
      if (!canTakeFree(me, lec?.free_for_plans)) {
        return { success: true, enrolled: false, planEnded: true };
      }
    }

    return { success: true, enrolled: true, enrollment: latest };
  } catch (err: any) { 
    console.error("checkEnrollment exception:", err);
    return { success: false, enrolled: false, error: err.message }; 
  }
}

/**
 * 수강생이 [내 강의실] 에서 강의를 뺀다.
 *
 * 지우지 않고 숨긴다. 포인트로 산 수강을 지워버리면 다시 신청할 때 포인트가
 * 또 빠진다 — 낸 값을 두 번 받는 셈이다. 숨긴 수강은 자격이 그대로 살아 있고,
 * 다시 신청하면 숨김만 풀려 쓰던 그대로 돌아온다.
 *
 * 포인트는 돌려주지 않는다. 환불 규칙을 따로 정하기 전까지 이 기능은
 * "목록에서 안 보이게 한다" 까지만 한다.
 */
export async function hideMyEnrollment(lectureId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("lecture_enrollments")
      .update({ hidden_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("lecture_id", lectureId)
      .is("hidden_at", null);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── 내 수강 특강 목록 ──
export async function getMyEnrollments(userId: string) {
  const supabase = getAdminClient();
  try {
    const { data: enrollments } = await supabase.from("lecture_enrollments")
      .select("id, lecture_id, points_paid, created_at, expires_at, status")
      // 수강생이 뺀 것은 목록에서 빠진다. 자격은 그대로다.
      .eq("user_id", userId).eq("status", "ACTIVE").is("hidden_at", null)
      .order("created_at", { ascending: false });
    if (!enrollments || enrollments.length === 0) return { success: true, data: [] };
    const ids = enrollments.map(e => e.lecture_id);
    const { data: lectures } = await supabase.from("lectures")
      .select("id, title, thumbnail_url, category, instructor_name, duration_months")
      .in("id", ids)
      .eq("is_deleted", false)
      .eq("status", "ACTIVE");
    
    if (!lectures || lectures.length === 0) return { success: true, data: [] };
    
    const m = new Map(lectures.map(l => [l.id, l]));
    
    // 강좌 정보가 존재하는 (삭제되지 않고 활성화된) 수강 신청 내역만 필터링해서 반환
    const activeEnrollments = enrollments
      .filter(e => m.has(e.lecture_id))
      .map(e => ({ ...e, lecture: m.get(e.lecture_id)! }));
      
    return { success: true, data: activeEnrollments };
  } catch { return { success: true, data: [] }; }
}
