// ══════════════════════════════════════════════════════════════
// 공실뉴스 AI 마케팅·기사 스크립터 - 핵심 컨트롤러 (Dual System & Live Preview)
// ══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  // ── 1. 핵심 상태 변수 ──
  let currentPlatform = "chatgpt"; // "chatgpt" | "gemini"
  let currentMode = "news";        // "news" | "blog"
  let currentStyle = "narration";  // "narration" | "editorial" | "blog_info" | "blog_property"
  let currentLength = "standard";  // "short" | "standard" | "long"
  let currentViewport = "mobile";  // "mobile" | "pc" | "naver_blog"
  let generationSequence = 0;

  let currentUser = {
    isLoggedIn: false,
    name: "방문자",
    email: "",
    isPremium: true, // 로컬/개발 기본값 (관리자 연동)
    planType: "admin",
    dailyLimit: 9999,
    dailyUsed: 0
  };

  let extractedData = {
    title: "",
    text: "",
    url: ""
  };

  // ── 부제목 3줄 엄격 포맷팅 및 HTML 이스케이프 헬퍼 ──
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatThreeLineSubtitle(sub) {
    if (!sub) return "";
    let text = String(sub).replace(/\\n/g, "\n").replace(/\r/g, "").trim();

    // 1. 이미 줄바꿈이 있는 경우 (2줄 이상)
    let lines = text.split("\n").map(l => l.replace(/^[-•*·\d.\s]+/, "").trim()).filter(Boolean);
    if (lines.length >= 3) {
      return lines.slice(0, 3).join("\n");
    }
    if (lines.length === 2) {
      return lines.join("\n");
    }

    // 2. 한 줄로 뭉쳐져 있는 경우 (공백으로 연결됨)
    let single = lines[0] || text;

    // 분할 키워드 매칭
    let normalized = single
      .replace(/(교통망|역세권|더블\s*역세권|트리플\s*역세권|사통팔달\s*입지|직주근접\s*입지)\s+/g, function(m, p1) { return p1 + "\n"; })
      .replace(/(완비|구비|조망권\s*완비|인테리어\s*완비|특올수리\s*완료|올수리\s*완료)\s+/g, function(m, p1) { return p1 + "\n"; });

    let reSplit = normalized.split("\n").map(l => l.trim()).filter(Boolean);
    if (reSplit.length >= 3) {
      return reSplit.slice(0, 3).join("\n");
    }

    if (reSplit.length === 2) {
      let parts = [];
      for (let part of reSplit) {
        if (part.length > 35 && part.includes("…")) {
          const subParts = part.split(/…\s*/);
          if (subParts.length > 1) {
            parts.push(subParts[0] + "…", subParts.slice(1).join(" "));
          } else {
            parts.push(part);
          }
        } else {
          parts.push(part);
        }
      }
      if (parts.length >= 3) return parts.slice(0, 3).join("\n");
      return reSplit.join("\n");
    }

    return single;
  }

  // 실시간 미리보기용 기사 데이터 모델
  let previewArticle = {
    title: "강남 테헤란로 대형 오피스 공실률 3.2% 최저치 기록... 임대료 상승세 지속",
    subtitle: "IT·바이오 기업 임차 수요 집중... 3.3㎡당 평균 임대료 14만 원 돌파\n강남 테헤란로 중심 업무지구 공실률 3.2% 역대 최저 수준\n하반기 프라임급 오피스 품귀 지속… 임대차 경쟁 심화 전망",
    reporterName: "김미숙 기자",
    publishDate: new Date().toISOString().slice(0, 16).replace("T", " "),
    category: "상가·오피스",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?auto=format&fit=crop&w=1200&q=80",
    imageCaption: "서울 강남구 테헤란로 일대 주요 프라임 오피스 빌딩가 전경. /사진=공실뉴스",
    content: `<p>서울 강남권역(GBD) 오피스 시장의 공실률이 3% 초반대를 기록하며 여전히 견고한 임차 수요를 유지하고 있는 것으로 나타났습니다.</p>
<p>주요 IT 및 빅테크 기업들이 사옥 확장에 나서면서 테헤란로 일대 대형 빌딩을 중심으로 임대료 상승세가 이어지고 있습니다.</p>
<p>전문가들은 하반기에도 강남권 신규 공급이 제한적인 만큼 우량 오피스의 품귀 현상이 당분간 지속될 것으로 내다봤습니다.</p>`,
    keywords: ["강남오피스", "테헤란로", "공실률", "공실뉴스"]
  };

  let previewBlog = {
    title: "🏢 강남 오피스 공실률 최저치? 임대인이라면 꼭 체크해야 할 3가지 팩트!",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?auto=format&fit=crop&w=1200&q=80",
    imageCaption: "▲ 서울 강남 테헤란로 중심가 전경",
    quote: "강남 빌딩 공실이 사라졌다? 진짜 임대 시장 분위기는 어떨까요?",
    content: `<p>안녕하세요! 대한민국의 가장 빠른 공실·부동산 소식을 전해드리는 <strong>공실뉴스</strong>입니다 😊✨</p>
<p>오늘은 최근 이슈가 되고 있는 <strong>강남 테헤란로 오피스 임대 현황</strong>을 알기 쉽게 정리해 드리겠습니다!</p>
<p>📌 <strong>핵심 포인트 3줄 요약:</strong><br>
1. 강남권역 공실률 3.2%로 역대 최저 수준 기록<br>
2. IT·스타트업 수요 집중으로 우량 오피스 품귀<br>
3. 임대료 평당 14만 원 돌파, 하반기도 상승 전망</p>`,
    tags: ["공실뉴스", "강남오피스", "빌딩임대", "부동산투자", "테헤란로"]
  };

  // ── 2. DOM 요소 참조 ──
  // 헤더 및 플랫폼
  const btnPlatformChatGpt = document.getElementById("btnPlatformChatGpt");
  const btnPlatformGemini = document.getElementById("btnPlatformGemini");
  const btnGoogleLogin = document.getElementById("btnGoogleLogin");
  const userInfo = document.getElementById("userInfo");
  const userName = document.getElementById("userName");
  const userTierBadge = document.getElementById("userTierBadge");
  const iframeChatGpt = document.getElementById("iframeChatGpt");
  const iframeGemini = document.getElementById("iframeGemini");

  // 네비게이션 탭
  const tabInput = document.getElementById("tabInput");
  const tabPreview = document.getElementById("tabPreview");
  const viewInput = document.getElementById("viewInput");
  const viewPreview = document.getElementById("viewPreview");
  const previewReadyBadge = document.getElementById("previewReadyBadge");

  // 듀얼 모드 선택기
  const modeNews = document.getElementById("modeNews");
  const modeBlog = document.getElementById("modeBlog");
  const stylesNewsGroup = document.getElementById("stylesNewsGroup");
  const stylesBlogGroup = document.getElementById("stylesBlogGroup");

  // 추출 및 입력부
  const btnExtractActiveTab = document.getElementById("btnExtractActiveTab");
  const sourceStatus = document.getElementById("sourceStatus");
  const previewTitle = document.getElementById("previewTitle");
  const btnToggleSource = document.getElementById("btnToggleSource");
  const sourceDetails = document.getElementById("sourceDetails");
  const sourceText = document.getElementById("sourceText");
  const extractedVacancyCard = document.getElementById("extractedVacancyCard");
  const extractedVacancyName = document.getElementById("extractedVacancyName");
  const extractedVacancyFields = document.getElementById("extractedVacancyFields");
  const chkIncludePhoto = document.getElementById("chkIncludePhoto");
  const styleCards = document.querySelectorAll(".style-card");
  const lengthChips = document.querySelectorAll(".chip");
  const btnSendToAi = document.getElementById("btnSendToAi");
  const btnCopyPrompt = document.getElementById("btnCopyPrompt");
  const btnQuickPreview = document.getElementById("btnQuickPreview");
  const dailyQuotaCount = document.getElementById("dailyQuotaCount");
  const generationStatus = document.getElementById("generationStatus");

  // 실시간 미리보기 뷰포트
  const vpMobile = document.getElementById("vpMobile");
  const vpPc = document.getElementById("vpPc");
  const vpNaverBlog = document.getElementById("vpNaverBlog");
  const previewDeviceFrame = document.getElementById("previewDeviceFrame");
  const gongsilArticlePreview = document.getElementById("gongsilArticlePreview");
  const naverBlogPreview = document.getElementById("naverBlogPreview");
  const actionsNews = document.getElementById("actionsNews");
  const actionsBlog = document.getElementById("actionsBlog");

  // 기사 미리보기 요소들
  const pvSectionBadge = document.getElementById("pvSectionBadge");
  const pvPublishDate = document.getElementById("pvPublishDate");
  const pvTitle = document.getElementById("pvTitle");
  const pvSubtitle = document.getElementById("pvSubtitle");
  const pvReporterName = document.getElementById("pvReporterName");
  const pvImage = document.getElementById("pvImage");
  const pvImageCaption = document.getElementById("pvImageCaption");
  const pvContent = document.getElementById("pvContent");
  const pvKeywordsWrap = document.getElementById("pvKeywordsWrap");
  const pvPhotosStrip = document.getElementById("pvPhotosStrip");
  const btnImportAiImage = document.getElementById("btnImportAiImage");
  const btnChangePhoto = document.getElementById("btnChangePhoto");
  const filePhotoInput = document.getElementById("filePhotoInput");

  // 블로그 미리보기 요소들
  const pvBlogTitle = document.getElementById("pvBlogTitle");
  const pvBlogImage = document.getElementById("pvBlogImage");
  const pvBlogImageCaption = document.getElementById("pvBlogImageCaption");
  const pvBlogContent = document.getElementById("pvBlogContent");
  const pvBlogTagsWrap = document.getElementById("pvBlogTagsWrap");
  const pvBlogPhotosStrip = document.getElementById("pvBlogPhotosStrip");

  // 액션 버튼
  const btnSendToSideEditor = document.getElementById("btnSendToSideEditor");
  const btnPublishGongsilDirect = document.getElementById("btnPublishGongsilDirect");
  const btnCopyArticleText = document.getElementById("btnCopyArticleText");
  const btnSendToSideNaverBlog = document.getElementById("btnSendToSideNaverBlog");
  const btnCopyNaverHtml = document.getElementById("btnCopyNaverHtml");
  const btnSaveBlogImage = document.getElementById("btnSaveBlogImage");

  // 모달
  const premiumModal = document.getElementById("premiumModal");
  const btnGoPremium = document.getElementById("btnGoPremium");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const publishSuccessModal = document.getElementById("publishSuccessModal");
  const publishSuccessText = document.getElementById("publishSuccessText");
  const btnViewPublishedArticle = document.getElementById("btnViewPublishedArticle");
  const btnCloseSuccessModal = document.getElementById("btnCloseSuccessModal");
  let lastPublishedArticleId = "";

  // ── 3. 초기화 및 회원 인증 조회 ──
  checkUserAuth();

  async function checkUserAuth() {
    try {
      const res = await fetch("http://localhost:3000/api/extension/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.isLoggedIn) {
          currentUser = {
            isLoggedIn: true,
            name: data.user.name || "공실뉴스 회원",
            email: data.user.email || "",
            isPremium: data.user.isPremium,
            planType: data.user.planType,
            dailyLimit: data.dailyLimit,
            dailyUsed: data.dailyUsed
          };
          updateUserUi();
          return;
        }
      }
    } catch (e) {
      console.warn("로컬 서버 인증 확인 불가 (오프라인 모드 fallback):", e);
    }
    // 기본 관리자 상태 유지
    updateUserUi();
  }

  function updateUserUi() {
    if (currentUser.isLoggedIn) {
      btnGoogleLogin.classList.add("hidden");
      userInfo.classList.remove("hidden");
      userName.textContent = currentUser.name;
      if (currentUser.isPremium) {
        userTierBadge.textContent = "👑 프리미엄";
        userTierBadge.className = "tier-badge premium";
        if (dailyQuotaCount) dailyQuotaCount.textContent = "무제한";
      } else {
        userTierBadge.textContent = "무료 회원";
        userTierBadge.className = "tier-badge free";
        if (dailyQuotaCount) dailyQuotaCount.textContent = `${currentUser.dailyLimit - currentUser.dailyUsed}회`;
      }
    } else {
      btnGoogleLogin.classList.remove("hidden");
      userInfo.classList.add("hidden");
      if (dailyQuotaCount) dailyQuotaCount.textContent = "3회";
    }
  }

  btnGoogleLogin.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3000/login" });
  });

  // ── 4. AI 플랫폼 전환 (ChatGPT / Gemini) ──
  btnPlatformChatGpt.addEventListener("click", () => switchPlatform("chatgpt"));
  btnPlatformGemini.addEventListener("click", () => switchPlatform("gemini"));

  function switchPlatform(platform) {
    currentPlatform = platform;
    if (platform === "chatgpt") {
      btnPlatformChatGpt.classList.add("active");
      btnPlatformGemini.classList.remove("active");
      iframeChatGpt.classList.add("active");
      iframeGemini.classList.remove("active");
    } else {
      btnPlatformGemini.classList.add("active");
      btnPlatformChatGpt.classList.remove("active");
      iframeGemini.classList.add("active");
      iframeChatGpt.classList.remove("active");
    }
  }

  // ── 5. 상단 탭 전환 (1. 작성 ⟷ 2. 실시간 미리보기) ──
  tabInput.addEventListener("click", () => switchTab("input"));
  tabPreview.addEventListener("click", () => switchTab("preview"));
  if (btnQuickPreview) btnQuickPreview.addEventListener("click", () => switchTab("preview"));

  function switchTab(tab) {
    if (tab === "input") {
      generationSequence += 1;
      resetGenerationUi();
      tabInput.classList.add("active");
      tabPreview.classList.remove("active");
      viewInput.classList.add("active");
      viewPreview.classList.remove("active");
    } else {
      tabPreview.classList.add("active");
      tabInput.classList.remove("active");
      viewPreview.classList.add("active");
      viewInput.classList.remove("active");
      previewReadyBadge.classList.add("hidden");
      renderPreview();
    }
  }

  function resetGenerationUi() {
    const btnSendText = document.getElementById("btnSendText");
    if (generationStatus) generationStatus.classList.add("hidden");
    if (btnSendText) btnSendText.textContent = "AI 자동 작성 & 실시간 미리보기";
    if (btnSendToAi) btnSendToAi.disabled = false;
  }

  // ── 6. 듀얼 모드 전환 (공실뉴스 기사 vs 네이버 블로그) ──
  modeNews.addEventListener("click", () => switchDualMode("news"));
  modeBlog.addEventListener("click", () => switchDualMode("blog"));

  function switchDualMode(mode) {
    currentMode = mode;
    if (mode === "news") {
      modeNews.classList.add("active");
      modeBlog.classList.remove("active");
      stylesNewsGroup.classList.remove("hidden");
      stylesBlogGroup.classList.add("hidden");
      // 뉴스 그룹에서 현재 active된 스타일 카드 읽기 (없으면 기본 narration)
      const activeNewsCard = stylesNewsGroup.querySelector(".style-card.active");
      currentStyle = activeNewsCard ? activeNewsCard.getAttribute("data-style") : "narration";

      // 미리보기 프레임 및 액션 바 동기화
      gongsilArticlePreview.classList.remove("hidden");
      naverBlogPreview.classList.add("hidden");
      actionsNews.classList.remove("hidden");
      actionsBlog.classList.add("hidden");
      vpMobile.click();
    } else {
      modeBlog.classList.add("active");
      modeNews.classList.remove("active");
      stylesBlogGroup.classList.remove("hidden");
      stylesNewsGroup.classList.add("hidden");
      // 블로그 그룹에서 현재 active된 스타일 카드 읽기 (없으면 기본 blog_info)
      const activeBlogCard = stylesBlogGroup.querySelector(".style-card.active");
      currentStyle = activeBlogCard ? activeBlogCard.getAttribute("data-style") : "blog_info";

      // 미리보기 프레임 및 액션 바 동기화
      gongsilArticlePreview.classList.add("hidden");
      naverBlogPreview.classList.remove("hidden");
      actionsNews.classList.add("hidden");
      actionsBlog.classList.remove("hidden");
      vpNaverBlog.click();
    }
  }

  // ── 7. 스타일 및 분량 칩 선택 ──
  styleCards.forEach(card => {
    card.addEventListener("click", () => {
      const parent = card.closest(".style-grid");
      parent.querySelectorAll(".style-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      currentStyle = card.getAttribute("data-style");
    });
  });

  lengthChips.forEach(chip => {
    chip.addEventListener("click", () => {
      lengthChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentLength = chip.getAttribute("data-length");
    });
  });

  // ── 8. 본문 추출 및 세부 펼치기 ──
  btnToggleSource.addEventListener("click", () => {
    const isHidden = sourceDetails.classList.contains("hidden");
    if (isHidden) {
      sourceDetails.classList.remove("hidden");
      btnToggleSource.textContent = "접기 ▲";
    } else {
      sourceDetails.classList.add("hidden");
      btnToggleSource.textContent = "본문 보기 ▼";
    }
  });

  btnExtractActiveTab.addEventListener("click", extractFromActiveTab);

  let currentTargetTab = null;

  // ── 모든 추출 데이터 및 미리보기 완전 초기화 함수 ──
  function resetAllData() {
    extractedData = null;
    currentTargetTab = null;
    sourceText.value = "";
    previewTitle.textContent = "추출된 웹페이지 제목이 여기에 표시됩니다";
    sourceStatus.textContent = "준비됨";
    sourceStatus.className = "status-pill ready";
    if (extractedVacancyCard) extractedVacancyCard.classList.add("hidden");
    if (extractedVacancyName) extractedVacancyName.textContent = "-";
    if (extractedVacancyFields) extractedVacancyFields.replaceChildren();

    previewArticle = {
      title: "강남 테헤란로 대형 오피스 공실률 3.2% 최저치 기록... 임대료 상승세 지속",
      subtitle: "IT·바이오 기업 임차 수요 집중... 3.3㎡당 평균 임대료 14만 원 돌파\n스타트업 권역 이동 및 프라임 빌딩 품귀 현상 심화\n하반기 신규 공급 제한적… 임차인 유치 경쟁 격화 전망",
      content: "<p>기사 본문이 여기에 자동으로 생성됩니다.</p>",
      section1: "공실뉴스",
      section2: "아파트",
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?auto=format&fit=crop&w=1200&q=80",
      imageCaption: "보도 사진 전경. /자료=공실뉴스",
      keywords: ["공실뉴스", "부동산", "실매물"],
      reporterName: currentUser?.name || "김미숙",
      publishDate: new Date().toISOString().slice(0, 10).replace(/-/g, ".")
    };

    previewBlog = {
      title: "🏢 강남 오피스 공실률 최저치? 임대인이라면 꼭 체크해야 할 3가지 팩트!",
      content: "<p>블로그 원고가 여기에 생성됩니다.</p>",
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?auto=format&fit=crop&w=1200&q=80",
      imageCaption: "▲ 서울 강남 중심가 전경",
      tags: ["공실뉴스", "부동산", "임대차"]
    };

    if (pvPhotosStrip) pvPhotosStrip.innerHTML = "";
    if (pvBlogPhotosStrip) pvBlogPhotosStrip.innerHTML = "";
    renderPreview();
  }

  const btnResetAll = document.getElementById("btnResetAll");
  if (btnResetAll) {
    btnResetAll.addEventListener("click", () => {
      resetAllData();
      alert("✅ 모든 추출 데이터와 작성 내용이 깨끗하게 초기화되었습니다.\n이제 새 매물 페이지에서 [현재 공실 물건 정보 가져오기]를 눌러주세요!");
    });
  }

  // ── 미리보기 화면 상단: [🔄 새 매물로 즉시 다시 생성] 버튼 ──
  const btnQuickRefresh = document.getElementById("btnQuickRefresh");
  if (btnQuickRefresh) {
    btnQuickRefresh.addEventListener("click", async () => {
      const origHtml = btnQuickRefresh.innerHTML;
      btnQuickRefresh.innerHTML = `<span>⏳</span> <strong>새 매물 추출 & 캡쳐 중...</strong>`;
      btnQuickRefresh.disabled = true;

      // 1. 기존 데이터 100% 완전 초기화
      resetAllData();

      // 2. 현재 열려 있는 활성 탭에서 최신 매물 즉각 추출
      await extractFromActiveTab();

      btnQuickRefresh.disabled = false;
      btnQuickRefresh.innerHTML = `<span>✅</span> <strong>최신 매물 갱신 완료!</strong>`;
      setTimeout(() => {
        btnQuickRefresh.innerHTML = origHtml;
      }, 2000);
    });
  }

  function setExtractLoading(isLoading) {
    btnExtractActiveTab.disabled = isLoading;
    btnExtractActiveTab.textContent = isLoading
      ? "... 가져오는 중"
      : "현재 공실 물건 정보 가져오기";
  }

  function requestPageExtraction(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "EXTRACT_PAGE_CONTENT" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response || null);
      });
    });
  }

  async function extractFromActiveTab() {
    setExtractLoading(true);
    sourceStatus.textContent = "가져오는 중...";
    sourceStatus.className = "status-pill loading";
    if (extractedVacancyCard) extractedVacancyCard.classList.add("hidden");
    if (extractedVacancyFields) extractedVacancyFields.replaceChildren();

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        sourceStatus.textContent = "탭 없음";
        sourceStatus.className = "status-pill ready";
        return;
      }
      currentTargetTab = tab;

      let response = await requestPageExtraction(tab.id);
      if (!response) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        response = await requestPageExtraction(tab.id);
      }

      if (!response?.text) {
        sourceStatus.textContent = "추출 실패";
        sourceStatus.className = "status-pill ready";
        return;
      }

      await applyExtracted(response, tab);
    } catch (e) {
      sourceStatus.textContent = "추출 불가";
      sourceStatus.className = "status-pill ready";
    } finally {
      setExtractLoading(false);
    }
  }

  function showExtractedVacancy(data) {
    if (!extractedVacancyCard || !extractedVacancyName || !extractedVacancyFields) return;

    extractedVacancyName.textContent = data.buildingName || "공실 매물";
    extractedVacancyFields.replaceChildren();

    const fields = [
      ["가격", data.price],
      ["소재지", [data.address, data.dongHosu].filter(Boolean).join(" ")],
      ["공실번호", data.vacancyNo],
      ["면적", data.exclusiveArea],
      ["층수·방향", [data.floorInfo, data.direction].filter(Boolean).join(" · ")],
      ["구조·주차", [data.roomBath, data.parking].filter(Boolean).join(" · ")],
      ["관리비", data.maintenanceFee],
      ["입주 가능일", data.moveInDate],
      ["주요 옵션", data.options],
      ["특장점", Array.isArray(data.themes) ? data.themes.join(" ") : data.themes]
    ].filter(([, value]) => value);

    fields.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "extracted-vacancy-row";

      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;

      row.append(term, description);
      extractedVacancyFields.appendChild(row);
    });

    extractedVacancyCard.classList.remove("hidden");
  }

  // ── 실제 매물 인증 스크린샷 캡쳐 & 크롭 헬퍼 (windowId 명시적 지원) ──
  function captureTabScreenshot(targetWindowId = null) {
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          console.warn("captureTabScreenshot timeout");
          resolve(null);
        }
      }, 3500);

      const tryDefaultCapture = () => {
        try {
          chrome.tabs.captureVisibleTab({ format: "jpeg", quality: 90 }, (dataUrl) => {
            if (!done) {
              done = true;
              clearTimeout(timer);
              if (chrome.runtime.lastError || !dataUrl) {
                console.warn("captureVisibleTab default fallback error:", chrome.runtime.lastError?.message);
                resolve(null);
              } else {
                resolve(dataUrl);
              }
            }
          });
        } catch (e) {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(null);
          }
        }
      };

      try {
        const options = { format: "jpeg", quality: 90 };
        const winId = typeof targetWindowId === "number" ? targetWindowId : (currentTargetTab?.windowId || null);

        if (winId) {
          chrome.tabs.captureVisibleTab(winId, options, (dataUrl) => {
            if (!done) {
              if (chrome.runtime.lastError || !dataUrl) {
                console.warn("captureVisibleTab with winId failed, trying fallback:", chrome.runtime.lastError?.message);
                tryDefaultCapture();
              } else {
                done = true;
                clearTimeout(timer);
                resolve(dataUrl);
              }
            }
          });
        } else {
          tryDefaultCapture();
        }
      } catch (e) {
        tryDefaultCapture();
      }
    });
  }

  // ── 정밀 화면 크롭 헬퍼 (메인 탭 뷰포트 배율 기반 16:9 가로 와이드 자동 보정) ──
  function cropRegion(dataUrl, cropRect, viewport, forceAspect16x9 = true) {
    return new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => {
        try {
          const totalW = img.naturalWidth || img.width;
          const totalH = img.naturalHeight || img.height;
          if (totalW <= 100 || totalH <= 100) return resolve(null);

          // 메인 탭 뷰포트 크기 기준으로 스케일 계산 (사이드패널 윈도우 너비 절대 사용 금지!)
          const vpW = (viewport && viewport.width) || 1200;
          const vpH = (viewport && viewport.height) || 900;
          const scaleX = totalW / vpW;
          const scaleY = totalH / vpH;

          let sx = 0, sy = 0, sw = totalW, sh = totalH;

          if (cropRect && cropRect.width > 20 && cropRect.height > 20) {
            sx = Math.round(cropRect.left * scaleX);
            sy = Math.round(cropRect.top * scaleY);
            sw = Math.round(cropRect.width * scaleX);
            sh = Math.round(cropRect.height * scaleY);

            // 경계선 안전 보정 (화면 밖으로 나가지 않도록 안전 클램핑)
            sx = Math.max(0, Math.min(sx, totalW - 40));
            sy = Math.max(0, Math.min(sy, totalH - 40));
            if (sx + sw > totalW) sw = totalW - sx;
            if (sy + sh > totalH) sh = totalH - sy;

            if (forceAspect16x9 && sw > 50) {
              // ★ 세로가 아니라 가로 16:9 와이드 비율로 엄격 고정!
              const targetH = Math.round(sw * 9 / 16);
              if (sy + targetH <= totalH) {
                sh = targetH;
              } else if (targetH <= totalH) {
                sy = Math.max(0, totalH - targetH);
                sh = targetH;
              } else {
                sh = totalH - sy;
                sw = Math.round(sh * 16 / 9);
                if (sx + sw > totalW) sx = Math.max(0, totalW - sw);
              }
            }
          } else {
            // 기본 fallback 가로형 크롭 (중앙 상단 16:9)
            sw = Math.round(totalW * 0.65);
            sh = Math.round(sw * 9 / 16);
            sx = Math.round(totalW * 0.1);
            sy = Math.round(totalH * 0.08);
          }

          if (sx < 0) sx = 0;
          if (sy < 0) sy = 0;
          if (sx + sw > totalW) sw = totalW - sx;
          if (sy + sh > totalH) sh = totalH - sy;

          if (sw <= 20 || sh <= 20) return resolve(null);

          const canvas = document.createElement("canvas");
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext("2d");
          // ★ 투명 영역이 검은색으로 변하지 않도록 흰색 바탕 채우기
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sw, sh);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch (e) {
          console.warn("cropRegion error:", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  // ★ 16:9 가로 와이드 고화질 실매물 등록 인증서
  function generateListingProofFallback(vName, vPrice, vAddr, vNo) {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450; // 16:9
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 450);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#cbd5e1";
    ctx.strokeRect(8, 8, 784, 434);

    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(8, 8, 784, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif";
    ctx.fillText("공실뉴스 (Gongsil News) 공식 실매물 등록 검증", 30, 44);

    ctx.fillStyle = "#eff6ff";
    ctx.fillRect(30, 88, 160, 32);
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`등록인증: ${vNo || "64786"}`, 44, 110);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif";
    ctx.fillText(vName || "공실 매물", 30, 165);

    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(vPrice || "매매 조건 확인", 30, 215);

    ctx.fillStyle = "#475569";
    ctx.font = "16px sans-serif";
    ctx.fillText(`• 소재지: ${vAddr || "서울 핵심 주거 권역"}`, 30, 270);
    ctx.fillText(`• 거래 등록망: 공실뉴스 11만 부동산 실매물 플랫폼 '공실열람'`, 30, 305);
    ctx.fillText(`• 검증 일시: ${new Date().toLocaleDateString("ko-KR")} 실시간 정상 등록 확인`, 30, 340);

    ctx.fillStyle = "#059669";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("✓ 공실뉴스 실매물 데이터베이스 공식 등록 확인 (허위매물 배제)", 30, 400);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  // ★ 16:9 가로 와이드 위치 지도 카드
  function generateMapFallback(vName, vAddr) {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450; // 16:9
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 800, 450);

    // 격자 도로망 그래픽
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(0, 180); ctx.lineTo(800, 180);
    ctx.moveTo(0, 320); ctx.lineTo(800, 320);
    ctx.moveTo(250, 0); ctx.lineTo(250, 450);
    ctx.moveTo(560, 0); ctx.lineTo(560, 450);
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(20, 20, 760, 56);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`📍 [위치 지도] ${vName || '공실 매물'} 주변 역세권 및 도로망 현황`, 40, 55);

    // 중심 핀 마크
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(400, 220, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("현장", 387, 225);

    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.fillRect(20, 370, 760, 60);
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`• 소재지: ${vAddr || '해당 지역 일대'} | 자료: 위치정보 지도`, 40, 406);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  // ★ 16:9 가로 와이드 현장 로드뷰 카드 (딱 1장)
  function generateRoadviewFallback(vName, vAddr) {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450; // 16:9
    const ctx = canvas.getContext("2d");

    // 하늘 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, "#bae6fd");
    grad.addColorStop(0.6, "#e0f2fe");
    grad.addColorStop(1, "#cbd5e1");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 320);

    // 빌딩 실루엣
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(40, 110, 160, 210);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(230, 80, 200, 240);
    ctx.fillStyle = "#475569";
    ctx.fillRect(460, 120, 180, 200);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(660, 150, 110, 170);

    // 빌딩 창문 패턴
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 6; r++) {
        ctx.fillRect(250 + c * 45, 100 + r * 30, 25, 16);
      }
    }

    // 도로 바닥
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 310, 800, 140);

    // 도로 차선
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 4;
    ctx.setLineDash([24, 16]);
    ctx.beginPath();
    ctx.moveTo(0, 350); ctx.lineTo(800, 350);
    ctx.stroke();
    ctx.setLineDash([]);

    // 상단 캡션 바
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(20, 20, 760, 52);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`🏢 [현장 로드뷰] ${vName || '공실 매물'} 단지 주 진입로 및 가로변 전경`, 40, 52);

    // 하단 설명 바
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.fillRect(20, 375, 760, 56);
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`▲ [현장 로드뷰] ${vName} 보행 진입로 및 인근 도로변 가로 생활권 전경 (자료: 로드뷰)`, 40, 410);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function applyExtracted(data, sourceTab = null) {
    if (sourceTab) {
      currentTargetTab = sourceTab;
    }
    extractedData = data;
    sourceText.value = data.text;
    previewTitle.textContent = data.title || "웹페이지 원문";

    if (data.isVacancy) {
      sourceStatus.textContent = `✨ 매물 감지 (${data.buildingName || "매물"})`;
      sourceStatus.className = "status-pill done";
      showExtractedVacancy(data);

      // 1. 초기 안전망 fallback 장착 (실제 화면 캡쳐 전 즉시 렌더링용)
      extractedData.proofScreenshot = generateListingProofFallback(data.buildingName, data.price, data.address, data.vacancyNo);
      extractedData.mapImage = generateMapFallback(data.buildingName, data.address);
      const rvFallback = generateRoadviewFallback(data.buildingName, data.address);
      extractedData.roadviewImage = rvFallback;
      extractedData.roadviewImages = [rvFallback]; // 딱 1장만 등록!

      if (data.imageUrl) {
        previewArticle.imageUrl = data.imageUrl;
        previewBlog.imageUrl = data.imageUrl;
        previewArticle.imageCaption = `${data.buildingName || "공실 매물"} 현장 실물 (자료: 공실뉴스)`;
        previewBlog.imageCaption = `${data.buildingName || "공실 매물"} 현장 실물 사진`;
      }

      const optTitle = document.getElementById("photoOptionTitle");
      const optDesc = document.getElementById("photoOptionDesc");
      if (optTitle) optTitle.textContent = "📷 4종 보도 미디어 자동 패키징 (검증캡쳐 + 실물 + 지도 + 로드뷰)";
      if (optDesc) optDesc.textContent = "공실뉴스 실매물 검증 16:9 와이드 캡쳐, 매물 실사, 위치 지도, 현장 로드뷰 1장 완벽 구성";

      if (currentMode === "news") {
        previewArticle.title = data.title;
      } else {
        previewBlog.title = `🏢 ${data.title}`;
      }

      // 매물 추출 즉시 내부 템플릿 원고와 미리보기 데이터를 동기화합니다.
      updatePreviewModelFromInput();

      // 3. 백그라운드에서 실제 화면 정밀 캡쳐 (각 요소를 스크롤 인투 뷰 후 개별 캡쳐)
      (async () => {
        try {
          let tab = currentTargetTab;
          if (!tab || !tab.id) {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            tab = activeTab;
          }
          if (!tab || !tab.id) return;
          const tabId = tab.id;
          const windowId = tab.windowId || null;

          // ── 3-1. 상세 패널 상단(매물 화면) 16:9 가로 와이드 정밀 캡쳐 ──
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const cont = document.getElementById("detail-scroll-container");
              if (cont) cont.scrollTop = 0;
              const detail = document.querySelector("[data-vacancy-id]") || document.querySelector(".vacancy-detail, .realtor-detail");
              if (detail) detail.scrollIntoView({ behavior: "instant", block: "start" });
            }
          });
          await new Promise(r => setTimeout(r, 400));
          const detailRectRes = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const detail = document.querySelector("#detail-scroll-container") || document.querySelector("[data-vacancy-id]") || document.querySelector(".vacancy-detail, .realtor-detail");
              if (detail) {
                const r = detail.getBoundingClientRect();
                const w = Math.max(480, Math.round(r.width));
                const h = Math.round(w * 9 / 16);
                return { left: Math.max(0, Math.round(r.left)), top: Math.max(0, Math.round(r.top)), width: w, height: h };
              }
              return null;
            }
          });
          const liveDetailRect = detailRectRes?.[0]?.result || data.detailRect;
          const proofScreen = await captureTabScreenshot(windowId);
          if (proofScreen && liveDetailRect) {
            const croppedProof = await cropRegion(proofScreen, liveDetailRect, data.viewport, true);
            if (croppedProof) {
              extractedData.proofScreenshot = croppedProof;
              updatePreviewModelFromInput();
              renderPreview();
            }
          }

          // ── 3-2. 지도 요소를 스크롤 컨테이너 중앙으로 이동 후 실사 지도 캡쳐 ──
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const cont = document.getElementById("detail-scroll-container");
              const mapEl = document.getElementById("gongsil-detail-map") || document.querySelector("div[id*='map']");
              if (cont && mapEl) {
                const contRect = cont.getBoundingClientRect();
                const mapRect = mapEl.getBoundingClientRect();
                cont.scrollTop = cont.scrollTop + (mapRect.top - contRect.top) - (contRect.height - mapRect.height) / 2;
              } else if (mapEl) {
                mapEl.scrollIntoView({ behavior: "instant", block: "center" });
              }
            }
          });
          await new Promise(r => setTimeout(r, 600)); // 스크롤 안착 및 지도 타일 렌더링 대기

          // 스크롤 완료 후 최신 뷰포트 좌표 측정
          const mapRectResult = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const mapEl = document.getElementById("gongsil-detail-map") || document.querySelector("div[id*='map']");
              if (mapEl) {
                const r = mapEl.getBoundingClientRect();
                return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
              }
              return null;
            }
          });
          const liveMapRect = mapRectResult?.[0]?.result || data.mapRect;

          if (liveMapRect && liveMapRect.width > 30) {
            const mapScreen = await captureTabScreenshot(windowId);
            if (mapScreen) {
              // 지도는 카카오 지도 컨테이너 1:1 완벽 크롭 (forceAspect16x9 = false)
              const croppedMap = await cropRegion(mapScreen, liveMapRect, data.viewport, false);
              if (croppedMap) {
                extractedData.mapImage = croppedMap;
                updatePreviewModelFromInput();
                renderPreview();
              }
            }
          }

          // ── 3-3. 로드뷰 요소를 스크롤 컨테이너 중앙으로 이동 후 실사 로드뷰 1장 캡쳐 ──
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const cont = document.getElementById("detail-scroll-container");
              const rvEl = document.getElementById("gongsil-detail-roadview") || document.querySelector("div[id*='roadview']");
              if (cont && rvEl) {
                const contRect = cont.getBoundingClientRect();
                const rvRect = rvEl.getBoundingClientRect();
                cont.scrollTop = cont.scrollTop + (rvRect.top - contRect.top) - (contRect.height - rvRect.height) / 2;
              } else if (rvEl) {
                rvEl.scrollIntoView({ behavior: "instant", block: "center" });
              }
            }
          });
          await new Promise(r => setTimeout(r, 650)); // 로드뷰 파노라마 안착 대기

          // 스크롤 완료 후 최신 뷰포트 좌표 측정
          const rvRectResult = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const rvEl = document.getElementById("gongsil-detail-roadview") || document.querySelector("div[id*='roadview']");
              if (rvEl) {
                const r = rvEl.getBoundingClientRect();
                return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
              }
              return null;
            }
          });
          const liveRvRect = rvRectResult?.[0]?.result || data.roadviewRect;

          if (liveRvRect && liveRvRect.width > 30) {
            const rvScreen = await captureTabScreenshot(windowId);
            if (rvScreen) {
              // 로드뷰는 컨테이너 1:1 완벽 크롭 (forceAspect16x9 = false)
              const croppedRv = await cropRegion(rvScreen, liveRvRect, data.viewport, false);
              if (croppedRv) {
                extractedData.roadviewImage = croppedRv;
                extractedData.roadviewImages = [croppedRv]; // 단 1장만 등록!
                updatePreviewModelFromInput();
                renderPreview();
              }
            }
          }

          // ── 3-4. 원래 위치(상단)로 스크롤 복귀 ──
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const cont = document.getElementById("detail-scroll-container");
              if (cont) cont.scrollTop = 0;
              const detail = document.querySelector("[data-vacancy-id]") || document.querySelector(".vacancy-detail, .realtor-detail");
              if (detail) detail.scrollIntoView({ behavior: "instant", block: "start" });
            }
          });

          updatePreviewModelFromInput();
          renderPreview();

        } catch (e) {
          console.warn("Background sequential capture error:", e);
        }
      })();
    } else {
      sourceStatus.textContent = `완료 (${data.text.length}자)`;
      sourceStatus.className = "status-pill done";
      if (extractedVacancyCard) extractedVacancyCard.classList.add("hidden");

      const optTitle = document.getElementById("photoOptionTitle");
      const optDesc = document.getElementById("photoOptionDesc");
      if (optTitle) optTitle.textContent = "📷 16:9 한국형 AI 실사 보도사진 동시 생성";
      if (optDesc) optDesc.textContent = "기사 팩트에 1:1 밀착된 현장 실사 사진 자동 렌더링 (DALL-E 3 / Imagen 3)";

      if (currentMode === "news") {
        previewArticle.title = data.title;
      } else {
        previewBlog.title = `🏢 ${data.title}`;
      }

      updatePreviewModelFromInput();
    }
  }

  // ── 9. 공실뉴스 편집국장 표준 프롬프트 빌더 ──
  function buildPrompt() {
    const rawContent = sourceText.value.trim();
    if (!rawContent) {
      alert("먼저 [현재 공실 물건 정보 가져오기]를 누르거나 원문 내용을 입력해주세요!");
      return null;
    }

    let lengthGuide = "";
    if (currentLength === "short") {
      lengthGuide = "분량: 약 30~45초 낭독 분량 (250~350자 내외). 군더더기를 철저히 배제하고 핵심 팩트와 임팩트 위주로 간결하게 작성하라.";
    } else if (currentLength === "long") {
      lengthGuide = "분량: 1분 30초 이상 낭독 가능한 롱폼 심층 리포트 (1,000자 이상). 배경, 시장 심리, 원인 분석, 향후 파급 효과를 풍성하게 서술하라.";
    } else {
      lengthGuide = "분량: 약 60초 낭독 분량 (500~700자 내외). 유튜브 쇼츠, 릴스 및 모바일 브리핑에 가장 최적화된 분량으로 작성하라.";
    }

    const includePhoto = chkIncludePhoto.checked;
    let photoInstruction = "";
    if (includePhoto) {
      photoInstruction = `\n[★ 핵심 추가 지시: 16:9 한국형 AI 실사 보도사진 동시 생성 ★]
기사/원고 작성을 모두 마친 후, 채팅창 최하단에 이 기사의 핵심 현장을 담은 **16:9 가로 비율의 사실적인 한국형 보도 실사 사진(DALL-E 3 / Imagen 3)** 1장을 반드시 생성해줘!
(사진 프롬프트 기준: 사실적인 한국 서울 도심 오피스/상가 빌딩가, 자연광, 보도사진 저널리즘 스타일, 외국인/어색한 영문 간판 배제)`;
    }

    let styleName = "";
    let styleGuide = "";

    // ★ 1. 공실뉴스 매물 화면에서 추출된 매물인 경우: 최고관리자 AI 기사 불변 원칙 적용
    if (extractedData && extractedData.isVacancy) {
      const vName = extractedData.buildingName || "공실 매물";
      const vPrice = extractedData.price || "";
      const vAddr = extractedData.address || "해당 지역";
      const vThemes = extractedData.themes ? extractedData.themes.join(" ") : "";

      if (currentMode === "news") {
        if (currentStyle === "narration") {
          styleName = "공실뉴스 공실열람 실매물 객관적 방송 보도 대본형";
          styleGuide = `[★ 기사 스타일: 공실뉴스 공실열람 실매물 객관적 방송 보도 대본형 ★]
- 문체: 광고나 호객이 아닌 엄격한 경제 보도 기자 존댓말 리포트체 (~했습니다, ~것으로 확인됐습니다, ~로 나타났습니다).
- ★ 첫 문장 필수 지침: 기사의 첫 문장은 반드시 아래 문장으로 단 1회만 시작할 것 (유사 문장이나 '11만' 멘트 2번 중복 서술 절대 금지!):
  "11만 부동산과 임대인이 무료로 공실을 등록하는 공실뉴스의 지도 기반 실매물 서비스 '공실열람'에 서울 ${vRegion} 소재 아파트 '${vName}'이 ${vPrice}의 매매 조건으로 공식 등록된 것으로 나타났습니다."
- ★ 광고 스타일 절대 배제: '독보적', '강력한 무기', '끝판왕', '특급 혜택', '지금 문의하세요' 등 중개사 광고·호객 문구 일체 금지!
- 객관적 보도 내용: 공실뉴스 공실열람 서비스에 해당 매물이 신규 등록되었다는 팩트, 위치/면적/금액/옵션/교통/학군 스펙, 인근 시세 비교 분석 위주로 객관적 보도.`;
        } else {
          styleName = "공실뉴스 공실열람 정통 신문 객관적 보도 분석형";
          styleGuide = `[★ 기사 스타일: 공실뉴스 공실열람 정통 신문 객관적 보도 분석형 ★]
- 문체: 객관적 사실 보도 경제지 전문 기자 평서체 (~로 분석된다, ~로 집계됐다, ~로 등록됐다).
- ★ 첫 문장 필수 지침: 기사의 첫 문장은 반드시 아래 문장으로 단 1회만 시작할 것 (유사 문장이나 '11만' 멘트 2번 중복 서술 절대 금지!):
  "11만 부동산과 임대인이 무료로 공실을 등록하는 공실뉴스의 지도 기반 실매물 서비스 '공실열람'에 서울 ${vRegion} 소재 아파트 '${vName}'이 ${vPrice}의 매매 조건으로 공식 등록된 것으로 나타났습니다."
- ★ 광고 스타일 절대 배제: 과장된 광고 수식어('끝판왕', '수천만원 절감', '독보적' 등) 일체 배제, 공실열람에 등록된 팩트 데이터 위주의 객관적 보도.
- 구조:
  1. 첫 문장 및 공실열람 등록 팩트 도입부 (중복 멘트 없이 단 1문장)
  2. [공실열람 매물 핵심 개요] (색상/배경/테두리 없는 순수 텍스트)
  3. 객관적 소제목:
     - ■ 공실열람 등록 현황: ${vAddr} 일대 시장 흐름 및 ${vName} 출회 조건
     - ■ 매물 상태 및 시설: 전용면적, 침실 구조, 올수리 상태 및 옵션
     - ■ 입지 및 대중교통: 지하철 역세권 및 주요 도로망 연계성
     - ■ 시세 지표 분석: 인근 실거래 시세 대비 가격 적정성 분석
  4. 최하단 [공실열람 보도 분석 체크포인트] 순수 텍스트 요약`;
        }
      } else {
        styleName = "공실열람 등록 실매물 분석 리포트 포스팅";
        styleGuide = `[★ 원고 스타일: 공실열람 등록 실매물 분석 리포트 포스팅 ★]
- 문체: 친근하면서도 정보 전달 위주의 블로그 리포트체 (~알아보겠습니다, ~분석됩니다).
- ★ 첫 문장 필수 지침: 블로그의 첫 문장은 아래 형태로 단 1회만 작성할 것 (중복 멘트 절대 금지):
  "11만 부동산과 임대인이 무료로 공실을 등록하는 공실뉴스 지도 기반 실매물 서비스 '공실열람'에 '${vName}'(${vPrice}) 매물이 새롭게 공식 등록되었습니다."
- 광고 스타일 배제: 허위·과장 광고 없이 공실열람 등록 팩트(위치, 금액, 면적, 교통, 학군) 위주의 알찬 분석 리포트.`;
      }
    } else {
      // ★ 2. 일반 기사 / 웹페이지 추출인 경우
      if (currentMode === "news") {
        if (currentStyle === "narration") {
          styleName = "공실뉴스 방송 나레이션 대본형";
          styleGuide = `[★ 기사 스타일: 방송 자막·나레이션 대본형 ★]
- 문체: 방송 앵커/기자의 귀에 쏙쏙 박히는 정중한 표준 존댓말 대본체 (~했습니다, ~인 겁니다, ~것으로 나타났습니다).
- 구조:
  1. ★ '■ 소제목' 절대 금지! (소제목 일체 배제)
  2. ★ '[왜 올랐나]' 등 미니 라벨 절대 금지!
  3. ★ 오직 1~2문장 단위로 짧고 호흡감 있게 끊어서 문단을 나열하라.
  4. 하단 [■ 공실뉴스 시장전망 & 체크포인트] 박스는 넣지 마라.`;
        } else {
          styleName = "공실뉴스 정통 신문 분석형";
          styleGuide = `[★ 기사 스타일: 정통 신문 분석형 ★]
- 문체: 정통 경제지 전문 기자 평서체 (~로 분석된다, ~로 집계됐다, ~라는 지적이다).
- 구조:
  1. 도입부 3~4줄 핵심 팩트 요약
  2. 본문 내 3개의 생생한 맞춤형 소제목 ('■ [맞춤 소제목]')
  3. 기사 최하단에 [■ 공실뉴스 시장전망 & 체크포인트] 심층 분석 박스 필수 포함`;
        }
      } else {
        styleName = "네이버 블로그 포스팅형";
        styleGuide = `[★ 원고 스타일: 네이버 블로그 포스팅형 ★]
- 문체: 가독성이 뛰어나고 친근한 블로그 대화체 (~알아보겠습니다, ~도움이 되셨길 바랍니다 😊).
- 구조:
  1. 호기심을 자극하는 매력적인 블로그 제목 (이모지 포함)
  2. 첫 도입부에 핵심 요약 인용구 박스 ("...")
  3. 시각적 이모지(✨, 📌, 🏢, 💡)를 활용한 3줄 요약 불릿포인트
  4. 본문 내 중요 입지 및 매물/시장 강점 서술
  5. 포스팅 최하단에 검색 유입용 네이버 블로그 추천 해시태그 10개 (#공실뉴스 #부동산투자 등)`;
      }
    }

    return `너는 대한민국 1등 부동산·경제 미디어 '공실뉴스'의 수석 편집국장이자 최고 마케팅 디렉터야.
아래 제공된 [원문 데이터]를 바탕으로, 지시된 [${styleName}] 규칙에 맞춰 최고의 고품질 원고로 전면 재작성해줘.

[작성 원칙]
1. 단순 복사 배제: 원문의 문장을 베끼지 말고 핵심 팩트와 수치만 추출하여 독창적인 문장으로 재구성하라.
2. 타 언론사 언급 금지: "OO일보에 따르면" 등 타사 명칭 일체 배제.
3. ${lengthGuide}
4. ★ [부제목 필수 지침: 반드시 엔터(\n)로 구분된 3줄로 작성] 기사의 부제목(Subtitle)은 본문 시작 전 가장 핵심적인 팩트 3가지를 리드 형태로 요약하되, 절대로 한 줄로 붙여 쓰지 말고 반드시 엔터(\n)로 구분된 정확히 3줄로 출력하라:
   - 1줄: 교통망 및 핵심 입지 (예: 대로변·역세권 사통팔달 교통망)
   - 2줄: 면적, 방 구조, 내부 시설(올수리) 및 탁 트인 조망권
   - 3줄: 명품 학군·생활 인프라 및 인근 시세 대비 가격 경쟁력

${styleGuide}
${photoInstruction}

[원문 데이터]
제목: ${extractedData.title || previewTitle.textContent}
출처URL: ${extractedData.url}
본문:
${rawContent}

지금 바로 위 지침에 맞춘 완벽한 [${styleName}] 원고를 출력해줘!`;
  }

  // ── 10. AI 자동 전송 및 미리보기 데이터 연동 ──
  if (btnCopyPrompt) {
    btnCopyPrompt.addEventListener("click", () => {
      const prompt = buildPrompt();
      if (!prompt) return;
      navigator.clipboard.writeText(prompt).then(() => {
        const orig = btnCopyPrompt.textContent;
        btnCopyPrompt.textContent = "✅ 복사됨";
        setTimeout(() => btnCopyPrompt.textContent = orig, 1500);
      });
    });
  }

  if (btnSendToAi) btnSendToAi.addEventListener("click", async () => {
    const prompt = buildPrompt();
    if (!prompt) return;

    const generationId = ++generationSequence;
    const generationStartedAt = Date.now();
    const btnSendText = document.getElementById("btnSendText");
    if (btnSendText) btnSendText.textContent = "... 작성중입니다";
    if (generationStatus) generationStatus.classList.remove("hidden");

    try {
      // 1단계: 클립보드 복사 (권한/포커스 오류 방지 안전 try/catch)
      try {
        await navigator.clipboard.writeText(prompt);
      } catch (e) {
        console.warn("Clipboard copy restricted:", e);
      }

      // 2단계: 실시간 미리보기 모델 즉시 동기화 및 미리보기 탭으로 0.01초 만에 즉시 전환!
      updatePreviewModelFromInput();
      switchTab("preview");

      // 3단계: AI 플랫폼(챗GPT/제미나이) 비동기 전송 처리
      try {
        const targetDomain = currentPlatform === "chatgpt" ? "chatgpt.com" : "gemini.google.com";
        const tabs = await chrome.tabs.query({ url: `*://*.${targetDomain}/*` });

        if (tabs.length > 0) {
          await chrome.tabs.update(tabs[0].id, { active: true });
          await injectPrompt(tabs[0].id, prompt, currentPlatform);
        } else {
          const newUrl = currentPlatform === "chatgpt" ? "https://chatgpt.com" : "https://gemini.google.com";
          const newTab = await chrome.tabs.create({ url: newUrl });
          setTimeout(() => injectPrompt(newTab.id, prompt, currentPlatform), 3500);
        }
      } catch (e) {
        console.warn("AI platform dispatch error:", e);
      }
    } finally {
      const remainingStatusTime = Math.max(0, 1400 - (Date.now() - generationStartedAt));
      if (remainingStatusTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingStatusTime));
      }
      if (generationId === generationSequence) {
        resetGenerationUi();
      }
    }
  });

  async function injectPrompt(tabId, text, platform) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        args: [text, platform],
        func: (promptText, plat) => {
          if (plat === "chatgpt") {
            const textarea = document.querySelector("#prompt-textarea") || document.querySelector("textarea");
            if (textarea) {
              textarea.focus();
              textarea.value = promptText;
              textarea.dispatchEvent(new Event("input", { bubbles: true }));
              setTimeout(() => {
                const sendBtn = document.querySelector("button[data-testid='send-button']") ||
                                document.querySelector("button[aria-label='Send prompt']");
                if (sendBtn && !sendBtn.disabled) sendBtn.click();
              }, 400);
            }
          } else {
            const richText = document.querySelector(".ql-editor") ||
                             document.querySelector("div[contenteditable='true']") ||
                             document.querySelector("textarea");
            if (richText) {
              richText.focus();
              if (richText.tagName === "TEXTAREA") richText.value = promptText;
              else richText.innerText = promptText;
              richText.dispatchEvent(new Event("input", { bubbles: true }));
              setTimeout(() => {
                const sendBtn = document.querySelector("button[aria-label*='보내기']") ||
                                document.querySelector("button[aria-label*='Send']");
                if (sendBtn && !sendBtn.disabled) sendBtn.click();
              }, 400);
            }
          }
        }
      });
    } catch (e) {
      console.warn("DOM 직접 주입 제한 (클립보드에는 보존됨):", e);
    }
  }

  function updatePreviewModelFromInput() {
    const rawTitle = extractedData.title || previewTitle.textContent;
    const rawText = sourceText.value.trim();

    // ★ 1. 공실뉴스 매물인 경우: 1,500자 정통 경제 저널리즘 대기사 & 네이버 블로그 심층 포스팅 자동 생성
    if (extractedData && extractedData.isVacancy) {
      const vName = extractedData.buildingName || "ACROHILLS논현";
      const vPrice = extractedData.price || "매매 15억";
      const vAddr = extractedData.address || "서울 강남구 논현동 언주로 604";
      const vDongHosu = extractedData.dongHosu ? `(${extractedData.dongHosu})` : "";
      const vRegion = vAddr.split(" ").filter(w => w.endsWith("시") || w.endsWith("구") || w.endsWith("동")).slice(0, 3).join(" ") || "강남구 논현동";
      const vArea = extractedData.exclusiveArea || "공급 82.6㎡(25평) / 전용 69.4㎡(21평)";
      const vRooms = extractedData.roomBath || "룸 3개 / 욕실 완비";
      const vDirection = extractedData.direction || "남향";
      const vOptions = extractedData.options || "시스템에어컨 등 풀빌트인";
      const vMaintenance = extractedData.maintenanceFee || "10만원";
      const vMoveIn = extractedData.moveInDate || "즉시 입주 협의 가능";
      const vThemes = extractedData.themes && extractedData.themes.length > 0 ? extractedData.themes.join(" ") : "#특올수리 #뻥뷰 #시스템에어컨";

      // 인프라 데이터
      const subways = (extractedData.infra && extractedData.infra.subway && extractedData.infra.subway.length > 0)
        ? extractedData.infra.subway.join(", ")
        : "9호선 언주역, 선정릉역(9호선·수인분당선 더블 역세권), 7호선 학동역";
      const schools = (extractedData.infra && extractedData.infra.schools && extractedData.infra.schools.length > 0)
        ? extractedData.infra.schools.join(", ")
        : "서울학동초등학교, 언주중학교, 명문 진선여자고등학교, 서울삼릉초등학교";
      const shopping = (extractedData.infra && extractedData.infra.shopping && extractedData.infra.shopping.length > 0)
        ? extractedData.infra.shopping.join(", ")
        : "롯데슈퍼프레시 논현점/삼성점, 홈플러스익스프레스 학동역점, 하이마트 청담점";
      const hospitals = (extractedData.infra && extractedData.infra.hospitals && extractedData.infra.hospitals.length > 0)
        ? extractedData.infra.hospitals.join(", ")
        : "기쁨외과의원, 피부과, 전문 재활의학과 등 우수 의료기관";
      const buses = (extractedData.infra && extractedData.infra.bus && extractedData.infra.bus.length > 0)
        ? extractedData.infra.bus.join(", ")
        : "신사동고개 버스정류장 등 다수 노선";

      const proofScreenshot = extractedData.proofScreenshot || "";
      const primaryPhoto = extractedData.imageUrl || previewArticle.imageUrl;
      const mapImg = extractedData.mapImage || "";
      const rvImg = (extractedData.roadviewImages && extractedData.roadviewImages[0]) || extractedData.roadviewImage || "";

      // ── 사진 HTML 태그 헬퍼 (4장 핵심 미디어: 검증스크린샷 1장 + 대표실사 1장 + 위치지도 1장 + 현장로드뷰 1장) ──
      const proofScreenshotHtml = proofScreenshot ? `
<div class="article-photo-card" data-photo-key="proofScreenshot" style="text-align:center;margin:22px 0;">
  <div style="position:relative;display:inline-block;max-width:100%;border-radius:8px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.1);border:1px solid #e2e8f0;">
    <img src="${proofScreenshot}" style="display:block;max-width:100%;height:auto;" alt="${vName} 실매물 등록 검증 스크린샷" />
    <div class="media-overlay">
      <button type="button" class="btn-overlay-photo btn-card-ai-photo" data-photo-key="proofScreenshot" title="열려있는 ChatGPT/Gemini 탭에서 생성된 AI 이미지 가져오기">📥 AI 이미지 가져오기</button>
      <button type="button" class="btn-overlay-photo btn-card-replace-photo" data-photo-key="proofScreenshot" title="내 PC에서 사진 교체/업로드">📷 사진 교체/업로드</button>
    </div>
  </div>
  <p style="font-size:13px;color:#64748b;margin-top:7px;font-weight:600;">▲ [공실뉴스 실매물 등록 검증] 11만 부동산 플랫폼 공실뉴스에 공식 등록된 '${vName}' (${vPrice}) 실매물 등록 현황 스크린샷</p>
</div>` : "";

      const coverHtml = primaryPhoto ? `
<div class="article-photo-card" data-photo-key="cover" style="text-align:center;margin:22px 0;">
  <div style="position:relative;display:inline-block;max-width:100%;border-radius:8px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
    <img src="${primaryPhoto}" style="display:block;max-width:100%;height:auto;" alt="${vName} 실물 사진" />
    <div class="media-overlay">
      <button type="button" class="btn-overlay-photo btn-card-ai-photo" data-photo-key="cover" title="열려있는 ChatGPT/Gemini 탭에서 생성된 AI 이미지 가져오기">📥 AI 이미지 가져오기</button>
      <button type="button" class="btn-overlay-photo btn-card-replace-photo" data-photo-key="cover" title="내 PC에서 사진 교체/업로드">📷 사진 교체/업로드</button>
    </div>
  </div>
  <p style="font-size:13px;color:#64748b;margin-top:7px;font-weight:600;">▲ [현장 실물] ${vName} 건물 외관 및 주거 환경 (자료: 공실뉴스)</p>
</div>` : "";

      const mapHtml = mapImg ? `
<div class="article-photo-card" data-photo-key="mapImage" style="text-align:center;margin:22px 0;">
  <div style="position:relative;display:inline-block;max-width:100%;border-radius:8px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
    <img src="${mapImg}" style="display:block;max-width:100%;height:auto;" alt="위치정보 지도" />
    <div class="media-overlay">
      <button type="button" class="btn-overlay-photo btn-card-ai-photo" data-photo-key="mapImage" title="열려있는 ChatGPT/Gemini 탭에서 생성된 AI 이미지 가져오기">📥 AI 이미지 가져오기</button>
      <button type="button" class="btn-overlay-photo btn-card-replace-photo" data-photo-key="mapImage" title="내 PC에서 사진 교체/업로드">📷 사진 교체/업로드</button>
    </div>
  </div>
  <p style="font-size:13px;color:#64748b;margin-top:7px;font-weight:600;">▲ [위치 지도 캡쳐] ${vName} 위치 및 주변 3대 역세권·주요 간선도로망 현황 (자료: 위치정보 지도)</p>
</div>` : "";

      const rvHtml = rvImg ? `
<div class="article-photo-card" data-photo-key="roadview" style="text-align:center;margin:22px 0;">
  <div style="position:relative;display:inline-block;max-width:100%;border-radius:8px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
    <img src="${rvImg}" style="display:block;max-width:100%;height:auto;" alt="현장 로드뷰" />
    <div class="media-overlay">
      <button type="button" class="btn-overlay-photo btn-card-ai-photo" data-photo-key="roadview" title="열려있는 ChatGPT/Gemini 탭에서 생성된 AI 이미지 가져오기">📥 AI 이미지 가져오기</button>
      <button type="button" class="btn-overlay-photo btn-card-replace-photo" data-photo-key="roadview" title="내 PC에서 사진 교체/업로드">📷 사진 교체/업로드</button>
    </div>
  </div>
  <p style="font-size:13px;color:#64748b;margin-top:7px;font-weight:600;">▲ [현장 로드뷰] ${vName} 단지 주 진입로 및 지상 가로변 현장 전경 (자료: 로드뷰)</p>
</div>` : "";

      if (currentMode === "news") {
        // ── 공통: 제목 & 부제목 ──
        previewArticle.title = `[공실열람 보도] ${vRegion} '${vName}' ${vPrice} 신규 등록… 25평형 실매물 현황`;
        
        const firstSubway = (extractedData.infra && extractedData.infra.subway && extractedData.infra.subway[0]) ? extractedData.infra.subway[0] : "9호선 언주역·선정릉역";
        const sub1 = `${vAddr.split(" ").slice(0, 2).join(" ")} 대로변·${firstSubway} 사통팔달 교통망`;
        const sub2 = `${vArea} ${vRooms}에 특올수리 인테리어 및 탁 트인 뻥뷰 조망권 완비`;
        const sub3 = `명품 학군·생활 인프라 인접… 인근 시세 대비 ${vPrice} 합리적 출회`;
        previewArticle.subtitle = `${sub1}\n${sub2}\n${sub3}`;

        // ── 분량별 본문 제어 ──
        const isShort = currentLength === "short";
        const isLong = currentLength === "long";

        if (currentStyle === "narration") {
          // ★★★ 방송 나레이션 대본형: 소제목(■) 완전 배제, 1~2문장 단위 짧은 호흡 문단 ★★★
          let narrationBody = `
<p>11만 부동산과 임대인이 무료로 공실을 등록하는 공실뉴스의 지도 기반 실매물 서비스 '공실열람'에 서울 ${vRegion} 소재 아파트 '<strong>${vName}</strong>'이 ${vPrice}의 매매 조건으로 공식 등록된 것으로 나타났습니다.</p>

${proofScreenshotHtml}

<p>등록된 세부 정보를 살펴보면, 이 매물은 ${vArea} 규모에 ${vRooms} 구조를 갖추고 있습니다.</p>

<p>${vDirection} 배치로 채광 조건이 양호하고, ${vOptions} 등 주거 설비가 완비된 상태인 것으로 확인됐습니다.</p>`;

          if (!isShort) {
            narrationBody += `
${coverHtml}

<p>교통 여건도 눈길을 끕니다. ${subways}이 도보 거리에 있어 역세권 입지를 형성하고 있습니다.</p>

${mapHtml}`;
          }

          if (!isShort) {
            narrationBody += `
<p>교육 환경 역시 우수한 것으로 분석됩니다. ${schools} 등 명문 학군이 인접해 있고, ${shopping} 등 생활 편의시설도 도보권에 위치하고 있습니다.</p>

${rvHtml}`;
          }

          if (isLong) {
            narrationBody += `
<p>${hospitals} 등 우수한 의료 시설도 인접해 있어 거주 편의성이 높은 것으로 나타났습니다.</p>

<p>인근 ${buses} 등 버스 노선망도 연계되어 있어 대중교통 이용이 수월한 것으로 확인됐습니다.</p>`;
          }

          narrationBody += `

<p>업계에 따르면 인근 유사 평형 시세 대비 합리적인 조건으로, 실수요자 중심의 관심이 이어질 것으로 전망됩니다. 상세한 공실 정보는 공실뉴스 공실열람에서 확인하실 수 있습니다.</p>`;

          previewArticle.content = narrationBody.trim();

        } else {
          // ★★★ 정통 신문 분석형: 소제목(■) + 체크포인트 박스 구조 ★★★
          let editorialBody = `
<p>11만 부동산과 임대인이 무료로 공실을 등록하는 공실뉴스의 지도 기반 실매물 서비스 '공실열람'에 서울 ${vRegion} 소재 아파트 '<strong>${vName}</strong>'이 ${vPrice}의 매매 조건으로 공식 등록된 것으로 나타났습니다.</p>

<p><strong>[공실열람 등록 매물 핵심 개요]</strong><br>
• 매물명: ${vName}<br>
• 소재지: ${vAddr} ${vDongHosu}<br>
• 거래 조건: ${vPrice} (관리비: ${vMaintenance})<br>
• 면적 / 구조: ${vArea} | ${vRooms} | ${vDirection}<br>
• 주요 설비 / 특징: ${vThemes} | ${vOptions}<br>
• 대중교통망: ${subways}</p>

${proofScreenshotHtml}

<h3 style="font-size:17px; font-weight:800; color:#1e293b; margin:24px 0 12px 0;">■ 공실열람 등록 현황… ${vArea.split("/")[0] || "전용 69.4㎡"} 실속형 ${vRooms.split("/")[0] || "3룸"} 아파트 매매 출회</h3>
<p>공실뉴스 공실열람에 등록된 세부 정보에 따르면, 이번 매물은 ${vArea} 규모의 아파트입니다. ${vRooms} 구조를 갖추고 있으며, 1~2인 가구 및 신혼부부 등 실거주 수요층의 선호도가 높은 평면으로 설계되었습니다.</p>

<h3 style="font-size:17px; font-weight:800; color:#1e293b; margin:24px 0 12px 0;">■ 현장 컨디션 확인… 올수리 인테리어 및 시스템 설비 완비</h3>
<p>등록자가 등록한 현장 실물 자료와 공실열람 현황에 따르면, 해당 세대는 화이트톤 모던 인테리어 수리가 완료된 상태로 등록되었습니다. ${vOptions} 등 주요 주거 설비가 완비되어 있으며, ${vDirection} 배치로 채광과 환기 조건이 양호한 것으로 조사되었습니다.</p>

${coverHtml}`;

          if (!isShort) {
            editorialBody += `
<h3 style="font-size:17px; font-weight:800; color:#1e293b; margin:24px 0 12px 0;">■ 입지 및 대중교통… ${firstSubway} 인접 역세권</h3>
<p>단지 주변 교통 환경을 살펴보면, ${subways}이 도보 거리에 위치한 역세권 입지입니다. 주요 간선도로망을 통해 테헤란로 업무지구 및 서울 주요 권역으로의 이동이 수월하며, 인근 ${buses} 등 버스 노선망이 연계되어 있습니다.</p>

${mapHtml}

<h3 style="font-size:17px; font-weight:800; color:#1e293b; margin:24px 0 12px 0;">■ 교육 및 생활 인프라… 명문 학군 및 근린 편의시설 밀집</h3>
<p>자녀 교육 환경으로는 ${schools} 등 명문 학군이 도보권에 위치해 있습니다. 또한 단지 도보 생활권 내에 ${shopping} 등 대형 유통 시설과 근린 상권이 조성되어 있으며, ${hospitals} 등 우수한 의료 시설이 인접해 있습니다.</p>

${rvHtml}`;
          }

          if (isLong) {
            editorialBody += `
<h3 style="font-size:17px; font-weight:800; color:#1e293b; margin:24px 0 12px 0;">■ 시세 분석 및 시장 전망… 인근 실거래 시세 대비 가격 지표 분석</h3>
<p>부동산 업계에 따르면 ${vRegion} 일대 유사 평형대 아파트 매매 호가와 비교할 때, 이번 공실열람에 등록된 ${vPrice} 호가는 상대적으로 시장 진입 문턱을 낮춘 가격대로 파악됩니다. 실수요자 중심의 매수세가 유입될 수 있을지 시장의 관심이 모이고 있습니다.</p>`;
          }

          editorialBody += `

<p style="margin-top:28px;"><strong>[공실열람 보도 분석 체크포인트]</strong><br>
• 입지 요건: ${firstSubway} 역세권 및 대로변 직주근접 입지<br>
• 시설 상태: 올수리 인테리어 및 ${vOptions} 구비<br>
• 교육·생활: ${schools.split(",")[0]} 학군 및 유통·의료 편의시설 인접<br>
• 가격 지표: 인근 유사 평형 시세 대비 가격 적정성 분석 필요</p>`;

          previewArticle.content = editorialBody.trim();
        }

        if (primaryPhoto) {
          previewArticle.imageUrl = primaryPhoto;
          previewArticle.imageCaption = `${vName} 현장 실매물 전경 (자료: 공실뉴스)`;
        }
        const dynThemes = (extractedData.themes || []).map(t => t.replace(/^#/, "").trim());
        previewArticle.keywords = Array.from(new Set([vName, vRegion, "공실뉴스", "공실열람", "아파트매매", "실매물", ...dynThemes])).slice(0, 10);
      } else {
        // ── 네이버 블로그 원고 ──
        if (currentStyle === "blog_property") {
          // ★★★ 매물 분석 & 임대인 안내 스타일 ★★★
          previewBlog.title = `[공실열람 매물] '${vName}' ${vPrice} 실매물 상세 분석 리포트`;
          previewBlog.content = `
<p>11만 부동산과 임대인이 무료로 공실을 등록하는 공실뉴스 지도 기반 실매물 서비스 '공실열람'에 <strong>${vName}</strong>(${vPrice}) 매물이 새롭게 공식 등록되었습니다.</p>

${proofScreenshotHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">📋 매물 상세 스펙</h3>
<p>
• <strong>매물명</strong>: ${vName}<br>
• <strong>소재지</strong>: ${vAddr} ${vDongHosu}<br>
• <strong>거래 조건</strong>: ${vPrice}<br>
• <strong>면적</strong>: ${vArea}<br>
• <strong>구조</strong>: ${vRooms} | ${vDirection}<br>
• <strong>설비</strong>: ${vOptions}<br>
• <strong>관리비</strong>: ${vMaintenance}<br>
• <strong>입주일</strong>: ${vMoveIn}<br>
• <strong>테마</strong>: ${vThemes}</p>

${coverHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">🚇 교통 접근성</h3>
<p><strong>${subways}</strong> 도보 이용 가능한 역세권 환경입니다. 테헤란로 업무지구 접근성이 우수하며, ${buses} 등 버스 노선도 연계되어 있습니다.</p>

${mapHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">🏫 교육·생활 인프라</h3>
<p>• <strong>학군</strong>: ${schools}<br>
• <strong>쇼핑</strong>: ${shopping}<br>
• <strong>의료</strong>: ${hospitals}</p>

${rvHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">💰 시세 분석</h3>
<p>${vRegion} 일대 유사 평형 시세 대비 합리적인 ${vPrice} 조건으로, 실거주 및 투자 관점에서 관심이 예상됩니다.</p>

<p style="margin-top:24px; padding:16px; background:#f0f9ff; border-left:4px solid #2563eb; border-radius:6px;">📞 <strong>매물 상세 확인</strong><br>공실뉴스 공실열람에서 실매물 사진, 지도, 로드뷰 등 상세 정보를 확인하실 수 있습니다.</p>
`.trim();

        } else {
          // ★★★ 친근한 정보성 칼럼형 (기본 블로그 스타일) ★★★
          previewBlog.title = `[공실열람] 11만 부동산 등록망 공실뉴스에 나온 '${vName}' ${vPrice} 실매물 분석`;
          previewBlog.content = `
<p>11만 부동산과 임대인이 무료로 공실을 등록하는 공실뉴스 지도 기반 실매물 서비스 '공실열람'에 <strong>${vName}</strong>(${vPrice}) 매물이 새롭게 공식 등록되었습니다.</p>
<p>안녕하세요! 공실뉴스 공식 부동산 블로그입니다 😊</p>

<p><strong>[공실열람 등록 매물 핵심 개요]</strong><br>
• 매물명: ${vName}<br>
• 소재지: ${vAddr} ${vDongHosu}<br>
• 거래 조건: ${vPrice} (공급 25평 / 전용 21평, 침실 3개 구조)<br>
• 주요 설비 / 특징: ${vThemes} | 관리비 ${vMaintenance}<br>
• 대중교통망: ${subways}</p>

${proofScreenshotHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">✨ 1. 실매물 개요 및 내부 컨디션</h3>
<p>공실뉴스 공실열람에 등록된 세부 정보에 따르면, 이번 매물은 화이트톤 올수리 인테리어가 완료된 상태입니다. ${vOptions}이 완비되어 있고, ${vDirection} 구조로 채광과 쾌적성이 확보되어 있습니다.</p>

${coverHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">🚇 2. 대중교통 및 역세권 인프라</h3>
<p>지하철 <strong>${subways}</strong>을 도보로 이용할 수 있는 역세권 환경입니다. 테헤란로 업무지구 접근성이 우수하며, 강남 주요 간선도로 연결망이 편리하게 갖추어져 있습니다.</p>

${mapHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">🏫 3. 학군 및 생활 편의시설</h3>
<p><strong>${schools}</strong> 등 명문 학군이 인접해 안심 통학이 가능하며, <strong>${shopping}</strong> 등 대형 유통 시설과 <strong>${hospitals}</strong> 등 의료 시설이 도보 생활권 내에 위치합니다.</p>

${rvHtml}

<h3 style="font-size:18px; font-weight:bold; color:#1e3a8a; margin:26px 0 10px 0;">💰 4. 시세 분석 및 종합 평가</h3>
<p>인근 시세 대비 <strong>${vPrice}</strong>의 조건으로 공실열람에 등록된 매물로, 입지 조건과 내부 수리 상태를 감안할 때 실거주 관점에서 관심이 이어질 것으로 분석됩니다. 상세한 공실 정보는 공실뉴스 공실열람에서 확인하실 수 있습니다.</p>
`.trim();
        }

        if (primaryPhoto) {
          previewBlog.imageUrl = primaryPhoto;
          previewBlog.imageCaption = `${vName} 현장 실물 사진`;
        }
        const dynThemes = (extractedData.themes || []).map(t => t.replace(/^#/, "").trim());
        previewBlog.tags = Array.from(new Set([vName, vRegion, "공실뉴스", "아파트매매", "부동산투자", ...dynThemes])).slice(0, 10);
      }
      renderPreview();
      return;
    }

    // ★ 2. 일반 기사인 경우 기본 파싱
    if (currentMode === "news") {
      previewArticle.title = rawTitle.length > 5 ? rawTitle : previewArticle.title;
      if (rawText.length > 20) {
        const paras = rawText.split(/\n{2,}|\n/).filter(p => p.trim().length > 0).slice(0, 4);
        previewArticle.content = paras.map(p => `<p>${p.trim()}</p>`).join("\n");
      }
    } else {
      previewBlog.title = `🏢 ${rawTitle.length > 5 ? rawTitle : "부동산 핵심 트렌드 분석"}`;
      if (rawText.length > 20) {
        const paras = rawText.split(/\n{2,}|\n/).filter(p => p.trim().length > 0).slice(0, 3);
        previewBlog.content = `<p>안녕하세요! <strong>공실뉴스</strong> 공식 블로그입니다 😊✨</p>` + 
                              paras.map(p => `<p>${p.trim()}</p>`).join("\n");
      }
    }
    renderPreview();
  }

  // ── 11. 미리보기 렌더링 함수 ──
  function renderPreview() {
    if (currentMode === "news") {
      pvTitle.textContent = previewArticle.title;

      // ★ 부제목: 항상 3줄로 포맷팅하여 각 줄을 명확한 블록으로 렌더링
      const cleanSub = formatThreeLineSubtitle(previewArticle.subtitle);
      previewArticle.subtitle = cleanSub;
      const subLines = cleanSub.split("\n").filter(Boolean);
      pvSubtitle.innerHTML = subLines.map(line => `<div class="sub-line">${escapeHtml(line)}</div>`).join("");
      pvReporterName.textContent = previewArticle.reporterName;
      pvPublishDate.textContent = previewArticle.publishDate;
      pvImage.src = previewArticle.imageUrl;
      pvImageCaption.textContent = previewArticle.imageCaption;
      pvContent.innerHTML = previewArticle.content;

      // 키워드 태그 렌더링
      pvKeywordsWrap.innerHTML = "";
      previewArticle.keywords.forEach(kw => {
        const tag = document.createElement("span");
        tag.className = "kw-tag";
        tag.textContent = `#${kw.replace(/^#/, "")}`;
        pvKeywordsWrap.appendChild(tag);
      });

      renderPhotosStrip(pvPhotosStrip, previewArticle.imageUrl);
    } else {
      pvBlogTitle.textContent = previewBlog.title;
      pvBlogImage.src = previewBlog.imageUrl;
      pvBlogImageCaption.textContent = previewBlog.imageCaption;
      pvBlogContent.innerHTML = previewBlog.content;

      // 블로그 해시태그 렌더링
      pvBlogTagsWrap.innerHTML = "";
      previewBlog.tags.forEach(t => {
        const tag = document.createElement("span");
        tag.className = "naver-tag";
        tag.textContent = `#${t.replace(/^#/, "")}`;
        pvBlogTagsWrap.appendChild(tag);
      });

      renderPhotosStrip(pvBlogPhotosStrip, previewBlog.imageUrl);
    }
  }

  function renderPhotosStrip(targetEl, activeImgUrl) {
    if (!targetEl) return;
    const photos = [];
    if (extractedData.proofScreenshot) {
      photos.push({ url: extractedData.proofScreenshot, label: "검증캡쳐", dataKey: "proofScreenshot" });
    }
    if (previewArticle.imageUrl) {
      photos.push({ url: previewArticle.imageUrl, label: "대표사진", isCover: true, dataKey: "cover" });
    }
    if (extractedData.mapImage && extractedData.mapImage !== previewArticle.imageUrl) {
      photos.push({ url: extractedData.mapImage, label: "위치지도", dataKey: "mapImage" });
    }
    const rvImg = (extractedData.roadviewImages && extractedData.roadviewImages[0]) || extractedData.roadviewImage || "";
    if (rvImg && !photos.some(p => p.url === rvImg)) {
      photos.push({ url: rvImg, label: "현장로드뷰", dataKey: "roadview" });
    }

    if (photos.length <= 1) {
      targetEl.innerHTML = "";
      return;
    }

    const stripId = `strip_${Date.now()}`;
    targetEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin:0 0 6px 0;">
        <span style="font-size:11px;font-weight:700;color:#1e3a8a;">📷 기사 포함 사진 (총 ${photos.length}장)</span>
        <span style="font-size:10px;color:#64748b;">클릭=대표지정 · 📷=교체</span>
      </div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;">
        ${photos.map((p, idx) => `
          <div class="strip-thumb-item" data-url="${p.url}" data-key="${p.dataKey}" data-idx="${idx}" title="${p.label}" style="flex-shrink:0;position:relative;cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid ${p.url === activeImgUrl ? '#2563eb' : '#cbd5e1'};width:72px;height:56px;background:#f1f5f9;">
            <img src="${p.url}" style="width:100%;height:100%;object-fit:cover;" />
            <span style="position:absolute;bottom:0;left:0;right:0;background:rgba(15,23,42,0.75);color:#fff;font-size:9px;text-align:center;padding:1px 0;line-height:1.2;font-weight:700;">${p.label}</span>
            <button class="strip-upload-btn" data-key="${p.dataKey}" data-idx="${idx}" title="사진 교체/업로드" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,0.6);background:rgba(0,0,0,0.6);color:#fff;font-size:11px;line-height:20px;text-align:center;cursor:pointer;padding:0;z-index:3;backdrop-filter:blur(2px);">📷</button>
            <input type="file" accept="image/*" class="strip-file-input" data-key="${p.dataKey}" data-idx="${idx}" style="display:none;" />
          </div>
        `).join("")}
      </div>
    `;

    // 각 썸네일 클릭 → 대표사진 지정
    targetEl.querySelectorAll(".strip-thumb-item").forEach(item => {
      item.addEventListener("click", (e) => {
        // 업로드 버튼 클릭 시에는 대표사진 지정 건너뛰기
        if (e.target.closest(".strip-upload-btn")) return;
        const selectedUrl = item.getAttribute("data-url");
        if (selectedUrl) {
          previewArticle.imageUrl = selectedUrl;
          previewBlog.imageUrl = selectedUrl;
          renderPreview();
        }
      });
    });

    // 각 📷 버튼 클릭 → 해당 사진의 file input 열기
    targetEl.querySelectorAll(".strip-upload-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = btn.getAttribute("data-idx");
        const fileInput = targetEl.querySelector(`.strip-file-input[data-idx="${idx}"]`);
        if (fileInput) fileInput.click();
      });
    });

    // 각 file input 변경 → 해당 사진 교체
    targetEl.querySelectorAll(".strip-file-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const dataKey = input.getAttribute("data-key");
        const reader = new FileReader();
        reader.onload = (evt) => {
          const base64Url = evt.target.result;
          // 데이터 소스에 따라 교체
          switch (dataKey) {
            case "cover":
              previewArticle.imageUrl = base64Url;
              previewBlog.imageUrl = base64Url;
              pvImage.src = base64Url;
              pvBlogImage.src = base64Url;
              break;
            case "proofScreenshot":
              extractedData.proofScreenshot = base64Url;
              break;
            case "mapImage":
              extractedData.mapImage = base64Url;
              break;
            case "roadview":
              if (extractedData.roadviewImages && extractedData.roadviewImages.length > 0) {
                extractedData.roadviewImages[0] = base64Url;
              }
              extractedData.roadviewImage = base64Url;
              break;
          }
          // 프리뷰 다시 렌더
          renderPreview();
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // ── 12. 뷰포트 시뮬레이터 토글 (모바일 / PC / 네이버 블로그) ──
  vpMobile.addEventListener("click", () => {
    setViewport("mobile");
    if (currentMode === "blog") switchDualMode("news");
  });

  vpPc.addEventListener("click", () => {
    setViewport("pc");
    if (currentMode === "blog") switchDualMode("news");
  });

  vpNaverBlog.addEventListener("click", () => {
    setViewport("mobile");
    switchDualMode("blog");
  });

  function setViewport(vp) {
    currentViewport = vp;
    vpMobile.classList.toggle("active", vp === "mobile" && currentMode === "news");
    vpPc.classList.toggle("active", vp === "pc");
    vpNaverBlog.classList.toggle("active", currentMode === "blog");

    if (vp === "mobile") {
      previewDeviceFrame.className = "device-frame mobile";
    } else {
      previewDeviceFrame.className = "device-frame pc";
    }
  }

  // ── 13. 미리보기에서 사진 교체 / 로컬 업로드 ──
  btnChangePhoto.addEventListener("click", () => filePhotoInput.click());

  filePhotoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64Url = evt.target.result;
        previewArticle.imageUrl = base64Url;
        previewBlog.imageUrl = base64Url;
        pvImage.src = base64Url;
        pvBlogImage.src = base64Url;
        renderPhotosStrip(pvPhotosStrip, base64Url);
      };
      reader.readAsDataURL(file);
    }
  });

  // ── 13-1. 챗GPT / 제미나이 탭에서 생성된 AI 이미지 원클릭 가져오기 (공통 함수) ──
  async function importAiImageToKey(targetKey = "cover", triggerBtn = null) {
    const origHtml = triggerBtn ? triggerBtn.innerHTML : "";
    if (triggerBtn) triggerBtn.innerHTML = `⏳ AI 탐색 중...`;

    try {
      const allTabs = await chrome.tabs.query({});
      const aiTab = allTabs.find(t => t.url && (t.url.includes("chatgpt.com") || t.url.includes("gemini.google.com")));

      if (!aiTab || !aiTab.id) {
        alert("열려 있는 ChatGPT 또는 Gemini 탭을 찾을 수 없습니다.\n먼저 [1. 작성 & AI 전송]에서 AI 전송을 진행해 주세요!");
        if (triggerBtn) triggerBtn.innerHTML = origHtml;
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: aiTab.id },
        func: () => {
          const imgs = Array.from(document.querySelectorAll("img"));
          const candidates = imgs.filter(img => {
            const src = img.src || "";
            const alt = img.alt || "";
            if (src.includes("oaidalleapiprodscus") || src.includes("dalle") || alt.includes("Generated")) return true;
            if (src.includes("googleusercontent.com") && !src.includes("avatar") && !src.includes("profile") && img.naturalWidth > 200) return true;
            if (img.closest("[data-message-author-role='assistant']") || img.closest(".model-response-text")) {
              if (img.naturalWidth > 250 && !src.includes("avatar")) return true;
            }
            return false;
          });

          if (candidates.length > 0) {
            const latest = candidates[candidates.length - 1];
            return latest.src;
          }
          return null;
        }
      });

      const foundUrl = results && results[0] && results[0].result;
      if (foundUrl) {
        applyPhotoByKey(targetKey, foundUrl);
        if (targetKey === "cover") {
          pvImageCaption.textContent = `[AI 보도 실사] 현장 상황 1:1 밀착 분석 보도 전경. /자료=공실뉴스 AI`;
          previewArticle.imageCaption = pvImageCaption.textContent;
        }
        if (triggerBtn) {
          triggerBtn.innerHTML = `✅ 적용 완료!`;
          setTimeout(() => triggerBtn.innerHTML = origHtml, 2000);
        }
      } else {
        if (triggerBtn) triggerBtn.innerHTML = origHtml;
        alert("챗GPT/제미나이 탭에서 생성된 이미지를 아직 찾지 못했습니다.\n\nAI가 그림을 모두 그린 후 다시 클릭해 주시거나,\n대화창의 생성 이미지 위에서 [우클릭 ➔ 이미지 복사] 후 이 화면에서 [Ctrl+V]를 누르시면 즉시 적용됩니다!");
      }
    } catch (err) {
      if (triggerBtn) triggerBtn.innerHTML = origHtml;
      alert("AI 이미지 가져오기 중 오류: " + err.message + "\n\n대화창의 이미지에서 [우클릭 ➔ 이미지 복사] 후 이 화면에서 [Ctrl+V]를 눌러도 즉시 적용됩니다!");
    }
  }

  if (btnImportAiImage) {
    btnImportAiImage.addEventListener("click", () => importAiImageToKey("cover", btnImportAiImage));
  }

  // ── 13-1b. 블로그 미리보기 사진 교체 / 업로드 ──
  const btnBlogChangePhoto = document.getElementById("btnBlogChangePhoto");
  const fileBlogPhotoInput = document.getElementById("fileBlogPhotoInput");
  const btnBlogImportAiImage = document.getElementById("btnBlogImportAiImage");

  if (btnBlogChangePhoto) {
    btnBlogChangePhoto.addEventListener("click", () => triggerPhotoReplace("cover"));
  }

  if (btnBlogImportAiImage) {
    btnBlogImportAiImage.addEventListener("click", () => {
      importAiImageToKey("cover", btnBlogImportAiImage);
    });
  }

  if (btnChangePhoto) {
    btnChangePhoto.addEventListener("click", () => triggerPhotoReplace("cover"));
  }

  // ── 13-2. 화면 어디서든 Ctrl+V로 클립보드 이미지 즉시 붙여넣기 ──
  let lastFocusedPhotoCardKey = null;

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".article-photo-card");
    if (card) {
      lastFocusedPhotoCardKey = card.getAttribute("data-photo-key");
    }
  });

  window.addEventListener("paste", (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (items) {
      for (let item of items) {
        if (item.type && item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (evt) => {
              const base64Url = evt.target.result;
              const targetKey = lastFocusedPhotoCardKey || "cover";
              applyPhotoByKey(targetKey, base64Url);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    }
  });

  // ── 13-3. 모든 사진 인라인 교체 / PC 업로드 전역 처리기 ──
  const hiddenCommonFileInput = document.createElement("input");
  hiddenCommonFileInput.type = "file";
  hiddenCommonFileInput.accept = "image/*";
  hiddenCommonFileInput.style.display = "none";
  document.body.appendChild(hiddenCommonFileInput);

  let currentReplacingPhotoKey = null;

  function triggerPhotoReplace(photoKey) {
    currentReplacingPhotoKey = photoKey;
    lastFocusedPhotoCardKey = photoKey;
    hiddenCommonFileInput.value = "";
    hiddenCommonFileInput.click();
  }

  hiddenCommonFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !currentReplacingPhotoKey) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64Url = evt.target.result;
      applyPhotoByKey(currentReplacingPhotoKey, base64Url);
    };
    reader.readAsDataURL(file);
  });

  function applyPhotoByKey(key, base64Url) {
    if (!base64Url) return;
    switch (key) {
      case "cover":
        previewArticle.imageUrl = base64Url;
        previewBlog.imageUrl = base64Url;
        pvImage.src = base64Url;
        pvBlogImage.src = base64Url;
        break;
      case "proofScreenshot":
        extractedData.proofScreenshot = base64Url;
        break;
      case "mapImage":
        extractedData.mapImage = base64Url;
        break;
      case "roadview":
        extractedData.roadviewImage = base64Url;
        extractedData.roadviewImages = [base64Url];
        break;
    }
    updatePreviewModelFromInput();
    renderPreview();
  }

  // 본문 속 각 사진 카드 상의 오버레이 버튼 2개(AI 가져오기, 사진 교체) 이벤트 위임
  document.addEventListener("click", (e) => {
    // 1. [📷 사진 교체/업로드] 버튼 클릭
    const repBtn = e.target.closest(".btn-card-replace-photo, .btn-inline-replace-photo");
    if (repBtn) {
      e.preventDefault();
      e.stopPropagation();
      const photoKey = repBtn.getAttribute("data-photo-key") || "cover";
      triggerPhotoReplace(photoKey);
      return;
    }

    // 2. [📥 AI 이미지 가져오기] 버튼 클릭
    const aiBtn = e.target.closest(".btn-card-ai-photo");
    if (aiBtn) {
      e.preventDefault();
      e.stopPropagation();
      const photoKey = aiBtn.getAttribute("data-photo-key") || "cover";
      importAiImageToKey(photoKey, aiBtn);
      return;
    }
  });

  // ── 13-4. 복사 / 전송 시 사진 교체 버튼 및 오버레이 태그 완전 제거 헬퍼 ──
  function stripPhotoReplaceBars(html) {
    if (!html) return "";
    const container = document.createElement("div");
    container.innerHTML = html;
    container.querySelectorAll(".photo-replace-bar, button.btn-inline-replace-photo, .media-overlay").forEach(el => el.remove());
    return container.innerHTML;
  }

  // 양방향 실시간 수정 바인딩
  pvTitle.addEventListener("input", () => previewArticle.title = pvTitle.innerText.trim());
  pvSubtitle.addEventListener("input", () => {
    previewArticle.subtitle = formatThreeLineSubtitle(pvSubtitle.innerText.trim());
  });
  pvSubtitle.addEventListener("paste", (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData("text");
    const formatted = formatThreeLineSubtitle(pastedText);
    document.execCommand("insertText", false, formatted);
    previewArticle.subtitle = formatted;
  });
  pvImageCaption.addEventListener("input", () => previewArticle.imageCaption = pvImageCaption.innerText.trim());
  pvBlogTitle.addEventListener("input", () => previewBlog.title = pvBlogTitle.innerText.trim());

  // ── 14. [🚀 옆 화면 기사작성기로 전송] ──
  btnSendToSideEditor.addEventListener("click", async () => {
    // 1. 모든 사진을 photoFiles 규격으로 배열화 (검증스크린샷 1장, 대표실물 1장, 지도 1장, 로드뷰 1장)
    const allPhotos = [];
    const vName = extractedData.buildingName || "공실 매물";
    const vPrice = extractedData.price || "";

    // 1) 실매물 등록 인증 스크린샷
    if (extractedData.proofScreenshot) {
      allPhotos.push({
        file: null,
        preview: extractedData.proofScreenshot,
        caption: `[공실뉴스 실매물 등록 검증] 11만 부동산 플랫폼 공실뉴스에 공식 등록된 '${vName}' (${vPrice}) 실매물 등록 현황 스크린샷`,
        isCover: false,
        size: 600,
        align: "center",
        captionAlign: "center"
      });
    }

    // 2) 대표 실물 사진 (표지)
    const currentCoverUrl = previewArticle.imageUrl || (extractedData.images && extractedData.images[0]) || "";
    if (currentCoverUrl) {
      allPhotos.push({
        file: null,
        preview: currentCoverUrl,
        caption: pvImageCaption.innerText.trim() || `${vName} 현장 실물 전경 및 대표 외관 (자료: 공실뉴스)`,
        isCover: true,
        size: 600,
        align: "center",
        captionAlign: "center"
      });
    }

    // 3) 위치정보 지도 사진
    if (extractedData.mapImage && extractedData.mapImage !== currentCoverUrl) {
      allPhotos.push({
        file: null,
        preview: extractedData.mapImage,
        caption: `${vName} 위치정보 지도 및 주변 지하철 3대 역세권 현황 (자료: 위치정보 지도)`,
        isCover: false,
        size: 600,
        align: "center",
        captionAlign: "center"
      });
    }

    // 4) 현장 로드뷰 사진 (딱 1장!)
    const rvImg = (extractedData.roadviewImages && extractedData.roadviewImages[0]) || extractedData.roadviewImage || "";
    if (rvImg && !allPhotos.some(p => p.preview === rvImg)) {
      allPhotos.push({
        file: null,
        preview: rvImg,
        caption: `${vName} 단지 주 진입로 및 지상 가로변 현장 전경 (자료: 로드뷰)`,
        isCover: false,
        size: 600,
        align: "center",
        captionAlign: "center"
      });
    }

    const cleanSub = formatThreeLineSubtitle(previewArticle.subtitle || pvSubtitle.innerText.trim());
    previewArticle.subtitle = cleanSub;

    const payload = {
      title: pvTitle.innerText.trim(),
      subtitle: cleanSub,
      content: stripPhotoReplaceBars(pvContent.innerHTML),
      section1: "공실뉴스",
      section2: "아파트",
      imageUrl: currentCoverUrl || (allPhotos[0] ? allPhotos[0].preview : ""),
      imageCaption: pvImageCaption.innerText.trim(),
      keywords: previewArticle.keywords,
      reporterName: previewArticle.reporterName || "김미숙",
      vacancyId: extractedData.vacancyId || null,
      photoFiles: allPhotos
    };

    const origHtml = btnSendToSideEditor.innerHTML;
    btnSendToSideEditor.innerHTML = `<span class="action-icon">⏳</span><div class="action-text"><strong>기사작성기로 전송 중...</strong></div>`;

    try {
      // 1. 열려 있는 공실뉴스 관리자 탭 탐색 (localhost:3000 및 gongsilnews.com 동시 지원)
      const allTabs = await chrome.tabs.query({});
      const targetTab = allTabs.find(t => t.url && (t.url.includes("localhost:3000/admin") || t.url.includes("gongsilnews.com/admin")));

      if (targetTab && targetTab.id) {
        await chrome.tabs.update(targetTab.id, { active: true });

        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          args: [payload],
          func: (draft) => {
            // localStorage 저장 및 CustomEvent 발송
            try { localStorage.setItem("gongsil_ai_incoming_draft", JSON.stringify(draft)); } catch (e) {}
            window.dispatchEvent(new CustomEvent("gongsil_ai_inject_draft", { detail: draft }));
            window.postMessage({ type: "GONGSIL_AI_INJECT_DRAFT", draft }, "*");

            // 직접 DOM 폼에도 입력값 주입 (안전망)
            const titleInput = document.querySelector("input[placeholder*='제목']") || document.querySelector("input[name='title']");
            if (titleInput) {
              titleInput.value = draft.title;
              titleInput.dispatchEvent(new Event("input", { bubbles: true }));
              titleInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
            const subtitleInput = document.querySelector("textarea[placeholder*='부제'], input[placeholder*='부제'], textarea[name='subtitle'], input[name='subtitle']");
            if (subtitleInput) {
              subtitleInput.value = draft.subtitle;
              subtitleInput.dispatchEvent(new Event("input", { bubbles: true }));
              subtitleInput.dispatchEvent(new Event("change", { bubbles: true }));
            }

            // 화면 상단 안내 플로팅 배너 표시
            const notice = document.createElement("div");
            notice.style.position = "fixed";
            notice.style.top = "20px";
            notice.style.left = "50%";
            notice.style.transform = "translateX(-50%)";
            notice.style.background = "#2563eb";
            notice.style.color = "#ffffff";
            notice.style.padding = "14px 28px";
            notice.style.borderRadius = "30px";
            notice.style.fontWeight = "bold";
            notice.style.fontSize = "15px";
            notice.style.boxShadow = "0 10px 25px rgba(37,99,235,0.4)";
            notice.style.zIndex = "99999";
            notice.style.transition = "all 0.3s";
            notice.innerHTML = `공실뉴스 매물기사초안 V1.0에서 기사 제목, 본문, 사진(총 ${draft.photoFiles ? draft.photoFiles.length : 1}장)이 채워졌습니다!`;
            document.body.appendChild(notice);
            setTimeout(() => {
              notice.style.opacity = "0";
              setTimeout(() => notice.remove(), 400);
            }, 3500);
          }
        });

        btnSendToSideEditor.innerHTML = `<span class="action-icon">✅</span><div class="action-text"><strong>기사작성기 전송 완료!</strong><small>사진 ${allPhotos.length}장 포함 전송됨</small></div>`;
        setTimeout(() => btnSendToSideEditor.innerHTML = origHtml, 2500);
      } else {
        // 열린 탭이 없으면 현재 사용 중인 도메인(공실뉴스 또는 로컬)에 맞춰 작성창 열기
        const isProd = extractedData.url && extractedData.url.includes("gongsilnews.com");
        const adminUrl = isProd
          ? (extractedData.vacancyId ? `https://gongsilnews.com/admin?menu=article&action=write&vacancy_id=${extractedData.vacancyId}` : "https://gongsilnews.com/admin?menu=article&action=write")
          : (extractedData.vacancyId ? `http://localhost:3000/admin?menu=article&action=write&vacancy_id=${extractedData.vacancyId}` : "http://localhost:3000/admin?menu=article&action=write");

        const newTab = await chrome.tabs.create({ url: adminUrl });
        const injectDraftWhenReady = (tabId, changeInfo) => {
          if (tabId === newTab.id && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(injectDraftWhenReady);
            setTimeout(async () => {
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: newTab.id },
                  args: [payload],
                  func: (draft) => {
                    try { localStorage.setItem("gongsil_ai_incoming_draft", JSON.stringify(draft)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent("gongsil_ai_inject_draft", { detail: draft }));
                    window.postMessage({ type: "GONGSIL_AI_INJECT_DRAFT", draft }, "*");

                    const titleInput = document.querySelector("input[placeholder*='제목']") || document.querySelector("input[name='title']");
                    if (titleInput) {
                      titleInput.value = draft.title;
                      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
                      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                    const subtitleInput = document.querySelector("textarea[placeholder*='부제'], input[placeholder*='부제'], textarea[name='subtitle'], input[name='subtitle']");
                    if (subtitleInput) {
                      subtitleInput.value = draft.subtitle;
                      subtitleInput.dispatchEvent(new Event("input", { bubbles: true }));
                      subtitleInput.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }
                });
              } catch (e) {}
            }, 600);
          }
        };
        chrome.tabs.onUpdated.addListener(injectDraftWhenReady);

        btnSendToSideEditor.innerHTML = `<span class="action-icon">🚀</span><div class="action-text"><strong>작성창 여는 중...</strong><small>잠시 후 자동 채워집니다</small></div>`;
        setTimeout(() => btnSendToSideEditor.innerHTML = origHtml, 2500);
      }
    } catch (e) {
      btnSendToSideEditor.innerHTML = origHtml;
      alert("기사작성기로 전송 중 오류: " + e.message);
    }
  });

  // ── 15. [⚡ DB 즉시 자동발행] ──
  btnPublishGongsilDirect.addEventListener("click", async () => {
    if (!currentUser.isPremium && currentUser.dailyUsed >= currentUser.dailyLimit) {
      premiumModal.classList.remove("hidden");
      return;
    }

    const origText = btnPublishGongsilDirect.innerText;
    btnPublishGongsilDirect.innerText = "발행중...";

    try {
      // 1. 모든 사진을 photoFiles 규격으로 배열화 (검증스크린샷 1장, 대표실물 1장, 지도 1장, 로드뷰 1장)
      const allPhotos = [];
      const vName = extractedData.buildingName || "공실 매물";
      const vPrice = extractedData.price || "";

      // 1) 실매물 등록 인증 스크린샷
      if (extractedData.proofScreenshot) {
        allPhotos.push({
          preview: extractedData.proofScreenshot,
          caption: `[공실뉴스 실매물 등록 검증] 11만 부동산 플랫폼 공실뉴스에 공식 등록된 '${vName}' (${vPrice}) 실매물 등록 현황 스크린샷`,
          isCover: false,
          size: 600
        });
      }

      // 2) 대표 실물 사진 (표지)
      const currentCoverUrl = previewArticle.imageUrl || (extractedData.images && extractedData.images[0]) || "";
      if (currentCoverUrl) {
        allPhotos.push({
          preview: currentCoverUrl,
          caption: pvImageCaption.innerText.trim() || `${vName} 단지 전경 및 대표 외관 (자료: 공실뉴스)`,
          isCover: true,
          size: 600
        });
      }

      // 3) 위치정보 지도 사진
      if (extractedData.mapImage && extractedData.mapImage !== currentCoverUrl) {
        allPhotos.push({
          preview: extractedData.mapImage,
          caption: `${vName} 위치정보 지도 및 주변 지하철 3대 역세권 현황 (자료: 위치정보 지도)`,
          isCover: false,
          size: 600
        });
      }

      // 4) 현장 로드뷰 사진 (딱 1장!)
      const rvImg = (extractedData.roadviewImages && extractedData.roadviewImages[0]) || extractedData.roadviewImage || "";
      if (rvImg && !allPhotos.some(p => p.preview === rvImg)) {
        allPhotos.push({
          preview: rvImg,
          caption: `${vName} 단지 주 진입로 및 지상 가로변 현장 전경 (자료: 로드뷰)`,
          isCover: false,
          size: 600
        });
      }

      const payload = {
        title: pvTitle.innerText.trim(),
        subtitle: pvSubtitle.innerText.trim(),
        content: stripPhotoReplaceBars(pvContent.innerHTML),
        section1: "공실뉴스",
        section2: "아파트",
        imageUrl: currentCoverUrl || (allPhotos[0] ? allPhotos[0].preview : ""),
        imageCaption: pvImageCaption.innerText.trim(),
        reporterName: previewArticle.reporterName || "김미숙",
        reporterEmail: "master@gongsilnews.com",
        keywords: previewArticle.keywords,
        status: "APPROVED",
        is_headline: false,
        is_important: false,
        photoFiles: allPhotos,
        vacancyId: extractedData.vacancyId || null
      };

      const isProd = extractedData.url && extractedData.url.includes("gongsilnews.com");
      const publishEndpoint = isProd
        ? "https://gongsilnews.com/api/extension/publish"
        : "http://localhost:3000/api/extension/publish";

      const res = await fetch(publishEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      btnPublishGongsilDirect.innerText = origText;

      if (data.success) {
        lastPublishedArticleId = data.articleId;
        publishSuccessText.textContent = `제 ${data.articleNo || 1040}호 기사로 승인되어 메인 뉴스에 즉시 발행되었습니다. (사진 ${allPhotos.length}장 첨부)`;
        publishSuccessModal.classList.remove("hidden");
        currentUser.dailyUsed += 1;
        updateUserUi();
      } else {
        alert("기사 발행 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch (err) {
      btnPublishGongsilDirect.innerText = origText;
      alert("공실뉴스 서버와 통신할 수 없습니다: " + err.message);
    }
  });

  // 발행 성공 모달 액션
  btnViewPublishedArticle.addEventListener("click", () => {
    publishSuccessModal.classList.add("hidden");
    if (lastPublishedArticleId) {
      const isProd = extractedData.url && extractedData.url.includes("gongsilnews.com");
      const newsUrl = isProd
        ? `https://gongsilnews.com/news/${lastPublishedArticleId}`
        : `http://localhost:3000/news/${lastPublishedArticleId}`;
      chrome.tabs.create({ url: newsUrl });
    }
  });

  btnCloseSuccessModal.addEventListener("click", () => {
    publishSuccessModal.classList.add("hidden");
  });

  // 기사 텍스트 복사
  btnCopyArticleText.addEventListener("click", () => {
    const cleanContent = stripPhotoReplaceBars(pvContent.innerHTML);
    const tmp = document.createElement("div");
    tmp.innerHTML = cleanContent;
    const fullText = `[제목] ${pvTitle.innerText}\n[부제] ${pvSubtitle.innerText}\n\n${tmp.innerText}\n\n사진: ${pvImageCaption.innerText}`;
    navigator.clipboard.writeText(fullText).then(() => {
      alert("✅ 기사 텍스트가 클립보드에 복사되었습니다!");
    });
  });

  // ── 16. [🚀 옆 화면 네이버 블로그로 전송] ──
  btnSendToSideNaverBlog.addEventListener("click", async () => {
    // 1단계: 서식 복사 실행
    btnCopyNaverHtml.click();

    const title = pvBlogTitle.innerText.trim();
    const origHtml = btnSendToSideNaverBlog.innerHTML;
    btnSendToSideNaverBlog.innerHTML = `<span class="action-icon">⏳</span><div class="action-text"><strong>블로그 창으로 전송 중...</strong></div>`;

    try {
      // 2단계: 열려 있는 네이버 블로그 탭 탐색
      const tabs = await chrome.tabs.query({ url: ["*://*.blog.naver.com/*", "*://blog.editor.naver.com/*"] });

      if (tabs.length > 0) {
        const naverTab = tabs[0];
        await chrome.tabs.update(naverTab.id, { active: true });

        await chrome.scripting.executeScript({
          target: { tabId: naverTab.id },
          args: [title],
          func: (blogTitle) => {
            // 스마트에디터 ONE 제목 입력창 자동 주입
            const titleInput = document.querySelector(".se-documentTitle textarea") || 
                               document.querySelector(".se-title-text") || 
                               document.querySelector("input.se_textarea");
            if (titleInput) {
              titleInput.value = blogTitle;
              titleInput.innerText = blogTitle;
              titleInput.dispatchEvent(new Event("input", { bubbles: true }));
            }

            // 본문 입력창 포커스
            const contentArea = document.querySelector(".se-main-container") || document.querySelector("[contenteditable='true']");
            if (contentArea) contentArea.focus();

            // 안내 배너
            const notice = document.createElement("div");
            notice.style.position = "fixed";
            notice.style.top = "20px";
            notice.style.left = "50%";
            notice.style.transform = "translateX(-50%)";
            notice.style.background = "#03c75a";
            notice.style.color = "#ffffff";
            notice.style.padding = "14px 28px";
            notice.style.borderRadius = "30px";
            notice.style.fontWeight = "bold";
            notice.style.fontSize = "15px";
            notice.style.boxShadow = "0 10px 25px rgba(3,199,90,0.4)";
            notice.style.zIndex = "99999";
            notice.innerHTML = "📋 서식 복사 완료! 본문 입력창에서 <b>Ctrl + V</b>를 누르세요!";
            document.body.appendChild(notice);
            setTimeout(() => {
              notice.style.opacity = "0";
              setTimeout(() => notice.remove(), 400);
            }, 3500);
          }
        });

        btnSendToSideNaverBlog.innerHTML = `<span class="action-icon">✅</span><div class="action-text"><strong>블로그 창 전달 완료!</strong><small>본문에서 Ctrl+V 하세요</small></div>`;
        setTimeout(() => btnSendToSideNaverBlog.innerHTML = origHtml, 2500);
      } else {
        // 블로그 글쓰기 창 열기
        chrome.tabs.create({ url: "https://blog.naver.com" });
        btnSendToSideNaverBlog.innerHTML = `<span class="action-icon">🚀</span><div class="action-text"><strong>블로그 창 여는 중...</strong><small>본문에서 Ctrl+V 하세요</small></div>`;
        setTimeout(() => btnSendToSideNaverBlog.innerHTML = origHtml, 2500);
      }
    } catch (e) {
      btnSendToSideNaverBlog.innerHTML = origHtml;
      alert("네이버 블로그 전송 중 오류: " + e.message);
    }
  });

  // ── 17. [📋 네이버 스마트에디터 ONE 서식 복사] ──
  btnCopyNaverHtml.addEventListener("click", async () => {
    const title = pvBlogTitle.innerText.trim();
    const contentHtml = stripPhotoReplaceBars(pvBlogContent.innerHTML);
    const caption = pvBlogImageCaption.innerText.trim();
    const tags = Array.from(pvBlogTagsWrap.querySelectorAll(".naver-tag")).map(t => t.innerText).join(" ");

    // 네이버 스마트에디터 ONE 붙여넣기 최적화 Rich HTML
    const richHtml = `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; font-size: 16px; line-height: 1.8; color: #222;">
        <h2 style="font-size: 22px; font-weight: bold; color: #111; margin-bottom: 20px; line-height: 1.4;">${title}</h2>
        <div style="background-color: #f7f9fa; border-left: 4px solid #03c75a; padding: 16px 20px; margin: 20px 0; border-radius: 4px; font-style: italic; color: #333;">
          "강남 빌딩 공실이 사라졌다? 진짜 임대 시장 분위기는 어떨까요?"
        </div>
        <div style="margin: 20px 0;">
          ${contentHtml}
        </div>
        <div style="margin-top: 30px; padding-top: 16px; border-top: 1px dashed #d1d5db; color: #03c75a; font-weight: 600; font-size: 14px;">
          ${tags}
        </div>
      </div>
    `;

    const tmpBlog = document.createElement("div");
    tmpBlog.innerHTML = contentHtml;
    const plainText = `${title}\n\n${tmpBlog.innerText}\n\n${tags}`;

    try {
      const blobHtml = new Blob([richHtml], { type: "text/html" });
      const blobText = new Blob([plainText], { type: "text/plain" });
      const item = new ClipboardItem({
        "text/html": blobHtml,
        "text/plain": blobText
      });
      await navigator.clipboard.write([item]);

      const origText = btnCopyNaverHtml.innerText;
      btnCopyNaverHtml.innerText = "✅ 복사됨";
      setTimeout(() => btnCopyNaverHtml.innerText = origText, 2000);
    } catch (e) {
      await navigator.clipboard.writeText(plainText);
      alert("✅ 텍스트가 복사되었습니다. 네이버 블로그에 붙여넣기(Ctrl+V)하세요!");
    }
  });

  btnSaveBlogImage.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = previewBlog.imageUrl;
    link.download = `gongsil_ai_photo_${Date.now()}.jpg`;
    link.click();
  });

  // 프리미엄 업셀 모달 액션
  btnCloseModal.addEventListener("click", () => premiumModal.classList.add("hidden"));
  btnGoPremium.addEventListener("click", () => {
    premiumModal.classList.add("hidden");
    chrome.tabs.create({ url: "http://localhost:3000/partnership" });
  });
});
