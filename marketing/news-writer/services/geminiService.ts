
import { GoogleGenAI } from "@google/genai";
import { FormData, ImageAspectRatio, ImageStyle } from '../types';
import { SYSTEM_PROMPT, CONTENT_TYPE_OPTIONS } from '../constants';

const constructUserPrompt = (formData: FormData): string => {
  const requestedContentTypes = CONTENT_TYPE_OPTIONS
    .filter(opt => formData.contentTypes[opt.id])
    .map(opt => opt.label)
    .join(', ');

  const promptCountInfo = formData.contentTypes.prompts
    ? `- 프롬프트 개수: ${formData.promptCount}개\n`
    : '';

  const userOpinionSection = formData.userOpinion
    ? `\n[사용자 추가 의견 (이 내용을 결과물에 반드시 반영할 것)]\n${formData.userOpinion}\n`
    : '';

  return `
[원문/자료]
${formData.sourceText || '(파일 참조)'}
${userOpinionSection}
[생성 조건]
- 요청 콘텐츠: ${requestedContentTypes}
- 톤/채널: ${formData.tone}
- 문체: ${formData.writingStyle}
- 기사 길이: ${formData.articleLength}자 내외
- 블로그 길이: ${formData.blogLength}자 내외
${promptCountInfo}- 타깃: ${formData.audience}
- 채널명: ${formData.channelName || '공실뉴스'}

위 조건에 맞춰 요청된 콘텐츠를 생성해줘.
  `;
};

export async function* generateNewsContentStream(formData: FormData) {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const userPrompt = constructUserPrompt(formData);

    let contents: any;

    if (formData.file && formData.file.mimeType.startsWith('image/')) {
        contents = {
            parts: [
                {
                    inlineData: {
                        mimeType: formData.file.mimeType,
                        data: formData.file.data,
                    },
                },
                { text: userPrompt },
            ],
        };
    } else {
        contents = userPrompt;
    }
    
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of responseStream) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("Error generating content:", error);
    if (error instanceof Error) {
        yield `\n\n**오류 발생:** ${error.message}`;
    } else {
        yield `\n\n**알 수 없는 오류 발생:** API 호출에 실패했습니다.`;
    }
  }
}

export const generateImages = async (
  prompt: string,
  style: ImageStyle,
  aspectRatio: ImageAspectRatio,
  numberOfImages: number
): Promise<string[]> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const fullPrompt = `${prompt}, ${style} 스타일`;

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: fullPrompt,
      config: {
        numberOfImages: numberOfImages,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);

  } catch (error) {
    console.error("Error generating images:", error);
    if (error instanceof Error) {
        throw new Error(`이미지 생성 오류: ${error.message}`);
    }
    throw new Error("알 수 없는 오류로 이미지 생성에 실패했습니다.");
  }
};
