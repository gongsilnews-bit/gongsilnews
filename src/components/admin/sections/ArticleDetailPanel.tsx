"use client";

import React, { useState, useEffect } from "react";
import "./article-detail.css";
import { getArticleDetail, deleteArticle, adminUpdateArticleStatus } from "@/app/actions/article";
import { getComments } from "@/app/actions/comment";
import { getArticleReactions } from "@/app/actions/reaction";
import { createClient } from "@/utils/supabase/client";

interface ArticleDetailPanelProps {
  articleId: string;
  onBack: () => void;
  onEdit: () => void;
}

export default function ArticleDetailPanel({ articleId, onBack, onEdit }: ArticleDetailPanelProps) {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<'pc'|'tablet'|'mobile'>('pc');
  const [comments, setComments] = useState<any[]>([]);
  const [reactionCounts, setReactionCounts] = useState<any>({ INFO: 0, INTERESTING: 0, AGREE: 0, ANALYSIS: 0, RECOMMEND: 0 });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Sidebar memo
  const [memo, setMemo] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getArticleDetail(articleId).then(res => {
      if (res.success && res.data) setArticle(res.data);
      setLoading(false);
    });

    getComments(articleId, null).then(res => {
      if (res.success && res.data) setComments(res.data);
    });

    getArticleReactions(articleId, null).then(res => {
      if (res.success && res.counts) setReactionCounts(res.counts);
    });

    // Load article logs
    const supabase = createClient();
    supabase.from('article_comments').select('*').eq('article_id', articleId).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      // Use comments as pseudo-logs if no separate log table exists
    });
  }, [articleId]);

  // Build edit history from article data
  useEffect(() => {
    if (!article) return;
    const history: any[] = [];
    if (article.created_at) history.push({ title: '작성', date: article.created_at });
    if (article.published_at) history.push({ title: '발행', date: article.published_at });
    if (article.updated_at && article.updated_at !== article.created_at) history.push({ title: '최근 수정', date: article.updated_at });
    setLogs(history);
  }, [article]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>로딩중...</div>;
  if (!article) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>기사를 찾을 수 없습니다.</div>;

  const formatDate = (dt: string) => {
    if (!dt) return '-';
    const d = new Date(dt);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // YouTube ID extraction (same logic as NewsReadContent)
  const extractYoutubeId = (url?: string, html?: string): string | null => {
    const rx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
    if (url) { const m = url.match(rx); if (m) return m[1]; }
    if (html) { const m = html.match(rx); if (m) return m[1]; }
    return null;
  };
  const youtubeId = extractYoutubeId(article.youtube_url, article.content);
  const hasYoutube = !!youtubeId;

  const articleUrl = `/news/${article.article_no || article.id}`;
  const isPublished = article.status === 'APPROVED';

  const handleStatusChange = async (newStatus: string) => {
    const label = newStatus === 'APPROVED' ? '승인(발행)' : newStatus === 'REJECTED' ? '반려' : '상태변경';
    if (!confirm(`이 기사를 ${label}하시겠습니까?`)) return;
    const res = await adminUpdateArticleStatus([article.id], newStatus as any);
    if (res.success) setArticle({ ...article, status: newStatus });
  };

  // Root comments + children
  const rootComments = comments.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const renderComment = (comment: any, depth: number = 0) => {
    const children = getChildren(comment.id);
    return (
      <div key={comment.id} className="adp-comment-item" style={{ paddingLeft: depth * 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="adp-comment-author">
            {depth > 0 && <span style={{ color: '#9ca3af', marginRight: 4 }}>↳</span>}
            {comment.author_name || '익명'}
            {comment.is_secret && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, border: '1px solid #fca5a5', padding: '1px 4px', borderRadius: 4, marginLeft: 4 }}>비밀글</span>}
          </span>
          <span className="adp-comment-date">{formatDate(comment.created_at)}</span>
        </div>
        <div className="adp-comment-content">
          {comment.is_secret ? '비밀 댓글입니다.' : comment.content}
        </div>
        <div className="adp-comment-actions">
          <span className="adp-like-btn">👍 {comment.likeCount || 0}</span>
          <span className="adp-like-btn">👎 {comment.dislikeCount || 0}</span>
        </div>
        {children.map(child => renderComment(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="adp-wrapper">
      <div className="adp-main">
        {/* Device Toggle */}
        <div className="adp-device-bar">
          {(['pc','tablet','mobile'] as const).map(d => (
            <button key={d} className={`adp-device-btn ${device === d ? 'adp-active' : ''}`} onClick={() => setDevice(d)}>
              {d === 'pc' ? '💻' : d === 'tablet' ? '📱' : '📲'}
            </button>
          ))}
        </div>

        <div className={`adp-frame adp-${device}`}>
          {/* Breadcrumb */}
          <div className="adp-breadcrumb">
            🏠 HOME &gt; {article.section1 || '뉴스'} &gt; {article.section2 || '전체'}
          </div>

          {/* Title */}
          <h1 className="adp-title">{article.title}</h1>

          {/* Meta */}
          <div className="adp-meta">
            <span className="adp-meta-author">{article.author_name || '공실뉴스'}</span>
            <span className="adp-meta-divider" />
            <span>입력 {formatDate(article.published_at || article.created_at)}</span>
            {article.updated_at && article.updated_at !== article.created_at && (
              <>
                <span className="adp-meta-divider" />
                <span>수정 {formatDate(article.updated_at)}</span>
              </>
            )}
            <span className="adp-meta-divider" />
            <span>조회수 {article.view_count || 0}</span>
          </div>

          {/* Admin Toolbar */}
          <div className="adp-toolbar">
            <button className="adp-toolbar-btn" onClick={onBack}>➖ 목록</button>
            <button className="adp-toolbar-btn" onClick={onEdit}>✏️ 수정</button>
            <button className="adp-toolbar-btn" onClick={async () => { if(confirm('이 기사를 삭제하시겠습니까?')) { await deleteArticle(article.id); onBack(); } }}>🗑️ 삭제</button>
            <button className="adp-toolbar-btn" onClick={() => { const url = `${window.location.origin}${articleUrl}`; navigator.clipboard?.writeText(url).then(() => alert('URL 복사됨')); }}>🔗 주소복사</button>
            <button className="adp-toolbar-btn" onClick={() => window.open(articleUrl)}>💻 미리보기</button>
            {!isPublished && <button className="adp-toolbar-btn adp-green" onClick={() => handleStatusChange('APPROVED')}>✓ 승인</button>}
            {!isPublished && <button className="adp-toolbar-btn adp-red" onClick={() => handleStatusChange('REJECTED')}>🚫 반려</button>}
            {isPublished && (
              <span style={{ padding: '6px 14px', background: '#10b981', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>발행중</span>
            )}
          </div>

          {/* Subtitle */}
          {article.subtitle && (
            <div style={{ background: '#f8f9fa', padding: '16px 20px', borderRadius: 8, marginBottom: 20, color: '#333', fontSize: 15, lineHeight: 1.7, borderLeft: '4px solid #3b82f6' }}>
              {article.subtitle}
            </div>
          )}

          {/* YouTube Embed */}
          {hasYoutube && (
            <div className={`adp-youtube-wrap ${article.is_shorts ? 'adp-shorts' : ''}`}>
              <iframe src={`https://www.youtube.com/embed/${youtubeId}`} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          )}

          {/* Thumbnail (only if no YouTube and not in content) */}
          {!hasYoutube && article.thumbnail_url && !(article.content && article.content.includes(article.thumbnail_url)) && (
            <img className="adp-thumbnail" src={article.thumbnail_url} alt={article.title} />
          )}

          {/* Article Body */}
          {article.content && (
            <div className="adp-body" dangerouslySetInnerHTML={{
              __html: article.content
                .replace(/<p[^>]*>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/p>/gi, '')
                .replace(/<div(?:(?!class="article-body")[^>]*)?>\\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/div>/gi, '')
                .replace(/<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>/gi, '')
            }} />
          )}

          {/* Keywords */}
          {article.article_keywords && article.article_keywords.length > 0 && (
            <div className="adp-keywords">
              {article.article_keywords.map((kw: any, i: number) => (
                <span key={i} className="adp-keyword-tag">#{kw.keyword}</span>
              ))}
            </div>
          )}

          {/* Reactions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <div style={{ fontSize: 14, color: '#666', display: 'flex', gap: 16 }}>
              {[
                { type: 'INFO', icon: '💡', label: '쏠쏠정보' },
                { type: 'INTERESTING', icon: '🤓', label: '흥미진진' },
                { type: 'AGREE', icon: '😊', label: '공감백배' },
                { type: 'ANALYSIS', icon: '✨', label: '분석탁월' },
                { type: 'RECOMMEND', icon: '👍', label: '후속강추' },
              ].map(rp => (
                <div key={rp.type} className="adp-reaction-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="adp-reaction-icon">{rp.icon}</span>
                    <span className="adp-reaction-label">{rp.label}</span>
                  </div>
                  <span className="adp-reaction-count">{reactionCounts[rp.type] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Author Footer */}
          <div className="adp-author-footer">
            <div>
              <span className="adp-author-name">{article.author_name || '공실뉴스'}</span>
              <span className="adp-author-role">추천·공감</span>
              <span style={{ color: '#999', fontSize: 13, marginLeft: 12 }}>
                이메일쓰기 공실뉴스 인기기사를 보려면 공유
              </span>
            </div>
            <div className="adp-copyright">저작권자 © 공실뉴스 무단전재 및 재배포 금지</div>
          </div>

          {/* Comments Section */}
          <div className="adp-comments">
            <div className="adp-comments-header">
              <div className="adp-comments-count">{comments.length}개의 댓글</div>
            </div>

            <div className="adp-comment-box">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#9ca3af' }}>관리자 미리보기</div>
              <textarea className="adp-comment-textarea" placeholder="댓글을 남겨보세요" readOnly />
              <div className="adp-comment-footer">
                <span style={{ fontSize: 13, color: '#6b7280' }}>0 / 400</span>
                <button className="adp-comment-submit" disabled>등록</button>
              </div>
            </div>

            {comments.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>첫 댓글을 남겨보세요.</div>
            ) : (
              <div>
                {rootComments.map(c => renderComment(c, 0))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="adp-sidebar">
        <div className="adp-sidebar-card">
          <div className="adp-sidebar-title">📝 기사 서비스 로그</div>
          <textarea className="adp-memo-textarea" placeholder="이 기사에 서비스 메모를 남겨주세요..." value={memo} onChange={e => setMemo(e.target.value)} />
          <div className="adp-memo-footer">
            <button className="adp-memo-btn" onClick={() => { if (memo.trim()) { setLogs(prev => [{ title: memo, date: new Date().toISOString() }, ...prev]); setMemo(''); } }}>등록</button>
          </div>
          {logs.length === 0 && <div style={{ color: '#999', fontSize: 13, marginTop: 12 }}>등록된 로그가 없습니다.</div>}
        </div>

        <div className="adp-sidebar-card">
          <div className="adp-sidebar-title">📋 기사 편집기록</div>
          {logs.map((log, i) => (
            <div key={i} className="adp-log-item">
              <div className="adp-log-title">① {log.title}</div>
              <div className="adp-log-date">{formatDate(log.date)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
