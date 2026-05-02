"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { adminGetMemberDetail, adminUpdateMember, adminUpdateAgency, adminUploadAgencyDocument } from "@/app/admin/actions";
import { geocodeAddress } from "@/app/actions/geocode";

/* ── WebP 압축 ── */
const compressToWebP = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> =>
  new Promise((resolve) => {
    if (!file.type.startsWith("image/")) { resolve(file); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        resolve(new File([blob!], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
      }, "image/webp", quality);
    };
    img.src = URL.createObjectURL(file);
  });

const formatPhone = (v: string) => {
  const r = v.replace(/[^0-9]/g, "");
  if (!r) return "";
  if (r.startsWith("02")) {
    if (r.length <= 2) return r;
    if (r.length <= 5) return `${r.slice(0, 2)}-${r.slice(2)}`;
    if (r.length <= 9) return `${r.slice(0, 2)}-${r.slice(2, 5)}-${r.slice(5)}`;
    return `${r.slice(0, 2)}-${r.slice(2, 6)}-${r.slice(6, 10)}`;
  }
  if (r.length <= 3) return r;
  if (r.length <= 7) return `${r.slice(0, 3)}-${r.slice(3)}`;
  return `${r.slice(0, 3)}-${r.slice(3, 7)}-${r.slice(7, 11)}`;
};

const formatBizNum = (v: string) => {
  const r = v.replace(/[^0-9]/g, "");
  if (!r) return "";
  if (r.length <= 3) return r;
  if (r.length <= 5) return `${r.slice(0, 3)}-${r.slice(3)}`;
  return `${r.slice(0, 3)}-${r.slice(3, 5)}-${r.slice(5, 10)}`;
};

