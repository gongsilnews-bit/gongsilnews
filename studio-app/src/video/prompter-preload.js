// 녹화 중 프롬프터 창 — 읽을 대본·글자 크기·빠르기를 받아 오고, 닫기만 앱에 알린다
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("prompter", {
  init: () => ipcRenderer.invoke("prompter:init"),
  close: () => ipcRenderer.send("prompter:close"),
  opacity: (v) => ipcRenderer.send("prompter:opacity", v), // 창 투명도 (0.3~1)
  min: () => ipcRenderer.send("prompter:min"),
  max: () => ipcRenderer.invoke("prompter:max"), // 크게/원래대로 → 지금 크게인지
  prefs: (o) => ipcRenderer.send("prompter:prefs", o), // 바꾼 빠르기·글자 크기·내 빠르기 → 녹화 창이 기억
  dragStart: () => ipcRenderer.send("prompter:drag-start"),
  drag: (dx, dy) => ipcRenderer.send("prompter:drag", dx, dy),
});
