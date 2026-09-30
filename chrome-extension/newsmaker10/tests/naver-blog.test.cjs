const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  HOME_URL,
  WRITE_URL,
  isNaverBlogUrl,
  isLikelyWriteUrl,
  selectLikelyWriteTab,
} = require("../shared/naver-blog.js");

test("네이버 블로그 홈과 글쓰기 주소를 제공한다", () => {
  assert.equal(HOME_URL, "https://blog.naver.com/");
  assert.equal(WRITE_URL, "https://blog.naver.com/GoBlogWrite.naver");
});

test("네이버 블로그 주소만 허용한다", () => {
  assert.equal(isNaverBlogUrl("https://blog.naver.com/myblog"), true);
  assert.equal(isNaverBlogUrl("https://blog.editor.naver.com/editor"), true);
  assert.equal(isNaverBlogUrl("https://example.com/GoBlogWrite.naver"), false);
});

test("일반 블로그와 글쓰기 화면을 구분한다", () => {
  assert.equal(isLikelyWriteUrl("https://blog.naver.com/myblog"), false);
  assert.equal(isLikelyWriteUrl("https://blog.naver.com/GoBlogWrite.naver"), true);
  assert.equal(isLikelyWriteUrl("https://blog.naver.com/PostWriteForm.naver?blogId=test"), true);
  assert.equal(isLikelyWriteUrl("https://blog.naver.com/myblog?Redirect=Write&"), true);
});

test("활성 글쓰기 탭을 우선한다", () => {
  const url = "https://blog.naver.com/GoBlogWrite.naver";
  const selected = selectLikelyWriteTab([
    { id: 1, url, active: false, lastAccessed: 20 },
    { id: 2, url, active: true, lastAccessed: 10 },
  ]);
  assert.equal(selected.id, 2);
});

test("네이버 편집기 스크립트를 모든 프레임에 연결한다", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));
  const naverScript = manifest.content_scripts.find((item) => item.js?.includes("content-naver.js"));

  assert.ok(manifest.permissions.includes("webNavigation"));
  assert.equal(naverScript.all_frames, true);
  assert.equal(naverScript.match_about_blank, true);
});

const SAMPLE_BODY = "첫 문단 요약입니다. 둘째 문장.\n■ 배경 <강조>\n셋째 문단입니다. 다음 문장.\n■ 영향\n다섯째 문단";
const NEWS_SOURCE = {
  mode: "news",
  news: {
    title: "내년부터 청약 기준 달라진다",
    publisher: "연합뉴스",
    publishedAt: "2026-09-28T09:00:00+09:00",
    url: "https://www.yna.co.kr/view/AKR2026",
  },
};

const BLANK = "<p><br></p>";

test("기본형: 사진이 끼어들 때만 글을 끊고, 요약 인용구·구분선·소제목을 넣는다 (매물표 없음)", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const media = [
    { url: "a", isCover: false, insertAfterParagraph: 1 },
    { url: "cover", isCover: true },
  ];
  const blocks = buildNaverBlocks(SAMPLE_BODY, media, { design: "basic", source: NEWS_SOURCE });

  assert.deepEqual(blocks.map((block) => block.type), ["image", "html", "image", "html"]);
  assert.equal(blocks[0].mediaIndex, 1);
  assert.equal(blocks[2].mediaIndex, 0);
  assert.equal(blocks[1].html, "<blockquote><p>첫 문단 요약입니다. 둘째 문장.</p></blockquote>" + BLANK);
  const rest = blocks[3].html;
  assert.ok(!rest.includes("<table>"), "뉴스메이커는 매물표를 넣지 않는다");
  assert.ok(rest.startsWith("<hr>"), "도입 뒤 구분선");
  assert.ok(rest.includes('<p><span style="font-size:19px;font-weight:700">■ 배경 &lt;강조&gt;</span></p><p>셋째 문단'));
  assert.ok(!rest.includes("<b>■"));
});

test("문단 뒤에는 빈 줄을 두고, 모든 조각은 빈 문단으로 끝난다", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const blocks = buildNaverBlocks(SAMPLE_BODY, [{ url: "a", insertAfterParagraph: 3 }], { design: "basic" });
  const htmlBlocks = blocks.filter((block) => block.type === "html");
  assert.ok(htmlBlocks.length >= 2);
  htmlBlocks.forEach((block) => assert.ok(block.html.endsWith(BLANK), "조각 끝이 빈 문단이 아니면 다음 조각이 이어 붙는다"));
  assert.ok(htmlBlocks[0].html.includes("<p>셋째 문단입니다. 다음 문장.</p>" + BLANK));
});

test("사진이 소제목 바로 뒤에 오면 그 소제목의 첫 문단 뒤로 넘긴다", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const blocks = buildNaverBlocks(SAMPLE_BODY, [{ url: "a", insertAfterParagraph: 2 }], { design: "qna" });
  const imageAt = blocks.findIndex((block) => block.type === "image");
  const before = blocks[imageAt - 1].html;
  assert.ok(before.endsWith("셋째 문단입니다. 다음 문장.</p>" + BLANK), "사진 바로 앞은 소제목이 아니라 그 첫 문단");
});

