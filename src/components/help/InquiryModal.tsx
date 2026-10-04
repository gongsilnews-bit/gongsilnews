"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { saveBoardPost, uploadBoardAttachment } from "@/app/actions/board";
import { submitGuestInquiry } from "@/app/actions/guestInquiry";
import { convertToWebp } from "@/utils/convertToWebp";

/**
 * 고객센터에서 바로 1:1 문의를 남기는 창.
 * 저장은 글쓰기 화면과 같이 board_posts(board_id='inquiry') 비밀글 + 사진은 webp 첨부.
 *
 * 비회원도 문의할 수 있지만, 창 맨 위에 로그인·무료 회원가입을 먼저 보여 줘서
 * 가능하면 회원으로 문의하게 유도한다. 비회원은 휴대폰번호 필수 + 개인정보 동의,
 * 사진 첨부와 문의내역 조회는 없다 (최고관리자가 문의관리에서 보고 직접 연락).
 */

const NAVY = "#1a2e50";
const ORANGE = "#ff8e15";

type Member = { id: string; name: string; phone: string; email: string };

type Props = {
  /** null = 비회원 */
  member: Member | null;
  categories: string[];
  maxPhotos: number;
  /** 접수 후 "내 문의내역 보기" 주소 (회원) */
  myInquiryHref: string;
  /** 로그인 후 돌아올 주소 */
  loginHref: string;
  mobile?: boolean;
  onClose: () => void;
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 14.5, outline: "none", boxSizing: "border-box", color: "#111827", background: "#fff", fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 };
const required = <span style={{ color: "#ef4444" }}> *</span>;

// 서버 렌더링에는 document 가 없으니 브라우저에서만 창을 그린다
const noopSubscribe = () => () => {};

// 전화번호 자동 하이픈 변환 유틸
const formatPhoneNumber = (val: string) => {
  if (!val) return "";
  const onlyNums = val.replace(/[^0-9]/g, "");
  if (onlyNums.startsWith("02")) {
    if (onlyNums.length <= 2) return onlyNums;
    if (onlyNums.length <= 5) return `${onlyNums.slice(0, 2)}-${onlyNums.slice(2)}`;
    if (onlyNums.length <= 9) return `${onlyNums.slice(0, 2)}-${onlyNums.slice(2, 5)}-${onlyNums.slice(5)}`;
    return `${onlyNums.slice(0, 2)}-${onlyNums.slice(2, 6)}-${onlyNums.slice(6, 10)}`;
  } else if (onlyNums.startsWith("1") && !onlyNums.startsWith("15") && !onlyNums.startsWith("16") && !onlyNums.startsWith("18")) {
    if (onlyNums.length <= 4) return onlyNums;
    return `${onlyNums.slice(0, 4)}-${onlyNums.slice(4, 8)}`;
  } else {
    if (onlyNums.length <= 3) return onlyNums;
    if (onlyNums.length <= 7) return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
    if (onlyNums.length <= 10) return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 6)}-${onlyNums.slice(6)}`;
    return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`;
  }
};

