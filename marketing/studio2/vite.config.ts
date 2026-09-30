import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { spawn, type ChildProcess } from 'child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const readJsonBody = (request: NodeJS.ReadableStream): Promise<any> => new Promise((resolve, reject) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => {
    body += chunk;
    if (body.length > 150 * 1024 * 1024) {
      reject(new Error('요청 데이터가 150MB를 초과했습니다.'));
    }
  });
  request.on('end', () => {
    try {
      resolve(JSON.parse(body || '{}'));
    } catch (error) {
      reject(error);
    }
  });
  request.on('error', reject);
});

/* VS Code(Claude·Codex)에서 만든 장면 표시 — marketing/studio2/AGENTS.md 의 약속 */
const AGENT_MARK = /<meta\s+name=["']studio2-author["']\s+content=["']vscode["']/i;

const IMAGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
};
const MIME_OF: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp',
  mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac',
};

const parseDataUrl = (value: unknown, table: Record<string, string>) => {
  const match = typeof value === 'string' ? value.match(/^data:([\w/+.-]+)(?:;[^,]*)?;base64,(.+)$/) : null;
  if (!match || !table[match[1]]) return null;
  return { extension: table[match[1]], data: Buffer.from(match[2], 'base64') };
};

const readIfExists = async (file: string, encoding?: BufferEncoding) => {
  try {
    return encoding ? await fs.readFile(file, encoding) : await fs.readFile(file);
  } catch {
    return null;
  }
};

const sendJson = (response: any, status: number, body: unknown) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
};

