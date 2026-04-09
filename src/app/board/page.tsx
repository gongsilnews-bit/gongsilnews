"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function BoardContent() {
  const searchParams = useSearchParams();
  const boardId = searchParams.get("id") || "drone";
  const [activeTab, setActiveTab] = useState("전체");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [postTitle, setPostTitle] = useState("");

  const tabs = ["전체", "드론", "아파트", "빌딩", "단독/다가구/빌라", "도로"];

  const dummyPosts = [
    { title: "강남역 사거리 대로변 빌딩 조망권 4K 특급 드론 촬영", category: "드론", author: "착한임대", views: 125, date: "2023.10.12" },
    { title: "서초구 일대 4K 드론 촬영 원본", category: "빌딩", author: "강남부자", views: 98, date: "2023.10.10" },
    { title: "송파구 재건축단지 항공뷰(드론) 전체 구역 영상", category: "아파트", author: "공인중개사", views: 240, date: "2023.10.05" },
    { title: "마포구 상암동 아파트 단지 전경 드론뷰", category: "아파트", author: "수정부동산", views: 56, date: "2023.10.02" },
    { title: "성수동 꼬마빌딩 건축현장 스케치 타임랩스", category: "빌딩", author: "성수마스터", views: 322, date: "2023.09.28" },
    { title: "여의도 IFC몰 인근 도로 및 교차로 4K", category: "도로", author: "교통매니아", views: 76, date: "2023.09.20" },
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      const tagStr = newTags.map(t => `[${t}] `).join("");
      const curTitle = postTitle.replace(/^(?:\[[^\]]+\]\s*)+/, "");
      setPostTitle(tagStr + curTitle);
      return newTags;
    });
  };

  return (
    <>
      <main className="container px-20" style={{ position: "relative", minHeight: "80vh" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .board-header { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #222; padding-bottom: 15px; }
          .board-title { font-size: 24px; font-weight: 800; color: #102c57; }
          .board-search-write { display: flex; gap: 15px; align-items: center; }
          .b-search { display: flex; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; }
          .b-search input { border: none; padding: 8px 12px; outline: none; width: 220px; font-size: 14px; }
          .b-search button { background: #f8f9fa; border-left: 1px solid #ccc; padding: 0 15px; font-weight: bold; color: #555; }
          .b-write-btn { background: #508bf5; color: #fff; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px; cursor: pointer; transition: background 0.2s; }
          .b-write-btn:hover { background: #16407b; }

          .board-tabs { display: flex; gap: 10px; margin-top: 20px; }
          .b-tab { border: 1px solid #ddd; background: #fff; padding: 8px 16px; border-radius: 20px; font-size: 14px; color: #666; cursor: pointer; font-weight: 600; transition: all 0.2s; }
          .b-tab:hover { border-color: #508bf5; color: #508bf5; }
          .b-tab.active { background: #102c57; color: #fff; border-color: #102c57; }

          .news-layout { display: flex; gap: 40px; margin-top: 20px; margin-bottom: 60px; }
          .news-list-area { flex: 1; }
          
          .news-sidebar { width: 320px; flex-shrink: 0; }
          .sb-banner { width: 100%; height: 200px; background: #e2e2e2; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: #888; margin-bottom: 40px; }
          
          .sb-title { font-size: 16px; font-weight: 800; color: #111; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #111; display: flex; justify-content: space-between; align-items: flex-end; }
          
          /* Popular List */
          .pop-list { list-style: none; margin: 0; padding: 0; }
          .pop-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; cursor:pointer;}
          .pop-item:hover .pop-title { text-decoration: underline; color: #508bf5; }
          .pop-ranking { font-size: 18px; font-weight: 900; color: #111; width: 14px; font-style: italic;}
          .pop-title { font-size: 14px; color: #333; line-height: 1.4; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          
          /* Write Modal */
          .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
          .modal-content { background: #fff; width: 640px; border-radius: 12px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
          .mod-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
          .mod-title { font-size: 20px; font-weight: bold; color: #102c57; }
          .mod-close { font-size: 24px; cursor: pointer; color: #999; }
          .mod-close:hover { color: #333; }
          .mod-row { margin-bottom: 15px; }
          .mod-label { display: block; font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #333; }
          
          .header-tags { display: flex; gap: 8px; flex-wrap: wrap; }
          .h-tag { border: 1px solid #ddd; background: #fdfdfd; padding: 8px 14px; border-radius: 4px; font-size: 13px; color: #555; cursor: pointer; user-select: none; transition: all 0.2s;}
          .h-tag:hover { background: #f0f0f0; }
          .h-tag.selected { background: #508bf5; color: #fff; border-color: #508bf5; font-weight: bold; }
          
          .mod-input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; outline: none; transition: border 0.2s;}
          .mod-input:focus { border-color: #508bf5; }
          .mod-textarea { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; outline: none; height: 180px; resize: none; transition: border 0.2s;}
          .mod-textarea:focus { border-color: #508bf5; }
          .mod-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          .btn-cancel { padding: 10px 20px; border-radius: 4px; border: 1px solid #ccc; background: #fff; font-weight: bold; cursor: pointer; }
          .btn-submit { padding: 10px 20px; border-radius: 4px; border: none; background: #102c57; color: #fff; font-weight: bold; cursor: pointer; }
          
          /* Pagination */
          .pagination { display: flex; justify-content: center; align-items: center; margin-top: 0; gap: 10px; }
          .page-btn { border: 1px solid #ddd; background: #fff; padding: 6px 12px; border-radius: 4px; font-size: 14px; color: #555; cursor: pointer; }
          .page-btn:hover:not(:disabled) { background: #f9f9f9; }
          .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .page-info { font-size: 14px; color: #333; font-weight: bold; margin: 0 10px;}
        `}} />

        <div className="board-header">
          <div className="board-title">
            {boardId === "drone" ? "드론영상" : boardId === "app" ? "APP(앱)" : boardId === "design" ? "디자인" : boardId === "sound" ? "음원" : "계약서/양식"}
            <span style={{ fontSize: 16, fontWeight: 500, color: "#666", marginLeft: 10 }}>(자료실)</span>
          </div>
          <div className="b-search">
            <input type="text" placeholder="제목 검색" />
            <button>검색</button>
          </div>
        </div>

        <div className="board-tabs">
          {tabs.map(tab => (
            <div 
              key={tab} 
              className={`b-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="news-layout">
          <div className="news-list-area">
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 15 }}>
              {dummyPosts.filter(p => activeTab === "전체" || p.category === activeTab).map((p, i) => (
                <Link href={`/board_read?board_id=${boardId}&post_id=${i}`} key={i} className="vid-card" style={{ display: "block", textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
                  <div style={{ height: 140, background: "#222", position: "relative", overflow: "hidden" }}>
                    <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=320&q=80" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} alt="thumb" />
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, background: "rgba(0,0,0,0.6)", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  <div style={{ padding: 15 }}>
                    <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#508bf5", background: "rgba(80,139,245,0.1)", borderRadius: 4, padding: "2px 7px", marginBottom: 7 }}>[{p.category}]</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: "#777", display: "flex", justifyContent: "space-between" }}>
                      <span>{p.author}</span>
                      <span>조회 {p.views} · {p.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", marginTop: 40, marginBottom: 20 }}>
              <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", paddingRight: 10 }}>
                <div className="pagination">
                  <button className="page-btn" disabled>&lt; 이전</button>
                  <span className="page-info">1 / 1</span>
                  <button className="page-btn" disabled>다음 &gt;</button>
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <button 
                  className="b-write-btn" 
                  style={{ background: "#102c57", color: "#fff" }}
                  onClick={() => setIsModalOpen(true)}
                >
                  글쓰기
                </button>
              </div>
            </div>

          </div>
          
          <div className="news-sidebar">
            <div className="sb-banner">
              배너 1
            </div>
            
            <div className="sb-widget">
              <div className="sb-title">인기 게시물</div>
              <ul className="pop-list">
                <li className="pop-item"><span className="pop-ranking">1</span><span className="pop-title">강남역 사거리 대로변 빌딩 조망권</span></li>
                <li className="pop-item"><span className="pop-ranking">2</span><span className="pop-title">서초구 일대 4K 드론 촬영 원본</span></li>
                <li className="pop-item"><span className="pop-ranking">3</span><span className="pop-title">송파구 재건축단지 항공뷰(드론)</span></li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="mod-head">
              <div className="mod-title">자료실 게시글 작성</div>
              <div className="mod-close" onClick={() => setIsModalOpen(false)}>&times;</div>
            </div>
            
            <div className="mod-row">
              <label className="mod-label">머리글 선택 (필수)</label>
              <div className="header-tags">
                {tabs.filter(t => t !== "전체").map(tag => (
                  <div 
                    key={tag} 
                    className={`h-tag ${selectedTags.includes(tag) ? "selected" : ""}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mod-row">
              <label className="mod-label">제목</label>
              <input 
                type="text" 
                className="mod-input" 
                placeholder="제목을 입력하세요 자동으로 머리글이 추가될 수 있습니다."
                value={postTitle}
                onChange={e => setPostTitle(e.target.value)}
              />
            </div>
            
            <div className="mod-row">
              <label className="mod-label">썸네일 이미지 파일 (옵션)</label>
              <input type="file" className="mod-input" style={{ padding: 9, cursor: "pointer" }} />
            </div>

            <div className="mod-row" style={{ marginBottom: 0 }}>
              <label className="mod-label">내용</label>
              <textarea className="mod-textarea" placeholder="내용 및 영상 다운로드 링크 등을 자유롭게 입력하세요."></textarea>
            </div>
            
            <div className="mod-footer">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>취소</button>
              <button className="btn-submit" onClick={() => { alert("게시글 등록이 완료되었습니다. (디자인 목업)"); setIsModalOpen(false); }}>등록</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function BoardPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>게시판을 불러오는 중...</div>}>
        <BoardContent />
      </Suspense>
      <Footer />
    </>
  );
}
