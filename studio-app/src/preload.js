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
    vacancy: {
      analyze: (vacancyId) => ipcRenderer.invoke("studio:vacancy-analyze", vacancyId),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:vacancy-progress", h);
        return () => ipcRenderer.removeListener("studio:vacancy-progress", h);
      },
    },
    naver: {
      designs: () => ipcRenderer.invoke("studio:naver-designs"),
      fill: (opts) => ipcRenderer.invoke("studio:naver-fill", opts),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:naver-progress", h);
        return () => ipcRenderer.removeListener("studio:naver-progress", h);
      },
    },
    blog: {
      styles: () => ipcRenderer.invoke("studio:blog-styles"),
      write: (opts) => ipcRenderer.invoke("studio:blog-write", opts),
      onProgress: (fn) => {
        const h = (_e, text) => fn(text);
        ipcRenderer.on("studio:blog-progress", h);
        return () => ipcRenderer.removeListener("studio:blog-progress", h);
      },
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
