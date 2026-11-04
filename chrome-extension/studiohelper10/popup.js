/* 도우미 단추를 누르면 — 공실마케팅 앱이 켜져 있는지 보여 준다 */
chrome.runtime.sendMessage({ type: "GS_PING" }, (r) => {
  const st = document.getElementById("st");
  const ok = !chrome.runtime.lastError && r && r.ok;
  st.textContent = ok ? "● 공실마케팅 앱과 연결됐어요" : "앱은 꺼져 있어요. 공실뉴스 웹에서는 그대로 쓸 수 있어요.";
  st.className = "st " + (ok ? "ok" : "no");
});
