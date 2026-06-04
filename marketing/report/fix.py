import os

filepath = 'components/FlyerCanvas.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'value={info.page2HighlightBoxTitle ||' in line:
        lines[i] = '                                            value={info.page2HighlightBoxTitle || "매물 핵심 하이라이트"}\n'
    elif 'value={(info as any).page2ChartBoxTitle ||' in line:
        lines[i] = '                                        value={(info as any).page2ChartBoxTitle || "주변 시세 리포트"}\n'
    elif '{showChart ? "' in line and ' : "' in line:
        lines[i] = '                                    {showChart ? "차트 숨기기" : "차트 보이기"}\n'
    elif 'headers: [' in line and '"층수"' in line and '"]' not in line:
        lines[i] = '        headers: ["층수", "호실", "면적", "금액", "용도", "비고"],\n'
    elif 'value={(info as any).leaseSummaryText ||' in line:
        lines[i] = '                                        value={(info as any).leaseSummaryText || "총 6개 층 / 보증금 0원 / 월세 0원"}\n'
    elif 'title={info.page5Title ||' in line:
        lines[i] = '                        title={info.page5Title || "입지 및 위치도"}\n'
    elif '{ type: "kakao", label:' in line:
        lines[i] = '                                    { type: "kakao", label: "카카오맵" },\n'
    elif '{ type: "google", label:' in line:
        lines[i] = '                                    { type: "google", label: "구글맵" },\n'

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
