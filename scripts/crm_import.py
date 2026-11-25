"""고객관리(CRM) 명단 가져오기 — docs/2026-11-25_crm_contacts_plan.md 6장

원본 엑셀은 바탕화면 db 폴더에만 둔다 (프로젝트·GitHub 에 넣지 않음). 중간 파일을 남기지 않는다.

  python scripts/crm_import.py            # 미리보기: 숫자만 보여 주고 DB 에 쓰지 않음
  python scripts/crm_import.py --apply    # crm_contacts · crm_contact_tags · crm_contact_events 에 넣음

먼저 supabase/migrations/20261125_crm.sql 을 Supabase SQL Editor 에서 실행해야 한다.
여러 번 돌려도 같은 번호는 한 줄 (phone 기준 upsert, 꼬리표는 겹치지 않음).
이미 있는 카드의 문자 상태가 수신거부·쉬는중·번호오류면 그대로 둔다.
"""
import sys, re, json, collections, urllib.request, urllib.error, warnings
from pathlib import Path
import openpyxl

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
DB_DIR = Path.home() / "Desktop" / "db"
FILES = {
    "공실닷컴": DB_DIR / "20260226 공실닷컴 통합_회원목록.xlsx",
    "전국명단": DB_DIR / "부동산_.xlsx-20250120163100.xlsx",
    "뿌리오": DB_DIR / "뿌리오_주소록_교육생포함_20261125.xlsx",
}
TODAY = __import__("datetime").date.today().isoformat()
APPLY = "--apply" in sys.argv

# 뿌리오 묶음 → 꼬리표 (나머지는 "뿌리오_<폴더 또는 묶음>" · 문자 상태 확인전)
SEND_OK_TAGS = {"교육참여", "공실닷컴"}


def norm(p):
    d = re.sub(r"\D", "", str(p or ""))
    if d.startswith("82"):
        d = "0" + d[2:]
    return d if re.fullmatch(r"01[016789]\d{7,8}", d) else None


def s(v, n=200):
    v = str(v).strip() if v is not None else ""
    return v[:n] or None


def rows(path):
    # 뿌리오 파일은 크기 정보가 없어 read_only 로 읽으면 빈 표가 된다
    wb = openpyxl.load_workbook(path, read_only="뿌리오" not in path.name)
    it = wb.worksheets[0].iter_rows(values_only=True)
    h = [str(x).strip() if x is not None else "" for x in next(it)]
    for r in it:
        if any(r):
            yield dict(zip(h, r))


cards = {}
bad = collections.Counter()


def add(phone_raw, src, tags, info):
    p = norm(phone_raw)
    if not p:
        bad[src] += 1
        return
    c = cards.setdefault(p, {"tags": set(), "src": set(), "info": {}})
    c["tags"].update(tags)
    c["src"].add(src)
    for k, v in info.items():  # 먼저 들어온 값 우선 (전국명단 → 공실닷컴 → 뿌리오 순서로 읽음)
        if v and not c["info"].get(k):
            c["info"][k] = v


# 1) 전국 명단 (주소·상호가 가장 정확)
for r in rows(FILES["전국명단"]):
    add(r.get("핸드폰번호"), "전국명단", {"전국명단"}, {
        "name": s(r.get("대표자명"), 50), "office_name": s(r.get("상호"), 100),
        "address": s(r.get("지번주소") or r.get("소재지")), "road": s(r.get("소재지")), "tel": s(r.get("일반전화"), 30),
    })

# 2) 공실닷컴
for r in rows(FILES["공실닷컴"]):
    t = {"공실닷컴"}
    if str(r.get("만기일") or "")[:10] >= TODAY:
        t.add("공실닷컴_이용중")
    if r.get("부동산인증") == "Y":
        t.add("공실닷컴_인증")
    add(r.get("휴대폰"), "공실닷컴", t, {"office_name": s(r.get("회사명"), 100), "address": s(r.get("회사주소"))})

# 3) 뿌리오 주소록
for r in rows(FILES["뿌리오"]):
    g = str(r.get("그룹명") or "").strip()
    f = str(r.get("폴더명") or "").strip()
    # 뿌리오 폴더·그룹을 그대로: 뿌리오/강남구/개포1동 (2026-11-25 사장님: 뿌리오 주소록처럼)
    t = {f"뿌리오/{f}/{g}".replace(" ", "_"), "뿌리오주소록"}
    if "교육생" in g:
        t.add("교육참여")
    elif "공실닷컴" in g:
        t.add("공실닷컴")
    add(r.get("휴대폰번호"), "뿌리오", t, {
        "office_name": s(r.get("이름"), 100), "name": s(r.get("메모"), 50), "fax": s(r.get("팩스번호"), 30),
        "email": s(r.get("이메일주소"), 100), "address": s(r.get("변수1")), "ppfolder": f, "ppgroup": g,
    })

# 지역 — 주소에서 시도 › 시군구 › 동 (2026-11-25 사장님: 지역별로 나눠줘)
SIDO = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
        "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북",
        "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남",
        "제주특별자치도": "제주", "제주도": "제주"}
SHORT = set(SIDO.values())


