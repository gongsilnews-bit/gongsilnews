// 크롬 확장(gongsilwriter30)의 프롬프트·답변 해석 파일을 앱으로 복사한다.
// 원본은 확장 쪽 하나다. 프롬프트를 고칠 때는 확장 파일을 고치고 이 스크립트로 다시 복사한다.
//   node scripts/sync-ext.mjs   (npm run dist 가 빌드 전에 자동으로 부른다)
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "..", "chrome-extension", "gongsilwriter30", "shared");
const to = join(root, "src", "ext");
mkdirSync(to, { recursive: true });
for (const f of ["blog-prompt.js", "article-json.js", "naver-blog.js", "prompt.js", "sns-prompt.js", "youtube-json.js"]) {
  copyFileSync(join(from, f), join(to, f));
  console.log("복사:", f);
}
// 네이버 글쓰기 화면에 넣어 실행하는 코드 (확장의 content script 그대로)
copyFileSync(join(from, "..", "content-naver.js"), join(to, "content-naver.js"));
console.log("복사: content-naver.js");
