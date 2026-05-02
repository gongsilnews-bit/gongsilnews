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
  
  const [step, setStep] = useState<1 | 2>(1);
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
          role: 'USER',
          signup_completed: true, 
        })
        .eq('id', user.id);
        
      if (memberError) throw memberError;

      // 2. 가입 완료 후 Step 2 화면으로 이동 (부동산 회원 전환 유도)
      setStep(2);

    } catch (err: any) {
      alert("❌ 처리 중 에러가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  if (step === 2) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    return createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 99999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
        <div onClick={() => { onClose(); window.location.reload(); }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', background: '#fff', width: 520, maxWidth: '100%', borderRadius: 14, boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', padding: '40px 36px 36px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111', margin: '0 0 16px 0' }}>가입이 완료되었습니다!</h2>
            <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6, marginBottom: 28, wordBreak: 'keep-all' }}>환영합니다! 이제 공실뉴스의 일반회원 서비스를 이용하실 수 있습니다.</p>
            <div style={{ background: '#f4f6fa', borderRadius: 12, padding: '24px 20px', marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e56a0', marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                혹시 부동산(중개사)이신가요? 🏡
              </h3>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: 0, wordBreak: 'keep-all' }}>
                부동산회원으로 전환하시고 승인 신청을 하시면<br/>
                <strong style={{color: '#111'}}>100% 무료 공동중개 매물 등록</strong> 등<br/>
                중개사를 위한 특별한 혜택을 누리실 수 있습니다!
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { onClose(); router.push(isMobile ? '/m/admin/settings' : '/user_admin?menu=settings'); }} style={{ width: '100%', padding: '16px 0', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(245,158,11,0.2)' }} onMouseEnter={(e) => e.currentTarget.style.background = "#d97706"} onMouseLeave={(e) => e.currentTarget.style.background = "#f59e0b"}>
                부동산회원 전환 신청하기 ✨
              </button>
              <button onClick={() => { onClose(); window.location.reload(); }} style={{ width: '100%', padding: '16px 0', background: '#f5f5f5', color: '#666', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = "#ebebeb"} onMouseLeave={(e) => e.currentTarget.style.background = "#f5f5f5"}>
                다음에 할게요 (홈으로 가기)
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

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
