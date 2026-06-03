"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMyEnrollments } from "@/app/actions/lecture";

export default function MyLecturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }

      const res = await getMyEnrollments(user.id);
      if (res.success) setEnrollments(res.data);
      setLoading(false);
    };
    load();
  }, [router]);

  return (
    <div style={{ width: "100%", maxWidth: 448, margin: "0 auto", minHeight: "100vh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ?¤ë” */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>???˜ê°•?¹ê°•</h1>
      </div>

      {/* ë¡œë”© */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <div style={{ textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>?“š</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>?˜ê°• ?´ì—­??ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
          </div>
        </div>
      ) : enrollments.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <div style={{ textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>?“­</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>?˜ê°• ì¤‘ì¸ ?¹ê°•???†ìŠµ?ˆë‹¤</div>
            <div style={{ fontSize: 13, color: "#b0b0b0", lineHeight: 1.5 }}>
              ì§€ê¸?ë°”ë¡œ ê³µì‹¤?´ìŠ¤??? ìµ???¹ê°•??ë§Œë‚˜ë³´ì„¸??
            </div>
            <button
              onClick={() => router.push("/m/study")}
              style={{ marginTop: 20, padding: "10px 24px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              ë¶€?™ì‚°?¹ê°• ?˜ëŸ¬ë³´ê¸°
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px" }}>
          {/* ì¹´ìš´??*/}
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 12, padding: "0 4px" }}>
            ì´?<span style={{ color: "#059669", fontWeight: 800 }}>{enrollments.length}</span>ê°?          </div>

          {/* ?¹ê°• ë¦¬ìŠ¤??*/}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {enrollments.map((en: any, idx: number) => {
              const lecture = en.lecture;
              const isExpired = new Date(en.expires_at) < new Date();
              return (
                <Link
                  key={en.id}
                  href={`/m/study_watch?id=${en.lecture_id}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "#fff",
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", padding: 16, gap: 14 }}>
                    {/* ?¸ë„¤??*/}
                    <div style={{ width: 100, height: 70, borderRadius: 8, overflow: "hidden", background: "#f3f4f6", flexShrink: 0, position: "relative" }}>
                      {lecture?.thumbnail_url ? (
                        <img src={lecture.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#a8edea,#fed6e3)", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                          {lecture?.category || "?¹ê°•"}
                        </div>
                      )}
                      {isExpired && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                          ë§Œë£Œ??                        </div>
                      )}
                    </div>

                    {/* ?•ë³´ */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 4 }}>
                        {lecture?.category || "?¼ë°˜?¹ê°•"}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {lecture?.title || "?? œ??ê°•ì˜?…ë‹ˆ??}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        ë§Œë£Œ?? {new Date(en.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* ?˜ë‹¨ ë°?*/}
                  <div style={{ padding: "10px 16px", background: "#f9fafb", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                      ê²°ì œ ?¬ì¸?? {en.points_paid.toLocaleString()}P
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isExpired ? "#ef4444" : "#2563eb" }}>
                      {isExpired ? "?¬ìˆ˜ê°•í•˜ê¸? : "?´ì–´???˜ê°•?˜ê¸° ??}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