const studio2WorkspacePlugin = () => ({
  name: 'studio2-local-workspace',
  configureServer(server: any) {
    server.middlewares.use('/__studio2/workspace', async (request: any, response: any, next: () => void) => {
      const workspaceDir = path.resolve(__dirname, 'workspace');
      const scenesDir = path.join(workspaceDir, 'scenes');
      const manifestPath = path.join(workspaceDir, 'project.json');

      /* ── 불러오기: VS Code 에서 만들거나 고친 장면을 Studio2 화면으로 가져온다 ── */
      if (request.method === 'GET') {
        try {
          const manifestText = await readIfExists(manifestPath, 'utf8');
          if (!manifestText) {
            sendJson(response, 404, { error: '작업 폴더에 저장된 프로젝트가 없습니다. 먼저 대본을 분석하거나 작업 폴더에 저장하세요.' });
            return;
          }
          const manifest = JSON.parse(String(manifestText));
          const scenes = [];
          for (const scene of Array.isArray(manifest.scenes) ? manifest.scenes : []) {
            const html = scene.htmlFile ? await readIfExists(path.join(scenesDir, scene.htmlFile), 'utf8') : null;
            const toDataUrl = async (file?: string) => {
              if (!file) return undefined;
              const bytes = await readIfExists(path.join(scenesDir, file));
              const mime = MIME_OF[path.extname(file).slice(1).toLowerCase()];
              return bytes && mime ? `data:${mime};base64,${Buffer.from(bytes).toString('base64')}` : undefined;
            };
            scenes.push({
              narrative: String(scene.narrative || ''),
              mediaType: scene.mediaType === 'image' ? 'image' : 'html',
              durationMs: Number(scene.durationMs) || 6_000,
              html: html ? String(html) : undefined,
              byAgent: html ? AGENT_MARK.test(String(html)) : false,
              imageUrl: await toDataUrl(scene.imageFile),
              audioUrl: await toDataUrl(scene.audioFile),
            });
          }
          sendJson(response, 200, { aspectRatio: manifest.aspectRatio || '16:9', updatedAt: manifest.updatedAt, scenes });
        } catch (error: any) {
          sendJson(response, 500, { error: error?.message || '작업 폴더를 읽지 못했습니다.' });
        }
        return;
      }

      if (request.method !== 'POST') {
        next();
        return;
      }

      /* ── 저장: Studio2 화면의 장면·이미지·음성을 작업 폴더에 쓴다 ── */
      if (agentJob?.running) {
        sendJson(response, 423, { error: 'AI가 장면을 만드는 중이라 작업 폴더에 저장하지 않았습니다. 끝나면 자동으로 불러옵니다.' });
        return;
      }
      try {
        const payload = await readJsonBody(request);
        const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
        await fs.mkdir(scenesDir, { recursive: true });

        /* VS Code 에서 만든 장면 지키기
           - 같은 번호·같은 문장이면 Studio2 가 보낸 기본 장면 대신 VS Code 장면을 그대로 둔다 (묻지 않는다).
             같은 대본을 다시 분석하거나 저장해도 AI 가 만든 장면이 사라지지 않는다.
           - 문장이 바뀐 클립에 VS Code 장면이 있으면 먼저 묻는다 (force 로 다시 보내면 바꾼다). */
        const previousText = await readIfExists(manifestPath, 'utf8');
        const previous = previousText ? JSON.parse(String(previousText)) : { scenes: [] };
        const previousScenes: any[] = Array.isArray(previous.scenes) ? previous.scenes : [];
        const keep = new Set<number>();
        const conflicts: number[] = [];
        for (let index = 0; index < scenes.length; index++) {
          const incoming = scenes[index]?.html;
          if (typeof incoming !== 'string' || !incoming.trim()) continue;
          const existing = await readIfExists(path.join(scenesDir, `scene${String(index + 1).padStart(2, '0')}.html`), 'utf8');
          if (!existing || !AGENT_MARK.test(String(existing)) || String(existing) === incoming) continue;
          const sameText = String(previousScenes[index]?.narrative || '') === String(scenes[index]?.narrative || '');
          if (sameText) keep.add(index);
          else conflicts.push(index + 1);
        }
        if (conflicts.length && !payload.force) {
          sendJson(response, 409, { conflicts, error: `문장이 바뀐 클립 ${conflicts.length}개(${conflicts.join(', ')}번)에 VS Code에서 만든 장면이 있습니다. 새 문장에 맞는 기본 장면으로 바꾸게 됩니다.` });
          return;
        }

        const manifestScenes = [];
        for (let index = 0; index < scenes.length; index++) {
          const scene = scenes[index] || {};
          const sceneNumber = String(index + 1).padStart(2, '0');
          const htmlFile = `scene${sceneNumber}.html`;
          const audioMs = Math.max(0, Math.round(Number(scene.audioMs) || 0));
          const kept = keep.has(index);
          /* 지킨 VS Code 장면은 AI 가 정한 길이를 쓴다 (음성이 새로 오면 음성 길이가 우선) */
          const keptDuration = kept ? Number(previousScenes[index]?.durationMs) || 0 : 0;
          const manifestScene: Record<string, unknown> = {
            index,
            narrative: String(scene.narrative || ''),
            mediaType: kept ? 'html' : scene.mediaType === 'image' ? 'image' : 'html',
            /* 음성이 있으면 음성 길이 + 0.5초, 없으면 받은 값(기본 6초) */
            durationMs: audioMs ? audioMs + 500 : keptDuration || Math.max(1_000, Number(scene.durationMs) || 6_000),
            htmlFile,
          };

          if (!kept && typeof scene.html === 'string' && scene.html.trim()) {
            await fs.writeFile(path.join(scenesDir, htmlFile), scene.html, 'utf8');
          }

          const image = parseDataUrl(scene.imageUrl, IMAGE_TYPES);
          if (image) {
            const imageFile = `scene${sceneNumber}.${image.extension}`;
            await fs.writeFile(path.join(scenesDir, imageFile), image.data);
            manifestScene.imageFile = imageFile;
          }

          const audio = parseDataUrl(scene.audioUrl, AUDIO_TYPES);
          if (audio) {
            const audioFile = `scene${sceneNumber}.${audio.extension}`;
            await fs.writeFile(path.join(scenesDir, audioFile), audio.data);
            manifestScene.audioFile = audioFile;
            if (audioMs) manifestScene.audioMs = audioMs;
          }

          manifestScenes.push(manifestScene);
        }

        const manifest = {
          version: 2,
          aspectRatio: payload.aspectRatio || '16:9',
          updatedAt: new Date().toISOString(),
          scenes: manifestScenes,
        };
        await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

        sendJson(response, 200, {
          savedScenes: manifestScenes.length,
          savedAudio: manifestScenes.filter(scene => scene.audioFile).length,
          keptScenes: [...keep].map(index => index + 1),
          workspace: workspaceDir,
        });
      } catch (error: any) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(error?.message || 'Studio2 작업 폴더 저장 실패');
      }
    });
  },
});

/* ── AI 장면 자동 생성: Studio2 버튼 → 이 서버가 뒤에서 Claude Code 를 실행한다 ──
   - workspace 폴더에서만 돌고(cwd), 읽기·쓰기·고치기와 장면 캡처 명령만 허용한다 (나머지는 dontAsk 로 거절).
   - 규칙은 marketing/studio2/AGENTS.md (CLAUDE.md 가 불러온다).
   - 도는 동안에는 작업 폴더 저장을 막아 Studio2 와 서로 덮어쓰지 않게 한다. */
