"""각 비주얼(이미지) 레이어를 텍스트 없이 PNG로 내보내는 스크립트.
텍스트는 Node(ag-psd) 단계에서 편집 가능한 네이티브 텍스트 레이어로 추가한다.
"""
import json
import os
import numpy as np
from PIL import Image as PILImage, ImageDraw

W = 700
HERO_H = 520
CURR_TOP = HERO_H
CARD_W, CARD_H, GAP, GRID_LEFT = 300, 225, 20, 40
ROW1_TOP = CURR_TOP + 150
LABEL_H = 60
ROW2_TOP = ROW1_TOP + CARD_H + LABEL_H + GAP
BOTTOM_TOP = ROW2_TOP + CARD_H + LABEL_H + GAP
BOTTOM_W, BOTTOM_H = 260, 195
H = BOTTOM_TOP + BOTTOM_H + LABEL_H + 40

OUT_DIR = "psd_layers"
os.makedirs(OUT_DIR, exist_ok=True)
manifest = {"width": W, "height": H, "layers": []}


def blank():
    return PILImage.new("RGBA", (W, H), (0, 0, 0, 0))


def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def vgradient(box, top_color, bottom_color):
    l, t, r, b = box
    h, w = b - t, r - l
    grad = PILImage.new("RGBA", (w, h))
    top, bot = np.array(top_color), np.array(bottom_color)
    for y in range(h):
        ratio = y / max(h - 1, 1)
        color = tuple((top * (1 - ratio) + bot * ratio).astype(int)) + (255,)
        ImageDraw.Draw(grad).line([(0, y), (w, y)], fill=color)
    layer = blank()
    layer.paste(grad, (l, t))
    return layer


def save_layer(name, group, pil_img, bbox):
    """bbox 영역만 잘라 PNG로 저장하고 매니페스트에 위치 정보를 기록."""
    l, t, r, b = bbox
    cropped = pil_img.crop((l, t, r, b))
    fname = f"{group}__{name}".replace(" ", "_").replace("/", "-") + ".png"
    cropped.save(os.path.join(OUT_DIR, fname))
    manifest["layers"].append({
        "group": group, "name": name, "type": "image",
        "file": fname, "left": l, "top": t, "right": r, "bottom": b,
    })


def add_text(name, group, left, top, right, bottom, text, size, color, bold=True,
             align="left", colored_runs=None):
    manifest["layers"].append({
        "group": group, "name": name, "type": "text",
        "left": left, "top": top, "right": right, "bottom": bottom,
        "text": text, "size": size, "color": color, "bold": bold, "align": align,
        "colored_runs": colored_runs or [],
    })


# ── 히어로 배경 ──
hero_bg = vgradient((0, 0, W, HERO_H), (11, 31, 107), (28, 19, 69))
save_layer("히어로 배경 그라데이션", "히어로 섹션", hero_bg, (0, 0, W, HERO_H))

