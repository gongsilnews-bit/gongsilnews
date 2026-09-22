/*
 * 중개사·사업자 홈페이지 주소 일괄 발급
 *
 *   node scripts/issue_subdomains.mjs            ← 무엇이 생길지 보기만 한다 (기본)
 *   node scripts/issue_subdomains.mjs --write    ← 실제로 만든다
 *
 * 주소는 이메일 아이디에서 딴다. 이미 쓰는 buildon·mgongsil·gongsilmarketing 이
 * 그렇게 생겼고, 이메일은 겹치지 않으니 주소도 겹치지 않는다. 마음에 안 들면
 * 중개사가 [물건접수장] 편집기에서 직접 바꾼다.
 *
 * is_active 는 늘 true 로 넣는다. 돈을 안 냈을 때 닫는 일은 미들웨어와
 * getHomepageSettingsBySubdomain 이 요금제를 보고 알아서 한다 — 여기서 미리
 * 닫아두면 나중에 결제해도 안 열리는 함정이 된다.
 */
import fs from "fs";
import path from "path";

const WRITE = process.argv.includes("--write");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("✕ .env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다.");
  process.exit(1);
}

const api = async (p, init) => {
  const res = await fetch(`${URL_}/rest/v1/${p}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  // 넣기(POST)는 몸통 없이 201 만 돌아온다. 그걸 JSON 으로 읽으면 터진다.
  const body = await res.text();
  return body ? JSON.parse(body) : null;
};

/*
 * 예약 주소는 실제 코드에서 읽는다. 여기에 베껴두면 한쪽만 고쳐져서
 * 스크립트가 www 같은 주소를 태연히 발급하는 날이 온다.
 */
const src = fs.readFileSync(path.join("src", "app", "actions", "homepage.ts"), "utf8");
const block = src.match(/const RESERVED_SUBDOMAINS = new Set\(\[([\s\S]*?)\]\)/);
if (!block) throw new Error("homepage.ts 에서 RESERVED_SUBDOMAINS 를 못 찾았습니다.");
const RESERVED = new Set([...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));

/** homepage.ts 의 validateSubdomain 과 같은 규칙 */
const shape = (v) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(v) && v.length >= 2 && v.length <= 30;

/** 이메일 아이디 → 주소. 쓸 수 없는 글자는 버리고 하이픈으로 잇는다 */
function slugFromEmail(email) {
  const local = String(email || "").split("@")[0].toLowerCase();
  return local.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30).replace(/-+$/, "");
}

const members = await api("members?select=id,name,email,role,plan_type,plan_end_date&role=in.(REALTOR,BIZ)&order=created_at");
const taken = await api("homepage_settings?select=owner_id,subdomain");
const agencies = await api("agencies?select=owner_id,name,status");
const bizList = await api("business_profiles?select=user_id,name").catch(() => []);

const hasHome = new Set(taken.map((t) => t.owner_id));
const used = new Set(taken.map((t) => t.subdomain));
const agencyOf = Object.fromEntries(agencies.map((a) => [a.owner_id, a]));
const bizOf = Object.fromEntries((Array.isArray(bizList) ? bizList : []).map((b) => [b.user_id, b]));

const plans = new Set(["news_premium", "study_premium", "biz_premium"]);
const paid = (m) => plans.has(m.plan_type) && (!m.plan_end_date || new Date(m.plan_end_date) >= new Date());

const rows = [];
const skipped = [];

for (const m of members) {
  if (hasHome.has(m.id)) continue;

  const company = m.role === "BIZ" ? bizOf[m.id]?.name : agencyOf[m.id]?.name;
  if (!company) {
    // 상호·등록번호·소재지 없이 페이지를 열면 표시·광고법상 필수 항목이 빈
    // 광고가 나간다. 정보설정을 채우기 전에는 주소를 주지 않는다.
    skipped.push({ ...m, why: m.role === "BIZ" ? "사업자정보 없음" : "부동산정보 없음" });
    continue;
  }

  let want = slugFromEmail(m.email);
  if (!shape(want) || RESERVED.has(want)) want = `${m.role.toLowerCase()}-${String(m.id).slice(0, 6)}`;
  let sub = want, n = 2;
  while (used.has(sub) || RESERVED.has(sub)) sub = `${want}-${n++}`.slice(0, 30);
  used.add(sub);

  rows.push({ owner_id: m.id, subdomain: sub, is_active: true, theme_name: "template01", _m: m, _company: company });
}

console.log(`\n대상 ${members.length}명 · 이미 있음 ${members.filter((m) => hasHome.has(m.id)).length}명 · 새로 발급 ${rows.length}건\n`);
for (const r of rows) {
  console.log(`  + ${r.subdomain}.gongsilnews.com   ${r._m.name} (${r._company})  ${paid(r._m) ? "유료 → 바로 열림" : "무료 → 결제 전까지 닫힘"}`);
}
if (skipped.length) {
  console.log("\n건너뜀 (정보설정을 먼저 채워야 함)");
  for (const s of skipped) console.log(`  - ${s.name} <${s.email}>  ${s.why}`);
}

if (!WRITE) {
  console.log("\n※ 보기만 했습니다. 실제로 만들려면 --write 를 붙이세요.\n");
  process.exit(0);
}

for (const r of rows) {
  const { _m, _company, ...row } = r;
  await api("homepage_settings", { method: "POST", body: JSON.stringify(row) });
  console.log(`  ✓ ${row.subdomain}`);
}
console.log(`\n${rows.length}건 발급 완료.\n`);
