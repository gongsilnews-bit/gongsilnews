import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("ai_drafts")
      .select("*")
      .eq("id", id)
      .eq("member_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    let projectData = null;
    try {
      projectData = JSON.parse(data.content_shorts || "{}");
    } catch (e) {
      projectData = {};
    }

    return NextResponse.json({
      success: true,
      project: {
        id: data.id,
        title: data.title,
        app_type: data.subtitle,
        thumbnail_url: data.image_urls && data.image_urls.length > 0 ? data.image_urls[0] : null,
        image_urls: data.image_urls || [],
        project_data: projectData,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
  } catch (err: any) {
    console.error("Server error in GET /api/marketing/projects/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user || authErr) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("ai_drafts")
      .delete()
      .eq("id", id)
      .eq("member_id", user.id);

    if (error) {
      console.error("Error deleting marketing project:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "프로젝트가 삭제되었습니다.",
    });
  } catch (err: any) {
    console.error("Server error in DELETE /api/marketing/projects/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