# ── 플로팅 문서 일러스트 ──
docs_layer = blank()
doc_specs = [(60, 60, -18), (140, 44, 10), (490, 90, -8), (620, 58, 20), (95, 150, 24), (560, 156, -22)]
for cx, cy, angle in doc_specs:
    card = PILImage.new("RGBA", (80, 104), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    rounded_rect(cd, (0, 0, 74, 96), 6, (219, 233, 255, 235))
    for i in range(4):
        cd.line([(10, 20 + i * 12), (64, 20 + i * 12)], fill=(30, 58, 138, 60), width=4)
    card = card.rotate(angle, expand=True, resample=PILImage.BICUBIC)
    docs_layer.paste(card, (cx, cy), card)
save_layer("플로팅 문서 일러스트", "히어로 섹션", docs_layer, (0, 30, W, 270))

# ── 부동산 배지 아이콘 ──
badge_l = blank()
d = ImageDraw.Draw(badge_l)
d.ellipse((6, 90, 138, 222), fill=(200, 224, 255, 255))
d.rounded_rectangle((42, 126, 120, 204), radius=16, fill=(255, 90, 31, 255))
d.polygon([(81, 128), (52, 160), (110, 160)], fill=(255, 90, 31, 255))
d.rectangle((70, 168, 92, 196), fill=(255, 255, 255, 255))
save_layer("부동산 배지 아이콘", "히어로 섹션", badge_l, (0, 84, 144, 228))

# ── AI 배지 아이콘 ──
badge_r = blank()
d = ImageDraw.Draw(badge_r)
d.ellipse((562, 90, 694, 222), fill=(124, 58, 237, 255))
d.ellipse((586, 114, 670, 198), fill=(14, 18, 51, 255))
save_layer("AI 배지 아이콘(원)", "히어로 섹션", badge_r, (556, 84, 700, 228))

# ── SELECT 뱃지 배경(pill) ──
badge_select = blank()
d = ImageDraw.Draw(badge_select)
rounded_rect(d, (40, 270, 232, 306), 18, (217, 255, 62, 255))
save_layer("SELECT 뱃지 배경", "히어로 섹션", badge_select, (34, 264, 238, 312))

add_text("AI 아이콘 텍스트", "히어로 섹션", 606, 140, 656, 172, "AI", 26, (255, 255, 255), align="center")
add_text("SELECT 뱃지 텍스트", "히어로 섹션", 56, 278, 226, 300, "공실뉴스 SELECT", 15, (14, 18, 51), align="left")
add_text("서브 문구", "히어로 섹션", 40, 316, 400, 336, "AI & 자동화 부동산 마케팅", 16, (159, 180, 255), align="left")
add_text(
    "헤드라인 텍스트", "히어로 섹션", 40, 348, 620, 440, "AI로 완성하는 매출형\n부동산 마케팅", 32, (255, 255, 255),
    align="left", colored_runs=[{"length": 8, "color": None}, {"length": 3, "color": [127, 215, 255]}]
)

# ── 커리큘럼 배경 ──
curr_bg = vgradient((0, CURR_TOP, W, H), (215, 236, 255), (188, 220, 255))
save_layer("커리큘럼 배경", "커리큘럼 섹션", curr_bg, (0, CURR_TOP, W, H))

add_text("커리큘럼 타이틀", "커리큘럼 섹션", 0, CURR_TOP + 36, W, CURR_TOP + 72, "이런 것을 배울 거에요", 26, (13, 27, 61), align="center")
add_text(
    "리드 문구", "커리큘럼 섹션", 0, CURR_TOP + 86, W, CURR_TOP + 132,
    "챗GPT와 자동화 툴을 활용한\n수익형 부동산 마케팅 포트폴리오 제작하기", 15, (30, 58, 138), align="center"
)


def card_bg_layer(box, colors, name, group):
    layer = blank()
    l, t, r, b = box
    w, h = r - l, b - t
    grad = PILImage.new("RGBA", (w, h))
    top, bot = np.array(colors[0]), np.array(colors[1])
    for y in range(h):
        ratio = y / max(h - 1, 1)
        color = tuple((top * (1 - ratio) + bot * ratio).astype(int)) + (255,)
        ImageDraw.Draw(grad).line([(0, y), (w, y)], fill=color)
    mask = PILImage.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=14, fill=255)
    layer.paste(grad, (l, t), mask)
    save_layer(name, group, layer, box)


