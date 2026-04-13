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

/**
 * 주어진 좌표(위경도)를 기준으로 주변 인프라 검색 (반경 1km 이내, 가까운 순 3개씩)
 * 카카오 카테고리 검색 API 사용 (SW8: 지하철, SC4: 학교, MT1: 대형마트, HP8: 병원)
 */
export async function searchNearbyInfrastructure(lat: number, lng: number, radiusMs: number = 1000): Promise<{ [category: string]: string[] }> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return {};

  const results: { [key: string]: string[] } = {
    "지하철역": [],
    "쇼핑센터": [],
    "병원": [],
    "학교": [],
    "버스정류장": []
  };

  try {
    // 1. 카테고리 검색 (지하철, 쇼핑센터, 병원)
    const categoryCalls = [
      { code: "SW8", key: "지하철역", slice: 4 },
      { code: "MT1", key: "쇼핑센터", slice: 4 },
      { code: "HP8", key: "병원", slice: 4 },
    ].map(async (cat) => {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${cat.code}&y=${lat}&x=${lng}&radius=${radiusMs}&sort=distance`;
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
      if (res.ok) {
        const data = await res.json();
        results[cat.key] = (data.documents || []).slice(0, cat.slice).map((d: any) => d.place_name);
      }
    });

    // 2. 학교 특별 처리 (초, 중, 고, 대 다양하게 수집)
    const schoolCall = fetch(`https://dapi.kakao.com/v2/local/search/category.json?category_group_code=SC4&y=${lat}&x=${lng}&radius=${radiusMs}&sort=distance&size=15`, { headers: { Authorization: `KakaoAK ${apiKey}` } })
      .then(res => res.json())
      .then(data => {
        if (data.documents) {
          const schools = data.documents;
          const ele = schools.find((s: any) => s.place_name.includes("초등학교"));
          const mid = schools.find((s: any) => s.place_name.includes("중학교"));
          const high = schools.find((s: any) => s.place_name.includes("고등학교"));
          const uni = schools.find((s: any) => s.place_name.includes("대학교"));
          
          const finalSchools: string[] = [];
          if (ele) finalSchools.push(ele.place_name);
          if (mid) finalSchools.push(mid.place_name);
          if (high) finalSchools.push(high.place_name);
          if (uni) finalSchools.push(uni.place_name);
          
          // 만약 못 채웠으면 빈자리 거리순으로 채우기
          for (const s of schools) {
            if (finalSchools.length >= 4) break;
            if (!finalSchools.includes(s.place_name)) finalSchools.push(s.place_name);
          }
          results["학교"] = finalSchools;
        }
      }).catch(err => console.error(err));

    // 3. 버스정류장 키워드 검색
    const busCall = fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=버스정류장&y=${lat}&x=${lng}&radius=${radiusMs}&sort=distance`, { headers: { Authorization: `KakaoAK ${apiKey}` } })
      .then(res => res.json())
      .then(data => {
        if (data.documents && data.documents.length > 0) {
          results["버스정류장"] = data.documents.slice(0, 4).map((d: any) => d.place_name);
        }
      }).catch(err => console.error(err));

    await Promise.all([...categoryCalls, schoolCall, busCall]);

    return results;
  } catch (err) {
    console.error("[searchNearbyInfrastructure] Error:", err);
    return {};
  }
}
