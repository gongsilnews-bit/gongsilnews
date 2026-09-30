#!/usr/bin/env node
/**
 * AI 개발실 Runner — 사장님 PC에서 켜 두는 프로그램.
 * 설계: docs/2026-09-30_ai_dev_room_local_agent_meeting.md
 *
 * 30초마다 공실뉴스에 새 작업을 묻고, 있으면
 *   작업 폴더(git worktree)에서 브랜치 만들기 → Claude Code로 수정 → npm run build 검증
 *   → commit → 브랜치 push → PR → 결과 보고
 * main 에는 절대 push 하지 않는다. 병합은 사장님 승인으로만.
 *
 * 실행: node scripts/devroom-runner/runner.mjs          (계속 실행)
 *       node scripts/devroom-runner/runner.mjs --once   (한 번만 확인하고 종료)
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RUNNER_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(RUNNER_DIR, ".work");
const STATE_FILE = path.join(WORK, "current.json");
const LOG_FILE = path.join(WORK, "runner.log");

loadEnv(path.join(RUNNER_DIR, ".env"));

const BASE_URL = (process.env.DEVROOM_BASE_URL || "https://www.gongsilnews.com").replace(/\/$/, "");
const TOKEN = process.env.DEVROOM_AGENT_TOKEN || "";
const REPO = path.resolve(process.env.DEVROOM_REPO || path.join(RUNNER_DIR, "..", ".."));
const WORKTREE = path.resolve(process.env.DEVROOM_WORKTREE || path.join(REPO, "..", "gongsilnews-devroom"));
const POLL_MS = Number(process.env.DEVROOM_POLL_SECONDS || 30) * 1000;
const GH_REPO = process.env.DEVROOM_GH_REPO || "gongsilnews-bit/gongsilnews";
const CLAUDE_CLI = process.env.CLAUDE_CLI
  || path.join(process.env.APPDATA || "", "npm", "node_modules", "@anthropic-ai", "claude-code", "cli.js");
const GH = process.env.GH_PATH || findGh();
// 속도 우선: 기본은 Sonnet. 더 꼼꼼하게 하려면 .env 에 CLAUDE_MODEL=opus
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "sonnet";
const CLAUDE_TIMEOUT_MS = 40 * 60 * 1000;
const BUILD_TIMEOUT_MS = 20 * 60 * 1000;
const PREVIEW_GIVE_UP_MS = 30 * 60 * 1000;

const ONCE = process.argv.includes("--once");

/** Vercel 미리보기 주소를 기다리는 작업들 (배포가 push 뒤 몇 분 걸린다) */
const pendingPreviews = [];

