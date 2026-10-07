// 공실 릴스 렌더용 Vercel Sandbox 스냅샷을 만든다 (한 번 실행, 도구 버전을 올릴 때만 다시 실행).
//
//   node scripts/reels/build-sandbox-snapshot.mjs
//
// 결과로 나온 snapshotId 를 Vercel 환경변수 REELS_SANDBOX_SNAPSHOT_ID 에 넣는다.
// 인증: 로컬에서는 `vercel link` 후 .env.local 의 VERCEL_OIDC_TOKEN 을 쓴다 (12시간 유효).
//
// 스냅샷에 들어가는 것: ffmpeg, unzip, 크롬 실행 라이브러리, hyperframes CLI + 크롬,
// /vercel/reel-assets (Pretendard Bold, Pixabay 효과음, 배경음악). 렌더 때는 HTML·사진·성우만 보낸다.
import { Sandbox } from "@vercel/sandbox";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const HYPERFRAMES_VERSION = "0.8.134";
const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const ASSETS = join(ROOT, "scripts/reels/sandbox-assets");

if (!process.env.VERCEL_OIDC_TOKEN) {
  const line = readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/).find((l) => l.startsWith("VERCEL_OIDC_TOKEN="));
  if (!line) throw new Error("VERCEL_OIDC_TOKEN 이 없습니다. `npx vercel link` 를 먼저 실행하세요.");
  process.env.VERCEL_OIDC_TOKEN = line.slice("VERCEL_OIDC_TOKEN=".length).replace(/^"|"$/g, "");
}

const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

// 오래 걸리는 명령은 분리 실행 후 완료 표시 파일을 짧게 확인한다 (긴 HTTP 연결이 끊기는 문제 회피)
async function runLong(sb, label, script, { sudo = false } = {}) {
  const id = label.replace(/[^a-z0-9]/gi, "_");
  await sb.runCommand({ cmd: "bash", args: ["-lc", `( ${script} ) > /tmp/${id}.log 2>&1; echo $? > /tmp/${id}.done`], detached: true, sudo });
  const start = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    const code = (await (await sb.runCommand("bash", ["-lc", `cat /tmp/${id}.done 2>/dev/null`])).stdout()).trim();
    if (code !== "") {
      const tail = await (await sb.runCommand("bash", ["-lc", `tail -c 800 /tmp/${id}.log`])).stdout();
      if (code !== "0") throw new Error(`${label} 실패:\n${tail}`);
      log(`${label} 완료 (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      return tail;
    }
    if (Date.now() - start > 10 * 60 * 1000) throw new Error(`${label} 시간 초과`);
  }
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

const sb = await Sandbox.create({ image: "vercel/sandbox/node:24", resources: { vcpus: 8 }, timeout: 20 * 60 * 1000 });
log(`샌드박스 기동 (${sb.vcpus} vCPU, ${sb.memory}MB)`);
try {
  // Ubuntu 이미지: unzip 이 없으면 `hyperframes browser ensure` 가 압축 해제에서 멈춘다
  await runLong(sb, "apt", [
    "export DEBIAN_FRONTEND=noninteractive",
    "apt-get update -qq",
    "apt-get install -y -qq --no-install-recommends unzip ffmpeg libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libxfixes3 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 fonts-dejavu-core",
  ].join(" && "), { sudo: true });
  await runLong(sb, "hyperframes", `npm i -g hyperframes@${HYPERFRAMES_VERSION} --no-audit --no-fund && (hyperframes telemetry disable || true)`, { sudo: true });
  await runLong(sb, "chrome", "hyperframes browser ensure && hyperframes browser path");

  await sb.writeFiles(listFiles(ASSETS).map((p) => ({ path: `/vercel/reel-assets/${relative(ASSETS, p).replace(/\\/g, "/")}`, content: readFileSync(p) })));
  log("에셋 업로드 완료");

  const snap = await sb.snapshot({ expiration: 0 });
  log(`스냅샷 생성: ${snap.snapshotId} (${(snap.sizeBytes / 1e6).toFixed(0)}MB, 만료 없음)`);
  console.log(`\nREELS_SANDBOX_SNAPSHOT_ID=${snap.snapshotId}`);
} finally {
  await sb.stop().catch(() => {});
}
