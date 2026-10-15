// 개발용: 로컬 개발 서버(localhost:3000)에 붙는 개발판 앱을 지정한 회원으로 로그인시켜 띄운다.
//   node scripts/dev-connect.mjs <회원 이메일>
// 실제 서비스의 "클릭 한 번 연결"과 같은 연결 신호(src/utils/studioConnect.ts)를 만들어
// 실행 인자(gongsilstudio://connect?code=…)로 넘긴다. 키는 ../.env.local 에서 읽는다.
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);
const email = process.argv[2];
if (!email) throw new Error("사용법: node scripts/dev-connect.mjs <회원 이메일>");

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "magiclink", email }),
});
const link = await res.json();
const tokenHash = link.hashed_token || link.properties?.hashed_token;
const userId = link.id || link.user?.id || "";
if (!tokenHash) throw new Error("연결 신호를 만들지 못함: " + JSON.stringify(link).slice(0, 200));

// studioConnect.ts sealStudioCode 와 같은 방식
const k = createHash("sha256").update(`gongsil-studio-connect:${key}`).digest();
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", k, iv);
const body = Buffer.concat([cipher.update(JSON.stringify({ th: tokenHash, uid: userId, exp: Date.now() + 5 * 60 * 1000 }), "utf8"), cipher.final()]);
const code = Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");

// --print: 앱을 띄우지 않고 연결 주소만 찍는다 (자동 시험용)
// (process.exit 로 끝내면 윈도우 Node 24 에서 libuv 오류가 나서 분기로 끝낸다)
if (process.argv.includes("--print")) {
  console.log(`gongsilstudio://connect?code=${code}`);
} else {
  const electron = join(root, "node_modules", "electron", "dist", "electron.exe");
  const childEnv = { ...process.env, STUDIO_BASE_URL: process.env.STUDIO_BASE_URL || "http://localhost:3000" };
  delete childEnv.ELECTRON_RUN_AS_NODE;
  spawn(electron, [root, `gongsilstudio://connect?code=${code}`], { env: childEnv, detached: true, stdio: "ignore" }).unref();
  console.log(`개발판 앱을 ${childEnv.STUDIO_BASE_URL} 에 ${email} 로 띄웠습니다.`);
}
