'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface SignupCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
  name?: string;
}

export default function SignupCompleteModal({ isOpen, onClose, email = '', name = '' }: SignupCompleteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<'general' | 'realtor'>('general');
  const [formData, setFormData] = useState({
    email: email,
    name: name,
    phone: '',
    // 부동산 회원 전용
    compName: '',
    ceo: '',
    cell: '',
    zipcode: '',
    addr: '',
    addrDetail: '',
    regNum: '',
    bizNum: '',
    generalTel: '',
  });
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    reporter: false,
    promo: false,
  });
  const [expandedTerms, setExpandedTerms] = useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFormData(prev => ({ ...prev, email: email || 'support@naver.com', name: name || '김농현' }));
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, email, name]);

  const handleAgreeAll = () => {
    const next = !agreeAll;
    setAgreeAll(next);
    setAgreements({ terms: next, privacy: next, reporter: next, promo: next });
  };

  const handleAgreement = (key: keyof typeof agreements) => {
    const updated = { ...agreements, [key]: !agreements[key] };
    setAgreements(updated);
    setAgreeAll(updated.terms && updated.privacy && updated.reporter && updated.promo);
  };

  const toggleExpand = (key: string) => {
    setExpandedTerms(expandedTerms === key ? null : key);
  };

  if (!isOpen || !mounted) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
    color: '#333',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#333',
    marginBottom: 6,
    display: 'block',
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh', zIndex: 99999999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, boxSizing: 'border-box',
      }}
    >
      {/* 배경 오버레이 */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* 모달 박스 */}
      <div
        style={{
          position: 'relative', background: '#fff', width: 520, maxWidth: '100%',
          borderRadius: 14, boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden',
        }}
      >
        {/* 스크롤 가능한 본문 */}
        <div style={{ overflowY: 'auto', padding: '36px 36px 24px', flex: 1 }}>
          {/* 타이틀 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111', textAlign: 'center', margin: '0 0 6px 0' }}>
            공실뉴스 가입 마무리!
          </h2>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', margin: '0 0 28px 0' }}>
            원활한 서비스 이용을 위해 필수 정보를 입력해 주세요.
          </p>

          {/* 이메일 */}
          <label style={labelStyle}>이메일 <span style={{ color: '#888', fontWeight: 400 }}>(확인완료)</span></label>
          <input
            type="email"
            value={formData.email}
            readOnly
            style={{ ...inputStyle, background: '#f5f5f5', color: '#999', marginBottom: 16 }}
          />

          {/* 이름 */}
          <label style={labelStyle}>이름 <span style={{ color: '#e53e3e' }}>*</span></label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          {/* 연락처 */}
          <label style={labelStyle}>연락처 <span style={{ color: '#e53e3e' }}>*</span></label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="010-0000-0000"
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* 활동 유형 */}
          <label style={labelStyle}>활동 유형 <span style={{ color: '#e53e3e' }}>*</span></label>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {/* 일반 회원 */}
            <button
              onClick={() => setRole('general')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                border: `2px solid ${role === 'general' ? '#1e56a0' : '#ddd'}`,
                background: role === 'general' ? '#f4f6fa' : '#fff',
                color: role === 'general' ? '#1e56a0' : '#666',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={role === 'general' ? '#1e56a0' : '#aaa'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>일반 회원</span>
            </button>

            {/* 부동산 회원 */}
            <button
              onClick={() => setRole('realtor')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                border: `2px solid ${role === 'realtor' ? '#1e56a0' : '#ddd'}`,
                background: role === 'realtor' ? '#f4f6fa' : '#fff',
                color: role === 'realtor' ? '#1e56a0' : '#666',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={role === 'realtor' ? '#1e56a0' : '#aaa'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>부동산 회원</span>
            </button>
          </div>

          {/* 부동산 회원 전용 필드 */}
          {role === 'realtor' && (
            <div style={{ background: '#f8f9fa', border: '1px solid #e8e8e8', borderRadius: 10, padding: '20px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1e56a0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                🏢 부동산 / 기업 정보 입력
              </div>

              <label style={{ ...labelStyle, fontSize: 12 }}>상호명 <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="text" value={formData.compName} onChange={e => setFormData({ ...formData, compName: e.target.value })} placeholder="상호명 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>대표자명 <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="text" value={formData.ceo} onChange={e => setFormData({ ...formData, ceo: e.target.value })} placeholder="대표자명 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>휴대번호 <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="tel" value={formData.cell} onChange={e => setFormData({ ...formData, cell: e.target.value })} placeholder="010-0000-0000" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>부동산 주소 <span style={{ color: '#e53e3e' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" value={formData.zipcode} readOnly placeholder="우편번호" style={{ ...inputStyle, width: '40%', background: '#f0f0f0' }} />
                <button style={{ padding: '10px 16px', background: '#1e56a0', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>주소 찾기</button>
              </div>
              <input type="text" value={formData.addr} readOnly placeholder="기본주소" style={{ ...inputStyle, marginBottom: 8, background: '#f0f0f0' }} />
              <input type="text" value={formData.addrDetail} onChange={e => setFormData({ ...formData, addrDetail: e.target.value })} placeholder="상세주소 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>중개등록번호</label>
              <input type="text" value={formData.regNum} onChange={e => setFormData({ ...formData, regNum: e.target.value })} placeholder="선택 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>사업자등록번호</label>
              <input type="text" value={formData.bizNum} onChange={e => setFormData({ ...formData, bizNum: e.target.value })} placeholder="선택 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>일반번호</label>
              <input type="tel" value={formData.generalTel} onChange={e => setFormData({ ...formData, generalTel: e.target.value })} placeholder="선택 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>사업자등록증 첨부</label>
              <div style={{ border: '1px dashed #ccc', borderRadius: 6, padding: '14px', textAlign: 'center', color: '#aaa', fontSize: 13, cursor: 'pointer', background: '#fff' }}>
                📎 파일을 선택하세요
              </div>
            </div>
          )}

          {/* ━━━ 약관 동의 ━━━ */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
            {/* 모두 동의 */}
            <label
              onClick={handleAgreeAll}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12, paddingBottom: 14, borderBottom: '2px solid #1e56a0' }}
            >
              <input type="checkbox" checked={agreeAll} onChange={() => {}} style={{ width: 18, height: 18, accentColor: '#1e56a0', cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>모두 동의합니다.</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4, lineHeight: 1.5 }}>
                  가입, 개인정보 수집 및 이용 안내, 제3자 정보제공, 서비스 필수 및 선택적 정보에 구두 동의
                </div>
              </div>
            </label>

            {/* 개별 약관 */}
            {[
              { key: 'terms', label: '[필수] 이용약관동의', content: '제1조 (목적)\n이 약관은 공실뉴스(이하 "회사")가 운영하는 서비스 이용에 관한 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정합니다.\n\n제2조 (정의)\n① "서비스"란 회사가 제공하는 모든 온라인 서비스를 말합니다.\n② "회원"이란 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결한 자를 말합니다.' },
              { key: 'privacy', label: '[필수] 개인정보 수집 및 이용에 대한 안내', content: '1. 수집항목: 이름, 이메일, 연락처, 활동유형\n2. 수집목적: 서비스 제공, 회원관리, 마케팅 활용\n3. 보유기간: 회원 탈퇴 시까지\n\n※ 동의를 거부할 권리가 있으나, 거부 시 서비스 이용이 제한될 수 있습니다.' },
              { key: 'reporter', label: '[필수] 객원 기자 활동 및 책임 귀속 동의서', content: '본인은 공실뉴스의 객원기자로서 작성하는 모든 콘텐츠에 대해 사실 확인의 의무를 다하며, 허위 정보 게재 시 발생하는 법적 책임이 본인에게 귀속됨을 확인합니다.' },
              { key: 'promo', label: '[선택] 이벤트 등 프로모션 알림 메일 수신', content: null },
            ].map(item => (
              <div key={item.key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={agreements[item.key as keyof typeof agreements]}
                    onChange={() => handleAgreement(item.key as keyof typeof agreements)}
                    style={{ width: 16, height: 16, accentColor: '#1e56a0', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: '#444', flex: 1 }}>{item.label}</span>
                  {item.content && (
                    <button
                      onClick={() => toggleExpand(item.key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e56a0', fontSize: 16, padding: '0 4px', fontFamily: 'inherit', lineHeight: 1, transition: 'transform 0.2s', transform: expandedTerms === item.key ? 'rotate(180deg)' : 'rotate(0)' }}
                    >
                      ▼
                    </button>
                  )}
                </div>
                {/* 펼쳐진 약관 내용 */}
                {expandedTerms === item.key && item.content && (
                  <div style={{ marginTop: 8, marginLeft: 26, padding: '12px 14px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: 6, fontSize: 12, color: '#666', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>
                    {item.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 제출 버튼 (고정) */}
        <div style={{ padding: '16px 36px 24px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
          <button
            style={{
              width: '100%', padding: '14px 0', background: '#1e56a0', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#16427d')}
            onMouseOut={e => (e.currentTarget.style.background = '#1e56a0')}
          >
            공실뉴스 시작하기 ✨
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
