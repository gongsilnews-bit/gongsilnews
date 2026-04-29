import React from "react";

interface VideoItem {
  id: string;
  title: string;
  imageUrl: string;
  subtitle?: string;
  category?: string;
}

interface VideoSliderProps {
  title: string;
  items: VideoItem[];
  theme?: "light" | "dark";
  cardType?: "video" | "lecture";
}

export default function VideoSlider({ title, items, theme = "light", cardType = "video" }: VideoSliderProps) {
  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-[#1a2e50]" : "bg-white";
  const titleClass = isDark ? "text-white" : "text-[#1a2e50]";
  const paddingClass = isDark ? "py-8" : "py-6 border-b border-gray-100";

  return (
    <section className={`${paddingClass} ${bgClass}`}>
      <div className="px-4 mb-4">
        <h2 className={`text-[16px] font-bold ${titleClass} flex items-center`}>
          {title} <span className="ml-1 text-[12px]">&gt;</span>
        </h2>
      </div>
      <div className="px-4 flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {items.map((item) => (
          cardType === "video" ? (
            <div key={item.id} className={`flex-shrink-0 cursor-pointer ${isDark ? "w-[180px]" : "w-[200px]"}`}>
              <div className={`w-full ${isDark ? "h-[100px]" : "h-[112px]"} ${isDark ? "bg-gray-800 border border-gray-700" : "bg-gray-200"} rounded-lg overflow-hidden relative mb-2`}>
                <img src={item.imageUrl} className={`w-full h-full object-cover ${isDark ? "opacity-80" : ""}`} alt={item.title} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className={`rounded-full border-2 border-white flex items-center justify-center bg-black/50 ${isDark ? "w-8 h-8" : "w-10 h-10"}`}>
                    <svg width={isDark ? "14" : "20"} height={isDark ? "14" : "20"} viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>
              </div>
              <h4 className={`text-[12px] md:text-[13px] font-bold ${isDark ? "text-white" : "text-gray-900"} leading-snug line-clamp-2`}>{item.title}</h4>
              {item.subtitle && <p className="text-[10px] text-gray-400 mt-1">{item.subtitle}</p>}
            </div>
          ) : (
            <div key={item.id} className="w-[220px] flex-shrink-0 cursor-pointer border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="w-full h-[120px] bg-gray-100 relative">
                <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.title} />
              </div>
              <div className="p-3">
                <span className="text-[#3b82f6] text-[10px] font-bold">{item.category}</span>
                <h4 className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2 mt-1">{item.title}</h4>
              </div>
            </div>
          )
        ))}
      </div>
    </section>
  );
}
