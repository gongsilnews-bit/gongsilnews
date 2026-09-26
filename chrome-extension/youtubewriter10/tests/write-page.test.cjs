const test = require("node:test");
const assert = require("node:assert/strict");

const { isNewArticleWriteUrl, selectWriteTab } = require("../shared/write-page.js");

test("회원별 신규 기사쓰기 화면을 인식한다", () => {
  for (const path of ["admin", "realty_admin", "user_admin"]) {
    assert.equal(
      isNewArticleWriteUrl(`https://gongsilnews.com/${path}?menu=article&action=write&vacancy_id=v1`),
      true
    );
  }
});

test("기존 기사 편집 화면과 공용 진입 주소는 제외한다", () => {
  assert.equal(
    isNewArticleWriteUrl("https://gongsilnews.com/admin?menu=article&action=write&id=article-1"),
    false
  );
  assert.equal(isNewArticleWriteUrl("https://gongsilnews.com/article/write?vacancy_id=v1"), false);
  assert.equal(isNewArticleWriteUrl("https://example.com/admin?menu=article&action=write"), false);
});

test("현재 창에서 활성 탭을 우선하고 아니면 가장 최근 탭을 고른다", () => {
  const url = "https://gongsilnews.com/user_admin?menu=article&action=write";
  assert.equal(
    selectWriteTab([
      { id: 1, url, active: false, lastAccessed: 20 },
      { id: 2, url, active: true, lastAccessed: 10 },
    ]).id,
    2
  );
  assert.equal(
    selectWriteTab([
      { id: 1, url, active: false, lastAccessed: 10 },
      { id: 2, url, active: false, lastAccessed: 20 },
    ]).id,
    2
  );
});
