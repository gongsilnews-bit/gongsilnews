import re

with open('src/components/admin/VacancyRegisterForm.tsx', 'r', encoding='utf-8') as f:
    pc_content = f.read()

# Extract fetchingLedger state
state_match = re.search(r'const \[fetchingLedger, setFetchingLedger\] = useState\(false\);', pc_content)

# Extract fetchBuildingLedger function
func_match = re.search(r'(  const fetchBuildingLedger = async \(\) => \{[\s\S]*?\n  \};)', pc_content)

if func_match:
    print("Found fetchBuildingLedger!")
    # Write to a temp file to inject into page.tsx later
    with open('temp_func.txt', 'w', encoding='utf-8') as tf:
        tf.write(func_match.group(1))
else:
    print("Function not found.")
