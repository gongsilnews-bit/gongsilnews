import re

with open('src/app/m/admin/vacancy/write/page.tsx', 'r', encoding='utf-8') as f:
    mobile_content = f.read()

with open('temp_func.txt', 'r', encoding='utf-8') as f:
    func_content = f.read()

# 1. Inject state: const [fetchingLedger, setFetchingLedger] = useState(false);
# Find a place after other states
state_injection_point = mobile_content.find('const [submitting, setSubmitting] = useState(false);')
if state_injection_point != -1:
    mobile_content = mobile_content[:state_injection_point] + 'const [fetchingLedger, setFetchingLedger] = useState(false);\n  ' + mobile_content[state_injection_point:]

# 2. Inject function
func_injection_point = mobile_content.find('const handleNextStep = () => {')
if func_injection_point != -1:
    mobile_content = mobile_content[:func_injection_point] + func_content + '\n\n  ' + mobile_content[func_injection_point:]

# 3. Inject button in STEP 2
# Let's find: {/* 2. 거래/금액 */} inside STEP 2
step2_trade = mobile_content.find('        {/* 2. 거래/금액 */}')

button_code = '''
        {propertyType !== "아파트·오피스텔" && propertyType !== "빌라·주택" && propertyType !== "원룸·투룸(풀옵션)" && subCategory !== "토지" && (
          <div style={{ padding: "0 16px 12px" }}>
            <button 
              type="button" 
              onClick={fetchBuildingLedger}
              disabled={fetchingLedger}
              style={{ 
                width: "100%", height: 46, 
                background: fetchingLedger ? "#e5e7eb" : "linear-gradient(135deg, #fef3c7, #fde68a)", 
                color: fetchingLedger ? "#9ca3af" : "#d97706", 
                border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, 
                cursor: fetchingLedger ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: fetchingLedger ? "none" : "0 4px 12px rgba(217,119,6,0.15)", transition: "all 0.2s"
              }}
            >
              <span style={{ fontSize: 18 }}>{fetchingLedger ? "⏳" : "✨"}</span>
              {fetchingLedger ? "AI 데이터 불러오는 중..." : "AI 건축물대장 자동완성"}
            </button>
          </div>
        )}
'''

if step2_trade != -1:
    mobile_content = mobile_content[:step2_trade] + button_code + mobile_content[step2_trade:]

with open('src/app/m/admin/vacancy/write/page.tsx', 'w', encoding='utf-8') as f:
    f.write(mobile_content)

print("Injected logic and button to mobile.")