card1_box = (GRID_LEFT, ROW1_TOP, GRID_LEFT + CARD_W, ROW1_TOP + CARD_H)
card2_box = (GRID_LEFT + CARD_W + GAP, ROW1_TOP, GRID_LEFT + CARD_W * 2 + GAP, ROW1_TOP + CARD_H)
card3_box = (GRID_LEFT, ROW2_TOP, GRID_LEFT + CARD_W, ROW2_TOP + CARD_H)
card4_box = (GRID_LEFT + CARD_W + GAP, ROW2_TOP, GRID_LEFT + CARD_W * 2 + GAP, ROW2_TOP + CARD_H)
bottom_box = ((W - BOTTOM_W) // 2, BOTTOM_TOP, (W - BOTTOM_W) // 2 + BOTTOM_W, BOTTOM_TOP + BOTTOM_H)

card_bg_layer(card1_box, ((30, 41, 59), (51, 65, 85)), "카드1 썸네일(매물SEO)", "커리큘럼 섹션")
card_bg_layer(card2_box, ((76, 29, 149), (124, 58, 237)), "카드2 썸네일(전단지구조)", "커리큘럼 섹션")
card_bg_layer(card3_box, ((15, 23, 42), (30, 58, 138)), "카드3 썸네일(ChatGPT)", "커리큘럼 섹션")
card_bg_layer(card4_box, ((5, 150, 105), (16, 185, 129)), "카드4 썸네일(SNS자동화)", "커리큘럼 섹션")
card_bg_layer(bottom_box, ((11, 15, 30), (11, 15, 30)), "하단카드 썸네일", "커리큘럼 섹션")


def cx(box):
    return (box[0] + box[2]) // 2


def cy(box):
    return (box[1] + box[3]) // 2


add_text("카드1 배지문구", "커리큘럼 섹션", card1_box[0], cy(card1_box) - 12, card1_box[2], cy(card1_box) + 12, "🔍 매물 SEO", 15, (255, 255, 255), align="center")
add_text("카드1 캡션", "커리큘럼 섹션", card1_box[0], card1_box[3] + 12, card1_box[2], card1_box[3] + 60, "AI로 고효율 수익형 매물\n키워드를 발굴하고 배치하는 전략", 14, (16, 35, 79), align="left")

add_text("카드2 배지문구", "커리큘럼 섹션", card2_box[0], cy(card2_box) - 36, card2_box[2], cy(card2_box) + 36, "결론 · 클로징 멘트\n본문 · 매물 강점\n도입 · 후킹 문구", 12, (255, 255, 255), align="center")
add_text("카드2 캡션", "커리큘럼 섹션", card2_box[0], card2_box[3] + 12, card2_box[2], card2_box[3] + 60, "클릭을 유도하고 끝까지 읽히는\n매물 전단지 기획 구조", 14, (16, 35, 79), align="left")

add_text("카드3 배지문구", "커리큘럼 섹션", card3_box[0], cy(card3_box) - 12, card3_box[2], cy(card3_box) + 12, "✨ ChatGPT", 15, (255, 255, 255), align="center")
add_text("카드3 캡션", "커리큘럼 섹션", card3_box[0], card3_box[3] + 12, card3_box[2], card3_box[3] + 60, "챗GPT 초안 생성부터\nAI 이미지 제작까지의 실전 루틴", 14, (16, 35, 79), align="left")

add_text("카드4 배지문구", "커리큘럼 섹션", card4_box[0], cy(card4_box) - 12, card4_box[2], cy(card4_box) + 12, "📢 SNS 자동화", 15, (255, 255, 255), align="center")
add_text("카드4 캡션", "커리큘럼 섹션", card4_box[0], card4_box[3] + 12, card4_box[2], card4_box[3] + 60, "블로그·인스타 등 채널 자동 발행,\n제휴 마케팅 수익 극대화 노하우", 14, (16, 35, 79), align="left")

add_text("하단카드 배지문구", "커리큘럼 섹션", bottom_box[0], cy(bottom_box) - 12, bottom_box[2], cy(bottom_box) + 12, "🎬 공실뉴스 AI", 15, (255, 255, 255), align="center")
add_text("하단카드 캡션", "커리큘럼 섹션", 0, bottom_box[3] + 12, W, bottom_box[3] + 60, "매물 글을 유튜브·인스타로\n재가공하는 효율적인 시스템", 14, (16, 35, 79), align="center")

with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print("Exported", len(manifest["layers"]), "layers ->", OUT_DIR)
