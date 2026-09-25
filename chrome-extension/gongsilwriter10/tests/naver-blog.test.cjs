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

const SAMPLE_BODY = "첫 문단 요약입니다. 둘째 문장.\n■ 입지 <강조>\n셋째 문단입니다. 다음 문장.\n■ 가격\n다섯째 문단";
const SAMPLE_VACANCY = {
  priceText: "매매 15억",
  url: "https://gongsilnews.com/gongsil?id=1",
  fields: [
    { label: "전용면적", value: "84㎡" },
    { label: "담당자", value: "홍길동" },
    { label: "방/욕실수", value: "3개 / 2개" },
  ],
};

const BLANK = "<p><br></p>";

test("기본형: 사진이 끼어들 때만 글을 끊고, 요약 인용구·표·구분선·소제목을 넣는다", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const media = [
    { url: "a", isCover: false, insertAfterParagraph: 1 },
    { url: "cover", isCover: true },
  ];
  const blocks = buildNaverBlocks(SAMPLE_BODY, media, { design: "basic", vacancy: SAMPLE_VACANCY });

  assert.deepEqual(blocks.map((block) => block.type), ["image", "html", "image", "html"]);
  assert.equal(blocks[0].mediaIndex, 1);
  assert.equal(blocks[2].mediaIndex, 0);
  assert.equal(blocks[1].html, "<blockquote><p>첫 문단 요약입니다. 둘째 문장.</p></blockquote>" + BLANK);
  const rest = blocks[3].html;
  assert.ok(rest.startsWith("<table><tbody><tr><td><b>전용면적</b></td><td>84㎡</td></tr>"), "출처 정보가 없으면 필수 항목 순서대로");
  assert.ok(!rest.includes("담당자"), "표에는 표시·광고 필수 항목만 넣는다");
  assert.ok(rest.indexOf("<table>") < rest.indexOf("<hr>") && rest.indexOf("<hr>") < rest.indexOf("■ 입지"));
  // 굵게 태그는 네이버가 무시하므로 크기로 강조하고, 소제목 바로 아래 문단과는 붙인다
  assert.ok(rest.includes('<p><span style="font-size:19px;font-weight:700">■ 입지 &lt;강조&gt;</span></p><p>셋째 문단'));
  assert.ok(!rest.includes("<b>■"));
  assert.ok(rest.includes('<a href="https://gongsilnews.com/gongsil?id=1">'), "고정 상세 주소가 없으면 처음 본 공실뉴스 주소");
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
  // insertAfterParagraph 2 = 둘째 문단(■ 입지) 뒤 → 셋째 문단 뒤로
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

test("매거진형: 제목·번호 소제목·가운데 정렬·핵심 문장 인용구", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const [block] = buildNaverBlocks(SAMPLE_BODY, [], { design: "magazine", title: "아크로힐스", vacancy: SAMPLE_VACANCY });
  assert.ok(block.html.startsWith('<p style="text-align:center"><span style="font-size:24px;font-weight:700">아크로힐스</span></p>'));
  assert.ok(block.html.includes(">01</span></p><p") && block.html.includes(">02<"), "번호와 소제목은 붙인다");
  // 첫 소제목 구간의 첫 문장을 두 번째 소제목 앞에 인용구로
  assert.ok(block.html.indexOf("<blockquote><p>셋째 문단입니다.</p></blockquote>") < block.html.indexOf("가격"));
  assert.ok(block.html.lastIndexOf("<table>") > block.html.indexOf("가격"), "표는 글 끝에 둔다");
});

test("Q&A형: 소제목은 Q., 뒤 첫 문단은 A.", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const [block] = buildNaverBlocks(SAMPLE_BODY, [], { design: "qna" });
  assert.ok(block.html.includes("Q. 입지 &lt;강조&gt;"));
  assert.ok(block.html.includes('<p><span style="color:#2563eb">A.</span> 셋째 문단입니다. 다음 문장.</p>'));
  assert.ok(block.html.includes('<p><span style="color:#2563eb">A.</span> 다섯째 문단</p>'));
});

