"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminSectionProps } from "./types";
import {
  getInquiryPosts,
  getInquiryPost,
  getInquiryCategories,
  getInquiryCounts,
  replyToInquiry,
  type InquiryListItem,
  type InquiryStatus,
} from "@/app/actions/inquiryBoard";
import { INQUIRY_PAGE_SIZE } from "@/constants/inquiry";

type Attachment = { id: string; file_url: string; file_name: string; file_type?: string | null };
type Comment = { id: string; author_name: string; content: string; created_at: string };
type InquiryDetail = {
  id: string;
  title: string;
  category: string;
  content: string;
  author_name: string;
  author_phone?: string;
  author_email?: string;
  created_at: string;
  board_attachments?: Attachment[];
  board_comments?: Comment[];
};

const TABS: (InquiryStatus | "전체")[] = ["전체", "신규", "답변완료"];

const formatDate = (s?: string) => (s ? new Date(s).toLocaleDateString("ko-KR") : "-");

interface Props extends AdminSectionProps {
  /** 회원 관리자페이지에서 쓸 때: 본인 문의만 보여준다 */
  memberId?: string;
  /** 답변 작성자 이름 (관리자/회원) */
  replyAuthorName?: string;
  /** 답변 작성자 id */
  replyAuthorId?: string;
}

