// 녹화 중 작은 막대 창 — 녹화 끝내기·크게 보기만 앱에 알린다
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mini", {
  stop: () => ipcRenderer.send("record-mini:stop"),
  expand: () => ipcRenderer.send("record-mini:expand"),
});
