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
  // 비밀 값은 환경 변수에서만 읽는다 — 코드 안 기본값 없앰 (2026-11-09)
  const ppurioId = process.env.PPURIO_ID || "";
  const ppurioKey = process.env.PPURIO_KEY || "";
  const ppurioFrom = process.env.PPURIO_FROM || "";

  if (!ppurioId || !ppurioKey || !ppurioFrom) {
    console.error("Ppurio config missing in env variables.");
    return { success: false, error: "문자 발송 설정(PPURIO_ID·PPURIO_KEY·PPURIO_FROM)이 없습니다." };
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
  const ppurioId = process.env.PPURIO_ID || "";
  const ppurioKey = process.env.PPURIO_KEY || "";
  const senderKey = process.env.PPURIO_KAKAO_SENDER_KEY || "";

  if (!ppurioId || !ppurioKey) {
    return { success: false, error: "문자 발송 설정(PPURIO_ID·PPURIO_KEY)이 없습니다." };
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

/* ── 여러 명에게 한 번에 (관리자 회원 문자, 2026-11-09) ──
   뿌리오 /v1/message 는 targets 배열로 한 번에 1,000명까지 받는다 → 1,000명씩 나눠 보낸다.
   "성공" = 뿌리오가 접수한 것 (실제 도착 여부는 뿌리오 발송 결과에서 따로 확인) */
export function ppurioMessageType(content: string): "SMS" | "LMS" {
  return getEucKrByteLength(content) > 90 ? "LMS" : "SMS";
}

export async function sendPpurioSmsBulk({ targets, content, subject }: { targets: { to: string; name?: string }[]; content: string; subject?: string }) {
  const ppurioId = process.env.PPURIO_ID || "";
  const ppurioKey = process.env.PPURIO_KEY || "";
  const ppurioFrom = process.env.PPURIO_FROM || "";
  if (!ppurioId || !ppurioKey || !ppurioFrom) {
    return { success: false, accepted: 0, failed: targets.length, error: "문자 발송 설정(PPURIO_ID·PPURIO_KEY·PPURIO_FROM)이 없습니다." };
  }
  const clean = targets.map((t) => ({ to: t.to.replace(/[^0-9]/g, ""), name: t.name || "" })).filter((t) => /^01\d{8,9}$/.test(t.to));
  const badNumbers = targets.length - clean.length;
  if (!clean.length) return { success: false, accepted: 0, failed: targets.length, error: "보낼 수 있는 휴대폰 번호가 없습니다." };

  try {
    const credentials = Buffer.from(`${ppurioId}:${ppurioKey}`).toString("base64");
    const tokenRes = await fetch(`${PPURIO_API_URL}/token`, { method: "POST", headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" } });
    if (!tokenRes.ok) return { success: false, accepted: 0, failed: targets.length, error: `토큰 발급 실패: ${await tokenRes.text()}` };
    const token = (await tokenRes.json()).token;
    if (!token) return { success: false, accepted: 0, failed: targets.length, error: "인증 토큰이 비어 있습니다." };

    const messageType = ppurioMessageType(content);
    let accepted = 0;
    const errors: string[] = [];
    for (let i = 0; i < clean.length; i += 1000) {
      const chunk = clean.slice(i, i + 1000);
      const res = await fetch(`${PPURIO_API_URL}/message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          account: ppurioId,
          refKey: `gongsil_bulk_${Date.now()}_${i}`,
          messageType,
          content,
          from: ppurioFrom.replace(/[^0-9]/g, ""),
          duplicateFlag: "N",
          targetCount: chunk.length,
          targets: chunk,
          subject: messageType === "LMS" ? (subject || "공실뉴스") : undefined,
        }),
      });
      if (res.ok) accepted += chunk.length;
      else errors.push(await res.text());
    }
    const failed = targets.length - accepted;
    return { success: accepted > 0, accepted, failed, badNumbers, error: errors.length ? `일부 발송 실패: ${errors[0]}` : undefined };
  } catch (error: unknown) {
    return { success: false, accepted: 0, failed: targets.length, error: error instanceof Error ? error.message : "서버 오류가 발생했습니다." };
  }
}
