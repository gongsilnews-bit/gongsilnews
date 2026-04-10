'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import DaumPostcodeEmbed from 'react-daum-postcode';
import { createClient } from '@/utils/supabase/client';
import { geocodeAddress } from '@/app/actions/geocode';
import imageCompression from 'browser-image-compression';
import { adminUploadAgencyDocument } from '@/app/admin/actions';

interface SignupCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
  name?: string;
}

export default function SignupCompleteModal({ isOpen, onClose, email = '', name = '' }: SignupCompleteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  
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

  const [bizFile, setBizFile] = useState<File | null>(null);
  const [regFile, setRegFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

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
  const handlePhoneInput = (key: 'phone' | 'cell' | 'generalTel', val: string) => {
    let num = val.replace(/[^0-9]/g, '');
    if (num.startsWith('02')) {
      if (num.length > 2 && num.length <= 5) {
        num = `${num.slice(0, 2)}-${num.slice(2)}`;
      } else if (num.length > 5 && num.length <= 9) {
        num = `${num.slice(0, 2)}-${num.slice(2, num.length === 9 ? 5 : 6)}-${num.slice(num.length === 9 ? 5 : 6)}`;
      } else if (num.length > 9) {
        num = `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
      }
    } else {
      if (num.length > 3 && num.length <= 7) {
        num = `${num.slice(0, 3)}-${num.slice(3)}`;
      } else if (num.length > 7 && num.length <= 11) {
        num = `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
      } else if (num.length > 11) {
        num = `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
      }
    }
    setFormData(prev => ({ ...prev, [key]: num }));
  };

  // 주소 검색 완료 핸들러
  const handleCompletePostcode = async (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setFormData(prev => ({ ...prev, zipcode: data.zonecode, addr: fullAddress }));
    setIsPostcodeOpen(false);

    // 카카오 Geocoder REST API를 통해 실제 위경도 좌표 추출
    try {
      const result = await geocodeAddress(data.address);
      if (result.success && result.lat && result.lng) {
        setCoords({ lat: result.lat, lng: result.lng });
        console.log(`✅ 좌표 변환 성공: ${result.lat}, ${result.lng}`);
      } else {
        console.warn('⚠️ 좌표 변환 실패:', result.error);
        // 좌표 변환 실패 시에도 가입 자체는 진행 가능하도록 null 유지
        setCoords(null);
      }
    } catch (err) {
      console.error('좌표 변환 중 오류:', err);
      setCoords(null);
    }
  };

  // 폼 제출 (회원가입 최종 처리)
  const handleSubmit = async () => {
    if (!agreeAll) return alert("약관에 모두 동의해 주세요.");
    if (!formData.name || !formData.phone) return alert("이름과 연락처를 입력해주세요.");

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("현재 로그인된 세션이 없습니다. (새로고침 요망)");

      // 1. members 테이블 업데이트
      const { error: memberError } = await supabase
        .from('members')
        .update({
          name: formData.name,
          phone: formData.phone,
          role: role === 'realtor' ? 'REALTOR' : 'USER',
          signup_completed: true,
        })
        .eq('id', user.id);
        
      if (memberError) throw memberError;

      // 2. 부동산 회원가입인 경우 -> agencies 테이블 INSERT
      if (role === 'realtor') {
         if (!formData.compName || !formData.ceo || !formData.addr) {
            throw new Error("부동산 필수 정보(상호, 대표자, 주소)를 기입해주세요.");
         }
         
         let finalBizUrl = null;
         let finalRegUrl = null;

         // 이미지 압축기 (browser-image-compression 활용)
         const uploadImage = async (file: File, prefix: string) => {
             const comp = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, fileType: 'image/webp' });
             const newFile = new File([comp], file.name, { type: 'image/webp'});
             const path = `${user.id}/${prefix}_cert_${Date.now()}.webp`;
             
             const fd = new FormData();
             fd.set('file', newFile);
             fd.set('path', path);

             const res = await adminUploadAgencyDocument(fd);
             if (!res.success) {
                 console.error("Storage Error:", res.error);
                 return null;
             }
             return res.url;
         };

         if (bizFile) finalBizUrl = await uploadImage(bizFile, 'biz');
         if (regFile) finalRegUrl = await uploadImage(regFile, 'reg');

         const { error: agencyError } = await supabase.from('agencies')
           .insert({
              owner_id: user.id,
              name: formData.compName,
              ceo_name: formData.ceo,
              phone: formData.generalTel,
              cell: formData.cell,
              zipcode: formData.zipcode,
              address: formData.addr,
              address_detail: formData.addrDetail,
              biz_num: formData.bizNum,
              reg_num: formData.regNum,
              biz_cert_url: finalBizUrl,
              reg_cert_url: finalRegUrl,
              lat: coords?.lat || null,
              lng: coords?.lng || null
           });
           
         if (agencyError) throw agencyError;
      }

      if (role === 'realtor' && (!bizFile || !regFile)) {
        alert(
          "🎉 앗! 가입은 무사히 완료되었어요! \n\n" +
          "🥺 하지만 아직 서류가 부족해요!\n" +
          "나중에 마이페이지에서 필수 서류(사업자/개설등록증)를 마저 등록해 주시면,\n" +
          "✨부동산 회원 전용 수수료 무료 공동중개✨ 기능을 마음껏 쓰실 수 있습니다!"
        );
      } else {
        alert("🎉 가입이 완료되었습니다! 환영합니다!");
      }
      onClose();
      window.location.reload();

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

      {/* 우편번호 팝업 (가장 최상단) */}
      {isPostcodeOpen && (
        <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', zIndex: 999999999, width: 400, maxWidth: '90%', background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>주소 검색</h3>
            <button onClick={() => setIsPostcodeOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>
          <DaumPostcodeEmbed onComplete={handleCompletePostcode} />
        </div>
      )}

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
            공실뉴스 가입 마무리!
          </h2>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', margin: '0 0 28px 0' }}>
            원활한 서비스 이용을 위해 필수 정보를 입력해 주세요.
          </p>

          <label style={labelStyle}>이메일 <span style={{ color: '#888', fontWeight: 400 }}>(확인완료)</span></label>
          <input type="email" value={formData.email} readOnly style={{ ...inputStyle, background: '#f5f5f5', color: '#999', marginBottom: 16 }} />

          <label style={labelStyle}>이름 <span style={{ color: '#e53e3e' }}>*</span></label>
          <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>연락처 <span style={{ color: '#e53e3e' }}>*</span></label>
          <input type="tel" value={formData.phone} onChange={e => handlePhoneInput('phone', e.target.value)} placeholder="010-0000-0000" style={{ ...inputStyle, marginBottom: 20 }} />

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

          {/* 부동산 회원 전용 폼 */}
          {role === 'realtor' && (
            <div style={{ background: '#f8f9fa', border: '1px solid #e8e8e8', borderRadius: 10, padding: '20px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1e56a0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                🏢 부동산 / 중개업소 정보 입력
              </div>

              <label style={{ ...labelStyle, fontSize: 12 }}>상호명 <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="text" value={formData.compName} onChange={e => setFormData({ ...formData, compName: e.target.value })} placeholder="예: 공실공인중개사" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>대표자명 <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="text" value={formData.ceo} onChange={e => setFormData({ ...formData, ceo: e.target.value })} placeholder="대표자 이름" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>대표 휴대번호 <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="tel" value={formData.cell} onChange={e => handlePhoneInput('cell', e.target.value)} placeholder="010-0000-0000" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>부동산 주소 <span style={{ color: '#e53e3e' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" value={formData.zipcode} readOnly placeholder="우편번호" style={{ ...inputStyle, width: '40%', background: '#f0f0f0' }} />
                <button onClick={() => setIsPostcodeOpen(true)} type="button" style={{ padding: '10px 16px', background: '#1e56a0', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>주소 찾기</button>
              </div>
              <input type="text" value={formData.addr} readOnly placeholder="기본주소" style={{ ...inputStyle, marginBottom: 8, background: '#f0f0f0' }} />
              <input type="text" value={formData.addrDetail} onChange={e => setFormData({ ...formData, addrDetail: e.target.value })} placeholder="상세주소 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>중개등록번호</label>
              <input type="text" value={formData.regNum} onChange={e => setFormData({ ...formData, regNum: e.target.value })} placeholder="선택 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>사업자등록번호</label>
              <input type="text" value={formData.bizNum} onChange={e => setFormData({ ...formData, bizNum: e.target.value })} placeholder="선택 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              <label style={{ ...labelStyle, fontSize: 12 }}>일반 사무실 번호</label>
              <input type="tel" value={formData.generalTel} onChange={e => handlePhoneInput('generalTel', e.target.value)} placeholder="선택 입력" style={{ ...inputStyle, marginBottom: 12 }} />

              {/* 사업자등록증 첨부 */}
              <label style={{ ...labelStyle, fontSize: 12 }}>사업자등록증 첨부</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setBizFile(e.target.files?.[0] || null)}
                style={{ marginBottom: 12, fontSize: 12, display: 'block', width: '100%' }}
              />

              {/* 중개사무소 등록증 첨부 */}
              <label style={{ ...labelStyle, fontSize: 12 }}>중개사무소 등록증 첨부</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setRegFile(e.target.files?.[0] || null)}
                style={{ fontSize: 12, display: 'block', width: '100%' }}
              />
            </div>
          )}

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