test("사진이 없으면 글 전체가 한 조각이다", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const blocks = buildNaverBlocks("가\n\n나", []);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "html");
});

test("매거진형: 제목·번호 소제목(연주황 배경)·가운데 정렬·핵심 문장 인용구", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const [block] = buildNaverBlocks(SAMPLE_BODY, [], { design: "magazine", title: "청약 기준" });
  assert.ok(block.html.startsWith('<p style="text-align:center"><span style="font-size:24px;font-weight:700">청약 기준</span></p>'));
  assert.ok(block.html.includes(">01</span></p><p") && block.html.includes(">02<"), "번호와 소제목은 붙인다");
  assert.ok(block.html.includes('<span style="font-size:19px;background-color:#ffedd5;font-weight:700">배경 &lt;강조&gt;</span>'));
  assert.ok(block.html.indexOf("<blockquote><p>셋째 문단입니다.</p></blockquote>") < block.html.indexOf("영향"));
});

test("Q&A형: 소제목은 Q., 뒤 첫 문단은 A. (주황)", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const [block] = buildNaverBlocks(SAMPLE_BODY, [], { design: "qna" });
  assert.ok(block.html.includes("Q. 배경 &lt;강조&gt;"));
  assert.ok(block.html.includes('<p><span style="color:#ea7a00">A.</span> 셋째 문단입니다. 다음 문장.</p>'));
  assert.ok(block.html.includes('<p><span style="color:#ea7a00">A.</span> 다섯째 문단</p>'));
});

test("뉴스기사형: 큰 리드문, 대표사진 설명, 공실뉴스 서명", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const blocks = buildNaverBlocks(SAMPLE_BODY, [{ url: "c", isCover: true, caption: "현장 전경" }], { design: "news" });
  const text = blocks.filter((block) => block.type === "html").map((block) => block.html).join("");
  assert.ok(text.startsWith('<p style="text-align:center"><span style="font-size:13px;color:#888888">현장 전경</span></p>'));
  assert.ok(text.includes('<p><span style="font-size:17px;font-weight:700">첫 문단 요약입니다. 둘째 문장.</span></p>'));
  assert.ok(text.includes("공실뉴스 · gongsilnews.com"));
});

test("지정한 문단 뒤 사진 위치를 지키고 남는 사진은 글 끝에 둔다", () => {
  const { layoutMediaSlots } = require("../shared/naver-blog.js");
  const slots = layoutMediaSlots(3, [
    { url: "cover", isCover: true },
    { url: "fixed", insertAfterParagraph: 1 },
    { url: "auto1" },
    { url: "auto2" },
  ]);
  assert.deepEqual(slots.map((slot) => slot.map((item) => item.media.url)), [[], ["fixed"], ["auto1"], ["auto2"]]);
});

test("태그는 #과 공백을 빼고 중복 없이 30개까지 만든다", () => {
  const { normalizeTags } = require("../shared/naver-blog.js");
  assert.deepEqual(normalizeTags(["#청약", "청약", "청약 기준", "", null]), ["청약", "청약기준"]);
  assert.equal(normalizeTags(Array.from({ length: 40 }, (_, i) => `태그${i}`)).length, 30);
});

test("뉴스를 소재로 썼으면 모든 디자인 끝에 참고 자료(언론사·제목·날짜·원문 링크)를 넣는다", () => {
  const { buildNaverBlocks, DESIGNS } = require("../shared/naver-blog.js");
  for (const design of Object.keys(DESIGNS)) {
    const html = buildNaverBlocks(SAMPLE_BODY, [], { design, source: NEWS_SOURCE }).map((b) => b.html || "").join("");
    assert.ok(html.includes("[참고 자료]"), design);
    assert.ok(html.includes("연합뉴스 「내년부터 청약 기준 달라진다」 (2026.09.28)"), design);
    assert.ok(html.includes('<a href="https://www.yna.co.kr/view/AKR2026">▶ 원문 기사 보기</a>'), design);
    assert.ok(html.includes("공실뉴스 · gongsilnews.com"), design);
  }
});

test("주제로 썼으면 참고 자료를 붙이지 않고, http 주소가 아니면 링크를 넣지 않는다", () => {
  const { buildNaverBlocks, sourceBlockLines } = require("../shared/naver-blog.js");
  const topic = buildNaverBlocks(SAMPLE_BODY, [], { source: { mode: "topic", topic: { subject: "이사 체크리스트" } } })[0].html;
  assert.ok(!topic.includes("[참고 자료]"));
  assert.ok(!topic.includes("<a "));
  const noLink = sourceBlockLines({ mode: "news", news: { title: "t", publisher: "p", url: "javascript:alert(1)" } });
  assert.equal(noLink.url, "");
});
