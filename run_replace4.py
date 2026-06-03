import sys

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add hiddenFlyerRef
    old_text1 = "const flyerRef = useRef<HTMLDivElement>(null);"
    new_text1 = "const flyerRef = useRef<HTMLDivElement>(null);\n  const hiddenFlyerRef = useRef<HTMLDivElement>(null);"
    content = content.replace(old_text1, new_text1)

    # 2. Update generateHtmlContent
    old_text2 = '''  const generateHtmlContent = async (): Promise<string | null> => {
    if (!flyerRef.current) return null;
    try {
        const clone = flyerRef.current.cloneNode(true) as HTMLElement;'''
    new_text2 = '''  const generateHtmlContent = async (): Promise<string | null> => {
    if (!hiddenFlyerRef.current) return null;
    try {
        const clone = hiddenFlyerRef.current.cloneNode(true) as HTMLElement;'''
    content = content.replace(old_text2.replace('\r\n', '\n'), new_text2)
    content = content.replace(old_text2, new_text2)

    # 3. Update downloadJpg
    old_text3 = '''  const downloadJpg = async (selectedIds: string[]) => {
    if (!flyerRef.current) return;
    try {
      const element = flyerRef.current;'''
    new_text3 = '''  const downloadJpg = async (selectedIds: string[]) => {
    if (!hiddenFlyerRef.current) return;
    try {
      const element = hiddenFlyerRef.current;'''
    content = content.replace(old_text3.replace('\r\n', '\n'), new_text3)
    content = content.replace(old_text3, new_text3)

    # 4. Update downloadPdf
    old_text4 = '''  const downloadPdf = async () => {
    if (!flyerRef.current) return;
    try {
        // Clone the element to filter sections without affecting the view
        const clone = flyerRef.current.cloneNode(true) as HTMLElement;'''
    new_text4 = '''  const downloadPdf = async () => {
    if (!hiddenFlyerRef.current) return;
    try {
        // Clone the element to filter sections without affecting the view
        const clone = hiddenFlyerRef.current.cloneNode(true) as HTMLElement;'''
    content = content.replace(old_text4.replace('\r\n', '\n'), new_text4)
    content = content.replace(old_text4, new_text4)

    # 5. Add hidden FlyerCanvas in JSX
    old_text5 = '''                <div className="w-[860px] shrink-0 print:w-[1122px] print:mx-auto print:shrink">
                    <FlyerCanvas 
                      ref={flyerRef} 
                      data={state} 
                      activeTab={activeTab}
                      onUpdateInfo={(info) => setState(prev => ({ ...prev, info }))}
                    />
                </div>
            </div>'''
    new_text5 = '''                <div className="w-[860px] shrink-0 print:w-[1122px] print:mx-auto print:shrink">
                    <FlyerCanvas 
                      ref={flyerRef} 
                      data={state} 
                      activeTab={activeTab}
                      onUpdateInfo={(info) => setState(prev => ({ ...prev, info }))}
                    />
                </div>
                {/* Hidden canvas for full export regardless of activeTab */}
                <div className="absolute top-[-9999px] left-[-9999px] opacity-0 pointer-events-none w-[1122px]">
                    <FlyerCanvas 
                      ref={hiddenFlyerRef} 
                      data={state} 
                      activeTab="all"
                      onUpdateInfo={() => {}}
                    />
                </div>
            </div>'''
    content = content.replace(old_text5.replace('\r\n', '\n'), new_text5)
    content = content.replace(old_text5, new_text5)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

replace_in_file('marketing/report/App.tsx')
