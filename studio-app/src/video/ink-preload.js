// 판서 판 · 판서 도구 막대 — 앱(ink.js)과 주고받는 통로
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ink", {
  init: () => ipcRenderer.invoke("ink:init"),
  set: (patch) => ipcRenderer.send("ink:set", patch), // { tool, color, board }
  cmd: (c) => ipcRenderer.send("ink:cmd", c), // off · undo · clear
  on: (ch, fn) => {
    if (!/^ink:(state|prefs|cursor|cmd)$/.test(ch)) return;
    ipcRenderer.on(ch, (_e, v) => fn(v));
  },
});
