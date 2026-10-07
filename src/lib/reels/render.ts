// Vercel Sandbox 렌더: 스냅샷(도구·에셋 설치 완료)에서 기동 → 파일 전달 → hyperframes render → MP4 회수.
// 스냅샷 만들기: scripts/reels/build-sandbox-snapshot.mjs (결과 ID 를 REELS_SANDBOX_SNAPSHOT_ID 에)
import { Sandbox } from "@vercel/sandbox";

export interface RenderInput {
  jobId: string;
  html: string;
  media: { path: string; content: Buffer }[]; // media/ 아래 사진·성우
  downloads?: { path: string; url: string }[]; // 샌드박스가 직접 내려받을 큰 파일 (영상 변환본)
  totalSeconds: number;
  music: { file: string; start: number } | null; // 샌드박스 안 경로 (assets/bgm/... 또는 내려받은 media/...) + 시작 지점(초)
}

export async function renderInSandbox(input: RenderInput): Promise<{ mp4: Buffer; seconds: number }> {
  const snapshotId = process.env.REELS_SANDBOX_SNAPSHOT_ID;
  if (!snapshotId) throw new Error("REELS_SANDBOX_SNAPSHOT_ID 가 설정되지 않았습니다 (scripts/reels/build-sandbox-snapshot.mjs 실행 필요).");

  const t0 = Date.now();
  const sb = await Sandbox.create({ source: { type: "snapshot", snapshotId }, resources: { vcpus: 8 }, timeout: 8 * 60 * 1000 });
  try {
    const dir = `/vercel/jobs/${input.jobId}`;
    await sb.writeFiles([
      { path: `${dir}/index.html`, content: Buffer.from(input.html, "utf8") },
      ...input.media.map((m) => ({ path: `${dir}/${m.path}`, content: m.content })),
      ...(input.downloads?.length
        ? [
            { path: `${dir}/dl.mjs`, content: Buffer.from(SANDBOX_DL) },
            { path: `${dir}/urls.json`, content: Buffer.from(JSON.stringify(Object.fromEntries(input.downloads.map((d, i) => [`f${i}`, d.url])))) },
          ]
        : []),
    ]);
    // 배경음악을 영상 길이에 맞게 자르고 끝을 서서히 줄인다
    const total = input.totalSeconds.toFixed(2);
    const fadeAt = Math.max(0, input.totalSeconds - 3).toFixed(2);
    const script = [
      `cd ${dir}`,
      `ln -sfn /vercel/reel-assets assets`,
      // 영상 변환본은 서버를 거치지 않고 샌드박스가 저장소에서 바로 받는다
      ...(input.downloads || []).map((d, i) => `node dl.mjs f${i} ${d.path}`),
      // 고른 지점부터 영상 길이만큼, 중간에서 시작하면 0.5초 서서히 키운다
      ...(input.music
        ? [`ffmpeg -v error -y -ss ${input.music.start.toFixed(2)} -i ${input.music.file} -t ${total} -af "${input.music.start > 0 ? "afade=t=in:d=0.5," : ""}afade=t=out:st=${fadeAt}:d=3" media/bed.wav`]
        : []),
      `hyperframes render . -q high -o out.mp4`,
    ].join(" && ");
    await runDetached(sb, script);
    const mp4 = await sb.readFileToBuffer({ path: `${dir}/out.mp4` });
    if (!mp4 || mp4.length < 10_000) throw new Error("렌더 결과 파일이 비어 있습니다.");
    return { mp4, seconds: (Date.now() - t0) / 1000 };
  } finally {
    await sb.stop().catch(() => {});
  }
}

// 렌더는 30~90초. 긴 HTTP 스트림 대신 분리 실행 후 완료 표시 파일을 짧게 확인한다 (긴 연결은 끊긴 적이 있음).
export async function runDetached(sb: Sandbox, script: string, limitMs = 6 * 60 * 1000) {
  await sb.runCommand({ cmd: "bash", args: ["-lc", `( ${script} ) > /tmp/job.log 2>&1; echo $? > /tmp/job.done`], detached: true });
  const start = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    const code = (await (await sb.runCommand("bash", ["-lc", "cat /tmp/job.done 2>/dev/null"])).stdout()).trim();
    if (code !== "") {
      if (code !== "0") {
        const tail = await (await sb.runCommand("bash", ["-lc", "tail -c 1200 /tmp/job.log"])).stdout();
        throw new Error(`샌드박스 작업 실패: ${tail}`);
      }
      return;
    }
    if (Date.now() - start > limitMs) throw new Error(`작업 시간 초과 (${Math.round(limitMs / 60000)}분)`);
  }
}

/** 샌드박스 안에서 저장소 파일 내려받기 (이미지에 curl 이 없어 node 로). urls.json 의 키 → 파일 */
export const SANDBOX_DL = `import { createWriteStream, readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
const [key, out] = process.argv.slice(2);
const url = JSON.parse(readFileSync("urls.json", "utf8"))[key];
const r = await fetch(url);
if (!r.ok) throw new Error("download " + r.status);
await pipeline(Readable.fromWeb(r.body), createWriteStream(out));
`;
