"use client";

import React from "react";
import { AuthorBanner, getAuthorBanners } from "@/app/actions/articleAd";
import ArticleAuthorAdSlot from "@/components/ArticleAuthorAdSlot";
import { compressToWebP } from "./articleFormUtils";

export interface ArticleAdSettingSlotProps {
  writeAdType: "DEFAULT" | "BANNER" | "NONE";
  setWriteAdType: (val: "DEFAULT" | "BANNER" | "NONE") => void;
  writeAdMode: "NEW" | "EXISTING";
  setWriteAdMode: (val: "NEW" | "EXISTING") => void;
  writeAdBannerId: string;
  setWriteAdBannerId: (val: string) => void;
  writeAdBannerName: string;
  setWriteAdBannerName: (val: string) => void;
  writeAdFile: File | null;
  setWriteAdFile: (val: File | null) => void;
  writeAdLinkUrl: string;
  setWriteAdLinkUrl: (val: string) => void;
  writeAdPreview: string;
  setWriteAdPreview: (val: string) => void;
  writeAdStartDate: string;
  setWriteAdStartDate: (val: string) => void;
  writeAdEndDate: string;
  setWriteAdEndDate: (val: string) => void;
  authorBanners: AuthorBanner[];
  setAuthorBanners?: React.Dispatch<React.SetStateAction<AuthorBanner[]>>;
  loadArticleId?: string | null;
  memberAuthorId?: string | null;
  currentUserId?: string | null;
  reporterName: string;
  border?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
}

