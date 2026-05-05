"use client";

import React from "react";
import Link from "next/link";
import HomeHeader from "../_components/HomeHeader";

export default function MobileStudyHubClient({ lectures }: any) {
  return (
    <div style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px', paddingTop: '50px' }}>
      <HomeHeader 
        bgColor="#16a34a" 
        logoText="부동산특강"
        sloganPrefix="AI시대 부동산중개에 필요한 "
        sloganHighlight="마케팅 특강"
        highlightColor="#fcd34d"
        homeUrl="/m/study"
      />

      {/* 콘텐츠 영역 */}
      <div style={{ padding: '16px', paddingTop: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {lectures.map((lecture: any) => (
            <Link key={lecture.id} href={`/m/study_read?id=${lecture.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', cursor: 'pointer' }}>
                <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', backgroundColor: '#e5e7eb' }}>
                  {lecture.thumbnail_url ? (
                    <img src={lecture.thumbnail_url} alt={lecture.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#a8edea,#fed6e3)', fontSize: 24, fontWeight: 800, color: '#555' }}>
                      {lecture.category || "특강"}
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    {lecture.category || "중개실무"}
                  </div>
                  <h2 style={{ color: '#111827', fontSize: '18px', fontWeight: 700, lineHeight: 1.3, marginBottom: '12px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {lecture.title}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#4b5563', marginBottom: '16px' }}>
                    <span style={{ marginRight: '8px' }}>{lecture.instructor_name || "강사"}</span>
                    <span style={{ display: 'flex', alignItems: 'center', color: '#3b82f6' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{ marginRight: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      {(lecture.rating || 0).toFixed(1)} ({lecture.review_count || 0})
                    </span>
                  </div>
                  <div style={{ display: 'inline-block', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px' }}>
                    <span style={{ color: '#111827', fontWeight: 700, fontSize: '16px' }}>
                      {lecture.discount_price ? lecture.discount_price.toLocaleString() : lecture.price ? lecture.price.toLocaleString() : "무료"} P
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
