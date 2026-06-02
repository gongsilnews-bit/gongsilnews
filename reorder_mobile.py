import re

with open('src/app/m/admin/vacancy/write/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace STEP_LABELS
content = content.replace('const STEP_LABELS = ["기본정보", "위치정보", "상세정보", "마무리"];', 'const STEP_LABELS = ["분류/주소", "가격/면적", "상세", "마무리"];')

m_step1 = re.search(r' {8}\{\/\* .*? STEP 1: .*? \*\/\}\n', content)
m_trade = re.search(r' {8}\{\/\* 2\. 거래\/금액 \*\/\}\n', content)
m_step2 = re.search(r' {8}\{\/\* .*? STEP 2: .*? \*\/\}\n', content)
m_addr = re.search(r' {8}\{\/\* 4\. 주소 \*\/\}\n', content)
m_step3 = re.search(r' {8}\{\/\* .*? STEP 3: .*? \*\/\}\n', content)

if m_step1 and m_trade and m_step2 and m_addr and m_step3:
    idx_step1 = m_step1.start()
    idx_trade = m_trade.start()
    idx_step2 = m_step2.start()
    idx_addr = m_addr.start()
    idx_step3 = m_step3.start()
    
    idx_step1_end = content.rfind('        </>)}', idx_trade, idx_step2)
    idx_step2_end = content.rfind('        </>)}', idx_addr, idx_step3)
    
    if idx_step1_end != -1 and idx_step2_end != -1:
        pre_step1 = content[:idx_step1]
        
        block_a = content[idx_step1:idx_trade]
        # Replace only the string inside block_a
        block_a = re.sub(r'STEP 1: .*? ═══', 'STEP 1: 분류/주소 ═══', block_a)
        
        block_b = content[idx_trade:idx_step1_end]
        block_c = content[idx_addr:idx_step2_end]
        
        post_step3 = content[idx_step3:]
        
        new_step1 = block_a + block_c + '        </>)}\n\n'
        new_step2_header = '        {/* ═══ STEP 2: 가격/면적 ═══ */}\n        {currentStep === 2 && (<>\n'
        new_step2 = new_step2_header + block_b + '        </>)}\n\n'
        
        new_content = pre_step1 + new_step1 + new_step2 + post_step3
        
        with open('src/app/m/admin/vacancy/write/page.tsx', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Mobile form successfully reordered.")
    else:
        print("Failed to find end tags.")
else:
    print("Failed to match blocks.")
