import re

with open('src/components/admin/VacancyRegisterForm.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx_trade = content.find('            {/* 거래유형 */}')
idx_divider = content.find('            {/* ── 구분선 ── */}')
idx_detail = content.find('            {/* ── 섹션 4: 상세 ── */}')

if idx_trade != -1 and idx_divider != -1 and idx_detail != -1:
    part0 = content[:idx_trade]
    part1 = content[idx_trade:idx_divider]
    part2 = content[idx_divider:idx_detail]
    part3 = content[idx_detail:]

    # Rename headers
    part0 = part0.replace('섹션 1: 공실광고정보', '섹션 1: 분류 및 주소')
    part0 = part0.replace('공실광고정보 (전세, 월세, 단기 임대정보)', '공실 분류 및 위치 주소')

    new_part1_title = '''            {/* ── 구분선 ── */}
            <div style={{ borderTop: 1px dashed , margin: "32px 0" }} />

            {/* ── 섹션 2: 거래 및 상세 정보 ── */}
            <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 24px", borderBottom: 2px solid , paddingBottom: 16 }}>
              거래 및 상세 정보 (전세, 월세, 면적 등)
            </h2>

'''
    
    # modify part2
    part2 = part2.replace('섹션 2: 위치/주소', '위치/주소')

    # Since part2 includes its own top divider (which it will bring with it), we don't need to add another one for it.
    new_content = part0 + part2 + new_part1_title + part1 + part3
    
    with open('src/components/admin/VacancyRegisterForm.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("PC form reordered.")
else:
    print(f"Failed. trade:{idx_trade}, divider:{idx_divider}, detail:{idx_detail}")

