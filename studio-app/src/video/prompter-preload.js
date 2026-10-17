// 녹화 중 프롬프터 창 — 읽을 대본·글자 크기·빠르기를 받아 오고, 닫기만 앱에 알린다
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("prompter", {
  init: () => ipcRenderer.invoke("prompter:init"),
  close: () => ipcRenderer.send("prompter:close"),
});
