"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveBoardPost, uploadBoardAttachment, uploadBoardThumbnail, saveBoardPostsBatch } from "@/app/actions/board";
import { createClient } from "@/utils/supabase/client";
import { getPermissionLevel, canAccessBoard, getLevelName } from "@/utils/permissionCheck";

const convertToWebp = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
        } else {
          resolve(file);
        }
      }, "image/webp", 0.8);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

const parseCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue);
      currentValue = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentValue);
      result.push(row);
      row = [];
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  if (currentValue || row.length > 0) {
    row.push(currentValue);
    result.push(row);
  }
  return result.filter(r => r.length > 0 && r.some(cell => cell.trim() !== ""));
};

export interface LinkItem {
  id: string;
  type: "YOUTUBE" | "DRIVE" | "LINK";
  label: string;
  url: string;
}

export default function BoardWriteClient({
  board,
  editPostId,
  editPost,
  serverUser,
  serverUserLevel
}: {
  board: any;
  editPostId: string | null;
  editPost?: any;
  serverUser?: any;
  serverUserLevel?: number;
}) {
  const router = useRouter();
  const boardId = board?.board_id || "drone";
  const boardName = board?.name || "게시판";
  const skinType = board?.skin_type || "FILE_THUMB";
  const isVideoOrThumb = skinType === "VIDEO_ALBUM" || skinType === "FILE_THUMB";
  const isEditMode = !!editPostId && !!editPost;

  const categories = board?.categories
    ? board.categories.split(",").map((c: string) => c.trim()).filter(Boolean)
    : [];

  // 수정 모드: 기존 제목에서 카테고리 뱃지 분리
  const parsedCat = editPost?.title?.match(/^\[([^\]]+)\]/);
  const initCategory = parsedCat ? parsedCat[1] : (categories[0] || "");
  const initTitle = parsedCat ? editPost.title.replace(parsedCat[0], "").trim() : (editPost?.title || "");

  const [category, setCategory] = useState(initCategory);
  const [title, setTitle] = useState(initTitle);
  const [content, setContent] = useState(editPost?.content || "");

  // 링크 데이터 초기화 로직
  const initLinks = (): LinkItem[] => {
    let parsed: LinkItem[] = [];
    try {
      if (editPost?.external_url && editPost.external_url.startsWith("[")) {
        parsed = JSON.parse(editPost.external_url);
      }
    } catch(e) {}
    if (parsed.length === 0) {
      if (editPost?.youtube_url) parsed.push({ id: "legacy_yt", type: "YOUTUBE", label: "유튜브 영상", url: editPost.youtube_url });
      if (editPost?.drive_url) parsed.push({ id: "legacy_dr", type: "DRIVE", label: "구글 드라이브", url: editPost.drive_url });
      if (editPost?.external_url && !editPost.external_url.startsWith("[")) parsed.push({ id: "legacy_ex", type: "LINK", label: "외부 링크", url: editPost.external_url });
    }
    return parsed;
  };

  const [externalLinks, setExternalLinks] = useState<LinkItem[]>(initLinks());
  
  // 새 항목 추가용 상태
  const [newLinkType, setNewLinkType] = useState<"YOUTUBE"|"DRIVE"|"LINK">("YOUTUBE");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(editPost?.thumbnail_url || null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const [userLevel, setUserLevel] = useState<number>(serverUserLevel ?? 0);
  const [isLevelChecking, setIsLevelChecking] = useState(!serverUser && !serverUserLevel);

  React.useEffect(() => {
    if (serverUser || serverUserLevel) return;
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('members').select('role, plan_type, agencies(status)').eq('id', user.id).single();
        if (data) {
          setUserLevel(getPermissionLevel(data));
        }
      }
      setIsLevelChecking(false);
    };
    fetchUser();
  }, [serverUser, serverUserLevel]);

  const handleThumbnailClick = () => fileInputRef.current?.click();
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedRows = parseCSV(text);
      if (parsedRows.length <= 1) {
        alert("등록된 데이터가 없거나 올바르지 않은 CSV 파일입니다.");
        return;
      }

      const headers = parsedRows[0].map(h => h.trim());
      const hasKoreanHeader = headers.some(h => h.includes("제목") || h.includes("내용") || h.includes("구분") || h.includes("URL"));
      
      if (!hasKoreanHeader) {
        const eucReader = new FileReader();
        eucReader.onload = (eucEvent) => {
          const eucText = eucEvent.target?.result as string;
          processCsvText(eucText);
        };
        eucReader.readAsText(file, "EUC-KR");
      } else {
        processCsvText(text);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const processCsvText = (text: string) => {
    const parsedRows = parseCSV(text);
    if (parsedRows.length <= 1) return;

    const headers = parsedRows[0].map(h => h.trim());
    
    const titleIdx = headers.findIndex(h => h.includes("제목"));
    const categoryIdx = headers.findIndex(h => h.includes("구분") || h.includes("카테고리"));
    const contentIdx = headers.findIndex(h => h.includes("내용") || h.includes("본문"));
    const driveIdx = headers.findIndex(h => h.includes("드라이브") || h.includes("구글드라이브"));
    const youtubeIdx = headers.findIndex(h => h.includes("유튜브"));

    if (titleIdx === -1) {
      alert("CSV 파일에 '게시물제목' 또는 '제목' 컬럼이 반드시 존재해야 합니다.");
      return;
    }

    const previewData = parsedRows.slice(1).map((row, idx) => {
      const titleVal = row[titleIdx] || "";
      const catVal = categoryIdx !== -1 ? row[categoryIdx] || "" : "";
      const contentVal = contentIdx !== -1 ? row[contentIdx] || "" : "";
      const driveVal = driveIdx !== -1 ? row[driveIdx] || "" : "";
      const youtubeVal = youtubeIdx !== -1 ? row[youtubeIdx] || "" : "";

      return {
        id: idx,
        title: titleVal,
        category: catVal,
        content: contentVal,
        drive_url: driveVal,
        youtube_url: youtubeVal,
      };
    });

    setCsvPreview(previewData);
  };

  const handleBulkSubmit = async () => {
    if (csvPreview.length === 0) return;
    
    setIsImporting(true);
    
    const formattedPosts = csvPreview.map(item => {
      let fullTitle = item.title;
      if (item.category && !item.title.startsWith("[")) {
        fullTitle = `[${item.category}] ${item.title}`;
      }

      const externalLinksList = [];
      if (item.drive_url) {
        externalLinksList.push({
          id: "drive_" + Math.random().toString(36).substring(2, 9),
          type: "DRIVE" as const,
          label: "공유 드라이브",
          url: item.drive_url
        });
      }
      if (item.youtube_url) {
        externalLinksList.push({
          id: "youtube_" + Math.random().toString(36).substring(2, 9),
          type: "YOUTUBE" as const,
          label: "유튜브 시청",
          url: item.youtube_url
        });
      }

      const postObj: any = {
        board_id: boardId,
        title: fullTitle,
        content: item.content,
        author_id: serverUser?.id || undefined,
        author_name: (userLevel >= 5 || serverUser?.role?.toUpperCase() === "ADMIN" || serverUser?.role?.toUpperCase() === "최고관리자" || serverUser?.role?.includes("관리자"))
          ? "최고관리자"
          : (serverUser?.name || serverUser?.email?.split('@')[0] || "익명"),
      };

      if (item.drive_url) postObj.drive_url = item.drive_url;
      if (item.youtube_url) postObj.youtube_url = item.youtube_url;
      if (externalLinksList.length > 0) {
        postObj.external_url = JSON.stringify(externalLinksList);
      }

      return postObj;
    });

    const res = await saveBoardPostsBatch(formattedPosts);
    setIsImporting(false);

    if (res.success) {
      alert(`성공적으로 ${res.count}개의 게시글이 일괄 등록되었습니다.`);
      router.push(`/board?id=${boardId}`);
    } else {
      alert("일괄 등록에 실패했습니다: " + res.error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("게시글 제목을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);

    const fullTitle = category ? `[${category}] ${title}` : title;

    // 편의 기능: 사용자가 인풋창에 입력만 하고 '추가'를 누르지 않고 제출해도 자동으로 포함
    const currentLinks = [...externalLinks];
    if (newLinkUrl.trim() !== "") {
      currentLinks.push({ id: Date.now().toString() + "_auto", type: newLinkType, label: newLinkLabel, url: newLinkUrl });
      // 상태는 여기서 굳이 업데이트하지 않고 제출 프로세스 속도 향상
    }

    const firstYt = currentLinks.find(l => l.type === "YOUTUBE")?.url;
    const firstDrive = currentLinks.find(l => l.type === "DRIVE")?.url;

    const res = await saveBoardPost({
      ...(isEditMode ? { id: editPostId! } : {}),
      board_id: boardId,
      title: fullTitle,
      content,
      youtube_url: firstYt || undefined,
      drive_url: firstDrive || undefined,
      external_url: currentLinks.length > 0 ? JSON.stringify(currentLinks) : undefined,
      author_id: serverUser?.id || undefined,
      author_name: isEditMode ? editPost?.author_name : (
        (serverUser?.role?.toUpperCase() === "ADMIN" || serverUser?.role?.toUpperCase() === "최고관리자" || serverUser?.role?.includes("관리자"))
          ? "최고관리자"
          : (serverUser?.name || serverUser?.email?.split('@')[0] || "익명")
      ),
    });

    if (res.success && res.postId) {
      // 썸네일 업로드 (webp 자동 변환 처리)
      if (thumbnailFile) {
        const webpFile = await convertToWebp(thumbnailFile);
        const fd = new FormData();
        fd.append("file", webpFile);
        fd.append("post_id", res.postId);
        await uploadBoardThumbnail(fd);
      }

      // 첨부파일 업로드
      for (let i = 0; i < attachedFiles.length; i++) {
        const fd = new FormData();
        fd.append("file", attachedFiles[i]);
        fd.append("post_id", res.postId);
        fd.append("sort_order", String(i));
        await uploadBoardAttachment(fd);
      }
      alert(isEditMode ? "게시글이 수정되었습니다." : "게시글이 성공적으로 등록되었습니다.");
      router.push(`/board_read?id=${res.postId || editPostId}&board_id=${boardId}`);
    } else {
      alert((isEditMode ? "수정" : "등록") + " 실패: " + res.error);
    }
    setIsSubmitting(false);
  };

  if (isLevelChecking) {
    return <div style={{ padding: 100, textAlign: "center", color: "#666" }}>권한을 확인하는 중입니다...</div>;
  }

  if (!canAccessBoard(userLevel, board.perm_write ?? 5)) {
    return (
      <div style={{ padding: 100, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, color: "#ef4444", marginBottom: 12 }}>{getLevelName(board.perm_write ?? 5)}부터 작성하실 수 있습니다.</h2>
        <p style={{ color: "#666" }}>쓰기 레벨: <strong>{board.perm_write ?? 5}레벨 이상</strong> (현재 내 레벨: {userLevel}레벨)</p>
        <button onClick={() => router.push(`/board?id=${boardId}`)} style={{ marginTop: 24, padding: "10px 24px", background: "#333", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px",
      fontFamily: "'Pretendard', -apple-system, sans-serif",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #222", paddingBottom: 16, marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#102c57", margin: 0 }}>
          {boardName} 게시물 {isEditMode ? "수정" : "작성"}
        </h1>
        <span style={{ fontSize: 14, color: "#888" }}>작성자: {editPost?.author_name || "관리자"}</span>
      </div>

      {/* 엑셀/CSV 일괄 등록 (관리자용) */}
      {!isEditMode && (userLevel >= 5 || serverUser?.role?.toUpperCase() === "ADMIN" || serverUser?.role?.toUpperCase() === "최고관리자" || serverUser?.role?.includes("관리자")) && (
        <div style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: "24px",
          marginBottom: 30,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
          fontFamily: "inherit"
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            📊 <span>엑셀/CSV 일괄 등록 (관리자용)</span>
          </h3>
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            CSV 백업 파일을 선택하여 다수의 게시글을 한 번에 일괄 등록할 수 있습니다.<br />
            필수 헤더: <strong>게시물제목</strong> (또는 제목), <strong>구분</strong> (또는 카테고리), <strong>내용</strong> (또는 본문), <strong>구글드라이브 URL</strong> (또는 드라이브 URL).
          </p>
          
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", background: "#fff", border: "1px solid #cbd5e1",
              borderRadius: 6, fontSize: 14, fontWeight: 600, color: "#334155",
              cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}>
              📁 파일 선택
              <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: "none" }} />
            </label>
            {csvFile && <span style={{ fontSize: 14, color: "#0f172a", fontWeight: 500 }}>선택된 파일: {csvFile.name} ({csvPreview.length}개 항목)</span>}
          </div>

          {/* 파싱 결과 미리보기 */}
          {csvPreview.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>미리보기 (최대 5건 표시)</div>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "8px 12px", color: "#64748b" }}>제목</th>
                      <th style={{ padding: "8px 12px", color: "#64748b", width: 80 }}>구분</th>
                      <th style={{ padding: "8px 12px", color: "#64748b" }}>드라이브 URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 5).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }} title={row.title}>{row.title}</td>
                        <td style={{ padding: "8px 12px" }}>{row.category}</td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }} title={row.drive_url}>{row.drive_url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={isImporting}
                  style={{
                    padding: "10px 24px", background: isImporting ? "#64748b" : "#10b981",
                    color: "#fff", border: "none", borderRadius: 6, fontSize: 14,
                    fontWeight: 700, cursor: isImporting ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 4px rgba(16,185,129,0.2)"
                  }}
                >
                  🚀 {isImporting ? "등록 중..." : `${csvPreview.length}개 게시글 일괄 등록 실행`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 카테고리 + 제목 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {categories.length > 0 && (
          <div style={{ flexShrink: 0 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>카테고리</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                height: 46, padding: "0 36px 0 14px", fontSize: 15, fontWeight: 600,
                border: "1px solid #d1d5db", borderRadius: 6, background: "#fff",
                color: "#102c57", outline: "none", cursor: "pointer",
                minWidth: 130, appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
              }}
            >
              {categories.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>게시글 제목</label>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: "100%", height: 46, padding: "0 16px", fontSize: 15,
              border: "1px solid #d1d5db", borderRadius: 6, outline: "none",
              boxSizing: "border-box", color: "#111",
            }}
          />
        </div>
      </div>

      {/* 영상/자료실 전용 간편 필드 */}
      {isVideoOrThumb && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            🔗 <span>영상 스킨(video_album) 및 자료실 스킨(file_album) 전용 간편 등록 필드입니다. HTML 복붙 없이 주소만 넣으세요.</span>
          </div>

          {/* 다중 외부 링크 매니저 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>외부 링크 자료 추가 (여러 개 등록 가능)</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={newLinkType}
                onChange={e => setNewLinkType(e.target.value as any)}
                style={{ height: 42, padding: "0 14px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, outline: "none", cursor: "pointer" }}
              >
                <option value="YOUTUBE">🎬 YouTube 영상</option>
                <option value="DRIVE">📁 구글 드라이브 다운로드</option>
                <option value="LINK">🔗 일반 외부링크</option>
              </select>
              <input
                type="text"
                placeholder={newLinkType === "YOUTUBE" ? "예: 유튜브 (또는 공백)" : "라벨 (기획서 다운 등)"}
                value={newLinkLabel}
                onChange={e => setNewLinkLabel(e.target.value)}
                style={{ width: 150, height: 42, padding: "0 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
              />
              <input
                type="url"
                placeholder={
                  newLinkType === "YOUTUBE" ? "https://youtu.be/..." :
                  newLinkType === "DRIVE" ? "https://drive.google.com/..." : "https://..."
                }
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!newLinkUrl.trim()) return alert("URL을 입력해주세요.");
                    let autoType = newLinkType;
                    if (newLinkUrl.includes("drive.google.com")) autoType = "DRIVE";
                    else if (newLinkUrl.includes("youtube.com") || newLinkUrl.includes("youtu.be")) autoType = "YOUTUBE";
                    
                    setExternalLinks([...externalLinks, { id: Date.now().toString(), type: autoType, label: newLinkLabel, url: newLinkUrl }]);
                    setNewLinkLabel("");
                    setNewLinkUrl("");
                  }
                }}
                style={{ flex: 1, minWidth: 200, height: 42, padding: "0 14px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!newLinkUrl.trim()) return alert("URL을 입력해주세요.");
                  let autoType = newLinkType;
                  if (newLinkUrl.includes("drive.google.com")) autoType = "DRIVE";
                  else if (newLinkUrl.includes("youtube.com") || newLinkUrl.includes("youtu.be")) autoType = "YOUTUBE";

                  setExternalLinks([...externalLinks, { id: Date.now().toString(), type: autoType, label: newLinkLabel, url: newLinkUrl }]);
                  setNewLinkLabel("");
                  setNewLinkUrl("");
                }}
                style={{ padding: "0 18px", height: 42, background: "#102c57", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                + 추가
              </button>
            </div>
            
            {/* 등록된 링크 리스트 */}
            {externalLinks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {externalLinks.map((link) => (
                  <div key={link.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e2e8f0", padding: "12px 16px", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                      {link.type === "YOUTUBE" && <span style={{ color: "#ef4444", fontSize: 20, display: "flex", padding: 8, background: "#fef2f2", borderRadius: 8 }}>🎬</span>}
                      {link.type === "DRIVE" && <span style={{ color: "#22c55e", fontSize: 20, display: "flex", padding: 8, background: "#f0fdf4", borderRadius: 8 }}>📁</span>}
                      {link.type === "LINK" && <span style={{ color: "#3b82f6", fontSize: 20, display: "flex", padding: 8, background: "#eff6ff", borderRadius: 8 }}>🔗</span>}
                      
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                         <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>
                           {link.label || (link.type === "YOUTUBE" ? "유튜브 시청" : link.type === "DRIVE" ? "공유 드라이브" : "외부 자료 가기")}
                         </span>
                         <span style={{ fontSize: 13, color: "#64748b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{link.url}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setExternalLinks(externalLinks.filter(l => l.id !== link.id))} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer", padding: "0 8px", lineHeight: 1 }}>&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 썸네일 */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>목록 노출용 대표 썸네일 (선택)</label>
            <div
              onClick={handleThumbnailClick}
              style={{
                width: 160, height: 100, border: "2px dashed #d1d5db", borderRadius: 8,
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "#fff",
                overflow: "hidden", position: "relative",
              }}
            >
              {thumbnailPreview ? (
                <img src={thumbnailPreview} alt="썸네일" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>이미지 클릭하여 첨부</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleThumbnailChange} />
          </div>

          {/* 첨부파일 */}
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>첨부파일 (선택)</label>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => attachInputRef.current?.click()}
                style={{
                  padding: "10px 20px", border: "2px dashed #d1d5db", borderRadius: 8,
                  background: "#fff", cursor: "pointer", fontSize: 13, color: "#666",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                파일 추가
              </button>
              <input
                ref={attachInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setAttachedFiles(prev => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
              {attachedFiles.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                  background: "#f1f5f9", borderRadius: 6, fontSize: 13, color: "#333",
                }}>
                  <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>({(f.size / 1024).toFixed(0)}KB)</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, padding: 0, lineHeight: 1 }}
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 상세 본문 */}
      <div style={{ marginBottom: 30 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 8 }}>상세 본문 (선택)</label>
        <div style={{ border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden" }}>
          {/* 간단한 툴바 흉내 */}
          <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
            {["✨", "B", "I", "A", "■", "≡", "≣", "🔗", "🖼"].map((tool, i) => (
              <button key={i} style={{
                width: 30, height: 28, border: "1px solid #e5e7eb", background: "#fff",
                borderRadius: 4, fontSize: tool === "B" || tool === "I" ? 14 : 13,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: tool === "B" ? 900 : tool === "I" ? 700 : 400,
                fontStyle: tool === "I" ? "italic" : "normal",
                color: "#333",
              }}>
                {tool}
              </button>
            ))}
          </div>
          <textarea
            placeholder="게시물 본문을 자유롭게 작성하세요."
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{
              width: "100%", height: 280, padding: "16px", fontSize: 15,
              border: "none", resize: "none", outline: "none",
              boxSizing: "border-box", lineHeight: 1.7, color: "#333",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* 제출 버튼 */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: "1px solid #e5e7eb" }}>
        <Link
          href={`/board?id=${boardId}`}
          style={{
            padding: "12px 24px", border: "1px solid #d1d5db", background: "#fff",
            color: "#555", borderRadius: 6, fontSize: 15, fontWeight: 600,
            textDecoration: "none", display: "inline-block",
          }}
        >
          목록으로 취소
        </Link>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            padding: "12px 32px", background: isSubmitting ? "#555" : "#102c57",
            color: "#fff", border: "none", borderRadius: 6, fontSize: 15,
            fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          🚀 {isSubmitting ? (isEditMode ? "수정 중..." : "등록 중...") : (isEditMode ? "수정 완료" : "게시글 최종 등록")}
        </button>
      </div>
    </div>
  );
}
