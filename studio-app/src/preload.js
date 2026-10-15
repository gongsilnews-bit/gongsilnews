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
    ai: {
      list: () => ipcRenderer.invoke("studio:ai-list"),
      connect: (id) => ipcRenderer.invoke("studio:ai-connect", id),
      check: (id) => ipcRenderer.invoke("studio:ai-check", id),
      finishLogin: () => ipcRenderer.invoke("studio:ai-finish-login"),
      onProgress: (fn) => ipcRenderer.on("studio:ai-progress", (_e, text) => fn(text)),
    },
  });
}