export default function InquiryModal({ member, categories, maxPhotos, myInquiryHref, loginHref, mobile = false, onClose }: Props) {
  const isGuest = !member;
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [name, setName] = useState(member?.name || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [email, setEmail] = useState(member?.email || "");
  const [category, setCategory] = useState(categories[0] || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);

  const dirty = !!(title.trim() || content.trim() || photos.length);

  const requestClose = () => {
    if (saving) return;
    if (!done && dirty && !confirm("작성 중인 문의가 있습니다. 닫을까요?")) return;
    onClose();
  };

  // 창을 연 시각 (비회원 봇 걸러내기용)
  useEffect(() => { openedAt.current = Date.now(); }, []);

  // ESC 로 닫기 + 창이 떠 있는 동안 뒤 화면 스크롤 막기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  });

  // 미리보기 주소 정리
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    const room = maxPhotos - photos.length;
    if (!picked.length || room <= 0) return;
    if (picked.length > room) alert(`사진은 최대 ${maxPhotos}장까지 첨부할 수 있어 ${room}장만 추가합니다.`);
    setPhotos((prev) => [...prev, ...picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const submitMember = async (m: Member) => {
    if (!phone.trim() && !email.trim()) return alert("답변을 받으실 연락처나 이메일을 입력해 주세요.");
    setSaving(true);
    const res = await saveBoardPost({
      board_id: "inquiry",
      title: category ? `[${category}] ${title.trim()}` : title.trim(),
      content: content.trim(),
      author_id: m.id,
      author_name: name.trim() || m.email.split("@")[0] || "회원",
      author_phone: phone.trim(),
      author_email: email.trim(),
    });
    if (!res.success || !res.postId) {
      setSaving(false);
      alert("문의 접수에 실패했습니다: " + (res.error || "알 수 없는 오류"));
      return;
    }
    for (let i = 0; i < photos.length; i++) {
      const fd = new FormData();
      fd.append("file", await convertToWebp(photos[i].file));
      fd.append("post_id", String(res.postId));
      fd.append("sort_order", String(i));
      await uploadBoardAttachment(fd);
    }
    setSaving(false);
    setDone(true);
  };

  const submitGuest = async () => {
    if (!name.trim()) return alert("이름을 입력해 주세요.");
    if (!/^01[016789]\d{7,8}$/.test(phone.replace(/\D/g, ""))) return alert("답변 연락을 받으실 휴대폰번호를 정확히 입력해 주세요.");
    if (!agreed) return alert("개인정보 수집·이용에 동의해 주세요.");
    setSaving(true);
    const res = await submitGuestInquiry({
      name, phone, email, category, title, content, agreed, website,
      elapsedMs: Date.now() - openedAt.current,
    });
    setSaving(false);
    if (!res.success) return alert(res.error || "문의 접수에 실패했습니다.");
    setDone(true);
  };

  const submit = () => {
    if (!title.trim()) return alert("제목을 입력해 주세요.");
    if (!content.trim()) return alert("문의 내용을 입력해 주세요.");
    if (member) void submitMember(member);
    else void submitGuest();
  };


  if (!isClient) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="1:1 문의 남기기"
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
      style={{
        // 사이트 헤더(z-index 10000000)보다 위
        position: "fixed", inset: 0, zIndex: 10000010, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", padding: mobile ? 0 : 20,
      }}
    >
      <div style={{
        width: "100%", maxWidth: mobile ? 448 : 680, maxHeight: mobile ? "92vh" : "90vh", background: "#fff",
        borderRadius: mobile ? "18px 18px 0 0" : 16, display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* 머리 */}
        <div style={{ background: NAVY, color: "#fff", padding: mobile ? "18px 20px" : "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: mobile ? 18 : 21, fontWeight: 800 }}>1:1 문의 남기기</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>작성자 본인과 관리자만 볼 수 있는 비밀글입니다.</div>
          </div>
          <button onClick={requestClose} aria-label="닫기" style={{ background: "none", border: "none", color: "#fff", fontSize: 28, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
        </div>

        {done ? (
          <div style={{ padding: mobile ? "36px 24px" : "48px 40px", textAlign: "center", overflowY: "auto" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", color: "#10b981", fontSize: 34, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginTop: 18 }}>문의가 접수되었습니다</div>
            <p style={{ fontSize: 14.5, color: "#64748b", margin: "8px 0 0", lineHeight: 1.7 }}>
              {isGuest
                ? <>담당자가 확인 후 입력하신 휴대폰번호로 연락드립니다.<br />운영시간 평일 10:00~17:00</>
                : <>답변이 등록되면 알림으로 알려 드립니다.<br />운영시간 평일 10:00~17:00</>}
            </p>
            {isGuest ? (
              <div style={{ marginTop: 24, padding: "18px", borderRadius: 12, background: "#fff7ed", border: `1px solid ${ORANGE}` }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>다음엔 회원으로 문의해 보세요</div>
                <div style={{ fontSize: 13.5, color: "#475569", marginTop: 4 }}>문의내역 확인과 답변 알림, 공실 3건 무료 등록까지 모두 무료입니다.</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
                  <button onClick={onClose} style={{ padding: "11px 20px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>닫기</button>
                  <a href={loginHref} style={{ padding: "11px 20px", borderRadius: 10, background: ORANGE, color: "#fff", fontSize: 14.5, fontWeight: 800, textDecoration: "none" }}>회원가입 / 로그인</a>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 26 }}>
                <button onClick={onClose} style={{ padding: "12px 22px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>닫기</button>
                <Link href={myInquiryHref} style={{ padding: "12px 22px", borderRadius: 10, background: NAVY, color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>내 문의내역 보기</Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: mobile ? "18px 20px" : "24px 28px" }}>
              {/* 봇 함정 칸: 화면과 보조기기에서 숨김 */}
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                name="website"
                style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
              />

              {/* 분류 */}
              {categories.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <span style={labelStyle}>문의 분류</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {categories.map((c) => {
                      const sel = c === category;
                      return (
                        <button key={c} type="button" onClick={() => setCategory(c)} style={{
                          padding: "7px 13px", borderRadius: 999, fontSize: 13.5, fontWeight: sel ? 700 : 500, cursor: "pointer",
                          border: `1px solid ${sel ? NAVY : "#e2e8f0"}`, background: sel ? NAVY : "#fff", color: sel ? "#fff" : "#475569",
                        }}>{c}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 제목 */}
              <label style={{ display: "block", marginBottom: 16 }}>
                <span style={labelStyle}>제목{required}</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="문의 제목을 입력해 주세요" style={inputStyle} />
              </label>

              {/* 문의 내용 */}
              <label style={{ display: "block", marginBottom: 16 }}>
                <span style={labelStyle}>문의 내용{required}</span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={5000}
                  placeholder="궁금하신 내용을 자세히 적어 주시면 더 정확하게 답변드릴 수 있습니다."
                  style={{ ...inputStyle, height: mobile ? 150 : 180, padding: 12, resize: "vertical", lineHeight: 1.6 }}
                />
              </label>

              {/* 사진 (회원만) */}
              {!isGuest && maxPhotos > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <span style={labelStyle}>사진 첨부 <span style={{ fontWeight: 500, color: "#94a3b8" }}>(선택 · 최대 {maxPhotos}장)</span></span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {photos.map((p, i) => (
                      <div key={p.url} style={{ position: "relative", width: 76, height: 76, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`첨부 사진 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} aria-label={`${i + 1}번째 사진 삭제`}
                          style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                    {photos.length < maxPhotos && (
                      <button type="button" onClick={() => photoInput.current?.click()}
                        style={{ width: 76, height: 76, border: "2px dashed #d1d5db", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#94a3b8", fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>{photos.length}/{maxPhotos}
                      </button>
                    )}
                  </div>
                  <input ref={photoInput} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display: "none" }} />
                </div>
              )}

              {/* 문의자 정보 */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>문의자 정보</div>
                <div style={{ display: "flex", gap: 10, flexDirection: mobile ? "column" : "row" }}>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={isGuest ? "이름 *" : "이름"} aria-label="이름" style={{ ...inputStyle, flex: 1 }} />
                  <input value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} maxLength={13} placeholder={isGuest ? "휴대폰번호 *" : "010-0000-0000"} aria-label="휴대폰번호" type="tel" inputMode="tel" style={{ ...inputStyle, flex: 1 }} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={isGuest ? "이메일 (선택)" : "이메일"} aria-label="이메일" type="email" style={{ ...inputStyle, flex: 1.4 }} />
                </div>
              </div>

              {/* 비회원: 개인정보 수집·이용 동의 */}
              {isGuest && (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.7 }}>
                    <strong style={{ color: "#334155" }}>개인정보 수집·이용 안내</strong><br />
                    수집 항목: 이름, 휴대폰번호, 이메일(선택) · 이용 목적: 문의 확인 및 답변 연락<br />
                    보관 기간: 문의 처리 완료 후 1년 (요청 시 즉시 삭제) · 동의를 거부하실 수 있으나, 이 경우 비회원 문의를 남기실 수 없습니다.
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 14, fontWeight: 700, color: "#1e293b", cursor: "pointer" }}>
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 18, height: 18 }} />
                    개인정보 수집·이용에 동의합니다 (필수)
                  </label>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: mobile ? "14px 20px 20px" : "16px 28px 22px", borderTop: "1px solid #e5e7eb" }}>
              <button onClick={requestClose} disabled={saving} style={{ flex: mobile ? 1 : undefined, marginLeft: mobile ? 0 : "auto", padding: "12px 20px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>취소</button>
              {isGuest && (
                <a
                  href={loginHref}
                  style={{
                    flex: mobile ? 1.2 : undefined,
                    padding: "12px 18px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: 14.5,
                    fontWeight: 700,
                    textAlign: "center",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  무료회원가입
                </a>
              )}
              <button onClick={submit} disabled={saving} style={{ flex: mobile ? 1.6 : undefined, padding: "12px 24px", borderRadius: 10, border: "none", background: saving ? "#9ca3af" : isGuest ? NAVY : ORANGE, color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                {saving ? "접수 중..." : isGuest ? "비회원으로 문의 접수" : "문의 접수하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
