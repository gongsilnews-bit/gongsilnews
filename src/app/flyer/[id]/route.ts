import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return new NextResponse("Flyer ID is missing.", { status: 400 });
    }

    // Strip .html suffix if present in the URL
    const cleanId = id.replace(/\.html$/, "");

    const supabase = getAdminClient();
    const { data: flyer, error } = await supabase
      .from("vacancy_flyers")
      .select("*")
      .eq("vacancy_id", cleanId)
      .maybeSingle();

    if (error) {
      console.error("Supabase load error:", error);
      return new NextResponse("Error loading flyer from database.", { status: 500 });
    }

    if (!flyer || !flyer.flyer_state) {
      return new NextResponse("Flyer not found or not initialized yet.", { status: 404 });
    }

    const htmlContent = flyer.flyer_state.htmlContent;
    if (!htmlContent) {
      // Fallback: If flyer exists but htmlContent is missing (older saved flyers), 
      // let's show a friendly message to re-save it in the AI Editor.
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>전단지 업그레이드 안내 | 공실뉴스</title>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; margin: 0; color: #334155; }
            .card { max-width: 480px; padding: 2.5rem; background: white; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; text-align: center; }
            h1 { font-size: 1.5rem; color: #0f172a; margin-top: 0; }
            p { font-size: 0.95rem; line-height: 1.6; color: #64748b; }
            .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #00788c; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>📄 전단지 최적화 업데이트</h1>
            <p>공실뉴스의 더 완벽하고 깨짐 없는 프리미엄 전단지 엔진 업그레이드로 인해, 기존에 생성되었던 전단지 파일의 재동기화가 필요합니다.</p>
            <p><strong>[EasyFlyer AI 제작기]</strong> 화면으로 돌아가 <strong>[저장하기]</strong> 버튼을 다시 한 번 눌러주시면 무결점 HTML 전단지로 즉시 자동 재생성됩니다.</p>
            <a href="/marketing/ai-detail?vacancy_id=${cleanId}" class="btn">에디터로 이동하여 업데이트하기</a>
          </div>
        </body>
        </html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        }
      );
    }

    // Return the pre-compiled standalone HTML directly to the browser
    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("Flyer Route Handler Exception:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
