"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";
import BookmarkCategoryModal from "@/components/BookmarkCategoryModal";
import { getBookmarkCategories } from "@/app/actions/bookmark";

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - dt.getTime()) / 3600000);
  if (diff < 1) return "Î∞©Í∏à ??;
  if (diff < 24) return `${diff}?úÍ∞Ñ ??;
  const days = Math.floor(diff / 24);
  if (days < 7) return `${days}????;
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

const stripHtml = (html: string) => html ? html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() : "";

export default function MobileNewsBookmarksClient() {
  const router = useRouter();
  const [articles, setArticles] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // ?¥Îçî ?¥Îèô Î™®Îã¨ ?ÅÌÉú
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookmarks() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthModalOpen(true);
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      // Fetch categories
      const catRes = await getBookmarkCategories(user.id, 'ARTICLE');
      if (catRes.success && catRes.categories) {
        setCategories(catRes.categories);
      }

      // Fetch article bookmarks with category_id
      const { data: wishData } = await supabase
        .from("article_bookmarks")
        .select("article_id, category_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (wishData) {
        setBookmarks(wishData);
        const wishIds = wishData.map((row: any) => row.article_id);

        if (wishIds.length > 0) {
          const { data: props } = await supabase
            .from("articles")
            .select("*")
            .in("id", wishIds)
            .eq("status", "APPROVED");

          if (props) {
            const sortedProps = wishIds.map((id: string) => props.find((p: any) => p.id === id)).filter(Boolean);
            setArticles(sortedProps);
          }
        } else {
          setArticles([]);
        }
      }
      setLoading(false);
    }
    fetchBookmarks();
  }, [router, showCategoryModal]);

  // ?†ÌÉù??Ïπ¥ÌÖåÍ≥†Î¶¨??ÎßûÎäî Í∏∞ÏÇ¨ ?ÑÌÑ∞Îß?  const filteredArticles = articles.filter(article => {
    if (selectedCategoryId === 'ALL') return true;
    const bookmark = bookmarks.find(b => b.article_id === article.id);
    if (!bookmark) return false;
    return bookmark.category_id === selectedCategoryId;
  });

  const handleOpenMoveModal = (e: React.MouseEvent, articleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedArticleId(articleId);
    setShowCategoryModal(true);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", marginLeft: "-4px", marginRight: "8px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111", margin: 0 }}>Í¥Ä?¨Í∏∞??<span style={{ color: "#f97316" }}>{articles.length}</span>Í∞?/h2>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 16px', gap: '8px', WebkitOverflowScrolling: 'touch' }} className="no-scrollbar">
        <button
          onClick={() => setSelectedCategoryId('ALL')}
          style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: selectedCategoryId === 'ALL' ? 700 : 500,
            background: selectedCategoryId === 'ALL' ? '#1e56a0' : '#f3f4f6', color: selectedCategoryId === 'ALL' ? '#fff' : '#4b5563',
            border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          ?ÑÏ≤¥
        </button>
        <button
          onClick={() => setSelectedCategoryId(null)}
          style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: selectedCategoryId === null ? 700 : 500,
            background: selectedCategoryId === null ? '#1e56a0' : '#f3f4f6', color: selectedCategoryId === null ? '#fff' : '#4b5563',
            border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          Í∏∞Î≥∏ ?¥Îçî
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: selectedCategoryId === cat.id ? 700 : 500,
              background: selectedCategoryId === cat.id ? '#1e56a0' : '#f3f4f6', color: selectedCategoryId === cat.id ? '#fff' : '#4b5563',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px 20px", background: "#fff", flex: 1 }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>Î°úÎî© Ï§?..</div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>?îñ</div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#333", marginBottom: "8px" }}>?¥Îãπ ?¥Îçî??Í¥Ä?¨Í∏∞?¨Í? ?ÜÏäµ?àÎã§.</p>
            <p style={{ fontSize: "14px" }}>Í∏∞ÏÇ¨?êÏÑú Î∂ÅÎßà???ÑÏù¥ÏΩòÏùÑ ?åÎü¨ Ï∂îÍ??¥Î≥¥?∏Ïöî.</p>
          </div>
        ) : (
          filteredArticles.map((article: any) => (
            <Link
              href={`/m/news/${article.id}`}
              key={article.id}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px 0",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
                background: "#fff",
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626" }}>NEWS</span>
                <button 
                  onClick={(e) => handleOpenMoveModal(e, article.id)}
                  style={{ background: '#f3f4f6', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#4b5563', cursor: 'pointer' }}
                >
                  ?¥Îçî ?¥Îèô
                </button>
              </div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#111", lineHeight: 1.35, marginBottom: "10px", wordBreak: "keep-all" }}>
                {article.title}
              </div>
              <div style={{ fontSize: "14px", color: "#666", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "14px" }}>
                {article.subtitle || stripHtml(article.content || "").slice(0, 100)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#222", fontWeight: 500 }}>
                  {formatDate(article.published_at || article.created_at)} ¬∑ {article.author_name || "Í≥µÏã§?¥Ïä§"}
                  {article.location_name && ` ¬∑ ?ìç${article.location_name}`}
                </span>
                <span style={{ color: "#f97316", fontWeight: 700 }}>
                  Í∏∞ÏÇ¨?ÅÏÑ∏Î≥¥Í∏∞ &gt;
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {currentUser && showCategoryModal && selectedArticleId && (
        <BookmarkCategoryModal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            setSelectedArticleId(null);
          }}
          userId={currentUser.id}
          itemId={selectedArticleId}
          type="ARTICLE"
          onSuccess={() => alert("?¥Îçî ?¥Îèô???ÑÎ£å?òÏóà?µÎãà??")}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => router.push("/m")}
          initialTab="login"
        />
      )}
    </div>
  );
}
