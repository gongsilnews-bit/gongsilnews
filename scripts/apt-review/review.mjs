// 시세 지도 단지 정보 캡처 요청 — 사장님 PC 의 클로드가 심사할 때 쓰는 도구 (2026-11-02 사장님: 접수되면 자동으로 심의해서 반영)
//  node scripts/apt-review/review.mjs list              확인 기다리는 캡처 요청 + 그 단지 지금 값, 캡처를 PNG 로 내려받아 경로를 알려 준다
//  node scripts/apt-review/review.mjs apply <file.json> 심사 결과 반영 — [{ id, decision: "approve"|"reject"|"pending", reason, values: [{ field, ex_area?, value }] }]
// 반영 규칙은 src/utils/aptReports.ts 와 같다 (전용면적별 항목은 그 면적이 단지에 있어야, 공급/계약 비율 범위). 실거래 가격은 고치지 않는다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const rest = (q, init = {}) => fetch(`${U}/rest/v1/${q}`, { ...init, headers: { ...H, ...(init.headers || {}) } }).then(async (r) => {
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
});

const PER_AREA = ["supply", "contract", "rooms"];
const FIELDS = ["supply", "contract", "rooms", "households", "dongs", "topFloor", "parking", "useAprDay", "vlRat", "bcRat", "heating", "hall", "builder", "evChargers"];

async function list() {
  const reps = await rest("apt_info_reports?select=id,complex_id,value,images,created_at&field=eq.capture&status=eq.pending&order=id&limit=10");
  const dir = path.join(os.tmpdir(), "gongsil-apt-review");
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const r of reps) {
    const [c] = await rest(`apt_complexes?select=id,kind,name,dong,jibun,info,agent_info,supply_map,unit_map,trades&id=eq.${encodeURIComponent(r.complex_id)}`);
    const areas = c ? [...new Set([...(c.trades || []).map((t) => t.a.toFixed(2)), ...Object.keys(c.unit_map || {})])].sort((a, b) => a - b) : [];
    const files = [];
    for (const [i, url] of (r.images || []).entries()) {
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const file = path.join(dir, `report${r.id}_${i}.png`);
      await sharp(buf).png().toFile(file);
      files.push(file);
    }
    const info = c ? { ...(c.info || {}), ...(c.agent_info || {}) } : null;
    out.push({
      id: r.id, complex: c ? `${c.dong} ${c.name} (${c.kind === "offi" ? "오피스텔" : "아파트"})` : "지도에 없는 단지",
      request_text: r.value, images: files, real_areas: areas, public_supply: c?.supply_map || {},
      now: info && Object.fromEntries(Object.entries(info).filter(([, v]) => v !== null && v !== "" && v !== undefined)),
    });
  }
  console.log(JSON.stringify(out, null, 1));
}

async function apply(file) {
  const decisions = JSON.parse(fs.readFileSync(file, "utf8"));
  const now = new Date().toISOString();
  for (const d of decisions) {
    const [r] = await rest(`apt_info_reports?select=id,complex_id,status&id=eq.${d.id}`);
    if (!r || r.status !== "pending") { console.log(d.id, "건너뜀 (없거나 이미 처리됨)"); continue; }
    const applied = [];
    if (d.decision === "approve") {
      const [c] = await rest(`apt_complexes?select=id,agent_info,trades,unit_map&id=eq.${encodeURIComponent(r.complex_id)}`);
      const areas = [...new Set([...(c.trades || []).map((t) => t.a.toFixed(2)), ...Object.keys(c.unit_map || {})])];
      const info = { ...(c.agent_info || {}) };
      for (const v of d.values || []) {
        if (!FIELDS.includes(v.field)) { console.log(d.id, "모르는 항목", v.field); continue; }
        if (PER_AREA.includes(v.field)) {
          const key = areas.find((a) => Math.abs(Number(a) - Number(v.ex_area)) <= 0.6);
          if (!key) { console.log(d.id, `전용 ${v.ex_area}㎡ 없음 — 뺌`); continue; }
          if (v.field === "supply") { console.log(d.id, "공급면적은 건축물대장 계산을 쓴다 — 계약면적·방욕실만 반영"); continue; }
          info[v.field] = { ...(info[v.field] || {}), [key]: v.field === "contract" ? Number(v.value) : String(v.value) };
        } else {
          info[v.field] = ["heating", "hall", "builder"].includes(v.field) ? String(v.value) : v.field === "useAprDay" ? String(v.value).replace(/\D/g, "") : Number(String(v.value).replace(/[^\d.]/g, ""));
        }
        applied.push(`${v.field}${v.ex_area ? `(${v.ex_area})` : ""}=${v.value}`);
      }
      await rest(`apt_complexes?id=eq.${encodeURIComponent(r.complex_id)}`, { method: "PATCH", body: JSON.stringify({ agent_info: info }) });
    }
    await rest(`apt_info_reports?id=eq.${d.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: d.decision === "approve" ? "approved" : d.decision === "reject" ? "rejected" : "pending",
        note: `클로드 심사: ${d.reason || ""}${applied.length ? ` · 반영 ${applied.join(", ")}` : ""}`.slice(0, 900),
        ...(d.decision === "pending" ? {} : { decided_at: now }),
      }),
    });
    console.log(d.id, d.decision, applied.join(", "));
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "list") await list();
else if (cmd === "apply" && arg) await apply(arg);
else console.log("사용법: node scripts/apt-review/review.mjs list | apply <결과.json>");
