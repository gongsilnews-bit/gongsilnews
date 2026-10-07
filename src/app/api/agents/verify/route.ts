import { NextResponse } from "next/server";
import { VerifyAgent } from "@/lib/agents/VerifyAgent";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

const ALLOWED_DOCUMENT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const formData = await request.formData();
    
    // 1. 프론트엔드에서 보낸 데이터 추출
    const file = formData.get("file") as File;
    const companyName = formData.get("companyName") as string;
    const representative = formData.get("representative") as string;

    if (!file) {
      return NextResponse.json({ error: "파일이 첨부되지 않았습니다." }, { status: 400 });
    }
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "이미지 서류만 확인할 수 있습니다." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "서류 파일은 최대 10MB까지 확인할 수 있습니다." }, { status: 400 });
    }
    if (!companyName?.trim() || !representative?.trim()) {
      return NextResponse.json({ error: "상호명과 대표자명을 입력해 주세요." }, { status: 400 });
    }

    // 2. File 객체를 Buffer로 변환 (Gemini API가 읽을 수 있도록)
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    // 3. 에이전트 실행!
    const result = await VerifyAgent.verifyDocument({
      imageBuffer,
      mimeType,
      userInputData: {
        companyName,
        representative,
      },
    });

    // 4. agent_chats에 로그 저장 (비용 및 토큰)
    try {
      const inTokens = result.usage?.inputTokens || 0;
      const outTokens = result.usage?.outputTokens || 0;
      const totalTokens = result.usage?.totalTokens || 0;
      const costKrw = (inTokens * 0.075 / 1000000 * 1400) + (outTokens * 0.3 / 1000000 * 1400);

      const supabaseAdmin = createSupabaseAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      await supabaseAdmin.from("agent_chats").insert({
        channel_id: "verify",
        role: "agent",
        content: `[단일 서류 검증] ${user.id.slice(0, 8)} → ${result.status}`,
        input_tokens: inTokens,
        output_tokens: outTokens,
        total_tokens: totalTokens,
        cost_krw: costKrw,
      });
    } catch (dbErr) {
      console.error("Failed to log verify agent chat:", dbErr);
    }

    // 5. 결과 반환
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error("API /agents/verify Error:", error);
    return NextResponse.json({ error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
