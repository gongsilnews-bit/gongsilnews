type KakaoLatLng = object;

type KakaoRoadviewInstance = {
  setPanoId: (panoId: number, position: KakaoLatLng) => void;
};

type KakaoRoadviewClient = {
  getNearestPanoId: (
    position: KakaoLatLng,
    radius: number,
    callback: (panoId: number | null) => void,
  ) => void;
};

type KakaoMapsApi = {
  maps: {
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Roadview: new (container: HTMLDivElement) => KakaoRoadviewInstance;
    RoadviewClient: new () => KakaoRoadviewClient;
    event?: {
      addListener: (target: KakaoRoadviewInstance, eventName: string, handler: () => void) => void;
      removeListener: (target: KakaoRoadviewInstance, eventName: string, handler: () => void) => void;
    };
  };
};

export type KakaoRoadviewMountOptions = {
  kakao: KakaoMapsApi;
  container: HTMLDivElement;
  lat: number;
  lng: number;
  /** 파노라마 이미지가 이 시간 안에 준비되지 않으면 다음 주변 로드뷰를 시도한다. */
  loadTimeoutMs?: number;
  /** 깨진 파노라마를 포함해 실제 이미지 로딩을 시도할 최대 횟수. */
  maxAttempts?: number;
  loadingMessage?: string;
  failureMessage?: string;
  background?: string;
  messageColor?: string;
};

type PanoCandidate = {
  panoId: number;
  position: KakaoLatLng;
};

type SearchPoint = {
  lat: number;
  lng: number;
  radius: number;
};

const activeMounts = new WeakMap<HTMLDivElement, symbol>();

/* 깨진 로드뷰 기억 (2026-11-23 대우디오빌플러스: 단지 앞 로드뷰 1212106627 은 카카오에서 끝내 안 뜬다 → 매번 4.5초 기다림)
   "앞 것은 안 뜨고 옆 것은 떴을 때"만 깨진 것으로 기억한다 — 인터넷이 느려 늦은 것은 기억하지 않는다. 이 브라우저에 2주 */
