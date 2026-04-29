import React from "react";
import Link from "next/link";

interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  imageUrl: string;
}

interface NewsSectionProps {
  title: string;
  items: NewsItem[];
}

export default function NewsSection({ title, items }: NewsSectionProps) {
  return (
    <section className="px-4 py-6 border-b border-gray-100">
      <h2 className="text-[16px] font-bold text-[#1a2e50] mb-4 flex items-center">
        {title} <span className="ml-1 text-[12px]">&gt;</span>
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <Link key={item.id} href={`/m/news/${item.id}`} className="flex gap-3 items-start">
            <div className="w-[100px] h-[64px] bg-gray-200 rounded overflow-hidden flex-shrink-0">
              <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.title} />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2 mb-1">
                {item.title}
              </h3>
              <p className="text-[11px] text-gray-500">{item.date} · {item.source}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
