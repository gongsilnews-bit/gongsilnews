import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { DesignInputs, ImageFile, SimulationResult, TextualData } from '../types';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

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

const generateTextualOutput = async (inputs: DesignInputs): Promise<Omit<TextualData, 'versionDiffKo'>> => {
  const prompt = `
    역할: 당신은 '건물 외관 리모델링 예측 시뮬레이터'의 프롬프트 엔지니어입니다.
    목표: 사용자가 제공한 설계 조건을 바탕으로, 사실적인 "예측 렌더" 이미지를 생성하기 위한 상세한 지시사항과 요약 정보를 JSON 형식으로 생성합니다. 이 JSON의 모든 텍스트는 한국어로 작성되어야 하지만, 'imagePrompt'와 'versionDiffsEn' 필드만은 이미지 생성 모델의 성능을 위해 영어로 작성해야 합니다.

    사용자 입력:
    - 외장재: ${inputs.materials.join(', ')}
    - 창호: ${inputs.windows.join(', ')}
    - 색상: ${inputs.colors.join(', ')}
    - 파사드 구성: ${inputs.facade.join(', ')}
    - 간판/사인: ${inputs.signage.join(', ')}
    - 조경: ${inputs.landscaping.join(', ')}
    - 조명: ${inputs.lighting.join(', ')}
    - 생성 버전 수: ${inputs.versions}

    핵심 원칙 준수 (JSON 생성 시 이 원칙들을 반영해주세요):
    - 구조 보존: 원본 건물의 구조벽, 층수, 창 위치 등은 유지.
    - 현실성: 포토리얼리스틱 스타일, 과장된 CG/반사 금지. 수직/수평 라인 보정.
    - 디테일: 재료 질감, 줄눈, 코너 디테일 반영.
    - 맥락 유지: 주변 환경과 스케일감 약하게 유지.
    - 개인정보 보호: 차량번호, 얼굴 등은 흐리게 처리.
    - 텍스트 제한: 이미지 생성 프롬프트(imagePrompt) 작성 시, 간판이나 외벽에 한글 텍스트(Hangul)가 절대 포함되지 않도록 명시하세요. 텍스트가 필요한 경우 반드시 영문을 사용하도록 지시하세요.

    출력 형식(JSON):
    반드시 아래 스키마를 따르는 JSON 객체를 생성해주세요.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      imagePrompt: { 
        type: Type.STRING, 
        description: 'Photorealistic architectural rendering of a remodeled building exterior. Key features include...'
      },
      constraints: { 
        type: Type.STRING, 
        description: '반드시 유지해야 할 구조, 모듈, 라인 등 제약 및 보존 규칙.' 
      },
      designSpec: {
        type: Type.OBJECT,
        properties: {
          materials: { type: Type.STRING, description: '선택된 핵심 외장재 요약.' },
          colors: { type: Type.STRING, description: '주요 색상 팔레트 요약.' },
          windows: { type: Type.STRING, description: '창호 프레임 및 스타일 요약.' },
          signage: { type: Type.STRING, description: '간판/사인 계획 요약.' },
          lighting: { type: Type.STRING, description: '조명 계획 요약.' },
          landscaping: { type: Type.STRING, description: '조경 요소 요약.' },
        },
      },
      versionDiffsEn: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `각 버전을 차별화할 핵심 변경사항 (재료, 색, 조명 전략 등)을 ${inputs.versions}개 항목으로 요약. 이 내용은 기본 imagePrompt에 추가되어 사용됩니다. (영어로 작성)`,
      },
      versionDiffsKo: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `versionDiffsEn의 각 항목을 자연스러운 한국어로 번역한 내용. ${inputs.versions}개의 항목으로 요약. 이 내용은 사용자에게 표시됩니다. (한국어로 작성)`,
      },
      disclaimer: { 
        type: Type.STRING, 
        description: '결과물은 개념 시뮬레이션이며, 실제 시공, 구조 안전, 법규 적합을 보장하지 않는다는 내용의 주의 문구.' 
      },
    },
    required: ["imagePrompt", "constraints", "designSpec", "versionDiffsEn", "versionDiffsKo", "disclaimer"]
  };

  if (process.env.API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      const jsonText = response.text.trim();
      return JSON.parse(jsonText);
    } catch (clientErr) {
      console.warn("Client-side Gemini text call failed, falling back to server API:", clientErr);
    }
  }

  const serverRes = await callServerGemini("generateText", {
    prompt,
    responseSchema: schema,
    model: "gemini-3.6-flash",
  });
  return JSON.parse(serverRes.text.trim());
};

const generateImage = async (imageFiles: ImageFile[], prompt: string, aspectRatio: string): Promise<string> => {
  const imageParts = imageFiles.map(img => ({
    data: img.base64,
    mimeType: img.type,
  }));

  const finalPrompt = `
    **PRIMARY GOAL:** Generate a photorealistic architectural rendering of a remodeled building, based on the provided source image(s) and the following instructions.
    
    **INSTRUCTIONS:** ${prompt}.
    
    **CRITICAL RULES:**
    1.  **Preserve Core Structure:** Strictly maintain the original building's structural walls, number of floors, floor heights, column spacing, and core locations from the source image.
    2.  **Photorealism Only:** The output MUST be a high-fidelity, photorealistic image. Avoid any CG, cartoonish, or overly stylized looks. Reflections and glossiness must be realistic.
    3.  **Correct Geometry:** Ensure all vertical and horizontal lines are perfectly straight. Correct any lens distortion from the source photo.
    4.  **Contextual Integrity:** Keep the adjacent sidewalks, roads, and general scale of the surroundings, but ensure the remodeled building is the main focus.
    5.  **Privacy Blurring:** Automatically blur any recognizable faces or vehicle license plates.
    6.  **Aspect Ratio:** The final image aspect ratio must be exactly ${aspectRatio}.
    7.  **No Korean Text:** Do NOT render any Korean text (Hangul) in the image. If signage is required, use English text or abstract patterns only.
    `;

  if (process.env.API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sdkParts = imageParts.map(img => ({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      }));
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: { parts: [...sdkParts, { text: finalPrompt }] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    } catch (clientErr) {
      console.warn("Client-side Gemini image call failed, falling back to server API:", clientErr);
    }
  }

  const serverRes = await callServerGemini("generateImage", {
    prompt: finalPrompt,
    imageParts,
    aspectRatio,
    model: "gemini-3.1-flash-image",
  });

  if (serverRes.base64) {
    return serverRes.base64;
  }
  throw new Error('Image generation failed, no image data returned.');
};

export const generateRemodelingSimulation = async (
  imageFiles: ImageFile[],
  designInputs: DesignInputs
): Promise<SimulationResult[]> => {
  const textualData = await generateTextualOutput(designInputs);

  const imagePromises: Promise<string>[] = [];
  for (let i = 0; i < designInputs.versions; i++) {
    const versionSpecificPrompt = `${textualData.imagePrompt}. Version-specific change: ${textualData.versionDiffsEn[i] || 'Apply base design.'}`;
    imagePromises.push(generateImage(imageFiles, versionSpecificPrompt, designInputs.aspectRatio));
  }

  const generatedImagesBase64 = await Promise.all(imagePromises);

  const results: SimulationResult[] = generatedImagesBase64.map((imgBase64, index) => ({
    image: `data:image/png;base64,${imgBase64}`,
    textData: {
      ...textualData,
      versionDiffKo: textualData.versionDiffsKo[index] || '기본 디자인',
    }
  }));

  return results;
};