type AgentJob = {
  running: boolean;
  startedAt: number;
  finishedAt?: number;
  total: number;
  error?: string;
  summary?: string;
  log: string[];
  child?: ChildProcess;
};
let agentJob: AgentJob | null = null;
const AGENT_TIMEOUT_MS = 20 * 60 * 1000;

/* claude 실행 파일 — npm 전역 설치의 cli.js 를 node 로 직접 부른다 (Windows 에서 따옴표가 깨지지 않게) */
const claudeCommand = (): { command: string; args: string[]; shell: boolean } => {
  const override = process.env.STUDIO2_CLAUDE_CLI;
  const candidates = [
    override,
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
  ].filter(Boolean) as string[];
  const cli = candidates.find(file => existsSync(file));
  return cli ? { command: process.execPath, args: [cli], shell: false } : { command: 'claude', args: [], shell: true };
};

const agentPrompt = (only: number[]) => `지금 폴더(marketing/studio2/workspace)의 project.json 을 읽고, AGENTS.md 의 "장면 만들어줘" 절차와 장면 HTML 약속·디자인 규칙을 그대로 따라 ${only.length ? `${only.join(', ')}번 클립` : '모든 클립'}의 장면을 scenes/sceneNN.html 로 만들어라.
- 예전 장면 파일은 이미 output/previous-scenes/ 로 옮겨 두었다. 읽지 말고 scenes/ 에 바로 새로 쓴다.
- 장면마다 <meta name="studio2-author" content="vscode"> 를 반드시 넣는다.
- 화면을 크게 채운다 — AGENTS.md 의 "화면 채우기" 기준을 지킨다.
- project.json 은 AGENTS.md 규칙대로만 고친다 (새 장면 mediaType "html", 음성이 없을 때만 durationMs 계산).
- 다 만든 뒤 node ../scripts/preview-scenes.cjs 를 실행한다 (몇 초 걸린다). ⚠ 경고가 나온 장면은 고치고 다시 실행해 경고가 없어질 때까지 반복한다.
  경고가 없으면 캡처 이미지를 2~3장만 열어 겹침·잘림을 확인한다.
- 이 폴더 밖의 파일은 고치지 않는다. 질문하지 말고 끝까지 진행한다.
- 끝나면 장면별로 무엇을 그렸는지 한 줄씩 한국어로 요약한다.`;

const countAgentScenes = async (scenesDir: string, since: number): Promise<number> => {
  const files = await fs.readdir(scenesDir).catch(() => [] as string[]);
  let count = 0;
  for (const file of files.filter(name => /^scene\d+\.html$/.test(name))) {
    const full = path.join(scenesDir, file);
    const stat = await fs.stat(full).catch(() => null);
    if (!stat || stat.mtimeMs < since) continue;
    const text = await readIfExists(full, 'utf8');
    if (text && AGENT_MARK.test(String(text))) count += 1;
  }
  return count;
};

