// 앱 화면(connect.html, ai.html)과 공실뉴스 사이트에만 좁게 열어 둔다
// 앱 창은 다른 사이트로 넘어가지 않지만(외부 링크는 평소 브라우저), 혹시 모를 경우를 막는다.
const { contextBridge, ipcRenderer } = require("electron");

const baseOrigin = ipcRenderer.sendSync("studio:base-origin");
const allowed = location.protocol === "file:" || location.origin === baseOrigin;

if (allowed) {
  contextBridge.exposeInMainWorld("gongsilStudio", {
    openConnect: () => ipcRenderer.invoke("studio:open-connect"),
    info: () => ipcRenderer.invoke("studio:info"),
    openAiConnect: () => ipcRenderer.invoke("studio:open-ai-window"),
    openInBrowser: (url) => ipcRenderer.invoke("studio:open-external", url),
    vacancy: {
      analyze: (vacancyId) => ipcRenderer.invoke("studio:vacancy-analyze", vacancyId),
      load: (vacancyId) => ipcRenderer.invoke("studio:vacancy-load", vacancyId),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:vacancy-progress", h);
        return () => ipcRenderer.removeListener("studio:vacancy-progress", h);
      },
    },
    sns: {
      channels: () => ipcRenderer.invoke("studio:sns-channels"),
      get: (vacancyId) => ipcRenderer.invoke("studio:sns-get", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:sns-write", opts),
      save: (opts) => ipcRenderer.invoke("studio:sns-save", opts),
      revise: (opts) => ipcRenderer.invoke("studio:sns-revise", opts),
      exportChannel: (opts) => ipcRenderer.invoke("studio:sns-export", opts),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:sns-progress", h);
        return () => ipcRenderer.removeListener("studio:sns-progress", h);
      },
    },
    naver: {
      designs: () => ipcRenderer.invoke("studio:naver-designs"),
      fill: (opts) => ipcRenderer.invoke("studio:naver-fill", opts),
      openMyBlog: () => ipcRenderer.invoke("studio:naver-open-blog"),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:naver-progress", h);
        return () => ipcRenderer.removeListener("studio:naver-progress", h);
      },
    },
    article: {
      options: (vacancyId) => ipcRenderer.invoke("studio:article-options", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:article-write", opts),
      exportDraft: (vacancyId) => ipcRenderer.invoke("studio:article-export", vacancyId),
    },
    blog: {
      styles: (vacancyId) => ipcRenderer.invoke("studio:blog-styles", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:blog-write", opts),
      get: (vacancyId, doc) => ipcRenderer.invoke("studio:blog-get", vacancyId, doc),
      save: (patch) => ipcRenderer.invoke("studio:blog-save", patch),
      revise: (opts) => ipcRenderer.invoke("studio:blog-revise", opts),
      addPhoto: (opts) => ipcRenderer.invoke("studio:blog-add-photo", opts),
      imageStyles: (vacancyId) => ipcRenderer.invoke("studio:blog-image-styles", vacancyId),
      makeImage: (opts) => ipcRenderer.invoke("studio:blog-make-image", opts),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:blog-progress", h);
        return () => ipcRenderer.removeListener("studio:blog-progress", h);
      },
    },
    marketing: {
      fill: (opts) => ipcRenderer.invoke("studio:marketing-fill", opts),
      /** 그림·PDF 를 문서\공실뉴스 스튜디오\<매물>\<sub>\ 에 저장하고 탐색기로 보여 준다 */
      saveFile: (opts) => ipcRenderer.invoke("studio:save-file", opts),
      openFolder: () => ipcRenderer.invoke("studio:open-out-folder"),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:marketing-progress", h);
        return () => ipcRenderer.removeListener("studio:marketing-progress", h);
      },
    },
    sim: {
      options: (kind) => ipcRenderer.invoke("studio:sim-options", kind),
      estimate: (kind, costBase, design) => ipcRenderer.invoke("studio:sim-estimate", kind, costBase, design),
      create: (kind) => ipcRenderer.invoke("studio:sim-create", kind),
      get: (id) => ipcRenderer.invoke("studio:sim-get", id),
      list: (kind) => ipcRenderer.invoke("studio:sim-list", kind),
      useVacancy: (opts) => ipcRenderer.invoke("studio:sim-use-vacancy", opts),
      addPhotos: (opts) => ipcRenderer.invoke("studio:sim-add-photos", opts),
      update: (opts) => ipcRenderer.invoke("studio:sim-update", opts),
      run: (id) => ipcRenderer.invoke("studio:sim-run", id),
      exportResult: (opts) => ipcRenderer.invoke("studio:sim-export", opts),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:sim-progress", h);
        return () => ipcRenderer.removeListener("studio:sim-progress", h);
      },
    },
    youtube: {
      options: (vacancyId) => ipcRenderer.invoke("studio:youtube-options", vacancyId),
      get: (vacancyId) => ipcRenderer.invoke("studio:youtube-get", vacancyId),
      write: (opts) => ipcRenderer.invoke("studio:youtube-write", opts),
      revise: (opts) => ipcRenderer.invoke("studio:youtube-revise", opts),
      save: (opts) => ipcRenderer.invoke("studio:youtube-save", opts),
      exportText: (vacancyId) => ipcRenderer.invoke("studio:youtube-export", vacancyId),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:youtube-progress", h);
        return () => ipcRenderer.removeListener("studio:youtube-progress", h);
      },
    },
    column: {
      fetchNews: (url) => ipcRenderer.invoke("studio:column-fetch-news", url),
      openNews: () => ipcRenderer.invoke("studio:column-open-news"),
      grabNews: () => ipcRenderer.invoke("studio:column-grab-news"),
      create: (source) => ipcRenderer.invoke("studio:column-create", source),
      get: (id) => ipcRenderer.invoke("studio:column-get", id),
      list: () => ipcRenderer.invoke("studio:column-list"),
    },
    /* 영상 편집기 (동영상제작) — PC 파일은 studio-media:// 주소로 바로 재생 */
    video: {
      lib: {
        list: (opts) => ipcRenderer.invoke("video:lib-list", opts),
        pick: (opts) => ipcRenderer.invoke("video:lib-pick", opts),
        fav: (id, fav) => ipcRenderer.invoke("video:lib-fav", id, fav),
        remove: (id) => ipcRenderer.invoke("video:lib-remove", id),
        folders: () => ipcRenderer.invoke("video:lib-folders"),
        addFolder: () => ipcRenderer.invoke("video:lib-add-folder"),
        removeFolder: (dir) => ipcRenderer.invoke("video:lib-remove-folder", dir),
      },
      project: {
        create: (opts) => ipcRenderer.invoke("video:project-create", opts),
        open: (dir) => ipcRenderer.invoke("video:project-open", dir),
        openPick: () => ipcRenderer.invoke("video:project-open-pick"),
        save: (p) => ipcRenderer.invoke("video:project-save", p),
        recent: () => ipcRenderer.invoke("video:project-recent"),
        addAsset: (libId) => ipcRenderer.invoke("video:project-add-asset", libId),
        exportText: (p, kind) => ipcRenderer.invoke("video:project-export-text", p, kind),
      },
      voice: (dir, text, voiceId) => ipcRenderer.invoke("video:voice", dir, text, voiceId),
      transcribe: (p, assetId) => ipcRenderer.invoke("video:transcribe", p, assetId),
      ai: {
        script: (opts) => ipcRenderer.invoke("video:ai-script", opts),
        scenes: (lines) => ipcRenderer.invoke("video:ai-scenes", lines),
        shorts: (clips, opts) => ipcRenderer.invoke("video:ai-shorts", clips, opts),
        image: (dir, prompt) => ipcRenderer.invoke("video:ai-image", dir, prompt),
      },
      vacancy: (vacancyId) => ipcRenderer.invoke("video:vacancy", vacancyId),
      stock: {
        search: (q, type, orientation, page) => ipcRenderer.invoke("video:stock-search", q, type, orientation, page),
        get: (dir, item) => ipcRenderer.invoke("video:stock-get", dir, item),
      },
      render: (p, opts) => ipcRenderer.invoke("video:render", p, opts),
      renderCancel: (id) => ipcRenderer.invoke("video:render-cancel", id),
      exportAudio: (p, kind) => ipcRenderer.invoke("video:export-audio", p, kind),
      snapshot: (p, file, at) => ipcRenderer.invoke("video:snapshot", p, file, at),
      record: {
        sources: () => ipcRenderer.invoke("video:record-sources"),
        choose: (id) => ipcRenderer.invoke("video:record-choose", id),
        start: (name) => ipcRenderer.invoke("video:record-start", name),
        chunk: (token, buf) => ipcRenderer.invoke("video:record-chunk", token, buf),
        stop: (token) => ipcRenderer.invoke("video:record-stop", token),
      },
      showFile: (file) => ipcRenderer.invoke("video:show-file", file),
      openPath: (p) => ipcRenderer.invoke("video:open-path", p),
      onProgress: (fn) => {
        const h = (_e, text, frac) => fn(text, frac);
        ipcRenderer.on("video:progress", h);
        return () => ipcRenderer.removeListener("video:progress", h);
      },
      onRender: (fn) => {
        const h = (_e, text, frac) => fn(text, frac);
        const j = (_e, id) => fn("", 0, id);
        ipcRenderer.on("video:render-progress", h);
        ipcRenderer.on("video:render-job", j);
        return () => {
          ipcRenderer.removeListener("video:render-progress", h);
          ipcRenderer.removeListener("video:render-job", j);
        };
      },
    },
    ai: {
      list: () => ipcRenderer.invoke("studio:ai-list"),
      connect: (id) => ipcRenderer.invoke("studio:ai-connect", id),
      check: (id) => ipcRenderer.invoke("studio:ai-check", id),
      finishLogin: () => ipcRenderer.invoke("studio:ai-finish-login"),
      /** 기본 글쓰기 AI 고르기 (chatgpt | gemini) */
      setWriter: (id) => ipcRenderer.invoke("studio:ai-set-writer", id),
      /** 지금 새 글을 쓸 AI { id, name } */
      writer: () => ipcRenderer.invoke("studio:ai-writer"),
      /** 기본 이미지 생성 AI 고르기 (chatgpt | gemini) · 지금 그림을 그릴 AI { id, name } */
      setImager: (id) => ipcRenderer.invoke("studio:ai-set-imager", id),
      imager: () => ipcRenderer.invoke("studio:ai-imager"),
      onWriterChanged: (fn) => {
        const h = () => fn();
        ipcRenderer.on("studio:ai-writer-changed", h);
        return () => ipcRenderer.removeListener("studio:ai-writer-changed", h);
      },
      onProgress: (fn) => ipcRenderer.on("studio:ai-progress", (_e, text) => fn(text)),
    },
  });
}
