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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check live status of the vacancy in the database
    const { data: vacancy } = await supabase
      .from("vacancies")
      .select("status")
      .eq("id", cleanId)
      .maybeSingle();

    let finalHtml = htmlContent;
    if (vacancy?.status === "STOPPED") {
      const flyerState = flyer.flyer_state;
      const info = flyerState?.info || {};
      const colorTheme = flyerState?.colorTheme || { primary: '#00788c', secondary: '#ff9800', dark: '#1e293b' };
      const primaryColor = colorTheme.primary || '#00788c';
      const agentMobile = info.agentMobile || info.agentPhone || "010-8831-9450";
      const agentMobileClean = agentMobile.replace(/[^0-9]/g, '');
      const agentName = info.agentName || "미래에셋공인 중개사";
      const agentRep = info.agentRepresentative || "김상태";
      const agentReg = info.agentRegistrationNumber || info.agentRegistrationNo || "";
      const agentAddress = info.agentAddress || "서울시 강남구 논현동 인근";

      const scriptCode = `
<script>
  (function() {
    function injectOverlay() {
      const pages = document.querySelectorAll('[data-export-id]');
      if (pages.length === 0) return;

      const primaryColor = "${primaryColor}";
      const agentName = "${agentName}";
      const agentRep = "${agentRep}";
      const agentReg = "${agentReg}";
      const agentMobile = "${agentMobile}";
      const agentMobileClean = "${agentMobileClean}";
      const agentAddress = "${agentAddress}";

      const overlayHtml = \`
        <div class="completed-overlay" style="position: absolute; inset: 0; background: rgba(255, 255, 255, 0.9); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; box-sizing: border-box; font-family: sans-serif; pointer-events: auto; user-select: none;">
          <!-- Top Right Agency Card -->
          <div style="position: absolute; top: 1rem; right: 2rem; background: white; border-radius: 0.75rem; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 1rem; width: 280px; text-align: left; z-index: 100000; display: flex; flex-direction: column; gap: 0.375rem; box-sizing: border-box;">
            <div style="font-size: 10px; font-weight: 900; letter-spacing: 0.1em; color: #94a3b8; text-transform: uppercase;">REALTY AGENCY</div>
            <div style="font-size: 12px; font-weight: 800; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              \${agentName} <span style="color: #cbd5e1; font-weight: normal; margin: 0 0.25rem;">|</span> <span style="color: #64748b; font-weight: 600;">대표 \${agentRep}</span>
            </div>
            \${agentReg ? \`
              <div style="font-size: 9px; color: #94a3b8; font-weight: 500; display: flex; align-items: center; gap: 0.25rem;">
                <span style="background: #f1f5f9; color: #64748b; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 8px; font-weight: 700; shrink: 0;">등록</span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">등록번호: \${agentReg}</span>
              </div>
            \` : ''}
            <div style="font-size: 12px; color: #1e293b; font-weight: 800; display: flex; align-items: center; gap: 0.375rem; margin-top: 0.125rem;">
              <svg style="width: 0.875rem; height: 0.875rem; shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="\${primaryColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <span style="color: #0f172a; font-weight: 900;">\${agentMobile}</span>
            </div>
            \${agentAddress ? \`
              <div style="font-size: 9px; color: #94a3b8; font-weight: 500; display: flex; align-items: flex-start; gap: 0.25rem; line-height: 1.25; margin-top: 0.125rem;">
                <svg style="width: 0.75rem; height: 0.75rem; shrink: 0; margin-top: 0.125rem;" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">\${agentAddress}</span>
              </div>
            \` : ''}
          </div>
 
          <!-- Central Announcement Box -->
          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 650px; z-index: 100000; box-sizing: border-box;">
            <div style="padding: 0.875rem 2rem; background-color: \${primaryColor}; color: white; font-weight: 800; font-size: 1.5rem; letter-spacing: 0.025em; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 0.75rem; white-space: nowrap;">
              본 물건은 계약완료(종료) 물건입니다.
            </div>
            <div style="font-weight: 800; font-size: 1.125rem; margin-bottom: 1.5rem; letter-spacing: 0.025em; color: \${primaryColor};">
              궁금한 내용은 아래로 문의주세요
            </div>
 
            <!-- Details Box -->
            <div style="background: white; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #f1f5f9; padding: 1.25rem; display: flex; width: 580px; text-align: left; box-sizing: border-box; gap: 1rem;">
              <!-- Left: 오시는 길 -->
              <div style="flex: 1; padding-right: 1.5rem; border-right: 1px solid #f1f5f9; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; gap: 0.375rem;">
                <div style="display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.125rem;">
                  <svg style="width: 1rem; height: 1rem; shrink: 0; stroke: \${primaryColor};" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span style="font-weight: 800; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: \${primaryColor};">오시는 길</span>
                </div>
                <div style="color: #334155; font-weight: 700; font-size: 11px; line-height: 1.5; word-break: keep-all;">
                  \${agentAddress}
                </div>
                \${agentAddress ? \`
                  <a href="https://map.naver.com/v5/search/\${encodeURIComponent(agentAddress)}" target="_blank" rel="noopener noreferrer" style="margin-top: 0.25rem; align-self: flex-start; padding: 0.375rem 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: #f8fafc; text-decoration: none; display: flex; align-items: center; gap: 0.375rem; font-size: 10px; font-weight: 700; color: #475569; cursor: pointer;">
                    <svg style="width: 0.875rem; height: 0.875rem; color: #64748b;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                    <span>네이버 지도 보기</span>
                  </a>
                \` : ''}
              </div>
 
              <!-- Right: 문의하기 -->
              <div style="flex: 1; padding-left: 1.5rem; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; gap: 0.375rem;">
                <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: \${primaryColor};">문의하기</div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
                  <span style="font-size: 17px; font-weight: 900; color: #0f172a; letter-spacing: -0.025em;">
                    \${agentMobile}
                  </span>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <!-- Phone Call Button (Larger: 3rem / 48px) -->
                    <a href="tel:\${agentMobileClean}" style="width: 3rem; height: 3rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; color: white; background-color: \${primaryColor}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer;" title="전화하기">
                      <svg style="width: 1.25rem; height: 1.25rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </a>
                    <!-- SMS Button (Standard: 2.5rem / 40px) -->
                    <a href="sms:\${agentMobileClean}" style="width: 2.5rem; height: 2.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; color: white; background-color: \${primaryColor}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); cursor: pointer;" title="문자하기">
                      <svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      \`;

      pages.forEach(function(page) {
        page.style.position = 'relative';
        const overlay = document.createElement('div');
        overlay.innerHTML = overlayHtml.trim();
        const overlayNode = overlay.firstChild;
        page.appendChild(overlayNode);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectOverlay);
    } else {
      injectOverlay();
    }
  })();
</script>
`;
      finalHtml = htmlContent.replace("</body>", `${scriptCode}</body>`);
    }

    // Return the pre-compiled standalone HTML directly to the browser
    return new NextResponse(finalHtml, {
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
