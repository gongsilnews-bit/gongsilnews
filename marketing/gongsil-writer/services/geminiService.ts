
import { GoogleGenAI } from "@google/genai";
import { FormData, ImageAspectRatio, ImageStyle, TransactionType } from '../types';
import { SYSTEM_PROMPT, CONTENT_TYPE_OPTIONS } from '../constants';

const constructUserPrompt = (formData: FormData): string => {
  const requestedContentTypes = CONTENT_TYPE_OPTIONS
    .filter(opt => formData.contentTypes[opt.id])
    .map(opt => opt.label)
    .join(', ');

  const promptCountInfo = formData.contentTypes.prompts
    ? `- 프롬프트 개수: ${formData.promptCount}개\n`
    : '';
  
  const keywordsInfo = formData.propertyKeywords.length > 0
    ? `- 강조할 특징: ${formData.propertyKeywords.join(', ')}\n`
    : '';

  let propertyInfo = '';
  if (formData.propertyType || formData.transactionType || formData.address || formData.area || formData.features) {
      let priceInfo = '';
      switch (formData.transactionType) {
          case TransactionType.SALE:
              if (formData.salePrice) priceInfo = `- 가격: 매매 ${formData.salePrice}`;
              break;
          case TransactionType.JEONSE:
              if (formData.jeonsePrice) priceInfo = `- 가격: 전세 ${formData.jeonsePrice}`;
              break;
          case TransactionType.MONTHLY_RENT:
              if (formData.deposit || formData.monthlyRent) priceInfo = `- 가격: 보증금 ${formData.deposit || '협의'} / 월세 ${formData.monthlyRent || '협의'}`;
              break;
          case TransactionType.SHORT_TERM:
              if (formData.shortTermDeposit || formData.shortTermRent) priceInfo = `- 가격: 예치금 ${formData.shortTermDeposit || '협의'} / 임대료 ${formData.shortTermRent || '협의'}`;
              break;
      }

      propertyInfo = `
[매물 정보]
- 구분: ${formData.propertyType || '미지정'}
- 거래: ${formData.transactionType || '미지정'}
- 주소: ${formData.address || '미지정'}
- 면적: ${formData.area || '미지정'}
- 특징: ${formData.features || '미지정'}
${priceInfo}
---
`;
  }


  return `
[원문/자료]
${propertyInfo}
${formData.sourceText || '(파일 참조)'}

[생성 조건]
- 요청 콘텐츠: ${requestedContentTypes}
${keywordsInfo}- 톤/채널: ${formData.tone}
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
        contents = { parts: [{ text: userPrompt }] };
    }
    
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
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
    
    const fullPrompt = `${prompt}, ${style} 스타일로 그려줘.`;
    const imageUrls: string[] = [];

    // gemini-2.5-flash-image generates one image per call by default.
    for (let i = 0; i < numberOfImages; i++) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrls.push(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    }

    return imageUrls;

  } catch (error) {
    console.error("Error generating images:", error);
    if (error instanceof Error) {
        throw new Error(`이미지 생성 오류: ${error.message}`);
    }
    throw new Error("알 수 없는 오류로 이미지 생성에 실패했습니다.");
  }
};

export const reviseContent = async (
  fullText: string,
  selectedText: string,
  instruction: string
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
**Role**: You are an expert editor for "Gongsil News".
**Task**: Partial content editing.

**Original Content (Markdown)**:
"""
${fullText}
"""

**User Selected Text (Visible Text)**:
"${selectedText}"

**User Instruction**:
"${instruction}"

**Action**:
1. Locate the section in the **Original Content** that corresponds to the **User Selected Text**. Note that the user selected text might not show markdown syntax (like **bold** or [links]), but the Original Content does.
2. Rewrite ONLY that section based on the **User Instruction**.
3. Do not change any other part of the document.
4. Return the complete updated Markdown content.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
      },
    });

    return response.text || fullText;

  } catch (error) {
    console.error("Error revising content:", error);
    throw new Error("콘텐츠 수정 중 오류가 발생했습니다.");
  }
};

export const generateAdditionalContent = async (
  currentContent: string,
  topic: string
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
**Role**: You are an expert editor for "Gongsil News".
**Task**: Write a NEW content section to be appended or inserted into the existing article.

**Existing Content Context**:
"""
${currentContent.substring(0, 2000)}${currentContent.length > 2000 ? '...' : ''}
"""

**User Request (Topic for new section)**:
"${topic}"

**Requirements**:
1. Write a section relevant to the topic.
2. Start with a Markdown H2 header (## Title).
3. The content tone should match the context.
4. Return ONLY the new section markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      },
    });

    return response.text || '';

  } catch (error) {
    console.error("Error generating additional content:", error);
    throw new Error("추가 콘텐츠 생성 중 오류가 발생했습니다.");
  }
};
