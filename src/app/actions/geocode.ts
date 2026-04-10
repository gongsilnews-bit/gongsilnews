"use server";

/**
 * 카카오 LOCAL REST API를 이용한 주소 → 좌표 변환 (서버 사이드)
 * 
 * 사용법:
 *   const result = await geocodeAddress("서울특별시 강남구 논현동 189-13");
 *   // => { success: true, lat: 37.5172, lng: 127.0286 }
 * 
 * 환경변수 필요:
 *   KAKAO_REST_API_KEY=... (.env.local에 추가)
 */
export async function geocodeAddress(address: string): Promise<{
  success: boolean;
  lat?: number;
  lng?: number;
  error?: string;
}> {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    console.warn("[geocodeAddress] KAKAO_REST_API_KEY가 설정되지 않았습니다. .env.local에 추가해주세요.");
    return { success: false, error: "KAKAO_REST_API_KEY 미설정" };
  }

  if (!address || address.trim().length === 0) {
    return { success: false, error: "주소가 비어 있습니다." };
  }

  try {
    // 1차: 주소 검색 (도로명/지번 주소)
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&analyze_type=similar`;

    const res = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      // Next.js 캐싱: 같은 주소에 대해 1시간 캐시
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[geocodeAddress] 카카오 API 오류:", res.status, errorText);
      return { success: false, error: `카카오 API 오류 (${res.status})` };
    }

    const data = await res.json();

    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0];
      // address 타입 결과에서 좌표 추출
      const lat = parseFloat(doc.y);
      const lng = parseFloat(doc.x);

      if (!isNaN(lat) && !isNaN(lng)) {
        return { success: true, lat, lng };
      }
    }

    // 2차: 키워드 검색 (건물명 등으로 fallback)
    const keywordUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`;

    const keywordRes = await fetch(keywordUrl, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      next: { revalidate: 3600 },
    });

    if (keywordRes.ok) {
      const keywordData = await keywordRes.json();
      if (keywordData.documents && keywordData.documents.length > 0) {
        const doc = keywordData.documents[0];
        const lat = parseFloat(doc.y);
        const lng = parseFloat(doc.x);

        if (!isNaN(lat) && !isNaN(lng)) {
          return { success: true, lat, lng };
        }
      }
    }

    return { success: false, error: "좌표를 찾을 수 없습니다." };
  } catch (err: any) {
    console.error("[geocodeAddress] 예외 발생:", err);
    return { success: false, error: err.message || "알 수 없는 오류" };
  }
}
