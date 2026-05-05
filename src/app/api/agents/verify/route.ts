import { NextResponse } from "next/server";
import { VerifyAgent } from "@/lib/agents/VerifyAgent";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // 1. 프론트엔드에서 보낸 데이터 추출
    const file = formData.get("file") as File;
    const companyName = formData.get("companyName") as string;
    const representative = formData.get("representative") as string;

    if (!file) {
      return NextResponse.json({ error: "파일이 첨부되지 않았습니다." }, { status: 400 });
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

    // 4. 결과 반환
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error("API /agents/verify Error:", error);
    return NextResponse.json({ error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
