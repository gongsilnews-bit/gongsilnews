/* 도우미 단추를 누르면 — 공실스튜디오 앱이 켜져 있는지 보여 준다 */
chrome.runtime.sendMessage({ type: "GS_PING" }, (r) => {
  const st = document.getElementById("st");
  const ok = !chrome.runtime.lastError && r && r.ok;
  st.textContent = ok ? "● 공실스튜디오 앱과 연결됐어요" : "공실스튜디오 앱이 꺼져 있어요. 앱을 켜 주세요.";
  st.className = "st " + (ok ? "ok" : "no");
});
