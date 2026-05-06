"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidateTag } from "next/cache"

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
  description?: string;
  thumbnail_url?: string;
  images?: string[];
  instructor_name?: string;
  instructor_bio?: string;
  instructor_photo?: string;
  price?: number;
  discount_price?: number;
  discount_label?: string;
  duration_months?: number;
  total_duration?: string;
  materials?: { type: string; label?: string; url: string; }[];
  chapters?: {
    id?: string;
    chapter_no: number;
    title: string;
    sort_order: number;
    lessons: {
      id?: string;
      lesson_no: number;
      title: string;
      video_url?: string;
      duration?: string;
      is_preview?: boolean;
      sort_order: number;
    }[];
  }[];
}) {
  const supabase = getAdminClient();

  try {
    const statusMap: Record<string, string> = {
      "임시저장": "DRAFT",
      "등록신청": "PENDING",
      "공개": "ACTIVE",
      "종료": "CLOSED",
      "삭제": "DELETED",
    };

    const lectureData = {
      author_id: data.author_id || null,
      status: statusMap[data.status || ""] || data.status || "DRAFT",
      category: data.category,
      title: data.title,
      subtitle: data.subtitle || null,
      description: data.description || null,
      thumbnail_url: data.thumbnail_url || null,
      images: data.images || [],
      instructor_name: data.instructor_name || null,
      instructor_bio: data.instructor_bio || null,
      instructor_photo: data.instructor_photo || null,
      price: data.price || 0,
      discount_price: data.discount_price || null,
      discount_label: data.discount_label || null,
      duration_months: data.duration_months || 5,
      total_duration: data.total_duration || null,
      materials: data.materials || [],
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
      await supabase
        .from("lecture_chapters")
        .delete()
        .eq("lecture_id", lectureId);

      for (const chapter of data.chapters) {
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
          console.error("챕터 저장 실패:", chapterError.message);
          continue;
        }

        if (chapter.lessons && chapter.lessons.length > 0) {
          const lessonRows = chapter.lessons.map((lesson) => ({
            chapter_id: insertedChapter.id,
            lesson_no: lesson.lesson_no,
            title: lesson.title,
            video_url: lesson.video_url || null,
            duration: lesson.duration || null,
            is_preview: lesson.is_preview || false,
            sort_order: lesson.sort_order,
          }));

          const { error: lessonError } = await supabase
            .from("lecture_lessons")
            .insert(lessonRows);

          if (lessonError) {
            console.error("레슨 저장 실패:", lessonError.message);
          }
        }
      }
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

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
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

    // 챕터 조회
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
        chaptersWithLessons.push({
          ...chapter,
          lessons: lessonsByChapter[chapter.id] || [],
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
      revalidatePath("/", "layout");
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
  const supabase = getAdminClient();
  try {
    const { error } = await supabase
      .from("lecture_reviews")
      .insert({
        lecture_id: data.lecture_id,
        user_id: data.user_id || null,
        user_name: data.user_name || "익명",
        rating: data.rating,
        content: data.content,
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
        return { success: true, already: true, message: "이미 수강 중인 강의입니다." };
      }
    }
    const { data: lecture, error: lErr } = await supabase
      .from("lectures").select("price, discount_price, author_id, duration_months, title")
      .eq("id", lectureId).single();
    if (lErr || !lecture) return { success: false, error: "강의 정보를 찾을 수 없습니다." };
    const pointsRequired = lecture.discount_price || lecture.price || 0;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (lecture.duration_months || 5));

    if (pointsRequired <= 0) {
      await supabase.from("lecture_enrollments").insert({ user_id: userId, lecture_id: lectureId, points_paid: 0, expires_at: expiresAt.toISOString(), status: "ACTIVE" });
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

// ── 수강 등록 여부 확인 ──
export async function checkEnrollment(lectureId: string, userId: string) {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase.from("lecture_enrollments")
      .select("id, status, expires_at, points_paid")
      .eq("user_id", userId).eq("lecture_id", lectureId).eq("status", "ACTIVE")
      .order("created_at", { ascending: false }).limit(1);
    
    if (error) {
      console.error("checkEnrollment query error:", error);
      return { success: false, enrolled: false, error: error.message };
    }
    if (!data || data.length === 0) return { success: true, enrolled: false };
    const latest = data[0];
    if (latest.expires_at && new Date(latest.expires_at) < new Date()) return { success: true, enrolled: false, expired: true };
    return { success: true, enrolled: true, enrollment: latest };
  } catch (err: any) { 
    console.error("checkEnrollment exception:", err);
    return { success: false, enrolled: false, error: err.message }; 
  }
}

// ── 내 수강 특강 목록 ──
export async function getMyEnrollments(userId: string) {
  const supabase = getAdminClient();
  try {
    const { data: enrollments } = await supabase.from("lecture_enrollments")
      .select("id, lecture_id, points_paid, created_at, expires_at, status")
      .eq("user_id", userId).eq("status", "ACTIVE").order("created_at", { ascending: false });
    if (!enrollments || enrollments.length === 0) return { success: true, data: [] };
    const ids = enrollments.map(e => e.lecture_id);
    const { data: lectures } = await supabase.from("lectures")
      .select("id, title, thumbnail_url, category, instructor_name, duration_months").in("id", ids);
    const m = new Map((lectures || []).map(l => [l.id, l]));
    return { success: true, data: enrollments.map(e => ({ ...e, lecture: m.get(e.lecture_id) || null })) };
  } catch { return { success: true, data: [] }; }
}
