import sys

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The corrupted icon array
    old_text1 = "['?룫', '?룪', '?뱢', '?룛截?][index] || '?룫'"
    new_text1 = "['🏢', '🏡', '📈', '🏗️'][index] || '🏢'"
    content = content.replace(old_text1, new_text1)
    
    # The corrupted add scenario button
    old_text2 = "const newList = [...list, { title: '', text: '', icon: '?뙚', bg: 'bg-gray-50', border: 'border-gray-200' }];"
    new_text2 = "const newList = [...list, { title: '', text: '', icon: '🌟', bg: 'bg-gray-50', border: 'border-gray-200' }];"
    content = content.replace(old_text2, new_text2)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

replace_in_file('marketing/report/components/FlyerForm.tsx')
