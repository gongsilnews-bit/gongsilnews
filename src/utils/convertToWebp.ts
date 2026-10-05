/**
 * 이미지 파일을 webp(품질 0.8)로 바꾼다. 이미지가 아니거나 변환에 실패하면 원본을 돌려준다.
 * 휴대폰 원본(4000px 이상)을 그대로 두면 webp 여도 수 MB가 되므로 긴 변을 maxSize 로 줄인다.
 */
export const convertToWebp = (file: File, maxSize = 1920): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(file);
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(src);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
        } else {
          resolve(file);
        }
      }, "image/webp", 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      resolve(file);
    };
    img.src = src;
  });
};
