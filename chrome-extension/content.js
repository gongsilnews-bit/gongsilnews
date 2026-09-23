// 공실뉴스 AI 마케팅 스크립터 - 웹페이지 스마트 콘텐츠 추출기
(() => {
  // 메시지 수신 리스너
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_PAGE_CONTENT") {
      const data = extractContent();
      sendResponse(data);
      return true;
    }
  });

  function extractContent() {
    // 0. 공실뉴스 매물 상세 화면 특화 추출 (최우선)
    const vacancyData = extractGongsilVacancy();
    if (vacancyData) {
      return vacancyData;
    }

    // 1. 사용자가 마우스로 드래그하여 선택한 텍스트가 있다면 최우선 채택
    const selectedText = window.getSelection() ? window.getSelection().toString().trim() : "";
    if (selectedText && selectedText.length > 20) {
      return {
        title: document.title.replace(/\s*[-|–]\s*.*$/, '').trim(),
        text: selectedText,
        url: window.location.href,
        isSelection: true
      };
    }

    // 2. 주요 뉴스 및 부동산 포털 맞춤형 셀렉터 탐색
    const host = window.location.hostname;
    let mainEl = null;

    // 네이버 뉴스
    if (host.includes("news.naver.com")) {
      mainEl = document.querySelector("#dic_area") || 
               document.querySelector("#articeBody") || 
               document.querySelector("#newsct_article");
    } 
    // 다음 / 카카오 뉴스
    else if (host.includes("news.daum.net") || host.includes("v.daum.net")) {
      mainEl = document.querySelector(".article_view") || 
               document.querySelector("#harmonyContainer");
    } 
    // 네이버 블로그
    else if (host.includes("blog.naver.com")) {
      const iframe = document.querySelector("#mainFrame");
      if (iframe && iframe.contentDocument) {
        mainEl = iframe.contentDocument.querySelector(".se-main-container") || 
                 iframe.contentDocument.querySelector("#postViewArea");
      } else {
        mainEl = document.querySelector(".se-main-container") || 
                 document.querySelector("#postViewArea");
      }
    } 
    // 네이버 부동산
    else if (host.includes("land.naver.com")) {
      mainEl = document.querySelector(".article_view") || 
               document.querySelector(".detail_summary") ||
               document.querySelector(".info_table_wrap");
    }

    // 3. 일반 웹페이지 (article, main, 본문 블록 우선 탐색)
    if (!mainEl) {
      mainEl = document.querySelector("article") || 
               document.querySelector("main") || 
               document.querySelector(".content") || 
               document.querySelector(".post-content") || 
               document.querySelector(".entry-content");
    }

    // 4. 셀렉터 실패 시 가장 많은 p 태그를 포함한 컨테이너 자동 감지
    if (!mainEl) {
      const pTags = Array.from(document.querySelectorAll("p"));
      if (pTags.length > 3) {
        // 부모 요소별 p 태그 카운트
        const parentCounts = new Map();
        pTags.forEach(p => {
          const parent = p.parentElement;
          if (parent) {
            parentCounts.set(parent, (parentCounts.get(parent) || 0) + 1);
          }
        });
        let maxCount = 0;
        parentCounts.forEach((count, parent) => {
          if (count > maxCount) {
            maxCount = count;
            mainEl = parent;
          }
        });
      }
    }

    // 최종 본문 추출 및 정제
    let rawText = "";
    if (mainEl) {
      // 주석, 스크립트, 스타일, 광고 배너 제거용 복제본 생성
      const clone = mainEl.cloneNode(true);
      const removeTargets = clone.querySelectorAll("script, style, noscript, iframe, .ad, .advertisement, [class*='banner'], [class*='comment']");
      removeTargets.forEach(el => el.remove());
      rawText = clone.innerText || clone.textContent || "";
    } else {
      rawText = document.body ? document.body.innerText : "";
    }

    // 줄바꿈 및 과도한 공백 정제
    const cleanedText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    // 제목 추출 (h1 우선, 없으면 document.title)
    const h1 = document.querySelector("h1");
    let title = h1 ? h1.innerText.trim() : document.title;
    title = title.replace(/\s*[-|–]\s*.*$/, '').trim();

    return {
      title: title || "웹페이지 기사/매물 원문",
      text: cleanedText.slice(0, 5000), // 적정 토큰 한도 (상위 5천자)
      url: window.location.href,
      isSelection: false
    };
  }

  // ── 공실뉴스 매물 상세 정보 전용 스마트 추출기 (다중 사진 + 지도/로드뷰 + 주변환경 100% 통합) ──
  function extractGongsilVacancy() {
    // 1. 공실열람 PC 지도 매물 상세 패널 (#detail-scroll-container)
    const detail = document.querySelector("#detail-scroll-container") ||
                   document.querySelector(".gdv-detail-panel") ||
                   document.querySelector("#mobile-detail-container");

    if (!detail) {
      if (!window.location.pathname.includes("/gongsil") && !window.location.pathname.includes("/homepage")) {
        return null;
      }
    }

    const container = detail || document.body;

    // 공실광고번호 / 경매물건번호 확인
    const allDivs = Array.from(container.querySelectorAll("div"));
    const vacNoLabel = allDivs.find(d => {
      const t = d.textContent ? d.textContent.trim() : "";
      return t === "공실광고번호" || t === "경매물건번호";
    });

    if (!detail && !vacNoLabel) {
      return null;
    }

    // 표 데이터 추출 헬퍼 (형제 요소 매칭 + 정규식 폴백)
    const fullText = container.innerText || container.textContent || "";
    const getValByLabel = (label) => {
      const match = allDivs.find(d => {
        const t = (d.innerText || d.textContent || "").trim();
        return t === label || t === `${label}:`;
      });
      if (match && match.nextElementSibling) {
        const val = match.nextElementSibling.innerText.trim();
        if (val) return val;
      }
      const reg = new RegExp(`${label}\\s*[:]?\\s*([^\\n]+)`);
      const m = fullText.match(reg);
      if (m && m[1]) {
        return m[1].replace(/^(소재지|단지명|동\/호수|거래구분|금액|관리비|공급\/전용면적|방수\/욕실수|방향|주차|옵션).*/, '').trim();
      }
      return "";
    };

    const vacancyNo = getValByLabel("공실광고번호") || getValByLabel("경매물건번호") || "";
    const address = getValByLabel("소재지") || "";
    const buildingNameInTable = getValByLabel("단지명") || "";
    const dongHosu = getValByLabel("동/호수") || "";
    const exclusiveArea = getValByLabel("공급/전용면적") || getValByLabel("전용면적") || getValByLabel("면적") || "";
    const floorInfo = getValByLabel("해당층/총층") || "";
    const roomBath = getValByLabel("방수/욕실수") || "";
    const direction = getValByLabel("방향") || "";
    const parking = getValByLabel("주차대수") || "";
    const options = getValByLabel("옵션") || "";
    const maintenanceFee = getValByLabel("관리비") || "";
    const moveInDate = getValByLabel("입주가능일") || "";
    const description = getValByLabel("특징 및 상세설명") || getValByLabel("입찰 및 설명") || "";

    // 상단 헤더 정보 (h2: 건물명/주소, h1: 가격)
    const h2 = container.querySelector("h2");
    const h1 = container.querySelector("h1");
    const buildingTitle = h2 ? h2.innerText.trim() : (buildingNameInTable || "공실 매물");
    const priceText = h1 ? h1.innerText.trim() : "";

    // 테마 해시태그 (#특올수리, #뻥뷰 등)
    const themeSpans = Array.from(container.querySelectorAll("span"))
      .map(s => s.innerText.trim())
      .filter(t => t.startsWith("#") && t.length > 1 && t.length < 25);
    const uniqueThemes = Array.from(new Set(themeSpans));

    // ★ 1. 공실 매물 ID 및 실물 사진 추출 (지도 타일 절대 배제! 대표 사진 1장만 추출)
    const vacancyId = (detail && detail.dataset && detail.dataset.vacancyId) || "";
    let allImages = [];
    if (detail && detail.dataset && detail.dataset.images) {
      try {
        const parsed = JSON.parse(detail.dataset.images);
        if (Array.isArray(parsed)) allImages = parsed.filter(Boolean);
      } catch (e) {}
    }

    // 만약 데이터셋에 사진이 없는 경우만 실제 매물 갤러리 영역의 사진 추출 (지도/로드뷰 타일 완전 배제)
    if (allImages.length === 0) {
      const galleryImgs = Array.from(container.querySelectorAll("img"));
      for (const img of galleryImgs) {
        const src = img.src || img.getAttribute("src") || "";
        // 카카오 지도 타일, 로드뷰 타일, 아이콘, 마커 완전 제외
        if (src && !src.includes("daumcdn.net") && !src.includes("kakaocdn.net") && !src.includes("tile") && !src.includes("map") && !src.includes("data:image/svg") && !src.includes("icon") && !src.includes("logo") && !src.includes("marker") && !src.includes("arrow")) {
          const fullUrl = src.startsWith("/") ? window.location.origin + src : src;
          if (!allImages.includes(fullUrl)) allImages.push(fullUrl);
        }
      }
    }
    // 대표 실물 사진 최대 1장만 유지
    allImages = allImages.slice(0, 1);

    // ★ 2. 뷰포트 및 요소별 정밀 좌표 추출 (실매물 인증 16:9, 지도, 로드뷰)
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1
    };

    // 1) 실매물 등록 인증 화면 (가로 16:9 와이드 비율 크롭 좌표)
    let detailRect = null;
    if (detail) {
      const dRect = detail.getBoundingClientRect();
      const listCard = document.querySelector(".realtor-card, div[class*='selected']");
      const cRect = listCard ? listCard.getBoundingClientRect() : null;

      // 왼쪽 목록(x=0)부터 상세 패널(dRect.right)까지 가로로 넉넉하게 16:9 캡쳐
      const left = Math.max(0, Math.min(cRect ? cRect.left : dRect.left, dRect.left > 200 ? 0 : dRect.left));
      const right = Math.min(window.innerWidth, Math.max(dRect.right, left + 640));
      const top = Math.max(0, Math.min(cRect ? cRect.top : dRect.top, dRect.top));
      const width = Math.max(480, right - left);
      const height = Math.round(width * 9 / 16); // ★ 가로 16:9 비율

      detailRect = {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.min(Math.round(width), window.innerWidth - Math.round(left)),
        height: Math.min(height, window.innerHeight - top)
      };
    }

    // 2) 위치 지도 요소 좌표
    const mapElem = document.getElementById("gongsil-detail-map") || document.querySelector("div[id*='map']");
    let mapRect = null;
    if (mapElem) {
      const mR = mapElem.getBoundingClientRect();
      if (mR.width > 50 && mR.height > 50) {
        mapRect = {
          left: Math.max(0, Math.round(mR.left)),
          top: Math.max(0, Math.round(mR.top)),
          width: Math.round(mR.width),
          height: Math.round(mR.height)
        };
      }
    }

    // 3) 현장 로드뷰 요소 좌표
    const rvElem = document.getElementById("gongsil-detail-roadview") || document.querySelector("div[id*='roadview']");
    let roadviewRect = null;
    if (rvElem) {
      const rR = rvElem.getBoundingClientRect();
      if (rR.width > 50 && rR.height > 50) {
        roadviewRect = {
          left: Math.max(0, Math.round(rR.left)),
          top: Math.max(0, Math.round(rR.top)),
          width: Math.round(rR.width),
          height: Math.round(rR.height)
        };
      }
    }

    // ★ 3. 주변환경(인프라: 지하철역, 학교, 쇼핑, 병원, 버스) 완벽 추출 및 지하철 중복 제거
    const infra = {
      subway: [],
      schools: [],
      shopping: [],
      hospitals: [],
      bus: []
    };

    if (detail && detail.dataset && detail.dataset.infra) {
      try {
        const parsedInfra = JSON.parse(detail.dataset.infra);
        if (parsedInfra && typeof parsedInfra === "object") {
          infra.subway = parsedInfra["지하철역"] || parsedInfra["지하철"] || [];
          infra.schools = parsedInfra["학교"] || parsedInfra["학군"] || [];
          infra.shopping = parsedInfra["쇼핑센터"] || parsedInfra["마트"] || [];
          infra.hospitals = parsedInfra["병원"] || parsedInfra["의료"] || [];
          infra.bus = parsedInfra["버스정류장"] || parsedInfra["버스"] || [];
        }
      } catch (e) {}
    }

    // 지하철역명 및 노선 깔끔한 정제/중복 제거 헬퍼
    function cleanSubwaysList(subwayArray) {
      if (!Array.isArray(subwayArray) || subwayArray.length === 0) return [];
      const stationMap = {};
      subwayArray.forEach(item => {
        if (!item || typeof item !== "string") return;
        const tokens = item.split(/[\s,·/]+/);
        let currentStation = "";
        tokens.forEach(tok => {
          if (tok.endsWith("역")) {
            currentStation = tok;
            if (!stationMap[currentStation]) stationMap[currentStation] = new Set();
          } else if (tok.endsWith("호선") || tok.includes("분당선") || tok.includes("신분당선") || tok.includes("경의중앙선") || tok.includes("공항철도")) {
            if (currentStation) {
              stationMap[currentStation].add(tok);
            }
          }
        });
      });
      const results = [];
      for (const [st, lines] of Object.entries(stationMap)) {
        if (lines.size > 1) {
          results.push(`${st}(${Array.from(lines).join("·")})`);
        } else if (lines.size === 1) {
          results.push(`${Array.from(lines)[0]} ${st}`);
        } else {
          results.push(st);
        }
      }
      return results.length > 0 ? results : Array.from(new Set(subwayArray));
    }

    infra.subway = cleanSubwaysList(infra.subway);

    // 정제된 단지명
    const cleanBuilding = buildingNameInTable || buildingTitle.replace(/^[가-힣]+동\s*(아파트|오피스텔|빌라|원룸|상가|사무실)?\s*/, '').trim() || buildingTitle;

    // 구조화된 매물 텍스트 생성 (주변환경 인프라 포함)
    const formattedLines = [
      `[공실뉴스 추천 실매물 정보]`,
      `■ 매물명: ${buildingTitle} (단지명: ${cleanBuilding})`,
      priceText ? `■ 거래종류 및 가격: ${priceText}` : "",
      vacancyNo ? `■ 공실광고번호: ${vacancyNo}` : "",
      address ? `■ 소재지: ${address} ${dongHosu ? `(${dongHosu})` : ""}` : "",
      exclusiveArea ? `■ 면적: ${exclusiveArea}` : "",
      (floorInfo || direction) ? `■ 층수/방향: ${[floorInfo, direction].filter(Boolean).join(" · ")}` : "",
      (roomBath || parking) ? `■ 구조 및 주차: ${[roomBath, parking].filter(Boolean).join(" · ")}` : "",
      options ? `■ 주요 옵션: ${options}` : "",
      maintenanceFee ? `■ 관리비: ${maintenanceFee}` : "",
      moveInDate ? `■ 입주가능일: ${moveInDate}` : "",
      uniqueThemes.length > 0 ? `■ 핵심 특장점 테마: ${uniqueThemes.join(" ")}` : "",
      infra.subway.length > 0 ? `■ 지하철 역세권: ${infra.subway.join(", ")}` : "",
      infra.schools.length > 0 ? `■ 인근 명품 학군: ${infra.schools.join(", ")}` : "",
      infra.shopping.length > 0 ? `■ 쇼핑 및 편의시설: ${infra.shopping.join(", ")}` : "",
      infra.hospitals.length > 0 ? `■ 의료 시설(병원): ${infra.hospitals.join(", ")}` : "",
      infra.bus.length > 0 ? `■ 대중교통 버스: ${infra.bus.join(", ")}` : "",
      description ? `■ 상세 설명 및 특징:\n${description}` : ""
    ].filter(Boolean);

    const formattedText = formattedLines.join("\n");
    const regionWords = address.split(" ").filter(w => w.endsWith("시") || w.endsWith("구") || w.endsWith("동") || w.endsWith("읍") || w.endsWith("면"));
    const regionShort = regionWords.slice(0, 3).join(" ") || "수도권";
    const articleTitle = `[공실뉴스 단독] ${regionShort} '${cleanBuilding}' ${priceText} 출회… 올수리·뻥뷰·트리플 역세권 주목`;

    return {
      isVacancy: true,
      vacancyId: vacancyId || "",
      title: articleTitle,
      buildingName: cleanBuilding,
      price: priceText,
      address,
      vacancyNo,
      dongHosu,
      exclusiveArea,
      floorInfo,
      direction,
      roomBath,
      parking,
      options,
      maintenanceFee,
      moveInDate,
      description,
      themes: uniqueThemes,
      images: allImages,
      imageUrl: allImages[0] || "",
      mapImage: "",
      roadviewImage: "",
      roadviewImages: [],
      detailRect: detailRect,
      mapRect: mapRect,
      roadviewRect: roadviewRect,
      viewport: viewport,
      infra: infra,
      text: formattedText,
      url: window.location.href,
      isSelection: false
    };
  }
})();

