"use client";

import React, { useEffect, useRef, useState } from "react";
import { canvasToWebpFile, loadEditableImage, pixelateCanvasRegion, type MosaicRect } from "@/utils/imageMosaic";

const MAX_UNDO = 10;

/**
 * 기사에 넣은 사진을 전체화면에서 모자이크 처리하는 편집기 (PC·모바일 공용)
 * 사진 위를 드래그한 사각형 영역이 바로 모자이크되며, 완료 시 WebP 파일을 돌려준다.
 */
export default function PhotoMosaicEditor({ src, fileName, onCancel, onComplete }: {
  src: string;
  fileName?: string;
  onCancel: () => void;
  onComplete: (file: File) => void | Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<ImageData | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<MosaicRect | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [editCount, setEditCount] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const isUploadedPhoto = !src.startsWith("blob:") && !src.startsWith("data:");

  useEffect(() => {
    let cancelled = false;
    loadEditableImage(src)
      .then(image => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("이 브라우저에서는 사진을 편집할 수 없습니다.");
        context.drawImage(image, 0, 0);
        originalRef.current = context.getImageData(0, 0, canvas.width, canvas.height);
        setStatus("ready");
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMessage(err?.message || "사진을 불러오지 못했습니다.");
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [src]);

  // 편집 중에는 뒤 화면이 스크롤되지 않도록 고정
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const toLocalPoint = (event: React.PointerEvent) => {
    const bounds = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
    };
  };

  const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): MosaicRect => ({
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (status !== "ready" || saving) return;
    event.preventDefault();
    startRef.current = toLocalPoint(event);
    setDragRect(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    event.preventDefault();
    setDragRect(rectFrom(startRef.current, toLocalPoint(event)));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    startRef.current = null;
    setDragRect(null);
    const canvas = canvasRef.current;
    if (!start || !canvas) return;
    const rect = rectFrom(start, toLocalPoint(event));
    if (rect.width < 8 || rect.height < 8) return; // 실수로 톡 누른 경우 무시

    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const before = context.getImageData(0, 0, canvas.width, canvas.height);
    const applied = pixelateCanvasRegion(canvas, {
      left: rect.left * scaleX,
      top: rect.top * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
    });
    if (!applied) return;
    undoStackRef.current = [...undoStackRef.current, before].slice(-MAX_UNDO);
    setUndoCount(undoStackRef.current.length);
    setEditCount(c => c + 1);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const last = undoStackRef.current.pop();
    if (!canvas || !last) return;
    canvas.getContext("2d")?.putImageData(last, 0, 0);
    setUndoCount(undoStackRef.current.length);
    setEditCount(c => Math.max(0, c - 1));
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalRef.current) return;
    canvas.getContext("2d")?.putImageData(originalRef.current, 0, 0);
    undoStackRef.current = [];
    setUndoCount(0);
    setEditCount(0);
  };

  const handleComplete = async () => {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    if (editCount === 0) { onCancel(); return; }
    setSaving(true);
    try {
      const baseName = fileName || decodeURIComponent(src.split("?")[0].split("/").pop() || "photo");
      await onComplete(await canvasToWebpFile(canvas, baseName));
    } catch (err) {
      alert(err instanceof Error ? err.message : "모자이크 사진을 만들지 못했습니다.");
      setSaving(false);
    }
  };

  const toolButton = (enabled: boolean): React.CSSProperties => ({
    height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #4b5563",
    background: "transparent", color: enabled ? "#f9fafb" : "#6b7280",
    fontSize: 14, fontWeight: 700, cursor: enabled ? "pointer" : "default",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30000, background: "#111827", display: "flex", flexDirection: "column", color: "#f9fafb" }}>
      {/* 상단: 취소 / 제목 / 완료 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #374151" }}>
        <button type="button" onClick={onCancel} disabled={saving} style={{ background: "none", border: "none", color: "#d1d5db", fontSize: 15, fontWeight: 600, cursor: "pointer", padding: 4 }}>취소</button>
        <span style={{ fontSize: 16, fontWeight: 800 }}>사진 모자이크</span>
        <button
          type="button"
          onClick={handleComplete}
          disabled={status !== "ready" || saving}
          style={{ background: "none", border: "none", color: status === "ready" && !saving ? "#60a5fa" : "#6b7280", fontSize: 15, fontWeight: 800, cursor: status === "ready" && !saving ? "pointer" : "default", padding: 4 }}
        >
          {saving ? "적용 중…" : "완료"}
        </button>
      </div>

      {/* 사진 영역 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden" }}>
        {status === "loading" && <span style={{ fontSize: 14, color: "#9ca3af" }}>사진을 불러오는 중…</span>}
        {status === "error" && <span style={{ fontSize: 14, color: "#fca5a5", textAlign: "center", lineHeight: 1.6 }}>{errorMessage}</span>}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { startRef.current = null; setDragRect(null); }}
          style={{ position: "relative", display: status === "ready" ? "inline-block" : "none", lineHeight: 0, touchAction: "none", userSelect: "none", cursor: "crosshair" }}
        >
          <canvas ref={canvasRef} style={{ display: "block", maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100dvh - 210px)", width: "auto", height: "auto" }} />
          {dragRect && (
            <div style={{ position: "absolute", left: dragRect.left, top: dragRect.top, width: dragRect.width, height: dragRect.height, border: "2px solid #ef4444", background: "rgba(239,68,68,0.2)", pointerEvents: "none", boxSizing: "border-box" }} />
          )}
        </div>
      </div>

      {/* 하단: 안내 + 되돌리기 / 원래대로 */}
      <div style={{ padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid #374151" }}>
        <div style={{ fontSize: 13, color: "#d1d5db", marginBottom: 6, textAlign: "center" }}>가릴 부분을 사각형으로 그으세요. 여러 번 지정할 수 있습니다.</div>
        {isUploadedPhoto && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10, textAlign: "center", lineHeight: 1.5 }}>
            저장하면 원본 사진은 서버에서 삭제됩니다. 이미 발행된 기사라면 포털·검색엔진 등 외부에 원본이 남아 있을 수 있습니다.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" onClick={handleUndo} disabled={undoCount === 0 || saving} style={toolButton(undoCount > 0 && !saving)}>↶ 되돌리기</button>
          <button type="button" onClick={handleReset} disabled={editCount === 0 || saving} style={toolButton(editCount > 0 && !saving)}>원래대로</button>
        </div>
      </div>
    </div>
  );
}
