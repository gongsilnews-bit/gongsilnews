"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  getInquiryPosts,
  getInquiryCounts,
  getInquiryPost,
  getInquiryCategories,
  replyToInquiry,
  type InquiryListItem,
  type InquiryStatus,
} from "@/app/actions/inquiryBoard";

type Tab = "전체" | InquiryStatus;
const TABS: Tab[] = ["전체", "신규", "답변완료"];

type Comment = { id: string; author_name: string | null; content: string; created_at: string };
type Attachment = { id: string; file_url: string; file_name: string; file_type?: string | null };
type Detail = {
  id: string;
  content: string | null;
  board_attachments?: Attachment[];
  board_comments?: Comment[];
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

export default function MobileInquiryAdminPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [adminName, setAdminName] = useState("최고관리자");
  const [adminId, setAdminId] = useState<string | undefined>(undefined);

  const [tab, setTab] = useState<Tab>("전체");
  const [category, setCategory] = useState("전체");
  const [categories, setCategories] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [items, setItems] = useState<InquiryListItem[]>([]);
  const [counts, setCounts] = useState({ 전체: 0, 신규: 0, 답변완료: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 펼친 문의의 본문/답글
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // 최고관리자 전용
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("name, role").eq("id", user.id).single();
      const r = data?.role?.trim().toUpperCase() || "";
      if (!(r === "ADMIN" || r === "최고관리자" || r.includes("관리자"))) {
        alert("최고관리자 전용 기능입니다.");
        router.push("/m");
        return;
      }
      setAdminId(user.id);
      setAdminName(data?.name || "최고관리자");
      setAuthChecked(true);
      void getInquiryCategories().then(res => { if (res.success) setCategories(res.data); });
    })();
  }, [router]);

  // 필터를 바꾸는 순간 로딩 표시는 핸들러에서 켠다.
  // (이펙트 안에서 동기로 setState 하면 렌더가 한 번 더 도는 것을 피한다)
  const changeFilter = (fn: () => void) => { setLoading(true); setOpenId(null); fn(); };

  // 목록 + 건수 (필터가 바뀌면 1페이지부터 다시 읽는다)
  useEffect(() => {
    if (!authChecked) return;
    let alive = true;
    void (async () => {
      const [listRes, countRes] = await Promise.all([
        getInquiryPosts({ status: tab, category, keyword, page: 1 }),
        getInquiryCounts({ category, keyword }),
      ]);
      if (!alive) return; // 빠르게 필터를 바꾸면 늦게 온 응답이 덮어쓰지 않도록
      if (listRes.success) {
        setItems(listRes.data);
        setTotal(listRes.total);
        setPage(1);
      }
      if (countRes.success) setCounts(countRes.data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [authChecked, tab, category, keyword]);

  const loadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    const res = await getInquiryPosts({ status: tab, category, keyword, page: next });
    if (res.success) {
      setItems(prev => [...prev, ...res.data]);
      setPage(next);
    }
    setLoadingMore(false);
  };

  const toggleOpen = async (id: string) => {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    setOpenId(id);
    setDetail(null);
    setReplyText("");
    setDetailLoading(true);
    const res = await getInquiryPost(id);
    if (res.success) setDetail(res.data as Detail);
    setDetailLoading(false);
  };

  const submitReply = async (postId: string) => {
    if (!replyText.trim()) return;
    setReplying(true);
    const res = await replyToInquiry({
      postId,
      authorId: adminId,
      authorName: adminName,
      content: replyText,
    });
    setReplying(false);
    if (!res.success) { alert("답변 등록 실패: " + res.error); return; }

    setReplyText("");
    // 방금 단 답변을 바로 보여주고, 목록 상태도 답변완료로 맞춘다
    const fresh = await getInquiryPost(postId);
    if (fresh.success) setDetail(fresh.data as Detail);
    setItems(prev => prev.map(i =>
      i.id === postId
        ? { ...i, status: "답변완료" as InquiryStatus, answered_at: new Date().toISOString(), reply_count: i.reply_count + 1 }
        : i
    ));
    const countRes = await getInquiryCounts({ category, keyword });
    if (countRes.success) setCounts(countRes.data);
  };

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>확인 중...</div>
        </div>
      </div>
    );
  }

  const hasMore = items.length < total;

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "#fff",
        borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 52,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: "#111", margin: 0 }}>1:1 문의관리</h1>
        <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>전체 {counts.전체}건</span>
      </div>

      {/* 상태 탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e5e7eb" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => changeFilter(() => setTab(t))} style={{
            flex: 1, padding: "12px 0", fontSize: 14, fontWeight: tab === t ? 800 : 500,
            border: "none", background: "none", cursor: "pointer",
            color: tab === t ? "#111" : "#6b7280",
            borderBottom: tab === t ? "2px solid #111" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {t} <span style={{ color: t === "신규" && counts.신규 > 0 ? "#dc2626" : "#9ca3af", fontWeight: 700 }}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* 검색 + 카테고리 */}
      <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") changeFilter(() => setKeyword(keywordInput.trim())); }}
            placeholder="제목·내용·이름·연락처 검색"
            style={{ flex: 1, minWidth: 0, padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, outline: "none" }}
          />
          <button
            onClick={() => changeFilter(() => setKeyword(keywordInput.trim()))}
            style={{ flexShrink: 0, padding: "0 16px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#111827", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            검색
          </button>
        </div>

        {categories.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
            {["전체", ...categories].map(c => (
              <button key={c} onClick={() => changeFilter(() => setCategory(c))} style={{
                flexShrink: 0, padding: "6px 13px", fontSize: 13, fontWeight: 700, borderRadius: 16, cursor: "pointer",
                border: category === c ? "1px solid #111827" : "1px solid #e5e7eb",
                background: category === c ? "#111827" : "#fff",
                color: category === c ? "#fff" : "#6b7280",
              }}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 목록 */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
            {keyword || category !== "전체" ? "조건에 맞는 문의가 없습니다." : "접수된 문의가 없습니다."}
          </div>
        ) : (
          items.map(it => {
            const isOpen = openId === it.id;
            const isNew = it.status === "신규";
            return (
              <div key={it.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <button
                  onClick={() => toggleOpen(it.id)}
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 16px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 5,
                      background: isNew ? "#fee2e2" : "#dcfce7", color: isNew ? "#dc2626" : "#15803d",
                    }}>
                      {it.status}
                    </span>
                    {it.category && (
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#ff8e15" }}>[{it.category}]</span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>{formatDate(it.created_at)}</span>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.45, marginBottom: 6 }}>
                    {it.title}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 12.5, color: "#6b7280" }}>
                    <span style={{ fontWeight: 600 }}>{it.author_name || "익명"}</span>
                    {it.author_phone && <a href={`tel:${it.author_phone}`} onClick={e => e.stopPropagation()} style={{ color: "#2563eb", textDecoration: "none" }}>{it.author_phone}</a>}
                    {it.author_email && <span>{it.author_email}</span>}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 16px", background: "#fafbfc" }}>
                    {detailLoading ? (
                      <div style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>불러오는 중...</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 14 }}>
                          {detail?.content || "내용이 없습니다."}
                        </div>

                        {(detail?.board_attachments || []).length > 0 && (
                          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14 }}>
                            {(detail?.board_attachments || []).map(a => (
                              <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.file_url} alt={a.file_name} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* 주고받은 답글 */}
                        {(detail?.board_comments || []).map(c => (
                          <div key={c.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: "#111827" }}>{c.author_name || "익명"}</span>
                              <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{formatDate(c.created_at)}</span>
                            </div>
                            <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.content}</div>
                          </div>
                        ))}

                        {/* 답변 작성 */}
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="답변을 입력하세요."
                          rows={3}
                          style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, outline: "none", resize: "vertical", fontFamily: "inherit", marginTop: 4 }}
                        />
                        <button
                          onClick={() => submitReply(it.id)}
                          disabled={replying || !replyText.trim()}
                          style={{
                            width: "100%", marginTop: 8, padding: "12px 0", fontSize: 14.5, fontWeight: 800,
                            color: "#fff", background: replyText.trim() ? "#111827" : "#cbd5e1",
                            border: "none", borderRadius: 8, cursor: replyText.trim() ? "pointer" : "not-allowed",
                          }}
                        >
                          {replying ? "등록 중..." : "답변 등록"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {hasMore && !loading && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{ padding: "13px 0", fontSize: 14, fontWeight: 700, color: "#374151", background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, cursor: "pointer" }}
          >
            {loadingMore ? "불러오는 중..." : `더보기 (${items.length}/${total})`}
          </button>
        )}
      </div>
    </div>
  );
}
