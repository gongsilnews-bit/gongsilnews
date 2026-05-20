
import { GoogleGenAI, Type } from "@google/genai";
import { PropertyInfo, GeneratedContent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractAgentInfoFromImage = async (base64Data: string, mimeType: string): Promise<Partial<PropertyInfo>> => {
    const model = "gemini-3-flash-preview";

    const prompt = `
      Analyze this business card or real estate agent profile image.
      Extract the following information into JSON format:

      - agentName: The full official name of the real estate office/agency. 
        It MUST include terms indicating the type of business if present, such as "공인중개사사무소", "부동산중개법인", "부동산", "Realty".
        Do not abbreviate.
        CRITICAL: Do NOT include the person's name (representative name) in this field. Only the company name.
        For example, if the card says "Park Mi-yang" and "Danji-nae Bareun Realty", the agentName is "Danji-nae Bareun Realty".
        Do not prepend the name to the office name.
        Example: "단지내 바른 공인중개사사무소", "삼성 부동산중개법인".

      - agentRepresentative: The representative's name including their job title.
        Capture the full string that indicates the person's role and name.
        Common titles: "대표", "대표공인중개사", "소장", "이사", "실장".
        Example: "대표 공인중개사 홍길동", "소장 이영희", "김철수 대표".

      - agentPhone: Landline number (e.g. 02-xxx-xxxx).
      - agentMobile: Mobile number (e.g. 010-xxx-xxxx).
      - address: Full office address.
      - registrationNumber: Registration number (등록번호).
      
      If a field is not found, leave it as an empty string.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        agentName: { type: Type.STRING },
                        agentRepresentative: { type: Type.STRING },
                        agentPhone: { type: Type.STRING },
                        agentMobile: { type: Type.STRING },
                        address: { type: Type.STRING },
                        registrationNumber: { type: Type.STRING }
                    }
                }
            }
        });

        let text = response.text;
        if (!text) throw new Error("No response from Gemini");

        // Clean up markdown if present
        text = text.trim();
        if (text.startsWith('```')) {
             text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        const data = JSON.parse(text);

        // Construct additional info array
        const additionalInfo: string[] = [];
        if (data.registrationNumber) additionalInfo.push(`등록번호: ${data.registrationNumber}`);
        if (data.address) additionalInfo.push(`소재지: ${data.address}`);

        // Construct Naver Map URL if address exists
        let mapUrl = "";
        if (data.address) {
            mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(data.address)}`;
        }

        return {
            agentName: data.agentName || "",
            agentRepresentative: data.agentRepresentative || "",
            agentPhone: data.agentPhone || "",
            agentMobile: data.agentMobile || "",
            agentMapUrl: mapUrl,
            agentAdditionalInfo: additionalInfo.length > 0 ? additionalInfo : undefined
        };

    } catch (error) {
        console.error("Gemini Agent Analysis Error:", error);
        throw error;
    }
};

export const extractComplexInfoFromImage = async (base64Data: string, mimeType: string): Promise<Record<string, string>> => {
    const model = "gemini-3-flash-preview";

    const prompt = `
      Analyze this image of a real estate complex info table (단지정보).
      Extract values for the following fields.
      
      Fields to extract:
      - householdCount: 세대수
      - floorRange: 저/최고층 (Floor range, e.g. 15층/20층)
      - approvalDate: 사용승인일 (Approval date)
      - parking: 총주차대수 (Total parking)
      - far: 용적률 (FAR)
      - bcr: 건폐율 (BCR)
      - constructor: 건설사 (Construction company)
      - heating: 난방 (Heating system)
      - managementOffice: 관리사무소 (Management office phone)
      - address: 주소 (Address)
      - area: 면적 (Area info)

      Return a JSON object with these English keys. Values should be the exact text found in the image (in Korean/English as it appears).
      If a value is not found, exclude the key or return an empty string.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                         householdCount: { type: Type.STRING },
                         floorRange: { type: Type.STRING },
                         approvalDate: { type: Type.STRING },
                         parking: { type: Type.STRING },
                         far: { type: Type.STRING },
                         bcr: { type: Type.STRING },
                         constructor: { type: Type.STRING },
                         heating: { type: Type.STRING },
                         managementOffice: { type: Type.STRING },
                         address: { type: Type.STRING },
                         area: { type: Type.STRING },
                    }
                }
            }
        });
        
        let text = response.text;
        if (!text) return {};
        text = text.trim();
        if (text.startsWith('```')) text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        
        const data = JSON.parse(text);
        
        // Map English keys back to Korean titles typically used in the table
        const mapping: Record<string, string> = {
            householdCount: '세대수',
            floorRange: '저/최고층',
            approvalDate: '사용승인일',
            parking: '총주차대수',
            far: '용적률',
            bcr: '건폐율',
            constructor: '건설사',
            heating: '난방',
            managementOffice: '관리사무소',
            address: '주소',
            area: '면적',
        };

        const result: Record<string, string> = {};
        for (const [engKey, val] of Object.entries(data)) {
            if (val && mapping[engKey]) {
                result[mapping[engKey]] = val as string;
            }
        }
        
        return result;

    } catch (error) {
        console.error("Gemini Complex Info Error:", error);
        throw error;
    }
};