// ───────────────────────── 공통 ─────────────────────────

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function findGh() {
  const candidates = ["C:\\Program Files\\GitHub CLI\\gh.exe", "gh"];
  for (const c of candidates) {
    const r = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return "gh";
}

function log(msg) {
  const line = `[${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}] ${msg}`;
  console.log(line);
  fs.mkdirSync(WORK, { recursive: true });
  fs.appendFileSync(LOG_FILE, line + "\n");
}

/** 셸 없이 실행 (git, gh). 실패하면 예외 */
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: WORKTREE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(" ")} 실패\n${(r.stdout || "") + (r.stderr || "")}`.slice(-4000));
  }
  return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}
const git = (args, opts) => run("git", args, opts);
const gh = (args, opts) => run(GH, args, opts);

/** npm 은 Windows 에서 npm.cmd 라 셸로 실행한다 (인자는 고정 문자열만 넘긴다) */
function npm(args, timeout) {
  return new Promise((resolve) => {
    const child = spawn(`npm ${args}`, { cwd: WORKTREE, shell: true, env: process.env });
    let output = "";
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    const timer = setTimeout(() => { child.kill(); output += "\n[시간 초과로 중단]"; }, timeout);
    child.on("close", (code) => { clearTimeout(timer); resolve({ ok: code === 0, output }); });
  });
}

async function api(method, pathname, body) {
  const res = await fetch(BASE_URL + pathname, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${pathname} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const report = (id, body) => api("POST", `/api/devroom/tasks/${id}/result`, body);

// ───────────────────────── 작업 폴더 ─────────────────────────

/** 사장님 작업 폴더와 분리된 전용 작업 폴더를 준비한다 (처음 한 번 만들고 계속 재사용) */
async function prepareWorktree() {
  if (!fs.existsSync(path.join(WORKTREE, ".git"))) {
    log(`작업 폴더 생성: ${WORKTREE}`);
    run("git", ["fetch", "origin", "main"], { cwd: REPO });
    run("git", ["worktree", "add", "--detach", WORKTREE, "origin/main"], { cwd: REPO });
  }
  // 빌드에 필요한 환경변수 파일 (저장소에는 없다)
  const envSrc = path.join(REPO, ".env.local");
  if (fs.existsSync(envSrc)) fs.copyFileSync(envSrc, path.join(WORKTREE, ".env.local"));
}

/** package-lock.json 이 바뀌었을 때만 npm ci */
async function ensureDeps() {
  const lock = path.join(WORKTREE, "package-lock.json");
  const hash = createHash("sha1").update(fs.readFileSync(lock)).digest("hex");
  const mark = path.join(WORKTREE, "node_modules", ".devroom-lock-hash");
  if (fs.existsSync(mark) && fs.readFileSync(mark, "utf8") === hash) return;
  log("패키지 설치 중 (npm ci) — 처음에는 몇 분 걸립니다");
  const r = await npm("ci --no-audit --no-fund", BUILD_TIMEOUT_MS);
  if (!r.ok) throw new Error("npm ci 실패\n" + r.output.slice(-4000));
  fs.writeFileSync(mark, hash);
}

function checkoutBranch(branch, rework) {
  git(["fetch", "origin"]);
  git(["reset", "--hard"]);
  git(["clean", "-fd"]);
  const remoteExists = git(["rev-parse", "--verify", "--quiet", `origin/${branch}`], { allowFail: true }).ok;
  // 반려 후 재작업이면 올려 둔 브랜치 위에서 이어서, 아니면 최신 main 에서 새로 시작
  git(["checkout", "-B", branch, rework && remoteExists ? `origin/${branch}` : "origin/main"]);
  if (rework && remoteExists) {
    // 그사이 main 이 바뀌었으면 먼저 합친다. 충돌하면 최신 main 에서 새로 시작 (피드백은 지시서에 그대로 들어간다)
    const m = git(["merge", "--no-edit", "origin/main"], { allowFail: true });
    if (!m.ok) {
      git(["merge", "--abort"], { allowFail: true });
      git(["checkout", "-B", branch, "origin/main"]);
      log("  main 과 충돌해 최신 main 에서 새로 작업합니다");
    }
  }
}

async function downloadShots(task) {
  const dir = path.join(WORK, task.task_no);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const [i, url] of (task.attachment_urls || []).entries()) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const ext = (new URL(url).pathname.split(".").pop() || "png").toLowerCase();
    const file = path.join(dir, `screenshot-${i + 1}.${ext}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    files.push(file);
  }
  return { dir, files };
}

// ───────────────────────── Claude ─────────────────────────

const TYPE_LABEL = { bug: "오류수정", feature: "기능추가", design: "디자인수정", urgent: "긴급수정" };

