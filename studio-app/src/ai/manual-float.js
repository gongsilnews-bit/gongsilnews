// 내 계정(수동) 으로 AI 를 쓰는 동안 — 크롬이 앱을 덮어도 앱이 기다리는 게 보이게 (2026-11-03 사장님: "크롬이 앱 위에 떠야 하는데 앱이 없어지는 경향")
//  화면 오른쪽 아래 작은 창 (늘 맨 위): "○○ 답을 기다리는 중" · [복사한 답 가져오기] · [앱으로] · [그만두기]
//  답을 가져오면 작은 창을 닫고 앱 창을 맨 앞으로.
const { BrowserWindow, screen } = require("electron");

let float = null;
let onAct = null;

const mainWin = () => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w !== float && /공실마케팅/.test(w.getTitle()) && w.isVisible?.() !== false && w.getBounds().width > 600);

/** 앱 창을 맨 앞으로 — 윈도우는 뒤에 있는 창이 앞으로 못 나오게 막아서, 잠깐 맨 위로 올렸다 푼다 */
function bringAppFront() {
  const w = mainWin();
  if (!w) return;
  if (w.isMinimized()) w.restore();
  w.show();
  w.setAlwaysOnTop(true);
  w.focus();
  setTimeout(() => { if (!w.isDestroyed()) w.setAlwaysOnTop(false); }, 300);
}

const html = (name, msg) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;font-family:"Pretendard","Malgun Gothic",sans-serif}
body{margin:0;background:#fff;color:#1f2937;border:1px solid #d9dde3;border-radius:10px;overflow:hidden;-webkit-user-select:none}
.top{display:flex;align-items:center;gap:8px;padding:10px 12px 6px;font-size:13.5px;font-weight:800;color:#1e3a6e;-webkit-app-region:drag}
.dots{display:inline-flex;gap:4px}.dots i{width:6px;height:6px;border-radius:50%;background:#1e3a6e;animation:d 1.2s infinite ease-in-out}
.dots i:nth-child(2){animation-delay:.18s}.dots i:nth-child(3){animation-delay:.36s}
@keyframes d{0%,80%,100%{opacity:.25}40%{opacity:1}}
.msg{padding:0 12px 8px;font-size:12px;color:#6b7280;line-height:1.5}
.row{display:flex;gap:6px;padding:0 12px 11px}
button{flex:1;height:30px;border-radius:5px;border:1px solid #d9dde3;background:#fff;color:#374151;font-size:12px;font-weight:700;cursor:pointer}
button.p{background:#1e3a6e;border-color:#1e3a6e;color:#fff}
</style></head><body>
<div class="top"><span class="dots"><i></i><i></i><i></i></span>공실마케팅이 ${name} 답을 기다리는 중</div>
<div class="msg">${msg || "답이 다 나오면 답 아래 복사 단추를 누르세요 — 앱이 알아서 가져와요."}</div>
<div class="row"><button class="p" onclick="document.title='act:paste'">복사한 답 가져오기</button><button onclick="document.title='act:app'">앱으로</button><button onclick="document.title='act:stop'">그만두기</button></div>
</body></html>`;

/** 작은 창 띄우기 — act(paste|stop) 는 부르는 쪽(manual.js)이 처리 */
function show(name, act) {
  onAct = act;
  const wa = screen.getPrimaryDisplay().workArea;
  const W = 360, H = 118;
  if (!float || float.isDestroyed()) {
    float = new BrowserWindow({
      width: W, height: H, x: wa.x + wa.width - W - 16, y: wa.y + wa.height - H - 16,
      frame: false, resizable: false, minimizable: false, maximizable: false, skipTaskbar: true, alwaysOnTop: true, focusable: true,
      transparent: false, backgroundColor: "#ffffff", title: "공실마케팅 AI 기다리는 중", show: false,
      webPreferences: { sandbox: true },
    });
    float.setAlwaysOnTop(true, "floating");
    float.webContents.on("page-title-updated", (e, title) => {
      e.preventDefault();
      const m = /^act:(\w+)/.exec(title);
      if (!m) return;
      if (m[1] === "app") bringAppFront();
      else if (onAct) onAct(m[1]);
      float.webContents.executeJavaScript("document.title=''").catch(() => {});
    });
  }
  void float.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html(name))}`);
  float.showInactive(); // 크롬이 앞에 나오는 것을 막지 않게 — 포커스는 가져가지 않는다
}

function setMsg(name, msg) {
  if (!float || float.isDestroyed()) return;
  void float.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html(name, msg))}`);
}

function close() {
  onAct = null;
  if (float && !float.isDestroyed()) float.destroy();
  float = null;
}

module.exports = { show, setMsg, close, bringAppFront };