def region(addr):
    toks = str(addr or "").replace(",", " ").split()
    if len(toks) < 2:
        return None
    sido = SIDO.get(toks[0]) or (toks[0][:2] if toks[0][:2] in SHORT else None)
    if not sido:
        return None
    if sido == "세종":
        sgg, rest = "세종시", toks[1:]
    else:
        sgg, rest = toks[1], toks[2:]
        if sgg.endswith("시") and rest and rest[0].endswith("구"):  # 성남시 분당구
            sgg, rest = f"{sgg} {rest[0]}", rest[1:]
        if not re.search(r"(시|군|구)$", sgg):
            return sido, None, None
    dong = next((x for x in rest[:2] if re.search(r"[가-힣0-9](동|가|읍|면)$", x)), None)
    return sido, sgg, dong


SEOUL_GU = {"강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구",
            "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"}
for c in cards.values():
    info = c["info"]
    rg = region(info.get("address")) or region(info.get("road"))
    if not rg and info.get("ppfolder") in SEOUL_GU:  # 뿌리오 폴더 이름(강남구)·그룹 이름(개포1동)
        grp = info.get("ppgroup") or ""
        rg = ("서울", info["ppfolder"], re.sub(r"\s+", "", grp) if re.search(r"동$", grp) else None)
    if rg:
        info["sido"], info["sigungu"], info["dong"] = rg
    else:
        info["sido"] = info["sigungu"] = info["dong"] = None

# 4) 공실뉴스 회원
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"')
BASE = env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/"
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]


def api(method, path, body=None, prefer=None):
    h = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    req = urllib.request.Request(BASE + path, method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            t = res.read()
            return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"DB 오류 {e.code} {path}: {e.read().decode()[:300]}")


members = api("GET", "members?select=id,phone,marketing_sms,is_deleted")
for m in members:
    if m.get("is_deleted"):
        continue
    p = norm(m.get("phone"))
    if not p:
        continue
    c = cards.setdefault(p, {"tags": set(), "src": set(), "info": {}})
    c["tags"].add("공실뉴스가입")
    c["src"].add("공실뉴스")
    c["member_id"] = m["id"]
    if m.get("marketing_sms"):
        c["consent"] = True


def status(c):
    # 2026-11-25 사장님: "문자는 다 보냄가능" — 전국명단 포함 모두. 수신거부·쉬는중·번호오류는 KEEP 으로 그대로 둔다
    return "보냄가능"


st = collections.Counter(status(c) for c in cards.values())
tags = collections.Counter(x for c in cards.values() for x in c["tags"])
print("카드(휴대폰 기준)", len(cards))
print("휴대폰 아님·빈칸 줄", dict(bad))
print("문자 상태", dict(st))
print("꼬리표", dict(tags.most_common()))
rc = collections.Counter(c["info"].get("sido") or "(모름)" for c in cards.values()); print("시도", dict(rc.most_common()))
gc = collections.Counter((c["info"].get("sido"), c["info"].get("sigungu")) for c in cards.values()); print("시군구 수", len(gc), "시군구 모름", sum(v for (a, b), v in gc.items() if not b))
dc = sum(1 for c in cards.values() if c["info"].get("dong")); print("동 있음", dc)

if not APPLY:
    print("\n미리보기만 했습니다. 넣으려면 --apply")
    sys.exit(0)

# ── 넣기 ──
KEEP = {"수신거부", "쉬는중", "번호오류"}
existing = {}
off = 0
while True:
    page = api("GET", f"crm_contacts?select=id,phone,sms_status&order=id&offset={off}&limit=1000")
    for x in page:
        existing[x["phone"]] = x
    if len(page) < 1000:
        break
    off += 1000

items = list(cards.items())
B = 1000
for i in range(0, len(items), B):
    chunk = []
    for p, c in items[i:i + B]:
        old = existing.get(p)
        row = {"phone": p, **{k: c["info"].get(k) for k in ("name", "office_name", "sido", "sigungu", "dong", "address", "tel", "fax", "email")},
               "member_id": c.get("member_id")}
        row["sms_status"] = old["sms_status"] if old and old["sms_status"] in KEEP else status(c)
        chunk.append(row)
    api("POST", "crm_contacts?on_conflict=phone", chunk, "resolution=merge-duplicates,return=minimal")
    print(f"카드 {min(i + B, len(items))}/{len(items)}")

ids = {}
off = 0
while True:
    page = api("GET", f"crm_contacts?select=id,phone&order=id&offset={off}&limit=1000")
    for x in page:
        ids[x["phone"]] = x["id"]
    if len(page) < 1000:
        break
    off += 1000

# 예전 뿌리오_구 꼬리표는 지우고 뿌리오/폴더/그룹 으로 바꾼다
api("DELETE", "crm_contact_tags?tag=like.%EB%BF%8C%EB%A6%AC%EC%98%A4_*", None, "return=minimal")
tag_rows = [{"contact_id": ids[p], "tag": t} for p, c in items for t in sorted(c["tags"])]
for i in range(0, len(tag_rows), B):
    api("POST", "crm_contact_tags?on_conflict=contact_id,tag", tag_rows[i:i + B], "resolution=ignore-duplicates,return=minimal")
print("꼬리표", len(tag_rows))

new_phones = [p for p, _ in items if p not in existing]
ev = [{"contact_id": ids[p], "kind": "가져옴", "detail": "+".join(sorted(cards[p]["src"])) + f" ({TODAY})"} for p in new_phones]
for i in range(0, len(ev), B):
    api("POST", "crm_contact_events", ev[i:i + B], "return=minimal")
print("새 카드 기록", len(ev))
print("끝")