const agentPlugin = () => ({
  name: 'studio2-agent-scenes',
  configureServer(server: any) {
    const workspaceDir = path.resolve(__dirname, 'workspace');
    const scenesDir = path.join(workspaceDir, 'scenes');

    server.middlewares.use('/__studio2/agent', async (request: any, response: any) => {
      const url = String(request.url || '');

      /* 진행 상황 */
      if (request.method === 'GET') {
        if (!agentJob) {
          sendJson(response, 200, { running: false, idle: true });
          return;
        }
        const done = await countAgentScenes(scenesDir, agentJob.startedAt);
        sendJson(response, 200, {
          running: agentJob.running,
          startedAt: agentJob.startedAt,
          finishedAt: agentJob.finishedAt,
          total: agentJob.total,
          done,
          error: agentJob.error,
          summary: agentJob.summary,
          log: agentJob.log.slice(-6),
        });
        return;
      }

      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'GET/POST 만 됩니다.' });
        return;
      }

      /* 중지 */
      if (url.startsWith('/stop')) {
        if (agentJob?.running && agentJob.child) {
          agentJob.child.kill();
          agentJob.error = '사용자가 중지했습니다.';
        }
        sendJson(response, 200, { stopped: true });
        return;
      }

      /* 시작 */
      if (agentJob?.running) {
        sendJson(response, 409, { error: 'AI가 이미 장면을 만들고 있습니다.' });
        return;
      }
      try {
        const payload = await readJsonBody(request);
        const only: number[] = Array.isArray(payload.only) ? payload.only.map(Number).filter(Boolean) : [];
        const manifest = JSON.parse(String(await readIfExists(path.join(workspaceDir, 'project.json'), 'utf8') || '{}'));
        const total = only.length || (Array.isArray(manifest.scenes) ? manifest.scenes.length : 0);
        if (!total) {
          sendJson(response, 400, { error: '작업 폴더에 클립이 없습니다. 먼저 대본을 분석하세요.' });
          return;
        }

        /* 새로 만들 장면의 예전 파일은 백업 폴더로 옮긴다 — 쓰기 전에 하나씩 읽느라 시간이 걸리지 않게 */
        const backupDir = path.join(workspaceDir, 'output', 'previous-scenes');
        await fs.rm(backupDir, { recursive: true, force: true });
        await fs.mkdir(backupDir, { recursive: true });
        const targets = only.length ? only : Array.from({ length: total }, (_, i) => i + 1);
        for (const number of targets) {
          const file = `scene${String(number).padStart(2, '0')}.html`;
          await fs.rename(path.join(scenesDir, file), path.join(backupDir, file)).catch(() => undefined);
        }

        const { command, args, shell } = claudeCommand();
        const child = spawn(command, [
          ...args,
          '-p',
          '--permission-mode', 'dontAsk',
          '--allowedTools', 'Read,Glob,Grep,Write,Edit,Bash(node ../scripts/preview-scenes.cjs:*)',
          '--output-format', 'stream-json',
          '--verbose',
        ], { cwd: workspaceDir, shell, windowsHide: true, env: { ...process.env } });

        const job: AgentJob = { running: true, startedAt: Date.now(), total, log: [], child };
        agentJob = job;
        const timer = setTimeout(() => {
          if (job.running) {
            job.error = '20분이 지나 멈췄습니다.';
            child.kill();
          }
        }, AGENT_TIMEOUT_MS);

        let buffer = '';
        child.stdout.on('data', chunk => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.type === 'assistant') {
                for (const part of event.message?.content || []) {
                  if (part.type === 'tool_use') {
                    const target = part.input?.file_path || part.input?.command || part.input?.pattern || '';
                    job.log.push(`${part.name} ${String(target).split(/[\\/]/).slice(-2).join('/')}`);
                  }
                }
              } else if (event.type === 'user') {
                /* 도구가 거절·실패하면 그 이유를 남긴다 (권한 문제를 바로 알 수 있게) */
                for (const part of event.message?.content || []) {
                  if (part.type === 'tool_result' && part.is_error) {
                    const text = Array.isArray(part.content) ? part.content.map((c: any) => c.text || '').join(' ') : String(part.content || '');
                    job.log.push(`⚠ ${text.replace(/\s+/g, ' ').slice(0, 160)}`);
                  }
                }
              } else if (event.type === 'result') {
                job.summary = String(event.result || '');
                if (event.is_error || event.subtype !== 'success') job.error = job.error || `AI 작업이 끝나지 못했습니다 (${event.subtype || '오류'}).`;
              }
            } catch {
              /* stream-json 이 아닌 줄은 무시 */
            }
          }
        });
        let stderr = '';
        child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-2000); });
        child.on('error', error => {
          job.error = `Claude Code 를 실행하지 못했습니다: ${error.message}. 명령줄에서 claude 가 되는지 확인하세요.`;
        });
        child.on('close', code => {
          clearTimeout(timer);
          job.running = false;
          job.finishedAt = Date.now();
          job.child = undefined;
          if (code !== 0 && !job.error) job.error = `Claude Code 가 종료 코드 ${code} 로 멈췄습니다. ${stderr.trim().slice(-300)}`;
        });

        child.stdin.write(agentPrompt(only));
        child.stdin.end();
        sendJson(response, 200, { started: true, total });
      } catch (error: any) {
        sendJson(response, 500, { error: error?.message || 'AI 장면 생성을 시작하지 못했습니다.' });
      }
    });
  },
});

export default defineConfig(({ mode }) => {
    const rootEnv = loadEnv(mode, path.resolve(__dirname, '../../'), '');
    const localEnv = loadEnv(mode, '.', '');
    const apiKey = localEnv.GEMINI_API_KEY || localEnv.API_KEY || rootEnv.GEMINI_API_KEY || rootEnv.API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    return {
      base: '/marketing/studio2/',
      build: {
        outDir: '../../public/marketing/studio2',
        emptyOutDir: true,
      },
      server: {
        port: 3010,
        host: '127.0.0.1',
        watch: {
          ignored: ['**/workspace/**'],
        },
      },
      plugins: [react(), studio2WorkspacePlugin(), agentPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
