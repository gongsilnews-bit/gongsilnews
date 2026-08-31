/**
 * 🚀 지도 성능 최적화 유틸리티
 * - 마커 배치 렌더링
 * - IndexedDB 캐싱
 * - SDK 프리로드
 */

// ── 마커 배치 생성 (requestAnimationFrame으로 비동기 처리) ──
export async function createMarkersInBatches(
  vacancies: any[],
  kakao: any,
  sharedMarkerImage: any,
  onMarkerClick: (item: any) => void,
  batchSize: number = 50
): Promise<any[]> {
  return new Promise((resolve) => {
    const markers: any[] = [];
    let currentIndex = 0;

    const processBatch = () => {
      if (currentIndex >= vacancies.length) {
        resolve(markers);
        return;
      }

      const endIndex = Math.min(currentIndex + batchSize, vacancies.length);
      const batch = vacancies.slice(currentIndex, endIndex);

      batch.forEach((v) => {
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(v.lat, v.lng),
          image: sharedMarkerImage,
        });

        kakao.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(v);
        });

        marker.customData = v;
        markers.push(marker);
      });

      currentIndex = endIndex;

      // 다음 배치는 requestAnimationFrame으로 딜레이
      if (currentIndex < vacancies.length) {
        requestAnimationFrame(processBatch);
      } else {
        resolve(markers);
      }
    };

    requestAnimationFrame(processBatch);
  });
}

// ── IndexedDB 캐싱 ──
const DB_NAME = 'gongsilnews_map_cache';
const STORE_NAME = 'vacancy_bounds';
const CACHE_TTL = 10 * 60 * 1000; // 10분 캐시

interface CachedData {
  key: string;
  data: any[];
  timestamp: number;
}

export async function getCachedVacancies(
  bbox: { swLat: number; swLng: number; neLat: number; neLng: number }
): Promise<any[] | null> {
  try {
    const key = generateBboxKey(bbox);
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const cached = request.result as CachedData | undefined;
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          resolve(cached.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB 캐시 조회 실패:', err);
    return null;
  }
}

export async function setCachedVacancies(
  bbox: { swLat: number; swLng: number; neLat: number; neLng: number },
  data: any[]
): Promise<void> {
  try {
    const key = generateBboxKey(bbox);
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const cached: CachedData = {
      key,
      data,
      timestamp: Date.now(),
    };
    
    store.put(cached);
  } catch (err) {
    console.warn('IndexedDB 캐시 저장 실패:', err);
  }
}

// ── SDK 조기 로딩 ──
export function preloadKakaoMapSDK() {
  if ((window as any).kakao?.maps) {
    return; // 이미 로드됨
  }

  const scriptId = 'kakao-map-sdk-preload';
  if (document.getElementById(scriptId)) {
    return; // 이미 로드 중
  }

  const script = document.createElement('script');
  script.id = scriptId;
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || '435d3602201a49ea712e5f5a36fe6efc'}&libraries=services,clusterer&autoload=false`;
  script.async = true;
  document.head.appendChild(script);
}

// ── 헬퍼 함수 ──
function generateBboxKey(bbox: { swLat: number; swLng: number; neLat: number; neLng: number }): string {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return `${round(bbox.swLat)},${round(bbox.swLng)},${round(bbox.neLat)},${round(bbox.neLng)}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
