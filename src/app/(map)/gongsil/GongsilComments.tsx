import React from "react";

interface GongsilComment {
  id: string;
  parent_id?: string | null;
  author_id?: string;
  author_name?: string;
  profile_image_url?: string;
  is_secret?: boolean;
  content?: string;
  created_at: string;
}

interface GongsilUser {
  id?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}

interface GongsilCommentsProps {
  targetProp: { owner_id?: string };
  comments: GongsilComment[];
  currentUser: GongsilUser | null;
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  isSecret: boolean;
  setIsSecret: React.Dispatch<React.SetStateAction<boolean>>;
  replyTarget: GongsilComment | null;
  setReplyTarget: React.Dispatch<React.SetStateAction<GongsilComment | null>>;
  handleCommentSubmit: () => void;
}

export default function GongsilComments({
  targetProp,
  comments,
  currentUser,
  newComment,
  setNewComment,
  isSecret,
  setIsSecret,
  replyTarget,
  setReplyTarget,
  handleCommentSubmit,
}: GongsilCommentsProps) {
  const rootComments = comments.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const renderComment = (comment: GongsilComment, depth = 0): React.ReactNode => {
    const children = getChildren(comment.id);
    const isCommentOwner = currentUser?.id === comment.author_id;
    const isPropertyOwner = currentUser?.id === targetProp.owner_id;
    const canView = !comment.is_secret || isCommentOwner || isPropertyOwner;
    const dateStr = new Date(comment.created_at)
      .toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .replace(/\.$/, "");

    return (
      <div key={comment.id} id={`comment-${comment.id}`} style={{ paddingLeft: depth > 0 ? 30 : 0, paddingBottom: 20, paddingTop: 20, borderBottom: depth === 0 ? "1px solid #f0f0f0" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {depth > 0 && <span style={{ color: "#aaa", fontWeight: "bold" }}>↳</span>}
            {comment.profile_image_url ? (
              <img src={comment.profile_image_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #e5e7eb" }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: depth > 0 ? "#e8f0fe" : "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: depth > 0 ? "#508bf5" : "#666", flexShrink: 0 }}>
                {(comment.author_name || "회")[0]}
              </div>
            )}
            <span style={{ fontSize: 14, fontWeight: "bold", color: "#111" }}>{comment.author_name || "회원"}</span>
            {comment.is_secret && <span style={{ fontSize: 10, color: "#ef4444", border: "1px solid #fca5a5", padding: "1px 4px", borderRadius: 4, fontWeight: "bold" }}>비밀글</span>}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{dateStr}</div>
        </div>

        <div style={{ fontSize: 14, color: canView ? "#333" : "#999", lineHeight: 1.6, marginBottom: 12, wordBreak: "break-word" }}>
          {canView ? comment.content : "등록자와 작성자만 볼 수 있는 비밀글입니다."}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#666" }}>
            <span style={{ fontSize: 14 }}>👍</span><span style={{ fontSize: 13, fontWeight: "bold" }}>0</span>
          </button>
          <button style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#666" }}>
            <span style={{ fontSize: 14 }}>👎</span><span style={{ fontSize: 13, fontWeight: "bold" }}>0</span>
          </button>
          {currentUser && canView && (
            <button onClick={(e) => { e.preventDefault(); if (replyTarget?.id === comment.id) setReplyTarget(null); else { setReplyTarget(comment); setIsSecret(comment.is_secret ?? false); } }} style={{ background: "none", border: "none", padding: 0, fontSize: 13, color: "#666", cursor: "pointer", fontWeight: "bold" }}>
              답글
            </button>
          )}
        </div>

        {replyTarget?.id === comment.id && (
          <div style={{ marginTop: 16, background: "#f8f9fa", borderRadius: 8, border: "1px solid #e5e7eb", padding: 16 }}>
            <textarea value={newComment} onChange={(e) => setNewComment(e.target.value.substring(0, 400))} placeholder="답글을 남겨보세요" style={{ width: "100%", height: 80, border: "1px solid #d1d5db", borderRadius: 4, padding: "12px", fontSize: 14, outline: "none", resize: "vertical", marginBottom: 12, boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#555" }}><input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} style={{ width: 14, height: 14 }} />비밀답글</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setReplyTarget(null)} style={{ padding: "8px 16px", background: "#fff", color: "#555", border: "1px solid #d1d5db", borderRadius: 4, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>취소</button>
                <button onClick={handleCommentSubmit} disabled={!newComment.trim()} style={{ padding: "8px 16px", background: newComment.trim() ? "#9ca3af" : "#cbd5e1", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", cursor: newComment.trim() ? "pointer" : "default", fontSize: 13 }}>답글 등록</button>
              </div>
            </div>
          </div>
        )}
        <div>{children.map((child) => renderComment(child, depth + 1))}</div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 20, borderTop: "10px solid #f5f5f5", padding: "30px 20px 40px" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 20 }}>{comments.length}개의 댓글상담</div>
      {!replyTarget && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 40, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#111", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>{currentUser ? currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "회원" : "비회원"}</div>
          <textarea id="gongsil-comment-input" value={newComment} onChange={(e) => setNewComment(e.target.value.substring(0, 400))} placeholder={currentUser ? "가격을 제안하거나, 궁금한 점을 남겨보세요. 등록자와의 1:1 상담입니다." : "로그인 후 이용하실 수 있습니다."} disabled={!currentUser} style={{ width: "100%", height: 80, border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px", fontSize: 14, outline: "none", resize: "vertical", marginBottom: 16, boxSizing: "border-box", fontFamily: "inherit" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}><span style={{ fontSize: 13, color: "#666", fontWeight: "bold" }}><span style={{ color: "#111" }}>{newComment.length}</span> / 400</span><label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#555" }}><input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} style={{ width: 14, height: 14 }} />비밀댓글</label></div>
            <button onClick={handleCommentSubmit} disabled={!currentUser || !newComment.trim()} style={{ padding: "8px 24px", background: currentUser && newComment.trim() ? "#9ca3af" : "#cbd5e1", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", cursor: currentUser && newComment.trim() ? "pointer" : "default", fontSize: 14 }}>등록</button>
          </div>
        </div>
      )}
      <div>{comments.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#888", fontSize: 13 }}>아직 등록된 문의가 없습니다.</div> : <div>{rootComments.map((c) => renderComment(c, 0))}</div>}</div>
    </div>
  );
}
