const PPURIO_API_URL = "https://message.ppurio.com/v1";

interface SendSmsOptions {
  to: string;
  content: string;
  subject?: string;
}

/**
 * Calculates byte length in EUC-KR representation (Korean characters are 2 bytes, English/ASCII are 1 byte)
 */
function getEucKrByteLength(str: string): number {
  let b = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    b += c >> 7 ? 2 : 1;
  }
  return b;
}

/**
 * Ppurio SMS/LMS/MMS Send Utility
 */
export async function sendPpurioSms({ to, content, subject }: SendSmsOptions) {
  const ppurioId = process.env.PPURIO_ID || "gongsilmarketing";
  const ppurioKey = process.env.PPURIO_KEY || "e9ad769b8e119d712791ce6a0a6fa2236b851674dc560f68fba444d890fc0da1";
  const ppurioFrom = process.env.PPURIO_FROM || "15555343";

  if (!ppurioId || !ppurioKey) {
    console.error("Ppurio config missing in env variables.");
    return { success: false, error: "뿌리오 연동 설정이 누락되었습니다." };
  }

  try {
    // 1. Get Access Token
    // Credentials for Basic Auth: Base64(ID:KEY)
    const credentials = Buffer.from(`${ppurioId}:${ppurioKey}`).toString("base64");
    
    const tokenRes = await fetch(`${PPURIO_API_URL}/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Failed to get Ppurio token:", errorText);
      return { success: false, error: `토큰 발급 실패: ${errorText}` };
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    if (!token) {
      return { success: false, error: "인증 토큰이 비어있습니다." };
    }

    // Clean recipient phone number (remove hyphens, spaces)
    const cleanTo = to.replace(/[^0-9]/g, "");
    const cleanFrom = ppurioFrom.replace(/[^0-9]/g, "");

    // Decide message type (SMS: up to 90 bytes, LMS: up to 2000 bytes)
    const isLms = getEucKrByteLength(content) > 90;
    const messageType = isLms ? "LMS" : "SMS";

    // 2. Send Message
    const messageRes = await fetch(`${PPURIO_API_URL}/message`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account: ppurioId,
        refKey: `gongsil_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        messageType: messageType,
        content: content,
        from: cleanFrom,
        duplicateFlag: "N",
        targetCount: 1,
        targets: [
          {
            to: cleanTo,
          },
        ],
        subject: isLms ? (subject || "공실뉴스") : undefined,
      }),
    });

    if (!messageRes.ok) {
      const errorText = await messageRes.text();
      console.error("Failed to send Ppurio message:", errorText);
      return { success: false, error: `메시지 발송 실패: ${errorText}` };
    }

    const result = await messageRes.json();
    return { success: true, result };

  } catch (error: any) {
    console.error("Ppurio send error:", error);
    return { success: false, error: error.message || "서버 오류가 발생했습니다." };
  }
}

interface SendKakaoOptions {
  to: string;
  content: string;
  templateCode: string;
  name?: string;
  button?: any[];
}

/**
 * Ppurio Kakao AlimTalk Send Utility
 */
export async function sendPpurioKakao({ to, content, templateCode, name, button }: SendKakaoOptions) {
  const ppurioId = process.env.PPURIO_ID || "mygongsil";
  const ppurioKey = process.env.PPURIO_KEY || "e9ad769b8e119d712791ce6a0a6fa2236b851674dc560f68fba444d890fc0da1";
  const senderKey = process.env.PPURIO_KAKAO_SENDER_KEY || "";

  if (!ppurioId || !ppurioKey) {
    return { success: false, error: "뿌리오 연동 설정이 누락되었습니다." };
  }

  if (!senderKey) {
    return { success: false, error: "카카오 채널 발송 키(PPURIO_KAKAO_SENDER_KEY)가 설정되지 않았습니다." };
  }

  try {
    // 1. Get Access Token
    const credentials = Buffer.from(`${ppurioId}:${ppurioKey}`).toString("base64");
    
    const tokenRes = await fetch(`${PPURIO_API_URL}/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      return { success: false, error: `토큰 발급 실패: ${errorText}` };
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    if (!token) {
      return { success: false, error: "인증 토큰이 비어있습니다." };
    }

    const cleanTo = to.replace(/[^0-9]/g, "");

    // 2. Send Kakao AlimTalk
    const messageRes = await fetch(`${PPURIO_API_URL}/message`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account: ppurioId,
        refKey: `gongsil_kk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        messageType: "ALIMTALK",
        duplicateFlag: "N",
        targetCount: 1,
        targets: [
          {
            to: cleanTo,
            name: name || "",
          },
        ],
        alimtalk: {
          senderKey: senderKey,
          templateCode: templateCode,
          message: content,
          button: button,
        },
      }),
    });

    if (!messageRes.ok) {
      const errorText = await messageRes.text();
      console.error("Failed to send Ppurio Kakao:", errorText);
      return { success: false, error: `카카오 알림톡 발송 실패: ${errorText}` };
    }

    const result = await messageRes.json();
    return { success: true, result };

  } catch (error: any) {
    console.error("Ppurio Kakao send error:", error);
    return { success: false, error: error.message || "서버 오류가 발생했습니다." };
  }
}
