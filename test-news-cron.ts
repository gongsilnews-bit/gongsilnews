import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import Parser from 'rss-parser';
import { NewsArticleAgent } from './src/lib/agents/NewsArticleAgent';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const parser = new Parser();

const CATEGORY_MAP = [
  { category: "부동산·주식·재테크", keyword: "부동산 OR 주식 OR 재테크" }
];

async function run() {
  console.log("Starting test run...");
  for (const item of CATEGORY_MAP) {
    try {
      console.log(`Fetching RSS for ${item.category}...`);
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(item.keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
      const feed = await parser.parseURL(rssUrl);
      console.log(`Found ${feed.items.length} items`);
      
      const latestItem = feed.items[0];
      const sourceText = `[참고 뉴스 팩트]\n제목: ${latestItem.title}\n요약: ${latestItem.contentSnippet || latestItem.content || ''}`;
      console.log("Source Text:", sourceText.substring(0, 100) + '...');

      console.log("Calling AI Agent...");
      const aiResult = await NewsArticleAgent.writeArticle({
        sourceText: sourceText,
        category: item.category
      });
      console.log("AI Result:", aiResult.title);

      console.log("Inserting to DB...");
      const { data, error } = await supabase.from('articles').insert({
        title: aiResult.title,
        subtitle: aiResult.subtitle,
        content: aiResult.content,
        section1: item.category,
        section2: "일반",
        keywords: aiResult.keywords,
        status: 'DRAFT',
      }).select('id').single();

      if (error) throw error;
      console.log("Success! ID:", data.id);
    } catch (err) {
      console.error("Error:", err);
    }
  }
}

run();
