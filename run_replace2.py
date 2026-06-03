import sys

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_text1 = '''              const visiblePages = info.visiblePages || [1, 2, 3, 4, 5, 6];
              
              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = visiblePages.length === 6;
                  isVisible = isAllSelected;
              } else {
                  isVisible = visiblePages.includes(tab.id as number);
              }'''
              
    new_text1 = '''              let visiblePages = [...(info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7])];
              if (!visiblePages.includes(0)) visiblePages.push(0);
              
              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = visiblePages.length >= 6;
                  isVisible = isAllSelected;
              } else {
                  isVisible = visiblePages.includes(tab.id as number);
              }'''
              
    content = content.replace(old_text1.replace('\r\n', '\n'), new_text1)
    content = content.replace(old_text1, new_text1)
    
    old_text3 = "{(activeTab === 0 || (activeTab === 'all' && (info.visiblePages || []).includes(0))) && ("
    new_text3 = "{(activeTab === 0 || activeTab === 'all') && ("
    content = content.replace(old_text3, new_text3)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

replace_in_file('marketing/report/components/FlyerForm.tsx')
