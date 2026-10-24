// 화면캡처·녹화 작은 창들(막대·고르기·알림·녹화) — 앱(snap.js)과 주고받는 통로
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("snap", {
  init: () => ipcRenderer.invoke("snap:init"),
  cmd: (c, a) => ipcRenderer.invoke("snap:cmd", c, a),
  on: (ch, fn) => {
    if (!/^snap:(state|rec-stop)$/.test(ch)) return;
    ipcRenderer.on(ch, (_e, v) => fn(v));
  },
});
