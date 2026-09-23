import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// CORS 헤더 설정 (크롬 확장프로그램 호출 지원)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      subtitle = "",
      content,
      section1 = "상가",
      section2 = "일반",
      keywords = [],
      imageUrl,
      imageCaption = "",
      reporterName = "김미숙",
      reporterEmail = "master@gongsilnews.com",
      status = "APPROVED",
      is_headline = false,
      is_important = false,
      photoFiles = [],
      vacancyId = null,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "제목(title)과 본문(content)은 필수 항목입니다." },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getAdminClient();

    // 1. 최고관리자 계정 탐색 (author_id 매핑)
    let authorId: string | null = null;
    const { data: adminMember } = await supabase
      .from("members")
      .select("id, name, email")
      .eq("role", "ADMIN")
      .limit(1)
      .maybeSingle();

    if (adminMember) {
      authorId = adminMember.id;
    } else {
      // 대체 회원 조회
      const { data: anyMember } = await supabase
        .from("members")
        .select("id")
        .limit(1)
        .maybeSingle();
      authorId = anyMember ? anyMember.id : "00000000-0000-0000-0000-000000000000";
    }

    // 2. 최신 기사 번호(article_no) 산출
    const { data: latestArticle } = await supabase
      .from("articles")
      .select("article_no")
      .order("article_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextArticleNo = (latestArticle?.article_no || 1039) + 1;

    // 3. 이미지 처리 (Base64 또는 외부 이미지 URL일 경우 Supabase Storage 업로드)
    let finalImageUrl = imageUrl || "";

    if (imageUrl && (imageUrl.startsWith("data:image/") || imageUrl.startsWith("http"))) {
      try {
        if (imageUrl.startsWith("data:image/")) {
          // Base64 처리
          const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], "base64");
            const ext = mimeType.split("/")[1] || "jpg";
            const fileName = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from("news-images")
              .upload(fileName, buffer, { contentType: mimeType, upsert: true });

            if (!uploadErr && uploadData) {
              const { data: pubUrl } = supabase.storage
                .from("news-images")
                .getPublicUrl(uploadData.path);
              finalImageUrl = pubUrl.publicUrl;
            }
          }
        } else if (imageUrl.startsWith("http") && !imageUrl.includes("supabase.co")) {
          // 외부 이미지 다운로드 후 업로드 시도 (실패 시 원본 URL 유지)
          try {
            const resp = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = resp.headers.get("content-type") || "image/jpeg";
              const ext = contentType.includes("png") ? "png" : "jpg";
              const fileName = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

              const { data: uploadData, error: uploadErr } = await supabase.storage
                .from("news-images")
                .upload(fileName, buffer, { contentType, upsert: true });

              if (!uploadErr && uploadData) {
                const { data: pubUrl } = supabase.storage
                  .from("news-images")
                  .getPublicUrl(uploadData.path);
                finalImageUrl = pubUrl.publicUrl;
              }
            }
          } catch (fetchErr) {
            console.warn("외부 이미지 업로드 실패, 원본 URL 유지:", fetchErr);
          }
        }
      } catch (imgErr) {
        console.warn("이미지 업로드 예외 발생:", imgErr);
      }
    }

    // 이미지가 아직 없다면 한국형 부동산 기본 실사 사진 안전망 할당
    if (!finalImageUrl) {
      finalImageUrl = "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?auto=format&fit=crop&w=1200&q=80";
    }

    // 4. 본문 HTML 정제 (줄바꿈 문단을 <p> 태그로 래핑)
    let formattedContent = content;
    if (!content.includes("<p>") && !content.includes("<div")) {
      const paras = content
        .split(/\n{2,}|\n/)
        .map((p: string) => p.trim())
        .filter(Boolean);
      formattedContent = paras.map((p: string) => `<p>${p}</p>`).join("\n");
    }

    // 5. articles 테이블 INSERT
    const nowIso = new Date().toISOString();
    const articlePayload: any = {
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : null,
      content: formattedContent,
      section1: section1 || "상가",
      section2: section2 || "일반",
      author_id: authorId,
      author_name: reporterName || "김미숙",
      author_email: reporterEmail || "master@gongsilnews.com",
      thumbnail_url: finalImageUrl || null,
      status: status || "APPROVED",
      published_at: nowIso,
      is_deleted: false,
      is_headline: is_headline || false,
      is_important: is_important || false,
      view_count: 0,
      edit_count: 0,
    };

    const { data: insertedArticle, error: insertError } = await supabase
      .from("articles")
      .insert(articlePayload)
      .select("id, article_no, title")
      .single();

    if (insertError || !insertedArticle) {
      console.error("기사 저장 실패:", insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || "기사 저장 실패" },
        { status: 500, headers: corsHeaders }
      );
    }

    const articleId = insertedArticle.id;

    // 6. article_media 테이블 이미지들 INSERT (다중 사진 + 지도/로드뷰 지원)
    if (Array.isArray(photoFiles) && photoFiles.length > 0) {
      const mediaRows = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const p = photoFiles[i];
        let pUrl = p.preview || "";
        // Base64인 경우 Supabase Storage에 업로드
        if (pUrl.startsWith("data:image/")) {
          try {
            const matches = pUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const mimeType = matches[1];
              const buffer = Buffer.from(matches[2], "base64");
              const ext = mimeType.split("/")[1] || "jpg";
              const fileName = `ext_photo_${Date.now()}_${i}.${ext}`;
              const { data: uploadData, error: uploadErr } = await supabase.storage
                .from("news-images")
                .upload(fileName, buffer, { contentType: mimeType, upsert: true });
              if (!uploadErr && uploadData) {
                const { data: pubUrl } = supabase.storage
                  .from("news-images")
                  .getPublicUrl(uploadData.path);
                pUrl = pubUrl.publicUrl;
              }
            }
          } catch (e) {
            console.warn("추가 이미지 업로드 실패:", e);
          }
        }
        if (pUrl) {
          mediaRows.push({
            article_id: articleId,
            media_type: "PHOTO",
            url: pUrl,
            filename: `photo_${i + 1}.jpg`,
            caption: p.caption || `${title} 관련 보도 사진 ${i + 1}`,
            sort_order: i,
            file_size: p.size || 150000,
          });
        }
      }
      if (mediaRows.length > 0) {
        const { error: batchErr } = await supabase.from("article_media").insert(mediaRows);
        if (batchErr) console.error("article_media 다중 사진 저장 오류:", batchErr);
      }
    } else if (finalImageUrl) {
      const { error: mediaErr } = await supabase.from("article_media").insert({
        article_id: articleId,
        media_type: "PHOTO",
        url: finalImageUrl,
        filename: "article_cover.jpg",
        caption: imageCaption || `${title} 관련 보도 사진`,
        sort_order: 0,
        file_size: 150000,
      });
      if (mediaErr) {
        console.error("article_media 저장 오류:", mediaErr);
      }
    }

    // 6-2. 공실 매물 연동 (ATTACHED_VACANCY)
    if (vacancyId) {
      try {
        const { data: vac } = await supabase
          .from("vacancies")
          .select("id, vacancy_no, building_name, sido, sigungu, dong, detail_addr, trade_type, deposit, monthly_rent, maintenance_fee, exclusive_m2, supply_m2, room_count, bath_count, themes")
          .eq("id", vacancyId)
          .single();

        if (vac) {
          await supabase.from("article_media").insert({
            article_id: articleId,
            media_type: "ATTACHED_VACANCY",
            url: vac.id,
            filename: "ATTACHED_VACANCY",
            caption: JSON.stringify({
              id: vac.id,
              title: `[${vac.trade_type}] ${vac.building_name || "공실 매물"}`,
              deposit: vac.deposit,
              monthly_rent: vac.monthly_rent,
              exclusive_m2: vac.exclusive_m2,
              sido: vac.sido,
              sigungu: vac.sigungu,
              dong: vac.dong
            }),
            sort_order: 99
          });
        }
      } catch (vacLinkErr) {
        console.warn("기사 공실 매물 연동 처리 오류:", vacLinkErr);
      }
    }

    // 7. article_keywords 테이블 INSERT
    if (Array.isArray(keywords) && keywords.length > 0) {
      const keywordRows = keywords
        .filter(Boolean)
        .map((kw: string) => ({
          article_id: articleId,
          keyword: kw.replace(/^#/, "").trim(),
        }));

      if (keywordRows.length > 0) {
        await supabase.from("article_keywords").insert(keywordRows);
      }
    }

    return NextResponse.json(
      {
        success: true,
        articleId,
        articleNo: insertedArticle.article_no,
        title: insertedArticle.title,
        articleUrl: `/news/${articleId}`,
        publishedAt: nowIso,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("확장프로그램 기사 발행 API 예외:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 내부 오류" },
      { status: 500, headers: corsHeaders }
    );
  }
}
