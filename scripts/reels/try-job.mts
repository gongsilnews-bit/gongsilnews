// reel_jobs 작업 기록·영상 보관까지 포함해 실제 작업 흐름을 로컬에서 돌려 본다 (개발 확인용).
//   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/reels/try-job.mts <vacancyId>
import { buildDraft } from "../../src/lib/reels/draft";
import { loadReelListing, reelsAdminClient } from "../../src/lib/reels/listing";
import { runReelJob, signedReelUrl } from "../../src/lib/reels/pipeline";

const [vacancyId] = process.argv.slice(2);
const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const listing = await loadReelListing(vacancyId);
const { script, warnings } = await buildDraft(listing);
log(`초안 완료: 장면 ${script.scenes.length}개, 경고 ${warnings.length}개`);

const db = reelsAdminClient();
const { data: job, error } = await db.from("reel_jobs").insert({ vacancy_id: vacancyId, member_id: listing.ownerId, script, voice: "Aoede", warnings }).select("id").single();
if (error || !job) throw new Error(error?.message);
log(`작업 등록 ${job.id}`);

await runReelJob(job.id);
const { data: done } = await db.from("reel_jobs").select("status, stage, video_path, duration_s, warnings, error, timings").eq("id", job.id).single();
log(`결과 ${JSON.stringify(done)}`);
if (done?.video_path) log(`서명 URL: ${(await signedReelUrl(done.video_path, 600))?.slice(0, 90)}...`);