export const extractPropertyInfoFromImages = async (images: { data: string, mimeType: string }[]): Promise<{ info: Partial<PropertyInfo>, generated: GeneratedContent }> => {
    const model = "gemini-3-flash-preview";

    const prompt = `
      Analyze these real estate listing images.
      Extract all available property details and generate professional marketing copy in Korean.
      
      Tasks:
      1. Extract factual data (Address, Price, Area, etc.).
      2. Create creative marketing content for specific sections:
         
         a) Grid Section (Highlights):
            - title: Creative Korean title (e.g. "프리미엄 가치", "주요 특징")
            - intro: English subtitle (e.g. "PREMIUM VALUE", "HIGHLIGHTS")
            - features: 4 short highlights (e.g. "한강 조망", "풀옵션", "신축 첫입주")
         
         b) List Section (Details):
            - title: Creative Korean title (e.g. "품격 있는 공간 미학", "공간 상세")
            - intro: English subtitle (e.g. "THE COLLECTION", "INTERIOR DETAIL")
            - description: 2 lines summarizing the interior atmosphere.
            - items: 2 distinct zones extracted from images (e.g. Living Room, Kitchen). 
                     For each item, provide a Title (e.g. "LIVING & DINING") and a Description.

      Return JSON only.
    `;

    const imageParts = images.map(img => ({
        inlineData: { mimeType: img.mimeType, data: img.data }
    }));

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    ...imageParts,
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                safetySettings: [
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
                ],
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        address: { type: Type.STRING },
                        promotionText: { type: Type.STRING },
                        subTitle: { type: Type.STRING },
                        transactionType: { type: Type.STRING, enum: ["매매", "전세", "월세", "단기임대"] },
                        priceMain: { type: Type.STRING },
                        priceSub: { type: Type.STRING },
                        managementFee: { type: Type.STRING },
                        area: { type: Type.STRING },
                        floor: { type: Type.STRING },
                        direction: { type: Type.STRING },
                        roomCount: { type: Type.STRING },
                        parking: { type: Type.STRING },
                        moveInDate: { type: Type.STRING },
                        options: { type: Type.STRING },
                        agentName: { type: Type.STRING },
                        agentPhone: { type: Type.STRING },
                        noticeTitle: { type: Type.STRING },
                        noticeContent: { type: Type.STRING },
                        
                        // New Structured Sections
                        gridSection: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                intro: { type: Type.STRING },
                                features: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        listSection: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                intro: { type: Type.STRING },
                                description: { type: Type.STRING },
                                items: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            title: { type: Type.STRING },
                                            description: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        },
                        summary: { type: Type.STRING }
                    }
                }
            }
        });

        let text = response.text;
        if (!text) throw new Error("No response from Gemini");

        // Clean up markdown if present
        text = text.trim();
        if (text.startsWith('```')) {
             text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        const data = JSON.parse(text);

        // Map to PropertyInfo partial
        const info: Partial<PropertyInfo> = {
            address: data.address || "매물명 입력 필요",
            promotionText: data.promotionText || "",
            subTitle: data.subTitle || "",
            transactionType: data.transactionType || "매매",
            priceMain: data.priceMain || "",
            priceSub: data.priceSub || "",
            managementFee: data.managementFee || "",
            area: data.area || "",
            floor: data.floor || "",
            direction: data.direction || "",
            roomCount: data.roomCount || "",
            parking: data.parking || "",
            moveInDate: data.moveInDate || "",
            options: data.options || "",
            agentName: data.agentName || "",
            agentPhone: data.agentPhone || "",
            noticeTitle: data.noticeTitle || "매물 핵심 요약",
            noticeContent: data.noticeContent || "",
        };

        const generated: GeneratedContent = {
            promotionText: data.promotionText,
            summary: data.summary || "",
            gridInfo: data.gridSection ? {
                title: data.gridSection.title,
                intro: data.gridSection.intro,
                features: data.gridSection.features
            } : undefined,
            listInfo: data.listSection ? {
                title: data.listSection.title,
                intro: data.listSection.intro,
                description: data.listSection.description,
                items: data.listSection.items
            } : undefined
        };

        return { info, generated };

    } catch (error) {
        console.error("Gemini Vision Error:", error);
        throw error;
    }
};

