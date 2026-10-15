// 크롬 확장의 프롬프트·답변 해석 파일을 앱으로 복사한다.
// 원본은 확장 쪽 하나다. 프롬프트를 고칠 때는 확장 파일을 고치고 이 스크립트로 다시 복사한다.
//   node scripts/sync-ext.mjs   (npm run dist 가 빌드 전에 자동으로 부른다)
//  - 공실뉴스(매물) : gongsilwriter30/shared → src/ext
//  - 뉴스칼럼       : newsmaker10/shared     → src/ext/newsmaker  (같은 이름이라도 내용이 달라 폴더를 나눈다)
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extRoot = join(root, "..", "chrome-extension");

function copy(fromDir, toDir, files) {
  mkdirSync(toDir, { recursive: true });
  for (const f of files) {
    copyFileSync(join(fromDir, f), join(toDir, f));
    console.log("복사:", join(toDir, f).slice(root.length + 1));
  }
}

const from = join(extRoot, "gongsilwriter30", "shared");
const to = join(root, "src", "ext");
copy(from, to, ["blog-prompt.js", "article-json.js", "naver-blog.js", "prompt.js", "sns-prompt.js", "youtube-json.js", "youtube-prompt.js"]);
// 네이버 글쓰기 화면에 넣어 실행하는 코드 (확장의 content script 그대로)
copy(join(from, ".."), to, ["content-naver.js"]);

copy(join(extRoot, "newsmaker10", "shared"), join(to, "newsmaker"), [
  "sections.js", "market-prompt.js", "prompt.js", "blog-prompt.js", "sns-prompt.js",
  "naver-blog.js", "article-json.js", "youtube-json.js", "youtube-prompt.js", "news-extract.js",
]);