function MobileSettings() {
  const router = useRouter();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"basic" | "agency">("basic");
  const [isRealtor, setIsRealtor] = useState(false);

  /* 기본 정보 */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const profileRef = useRef<HTMLInputElement>(null);

  /* 부동산 정보 */
  const [agencyName, setAgencyName] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [cell, setCell] = useState("");
  const [officePhone, setOfficePhone] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [intro, setIntro] = useState("");
  const [regNum, setRegNum] = useState("");
  const [bizNum, setBizNum] = useState("");
  const [agencyStatus, setAgencyStatus] = useState("PENDING");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  /* 서류 사진 */
  const [regCertPreview, setRegCertPreview] = useState<string | null>(null);
  const [regCertFile, setRegCertFile] = useState<File | null>(null);
  const [bizCertPreview, setBizCertPreview] = useState<string | null>(null);
  const [bizCertFile, setBizCertFile] = useState<File | null>(null);
  const regCertRef = useRef<HTMLInputElement>(null);
  const bizCertRef = useRef<HTMLInputElement>(null);

  /* 이미지 확대 */
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      setMemberId(user.id);

      const res = await adminGetMemberDetail(user.id);
      if (res.success && res.member) {
        const m = res.member;
        setName(m.name || "");
        setEmail(m.email || "");
        setPhone(m.phone || "");
        setRole(m.role || "USER");
        setIsRealtor(m.role === "REALTOR" || m.role === "부동산회원");
        if (m.profile_image_url) setProfilePreview(m.profile_image_url);

        if (res.agency) {
          const a = res.agency;
          setAgencyName(a.name || "");
          setCeoName(a.ceo_name || "");
          setCell(a.cell || "");
          setOfficePhone(a.phone || "");
          setZipcode(a.zipcode || "");
          setAddress(a.address || "");
          setAddressDetail(a.address_detail || "");
          setIntro(a.intro || "");
          setRegNum(a.reg_num || "");
          setBizNum(a.biz_num || "");
          setAgencyStatus(a.status || "PENDING");
          if (a.reg_cert_url) setRegCertPreview(a.reg_cert_url);
          if (a.biz_cert_url) setBizCertPreview(a.biz_cert_url);
          if (a.lat && a.lng) setCoords({ lat: Number(a.lat), lng: Number(a.lng) });
        }
      }
      setAuthChecked(true);
    })();
  }, []);

  /* 다음 우편번호 */
  useEffect(() => {
    if (!document.getElementById("daum-postcode-script")) {
      const s = document.createElement("script");
      s.id = "daum-postcode-script";
      s.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const openPostcode = () => {
    if ((window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: async (data: any) => {
          setZipcode(data.zonecode);
          setAddress(data.address);
          try {
            const r = await geocodeAddress(data.address);
            if (r.success && r.lat && r.lng) setCoords({ lat: r.lat, lng: r.lng });
            else setCoords(null);
          } catch { setCoords(null); }
        },
      }).open();
    } else alert("우편번호 스크립트를 불러오는 중입니다.");
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "reg" | "biz") => {
    if (!e.target.files?.[0]) return;
    const compressed = await compressToWebP(e.target.files[0]);
    const preview = URL.createObjectURL(compressed);
    if (type === "profile") { setProfileFile(compressed); setProfilePreview(preview); }
    else if (type === "reg") { setRegCertFile(compressed); setRegCertPreview(preview); }
    else { setBizCertFile(compressed); setBizCertPreview(preview); }
  };

  const handleSave = async () => {
    if (!memberId) return;
    setSaving(true);
    try {
      /* 프로필 사진 */
      let profileUrl: string | undefined = undefined;
      if (profileFile) {
        const fd = new FormData();
        fd.append("file", profileFile);
        fd.append("path", `${memberId}/profile_${Date.now()}.webp`);
        const r = await adminUploadAgencyDocument(fd);
        if (r.success) profileUrl = r.url || undefined;
      }

      await adminUpdateMember(memberId, {
        name, phone,
        ...(profileUrl ? { profile_image_url: profileUrl } : {}),
        ...((tab === "agency" || isRealtor) ? { role: "REALTOR" } : {}),
      });

      /* 부동산 정보 */
      if (tab === "agency" || isRealtor) {
        let regUrl = regCertPreview?.startsWith("http") ? regCertPreview : null;
        let bizUrl = bizCertPreview?.startsWith("http") ? bizCertPreview : null;

        if (regCertFile) {
          const fd = new FormData();
          fd.append("file", regCertFile);
          fd.append("path", `${memberId}/reg_cert_${Date.now()}.webp`);
          const r = await adminUploadAgencyDocument(fd);
          if (r.success) regUrl = r.url || null;
        }
        if (bizCertFile) {
          const fd = new FormData();
          fd.append("file", bizCertFile);
          fd.append("path", `${memberId}/biz_cert_${Date.now()}.webp`);
          const r = await adminUploadAgencyDocument(fd);
          if (r.success) bizUrl = r.url || null;
        }

        await adminUpdateAgency(memberId, {
          name: agencyName, ceo_name: ceoName, cell, phone: officePhone,
          zipcode, address, address_detail: addressDetail,
          intro, reg_num: regNum, biz_num: bizNum,
          reg_cert_url: regUrl, biz_cert_url: bizUrl,
          lat: coords?.lat || null, lng: coords?.lng || null,
          status: agencyStatus,
        });
      }

      if (tab === "agency" && !isRealtor) setIsRealtor(true);

      alert("저장되었습니다.");
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    } finally { setSaving(false); }
  };

  const statusLabel = agencyStatus === "APPROVED" ? "정상승인" : agencyStatus === "REJECTED" ? "서류보완" : "승인대기";
  const statusColor = agencyStatus === "APPROVED" ? "#059669" : agencyStatus === "REJECTED" ? "#dc2626" : "#d97706";
  const statusBg = agencyStatus === "APPROVED" ? "#ecfdf5" : agencyStatus === "REJECTED" ? "#fef2f2" : "#fffbeb";

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { width: "100%", height: 46, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>정보설정</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ height: 36, padding: "0 16px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "저장중..." : "저장"}
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        {[{ key: "basic" as const, label: "기본정보" }, { key: "agency" as const, label: "부동산정보" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: "14px 0", border: "none", background: "none", fontSize: 14, fontWeight: tab === t.key ? 800 : 500, color: tab === t.key ? "#2563eb" : "#6b7280", borderBottom: tab === t.key ? "3px solid #2563eb" : "3px solid transparent", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 120px" }}>
        {/* ── 기본정보 탭 ── */}
        {tab === "basic" && (
          <>
            {/* 프로필 사진 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
              <div style={{ position: "relative", marginBottom: 8 }}>
                {profilePreview ? (
                  <img src={profilePreview} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #e5e7eb" }} onClick={() => setPreviewImg(profilePreview)} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f3f4f6", border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#9ca3af" }}>👤</div>
                )}
                <button onClick={() => profileRef.current?.click()}
                  style={{ position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: "50%", background: "#2563eb", color: "#fff", border: "2px solid #fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>📷</button>
                <input ref={profileRef} type="file" accept="image/*" onChange={e => handlePhotoCapture(e, "profile")} style={{ display: "none" }} />
              </div>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>터치하여 프로필 사진 변경</span>
            </div>

            {/* 승인 상태 */}
            {isRealtor && (
              <div style={{ background: statusBg, border: `1px solid ${statusColor}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{role === "REALTOR" || role === "부동산회원" ? "부동산회원" : "일반회원"}</span>
              </div>
            )}

            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <Field label="이메일" value={email} readOnly />
              <Field label="이름" value={name} onChange={setName} />
              <Field label="연락처" value={phone} onChange={v => setPhone(formatPhone(v))} placeholder="010-0000-0000" />
            </div>
          </>
        )}

        {/* ── 부동산정보 탭 ── */}
        {tab === "agency" && (
          <>
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <Field label="상호(사업장명)" value={agencyName} onChange={setAgencyName} required />
              <Field label="대표자명" value={ceoName} onChange={setCeoName} required />
              <Field label="대표자 연락처" value={cell} onChange={v => setCell(formatPhone(v))} placeholder="010-0000-0000" required />
              <Field label="사무실 전화" value={officePhone} onChange={v => setOfficePhone(formatPhone(v))} required />
            </div>

            {/* 주소 */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 10 }}>📍 사무실 주소</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="text" value={zipcode} readOnly style={{ ...inputStyle, flex: "none", width: 100, background: "#f9fafb" }} placeholder="우편번호" />
                <button onClick={openPostcode} style={{ height: 46, padding: "0 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>주소 검색</button>
              </div>
              <input type="text" value={address} readOnly style={{ ...inputStyle, marginBottom: 8, background: "#f9fafb" }} placeholder="기본주소" />
              <input type="text" value={addressDetail} onChange={e => setAddressDetail(e.target.value)} style={inputStyle} placeholder="상세주소 입력" />
              {coords && <div style={{ fontSize: 11, color: "#10b981", marginTop: 6 }}>✅ 좌표: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}
            </div>

            {/* 소개 */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 10 }}>✏️ 부동산 소개</div>
              <textarea value={intro} onChange={e => setIntro(e.target.value)} maxLength={100}
                style={{ ...inputStyle, height: 80, padding: 14, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} placeholder="부동산 소개 (100자 이내)" />
              <div style={{ textAlign: "right", fontSize: 11, color: intro.length >= 100 ? "#ef4444" : "#9ca3af", marginTop: 4 }}>{intro.length}/100</div>
            </div>

            {/* 등록번호 & 사업자번호 */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <Field label="중개등록번호" value={regNum} onChange={setRegNum} required />
              <Field label="사업자등록번호" value={bizNum} onChange={v => setBizNum(formatBizNum(v))} placeholder="000-00-00000" required />
            </div>

            {/* 서류 사진 */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 12 }}>📄 서류 첨부</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 }}>
                카메라로 촬영하거나 갤러리에서 선택해주세요.
              </div>

              {/* 중개등록증 */}
              <DocUpload
                label="중개등록증"
                preview={regCertPreview}
                inputRef={regCertRef}
                onCapture={e => handlePhotoCapture(e, "reg")}
                onPreview={() => regCertPreview && setPreviewImg(regCertPreview)}
                onRemove={() => { setRegCertFile(null); setRegCertPreview(null); }}
              />

              {/* 사업자등록증 */}
              <DocUpload
                label="사업자등록증"
                preview={bizCertPreview}
                inputRef={bizCertRef}
                onCapture={e => handlePhotoCapture(e, "biz")}
                onPreview={() => bizCertPreview && setPreviewImg(bizCertPreview)}
                onRemove={() => { setBizCertFile(null); setBizCertPreview(null); }}
              />
            </div>
          </>
        )}
      </div>

      {/* 하단 저장 바 */}
      <div style={{ position: "fixed", bottom: 65, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px", zIndex: 50 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", height: 52, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
          {saving ? "저장 중..." : "💾 저장하기"}
        </button>
      </div>

      {/* 이미지 확대 모달 */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={previewImg} alt="" style={{ maxWidth: "100%", maxHeight: "80dvh", borderRadius: 8, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

/* ── 재사용 필드 컴포넌트 ── */
function Field({ label, value, onChange, placeholder, readOnly, required }: {
  label: string; value: string; onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
        {label}
        {required && !value && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>필수</span>}
      </label>
      <input
        type="text" value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{ width: "100%", height: 46, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box", background: readOnly ? "#f9fafb" : "#fff", color: readOnly ? "#6b7280" : "#111" }}
      />
    </div>
  );
}

/* ── 서류 업로드 컴포넌트 ── */
function DocUpload({ label, preview, inputRef, onCapture, onPreview, onRemove }: {
  label: string; preview: string | null; inputRef: React.RefObject<HTMLInputElement | null>;
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void; onPreview: () => void; onRemove: () => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>{label}</div>
      {preview ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={preview} alt={label} onClick={onPreview}
            style={{ width: "100%", maxWidth: 280, height: "auto", borderRadius: 10, border: "1px solid #e5e7eb", cursor: "pointer" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => inputRef.current?.click()}
              style={{ flex: 1, height: 36, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📷 다시 촬영</button>
            <button onClick={onRemove}
              style={{ height: 36, padding: "0 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>삭제</button>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          style={{ width: "100%", padding: "20px 0", border: "2px dashed #d1d5db", borderRadius: 10, background: "#fafafa", cursor: "pointer", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>터치하여 촬영 또는 갤러리에서 선택</div>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onCapture} style={{ display: "none" }} />
    </div>
  );
}

export default function MobileSettingsPage() {
  return (
    <Suspense fallback={null}>
      <MobileSettings />
    </Suspense>
  );
}
