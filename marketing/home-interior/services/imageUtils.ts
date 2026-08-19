/**
 * Converts any image (Base64 data URL or HTTP URL) into optimized WebP Base64 data URL.
 * Reduces image payload size by 80~90% while keeping high visual fidelity.
 */
export async function convertToWebP(
  dataUrlOrSrc: string,
  quality = 0.85,
  maxWidth = 1920
): Promise<string> {
  if (!dataUrlOrSrc || typeof dataUrlOrSrc !== 'string') return dataUrlOrSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrlOrSrc);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const webpDataUrl = canvas.toDataURL('image/webp', quality);

        if (webpDataUrl && webpDataUrl.startsWith('data:image/webp')) {
          resolve(webpDataUrl);
        } else {
          resolve(dataUrlOrSrc);
        }
      } catch (e) {
        console.warn('WebP conversion failed, using original:', e);
        resolve(dataUrlOrSrc);
      }
    };
    img.onerror = () => resolve(dataUrlOrSrc);
    img.src = dataUrlOrSrc;
  });
}