export const generateFlyerCopy = async (info: PropertyInfo): Promise<GeneratedContent> => {
  const model = "gemini-3-flash-preview";

  // Construct features string from property info fields since PropertyInfo doesn't have a 'features' property
  const features = `${info.transactionType} ${info.priceMain} ${info.area} ${info.options}`;

  const prompt = `
    You are a marketing expert for Raemian Real Estate.
    Create content for a detail page based on this info:
    
    Name: ${info.address}
    Slogan Concept: ${info.promotionText}
    Key Features: ${features}
    
    Requirements:
    1. Grid Section: 4 short catchy phrases (features). Title (Korean), Intro (English).
    2. List Section: 2 paragraphs describing zones (e.g. Living Room, Kitchen). Title (Korean), Intro (English), Description, Items (Title & Text).
    3. summary: A professional one-line subtitle.

    Language: Korean (Emotional & Professional).
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
        ],
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gridSection: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    intro: { type: Type.STRING },
                    features: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            listSection: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    intro: { type: Type.STRING },
                    description: { type: Type.STRING },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        }
                    }
                }
            },
            summary: { type: Type.STRING }
          },
          required: ["gridSection", "listSection", "summary"]
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    text = text.trim();
    if (text.startsWith('```')) {
            text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(text);
    return {
        promotionText: info.promotionText, 
        summary: parsed.summary || "당신의 소중한 순간을 담아내는 특별한 공간",
        gridInfo: parsed.gridSection || {
            title: "주요 특징",
            intro: "HIGHLIGHTS",
            features: ["자연광 가득한 공간", "트렌디한 인테리어", "편리한 주차", "다양한 촬영 소품"]
        },
        listInfo: parsed.listSection || {
            title: "공간 상세",
            intro: "DETAILS",
            description: "섬세한 디테일이 돋보이는 공간입니다.",
            items: [
                { title: "LIVING ZONE", description: "따뜻한 햇살이 들어오는 거실 존입니다." },
                { title: "KITCHEN ZONE", description: "모던하고 깔끔한 키친 존입니다." }
            ]
        }
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback
    return {
      promotionText: info.promotionText,
      summary: "내 집 같은 분위기를 원하지만, 진짜 내 집은 안될 때는 미리아지트.",
      gridInfo: {
          title: "주요 특징",
          intro: "HIGHLIGHTS",
          features: ["아늑한 인테리어", "촬영 소품 구비", "합리적인 가격", "예쁜 외관"]
      },
      listInfo: {
          title: "공간 상세",
          intro: "DETAILS",
          description: "다양한 컨셉 촬영이 가능한 스튜디오입니다.",
          items: [
              { title: "MAIN ZONE", description: "자연스러운 표정을 연출하기 좋은 메인 공간입니다." },
              { title: "SUB ZONE", description: "침실 콘셉트의 사진을 찍기에 적합한 공간입니다." }
          ]
      }
    };
  }
};
