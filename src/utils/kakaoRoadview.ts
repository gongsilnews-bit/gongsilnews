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
    let attemptedCount = 0;

    for (const point of searchPoints) {
      if (isCancelled()) return;
      if (attemptedCount >= maxAttempts) break;

      const candidate = await findNearestPano(kakao, client, point, isCancelled);
      if (!candidate || attemptedPanoIds.has(candidate.panoId)) continue;

      attemptedPanoIds.add(candidate.panoId);
      attemptedCount += 1;
      const loaded = await tryCandidate(candidate);
      if (isCancelled()) return;

      if (loaded) {
        container.dataset.roadviewStatus = "ready";
        container.dataset.roadviewPanoId = String(candidate.panoId);
        container.dataset.roadviewFallback = attemptedCount > 1 ? "true" : "false";
        return;
      }

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
