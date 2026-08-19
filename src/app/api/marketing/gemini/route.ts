import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "gongsilnews@gmail.com";

async function getApiKey(): Promise<string> {
  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  if (apiKey) return apiKey;

  // DB fallback
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: adminData } = await supabase
        .from("members")
        .select("sns_links")
        .eq("email", ADMIN_EMAIL)
        .single();
      const apiList = adminData?.sns_links?.api_list || [];
      const geminiApi = apiList.find((api: any) => api.provider === "구글" || api.provider === "구글 (Gemini)");
      if (geminiApi?.key_value) {
        apiKey = geminiApi.key_value.trim();
      }
    }
  } catch (e) {
    console.error("Failed to fetch API key from DB:", e);
  }

  return apiKey;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const body = await request.json();
    const { action } = body;

    if (action === "generateText") {
      const { prompt, systemInstruction, responseSchema, model = "gemini-3.6-flash" } = body;
      const config: any = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config,
      });

      return NextResponse.json({
        success: true,
        text: response.text || "",
      });
    }

    if (action === "generateImage") {
      const { prompt, imageParts = [], aspectRatio = "4:3", model = "gemini-3.1-flash-image" } = body;

      const formattedImageParts = imageParts.map((img: { data: string; mimeType: string }) => ({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      }));

      const modelsToTry = [model, "gemini-3.1-flash-image", "gemini-2.5-flash-image", "gemini-3-pro-image"];
      const triedModels = new Set<string>();

      let lastError: any = null;
      for (const m of modelsToTry) {
        if (triedModels.has(m)) continue;
        triedModels.add(m);

        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: { parts: [...formattedImageParts, { text: prompt }] },
            config: {
              responseModalities: [Modality.IMAGE],
            },
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
              return NextResponse.json({
                success: true,
                base64: part.inlineData.data,
                mimeType: part.inlineData.mimeType || "image/png",
              });
            }
          }
        } catch (err: any) {
          console.warn(`Model ${m} failed in marketing image gen:`, err.message);
          lastError = err;
        }
      }

      return NextResponse.json(
        { success: false, error: lastError?.message || "Image generation failed on all models." },
        { status: 500 }
      );
    }

    if (action === "generateTTS") {
      const { text, voiceName = "Kore", speed = 1.0 } = body;
      const speedInstruction = speed === 1.0 ? "" : ` Read this at exactly ${speed}x speed.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read this news segment professionally.${speedInstruction}\n\nSegment: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return NextResponse.json({ success: false, error: "No audio data received" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        base64Audio,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in /api/marketing/gemini:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
