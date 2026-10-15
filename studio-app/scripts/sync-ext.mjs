// 크롬 확장의 프롬프트·답변 해석·채우기 파일을 "서버" 코드로 묶는다 (2026-10-15 보안 결정).
// 설치 파일(EXE)에는 넣지 않는다. 앱은 로그인한 뒤 /api/studio/prompts 에서 받아 메모리에만 둔다 (studio-app/src/ext.js).
// 원본은 확장 쪽 하나다. 프롬프트를 고칠 때는 확장 파일을 고치고 이 스크립트를 돌린 뒤 웹을 배포한다.
//   node scripts/sync-ext.mjs   (npm run dist 도 빌드 전에 부른다)
//  - gongsil/…   : 기사작성기 gongsilwriter30/shared (+ content-naver.js)
//  - newsmaker/… : 뉴스메이커 newsmaker10/shared
//  - interior/… · remodel/… : 인테리어 interior10/shared · 리모델링 remodeling10/shared
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extRoot = join(root, "..", "chrome-extension");
const out = join(root, "..", "src", "app", "api", "studio", "prompts", "bundle.generated.ts");

const GROUPS = {
  gongsil: {
    dir: join(extRoot, "gongsilwriter30", "shared"),
    files: ["prompt.js", "blog-prompt.js", "article-json.js", "naver-blog.js", "sns-prompt.js", "youtube-json.js", "youtube-prompt.js", "../content-naver.js"],
  },
  // 인테리어뉴스(interior10) · 리모델링뉴스(remodeling10) — 시뮬레이션 + 결과표로 쓰는 기사·블로그·SNS·대본 (유료 전용)
  interior: {
    dir: join(extRoot, "interior10", "shared"),
    files: ["interior-spec.js", "interior-cost.js", "prompt.js", "interior-prompt.js", "article-json.js", "blog-prompt.js", "naver-blog.js", "youtube-prompt.js", "youtube-json.js", "sns-prompt.js", "interior-sheet.js"],
  },
  remodel: {
    dir: join(extRoot, "remodeling10", "shared"),
    files: ["remodel-spec.js", "remodel-cost.js", "prompt.js", "remodel-prompt.js", "article-json.js", "blog-prompt.js", "naver-blog.js", "youtube-prompt.js", "youtube-json.js", "sns-prompt.js", "remodel-sheet.js"],
  },
  // 공실마케팅 AI 채우기 (AI 매물보고서 · AI 유리창홍보지) — 확장이 아니라 저장소 marketing/shared
  marketing: {
    dir: join(root, "..", "marketing", "shared"),
    files: ["marketing-prompt.js"],
  },
  // 영상 편집기 — 대본·숏폼 구간 지시문 (studio-app/prompts, 설치 파일에는 넣지 않음)
  video: {
    dir: join(root, "prompts"),
    files: ["video-script.js"],
  },
  newsmaker: {
    dir: join(extRoot, "newsmaker10", "shared"),
    files: ["sections.js", "market-prompt.js", "prompt.js", "blog-prompt.js", "sns-prompt.js", "naver-blog.js", "article-json.js", "youtube-json.js", "youtube-prompt.js", "news-extract.js"],
  },
};

// ai/… : AI 사이트에서 글 넣기·보내기·답 읽기 (기사작성기와 같은 코드를 앱이 페이지 안 전용 공간에서 돌린다)
GROUPS.ai = { dir: join(extRoot, "gongsilwriter30", "shared"), files: ["config.js", "ui.js", "article-json.js", "ai-common.js"] };

const files = {};
for (const [group, { dir, files: list }] of Object.entries(GROUPS)) {
  for (const f of list) {
    const name = `${group}/${f.replace("../", "")}`;
    files[name] = readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n");
    console.log("묶음:", name);
  }
}
const version = createHash("sha256").update(JSON.stringify(files)).digest("hex").slice(0, 12);

writeFileSync(
  out,
  `// 자동 생성 파일 — 고치지 마세요. 원본: chrome-extension/*/shared, 만들기: node studio-app/scripts/sync-ext.mjs
// 공실뉴스 스튜디오 앱이 로그인 뒤 /api/studio/prompts 로 받아 메모리에만 두는 확장 파일 묶음 (서버 전용)
export const STUDIO_EXT_VERSION = ${JSON.stringify(version)};
export const STUDIO_EXT_FILES: Record<string, string> = ${JSON.stringify(files, null, 1)};
`
);
console.log(`→ ${out.slice(root.length - "studio-app".length)} (${Object.keys(files).length}개, 버전 ${version})`);
