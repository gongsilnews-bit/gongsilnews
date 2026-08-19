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
    역할: 당신은 '아파트 내부 인테리어 예측 시뮬레이터'의 수석 인테리어 디자이너입니다.
    목표: 사용자가 제공한 공간 정보와 설계 조건을 바탕으로, 사실적인 "인테리어 예측 렌더" 이미지를 생성하기 위한 상세한 지시사항과 요약 정보를 JSON 형식으로 생성합니다. 이 JSON의 모든 텍스트는 한국어로 작성되어야 하지만, 'imagePrompt'와 'versionDiffsEn' 필드만은 이미지 생성 모델의 성능을 위해 영어로 작성해야 합니다.

    사용자 입력:
    - 공간 유형: ${inputs.roomType}
    - 인테리어 스타일: ${inputs.style.join(', ')}
    - 천장 스타일: ${inputs.ceiling.join(', ')}
    - 바닥재: ${inputs.floor.join(', ')}
    - 벽면 마감: ${inputs.wall.join(', ')}
    - 조명 분위기: ${inputs.lighting.join(', ')}
    - 가구 톤/소재: ${inputs.furniture.join(', ')}
    - 생성 버전 수: ${inputs.versions}

    핵심 원칙 준수 (JSON 생성 시 이 원칙들을 반영해주세요):
    - 구조 보존: 원본 공간의 창문 위치, 구조벽, 천장 높이 등은 유지.
    - 현실성: 포토리얼리스틱 스타일, 과장된 CG 금지. 자연스러운 빛 반사 및 그림자.
    - 스타일 일관성: 선택된 인테리어 스타일, 천장 마감, 조명에 맞는 가구 배치와 소품 선정.
    - 디테일: 바닥재의 패턴(헤링본 등), 벽지의 질감, 조명의 색온도 반영.
    - 텍스트 제한: 이미지 생성 프롬프트(imagePrompt) 작성 시, 이미지 내에 한글 텍스트(Hangul)가 절대 포함되지 않도록 명시하세요.

    출력 형식(JSON):
    반드시 아래 스키마를 따르는 JSON 객체를 생성해주세요.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      imagePrompt: { 
        type: Type.STRING, 
        description: 'Photorealistic interior design rendering of an apartment room. Key features include...'
      },
      constraints: { 
        type: Type.STRING, 
        description: '반드시 유지해야 할 창문 위치, 내력벽, 천장고 등 공간 구조 제약 사항.' 
      },
      designSpec: {
        type: Type.OBJECT,
        properties: {
          roomType: { type: Type.STRING, description: '대상 공간 유형.' },
          style: { type: Type.STRING, description: '적용된 인테리어 스타일.' },
          ceiling: { type: Type.STRING, description: '천장 마감 및 스타일.' },
          floor: { type: Type.STRING, description: '바닥재 사양.' },
          wall: { type: Type.STRING, description: '벽면 마감 사양.' },
          lighting: { type: Type.STRING, description: '조명 및 분위기.' },
          furniture: { type: Type.STRING, description: '주요 가구 및 소재 톤.' },
        },
      },
      versionDiffsEn: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `각 버전을 차별화할 핵심 변경사항 (가구 배치, 포인트 컬러, 조명 변화 등)을 ${inputs.versions}개 항목으로 요약. 이 내용은 기본 imagePrompt에 추가되어 사용됩니다. (영어로 작성)`,
      },
      versionDiffsKo: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: `versionDiffsEn의 각 항목을 자연스러운 한국어로 번역한 내용. ${inputs.versions}개의 항목으로 요약. 이 내용은 사용자에게 표시됩니다. (한국어로 작성)`,
      },
      disclaimer: { 
        type: Type.STRING, 
        description: '결과물은 개념 시뮬레이션이며, 실제 시공 가능 여부 및 견적과는 차이가 있을 수 있다는 주의 문구.' 
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
    **PRIMARY GOAL:** Generate a photorealistic interior design rendering based on the provided source image(s) and the following instructions.
    
    **INSTRUCTIONS:** ${prompt}.
    
    **CRITICAL RULES:**
    1.  **Preserve Room Structure:** Strictly maintain the room's shape, ceiling height, window locations, and door positions from the source image. Do not move structural walls.
    2.  **Photorealism Only:** The output MUST be a high-fidelity, photorealistic image. Avoid any CG, cartoonish, or overly stylized looks. Lighting and shadows must be natural.
    3.  **Correct Perspective:** Ensure the perspective matches the original photo. Correct any lens distortion.
    4.  **Interior Focus:** Focus on the interior design elements: flooring, wall finishes, furniture, and lighting.
    5.  **Privacy Blurring:** Automatically blur any personal photos in frames or recognizable faces.
    6.  **Aspect Ratio:** The final image aspect ratio must be exactly ${aspectRatio}.
    7.  **No Korean Text:** Do NOT render any Korean text (Hangul) in the image. Any posters or books should have English or abstract text.
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