import os
import shutil
import re

base_dir = r"src/app/m"
news_dir = os.path.join(base_dir, "news")
components_dir = os.path.join(base_dir, "_components")

# 1. Move MobileNewsClient.tsx to _components
if os.path.exists(os.path.join(news_dir, "MobileNewsClient.tsx")):
    shutil.move(os.path.join(news_dir, "MobileNewsClient.tsx"), os.path.join(components_dir, "MobileNewsClient.tsx"))

# 2. Update Categories in MobileNewsClient.tsx
client_file = os.path.join(components_dir, "MobileNewsClient.tsx")
with open(client_file, 'r', encoding='utf-8') as f:
    content = f.read()

old_categories = r"const CATEGORIES = \[.*?\];"
new_categories = '''const CATEGORIES = [
  { key: "local", label: "우리동네뉴스", path: "/m/news_map" },
  { key: "news_gongsil", label: "공실뉴스", path: "/m/news_gongsil" },
  { key: "news_politics", label: "부동산·경제", path: "/m/news_politics" },
  { key: "news_marketing", label: "AI마케팅", path: "/m/news_marketing" },
  { key: "news_etc", label: "라이프·오피니언", path: "/m/news_etc" },
];'''
content = re.sub(old_categories, new_categories, content, flags=re.DOTALL)

# Update onClick handler
old_onclick = r'''onClick=\{\(\) => \{ 
                    if \(cat\.key === "부동산마케팅"\) \{
                      router\.push\("/m/news_marketing"\);
                      return;
                    \}
                    if \(pathname === "/m/news_marketing"\) \{
                      router\.push\(`/m/news\?tab=\$\{cat\.key\}`\);
                      return;
                    \}
                    setActiveTab\(cat\.key\); 
                    setClusterMode\(false\); 
                    const url = new URL\(window\.location\.href\);
                    url\.searchParams\.set\("tab", cat\.key\);
                    window\.history\.replaceState\(null, '', url\.pathname \+ url\.search\);
                  \}\}'''
new_onclick = '''onClick={() => { router.push(cat.path); }}'''
content = re.sub(old_onclick, new_onclick, content)

with open(client_file, 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Create route folders and page.tsx
routes = [
    {"folder": "news_map", "key": "local", "section1": "우리동네부동산"},
    {"folder": "news_gongsil", "key": "news_gongsil", "section1": "공실뉴스"},
    {"folder": "news_politics", "key": "news_politics", "section1": "부동산·경제"},
    {"folder": "news_marketing", "key": "news_marketing", "section1": "AI마케팅"},
    {"folder": "news_etc", "key": "news_etc", "section1": "라이프·오피니언"}
]

for route in routes:
    os.makedirs(os.path.join(base_dir, route['folder']), exist_ok=True)
    page_content = f'''import React from "react";
import MobileNewsClientWrapper from "../_components/MobileNewsClient";
import {{ getArticles, getAuthorProfileByName }} from "@/app/actions/article";

export const revalidate = 60;

export default async function MobileNewsPage({{
  searchParams,
}}: {{
  searchParams: {{ author_name?: string; keyword?: string }};
}}) {{
  const resolvedParams = await Promise.resolve(searchParams);
  const authorMatch = resolvedParams.author_name;
  const keywordMatch = resolvedParams.keyword;
  
  const filters: any = {{ status: "APPROVED", limit: 30, section1: "{route['section1']}" }};
  if (authorMatch) filters.author_name = authorMatch;
  if (keywordMatch) filters.keyword = keywordMatch;

  const res = await getArticles(filters);
  const initialArticles = res.success ? res.data || [] : [];
  
  let authorProfile = null;
  if (authorMatch) {{
    const profileRes = await getAuthorProfileByName(authorMatch);
    if (profileRes.success && profileRes.data) {{
      authorProfile = profileRes.data;
    }}
  }}

  return <MobileNewsClientWrapper initialTab="{route['key']}" initialArticles={{initialArticles}} initialAuthorName={{authorMatch}} initialKeyword={{keywordMatch}} authorProfile={{authorProfile}} />;
}}
'''
    with open(os.path.join(base_dir, route['folder'], "page.tsx"), 'w', encoding='utf-8') as f:
        f.write(page_content)

print("Done")
