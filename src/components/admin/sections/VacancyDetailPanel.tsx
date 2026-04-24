"use client";

import React, { useEffect, useState, useRef } from "react";
import { getVacancyDetail, updateVacancyStatus, deleteVacancy } from "@/app/actions/vacancy";
import { createClient } from "@/utils/supabase/client";
import "./vacancy-detail.css";

interface VacancyDetailPanelProps {
  vacancyId: string;
  onBack: () => void;
  onEdit: () => void;
}

export default function VacancyDetailPanel({ vacancyId, onBack, onEdit }: VacancyDetailPanelProps) {
  const [vacancy, setVacancy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deviceMode, setDeviceMode] = useState<"pc" | "tablet" | "mobile">("tablet"); // Tablet default in legacy
  const [activeTab, setActiveTab] = useState<"info" | "realtor">("info");
  
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [memoInput, setMemoInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    const sub = supabase.channel('vacancy_comments_sidebar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vacancy_comments', filter: `vacancy_id=eq.${vacancyId}` }, (payload) => {
        setComments(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [vacancyId]);

  const fetchData = async () => {
    setLoading(true);
    const [res, { data: commentsData }] = await Promise.all([
      getVacancyDetail(vacancyId),
      supabase.from("vacancy_comments").select("*").eq("vacancy_id", vacancyId).order("created_at", { ascending: true })
    ]);
    if (res.success) setVacancy(res.data);
    if (commentsData) setComments(commentsData);
    setLoading(false);
  };

  const submitComment = async () => {
    if (!memoInput.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("로그인이 필요합니다.");
    const { data: member } = await supabase.from("members").select("name, role").eq("id", session.user.id).single();
    if (!member) return;

    await supabase.from("vacancy_comments").insert({
      vacancy_id: vacancyId,
      author_id: session.user.id,
      author_name: member.name || "사용자",
      author_role: member.role || "user",
      content: memoInput.trim()
    });
    setMemoInput("");
  };

  const toggleStatus = async () => {
    if (!vacancy) return;
    const isAdOn = vacancy.status === 'ACTIVE' || vacancy.status === 'PENDING';
    const next = isAdOn ? 'STOPPED' : 'ACTIVE';
    if (!confirm(isAdOn ? '광고를 종료하시겠습니까?' : '광고를 재개할까요?')) return;
    const res = await updateVacancyStatus(vacancy.id, next);
    if (res.success) setVacancy({ ...vacancy, status: next });
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/board/detail/${vacancyId}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('공유 URL이 복사되었습니다.'));
  };

  if (loading) return <div className="gdv-page-body"><div className="gdv-loading">⏳ 공실 데이터를 불러오는 중...</div></div>;
  if (!vacancy) return <div className="gdv-page-body"><div className="gdv-loading">매물을 불러올 수 없습니다.</div></div>;

  const images = (vacancy.images && vacancy.images.length > 0) ? vacancy.images : ['https://via.placeholder.com/800x400/EEEEEE/AAAAAA?text=No+Image'];
  const propName = vacancy.building_name || vacancy.property_type || '공실매물';
  const isAdOn = vacancy.status === 'ACTIVE' || vacancy.status === 'PENDING';
  
  const formatPrice = (val: number) => {
    if (!val) return '0';
    if (val >= 10000) {
      const uk = Math.floor(val / 10000);
      const man = val % 10000;
      return man > 0 ? `${uk}억 ${man}` : `${uk}억`;
    }
    return val.toLocaleString();
  };
  const priceStr = () => {
    const d = formatPrice(vacancy.deposit || 0);
    if (vacancy.trade_type === '매매' || vacancy.trade_type === '전세') return `${vacancy.trade_type} ${d}`;
    return `${vacancy.trade_type} ${d}/${vacancy.monthly_rent || 0}`;
  };

  const areaDisplay = vacancy.exclusive_m2 ? `${vacancy.exclusive_m2}㎡` : '정보없음';
  const subInfo = [vacancy.property_type, vacancy.room_direction, `전용면적: ${areaDisplay}`].filter(Boolean).join(' | ');

  const getDeviceClass = () => {
    return deviceMode !== "pc" ? `gdv-${deviceMode}` : "";
  };

  return (
    <div className="gdv-root gdv-page-body">
      <div style={{ display: 'flex', gap: '30px', width: '100%', alignItems: 'flex-start' }}>
        
        {/* Left Column (Main Preview) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '15px' }}>
            <div className="gdv-device-btns">
              <button className={`gdv-device-btn ${deviceMode==='pc'?'gdv-active':''}`} onClick={() => setDeviceMode('pc')} title="PC(기본패널 너비)">🖥️</button>
              <button className={`gdv-device-btn ${deviceMode==='tablet'?'gdv-active':''}`} onClick={() => setDeviceMode('tablet')} title="태블릿 너비">📱</button>
              <button className={`gdv-device-btn ${deviceMode==='mobile'?'gdv-active':''}`} onClick={() => setDeviceMode('mobile')} title="모바일 너비">📲</button>
            </div>
          </div>

          <div className={`gdv-preview-frame ${getDeviceClass()}`}>
            
            {/* Gallery */}
            <div className="gdv-gallery-wrap">
              <img src={images[galleryIndex]} alt="매물사진" />
              {images.length > 1 && (
                <>
                  <button className="gdv-gallery-nav-btn gdv-prev" onClick={() => setGalleryIndex((i) => (i - 1 + images.length) % images.length)}>〈</button>
                  <button className="gdv-gallery-nav-btn gdv-next" onClick={() => setGalleryIndex((i) => (i + 1) % images.length)}>〉</button>
                </>
              )}
              <span className="gdv-gallery-count">{galleryIndex + 1} / {images.length}</span>
            </div>

            {/* Header Info */}
            <div>
              <div className="gdv-prop-meta-row">
                <div>
                  <span className="gdv-tag-confirm">수수료협의</span>
                  <span className="gdv-prop-date">{new Date(vacancy.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="gdv-prop-name">{propName}</div>
              <div className="gdv-prop-price">{priceStr()}</div>
              <div className="gdv-prop-subinfo">{subInfo}</div>
              <div className="gdv-prop-desc-row">
                <span>룸 {vacancy.room_count || '-'}개</span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>주차 {vacancy.parking ? '가능' : '불가능'}</span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>{vacancy.options || '옵션 미확인'}</span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="gdv-article-toolbar">
              <button className="gdv-btn-toolbar" onClick={onBack}>➖ 목록</button>
              <button className="gdv-btn-toolbar" onClick={onEdit}>✏️ 수정</button>
              <button className="gdv-btn-toolbar" onClick={async () => { if(confirm('이 공실을 삭제하시겠습니까?')) { await deleteVacancy(vacancyId); onBack(); } }}>🗑️ 삭제</button>
              <button className="gdv-btn-toolbar" onClick={copyShareLink}>🔗 주소복사</button>
              <button className="gdv-btn-toolbar" onClick={() => window.open(`/board/detail/${vacancyId}`)}>💻 미리보기</button>
              <button className={`gdv-btn-toolbar ${isAdOn ? 'gdv-blue' : ''}`} onClick={toggleStatus}>
                {isAdOn ? '광고중' : '광고종료'}
              </button>
            </div>

            {/* Tabs */}
            <div className="gdv-detail-tabs">
              <div className={`gdv-tab-item ${activeTab === 'info' ? 'gdv-active' : ''}`} onClick={() => setActiveTab('info')}>매물정보</div>
              <div className={`gdv-tab-item ${activeTab === 'realtor' ? 'gdv-active' : ''}`} onClick={() => setActiveTab('realtor')}>등록자정보</div>
            </div>
            
            {/* Tab Contents */}
            {activeTab === 'info' ? (
              <div>
                <div className="gdv-info-grid">
                  <div className="gdv-info-label">소재지</div><div className="gdv-info-value">{[vacancy.sido, vacancy.sigungu, vacancy.dong, vacancy.detail_address].filter(Boolean).join(' ')}</div>
                  <div className="gdv-info-label">매물특징</div><div className="gdv-info-value">{propName}</div>
                  <div className="gdv-info-label">공급/전용면적</div><div className="gdv-info-value">{areaDisplay}</div>
                  <div className="gdv-info-label">해당층/총층</div><div className="gdv-info-value">{vacancy.current_floor||'-'}층 / {vacancy.total_floor||'-'}층</div>
                  <div className="gdv-info-label">방/욕실수</div><div className="gdv-info-value">{vacancy.room_count||'-'}개 / {vacancy.bathroom_count||'-'}개</div>
                  <div className="gdv-info-label">방향</div><div className="gdv-info-value">{vacancy.room_direction || '-'}</div>
                  <div className="gdv-info-label">주차가능 여부</div><div className="gdv-info-value">{vacancy.parking ? '가능' : '-'}</div>
                  <div className="gdv-info-label">입주가능일</div><div className="gdv-info-value">{vacancy.move_in_date || '날짜 협의'}</div>
                  <div className="gdv-info-label">관리비</div><div className="gdv-info-value">{vacancy.maintenance_fee ? vacancy.maintenance_fee + '만원' : '-'}</div>
                  <div className="gdv-info-label">상세설명</div><div className="gdv-info-value gdv-info-desc">{vacancy.description || ''}</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <div className="gdv-realtor-card">
                  <div className="gdv-rc-name">{vacancy.client_name || vacancy.members?.name || '정보없음'}</div>
                  <div className="gdv-rc-sub">{vacancy.members?.role === 'realtor' ? '부동산 대표' : '일반 사용자'}</div>
                  <div className="gdv-rc-phone">☎ {vacancy.client_phone || vacancy.members?.phone || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="gdv-sidebar-wrap">
          {/* New Log Input */}
          <div className="gdv-sidebar-card">
            <div className="gdv-sidebar-card-title">📝 공실기록</div>
            <textarea value={memoInput} onChange={e => setMemoInput(e.target.value)} placeholder="이곳에 서비스 메모를 남겨주세요..." style={{ width: '100%', height: '80px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', resize: 'none', fontFamily: 'inherit', fontSize: '13px' }}></textarea>
            <div className="gdv-sidebar-memo-footer">
              <button onClick={submitComment} style={{ padding: '6px 14px', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>등록</button>
            </div>
            
            {/* Live Logs */}
            <ul className="gdv-sidebar-log-list">
              {comments.length === 0 ? (
                <li className="gdv-log-empty">등록된 로그가 없습니다.</li>
              ) : (
                comments.slice().reverse().map((c, i) => (
                  <li key={c.id || i} className="gdv-log-item">
                    <div className="gdv-log-num">{i + 1}</div>
                    <div className="gdv-log-content">
                      <div className="gdv-log-title">{c.content}</div>
                      <div className="gdv-log-meta">{new Date(c.created_at).toLocaleString()}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
