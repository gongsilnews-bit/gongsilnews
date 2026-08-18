import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const appType = searchParams.get("app_type"); // 'studio', 'remodeling', 'home-interior', 'report', or undefined

    let query = supabase
      .from("ai_drafts")
      .select("id, title, subtitle, image_urls, created_at, updated_at")
      .eq("member_id", user.id)
      .order("updated_at", { ascending: false });

    if (appType) {
      query = query.eq("subtitle", appType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching marketing projects:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Format output
    const projects = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      app_type: row.subtitle,
      thumbnail_url: row.image_urls && row.image_urls.length > 0 ? row.image_urls[0] : null,
      image_count: row.image_urls ? row.image_urls.length : 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ success: true, projects, user: { id: user.id, email: user.email } });
  } catch (err: any) {
    console.error("Server error in GET /api/marketing/projects:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "로그인이 필요한 기능입니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      app_type = "studio",
      title = "무제 프로젝트",
      thumbnail_url,
      image_urls = [],
      project_data,
    } = body;

    if (!project_data) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST", message: "저장할 프로젝트 데이터가 없습니다." },
        { status: 400 }
      );
    }

    const allImages = [...image_urls];
    if (thumbnail_url && !allImages.includes(thumbnail_url)) {
      allImages.unshift(thumbnail_url);
    }

    const payload = {
      member_id: user.id,
      source_type: "MANUAL",
      title: title.trim(),
      subtitle: app_type,
      content_shorts: JSON.stringify(project_data),
      image_urls: allImages.slice(0, 10), // Store up to 10 image previews
      updated_at: new Date().toISOString(),
    };

    if (id) {
      // Update existing project
      const { data: updated, error: updateErr } = await supabase
        .from("ai_drafts")
        .update(payload)
        .eq("id", id)
        .eq("member_id", user.id)
        .select()
        .single();

      if (updateErr) {
        console.error("Update error:", updateErr);
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        id: updated.id,
        message: "프로젝트가 성공적으로 수정/저장되었습니다.",
      });
    } else {
      // Insert new project
      const { data: inserted, error: insertErr } = await supabase
        .from("ai_drafts")
        .insert([payload])
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        id: inserted.id,
        message: "새 프로젝트가 내 보관함에 안전하게 저장되었습니다.",
      });
    }
  } catch (err: any) {
    console.error("Server error in POST /api/marketing/projects:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
