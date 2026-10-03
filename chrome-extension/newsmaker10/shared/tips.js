/* ══════════════════════════════════════════════════════════════
   버튼 설명 말풍선 — 마우스를 올리면 바로 "무엇을 하는지 · 언제 누르는지"를 보여 준다.

   설명은 아래 TIPS 에 모아 둔다 (선택자 → 문장). 여기 없는 버튼은
   원래 붙어 있던 title 을 말풍선으로 보여 준다 (브라우저 기본 설명은 늦게·작게 떠서).
   ══════════════════════════════════════════════════════════════ */
(function () {
  const TIPS = {
    /* 상단 */
    "#tabWork": "1단계 — 뉴스를 가져오거나 주제를 정리해 AI에게 기사를 쓰게 합니다.",
    "#tabDraft": "2단계 — AI가 쓴 기사를 확인·수정하고 공실뉴스로 보냅니다.",
    "#tabBlog": "3단계 — 완성된 기사를 바탕으로 네이버 블로그 글을 만듭니다.",
    "#tabScript": "4단계 — 같은 내용으로 유튜브 영상 대본을 만듭니다.",

    /* 1단계 */
    "#btnGrabNews": "지금 열어 둔 탭의 뉴스 기사 한 건에서 제목·본문을 읽어 옵니다. 뉴스 기사 화면을 먼저 띄워 두세요.",
    "#btnFetchUrl": "입력한 뉴스 주소에서 제목·본문을 읽어 옵니다.",
    "#btnAddPoint": "본론 칸을 하나 더 추가합니다.",
    '[data-platform="chatgpt"]': "ChatGPT로 기사를 씁니다. chatgpt.com 에 로그인되어 있어야 합니다.",
    '[data-platform="gemini"]': "Gemini로 기사를 씁니다. gemini.google.com 에 로그인되어 있어야 합니다.",
    "#btnOpenAi": "AI(ChatGPT·Gemini) 탭을 열고 기사 요청 문장을 자동으로 채웁니다. 다음은 [② 작성하기]입니다.",
    "#btnSubmit": "AI 창에 채워 둔 요청을 전송합니다. AI가 기사를 다 쓸 때까지 1~2분 기다린 뒤 [③ 초안 보내기]를 누르세요.",
    "#btnPullDraft": "AI가 다 쓴 기사를 이 작업창으로 가져옵니다. AI 답변이 끝까지 나온 뒤에 누르세요.",
    "#btnPasteDraft": "자동으로 못 가져왔을 때 — AI 답변을 직접 복사해 붙여 넣고 누르면 초안이 만들어집니다.",

    /* 2단계 */
    "#btnRevise": "왼쪽 칸에 적은 고칠 점을 같은 AI 대화에 보냅니다. 답이 끝나면 고친 글을 자동으로 가져옵니다.",
    "#btnPullRevised": "수정 요청 후 AI 답변이 끝났는데 글이 바뀌지 않았다면 눌러서 고친 글을 가져옵니다.",
    '.image-opts-toggle[data-target="imageOpts"]': "AI 이미지 스타일과 설명 칸을 펼칩니다. 스타일을 고르고 [AI 이미지 만들기]를 누르세요.",
    "#btnChangeImage": "본문에서 사진을 넣을 위치를 먼저 클릭한 뒤 누르면, 내 PC의 사진을 그 자리에 넣습니다.",
    "#btnMakeImage": "고른 스타일과 설명대로 AI가 기사용 이미지를 만듭니다. 설명을 비워 두면 기사 내용에서 알아서 고릅니다.",
    ".btn-article-shortcut": "공실뉴스 새 기사쓰기 화면을 새 탭으로 엽니다. 로그인한 뒤 [기사전송하기]를 누르세요.",
    "#btnSendGongsil": "완성된 제목·본문·사진을 열어 둔 공실뉴스 새 기사쓰기 화면에 채웁니다. 먼저 [기사작성 바로가기]로 그 화면을 열어 두세요.",

    /* 3단계 */
    "#btnMakeBlogDraft": "고른 블로그 스타일과 길이로 AI에게 블로그 글을 요청합니다. 다 쓰면 [완성 글 가져오기]를 누르세요.",
    "#btnPullBlogDraft": "AI가 다 쓴 블로그 제목과 본문을 이 탭으로 가져옵니다. AI 답변이 끝까지 나온 뒤에 누르세요.",
    "#btnReviseBlog": "왼쪽 칸에 적은 고칠 점을 AI에 보내 블로그 글을 고칩니다. 답이 끝나면 자동으로 가져옵니다.",
    "#btnPullBlogRevised": "수정 요청 후 글이 바뀌지 않았다면 눌러서 고친 블로그 글을 가져옵니다.",
    '.image-opts-toggle[data-target="blogImageOpts"]': "블로그용 AI 이미지 스타일과 설명 칸을 펼칩니다.",
    "#btnInsertBlogImage": "본문에서 위치를 먼저 클릭한 뒤 누르면, 내 PC의 사진을 그 자리에 넣습니다.",
    "#btnMakeBlogImage": "고른 스타일과 설명대로 AI가 블로그용 이미지를 만듭니다.",
    "[data-blog-design]": "네이버 블로그에 보낼 때의 글 꾸밈 모양입니다. 전송하기 전에 고르세요.",
    ".btn-blog-link": "네이버 블로그를 새 탭으로 엽니다. 글쓰기 화면을 열어 둔 뒤 [블로그글 전송하기]를 누르세요.",
    "#btnSendNaver": "제목과 본문을 열어 둔 네이버 블로그 글쓰기 화면에 채웁니다. 먼저 글쓰기 화면을 열어 두세요.",

    /* 4단계 */
    "#btnMakeScript": "2단계에서 쓴 AI에 새 대화로 유튜브 대본을 요청합니다. 다 쓰면 [완성 대본 가져오기]를 누르세요.",
    "#btnPullScript": "AI가 다 쓴 대본을 이 탭으로 가져옵니다. AI 답변이 끝까지 나온 뒤에 누르세요.",
    "#btnYtPaste": "자동으로 못 가져왔을 때 — AI 답변을 직접 붙여 넣고 누르면 대본이 만들어집니다.",
    "#btnReviseScript": "왼쪽 칸에 적은 고칠 점을 AI에 보내 대본을 고칩니다.",
    "#btnPullScriptRevised": "수정 요청 후 대본이 바뀌지 않았다면 눌러서 고친 대본을 가져옵니다.",
    "#btnCopyNarration": "대본(내레이션) 전체를 복사합니다.",
    "#btnDownloadNarration": "대본을 메모장(.txt) 파일로 내려받습니다.",
  };

  const tip = document.createElement("div");
  tip.className = "gw-tip hidden";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);

  let timer = 0;
  let current = null;

  function textFor(node) {
    /* 기본 title 은 말풍선으로 옮긴다 (브라우저 설명과 겹쳐 뜨지 않게) */
    if (node.title) { node.dataset.tip = node.title; node.removeAttribute("title"); }
    for (const sel in TIPS) if (node.matches(sel)) return TIPS[sel];
    return node.dataset.tip || "";
  }

  function show(node, text) {
    tip.textContent = text;
    tip.classList.remove("hidden", "below");
    const r = node.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    let top = r.top - h - 8;
    if (top < 8) { top = r.bottom + 8; tip.classList.add("below"); }
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  function hide() {
    clearTimeout(timer);
    tip.classList.add("hidden");
    current = null;
  }

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch" || !(e.target instanceof Element)) return;
    const node = e.target.closest("button, a, .chip, .choice, .blog-style-card");
    if (!node || node === current) return;
    const text = textFor(node);
    if (!text) { hide(); return; }
    current = node;
    clearTimeout(timer);
    timer = setTimeout(() => show(node, text), 250);
  });
  document.addEventListener("pointerout", (e) => {
    if (current && !(e.relatedTarget instanceof Node && current.contains(e.relatedTarget))) hide();
  });
  document.addEventListener("pointerdown", hide, true);
  document.addEventListener("scroll", hide, true);
})();
