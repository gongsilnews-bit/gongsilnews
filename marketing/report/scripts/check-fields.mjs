// 매물보고서 입력란 ↔ 보고서 화면 칸 맞춤 검사 (2026-10-25) — node marketing/report/scripts/check-fields.mjs
// 보고서 화면(components/canvas·shared)이 고치는 info 칸이 칸 목록(reportFields.ts)이나 입력란(FlyerForm.tsx)에 다 있는지,
// 화면에 "없으면 이 글" 기본 문구(info.x || "…")가 다시 생기지 않았는지 본다. 문제가 있으면 1 로 끝난다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const list = (dir) => fs.readdirSync(path.join(root, dir)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${dir}/${f}`);

const registry = new Set([...read('reportFields.ts').matchAll(/key: [`'"]([\w.${}]+)[`'"]/g)].map((m) => m[1]));
// head() 로 만든 쪽 제목·부제목·배지
for (const m of read('reportFields.ts').matchAll(/\.\.\.head\((\d+), '[^']*', '[^']*'(, '[^']*')?\)/g)) {
  registry.add(`page${m[1]}Title`); registry.add(`page${m[1]}Subtitle`); if (m[2]) registry.add(`pageBadges.page${m[1]}`);
}
const form = read('components/FlyerForm.tsx');
const formKeys = new Set([...form.matchAll(/name="(\w+)"/g), ...form.matchAll(/\.\.\.info, (\w+):/g), ...form.matchAll(/fv\('(\w+)'\)/g)].map((m) => m[1]));

// 화면에서 고치는 칸
const canvasFiles = [...list('components/canvas'), ...list('components/shared')];
const edited = new Map();
// 칸 이름을 지정하지 않고 표·목록 안을 고치는 칸 — 각자 입력란(표 편집·목록)이 있다
const STRUCT = new Set(['overviewTable', 'leaseTable', 'chartBars', 'highlights', 'roadmapList', 'investmentSummary', 'photoCaptions', 'publicEdits', 'publicAdded', 'publicHidden', 'pageBadges', 'simInfo',
  // 화면 위 단추·지도로만 고치는 값 (글 칸이 아니다)
  'showChart', 'chartEdited', 'agentMapType', 'agentMapImage', 'agentCardFront', 'page5Lat', 'page5Lng', 'page7Lat', 'page7Lng', 'mapType']);
for (const f of canvasFiles) {
  const src = read(f);
  for (const m of src.matchAll(/(?:hc|handleTextChange|set)\('(\w+)'/g)) edited.set(m[1], f);
  for (const m of src.matchAll(/\.\.\.info, (\w+):/g)) edited.set(m[1], f);
  for (const m of src.matchAll(/fieldProps\(info, \w+, '([\w.]+)'|FX\(info, hc, '([\w.]+)'/g)) edited.set(m[1] || m[2], f);
}
const problems = [];
for (const [k, f] of edited) {
  if (STRUCT.has(k) || registry.has(k) || formKeys.has(k)) continue;
  problems.push(`입력란에 없는 칸: ${k} (${f})`);
}
for (const k of registry) if (!k.includes('$') && !/\.page\d+$/.test(k) && !edited.has(k) && !/^page\d+(Title|Subtitle)$/.test(k) && !['coverSubtitle', 'address', 'agentLabel', 'subTitle', 'agentPhone', 'priceSub'].includes(k)) {
  if (![...canvasFiles].some((f) => read(f).includes(`'${k}'`))) problems.push(`보고서 화면에 안 나오는 칸 목록 칸: ${k}`);
}
// 기본 문구 되살아남 — info.x || "글"
for (const f of canvasFiles) {
  const src = read(f);
  for (const m of src.matchAll(/(?:info|ia|\(info as any\))\??\.(\w+) \|\| (["'])([^"']+)\2/g)) {
    if (registry.has(m[1])) problems.push(`${f}: ${m[1]} 에 화면 기본 문구 "${m[3]}" — fieldProps/fieldValue 로`);
  }
}
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log(`OK — 화면 칸 ${edited.size}개, 칸 목록 ${registry.size}개, 입력란 이름 ${formKeys.size}개`);
