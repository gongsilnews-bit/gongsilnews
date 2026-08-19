
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsSegment, ImageStyle, SegmentationMode, AspectRatio, VisualPromptType } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

async function callServerGemini(action: string, payload: any) {
  const res = await fetch('/api/marketing/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Server Gemini call failed');
  }
  return data;
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Wraps raw PCM data into a playable WAV blob
 */
export function createWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // FMT sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // Data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmData.length, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
}

const GLOBAL_VISUAL_RULES = `
**VISUAL STYLE & COMPOSITION RULES:**
1. **TEXT & LANGUAGE POLICY:**
   - **Standard Model (Nano Banana / Gemini 2.5 Flash):** **STRICTLY NO TEXT.** **ABSOLUTELY NO KOREAN (Hangul).** It renders as broken artifacts and gibberish.
   - **Pro Model (Nano Banana Pro / Gemini 3 Pro):** Text and Korean (Hangul) are allowed.
   - **CURRENT MODE:** Assume Standard Model constraints. **DO NOT include any text or Hangul.**
2. **CURRENCY SYMBOLS:** 
   - **MINIMIZE USAGE:** Do NOT use currency symbols ($ or ₩) by default. Keep the image clean.
   - **EXCEPTION:** Only use currency symbols if the segment specifically describes *physical cash*, *coins*, or a *close-up of a financial chart* where the currency type is critical.
   - **If used:** Use **$** for US/Global news, **₩** for Korean news.
3. **SETTING:** The visual setting is modern South Korea unless the news specifies a foreign location.
`;

const GET_INSTRUCTION = (mode: SegmentationMode, targetClipCount?: number) => {
  let instruction = "";
  if (mode === 'detailed') {
    instruction = `
You are a professional storyboard artist for "Gongsil News".
Task: Break the script into **highly granular** visual segments.

**CRITICAL REQUIREMENT:**
- **Split the script into very short segments.**
- Aim for roughly **2x more segments** than a standard paragraph breakdown.
- Each segment should consist of only **1 short sentence** or even a phrase if it carries a distinct visual idea.
- Do NOT group multiple sentences together. Keep it fast-paced.

${GLOBAL_VISUAL_RULES}

For each segment, provide:
1. narrative: The specific part of the script for this segment.
2. visualPrompt: A highly descriptive English prompt for an AI image generator.
`;
  } else if (mode === 'balanced') {
    instruction = `
You are a professional storyboard artist for "Gongsil News".
Task: Break the script into **balanced** visual segments.

**Requirements:**
- Split the script by individual sentences.
- Each segment should focus on a single visual idea or fact.
- This is more granular than a paragraph-based split, but less aggressive than splitting every single phrase.
- Provide a smooth visual flow that matches the narrative rhythm.

${GLOBAL_VISUAL_RULES}

For each segment, provide:
1. narrative: The text for this segment.
2. visualPrompt: A descriptive English prompt for an AI image generator.
`;
  } else if (mode === 'single') {
    instruction = `
You are a professional storyboard artist.
Task: Create a **single** visual segment for the entire script.

**CRITICAL REQUIREMENT:**
- Do NOT split the script.
- Return exactly one segment containing the entire text in "narrative".
- Provide one comprehensive visualPrompt that captures the main theme.

${GLOBAL_VISUAL_RULES}
`;
  } else {
    // standard
    instruction = `
You are a professional storyboard artist for "Gongsil News".
Task: Break the script into **standard** visual segments.

**Requirements:**
- Split the script naturally by paragraphs or logically grouped sentences.
- Group related sentences together if they form a single visual scene.
- Ensure the flow is natural for a news report.

${GLOBAL_VISUAL_RULES}

For each segment, provide:
1. narrative: The text for this segment.
2. visualPrompt: A descriptive English prompt for an AI image generator.
`;
  }

  if (targetClipCount && targetClipCount > 0 && mode !== 'single') {
    instruction += `\n**EXACT CLIP COUNT REQUIREMENT:**\n- You MUST split the script into EXACTLY ${targetClipCount} segments. No more, no less.\n- Adjust the granularity of the splits to meet this exact number while maintaining logical flow.`;
  }

  return instruction;
};

