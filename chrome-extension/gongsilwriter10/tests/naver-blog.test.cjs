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

test("본문을 붙여넣을 조각으로 나누고 사진이 끼어들 때만 글을 끊는다", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const body = "첫 문단\n■ 소제목 <강조>\n셋째 문단\n넷째 문단";
  const media = [
    { url: "a", isCover: false },
    { url: "cover", isCover: true },
  ];
  const blocks = buildNaverBlocks(body, media);

  assert.deepEqual(blocks, [
    { type: "image", mediaIndex: 1 },
    { type: "html", html: "<p>첫 문단</p><p><b>■ 소제목 &lt;강조&gt;</b></p>" },
    { type: "image", mediaIndex: 0 },
    { type: "html", html: "<p>셋째 문단</p><p>넷째 문단</p>" },
  ]);
});

test("사진이 없으면 본문 전체가 한 조각이다", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  assert.deepEqual(buildNaverBlocks("가\n\n나", []), [{ type: "html", html: "<p>가</p><p>나</p>" }]);
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
  assert.deepEqual(normalizeTags(["#논현동", "논현동", "강남 아파트", "", null]), ["논현동", "강남아파트"]);
  assert.equal(normalizeTags(Array.from({ length: 40 }, (_, i) => `태그${i}`)).length, 30);
});
