import sys

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_text = '''const mergeStateWithDefaults = (loaded: any): FlyerState => {
  return {
    ...loaded,
    info: {
      ...INITIAL_INFO,
      ...(loaded?.info || {}),'''
      
    new_text = '''const mergeStateWithDefaults = (loaded: any): FlyerState => {
  let mergedVisiblePages = loaded?.info?.visiblePages || INITIAL_INFO.visiblePages;
  if (!mergedVisiblePages.includes(0)) mergedVisiblePages = [0, ...mergedVisiblePages];
  if (!mergedVisiblePages.includes(7)) mergedVisiblePages = [...mergedVisiblePages, 7];
  mergedVisiblePages.sort((a: number, b: number) => a - b);

  return {
    ...loaded,
    info: {
      ...INITIAL_INFO,
      ...(loaded?.info || {}),
      visiblePages: mergedVisiblePages,'''

    content = content.replace(old_text.replace('\r\n', '\n'), new_text)
    content = content.replace(old_text, new_text)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

replace_in_file('marketing/report/App.tsx')