export const parseScriptToSegments = async (script: string, mode: SegmentationMode = 'detailed', targetClipCount?: number): Promise<NewsSegment[]> => {
  const ai = getAI();
  const systemInstruction = GET_INSTRUCTION(mode, targetClipCount);
  const prompt = mode === 'single' 
    ? `Treat this entire text as one segment. Script: \n\n ${script}`
    : `Analyze this news script and break it down based on the instructions. Script: \n\n ${script}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            visualPrompt: { type: Type.STRING }
          },
          required: ["narrative", "visualPrompt"]
        }
      }
    }
  });

  const rawJson = JSON.parse(response.text || "[]");
  return rawJson.map((item: any, index: number) => ({
    id: `seg-${Date.now()}-${index}`,
    originalText: item.narrative,
    narrative: item.narrative,
    visualPrompt: item.visualPrompt,
    visualType: 'auto'
  }));
};

export const regenerateVisualPrompt = async (narrative: string, visualType: VisualPromptType = 'auto'): Promise<string> => {
  const ai = getAI();
  
  let focusInstruction = "Focus on architectural details, urban scenes, or visual metaphors for real estate vacancy and market trends.";
  
  if (visualType === 'background') {
    focusInstruction = "Focus EXCLUSIVELY on environmental shots: empty office spaces, city skylines, modern buildings, streets of Seoul, or architectural details. No people in focus. Static and atmospheric.";
  } else if (visualType === 'character') {
    focusInstruction = "Focus on PEOPLE. Depict Korean office workers, real estate agents, or citizens in a modern setting. Capture expressions relevant to the news (worry, discussion, busy work). Mid-shot or close-up.";
  } else if (visualType === 'graph') {
    focusInstruction = "Focus on INFOGRAPHICS. Create a high-quality 3D visualization, abstract bar charts, rising/falling arrows, or pictograms representing the data. Clean, modern, corporate style. Minimalist. NO TEXT.";
  }

  const prompt = `Based on this news script segment, write a highly descriptive English image generation prompt. 
${focusInstruction}
The prompt should be professional and cinematic. 

**CRITICAL RULES:**
1. **NO TEXT:** Do NOT include any text, words, letters, or characters in the image.
   - **STRICT BAN:** **NO KOREAN TEXT (Hangul).** The image generator (Nano Banana) cannot render it.
2. **MINIMIZE SYMBOLS:** Avoid currency symbols ($, ₩) unless the visual is specifically about physical money or exchange rates. 
   - If absolutely necessary: Use **$** for US/Global, **₩** for Korea.
   - Otherwise, prefer abstract visual metaphors (e.g. rising graphs, buildings, handshakes) without symbols.

Segment: ${narrative}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are a professional storyboard artist. Output ONLY the English prompt string, no JSON, no preamble.",
    }
  });

  return response.text?.trim() || "";
};