test("뉴스기사형: 큰 리드문, 대표사진 설명, 공실뉴스 서명", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const blocks = buildNaverBlocks(SAMPLE_BODY, [{ url: "c", isCover: true, caption: "현장 전경" }], { design: "news" });
  const text = blocks.filter((block) => block.type === "html").map((block) => block.html).join("");
  assert.ok(text.startsWith('<p style="text-align:center"><span style="font-size:13px;color:#888888">현장 전경</span></p>'));
  assert.ok(text.includes('<p><span style="font-size:17px;font-weight:700">첫 문단 요약입니다. 둘째 문장.</span></p>'));
  assert.ok(text.includes("공실뉴스 · gongsilnews.com"));
});

test("공실뉴스 주소가 아니면 링크를 넣지 않는다", () => {
  const { buildNaverBlocks } = require("../shared/naver-blog.js");
  const [block] = buildNaverBlocks(SAMPLE_BODY, [], { vacancy: { url: "http://localhost/gongsil?id=1" } });
  assert.ok(!block.html.includes("<a "));
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

const SAMPLE_LISTING = {
  detailUrl: "https://gongsilnews.com/gongsil/detail/aa1c",
  location: "서울 강남구 논현동",
  propertyType: "아파트",
  tradeType: "매매",
  capturedAt: "2026-09-25T03:00:00Z",
  owner: { type: "agency", name: "강남나라공인중개사", ceo: "김나라", regNo: "11680-2020-00001", address: "서울 강남구 논현동 1", phone: "02-000-0000" },
};

test("매물표는 소재지·매물종류·거래형태부터 필수 항목 순서로, 개수 제한 없이", () => {
  const { factRows } = require("../shared/naver-blog.js");
  const fields = ["금액", "관리비", "공급/전용면적", "해당층/총층", "방/욕실수", "방향", "준공연도", "주차가능 여부", "입주가능일", "담당자"]
    .map((label) => ({ label, value: `${label}값` }));
  const rows = factRows({ fields }, SAMPLE_LISTING);
  assert.deepEqual(rows.map(([label]) => label), [
    "소재지", "매물종류", "거래형태", "금액", "관리비", "공급/전용면적", "해당층/총층",
    "방/욕실수", "방향", "준공연도", "주차가능 여부", "입주가능일",
  ]);
});

test("모든 디자인 끝에 매물 정보 출처(중개사무소)와 고정 상세 링크를 넣는다", () => {
  const { buildNaverBlocks, DESIGNS } = require("../shared/naver-blog.js");
  for (const design of Object.keys(DESIGNS)) {
    const html = buildNaverBlocks(SAMPLE_BODY, [], { design, listing: SAMPLE_LISTING }).map((b) => b.html || "").join("");
    assert.ok(html.includes("[매물 정보 출처]"), design);
    assert.ok(html.includes("공실뉴스 매물 등록 정보 (2026.09.25 기준)"), design);
    assert.ok(html.includes("등록 중개사무소: 강남나라공인중개사 | 대표 김나라"), design);
    assert.ok(html.includes("등록번호 11680-2020-00001 | 서울 강남구 논현동 1"), design);
    assert.ok(html.includes("전화 02-000-0000"), design);
    assert.ok(html.includes('<a href="https://gongsilnews.com/gongsil/detail/aa1c">'), design);
    assert.ok(!/문의는|문의하세요/.test(html), `${design}: 문의 유도 문구 없음`);
  }
});

test("표시·광고 필수 정보가 빠지면 무엇이 빠졌는지 알려 준다", () => {
  const { listingProblems } = require("../shared/naver-blog.js");
  assert.deepEqual(listingProblems(null), ["매물 출처 정보(중개사무소)"]);
  assert.deepEqual(listingProblems(SAMPLE_LISTING), []);
  assert.deepEqual(listingProblems({ owner: { type: "agency", name: "A", ceo: "", regNo: "1", address: "x", phone: "" } }), ["대표자", "연락처"]);
  assert.deepEqual(listingProblems({ owner: { type: "general", name: "홍길동" } }), [], "일반회원 매물은 이름만");
});