export default function ArticleAdSettingSlot({
  writeAdType,
  setWriteAdType,
  writeAdMode,
  setWriteAdMode,
  writeAdBannerId,
  setWriteAdBannerId,
  writeAdBannerName,
  setWriteAdBannerName,
  writeAdFile,
  setWriteAdFile,
  writeAdLinkUrl,
  setWriteAdLinkUrl,
  writeAdPreview,
  setWriteAdPreview,
  writeAdStartDate,
  setWriteAdStartDate,
  writeAdEndDate,
  setWriteAdEndDate,
  authorBanners,
  setAuthorBanners,
  loadArticleId,
  memberAuthorId,
  currentUserId,
  reporterName,
  border = "#e2e8f0",
  textPrimary = "#0f172a",
  textSecondary = "#64748b",
  textMuted = "#94a3b8",
}: ArticleAdSettingSlotProps) {
  return (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 32, minWidth: 0 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, paddingTop: 4, flexShrink: 0 }}>광고등록</label>
              
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* 옵션 선택 */}
                <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, color: writeAdType === "DEFAULT" ? "#2563eb" : textPrimary }}>
                    <input
                      type="radio"
                      name="write_ad_type"
                      checked={writeAdType === "DEFAULT"}
                      onChange={() => setWriteAdType("DEFAULT")}
                      style={{ accentColor: "#2563eb", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span>기본프로필 선택 (등록자 프로필 카드)</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, color: writeAdType === "BANNER" ? "#2563eb" : textPrimary }}>
                    <input
                      type="radio"
                      name="write_ad_type"
                      checked={writeAdType === "BANNER"}
                      onChange={() => setWriteAdType("BANNER")}
                      style={{ accentColor: "#2563eb", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span>배너등록 (이미지 첨부 + 링크 첨부)</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: textSecondary }}>
                    <input
                      type="radio"
                      name="write_ad_type"
                      checked={writeAdType === "NONE"}
                      onChange={() => setWriteAdType("NONE")}
                      style={{ accentColor: "#64748b", width: 15, height: 15, cursor: "pointer" }}
                    />
                    <span>노출 안함</span>
                  </label>
                </div>

                {/* 기본프로필 선택 시: 실제 기사 하단에 등록되는 등록자정보 카드 실물 미리보기 */}
                {writeAdType === "DEFAULT" && (
                  <div style={{ marginTop: 8, minWidth: 0 }}>
                    <ArticleAuthorAdSlot
                      article={{
                        id: loadArticleId || "preview",
                        author_id: memberAuthorId || currentUserId,
                        author_name: reporterName,
                      }}
                      forceType="DEFAULT"
                      previewMode={true}
                      style={{ margin: "0" }}
                    />
                  </div>
                )}

                {/* 배너등록 선택 시: 등록 방식 먼저 선택 -> 분기 렌더링 (대표님 지시) */}
                {writeAdType === "BANNER" && (
                  <div style={{ padding: "18px 20px", background: "#f8fafc", borderRadius: 10, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 14, minWidth: 0, boxSizing: "border-box" }}>
                    {/* [1순위] 등록 방식 선택 (새 배너 직접 등록 vs 기존 배너 가져오기) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, paddingBottom: 12, borderBottom: `1px dashed ${border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>등록 방식:</span>
                      <div style={{ display: "inline-flex", background: "#e2e8f0", padding: "3px", borderRadius: "8px", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setWriteAdMode("NEW");
                            setWriteAdBannerId("");
                            setWriteAdFile(null);
                            setWriteAdBannerName("");
                            setWriteAdLinkUrl("");
                            setWriteAdPreview("");
                            setWriteAdStartDate("");
                            setWriteAdEndDate("");
                          }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: writeAdMode === "NEW" ? 700 : 500,
                            background: writeAdMode === "NEW" ? "#ffffff" : "transparent",
                            color: writeAdMode === "NEW" ? "#2563eb" : "#64748b",
                            cursor: "pointer",
                            boxShadow: writeAdMode === "NEW" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.15s",
                          }}
                        >
                          ➕ 새 배너 직접 등록
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setWriteAdMode("EXISTING");
                            const targetId = memberAuthorId || currentUserId;
                            if (targetId) {
                              const bRes = await getAuthorBanners(targetId);
                              if (bRes.success && bRes.data) {
                                setAuthorBanners?.(bRes.data);
                              }
                            }
                          }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: writeAdMode === "EXISTING" ? 700 : 500,
                            background: writeAdMode === "EXISTING" ? "#ffffff" : "transparent",
                            color: writeAdMode === "EXISTING" ? "#2563eb" : "#64748b",
                            cursor: "pointer",
                            boxShadow: writeAdMode === "EXISTING" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.15s",
                          }}
                        >
                          📂 기존 배너 가져오기
                        </button>
                      </div>
                    </div>

                    {/* ── [A안: 기존 배너 가져오기 선택 시] ── */}
                    {writeAdMode === "EXISTING" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                        {/* 1) 배너 선택 드롭다운 (선택하기를 맨 위에 둠) */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>배너 선택:</span>
                          {authorBanners.length > 0 ? (
                            <select
                              value={writeAdBannerId}
                              onChange={(e) => {
                                const bId = e.target.value;
                                setWriteAdBannerId(bId);
                                if (bId) {
                                  const found = authorBanners.find((b) => b.id === bId);
                                  if (found) {
                                    setWriteAdBannerName(found.name);
                                    setWriteAdLinkUrl(found.link_url || "");
                                    setWriteAdPreview(found.image_url || "");
                                    setWriteAdStartDate(found.start_date || "");
                                    setWriteAdEndDate(found.end_date || "");
                                  }
                                } else {
                                  setWriteAdBannerName("");
                                  setWriteAdLinkUrl("");
                                  setWriteAdPreview("");
                                  setWriteAdStartDate("");
                                  setWriteAdEndDate("");
                                }
                              }}
                              style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff", flex: 1, maxWidth: 360, minWidth: 0 }}
                            >
                              <option value="">-- 사용할 배너를 선택하세요 --</option>
                              {authorBanners.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: 13, color: "#ef4444" }}>
                              등록된 기존 배너가 없습니다. [새 배너 직접 등록]을 선택해주세요.
                            </span>
                          )}
                        </div>

                        {/* 배너를 아직 선택하지 않았을 때 안내 */}
                        {!writeAdBannerId && authorBanners.length > 0 && (
                          <div style={{ marginLeft: 95, padding: "12px 14px", background: "#f1f5f9", borderRadius: 8, fontSize: 13, color: textSecondary }}>
                            💡 위 드롭다운에서 기사에 적용할 배너를 선택해 주세요. 배너를 선택하면 이미지, 링크, 광고기간이 자동으로 표시됩니다.
                          </div>
                        )}

                        {/* 배너가 선택되었을 때만 아래 세부 정보 노출 (대표님 지시) */}
                        {writeAdBannerId && (
                          <>
                            {/* 2) 링크 첨부 (확인 및 수정 가능) */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>링크 첨부:</span>
                              <input
                                type="text"
                                value={writeAdLinkUrl}
                                onChange={(e) => setWriteAdLinkUrl(e.target.value)}
                                placeholder="https://... (클릭 시 이동할 링크 URL)"
                                style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box" }}
                              />
                            </div>

                            {/* 3) 배너 이미지 썸네일 (클릭 시 새 창 열기) */}
                            {writeAdPreview && (
                              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>배너 이미지:</span>
                                <a
                                  href={writeAdLinkUrl ? (writeAdLinkUrl.startsWith("http") ? writeAdLinkUrl : `https://${writeAdLinkUrl}`) : undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!writeAdLinkUrl) e.preventDefault();
                                  }}
                                  style={{
                                    display: "block",
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    border: `1px solid ${border}`,
                                    maxHeight: 85,
                                    maxWidth: 360,
                                    width: "100%",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                    cursor: writeAdLinkUrl ? "pointer" : "default",
                                    textDecoration: "none",
                                  }}
                                  title={writeAdLinkUrl ? `새 창에서 링크 열기: ${writeAdLinkUrl}` : ""}
                                >
                                  <img src={writeAdPreview} alt="배너 미리보기" style={{ width: "100%", height: 85, objectFit: "cover", display: "block" }} />
                                </a>
                              </div>
                            )}

                            {/* 4) 광고기간: 시작 - 종료 (기간초기화 버튼 제거 완료) */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>광고기간:</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <input
                                  type="date"
                                  value={writeAdStartDate}
                                  onChange={(e) => setWriteAdStartDate(e.target.value)}
                                  style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff" }}
                                />
                                <span style={{ fontSize: 13, color: textSecondary }}>~</span>
                                <input
                                  type="date"
                                  value={writeAdEndDate}
                                  onChange={(e) => setWriteAdEndDate(e.target.value)}
                                  style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff" }}
                                />
                              </div>
                              <span style={{ fontSize: 12, color: textSecondary, marginLeft: 95, width: "100%" }}>
                                * 미설정 시 상시 노출되며, 설정 시 해당 기간 동안만 배너가 노출되고 이후엔 기본프로필 카드로 자동 전환됩니다.
                              </span>
                            </div>

                            {/* 5) 실제 기사 하단 배너 실시간 미리보기 (클릭 시 새 창 이동) */}
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #cbd5e1", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap" }}>
                                  <span>👀</span> [실시간 미리보기] 실제 기사 하단에 노출되는 배너 모습
                                </span>
                                <a
                                  href={writeAdLinkUrl ? (writeAdLinkUrl.startsWith("http") ? writeAdLinkUrl : `https://${writeAdLinkUrl}`) : undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!writeAdLinkUrl) e.preventDefault();
                                  }}
                                  style={{
                                    fontSize: 11,
                                    color: writeAdLinkUrl ? "#2563eb" : textSecondary,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    minWidth: 0,
                                    maxWidth: "50%",
                                    textAlign: "right",
                                    textDecoration: writeAdLinkUrl ? "underline" : "none",
                                    cursor: writeAdLinkUrl ? "pointer" : "default",
                                    fontWeight: 600,
                                  }}
                                  title={writeAdLinkUrl ? `새 창에서 링크 열기: ${writeAdLinkUrl}` : "링크 미입력"}
                                >
                                  {writeAdLinkUrl ? `🔗 클릭 시 이동: ${writeAdLinkUrl}` : "링크 미입력 (클릭 불가)"}
                                </a>
                              </div>
                              <a
                                href={writeAdLinkUrl ? (writeAdLinkUrl.startsWith("http") ? writeAdLinkUrl : `https://${writeAdLinkUrl}`) : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!writeAdLinkUrl) {
                                    e.preventDefault();
                                    alert("연결할 링크 URL이 입력되지 않았습니다.");
                                  }
                                }}
                                style={{
                                  display: "block",
                                  position: "relative",
                                  width: "100%",
                                  maxWidth: 820,
                                  borderRadius: 12,
                                  overflow: "hidden",
                                  border: "1px solid #e2e8f0",
                                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
                                  background: "#ffffff",
                                  boxSizing: "border-box",
                                  cursor: writeAdLinkUrl ? "pointer" : "default",
                                  textDecoration: "none",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (writeAdLinkUrl) {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 8px 22px rgba(37, 99, 235, 0.18)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "none";
                                  e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.05)";
                                }}
                                title={writeAdLinkUrl ? `클릭 시 새 창으로 열기: ${writeAdLinkUrl}` : "링크 미입력"}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    top: 10,
                                    right: 10,
                                    background: "rgba(15, 23, 42, 0.72)",
                                    color: "#ffffff",
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    letterSpacing: "0.5px",
                                    zIndex: 2,
                                  }}
                                >
                                  AD
                                </span>
                                <img
                                  src={writeAdPreview}
                                  alt="배너 실시간 미리보기"
                                  style={{
                                    width: "100%",
                                    maxHeight: 280,
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* ── [B안: 새 배너 직접 등록 선택 시] ── */
                      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                        {/* 1) 배너 이름 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>배너 이름:</span>
                          <input
                            type="text"
                            value={writeAdBannerName}
                            onChange={(e) => setWriteAdBannerName(e.target.value)}
                            placeholder="예: 논현동 신축 상가 분양 홍보 배너"
                            style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>

                        {/* 2) 링크 첨부 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>링크 첨부:</span>
                          <input
                            type="text"
                            value={writeAdLinkUrl}
                            onChange={(e) => setWriteAdLinkUrl(e.target.value)}
                            placeholder="https://... (클릭 시 이동할 링크 URL)"
                            style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>

                        {/* 3) 이미지 첨부 (파일 선택) */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>이미지 첨부:</span>
                            <input
                              type="file"
                              accept="image/*"
                              id="writeAdFileInput"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // 대표님 지시: 배너 등록 시 WebP로 자동 압축 변환
                                  const webpFile = await compressToWebP(file, 1200, 0.85);
                                  setWriteAdFile(webpFile);
                                  setWriteAdPreview(URL.createObjectURL(webpFile));
                                  setWriteAdBannerId("");
                                }
                              }}
                              style={{ display: "none" }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const inp = document.getElementById("writeAdFileInput") as HTMLInputElement;
                                if (inp) inp.click();
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "9px 18px",
                                borderRadius: 8,
                                border: `1.5px dashed ${writeAdFile ? "#2563eb" : "#94a3b8"}`,
                                background: writeAdFile ? "#eff6ff" : "#f8fafc",
                                color: writeAdFile ? "#2563eb" : "#475569",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#2563eb";
                                e.currentTarget.style.background = "#eff6ff";
                                e.currentTarget.style.color = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                if (!writeAdFile) {
                                  e.currentTarget.style.borderColor = "#94a3b8";
                                  e.currentTarget.style.background = "#f8fafc";
                                  e.currentTarget.style.color = "#475569";
                                }
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <circle cx="10" cy="13" r="2" />
                                <path d="M20 17l-1.09-1.09a2 2 0 0 0-2.82 0L10 22" />
                              </svg>
                              {writeAdFile ? writeAdFile.name : "파일 선택"}
                            </button>
                            <span style={{ fontSize: 12, color: textSecondary, fontWeight: 600 }}>
                              (사이즈: 1200X400 PX)
                            </span>
                          </div>

                          {/* 작은 썸네일 미리보기 (클릭 시 새 창 열기) */}
                          {writeAdPreview && (
                            <div style={{ marginLeft: 95, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <span style={{ fontSize: 12, color: textSecondary, flexShrink: 0 }}>미리보기:</span>
                              <a
                                href={writeAdLinkUrl ? (writeAdLinkUrl.startsWith("http") ? writeAdLinkUrl : `https://${writeAdLinkUrl}`) : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!writeAdLinkUrl) e.preventDefault();
                                }}
                                style={{
                                  display: "block",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                  border: `1px solid ${border}`,
                                  maxHeight: 85,
                                  maxWidth: 360,
                                  width: "100%",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                  cursor: writeAdLinkUrl ? "pointer" : "default",
                                  textDecoration: "none",
                                }}
                                title={writeAdLinkUrl ? `새 창에서 링크 열기: ${writeAdLinkUrl}` : ""}
                              >
                                <img src={writeAdPreview} alt="배너 미리보기" style={{ width: "100%", height: 85, objectFit: "cover", display: "block" }} />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* 4) 광고기간: 시작 - 종료 (기간초기화 버튼 제거 완료) */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, width: 85, flexShrink: 0 }}>광고기간:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <input
                              type="date"
                              value={writeAdStartDate}
                              onChange={(e) => setWriteAdStartDate(e.target.value)}
                              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff" }}
                            />
                            <span style={{ fontSize: 13, color: textSecondary }}>~</span>
                            <input
                              type="date"
                              value={writeAdEndDate}
                              onChange={(e) => setWriteAdEndDate(e.target.value)}
                              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${border}`, fontSize: 13, background: "#fff" }}
                            />
                          </div>
                          <span style={{ fontSize: 12, color: textSecondary, marginLeft: 95, width: "100%" }}>
                            * 미설정 시 상시 노출되며, 설정 시 해당 기간 동안만 배너가 노출되고 이후엔 기본프로필 카드로 자동 전환됩니다.
                          </span>
                        </div>

                        {/* 5) 실제 기사 하단 배너 실시간 미리보기 (클릭 시 새 창 이동) */}
                        {writeAdPreview && (
                          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #cbd5e1", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap" }}>
                                <span>👀</span> [실시간 미리보기] 실제 기사 하단에 노출되는 배너 모습
                              </span>
                              <a
                                href={writeAdLinkUrl ? (writeAdLinkUrl.startsWith("http") ? writeAdLinkUrl : `https://${writeAdLinkUrl}`) : undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!writeAdLinkUrl) e.preventDefault();
                                }}
                                style={{
                                  fontSize: 11,
                                  color: writeAdLinkUrl ? "#2563eb" : textSecondary,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  minWidth: 0,
                                  maxWidth: "50%",
                                  textAlign: "right",
                                  textDecoration: writeAdLinkUrl ? "underline" : "none",
                                  cursor: writeAdLinkUrl ? "pointer" : "default",
                                  fontWeight: 600,
                                }}
                                title={writeAdLinkUrl ? `새 창에서 링크 열기: ${writeAdLinkUrl}` : "링크 미입력"}
                              >
                                {writeAdLinkUrl ? `🔗 클릭 시 이동: ${writeAdLinkUrl}` : "링크 미입력 (클릭 불가)"}
                              </a>
                            </div>
                            <a
                              href={writeAdLinkUrl ? (writeAdLinkUrl.startsWith("http") ? writeAdLinkUrl : `https://${writeAdLinkUrl}`) : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (!writeAdLinkUrl) {
                                  e.preventDefault();
                                  alert("연결할 링크 URL이 입력되지 않았습니다.");
                                }
                              }}
                              style={{
                                display: "block",
                                position: "relative",
                                width: "100%",
                                maxWidth: 820,
                                borderRadius: 12,
                                overflow: "hidden",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
                                background: "#ffffff",
                                boxSizing: "border-box",
                                cursor: writeAdLinkUrl ? "pointer" : "default",
                                textDecoration: "none",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (writeAdLinkUrl) {
                                  e.currentTarget.style.transform = "translateY(-2px)";
                                  e.currentTarget.style.boxShadow = "0 8px 22px rgba(37, 99, 235, 0.18)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "none";
                                e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.05)";
                              }}
                              title={writeAdLinkUrl ? `클릭 시 새 창으로 열기: ${writeAdLinkUrl}` : "링크 미입력"}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  right: 10,
                                  background: "rgba(15, 23, 42, 0.72)",
                                  color: "#ffffff",
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  letterSpacing: "0.5px",
                                  zIndex: 2,
                                }}
                              >
                                AD
                              </span>
                              <img
                                src={writeAdPreview}
                                alt="배너 실시간 미리보기"
                                style={{
                                  width: "100%",
                                  maxHeight: 280,
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
  );
}