const BROKEN_KEY = "gs-roadview-broken-v2";
const BROKEN_MS = 14 * 86400000;
function brokenPanos(): Set<number> {
  try {
    localStorage.removeItem("gs-roadview-broken"); // 11-23 시험 때 잘못 쌓인 옛 목록
    const raw = JSON.parse(localStorage.getItem(BROKEN_KEY) || "{}") as Record<string, number>;
    const now = Date.now();
    return new Set(Object.entries(raw).filter(([, at]) => now - at < BROKEN_MS).map(([k]) => Number(k)));
  } catch { return new Set(); }
}
function rememberBroken(ids: number[]) {
  try {
    const raw = JSON.parse(localStorage.getItem(BROKEN_KEY) || "{}") as Record<string, number>;
    for (const id of ids) raw[String(id)] = Date.now();
    const keep = Object.entries(raw).sort((a, b) => b[1] - a[1]).slice(0, 500);
    localStorage.setItem(BROKEN_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch { /* 저장 못 해도 이번엔 넘어간다 */ }
}

function setStatusMessage(
  container: HTMLDivElement,
  message: string,
  background: string,
  color: string,
) {
  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.style.width = "100%";
  status.style.height = "100%";
  status.style.display = "flex";
  status.style.alignItems = "center";
  status.style.justifyContent = "center";
  status.style.boxSizing = "border-box";
  status.style.padding = "24px";
  status.style.background = background;
  status.style.color = color;
  status.style.fontSize = "13px";
  status.style.lineHeight = "1.6";
  status.style.textAlign = "center";
  status.style.wordBreak = "keep-all";
  status.textContent = message;
  container.replaceChildren(status);
}

function offsetCoordinate(lat: number, lng: number, northMeters: number, eastMeters: number) {
  const latitudeDelta = northMeters / 111_320;
  const longitudeScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  const longitudeDelta = eastMeters / (111_320 * longitudeScale);
  return { lat: lat + latitudeDelta, lng: lng + longitudeDelta };
}

function buildSearchPoints(lat: number, lng: number): SearchPoint[] {
  const points: SearchPoint[] = [
    { lat, lng, radius: 50 },
    // 50m 안에 파노라마가 전혀 없는 위치를 위한 일반 확장 검색.
    { lat, lng, radius: 250 },
  ];

  // 원점의 가장 가까운 파노라마 자체가 깨졌을 때 같은 ID가 다시 선택되지 않도록
  // 주변 지점을 옮겨 검색한다. 대각선은 실제 이동 거리가 같도록 보정한다.
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [Math.SQRT1_2, Math.SQRT1_2],
    [-Math.SQRT1_2, Math.SQRT1_2],
    [-Math.SQRT1_2, -Math.SQRT1_2],
    [Math.SQRT1_2, -Math.SQRT1_2],
  ];

  for (const distance of [80, 140]) {
    for (const [northRatio, eastRatio] of directions) {
      const point = offsetCoordinate(
        lat,
        lng,
        distance * northRatio,
        distance * eastRatio,
      );
      points.push({ ...point, radius: 70 });
    }
  }

  return points;
}

function findNearestPano(
  kakao: KakaoMapsApi,
  client: KakaoRoadviewClient,
  point: SearchPoint,
  cancelled: () => boolean,
): Promise<PanoCandidate | null> {
  return new Promise((resolve) => {
    if (cancelled()) {
      resolve(null);
      return;
    }

    const position = new kakao.maps.LatLng(point.lat, point.lng);
    let settled = false;
    const queryTimer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 2_500);

    client.getNearestPanoId(position, point.radius, (panoId: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(queryTimer);
      if (cancelled() || !panoId) {
        resolve(null);
        return;
      }
      resolve({ panoId: Number(panoId), position });
    });
  });
}

/**
 * 카카오 로드뷰를 컨테이너에 렌더링한다.
 *
 * 카카오가 panoId를 반환해도 해당 파노라마의 CDN 이미지가 깨져 회색 화면만 남는
 * 경우가 있다. `init` 이벤트와 실제 큐브 이미지 로딩을 감시하고, 실패하면 원점에서
 * 떨어진 검색 좌표를 사용해 다른 panoId로 자동 재시도한다.
 *
 * React effect에서 반환값을 그대로 cleanup 함수로 사용해야 한다.
 */
