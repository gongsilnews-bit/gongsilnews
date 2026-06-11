// Dummy service to prevent client-side AI API usage
export const generateNewsContentStream = async function* (formData: any) {
  yield { type: 'chunk', content: '보안상의 이유로 클라이언트 AI 생성 기능이 비활성화되었습니다.' };
};
export const generateImages = async (prompt: string, style: string, aspectRatio: string, count: number) => {
  alert('보안상의 이유로 클라이언트 AI 생성 기능이 비활성화되었습니다.');
  return [];
};
export const reviseContent = async (originalContent: string, selectedText: string, instruction: string) => {
  alert('보안상의 이유로 클라이언트 AI 생성 기능이 비활성화되었습니다.');
  return originalContent;
};
export const generateAdditionalContent = async (originalContent: string, instruction: string) => {
  alert('보안상의 이유로 클라이언트 AI 생성 기능이 비활성화되었습니다.');
  return "";
};
