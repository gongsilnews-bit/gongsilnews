"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLectures } from "@/app/actions/lecture";

export default function SpecialLectureBanner({ initialLectures }: { initialLectures?: any[] }) {
  const [lectures, setLectures] = useState<any[]>(initialLectures || []);
  const [loading, setLoading] = useState(initialLectures === undefined);

  useEffect(() => {
    if (initialLectures !== undefined) return;
    const fetchLectures = async () => {
      const res = await getLectures({ status: "ACTIVE" });
      if (res.success && res.data && res.data.length > 0) {
        setLectures(res.data.slice(0, 4)); // 최대 4개 표시
      } else {
        // DB에 데이터 없으면 기본 하드코딩 데이터 사용
        setLectures([
          { id: null, category: "실무/마케팅", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 운영법", instructor_name: "공실마스터 특강", rating: 4.9, review_count: 137, price: 2000, thumbnail_url: null, _isNew: true },
          { id: null, category: "경매/특수물건", title: "[2026] 부동산이 알아야 하는 민법 활용법", instructor_name: "공실마스터 특강", rating: 4.8, review_count: 198, price: 3000, thumbnail_url: null, _isNew: true },
          { id: null, category: "재개발/투자", title: "[2026] 부동산 중개에 필요한 재개발 활용법", instructor_name: "공실마스터 특강", rating: 4.9, review_count: 154, price: 5000, thumbnail_url: null, _isNew: false },
        ]);
      }
      setLoading(false);
    };
    fetchLectures();
  }, []);

  // 최근 7일 이내 등록이면 NEW 표시
  const isNew = (createdAt: string) => {
    if (!createdAt) return false;
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  const formatPrice = (p: number) => {
    if (!p) return "무료";
    return p.toLocaleString() + " P";
  };

  return (
    <div className="container px-20 mt-50 mb-50">
      <div className="sec-title-wrap">
        <h2 className="sec-title" id="special-lecture" style={{ scrollMarginTop: 150 }}>부동산특강</h2>
      </div>
      <div className="lecture-grid mb-50">
        {lectures.map((item, i) => (
          <Link href={item.id ? `/study_read?id=${item.id}` : "/study_read"} key={item.id || i} className="lecture-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="lecture-thumb">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 16, fontWeight: 700,
                }}>
                  {item.category || "특강"}
                </div>
              )}
              {(item._isNew || isNew(item.created_at)) && <span className="badge-new">NEW🔥</span>}
              <div className="bookmark-btn">🔖</div>
            </div>
            <div className="lecture-info" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="lecture-cat">{item.category}</div>
              <h3 className="lecture-title" style={{ wordBreak: "keep-all" }}>{item.title}</h3>
              <div className="lecture-meta">
                <span className="instructor">{item.instructor_name || "공실마스터 특강"}</span>
                <div className="rating">★ {item.rating || "0.0"} ({item.review_count || 0})</div>
              </div>
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontWeight: 800, color: "#111", fontSize: 17, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, display: "inline-block", border: "1px solid #e2e8f0" }}>
                  {formatPrice(item.discount_price || item.price)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
