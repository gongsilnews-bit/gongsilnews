/*
 * 공실뉴스 회원 매뉴얼 공통 스크립트.
 *
 * 각 매뉴얼 폴더의 toc.js 가 window.MANUAL 에 목차를 적어 두면, 이 파일이
 * 왼쪽 목차·검색·완료 체크·이전/다음·사진 크게 보기를 그린다.
 * 페이지 파일에는 본문(<main class="m-doc">)만 쓴다. 목차를 페이지마다 복사하지 않는다.
 */
(function () {
  var cfg = window.MANUAL;
  if (!cfg) return;
  var pageId = document.body.getAttribute("data-page") || "index";
  var embed = /[?&]embed=1/.test(location.search);
  if (embed) document.body.classList.add("embed");

  var flat = [];
  cfg.groups.forEach(function (g) { g.pages.forEach(function (p) { p.group = g.title; flat.push(p); }); });
  var idx = flat.findIndex(function (p) { return p.id === pageId; });
  var cur = flat[idx];
  var href = function (p) { return p.file + (embed ? "?embed=1" : ""); };

  // 완료 체크는 이 브라우저에만 남는다. 막혀 있어도 매뉴얼은 그대로 보인다.
  var KEY = "gongsil-manual-done:" + cfg.key;
  var done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { done = {}; }
  var saveDone = function () { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} };

  var el = function (tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  };

  // ── 왼쪽 목차 ──
  var side = el("aside", { class: "m-side" });
  side.appendChild(el("a", { class: "m-brand", href: "index.html" + (embed ? "?embed=1" : "") }, cfg.title + "<small>" + cfg.subtitle + "</small>"));
  var menuBtn = el("button", { class: "m-menu-btn", type: "button" }, "☰ 목차");
  menuBtn.onclick = function () { side.classList.toggle("open"); };
  side.insertBefore(menuBtn, side.firstChild);
  var toc = el("div", { class: "m-toc" });
  var search = el("input", { class: "m-search", type: "search", placeholder: "🔍 찾고 싶은 것 (예: 사진, 서류)" });
  toc.appendChild(search);
  var links = [];
  cfg.groups.forEach(function (g) {
    toc.appendChild(el("div", { class: "m-group" }, g.title));
    var ul = el("ul", { class: "m-nav" });
    g.pages.forEach(function (p, i) {
      var a = el("a", { href: href(p) }, '<span class="n">' + (done[p.id] ? "✓" : i + 1) + "</span><span>" + p.title + "</span>");
      a._num = i + 1;
      if (p.id === pageId) a.classList.add("on");
      if (done[p.id]) a.classList.add("done");
      a._text = (p.title + " " + (p.summary || "") + " " + (p.keywords || "")).toLowerCase();
      links.push(a);
      var li = el("li"); li.appendChild(a); ul.appendChild(li);
    });
    toc.appendChild(ul);
  });
  var empty = el("div", { class: "m-empty" }, "찾는 내용이 없습니다.");
  toc.appendChild(empty);
  search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase(), shown = 0;
    links.forEach(function (a) { var hit = !q || a._text.indexOf(q) >= 0; a.classList.toggle("hide", !hit); if (hit) shown++; });
    empty.style.display = shown ? "none" : "block";
  });
  side.appendChild(toc);

  // ── 본문을 틀 안으로 옮긴다 ──
  var doc = document.querySelector(".m-doc");
  var main = el("div", { class: "m-main" });
  var layout = el("div", { class: "m-layout" });
  if (cur) doc.insertBefore(el("div", { class: "m-crumb" }, cur.group + " › " + cur.title), doc.firstChild);
  main.appendChild(doc);
  layout.appendChild(side);
  layout.appendChild(main);
  document.body.appendChild(layout);

  // ── 완료 체크 + 이전/다음 ──
  if (cur) {
    var label = el("label", { class: "m-done" }, '<input type="checkbox"> 이 단계를 마쳤어요');
    var box = label.querySelector("input");
    box.checked = !!done[pageId];
    box.onchange = function () {
      if (box.checked) done[pageId] = 1; else delete done[pageId];
      saveDone();
      var a = links[idx]; a.classList.toggle("done", box.checked);
      a.querySelector(".n").textContent = box.checked ? "✓" : a._num;
    };
    doc.appendChild(label);
    var pager = el("nav", { class: "m-pager" });
    var prev = flat[idx - 1], next = flat[idx + 1];
    pager.appendChild(prev ? el("a", { href: href(prev) }, "<small>← 이전</small>" + prev.title) : el("span", { style: "flex:1" }));
    pager.appendChild(next ? el("a", { href: href(next), class: "next" }, "<small>다음 →</small>" + next.title) : el("span", { style: "flex:1" }));
    doc.appendChild(pager);
  }

  // ── 사진 크게 보기 ──
  var zoom = el("div", { class: "m-zoom" }, "<img alt=\"\">");
  zoom.onclick = function () { zoom.classList.remove("on"); };
  document.body.appendChild(zoom);
  document.querySelectorAll(".shot img").forEach(function (img) {
    img.loading = "lazy";
    img.onclick = function () { zoom.firstChild.src = img.src; zoom.firstChild.alt = img.alt; zoom.classList.add("on"); };
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") zoom.classList.remove("on"); });

  // 관리자 화면 안(iframe)에서: [바로 가기]는 바깥 화면을 옮기고, 매뉴얼 안 링크는 embed 를 이어 간다
  if (embed) {
    document.querySelectorAll("a.m-go").forEach(function (a) { a.target = "_top"; });
    document.querySelectorAll(".m-doc a[href$='.html']").forEach(function (a) { a.href = a.getAttribute("href") + "?embed=1"; });
  }
})();
