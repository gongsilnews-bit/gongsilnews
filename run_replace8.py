import sys

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the ROADMAP_ICONS array
    start_idx = content.find("const ROADMAP_ICONS = [")
    end_idx = content.find("];", start_idx) + 2
    
    if start_idx != -1 and end_idx != -1:
        new_icons = '''const ROADMAP_ICONS = [
                          { value: '🏢', label: '빌딩/오피스' },
                          { value: '🏡', label: '주택/거주' },
                          { value: '📈', label: '성장/수익' },
                          { value: '🏗️', label: '건설/개발' },
                          { value: '💰', label: '자산/투자' },
                          { value: '🤝', label: '계약/협력' },
                          { value: '🚀', label: '혁신/미래' },
                          { value: '🎯', label: '목표/타겟' },
                          { value: '💡', label: '아이디어' },
                          { value: '📊', label: '분석/데이터' },
                          { value: '🛡️', label: '안전/보안' },
                          { value: '🚆', label: '역세권/교통' },
                          { value: '🏥', label: '의료/병원' },
                          { value: '🏪', label: '상가/리테일' },
                          { value: '👑', label: '프리미엄' },
                          { value: '🌟', label: '핵심가치' }
                      ];'''
        content = content[:start_idx] + new_icons + content[end_idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

replace_in_file('marketing/report/components/FlyerForm.tsx')
