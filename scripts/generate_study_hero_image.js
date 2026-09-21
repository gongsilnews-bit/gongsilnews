// 공실스터디 강의목록 히어로용 실사 이미지 1장 생성 (나노바나나 = gemini-3.1-flash-image)
// PhotoCurationAgent.generateWithNanoBanana 와 같은 모델/프롬프트 규격을 쓴다.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const { GoogleGenAI, Modality } = require('@google/genai');

const OUT = path.join(process.cwd(), 'public', 'study_hero_despair.png');

const visualDesc =
  'A middle-aged South Korean male real estate agent sitting alone at the desk of his small neighborhood brokerage office, ' +
  'elbows on the desk and one hand covering his forehead, eyes closed, looking exhausted and defeated. ' +
  'A desktop monitor with property listings glows beside him, printed listing sheets scattered on the desk, ' +
  'a wall of paper property ads slightly out of focus behind him. Late afternoon light through the storefront window, ' +
  'muted desaturated tones, shallow depth of field, shot from his left side at eye level.';

const prompt = `Photorealistic editorial press photography. ${visualDesc}. Highly detailed, 8k resolution, authentic South Korean setting, natural daylight, hyper-realistic documentary photo, no cartoon, no 3D render, no text.`;

(async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('GEMINI_API_KEY 없음 (.env.local)'); process.exit(1); }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image',
    contents: prompt,
    config: {
      responseModalities: [Modality.IMAGE],
      imageConfig: { aspectRatio: '16:9' },
    },
  });

  let base64Data = null;
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) { base64Data = part.inlineData.data; break; }
  }
  if (!base64Data) { console.error('이미지 데이터 없음'); process.exit(1); }

  fs.writeFileSync(OUT, Buffer.from(base64Data, 'base64'));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`저장 완료: public/study_hero_despair.png (${kb} KB)`);
})().catch((e) => { console.error('실패:', e.message); process.exit(1); });