export const modifyVisualPrompt = async (currentPrompt: string, request: string): Promise<string> => {
  const ai = getAI();
  const prompt = `You are an expert prompt engineer for AI image generation.
Current Prompt: "${currentPrompt}"
User Modification Request: "${request}"

Task: Rewrite the prompt to incorporate the user's request while maintaining the professional and cinematic style.
- If the user asks to remove text, emphasize "no text, clear background, minimalist" in the prompt.
- If the user asks for a specific object or change, integrate it naturally.
- Ensure **NO KOREAN TEXT (Hangul)** is included in the final prompt description.
- Output ONLY the new English prompt string.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction: "Output ONLY the modified English prompt.",
    }
  });

  return response.text?.trim() || currentPrompt;
};

export const generateVideoPrompt = async (narrative: string, visualPrompt: string): Promise<string> => {
  const ai = getAI();
  const prompt = `You are an expert director for video generation AI (like Veo). 
We have a starting image described as: "${visualPrompt}".
The scene narrative is: "${narrative}".

Your task is to write a detailed English video generation prompt that describes how this image should move and evolve over a few seconds. 
Describe cinematic camera movements (e.g., slow zoom, tracking shot, pan), subtle environmental animations (e.g., steam rising, leaves rustling, people moving slightly), and lighting shifts.
Keep it professional, high-end, and cinematic. Output ONLY the prompt string.

Example format: "A slow cinematic zoom into the scene. The people in the room are engaged in conversation, with subtle natural movements. Sunlight shifts slightly across the floor. 4k, high detail, smooth motion."`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are a professional video director. Output ONLY the video prompt string, no preamble or explanation.",
    }
  });

  return response.text?.trim() || "";
};

export const getStyleDescription = (style: ImageStyle): string => {
  switch(style) {
    case ImageStyle.GONGSILI:
      return "Style: Gongsili Cartoon. A cute, simple white round-headed stick figure character named 'Gongsili'. Thick bold black outlines. Flat solid colors. Minimalist background. Expressive and funny facial features. 2D vector meme style. High contrast. No text.";
    case ImageStyle.PSYCHOLOGY:
      return "Style: Psychology Illustration. Minimalist stick figures with round white heads and simple bodies. Clean white background. Expressive facial features showing emotions. Use symbolic metaphors (e.g., masks, glowing hearts, storm clouds, mirrors). Soft pastel accent colors. Line art style. Consistent character design. No text. No Hangul.";
    case ImageStyle.CARTOON:
      return "Style: Premium Korean Webtoon (Manhwa) style. Vibrant colors, clean lines, detailed backgrounds, dramatic angles, anime-influenced but distinctively Korean webtoon aesthetic. High quality, 8k.";
    case ImageStyle.FLAT_ILLUSTRATION:
      return "Style: Modern Flat Vector Illustration. Minimalist, clean geometric shapes, solid soft colors, corporate Memphis design style. Professional infographic aesthetic. No text.";
    case ImageStyle.ISO_3D:
      return "Style: 3D Isometric Clay Render. Cute, soft lighting, pastel colors, blender 3d style, miniature world look. High quality, glossy finish. No text.";
    case ImageStyle.RETRO_FILM:
      return "Style: Retro Film Photography. Warm color grading, subtle film grain, nostalgic 90s Korean vibe, cinematic aesthetic, emotional atmosphere.";
    case ImageStyle.LINE_ART:
      return "Style: Minimalist Line Art. Black lines on white background, clean hand-drawn sketch style, storyboard aesthetic, simple and elegant.";
    case ImageStyle.ANIME:
      return "Style: Modern Bright Anime. Clean lines, soft shadows, bright and airy lighting, neat and detailed composition. Makoto Shinkai style atmosphere, vibrant colors, 8k resolution.";
    case ImageStyle.PIXAR:
      return "Style: 3D Pixar Animation. High-end 3D rendering, soft rounded shapes, expressive lighting, warm color palette, cinematic composition, like a feature film.";
    case ImageStyle.DISNEY:
      return "Style: Modern Disney 3D Animation. Magical atmosphere, soft glowing lighting, detailed textures, expressive characters, fairytale aesthetic, high quality render.";
    case ImageStyle.JAPANESE_ANIME:
      return "Style: High-quality Japanese Anime. Detailed backgrounds, cel-shaded characters, dramatic lighting, 90s anime aesthetic mixed with modern sharpness, 4k resolution.";
    case ImageStyle.GHIBLI:
      return "Style: Studio Ghibli. Hand-painted watercolor backgrounds, lush nature, soft natural lighting, whimsical atmosphere, Hayao Miyazaki style, nostalgic and peaceful.";
    default:
      return `Style: ${style}. High quality, cinematic lighting, 8k resolution, professional composition.`;
  }
};

export const constructFullPrompt = (corePrompt: string, style: ImageStyle): string => {
  const styleDescription = getStyleDescription(style);
  // Enforce STRICT NO KOREAN rule at the prompt construction stage to avoid rendering issues with standard models
  return `${corePrompt} (CRITICAL RULES: 1. NO TEXT, NO WRITING. 2. ABSOLUTELY NO KOREAN/HANGUL CHARACTERS. 3. Minimalist style. 4. Avoid currency symbols unless depicting physical cash). ${styleDescription}`;
};

export const generateSegmentImage = async (
  prompt: string, 
  style: ImageStyle,
  aspectRatio: AspectRatio = "16:9",
  referenceImageBase64?: string
): Promise<string> => {
  const finalPrompt = constructFullPrompt(prompt, style);
  const parts: any[] = [];
  const imageParts: { data: string; mimeType: string }[] = [];

  if (referenceImageBase64) {
    const match = referenceImageBase64.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
      imageParts.push({ mimeType: match[1], data: match[2] });
    }
  }

  if (process.env.API_KEY) {
    try {
      const ai = getAI();
      parts.push({ text: finalPrompt });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: { aspectRatio },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } catch (clientErr) {
      console.warn("Client generateSegmentImage failed, falling back to server API:", clientErr);
    }
  }

  const serverRes = await callServerGemini("generateImage", {
    prompt: finalPrompt,
    imageParts,
    aspectRatio,
    model: "gemini-2.5-flash-image",
  });

  if (serverRes.base64) {
    return `data:${serverRes.mimeType || 'image/png'};base64,${serverRes.base64}`;
  }
  throw new Error("Failed to generate image part in response");
};

export const generateSegmentAudio = async (
  text: string,
  voiceName: string,
  speed: number = 1.0
): Promise<string> => {
  if (process.env.API_KEY) {
    try {
      const ai = getAI();
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
      if (base64Audio) {
        const pcmBytes = decodeBase64(base64Audio);
        const wavBlob = createWavBlob(pcmBytes, 24000);
        return URL.createObjectURL(wavBlob);
      }
    } catch (clientErr) {
      console.warn("Client generateSegmentAudio failed, falling back to server API:", clientErr);
    }
  }

  const serverRes = await callServerGemini("generateTTS", { text, voiceName, speed });
  if (serverRes.base64Audio) {
    const pcmBytes = decodeBase64(serverRes.base64Audio);
    const wavBlob = createWavBlob(pcmBytes, 24000);
    return URL.createObjectURL(wavBlob);
  }
  throw new Error("No audio data received from Gemini TTS");
};

export const transcribeAudioToSegments = async (base64Audio: string, mimeType: string): Promise<any[]> => {
  const ai = getAI();
  const prompt = `
    Analyze this audio file.
    1. Transcribe the speech accurately into Korean.
    2. Segment the transcription by natural pauses or sentences.
    3. For each segment, provide the start time and end time in seconds.
    4. For each segment, generate a highly descriptive English visual prompt for an AI image generator based on the content. Follow these visual rules:
       - No text in images.
       - ABSOLUTELY NO KOREAN TEXT (Hangul).
       - Minimize usage of currency symbols ($ or ₩). Use only if strictly about physical money.
       - Modern South Korea setting unless specified otherwise.
    
    Output JSON array format:
    [
      {
        "narrative": "transcribed text",
        "start": 0.0,
        "end": 2.5,
        "visualPrompt": "english visual prompt"
      },
      ...
    ]
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio
          }
        },
        {
          text: prompt
        }
      ]
    },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    narrative: { type: Type.STRING },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER },
                    visualPrompt: { type: Type.STRING }
                },
                required: ["narrative", "start", "end", "visualPrompt"]
            }
        }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const generatePromptsForTexts = async (narratives: string[]): Promise<string[]> => {
    const ai = getAI();
    const prompt = `
      You are a visual prompt engineer.
      I will provide a list of text segments.
      For each segment, generate a highly descriptive English visual prompt for an AI image generator (like Midjourney or Gemini Image).
      
      Rules:
      1. No text in images.
      2. ABSOLUTELY NO KOREAN TEXT (Hangul).
      3. Minimize currency symbols. Only use $ or ₩ if the text explicitly discusses physical cash or specific exchange rates.
      4. Setting: South Korea unless specified.
      5. Style: Realistic, Cinematic.
      
      Input Texts:
      ${JSON.stringify(narratives)}
      
      Output JSON: An array of strings (the prompts) in the same order.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });

    return JSON.parse(response.text || "[]");
};
