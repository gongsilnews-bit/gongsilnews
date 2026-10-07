// AI HTML 변환기가 쓰는 Tailwind 기본 CSS를 TS 문자열 모듈로 만든다.
// tailwindcss 버전을 올린 뒤 한 번 다시 실행: node scripts/gen-ai-html-tailwind.cjs
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "node_modules/tailwindcss/index.css"), "utf8");
const { version } = require(path.join(root, "node_modules/tailwindcss/package.json"));
const out = `// 자동 생성 파일 (scripts/gen-ai-html-tailwind.cjs) — tailwindcss ${version}\n` +
  `export const TAILWIND_INDEX_CSS = ${JSON.stringify(css)};\n`;
fs.writeFileSync(path.join(root, "src/utils/aiHtml/tailwindIndexCss.ts"), out);
console.log("written", css.length, "chars");
