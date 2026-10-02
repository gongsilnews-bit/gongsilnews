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
import { saveBoardPost } from "@/app/actions/board";
import { INQUIRY_PAGE_SIZE } from "@/constants/inquiry";

type Attachment = { id: string; file_url: string; file_name: string; file_type?: string | null };
type Comment = { id: string; author_name: string; content: string; created_at: string };
type InquiryDetail = {
  id: string;
  title: string;
  category: string;
  content: string;
  author_id?: string | null;
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
  /** 답변 끝난 문의를 고객센터 FAQ 로 옮기는 초안 (개인정보는 관리자가 지우고 올린다) */
  const [faqDraft, setFaqDraft] = useState<{ category: string; question: string; answer: string } | null>(null);
  const [faqSaving, setFaqSaving] = useState(false);

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
    setFaqDraft(null);
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

  const startFaqDraft = () => {
    if (!selected) return;
    const comments = selected.board_comments || [];
    setFaqDraft({
      category: categories.includes(selected.category) ? selected.category : (categories[categories.length - 1] || ""),
      question: selected.title,
      answer: comments[comments.length - 1]?.content || "",
    });
  };

  const submitFaq = async () => {
    if (!faqDraft || !faqDraft.question.trim() || !faqDraft.answer.trim()) return;
    setFaqSaving(true);
    const res = await saveBoardPost({
      board_id: "faq",
      title: faqDraft.category ? `[${faqDraft.category}] ${faqDraft.question.trim()}` : faqDraft.question.trim(),
      content: faqDraft.answer.trim(),
      author_id: replyAuthorId,
      author_name: "최고관리자",
    });
    setFaqSaving(false);
    if (!res.success) {
      alert("FAQ 등록 실패: " + res.error);
      return;
    }
    setFaqDraft(null);
    alert("고객센터 자주 묻는 질문에 등록했습니다.");
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

  // 회원 화면은 공실스터디 Q&A 처럼 배너 + 넓은 목록으로 보여 준다.
  // 최고관리자 화면은 문의자 연락처가 필요해서 표 형태를 유지한다.
  const memberHero = isMemberView && (
    <div style={{ background: "linear-gradient(135deg, #1a2e50 0%, #0f1d36 100%)", borderRadius: 16, padding: "34px 36px", marginBottom: 24, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
      <div>
        <span style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, color: "#ffd29a", border: "1px solid rgba(255,210,154,0.45)", background: "rgba(255,142,21,0.12)", borderRadius: 999, padding: "4px 12px" }}>
          공실뉴스 고객센터
        </span>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "14px 0 0", color: "#fff" }}>내 1:1 문의</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.78)", margin: "8px 0 0" }}>
          남기신 문의와 답변을 확인하세요. 답변이 등록되면 알림으로 알려 드립니다.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {TABS.map(t => {
            const sel = tab === t;
            const label = t === "신규" ? "답변대기" : t;
            const n = t === "전체" ? counts.전체 : t === "신규" ? counts.신규 : counts.답변완료;
            return (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(1); }}
                style={{ padding: "7px 14px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer", border: sel ? "none" : "1px solid rgba(255,255,255,0.35)", background: sel ? "#fff" : "transparent", color: sel ? "#1a2e50" : "#fff" }}
              >
                {label} <span style={{ color: sel ? "#ff8e15" : "#ffd29a" }}>{n}건</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
        <a href="/board_write?board_id=inquiry" style={{ padding: "14px 20px", borderRadius: 12, background: "#ff8e15", color: "#fff", fontSize: 16, fontWeight: 800, textDecoration: "none", textAlign: "center" }}>
          + 새 문의 작성
        </a>
        <a href="/help" style={{ padding: "12px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.45)", color: "#fff", fontSize: 14.5, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
          자주 묻는 질문 보기
        </a>
      </div>
    </div>
  );

  const colCount = isMemberView ? 3 : 5;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: isMemberView ? "24px 32px" : "20px 28px", background: bg }}>
      {memberHero}
      {!isMemberView && (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
          {isMemberView ? "내 1:1 문의" : "1:1 문의 관리"}
        </h1>
        <span style={{ fontSize: 13, color: textSecondary }}>
          (미답변 {counts.신규}건 / 전체 {counts.전체}건)
        </span>
      </div>
      )}

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
          placeholder={isMemberView ? "제목, 내용 검색" : "문의자, 연락처, 제목, 내용 검색"}
          style={{ flex: 1, minWidth: 200, height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, outline: "none", background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary }}
        />
        <button onClick={() => { setActiveKeyword(keyword); setPage(1); }} style={{ height: 36, padding: "0 18px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
        {activeKeyword && (
          <button onClick={() => { setKeyword(""); setActiveKeyword(""); setPage(1); }} style={{ height: 36, padding: "0 14px", background: "#fff", color: "#6b7280", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>초기화</button>
        )}
      </div>

      {/* 상태 탭 (회원 화면은 배너 안에 있다) */}
      {!isMemberView && (
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
      )}

      {/* 목록 */}
      <div style={{ background: cardBg, borderRadius: isMemberView ? 12 : "0 0 12px 12px", overflow: "hidden", marginBottom: 20, borderTop: isMemberView ? "2px solid #1a2e50" : undefined }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMemberView ? 15 : 13 }}>
          <thead>
            {isMemberView ? (
              <tr>
                {["번호", "제목", "작성일"].map((h, i) => (
                  <th key={h} style={{ width: i === 0 ? 90 : i === 2 ? 140 : undefined, padding: "16px 20px", textAlign: i === 1 ? "left" : "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `1px solid ${border}` }}>{h}</th>
                ))}
              </tr>
            ) : (
            <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
              {["상태", "카테고리", "문의자 / 연락처", "제목", "등록일"].map((h, i) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: i === 3 ? "left" : "center", fontWeight: 700, color: textSecondary, fontSize: 12.5, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colCount} style={{ padding: 40, textAlign: "center", color: textSecondary }}>불러오는 중...</td></tr>
            ) : loadError ? (
              <tr><td colSpan={colCount} style={{ padding: 40, textAlign: "center", color: "#dc2626", lineHeight: 1.7 }}>
                문의를 불러오지 못했습니다.<br />
                <span style={{ fontSize: 12, color: textSecondary }}>{loadError}</span>
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={colCount} style={{ padding: 40, textAlign: "center", color: textSecondary }}>조건에 해당하는 문의가 없습니다.</td></tr>
            ) : rows.map((row, i) => (
            <React.Fragment key={row.id}>
              <tr
                onClick={() => openDetail(row.id)}
                style={{ borderBottom: `1px solid ${border}`, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {isMemberView ? (
                  <>
                    <td style={{ padding: "20px", textAlign: "center", color: textSecondary }}>{total - (page - 1) * INQUIRY_PAGE_SIZE - i}</td>
                    <td style={{ padding: "20px", color: textPrimary }}>
                      <span style={{ display: "inline-block", marginRight: 10, fontSize: 12.5, fontWeight: 800, padding: "3px 9px", borderRadius: 5, background: row.status === "신규" ? (darkMode ? "#2c2d31" : "#f1f5f9") : "#10b981", color: row.status === "신규" ? "#64748b" : "#fff" }}>
                        {row.status === "신규" ? "답변대기" : "답변완료"}
                      </span>
                      {row.category && <span style={{ color: "#ff8e15", fontWeight: 800, marginRight: 8 }}>[{row.category}]</span>}
                      <span style={{ fontWeight: 600 }}>{row.title || "(제목 없음)"}</span>
                      {row.reply_count > 0 && <span style={{ marginLeft: 7, color: "#ef4444", fontWeight: 800, fontSize: 13.5 }}>[{row.reply_count}]</span>}
                    </td>
                    <td style={{ padding: "20px", textAlign: "center", color: textSecondary, fontSize: 14, whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                  </>
                ) : (
                <>
                <td style={{ padding: "14px 16px", textAlign: "center" }}>{statusChip(row.status)}</td>
                <td style={{ padding: "14px 16px", textAlign: "center", color: textSecondary, whiteSpace: "nowrap" }}>{row.category || "-"}</td>
                <td style={{ padding: "14px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: 700, color: textPrimary }}>
                    {row.author_name || "-"}
                    {/* 비회원은 알림을 못 받으니 연락처로 직접 답해야 한다 */}
                    {!row.author_id && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#fef3c7", color: "#b45309" }}>비회원</span>}
                  </div>
                  <div style={{ fontSize: 12, color: textSecondary }}>{row.author_phone || row.author_email || "연락처 없음"}</div>
                </td>
                <td style={{ padding: "14px 16px", color: textPrimary, fontWeight: 600 }}>
                  {row.title || "(제목 없음)"}
                  {row.reply_count > 0 && <span style={{ marginLeft: 6, color: "#3b82f6", fontSize: 12 }}>[{row.reply_count}]</span>}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "center", color: textSecondary, fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                </>
                )}
              </tr>
              {selected?.id === row.id && (
                <tr key={`${row.id}-detail`}>
                  <td colSpan={colCount} style={{ padding: 0, borderBottom: `1px solid ${border}`, background: darkMode ? "#1f2023" : "#fafbfc" }}>
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
                        {!isMemberView && !selected.author_id && (
                          <div style={{ marginBottom: 8, padding: "10px 12px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13, lineHeight: 1.6 }}>
                            <strong>비회원 문의입니다.</strong> 답변을 등록해도 고객에게 알림이 가지 않습니다. 기록용으로 남기고,{" "}
                            <strong>{selected.author_phone || selected.author_email || "연락처 없음"}</strong>(으)로 직접 연락해 주세요.
                          </div>
                        )}
                        <textarea
                          value={reply}
                          onChange={e => setReply(e.target.value)}
                          placeholder={isMemberView ? "추가로 남기실 내용을 입력하세요." : "문의자에게 전달할 답변을 입력하세요. 1:1 문의 게시판에 답글로 등록됩니다."}
                          style={{ width: "100%", height: 84, padding: 12, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", background: cardBg, color: textPrimary, fontFamily: "inherit" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                          {!isMemberView && (selected.board_comments || []).length > 0 && !faqDraft && (
                            <button onClick={startFaqDraft} style={{ height: 38, padding: "0 16px", marginRight: "auto", background: cardBg, color: "#059669", border: "1px solid #059669", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                              FAQ로 등록
                            </button>
                          )}
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

                      {/* FAQ 등록 초안 */}
                      {faqDraft && (
                        <div style={{ marginTop: 16, padding: 16, border: "1px solid #059669", borderRadius: 10, background: cardBg }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>고객센터 FAQ로 등록</div>
                          <div style={{ fontSize: 12.5, color: "#dc2626", marginBottom: 12 }}>이름·연락처·주소 등 개인정보는 지우고, 누구에게나 맞는 문장으로 다듬어 주세요.</div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <select
                              value={faqDraft.category}
                              onChange={e => setFaqDraft({ ...faqDraft, category: e.target.value })}
                              style={{ height: 38, padding: "0 10px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 13.5, background: cardBg, color: textPrimary }}
                            >
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input
                              value={faqDraft.question}
                              onChange={e => setFaqDraft({ ...faqDraft, question: e.target.value })}
                              placeholder="질문"
                              style={{ flex: 1, height: 38, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, outline: "none", background: cardBg, color: textPrimary, fontFamily: "inherit" }}
                            />
                          </div>
                          <textarea
                            value={faqDraft.answer}
                            onChange={e => setFaqDraft({ ...faqDraft, answer: e.target.value })}
                            placeholder="답변"
                            style={{ width: "100%", height: 120, padding: 12, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", background: cardBg, color: textPrimary, fontFamily: "inherit" }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                            <button onClick={() => setFaqDraft(null)} style={{ height: 38, padding: "0 16px", background: darkMode ? "#2c2d31" : "#f3f4f6", color: textSecondary, border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>취소</button>
                            <button
                              onClick={submitFaq}
                              disabled={faqSaving || !faqDraft.question.trim() || !faqDraft.answer.trim()}
                              style={{ height: 38, padding: "0 20px", background: faqSaving || !faqDraft.question.trim() || !faqDraft.answer.trim() ? "#9ca3af" : "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: faqSaving ? "not-allowed" : "pointer" }}
                            >
                              {faqSaving ? "등록 중..." : "FAQ 등록"}
                            </button>
                          </div>
                        </div>
                      )}
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