function buildPrompt(task, shots) {
  const lines = [
    `작업번호: ${task.task_no}`,
    `종류: ${TYPE_LABEL[task.type] || task.type}`,
    `제목: ${task.title}`,
    ``,
    `문제/요청:`,
    task.description,
  ];
  if (task.page_url) lines.push(``, `관련 URL: ${task.page_url}`);
  if (task.repro_steps) lines.push(``, `재현 방법: ${task.repro_steps}`);
  if (shots.length) lines.push(``, `첨부 스크린샷 (Read 도구로 열어 볼 것):`, ...shots.map((f) => `- ${f}`));
  const convo = (task.messages || []).map((m) => `[${m.role === "admin" ? "사장님" : "에이전트"}] ${m.body}`);
  if (convo.length) lines.push(``, `지금까지의 대화 (오래된 순):`, ...convo);
  if (task.attempt > 1 && task.reject_reason) {
    lines.push(
      ``,
      `⚠️ 이번은 ${task.attempt}차 작업이다. 현재 브랜치에 이전 수정이 들어 있을 수 있다.`,
      `사장님의 최근 메시지: ${task.reject_reason}`,
      `이 메시지(질문에 대한 답이면 그 답)를 100% 반영해 작업한다.`,
    );
  }
  lines.push(
    ``,
    `작업 순서:`,
    `1. 관련 코드를 찾는다.`,
    `2. 원인을 분석한다.`,
    `3. 최소 범위로 수정한다. 요청과 관계없는 코드는 건드리지 않는다.`,
    `4. 기존 기능에 영향이 없는지 확인한다.`,
    `5. npm run build 를 실행해 통과시킨다.`,
    `6. 원인·변경 내용을 한국어로 요약해 보고한다.`,
    ``,
    `규칙:`,
    `- git commit, git push, 배포, DB 변경은 하지 않는다. (Runner 프로그램이 한다)`,
    `- 잘 모르겠으면 모르겠다고 솔직히 말한다. 요청이 모호하거나(예: 어떤 화면·버튼인지 불분명) 원인을 확신할 수 없으면`,
    `  추측으로 고치지 말고 changed=false 로 두고, question 에 사장님께 물어볼 것을 구체적으로 적는다.`,
    `  (예: "스크린샷의 위쪽 광고 바를 말씀하시는 건가요, 아래 메뉴 바를 말씀하시는 건가요?")`,
    `- 재현에 로그인·실데이터가 필요해 확인할 수 없는 경우도 마찬가지로 question 에 필요한 정보를 적는다.`,
    `- 보고는 사장님(비개발자)이 읽는다. 쉬운 한국어로 쓴다.`,
    `- 빠르게 끝낸다. 관련 없는 파일을 넓게 훑지 말고, 찾은 원인에 집중한다.`,
  );
  return lines.join("\n");
}

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    changed: { type: "boolean", description: "코드를 수정했으면 true, 원인 분석만 했으면 false" },
    cause: { type: "string", description: "원인 (쉬운 한국어)" },
    summary: { type: "string", description: "무엇을 어떻게 바꿨는지, 또는 왜 고치지 못했는지 (쉬운 한국어)" },
    question: { type: "string", description: "사장님께 물어볼 것. 확신이 없거나 정보가 부족할 때만 적고, 없으면 빈 문자열" },
  },
  required: ["changed", "cause", "summary"],
};

const ALLOWED_TOOLS = [
  "Read", "Edit", "Write", "Glob", "Grep",
  "Bash(npm run build)", "Bash(npm run lint *)", "Bash(npx tsc *)", "Bash(npx eslint *)",
  "Bash(git status *)", "Bash(git diff *)", "Bash(git log *)", "Bash(git show *)",
];

/** Claude 가 쓰는 도구 하나를 게시판에 보일 한 줄로 */
function describeTool(name, input = {}) {
  const rel = (p) => String(p || "").replace(WORKTREE, "").replace(/^[\\/]+/, "").replace(/\\/g, "/");
  switch (name) {
    case "Read": return /screenshot-\d/.test(input.file_path || "") ? "🖼️ 스크린샷 보는 중" : `📖 파일 보는 중: ${rel(input.file_path)}`;
    case "Grep": return `🔎 코드 검색: ${input.pattern}`;
    case "Glob": return `🔎 파일 찾기: ${input.pattern}`;
    case "Edit": case "Write": return `✏️ 수정: ${rel(input.file_path)}`;
    case "Bash": return /build/.test(input.command || "") ? "🔨 빌드로 확인 중" : `⚙️ 실행: ${input.command}`;
    default: return null;
  }
}

/**
 * Claude Code 를 화면 없이 실행한다. 도구를 쓸 때마다 진행 상황을 onProgress 로 알린다.
 * 결과는 RESULT_SCHEMA 모양으로 받는다.
 */
function runClaude(prompt, shotsDir, onProgress) {
  return new Promise((resolve) => {
    const args = [
      CLAUDE_CLI, "-p",
      "--output-format", "stream-json", "--verbose",
      "--permission-mode", "dontAsk",
      "--allowedTools", ALLOWED_TOOLS.join(","),
      "--add-dir", shotsDir,
      "--json-schema", JSON.stringify(RESULT_SCHEMA),
      "--no-session-persistence",
      "--model", CLAUDE_MODEL,
    ];
    const child = spawn(process.execPath, args, { cwd: WORKTREE, env: process.env });
    let buf = "", err = "", result = null, tail = [];
    child.stdout.on("data", (d) => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        tail.push(line); if (tail.length > 20) tail.shift();
        let ev;
        try { ev = JSON.parse(line); } catch { continue; }
        if (ev.type === "assistant") {
          for (const c of ev.message?.content || []) {
            if (c.type === "tool_use") {
              const text = describeTool(c.name, c.input);
              if (text) onProgress(text);
            } else if (c.type === "text" && c.text?.trim()) {
              onProgress("💭 " + c.text.trim().split("\n")[0].slice(0, 120));
            }
          }
        } else if (ev.type === "result") {
          result = ev;
        }
      }
    });
    child.stderr.on("data", (d) => { err += d; });
    const timer = setTimeout(() => { child.kill(); err += "\n[시간 초과로 중단]"; }, CLAUDE_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      let parsed = result?.structured_output || null;
      if (!parsed && typeof result?.result === "string") {
        try { parsed = JSON.parse(result.result.match(/\{[\s\S]*\}/)?.[0] || "null"); } catch { /* 실패 처리 */ }
      }
      resolve({ ok: code === 0 && !!parsed, result: parsed, raw: (tail.join("\n") + "\n" + err).slice(-8000) });
    });
    child.stdin.end(prompt);
  });
}

