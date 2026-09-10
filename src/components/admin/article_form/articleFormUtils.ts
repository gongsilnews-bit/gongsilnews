/* ─── 기사 에디터 공통 유틸리티 함수 ─── */

/**
 * WebP 포맷으로 클라이언트 측 이미지 무손실/고효율 압축 변환
 */
export const compressToWebP = (file: File, maxWidth = 1920, quality = 0.82): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
        resolve(webpFile);
      }, 'image/webp', quality);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 유튜브 URL에서 11자리 비디오 ID 추출
 */
export const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

/**
 * 유튜브 비디오 썸네일 URL 생성
 */
export const getYoutubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * 한국식 가격 단위 포맷터 (억/만원)
 */
export const formatKoreanPrice = (price: number | undefined | null): string => {
  if (!price) return "0원";
  const val = Math.floor(price / 10000); // DB가 원 단위이므로 만원 단위로 변환
  if (val >= 10000) {
    const eok = Math.floor(val / 10000);
    const remainder = val % 10000;
    if (remainder > 0) {
      return `${eok}억 ${remainder}만원`;
    }
    return `${eok}억`;
  }
  return `${val}만원`;
};

/**
 * 마크다운 텍스트를 에디터용 HTML로 간이 변환
 */
export const parseMarkdownToHtml = (md: string): string => {
  if (!md) return "";
  let html = md;
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\s*\n\* (.*)/g, '<ul>\n<li>$1</li>\n</ul>');
  html = html.replace(/^\* (.*)/gim, '<li>$1</li>');
  html = html.replace(/\n/g, '<br />');
  return html;
};
