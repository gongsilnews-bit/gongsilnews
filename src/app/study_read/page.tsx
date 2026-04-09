"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function StudyReadPage() {
  const [activeTab, setActiveTab] = useState("introduce");
  
  const scrollToAnchor = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      // Offset by header + sticky tab height (~130px)
      const y = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-w-[1200px] bg-white font-sans text-[#222]">
      <Header />

      <main className="w-[1200px] mx-auto px-[20px] pt-[30px] pb-[100px]">
         {/* Breadcrumb */}
        <div className="text-[13px] text-[#666] mb-[20px] flex items-center gap-[8px]">
           <span className="cursor-pointer hover:font-bold">부동산 특강</span>
           <span className="text-[#ccc]">&gt;</span>
           <span className="cursor-pointer hover:font-bold">중개실무</span>
        </div>

        <div className="flex gap-[40px] relative">
          
          {/* 좌측 메인 콘텐츠 (65%) */}
          <div className="flex-[6.5] min-w-0">
             {/* Thumbnail */}
             <div className="w-full aspect-[16/9] bg-[#f0f0f0] rounded-[4px] overflow-hidden relative mb-[24px]">
               <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80" className="w-full h-full object-cover" alt="클래스 썸네일" />
             </div>

             {/* 타이틀 영역 */}
             <div className="mb-[40px]">
               <div className="text-[14px] font-[700] text-[#8a3ffc] mb-[8px]">매물 접수부터 계약까지 완벽 가이드</div>
               <h1 className="text-[32px] font-[800] text-[#111] leading-[1.3] mb-[12px] break-words">
                 초보 공인중개사도 월 천만 원 버는 상가 중개 실전 비법
               </h1>
               <div className="text-[14px] text-[#666] flex items-center gap-[12px]">
                 <span className="flex items-center gap-[4px]">
                    <span className="w-[24px] h-[24px] rounded-full bg-[#eee] overflow-hidden"><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&q=80" className="w-full h-full object-cover"/></span>
                    부동산마스터 김대표
                 </span>
                 <span className="text-[#eee]">|</span>
                 <span className="flex items-center gap-[4px]">⭐ 4.9 (124)</span>
                 <span className="text-[#eee]">|</span>
                 <span>수강생 2,400명</span>
               </div>
             </div>

             {/* Sticky Tab Menu */}
             <div className="sticky top-[104px] border-b border-[#eee] flex mb-[40px]" style={{ zIndex: 90, backgroundColor: "#ffffff" }}>
                {["introduce", "curriculum", "creator", "review"].map(tabId => {
                  const labels: any = { introduce: "클래스 소개", curriculum: "커리큘럼", creator: "크리에이터", review: "리뷰" };
                  return (
                    <button 
                      key={tabId} 
                      onClick={() => scrollToAnchor(tabId)}
                      className={`flex-1 py-[16px] text-[15px] font-[700] border-b-[3px] transition-colors ${activeTab === tabId ? 'border-[#111] text-[#111]' : 'border-transparent text-[#888] hover:text-[#111]'}`}
                    >
                      {labels[tabId]}
                    </button>
                  );
                })}
             </div>

             {/* 1. 클래스 소개 (introduce) */}
             <div id="introduce" className="pt-[10px] mb-[80px]">
               <h2 className="text-[24px] font-[800] text-[#111] mb-[24px]">이 클래스를 듣고 나면<br/>이런 걸 할 수 있게 될 거예요</h2>
               <div className="grid grid-cols-2 gap-[16px] mb-[40px]">
                 <div className="p-[20px] bg-[#f8f9fa] rounded-[8px]">
                   <div className="text-[20px] mb-[12px]">✅</div>
                   <div className="text-[15px] font-[700] text-[#333]">어려운 상가 임대차 보호법을<br/>쉽게 설명할 수 있습니다.</div>
                 </div>
                 <div className="p-[20px] bg-[#f8f9fa] rounded-[8px]">
                   <div className="text-[20px] mb-[12px]">✅</div>
                   <div className="text-[15px] font-[700] text-[#333]">권리금 협상을 리드하여<br/>계약 성공률을 2배 높입니다.</div>
                 </div>
               </div>

               <div className="text-[16px] leading-[1.8] text-[#333]">
                 <img src="https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=800&q=80" className="w-full rounded-[8px] mb-[20px]" alt="실무 현장" />
                 <p className="mb-[1em]">안녕하세요! 상가 전문 중개 경력 15년 차, 김대표입니다.</p>
                 <p className="mb-[1em]">아파트 중개만으로는 수익에 한계가 느껴지시나요? 권리금 협상이 두려워 상가 중개를 피하고 계신가요?</p>
                 <p className="mb-[1em]">이 클래스에서는 15년간 실패와 성공을 반복하며 깨달은 저만의 상가 중개 실무 노하우를 A부터 Z까지 모두 퍼드립니다. 처음 상가 중개를 시작하시는 분들도 자신 있게 계약서를 쓸 수 있도록, 실제 현장의 생생한 이야기와 함께 쉽게 풀어서 설명해 드립니다.</p>
               </div>
             </div>

             {/* 2. 커리큘럼 (curriculum) */}
             <div id="curriculum" className="pt-[10px] mb-[80px]">
               <h2 className="text-[24px] font-[800] text-[#111] mb-[24px]">커리큘럼</h2>
               <div className="text-[15px] text-[#666] mb-[24px]">총 5 챕터, 24개 세부 강의로 구성되어 있습니다.</div>
               
               <div className="flex flex-col gap-[12px]">
                 {[1, 2, 3, 4, 5].map(chapter => (
                   <div key={chapter} className="border border-[#e5e5e5] rounded-[8px] p-[24px]">
                     <div className="text-[14px] font-[700] text-[#8a3ffc] mb-[8px]">Chapter {chapter}</div>
                     <h3 className="text-[18px] font-[700] text-[#111] mb-[16px]">상가 중개의 첫걸음, 입지와 상권 분석법</h3>
                     <ul className="m-0 p-0 list-none flex flex-col gap-[12px]">
                       {[1, 2, 3].map(lesson => (
                         <li key={lesson} className="flex justify-between items-center text-[15px] text-[#444]">
                           <span className="flex items-center gap-[8px]">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                             {chapter}-{lesson}. {["이것만 알면 상권이 보인다", "유동인구 함정에 속지 않는 법", "임차인이 좋아하는 입지 공식"][lesson - 1]}
                           </span>
                           <span className="text-[#999] text-[13px]">{["12:40", "15:21", "09:35"][lesson - 1]}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 ))}
               </div>
             </div>

             {/* 3. 크리에이터 (creator) */}
             <div id="creator" className="pt-[10px] mb-[80px]">
               <h2 className="text-[24px] font-[800] text-[#111] mb-[24px]">크리에이터 소개</h2>
               <div className="flex gap-[24px] items-center p-[32px] bg-[#f8f9fa] rounded-[12px]">
                 <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80" className="w-[120px] h-[120px] rounded-full object-cover shrink-0" alt="크리에이터" />
                 <div>
                   <h3 className="text-[20px] font-[800] text-[#111] mb-[8px]">부동산마스터 김대표</h3>
                   <div className="text-[15px] leading-[1.6] text-[#555]">
                     - (현) 공실뉴스 부동산 아카데미 대표강사<br/>
                     - (현) 강남역 1번출구 부동산중개법인 대표<br/>
                     - 상가 임대차 계약 누적 건수 1,500건 달성<br/>
                     현장에서 바로 써먹을 수 있는 찐 노하우만 전달하겠습니다.
                   </div>
                 </div>
               </div>
             </div>

             {/* 4. 리뷰 (review) */}
             <div id="review" className="pt-[10px] mb-[40px]">
               <div className="flex justify-between items-end mb-[24px]">
                 <h2 className="text-[24px] font-[800] text-[#111]">실제 수강생 리뷰</h2>
                 <span className="text-[14px] font-[700] text-[#8a3ffc] cursor-pointer hover:underline">리뷰 124개 더보기 &gt;</span>
               </div>
               
               <div className="grid grid-cols-2 gap-[16px]">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="p-[24px] border border-[#e5e5e5] rounded-[8px]">
                      <div className="flex gap-[4px] mb-[12px] text-[#ffc107]">⭐⭐⭐⭐⭐</div>
                      <div className="text-[15px] text-[#333] leading-[1.6] mb-[16px]">
                        {["정말 유익한 강의입니다. 권리금 협상할 때 강사님 말씀 명심했더니 계약이 수월하게 진행되었어요!", 
                          "상가 중개 무서워서 매번 피했는데, 이제 자신감이 좀 생겼습니다. 무한 반복 중!!", 
                          "초보자도 이해하기 너무 쉽게 설명해주십니다. 자료도 꼼꼼해서 큰 도움 돼요.", 
                          "실제 사례를 들어주시니 귀에 쏙쏙 박힙니다. 돈이 아깝지 않은 명강의!"][idx - 1]}
                      </div>
                      <div className="flex justify-between items-center text-[13px] text-[#999]">
                        <span className="font-[600] text-[#666]">user{idx}***님</span>
                        <span>2023.10.1{idx}</span>
                      </div>
                    </div>
                  ))}
               </div>
             </div>

          </div>

          {/* 우측 Sticky 플로팅 박스 (35%) */}
          <div className="flex-[3.5] min-w-0">
             <div className="sticky top-[124px] bg-white border border-[#e5e5e5] rounded-[12px] p-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                
                <div className="text-[13px] font-[700] text-[#eb5757] mb-[8px]">🔥 기간 한정 30% 얼리버드 혜택</div>
                <div className="flex items-end gap-[8px] mb-[8px]">
                  <span className="text-[18px] text-[#888] line-through font-[500]">300,000원</span>
                  <span className="text-[28px] font-[800] text-[#111] leading-none">210,000원</span>
                  <span className="text-[16px] text-[#111] font-[600]">/ 5개월</span>
                </div>
                <div className="text-[13px] text-[#666] mb-[24px] pb-[24px] border-b border-[#eee]">
                  월 42,000원으로 시작하는 상가 중개 마스터
                </div>

                <div className="flex flex-col gap-[12px] mb-[32px]">
                   <div className="text-[14px] font-[700] text-[#111] mb-[4px]">클래스 정보</div>
                   <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                     <span>🎥 24개 강의 (총 4시간 10분)</span>
                   </div>
                   <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                     <span>📝 수업 노트 및 PDF 교재 제공</span>
                   </div>
                   <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                     <span>💬 크리에이터 Q&A 및 피드백</span>
                   </div>
                   <div className="flex items-center gap-[12px] text-[13px] text-[#555]">
                     <span>♾️ 결제 후 5년 무제한 수강</span>
                   </div>
                </div>

                {/* 구매 버튼 */}
                <div className="flex flex-col gap-[10px]">
                   <button className="w-full bg-[#111] text-white py-[18px] rounded-[6px] text-[16px] font-[800] hover:bg-[#333] transition-colors">
                     클래스 수강 시작하기
                   </button>
                   <div className="flex gap-[10px]">
                     <button className="flex-1 py-[14px] rounded-[6px] border border-[#d1d5db] text-[#555] font-[700] hover:bg-[#f9fafb] flex justify-center items-center gap-[6px]">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                       찜하기
                     </button>
                     <button className="flex-1 py-[14px] rounded-[6px] border border-[#d1d5db] text-[#555] font-[700] hover:bg-[#f9fafb] flex justify-center items-center gap-[6px]">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                       공유하기
                     </button>
                   </div>
                </div>

             </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
