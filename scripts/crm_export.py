"""고객관리(CRM) DB → 엑셀 (2026-11-25)

  python scripts/crm_export.py

바탕화면 db 폴더에 고객관리_YYYYMMDD.xlsx 로 저장한다 (프로젝트·GitHub 에 넣지 않음).
첫 줄 고정 · 칸마다 거르기(▼) — 엑셀에서 Ctrl+F 로 찾고 ▼ 로 거르면 된다.
"""
import sys, json, urllib.request, datetime
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
OUT = Path.home() / "Desktop" / "db" / f"고객관리_{datetime.date.today():%Y%m%d}.xlsx"

env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"')
BASE = env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/"
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]


def get(path):
    req = urllib.request.Request(BASE + path, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def all_rows(table, cols, order="id"):
    out, off = [], 0
    while True:
        page = get(f"{table}?select={cols}&order={order}&offset={off}&limit=1000")
        out += page
        if len(page) < 1000:
            return out
        off += 1000


contacts = all_rows("crm_contacts", "id,phone,office_name,name,sido,sigungu,address,sms_status,member_grade,paid_until,no_reply_streak,last_sent_at,last_reaction_at,memo,created_at")
print("카드", len(contacts))
tags = {}
for t in all_rows("crm_contact_tags", "contact_id,tag", "contact_id,tag"):
    tags.setdefault(t["contact_id"], []).append(t["tag"])
print("꼬리표", sum(len(v) for v in tags.values()))

fmt_phone = lambda p: f"{p[:3]}-{p[3:7]}-{p[7:]}" if len(p) == 11 else f"{p[:3]}-{p[3:6]}-{p[6:]}"
day = lambda s: (s or "")[:10]

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "고객관리"
head = ["번호", "상호", "대표자·이름", "시도", "시군구", "주소", "휴대폰", "문자 상태", "꼬리표", "공실뉴스 등급", "유료 만기",
        "연속 무반응", "마지막 보냄", "마지막 반응", "메모", "넣은 날"]
ws.append(head)
for c in contacts:
    ws.append([c["id"], c["office_name"], c["name"], c["sido"], c["sigungu"], c["address"], fmt_phone(c["phone"]), c["sms_status"],
               ", ".join(sorted(tags.get(c["id"], []))), c["member_grade"], day(c["paid_until"]), c["no_reply_streak"],
               day(c["last_sent_at"]), day(c["last_reaction_at"]), c["memo"], day(c["created_at"])])

fill = PatternFill("solid", fgColor="1E3A6E")
for cell in ws[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = fill
    cell.alignment = Alignment(horizontal="center", vertical="center")
ws.freeze_panes = "A2"
ws.auto_filter.ref = ws.dimensions
for col, w in zip("ABCDEFGHIJKLMNOP", [8, 30, 12, 10, 12, 36, 15, 11, 40, 14, 11, 10, 11, 11, 30, 11]):
    ws.column_dimensions[col].width = w

OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
print("저장", OUT)