export function mountKakaoRoadview({
  kakao,
  container,
  lat,
  lng,
  loadTimeoutMs = 4_500,
  maxAttempts = 3,
  loadingMessage = "로드뷰를 불러오는 중입니다.",
  failureMessage = "로드뷰를 불러올 수 없습니다. ‘로드뷰 보기’ 버튼을 이용해 주세요.",
  background = "#f3f4f6",
  messageColor = "#6b7280",
}: KakaoRoadviewMountOptions): () => void {
  const token = Symbol("kakao-roadview-mount");
  activeMounts.set(container, token);

  let disposed = false;
  let activeAttemptCleanup: (() => void) | null = null;

  const ownsContainer = () => !disposed && activeMounts.get(container) === token;
  const isCancelled = () => !ownsContainer();

  container.dataset.roadviewStatus = "loading";
  delete container.dataset.roadviewPanoId;
  delete container.dataset.roadviewFallback;
  setStatusMessage(container, loadingMessage, background, messageColor);

  const tryCandidate = (candidate: PanoCandidate): Promise<boolean> =>
    new Promise((resolve) => {
      if (isCancelled()) {
        resolve(false);
        return;
      }

      const mount = document.createElement("div");
      mount.style.width = "100%";
      mount.style.height = "100%";
      container.replaceChildren(mount);

      let roadview: KakaoRoadviewInstance | undefined;
      let settled = false;
      let loadTimer = 0;
      let imagePollTimer = 0;

      const finish = (loaded: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(loadTimer);
        window.clearInterval(imagePollTimer);
        if (roadview && kakao.maps.event?.removeListener) {
          kakao.maps.event.removeListener(roadview, "init", handleInit);
        }
        activeAttemptCleanup = null;
        resolve(loaded && ownsContainer());
      };

      const handleInit = () => finish(true);

      try {
        roadview = new kakao.maps.Roadview(mount);
        if (kakao.maps.event?.addListener) {
          kakao.maps.event.addListener(roadview, "init", handleInit);
        }

        // SDK 버전에 따라 init 이벤트가 늦거나 누락될 수 있어 실제 큐브 이미지도 확인한다.
        imagePollTimer = window.setInterval(() => {
          const hasLoadedCubeImage = Array.from(mount.querySelectorAll("img")).some(
            (image) => !image.src.startsWith("data:") && image.naturalWidth >= 256,
          );
          if (hasLoadedCubeImage) finish(true);
        }, 200);

        loadTimer = window.setTimeout(() => finish(false), loadTimeoutMs);
        activeAttemptCleanup = () => finish(false);
        roadview.setPanoId(candidate.panoId, candidate.position);
      } catch (error) {
        console.warn("[KakaoRoadview] 파노라마 렌더링 실패", error);
        finish(false);
      }
    });

  const run = async () => {
    if (!kakao?.maps?.Roadview || !kakao?.maps?.RoadviewClient || !kakao?.maps?.LatLng) {
      if (ownsContainer()) {
        container.dataset.roadviewStatus = "failed";
        setStatusMessage(container, failureMessage, background, messageColor);
      }
      return;
    }

    const client = new kakao.maps.RoadviewClient();
    const searchPoints = buildSearchPoints(lat, lng);
    const attemptedPanoIds = new Set<number>();
    const failedPanoIds: number[] = [];
    const broken = brokenPanos();
    let attemptedCount = 0;

    for (const point of searchPoints) {
      if (isCancelled()) return;
      if (attemptedCount >= maxAttempts) break;

      const candidate = await findNearestPano(kakao, client, point, isCancelled);
      if (!candidate || attemptedPanoIds.has(candidate.panoId)) continue;
      attemptedPanoIds.add(candidate.panoId);
      if (broken.has(candidate.panoId)) continue; // 전에 깨진 것으로 확인된 로드뷰 — 기다리지 않고 다음

      attemptedCount += 1;
      const loaded = await tryCandidate(candidate);
      if (isCancelled()) return;

      if (loaded) {
        // 옆 로드뷰는 떴는데 앞 것은 끝내 안 떴다 = 인터넷 탓이 아니라 그 로드뷰가 깨진 것 → 기억해 두고 다음엔 건너뛴다
        if (failedPanoIds.length) rememberBroken(failedPanoIds);
        container.dataset.roadviewStatus = "ready";
        container.dataset.roadviewPanoId = String(candidate.panoId);
        container.dataset.roadviewFallback = attemptedCount > 1 ? "true" : "false";
        return;
      }

      failedPanoIds.push(candidate.panoId);
      container.dataset.roadviewStatus = "retrying";
      setStatusMessage(
        container,
        "현재 로드뷰를 불러오지 못해 주변 로드뷰를 찾고 있습니다.",
        background,
        messageColor,
      );
    }

    if (ownsContainer()) {
      container.dataset.roadviewStatus = "failed";
      setStatusMessage(container, failureMessage, background, messageColor);
    }
  };

  void run();

  return () => {
    disposed = true;
    activeAttemptCleanup?.();
    activeAttemptCleanup = null;
    if (activeMounts.get(container) === token) {
      activeMounts.delete(container);
      delete container.dataset.roadviewStatus;
      delete container.dataset.roadviewPanoId;
      delete container.dataset.roadviewFallback;
      container.replaceChildren();
    }
  };
}
