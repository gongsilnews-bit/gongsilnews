"use client";

import React from "react";

/* ── Shimmer animation keyframes (injected once) ── */
const shimmerStyle = `
@keyframes adminShimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

const ShimmerBar = ({ width = "100%", height = 14, style }: { width?: string | number; height?: number; style?: React.CSSProperties }) => (
  <div style={{
    width, height, borderRadius: 4,
    background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)",
    backgroundSize: "800px 100%",
    animation: "adminShimmer 1.5s infinite linear",
    ...style,
  }} />
);

/* ── KPI Skeleton (4 cards) ── */
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 16, marginBottom: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "4px solid #e5e7eb" }}>
          <ShimmerBar width={32} height={32} style={{ borderRadius: 6, marginBottom: 10 }} />
          <ShimmerBar width="60%" height={12} style={{ marginBottom: 8 }} />
          <ShimmerBar width="40%" height={28} style={{ marginBottom: 6 }} />
          <ShimmerBar width="70%" height={10} />
        </div>
      ))}
    </div>
  );
}

/* ── Table Skeleton (rows with columns) ── */
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 12 }}>
        <ShimmerBar width={120} height={36} style={{ borderRadius: 6 }} />
        <ShimmerBar width={100} height={36} style={{ borderRadius: 6 }} />
        <ShimmerBar width={200} height={36} style={{ borderRadius: 6, flex: 1 }} />
        <ShimmerBar width={80} height={36} style={{ borderRadius: 6 }} />
      </div>
      {/* Action bar */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 10 }}>
        <ShimmerBar width={100} height={36} style={{ borderRadius: 6 }} />
        <ShimmerBar width={120} height={36} style={{ borderRadius: 6 }} />
      </div>
      {/* Table header */}
      <div style={{ display: "flex", padding: "12px 24px", borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ flex: i === 3 ? 2 : 1, padding: "0 10px" }}>
            <ShimmerBar width="70%" height={14} />
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", padding: "16px 24px", borderBottom: "1px solid #f3f4f6" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{ flex: c === 3 ? 2 : 1, padding: "0 10px", display: "flex", alignItems: "center" }}>
              <ShimmerBar width={c === 0 ? 16 : c === 3 ? "80%" : "60%"} height={c === 0 ? 16 : 14} style={c === 0 ? { borderRadius: 3 } : {}} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Full-page admin loading fallback ── */
export default function AdminLoadingFallback() {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: "#f4f5f7" }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <ShimmerBar width={180} height={24} style={{ borderRadius: 6 }} />
          <ShimmerBar width={120} height={16} style={{ borderRadius: 4 }} />
        </div>
        {/* Table Skeleton */}
        <TableSkeleton rows={8} cols={6} />
      </div>
    </>
  );
}