export default function InquiryBoardSection({ theme, memberId, replyAuthorName, replyAuthorId }: Props) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const isMemberView = !!memberId;

  const [rows, setRows] = useState<InquiryListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InquiryStatus | "전체">("전체");
  const [category, setCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ 전체: 0, 신규: 0, 답변완료: 0 });
  const [loadError, setLoadError] = useState("");

  const [selected, setSelected] = useState<InquiryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    // 건수는 목록과 같은 조건으로 따로 센다 (본문 없이 개수만 세는 쿼리)
    void getInquiryCounts({ authorId: memberId, category, keyword: activeKeyword }).then(res => {
      if (res.success) setCounts(res.data);
    });

    const res = await getInquiryPosts({
      authorId: memberId,
      status: tab,
      category,
      keyword: activeKeyword,
      page,
    });
    if (res.success) {
      setRows(res.data);
      setTotal(res.total);
    } else {
      setRows([]);
      setTotal(0);
      setLoadError(res.error || "문의를 불러오지 못했습니다.");
    }
    setLoading(false);
  }, [memberId, tab, category, activeKeyword, page]);

  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);

  useEffect(() => {
    void getInquiryCategories().then(res => {
      if (res.success) setCategories(res.data);
    });
  }, []);

  const openDetail = async (id: string) => {
    if (selected?.id === id) {
      setSelected(null);
      return;
    }
    setDetailLoading(true);
    setReply("");
    const res = await getInquiryPost(id);
    if (res.success && res.data) setSelected(res.data as InquiryDetail);
    else alert("문의를 불러오지 못했습니다.");
    setDetailLoading(false);
  };

  const submitReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    const res = await replyToInquiry({
      postId: selected.id,
      authorId: replyAuthorId,
      authorName: replyAuthorName || (isMemberView ? "작성자" : "최고관리자"),
      content: reply,
    });
    setSaving(false);
    if (!res.success) {
      alert("답변 등록 실패: " + res.error);
      return;
    }
    setReply("");
    await openDetail(selected.id);
    await load();
  };

  const totalPages = Math.max(1, Math.ceil(total / INQUIRY_PAGE_SIZE));

  const statusChip = (status: InquiryStatus) => (
    <span style={{
      padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
      background: status === "신규" ? "#fef2f2" : "#ecfdf5",
      color: status === "신규" ? "#dc2626" : "#059669",
      border: `1px solid ${status === "신규" ? "#fecaca" : "#a7f3d0"}`,
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
          {isMemberView ? "내 1:1 문의" : "1:1 문의 관리"}
        </h1>
        <span style={{ fontSize: 13, color: textSecondary }}>
          (미답변 {counts.신규}건 / 전체 {counts.전체}건)
        </span>
        {isMemberView && (
          <a
            href="/board_write?board_id=inquiry"
            style={{ marginLeft: "auto", height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            + 새 문의 작성
          </a>
        )}
      </div>

      {/* 검색 + 카테고리 */}
      <div style={{ background: cardBg, borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>카테고리</span>
        {["전체", ...categories].map(c => (
          <button
            key={c}
            onClick={() => { setCategory(c); setPage(1); }}
            style={{
              height: 32, padding: "0 14px", borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              border: category === c ? "none" : `1px solid ${border}`,
              background: category === c ? "#374151" : (darkMode ? "#2c2d31" : "#fff"),
              color: category === c ? "#fff" : textSecondary,
            }}
          >
            {c}
          </button>
        ))}
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(keyword); setPage(1); } }}
          placeholder="문의자, 연락처, 제목, 내용 검색"
          style={{ flex: 1, minWidth: 200, height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, outline: "none", background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary }}
        />
        <button onClick={() => { setActiveKeyword(keyword); setPage(1); }} style={{ height: 36, padding: "0 18px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
        {activeKeyword && (
          <button onClick={() => { setKeyword(""); setActiveKeyword(""); setPage(1); }} style={{ height: 36, padding: "0 14px", background: "#fff", color: "#6b7280", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
        )}
      </div>

      {/* 상태 탭 */}
      <div style={{ background: cardBg, borderRadius: "12px 12px 0 0", borderBottom: `1px solid ${border}`, display: "flex", padding: "0 12px" }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            style={{
              border: "none", background: "none", padding: "14px 18px", fontSize: 14, cursor: "pointer",
              fontWeight: tab === t ? 800 : 500,
              color: tab === t ? "#3b82f6" : textSecondary,
              borderBottom: tab === t ? "3px solid #3b82f6" : "3px solid transparent",
            }}
          >
            {t}
            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: tab === t ? "#3b82f6" : "#9ca3af" }}>
              {t === "전체" ? counts.전체 : t === "신규" ? counts.신규 : counts.답변완료}
            </span>
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div style={{ background: cardBg, borderRadius: "0 0 12px 12px", overflow: "hidden", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
              {["상태", "카테고리", "문의자 / 연락처", "제목", "등록일"].map((h, i) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: i === 3 ? "left" : "center", fontWeight: 700, color: textSecondary, fontSize: 12.5, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: textSecondary }}>불러오는 중...</td></tr>
            ) : loadError ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#dc2626", lineHeight: 1.7 }}>
                문의를 불러오지 못했습니다.<br />
                <span style={{ fontSize: 12, color: textSecondary }}>{loadError}</span>
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: textSecondary }}>조건에 해당하는 문의가 없습니다.</td></tr>
            ) : rows.map(row => (
            <React.Fragment key={row.id}>
              <tr
                onClick={() => openDetail(row.id)}
                style={{ borderBottom: `1px solid ${border}`, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 16px", textAlign: "center" }}>{statusChip(row.status)}</td>
                <td style={{ padding: "14px 16px", textAlign: "center", color: textSecondary, whiteSpace: "nowrap" }}>{row.category || "-"}</td>
                <td style={{ padding: "14px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: 700, color: textPrimary }}>{row.author_name || "-"}</div>
                  <div style={{ fontSize: 12, color: textSecondary }}>{row.author_phone || row.author_email || "연락처 없음"}</div>
                </td>
                <td style={{ padding: "14px 16px", color: textPrimary, fontWeight: 600 }}>
                  {row.title || "(제목 없음)"}
                  {row.reply_count > 0 && <span style={{ marginLeft: 6, color: "#3b82f6", fontSize: 12 }}>[{row.reply_count}]</span>}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "center", color: textSecondary, fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
              </tr>
              {selected?.id === row.id && (
                <tr key={`${row.id}-detail`}>
                  <td colSpan={5} style={{ padding: 0, borderBottom: `1px solid ${border}`, background: darkMode ? "#1f2023" : "#fafbfc" }}>
                    <div style={{ padding: "20px 24px" }}>
                      {/* 문의 본문 */}
                      <div style={{ fontSize: 14, lineHeight: 1.8, color: textPrimary, whiteSpace: "pre-wrap", marginBottom: 14 }}>
                        {selected.content || "(내용 없음)"}
                      </div>

                      {/* 첨부 사진 */}
                      {(selected.board_attachments || []).filter(a => (a.file_type || "").startsWith("image/")).length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                          {(selected.board_attachments || [])
                            .filter(a => (a.file_type || "").startsWith("image/"))
                            .map(a => (
                              <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" style={{ width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: `1px solid ${border}`, display: "block" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.file_url} alt={a.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </a>
                            ))}
                        </div>
                      )}

                      {/* 답변 목록 */}
                      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>
                          답변 {(selected.board_comments || []).length}개
                        </div>
                        {(selected.board_comments || []).length === 0 ? (
                          <div style={{ fontSize: 13, color: textSecondary, paddingBottom: 12 }}>아직 답변이 없습니다.</div>
                        ) : (
                          (selected.board_comments || []).map(c => (
                            <div key={c.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: textPrimary }}>{c.author_name || "관리자"}</span>
                                <span style={{ fontSize: 11.5, color: textSecondary }}>{formatDate(c.created_at)}</span>
                              </div>
                              <div style={{ fontSize: 13.5, color: textPrimary, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{c.content}</div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* 답변 작성 */}
                      <div style={{ marginTop: 12 }}>
                        <textarea
                          value={reply}
                          onChange={e => setReply(e.target.value)}
                          placeholder={isMemberView ? "추가로 남기실 내용을 입력하세요." : "문의자에게 전달할 답변을 입력하세요. 1:1 문의 게시판에 답글로 등록됩니다."}
                          style={{ width: "100%", height: 84, padding: 12, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", background: cardBg, color: textPrimary, fontFamily: "inherit" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                          <button onClick={() => setSelected(null)} style={{ height: 38, padding: "0 16px", background: darkMode ? "#2c2d31" : "#f3f4f6", color: textSecondary, border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>접기</button>
                          <button
                            onClick={submitReply}
                            disabled={saving || !reply.trim()}
                            style={{ height: 38, padding: "0 20px", background: saving || !reply.trim() ? "#9ca3af" : "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: saving || !reply.trim() ? "not-allowed" : "pointer" }}
                          >
                            {saving ? "등록 중..." : isMemberView ? "답글 등록" : "답변 등록"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
            ))}
          </tbody>
        </table>

        {total > INQUIRY_PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 0", borderTop: `1px solid ${border}` }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ height: 34, padding: "0 14px", borderRadius: 6, border: `1px solid ${border}`, background: page <= 1 ? (darkMode ? "#2c2d31" : "#f3f4f6") : cardBg, color: page <= 1 ? "#9ca3af" : textPrimary, fontSize: 13, fontWeight: 600, cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              이전
            </button>
            <span style={{ fontSize: 13, color: textSecondary }}>
              {page} / {totalPages} 페이지 · 전체 {total}건
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ height: 34, padding: "0 14px", borderRadius: 6, border: `1px solid ${border}`, background: page >= totalPages ? (darkMode ? "#2c2d31" : "#f3f4f6") : cardBg, color: page >= totalPages ? "#9ca3af" : textPrimary, fontSize: 13, fontWeight: 600, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {detailLoading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
          불러오는 중...
        </div>
      )}
    </div>
  );
}