/** 진행 상황을 모아 몇 초마다 게시판에 보낸다 */
function progressReporter(taskId) {
  const all = [];
  let pending = [];
  let sending = Promise.resolve();
  const flush = () => {
    if (pending.length === 0) return sending;
    const lines = pending; pending = [];
    sending = sending.then(() => api("POST", `/api/devroom/tasks/${taskId}/progress`, { lines }).catch(() => {}));
    return sending;
  };
  const timer = setInterval(flush, 4000);
  return {
    add(text) {
      const line = `${new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit" })}  ${text}`;
      all.push(line); pending.push(line);
    },
    async stop() { clearInterval(timer); await flush(); },
    lines: all,
  };
}

const say = (taskId, body) => api("POST", `/api/devroom/tasks/${taskId}/messages`, { body }).catch(() => {});

// ───────────────────────── 작업 1건 처리 ─────────────────────────

async function handle(task) {
  const branch = `devroom/${task.task_no.toLowerCase()}`;
  const rework = task.attempt > 1;
  log(`▶ ${task.task_no} "${task.title}" (${task.attempt}차) 시작 → ${branch}`);
  fs.writeFileSync(STATE_FILE, JSON.stringify({ id: task.id, task_no: task.task_no }));

  const logs = [];
  const progress = progressReporter(task.id);
  const finalLog = (extra = "") => [progress.lines.join("\n"), ...logs, extra].filter(Boolean).join("\n\n");
  const fail = async (summary, extra = "", chat = summary) => {
    log(`✖ ${task.task_no} 실패: ${summary.split("\n")[0]}`);
    await progress.stop();
    await say(task.id, chat);
    await report(task.id, { status: "failed", branch, result_summary: summary, log: finalLog(extra) });
  };

  try {
    await say(task.id, rework
      ? `말씀하신 내용 반영해서 다시 작업을 시작합니다. (${task.attempt}차)`
      : `작업을 시작했습니다. 진행 상황은 위 "실시간 진행 상황"에서 보실 수 있어요.`);
    progress.add("🚀 작업 준비 (최신 코드 받는 중)");
    await prepareWorktree();
    checkoutBranch(branch, rework);
    await ensureDeps();
    const shots = await downloadShots(task);

    log(`  Claude 작업 중...`);
    progress.add(`🤖 AI 분석 시작 (${CLAUDE_MODEL})`);
    const ai = await runClaude(buildPrompt(task, shots.files), shots.dir, (t) => progress.add(t));
    if (!ai.ok) return await fail("AI 에이전트 실행에 실패했습니다.", ai.raw, "AI 에이전트 실행이 중간에 멈췄습니다. 잠시 뒤 메시지를 보내 주시면 다시 시도하겠습니다.");
    const { changed, cause, summary, question } = ai.result;
    const report_text = `원인: ${cause}\n\n${summary}`;

    const changedFiles = [
      ...git(["diff", "--name-only", "HEAD"]).out.split("\n"),
      ...git(["ls-files", "--others", "--exclude-standard"]).out.split("\n"),
    ].filter(Boolean);
    if (!changed || changedFiles.length === 0) {
      const q = (question || "").trim();
      return await fail(
        `${q ? "❓ 확인이 필요해 수정하지 않았습니다." : "수정하지 않았습니다 (원인 분석만)."}\n\n${report_text}${q ? `\n\n질문: ${q}` : ""}`,
        "",
        q
          ? `❓ 잘 모르겠어서 고치기 전에 여쭤봅니다.\n\n${q}\n\n(지금까지 파악한 것: ${cause})\n\n아래에 답을 적어 보내 주시면 그대로 반영해서 작업하겠습니다.`
          : `원인만 파악하고 수정은 하지 않았습니다.\n\n${report_text}\n\n더 알려주실 내용이 있으면 아래에 적어 주세요.`,
      );
    }

    log(`  빌드 검증 중 (npm run build)...`);
    progress.add("🔨 최종 빌드 검증 중");
    const build = await npm("run build", BUILD_TIMEOUT_MS);
    if (!build.ok) {
      return await fail(
        `수정은 했지만 빌드가 통과하지 않아 올리지 않았습니다.\n\n${report_text}`,
        "[빌드 로그]\n" + build.output.slice(-6000),
        `고치긴 했는데 빌드 검사에서 오류가 나서 올리지 않았습니다. "다시 해 줘"라고 보내 주시면 오류까지 고쳐서 다시 시도하겠습니다.`,
      );
    }
    progress.add("✅ 빌드 통과");

    git(["add", "-A"]);
    git(["commit", "-m", `fix(devroom): ${task.task_no} ${task.title}\n\n${report_text}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`]);
    const sha = git(["rev-parse", "HEAD"]).out;
    // devroom/ 브랜치는 Runner 전용이라 재작업 때 이력이 바뀌어도 덮어쓴다 (main 에는 push 하지 않음)
    git(["push", "--force-with-lease", "-u", "origin", branch]);
    log(`  push 완료 ${sha.slice(0, 8)}`);

    let prUrl = gh(["pr", "list", "--repo", GH_REPO, "--head", branch, "--state", "open", "--json", "url", "--jq", ".[0].url"], { allowFail: true }).out;
    if (!prUrl) {
      const body = `AI 개발실 ${task.task_no} (${task.attempt}차)\n\n## 요청\n${task.description}\n\n## 처리 결과\n${report_text}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
      const pr = gh(["pr", "create", "--repo", GH_REPO, "--base", "main", "--head", branch, "--title", `${task.task_no} ${task.title}`, "--body", body], { allowFail: true });
      prUrl = pr.ok ? pr.out.split("\n").pop() : "";
      if (!pr.ok) logs.push("[PR 생성 실패]\n" + pr.err);
    }

    progress.add("📤 GitHub 브랜치에 올림 · PR 준비");
    await progress.stop();
    await say(task.id,
      `다 고쳤습니다.\n\n${report_text}${(question || "").trim() ? `\n\n참고로 확인 부탁드릴 점: ${question.trim()}` : ""}\n\n` +
      `1~2분 뒤 "미리보기" 링크가 생기면 화면을 확인해 보시고, 괜찮으면 [승인], 고칠 점이 있으면 아래에 적어 주세요.`);
    await report(task.id, {
      status: "review", branch, commit_sha: sha, pr_url: prUrl || null,
      result_summary: report_text, changed_files: changedFiles,
      log: finalLog(),
    });
    pendingPreviews.push({ id: task.id, sha, since: Date.now() });
    log(`✔ ${task.task_no} 승인대기 ${prUrl}`);
  } catch (e) {
    await fail("Runner 처리 중 오류가 났습니다.", String(e?.stack || e), "작업 중 프로그램 오류가 났습니다. 메시지를 보내 주시면 다시 시도하겠습니다.")
      .catch((re) => log(`결과 보고 실패: ${re.message}`));
  } finally {
    fs.rmSync(STATE_FILE, { force: true });
  }
}

/** push 한 커밋의 Vercel 미리보기 주소를 GitHub 배포 기록에서 찾아 채운다 */
async function checkPreviews() {
  for (let i = pendingPreviews.length - 1; i >= 0; i--) {
    const p = pendingPreviews[i];
    const deps = gh(["api", `repos/${GH_REPO}/deployments?sha=${p.sha}`, "--jq", ".[].id"], { allowFail: true }).out.split("\n").filter(Boolean);
    let url = "";
    for (const d of deps) {
      url = gh(["api", `repos/${GH_REPO}/deployments/${d}/statuses`, "--jq", '[.[] | select(.state=="success")][0].environment_url // ""'], { allowFail: true }).out;
      if (url) break;
    }
    if (url) {
      await report(p.id, { preview_url: url }).catch((e) => log(`미리보기 보고 실패: ${e.message}`));
      log(`  미리보기 주소 등록: ${url}`);
      pendingPreviews.splice(i, 1);
    } else if (Date.now() - p.since > PREVIEW_GIVE_UP_MS) {
      pendingPreviews.splice(i, 1);
    }
  }
}

/**
 * 사장님이 [승인]한 작업의 PR 을 main 에 병합한다 → Vercel 이 실서버에 배포.
 * 로컬 폴더는 건드리지 않고 GitHub API 로만 병합·브랜치 삭제를 한다.
 */
async function mergeApproved() {
  const { tasks } = await api("GET", "/api/devroom/tasks/approved");
  for (const t of tasks) {
    const prNo = (t.pr_url || "").match(/\/pull\/(\d+)/)?.[1];
    if (!prNo) {
      await report(t.id, { status: "merge_failed", log: "PR 주소가 없어 병합하지 못했습니다." });
      continue;
    }
    log(`▶ ${t.task_no} 승인됨 → PR #${prNo} 병합`);
    const merge = gh(["api", "-X", "PUT", `repos/${GH_REPO}/pulls/${prNo}/merge`,
      "-f", "merge_method=squash", "-f", `commit_title=${t.task_no} ${t.title} (#${prNo})`], { allowFail: true });
    if (!merge.ok) {
      log(`✖ ${t.task_no} 병합 실패`);
      await say(t.id, "승인하셨는데 main 에 합치다가 충돌이 났습니다(그사이 다른 수정이 들어간 것 같아요). \"다시 해 줘\"라고 보내 주시면 최신 코드 기준으로 다시 작업하겠습니다.");
      await report(t.id, {
        status: "merge_failed",
        log: `[병합 실패] main 과 충돌했을 수 있습니다. 반려(피드백)로 다시 맡기면 최신 코드 기준으로 재작업합니다.\n\n${merge.err || merge.out}`,
      });
      continue;
    }
    if (t.branch) gh(["api", "-X", "DELETE", `repos/${GH_REPO}/git/refs/heads/${t.branch}`], { allowFail: true });
    await report(t.id, { status: "merged" });
    await say(t.id, "승인하신 수정을 main 에 반영했습니다. 2~3분 뒤 실서버(www.gongsilnews.com)에 나타납니다. 더 고칠 점이 있으면 아래에 적어 주세요.");
    log(`✔ ${t.task_no} 반영완료 (main 병합 → 실서버 배포 시작)`);
  }
}

// ───────────────────────── 시작 ─────────────────────────

async function tick() {
  await checkPreviews();
  await mergeApproved().catch((e) => log(`병합 확인 실패: ${e.message}`));
  const { task } = await api("GET", "/api/devroom/tasks");
  if (task) await handle(task);
  return !!task;
}

async function main() {
  if (TOKEN.length < 32) {
    console.error("DEVROOM_AGENT_TOKEN 이 없습니다. scripts/devroom-runner/.env 를 만들어 주세요 (.env.example 참고).");
    process.exit(1);
  }
  if (!fs.existsSync(CLAUDE_CLI)) {
    console.error(`Claude Code 를 찾지 못했습니다: ${CLAUDE_CLI}\nCLAUDE_CLI 에 cli.js 경로를 적어 주세요.`);
    process.exit(1);
  }
  fs.mkdirSync(WORK, { recursive: true });

  // 지난번에 작업 도중 꺼졌으면 그 작업은 '작업중'에 멈춰 있다 → 실패로 돌려 놓는다
  if (fs.existsSync(STATE_FILE)) {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    await report(s.id, { status: "failed", result_summary: "Runner가 작업 도중 꺼졌습니다. 다시 등록해 주세요." }).catch(() => {});
    fs.rmSync(STATE_FILE, { force: true });
    log(`지난 작업 ${s.task_no} 을 실패로 정리`);
  }

  log(`AI 개발실 Runner 시작 — ${BASE_URL}, 작업 폴더 ${WORKTREE}`);
  do {
    let busy = false;
    try {
      busy = await tick();
    } catch (e) {
      log(`확인 실패: ${e.message}`);
    }
    if (ONCE) break;
    // 방금 작업을 끝냈으면 쉬지 않고 다음 작업을 확인한다
    if (!busy) await new Promise((r) => setTimeout(r, POLL_MS));
  } while (true);
}

main();
