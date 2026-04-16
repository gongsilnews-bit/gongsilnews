'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface SignupCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
  name?: string;
}

export default function SignupCompleteModal({ isOpen, onClose, email = '', name = '' }: SignupCompleteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const [role, setRole] = useState<'general' | 'realtor'>('general');
  const [formData, setFormData] = useState({
    email: email,
    name: name,
    phone: '',
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
      setFormData(prev => ({ ...prev, email: email || '', name: name || '' }));
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

  // 전화번호 자동 하이픈 (-) 포맷터
  const handlePhoneInput = (val: string) => {
    let num = val.replace(/[^0-9]/g, '');
    if (num.length > 3 && num.length <= 7) {
      num = `${num.slice(0, 3)}-${num.slice(3)}`;
    } else if (num.length > 7 && num.length <= 11) {
      num = `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
    } else if (num.length > 11) {
      num = `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
    }
    setFormData(prev => ({ ...prev, phone: num }));
  };

  // 폼 제출 (회원가입 최종 처리)
  const handleSubmit = async () => {
    if (!agreeAll) return alert("약관에 모두 동의해 주세요.");
    if (!formData.name.trim() || !formData.phone.trim()) return alert("이름과 연락처를 필수로 입력해 주세요.");

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("현재 로그인된 세션이 없습니다. (새로고침 요망)");

      // 1. members 테이블 업데이트
      const { error: memberError } = await supabase
        .from('members')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          role: role === 'realtor' ? 'REALTOR' : 'USER',
          signup_completed: true, 
        })
        .eq('id', user.id);
        
      if (memberError) throw memberError;

      // 2. 부동산 회원인 경우 -> agencies 더미 테이블 (상태: PENDING) 기본 생성
      if (role === 'realtor') {
         // 중개업소 정보는 빈 뼈대만 만들어서 realty_admin에서 작성하도록 유도. 이미 있다면 onConflict 무시.
         const { error: agencyError } = await supabase.from('agencies')
           .insert({
              owner_id: user.id,
              name: '상호명 미등록',
              ceo_name: '대표자명 미등록',
              zipcode: '',
              address: '주소 미등록',
              address_detail: '',
              status: 'PENDING'
           });
           
         if (agencyError && !agencyError.message.includes('duplicate key')) {
           throw agencyError;
         }
      }

      onClose(); // 모달 닫기

      if (role === 'realtor') {
        alert("부동산 회원으로 가입하셨습니다!\n정상적인 매물 등록을 위해 중개업소 정보 설정 페이지로 이동합니다.");
        router.push('/realty_admin?menu=settings');
      } else {
        alert("🎉 가입이 완료되었습니다! 환영합니다!");
        window.location.reload();
      }

    } catch (err: any) {
      alert("❌ 처리 중 에러가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
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
        <div style={{ overflowY: 'auto', padding: '36px 36px 24px', flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111', textAlign: 'center', margin: '0 0 6px 0' }}>
            공실뉴스 진입!
          </h2>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', margin: '0 0 28px 0', lineHeight: 1.5 }}>
            원활한 서비스 이용을 위해 필수 정보를 입력해 주세요.
          </p>

          <label style={labelStyle}>이메일 <span style={{ color: '#888', fontWeight: 400 }}>(확인완료)</span></label>
          <input type="email" value={formData.email} readOnly style={{ ...inputStyle, background: '#f5f5f5', color: '#999', marginBottom: 16 }} />

          <label style={labelStyle}>이름 <span style={{ color: '#e53e3e' }}>*</span></label>
          <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="이름을 입력해 주세요" style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>연락처 <span style={{ color: '#e53e3e' }}>*</span></label>
          <input type="tel" value={formData.phone} onChange={e => handlePhoneInput(e.target.value)} placeholder="010-0000-0000" style={{ ...inputStyle, marginBottom: 20 }} />

          <label style={labelStyle}>활동 유형 <span style={{ color: '#e53e3e' }}>*</span></label>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => setRole('general')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                border: `2px solid ${role === 'general' ? '#1e56a0' : '#ddd'}`,
                background: role === 'general' ? '#f4f6fa' : '#fff', color: role === 'general' ? '#1e56a0' : '#666',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={role === 'general' ? '#1e56a0' : '#aaa'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>일반 회원</span>
            </button>

            <button
              onClick={() => setRole('realtor')}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '16px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                border: `2px solid ${role === 'realtor' ? '#1e56a0' : '#ddd'}`,
                background: role === 'realtor' ? '#f4f6fa' : '#fff', color: role === 'realtor' ? '#1e56a0' : '#666',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={role === 'realtor' ? '#1e56a0' : '#aaa'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>부동산 회원</span>
            </button>
          </div>

          {/* ━━━ 약관 동의 ━━━ */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
            <label onClick={handleAgreeAll} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12, paddingBottom: 14, borderBottom: '2px solid #x' }}>
              <input type="checkbox" checked={agreeAll} onChange={() => {}} style={{ width: 18, height: 18, accentColor: '#1e56a0', cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>모두 동의합니다.</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4, lineHeight: 1.5 }}>
                  가입, 개인정보 등 필수 및 선택적 정보에 동의
                </div>
              </div>
            </label>

            {[
              { key: 'terms', label: '[필수] 이용약관동의', content: '공실뉴스 이용약관입니다.' },
              { key: 'privacy', label: '[필수] 개인정보 수집 및 이용', content: '개인정보 처리 방침 정보입니다.' },
            ].map(item => (
              <div key={item.key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={agreements[item.key as keyof typeof agreements]} onChange={() => handleAgreement(item.key as keyof typeof agreements)} style={{ width: 16, height: 16, accentColor: '#1e56a0', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#444', flex: 1 }}>{item.label}</span>
                  <button onClick={() => toggleExpand(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e56a0', fontSize: 16, padding: '0 4px', fontFamily: 'inherit' }}>▼</button>
                </div>
                {expandedTerms === item.key && (
                  <div style={{ marginTop: 8, marginLeft: 26, padding: '12px 14px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: 6, fontSize: 12, color: '#666', lineHeight: 1.7 }}>
                    {item.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{ padding: '16px 36px 24px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '14px 0', background: loading ? '#999' : '#1e56a0', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
            }}
          >
            {loading ? '처리 중...' : '공실뉴스 시작하기 ✨'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
