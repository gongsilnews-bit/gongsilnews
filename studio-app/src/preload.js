// 앱 화면(connect.html 등)이 쓸 수 있는 기능만 좁게 열어 둔다
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gongsilStudio", {
  openConnect: () => ipcRenderer.invoke("studio:open-connect"),
  info: () => ipcRenderer.invoke("studio:info"),
});
