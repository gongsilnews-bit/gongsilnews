// 녹화 중 작은 막대 창 — 녹화 끝내기·크게 보기만 앱에 알린다
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mini", {
  stop: () => ipcRenderer.send("record-mini:stop"),
  expand: () => ipcRenderer.send("record-mini:expand"),
  mode: (m) => ipcRenderer.send("record-mini:mode", m), // 녹화 중 화면 바꾸기
  onMode: (fn) => ipcRenderer.on("mini:mode", (_e, m) => fn(m)),
});
