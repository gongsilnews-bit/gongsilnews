"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

function BoardReadContent() {
  const searchParams = useSearchParams();
  const boardId = searchParams.get("board_id") || "drone";
  const postId = searchParams.get("post_id");

  // 원래 DB에서 가져올 데이터 대신 UI 확인용 더미
  const boardName = boardId === "drone" ? "드론영상" : boardId === "app" ? "APP(앱)" : boardId === "design" ? "디자인" : boardId === "sound" ? "음원" : "계약서/양식";
  
  return (
    <>
      <div className="w-[1200px] mx-auto pt-[24px] px-[20px] flex justify-between items-end border-b-[2px] border-[#222] pb-[16px] mb-[20px]">
        <div className="text-[22px] font-[800] text-[#102c57]">
          {boardName} <span className="text-[15px] font-normal text-[#888] ml-[8px]">(자료실)</span>
        </div>
        <div className="flex gap-[12px] items-center">
          <div className="flex items-center border border-[#ccc] rounded-[4px] overflow-hidden">
            <input type="text" placeholder="해당 카테고리 검색" className="border-none py-[9px] px-[14px] outline-none w-[200px] text-[14px]" />
            <button className="bg-[#f8f9fa] border-l border-[#ccc] px-[14px] h-[38px] text-[14px] font-[700] text-[#555] hover:bg-[#eee] transition-colors">검색</button>
          </div>
        </div>
      </div>

      <div className="w-[1200px] mx-auto pt-[16px] px-[20px] pb-[10px] flex gap-[10px] flex-wrap">
        <Link href={`/board?id=${boardId}`} className="border border-[#102c57] bg-[#102c57] text-white px-[18px] py-[8px] rounded-[20px] text-[14px] font-semibold cursor-pointer inline-block">전체</Link>
        <Link href={`/board?id=${boardId}`} className="border border-[#ddd] bg-white px-[18px] py-[8px] rounded-[20px] text-[14px] text-[#666] font-semibold cursor-pointer hover:border-[#102c57] hover:text-[#102c57] transition-all inline-block">드론</Link>
        <Link href={`/board?id=${boardId}`} className="border border-[#ddd] bg-white px-[18px] py-[8px] rounded-[20px] text-[14px] text-[#666] font-semibold cursor-pointer hover:border-[#102c57] hover:text-[#102c57] transition-all inline-block">아파트</Link>
        <Link href={`/board?id=${boardId}`} className="border border-[#ddd] bg-white px-[18px] py-[8px] rounded-[20px] text-[14px] text-[#666] font-semibold cursor-pointer hover:border-[#102c57] hover:text-[#102c57] transition-all inline-block">빌딩</Link>
      </div>

      <div className="w-[1200px] mx-auto pt-[20px] px-[20px] pb-[60px] flex gap-[40px] items-start">
        {/* 좌측 콘텐츠 */}
        <div className="flex-1 min-w-0">
          
          {/* Breadcrumb */}
          <div className="text-[14px] text-[#999] mb-[16px] flex items-center gap-[6px]">
            <Link href="/" className="hover:text-[#508bf5] hover:underline">홈</Link>
            <span className="text-[#ccc]">›</span>
            <Link href={`/board?id=${boardId}`} className="hover:text-[#508bf5] hover:underline">자료실</Link>
            <span className="text-[#ccc]">›</span>
            <span className="text-[#333] font-[600]">{boardName}</span>
          </div>

          {/* 게시물 본문 카드 */}
          <div className="bg-white rounded-[8px] border border-[#e0e0e0] border-t-[3px] border-t-[#102c57] overflow-hidden mb-[12px]">
            <div className="px-[32px] pt-[28px] pb-[24px] border-b border-[#f0f0f0]">
              <div className="text-[13px] font-[700] text-[#508bf5] bg-[#508bf5]/10 inline-block px-[10px] py-[4px] rounded-[4px] mb-[12px]">[드론]</div>
              <div className="text-[26px] font-[800] text-[#111] leading-[1.4] mb-[16px]">강남역 사거리 대로변 빌딩 조망권 4K 특급 드론 촬영</div>
              <div className="flex justify-between items-center text-[13px] text-[#888]">
                <div className="flex gap-[16px] items-center">
                  <span className="font-[700] text-[#444]">착한임대</span>
                  <span>2023.10.12 14:30</span>
                </div>
                <span>조회수 <strong className="text-[#888]">126</strong></span>
              </div>
            </div>
            
            <div className="p-[32px]">
              
              {/* Media Area */}
              <div className="mb-[28px] relative pt-[56.25%] h-0 overflow-hidden bg-black rounded-[8px]">
                <iframe 
                  className="absolute top-0 left-0 w-full h-full border-0" 
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0" 
                  allowFullScreen
                ></iframe>
              </div>
              
              {/* Content Area */}
              <div className="text-[16px] leading-[1.8] text-[#333] min-h-[200px]">
                <p className="mb-[1em]">해당 영상은 강남역 사거리 남서쪽에서 테헤란로 및 강남대로 방향으로 촬영된 4K 원본 데이터입니다.</p>
                <p className="mb-[1em]">상업용 건물의 뷰를 확인하거나, 입지 분석을 할 때 자유롭게 사용하실 수 있습니다. 하단 참고자료 링크를 통해 원본 파일을 구글드라이브에서 보관하실 수 있습니다. 무단 상업적 재판매는 법적 불이익을 받을 수 있으니 주의 바랍니다.</p>
              </div>

              {/* Download Box */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] p-[20px_24px] flex items-center justify-between gap-[20px] mt-[40px] mb-[28px]">
                <div>
                  <div className="text-[15px] font-[800] text-[#1e293b] mb-[4px]">참고자료 링크</div>
                  <div className="text-[13px] text-[#64748b]">이 게시물에 관련된 자료나 링크를 제공합니다.</div>
                </div>
                <div className="flex gap-[10px]">
                  <a href="#" className="inline-flex items-center gap-[8px] bg-[#508bf5] text-white px-[22px] py-[11px] rounded-[6px] text-[14px] font-[700] whitespace-nowrap hover:bg-[#2563eb] transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    구글 드라이브 다운로드
                  </a>
                </div>
              </div>

            </div>
          </div>

          {/* Prev / Next */}
          <div className="bg-white border border-[#e0e0e0] rounded-[8px] overflow-hidden mb-[12px]">
            <div className="flex border-b border-[#f0f0f0] min-h-[52px]">
              <div className="w-[90px] shrink-0 bg-[#fafafa] border-r border-[#f0f0f0] flex items-center justify-center text-[13px] font-[700] text-[#555]">▲ 이전글</div>
              <div className="flex-1 px-[20px] py-[14px] text-[14px] text-[#333] flex items-center cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis hover:text-[#508bf5] hover:underline hover:font-[600]">
                서초구 일대 4K 드론 촬영 원본
              </div>
            </div>
            <div className="flex min-h-[52px]">
              <div className="w-[90px] shrink-0 bg-[#fafafa] border-r border-[#f0f0f0] flex items-center justify-center text-[13px] font-[700] text-[#555]">▼ 다음글</div>
              <div className="flex-1 px-[20px] py-[14px] text-[14px] text-[#bbb] flex items-center cursor-default">
                다음 게시글이 없습니다.
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center mb-[24px] mt-[12px]">
            <div className="flex gap-[10px]">
              <button className="border border-[#fca5a5] bg-[#fff5f5] text-[#dc2626] px-[18px] py-[10px] rounded-[6px] text-[14px] font-[600] hover:bg-[#fee2e2] hover:border-[#f87171] transition-all">신고</button>
            </div>
            <div className="flex gap-[10px]">
              <Link href={`/board?id=${boardId}`} className="border border-[#d1d5db] bg-white text-[#555] px-[22px] py-[10px] rounded-[6px] text-[14px] font-[600] hover:bg-[#f9fafb] hover:text-[#111] transition-all inline-block">목록</Link>
              <button className="bg-[#102c57] text-white px-[24px] py-[10px] rounded-[6px] text-[14px] font-[700] hover:bg-[#1a4282] transition-all">글쓰기</button>
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white border border-[#e0e0e0] rounded-[8px] p-[28px_32px]">
            <div className="text-[18px] font-[800] mb-[20px] text-[#111]">1개의 댓글</div>
            
            <div className="border border-[#e5e7eb] rounded-[8px] p-[16px] mb-[24px]">
              <div className="text-[14px] font-[700] text-[#374151] mb-[10px]">비로그인 상태입니다 (게스트)</div>
              <textarea 
                className="w-full h-[80px] border-none resize-none font-[15px] outline-none bg-transparent text-[#333] font-sans" 
                placeholder="게시물에 대한 의견을 남겨보세요. 바르고 고운 말을 사용해주세요." 
                maxLength={400}
              ></textarea>
              <div className="flex justify-between items-center mt-[10px]">
                <span className="text-[12px] text-[#9ca3af]"><span>0</span> / 400</span>
                <button className="bg-[#111] text-white border-none rounded-[6px] px-[24px] py-[9px] font-[700] text-[14px] hover:bg-[#333] cursor-pointer">댓글 등록</button>
              </div>
            </div>
            
            <div>
              <div className="py-[16px]">
                <div className="flex justify-between mb-[8px] text-[13px]">
                  <span className="font-[700] text-[#374151]">부동산마스터</span>
                  <span className="text-[#9ca3af]">2023.10.12 16:04</span>
                </div>
                <div className="text-[15px] text-[#4b5563] leading-[1.5] whitespace-pre-wrap">감사합니다. 빌딩 브리핑 시 아주 유용하게 사용하겠습니다!</div>
              </div>
            </div>
          </div>

        </div>

        {/* 우측 사이드바 */}
        <div className="w-[300px] shrink-0">
          <div className="w-full h-[200px] bg-[#e2e2e2] rounded-[8px] flex items-center justify-center text-[14px] font-bold text-[#888] mb-[24px]">배너 1</div>
          
          <div className="bg-white border border-[#e0e0e0] rounded-[8px] p-[20px] mb-[16px]">
            <div className="text-[15px] font-[800] text-[#111] mb-[16px] pb-[12px] border-b border-[#111] flex justify-between items-end">
              인기 게시물
              <span className="text-[12px] text-[#888] font-normal cursor-pointer hover:underline">더보기</span>
            </div>
            <ul className="m-0 p-0 list-none">
              <li className="flex items-start gap-[12px] mb-[14px] cursor-pointer group">
                <span className="text-[18px] font-[900] text-[#111] w-[14px] italic shrink-0">1</span>
                <span className="text-[14px] text-[#333] leading-[1.4] font-[600] group-hover:text-[#508bf5] group-hover:underline">강남역 사거리 대로변 빌딩 조망권</span>
              </li>
              <li className="flex items-start gap-[12px] mb-[14px] cursor-pointer group">
                <span className="text-[18px] font-[900] text-[#111] w-[14px] italic shrink-0">2</span>
                <span className="text-[14px] text-[#333] leading-[1.4] font-[600] group-hover:text-[#508bf5] group-hover:underline">서초구 일대 4K 드론 촬영 원본</span>
              </li>
              <li className="flex items-start gap-[12px] cursor-pointer group">
                <span className="text-[18px] font-[900] text-[#111] w-[14px] italic shrink-0">3</span>
                <span className="text-[14px] text-[#333] leading-[1.4] font-[600] group-hover:text-[#508bf5] group-hover:underline">송파구 재건축단지 항공뷰(드론)</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </>
  );
}

export default function BoardReadPage() {
  return (
    <div className="min-w-[1200px] overflow-x-auto bg-white font-sans text-[#222]">
      <Header />
      <Suspense fallback={<div className="p-10 text-center">불러오는 중...</div>}>
        <BoardReadContent />
      </Suspense>
      <Footer />
    </div>
  );
}
