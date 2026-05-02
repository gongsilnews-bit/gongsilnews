import React from 'react';
import Link from 'next/link';
import HomeHeader from '../_components/HomeHeader';
import { getLectures } from '@/app/actions/lecture';

export const dynamic = 'force-dynamic';

export default async function MobileStudyPage() {
  const res = await getLectures({ status: "ACTIVE" });
  const lectures = res.success && res.data ? res.data : [];

  return (
    <div style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px', paddingTop: '50px' }}>
      
      <HomeHeader 
        bgColor="#16a34a" 
        logoText="부동산특강"
        sloganPrefix="AI시대 부동산중개에 필요한 "
        sloganHighlight="마케팅 특강"
        highlightColor="#fcd34d"
      />

      {/* 상단 타이틀 영역 */}
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#1a2e50', display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '6px', height: '20px', backgroundColor: '#1a2e50', marginRight: '8px', display: 'inline-block' }}></span>
          부동산특강
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
          공실뉴스가 엄선한 최고의 실무 강의
        </p>
      </div>

      {/* 특강 리스트 */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {lectures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>등록된 강의가 없습니다.</div>
        ) : (
          lectures.map((lecture: any) => (
            <Link key={lecture.id} href={`/m/study_read?id=${lecture.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', cursor: 'pointer' }}>
                
                {/* 썸네일 */}
                <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', backgroundColor: '#e5e7eb' }}>
                  {lecture.thumbnail_url ? (
                    <img src={lecture.thumbnail_url} alt={lecture.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#a8edea,#fed6e3)', fontSize: 24, fontWeight: 800, color: '#555' }}>
                      {lecture.category || "특강"}
                    </div>
                  )}
                  {/* 북마크 리본 */}
                  <div style={{ position: 'absolute', top: 0, right: '16px', width: '28px', height: '36px', backgroundColor: '#ff4d4f', display: 'flex', justifyContent: 'center', paddingTop: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </div>
                </div>

                {/* 텍스트 정보 */}
                <div style={{ padding: '16px' }}>
                  <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    {lecture.category || "중개실무"}
                  </div>
                  <h2 style={{ color: '#111827', fontSize: '18px', fontWeight: 700, lineHeight: 1.3, marginBottom: '12px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
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
          ))
        )}
      </div>
    </div>
  );
}
