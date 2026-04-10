"use client";

import React, { useState, useEffect } from "react";
import { adminCreateMember, adminUpdateAgency, adminUploadAgencyDocument, adminGetMemberDetail, adminUpdateMember } from "@/app/admin/actions";

interface MemberRegisterFormProps {
  onBack: () => void;
  darkMode?: boolean;
  editMemberId?: string | null;
  isAdmin?: boolean;
}

export default function MemberRegisterForm({ onBack, darkMode = false, editMemberId = null, isAdmin = false }: MemberRegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: "일반회원",
    created_at: "",
    memberNumber: ""
  });

  const [agencyData, setAgencyData] = useState({
    name: "",
    ceo_name: "",
    cell: "",
    phone: "",
    zipcode: "",
    address: "",
    address_detail: "",
    reg_num: "",
    biz_num: "",
    status: "PENDING"
  });

  const [files, setFiles] = useState<{ reg_cert?: File; biz_cert?: File }>({});
  const [filePreviews, setFilePreviews] = useState<{ reg_cert?: string; biz_cert?: string }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const compressToWebP = (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) return Promise.resolve(file);
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); return resolve(file); }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return resolve(file);
          const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          resolve(new File([blob], newName, { type: "image/webp" }));
        }, "image/webp", 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  useEffect(() => {
    if (editMemberId) {
      setLoading(true);
      adminGetMemberDetail(editMemberId).then(res => {
        if (res.success && res.member) {
          const roleMap: any = { 'ADMIN': '최고관리자', 'REALTOR': '부동산회원', 'USER': '일반회원' };
          setFormData({
            email: res.member.email || "",
            name: res.member.name || "",
            phone: res.member.phone || "",
            role: roleMap[res.member.role] || "일반회원",
            created_at: res.member.created_at ? new Date(res.member.created_at).toISOString().split('T')[0] : "",
            memberNumber: res.member.memberNumber || ""
          });
          if (res.agency) {
            setAgencyData({
              name: res.agency.name || "",
              ceo_name: res.agency.ceo_name || "",
              cell: res.agency.cell || "",
              phone: res.agency.phone || "",
              zipcode: res.agency.zipcode || "",
              address: res.agency.address || "",
              address_detail: res.agency.address_detail || "",
              reg_num: res.agency.reg_num || "",
              biz_num: res.agency.biz_num || "",
              status: res.agency.status || "PENDING"
            });
            setFilePreviews({
              reg_cert: res.agency.reg_cert_url || undefined,
              biz_cert: res.agency.biz_cert_url || undefined
            });
          }
        }
        setLoading(false);
      });
    }

    if (!document.getElementById("daum-postcode-script")) {
      const script = document.createElement("script");
      script.id = "daum-postcode-script";
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const openDaumPostcode = () => {
    if ((window as any).daum && (window as any).daum.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function(data: any) {
          setAgencyData({
            ...agencyData,
            zipcode: data.zonecode,
            address: data.address
          });
        }
      }).open();
    } else {
      alert("우편번호 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const formatPhone = (v: string) => {
    const raw = v.replace(/[^0-9]/g, '');
    if (!raw) return '';
    if (raw.startsWith('02')) {
      if (raw.length <= 2) return raw;
      if (raw.length <= 5) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
      if (raw.length <= 9) return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
      return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
    } else {
      if (raw.length <= 3) return raw;
      if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
      return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    }
  };

  const formatBizNum = (v: string) => {
    const raw = v.replace(/[^0-9]/g, '');
    if (!raw) return '';
    if (raw.length <= 3) return raw;
    if (raw.length <= 5) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5, 10)}`;
  };

  const handleMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val = e.target.value;
    if (e.target.name === "phone") val = formatPhone(val);
    setFormData({ ...formData, [e.target.name]: val });
  };

  const handleAgencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (["phone", "cell"].includes(e.target.name)) val = formatPhone(val);
    if (e.target.name === "biz_num") val = formatBizNum(val);
    setAgencyData({ ...agencyData, [e.target.name]: val });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "reg_cert" | "biz_cert") => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      const compressedFile = await compressToWebP(originalFile);
      setFiles((prev) => ({ ...prev, [type]: compressedFile }));
      setFilePreviews((prev) => ({ ...prev, [type]: URL.createObjectURL(compressedFile) }));
    }
  };

  const handleFileRemove = (type: "reg_cert" | "biz_cert") => {
    setFiles((prev) => ({ ...prev, [type]: null }));
    setFilePreviews((prev) => ({ ...prev, [type]: null }));
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.name || !formData.role) {
      alert("회원ID, 이름, 회원구분은 필수 항목입니다.");
      return;
    }

    setLoading(true);

    try {
      let memberId = editMemberId;

      if (!editMemberId) {
        const form = new FormData();
        form.append("email", formData.email);
        form.append("name", formData.name);
        form.append("phone", formData.phone);
        form.append("role", formData.role);

        const memberRes = await adminCreateMember(form);

        if (!memberRes.success || !memberRes.userId) {
          throw new Error(memberRes.error || "회원 등록에 실패했습니다.");
        }
        memberId = memberRes.userId;
      } else {
        const updateRes = await adminUpdateMember(editMemberId, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role === '최고관리자' ? 'ADMIN' : formData.role === '부동산회원' ? 'REALTOR' : 'USER'
        });
        if (!updateRes.success) throw new Error(updateRes.error || "회원 수정에 실패했습니다.");
      }

      if (formData.role === "부동산회원" && memberId) {
        let regCertUrl = filePreviews.reg_cert?.startsWith("http") ? filePreviews.reg_cert : null;
        let bizCertUrl = filePreviews.biz_cert?.startsWith("http") ? filePreviews.biz_cert : null;

        if (files.reg_cert) {
          const fileForm = new FormData();
          fileForm.append("file", files.reg_cert);
          fileForm.append("path", `${memberId}/reg_cert_${Date.now()}.webp`);
          const uploadRes = await adminUploadAgencyDocument(fileForm);
          if (uploadRes.success) regCertUrl = uploadRes.url || null;
        }

        if (files.biz_cert) {
          const fileForm = new FormData();
          fileForm.append("file", files.biz_cert);
          fileForm.append("path", `${memberId}/biz_cert_${Date.now()}.webp`);
          const uploadRes = await adminUploadAgencyDocument(fileForm);
          if (uploadRes.success) bizCertUrl = uploadRes.url || null;
        }

        const finalAgencyData = {
          ...agencyData,
          reg_cert_url: regCertUrl,
          biz_cert_url: bizCertUrl,
          status: isAdmin ? agencyData.status : (agencyData.status === "APPROVED" ? "APPROVED" : "PENDING")
        };

        const agencyRes = await adminUpdateAgency(memberId, finalAgencyData);
        if (!agencyRes.success) {
          throw new Error("중개업소 정보 저장에 실패했습니다: " + agencyRes.error);
        }
      }

      alert(editMemberId ? "회원 수정이 완료되었습니다." : "회원 등록이 완료되었습니다.");
      onBack();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    flex: 1, minHeight: 40, height: 40, padding: "0 14px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6,
    fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827", background: darkMode ? "#2c2d31" : "#fff", outline: "none", boxSizing: "border-box" as const
  };

  const readOnlyStyle = {
    ...inputStyle,
    background: darkMode ? "#333" : "#f9fafb",
    color: darkMode ? "#9ca3af" : "#6b7280"
  };

  const labelStyle = { width: 180, fontSize: 13, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#111827", flexShrink: 0, padding: "16px 20px", display: "flex", alignItems: "center", background: darkMode ? "#25262b" : "#f9fafb", borderRight: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const rowStyle = { display: "flex", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const contentStyle = { flex: 1, padding: "16px 20px", display: "flex", alignItems: "center" };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: darkMode ? "#1a1b1e" : "#f4f5f7" }}>
      {/* 타이틀 및 백버튼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ height: 36, padding: "0 16px", background: "#fff", color: "#4b5563", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          ← 목록으로
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: darkMode ? "#e1e4e8" : "#111827", margin: 0 }}>
          {editMemberId ? "회원수정" : "회원등록"}
        </h1>
      </div>

      <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden", marginBottom: 24 }}>
        <div style={rowStyle}>
          <div style={labelStyle}>회원번호</div>
          <div style={contentStyle}>
            <span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>
              {editMemberId ? formData.memberNumber : "[자동 부여]"}
            </span>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>회원ID (이메일)</div>
          <div style={contentStyle}>
            <input type="email" name="email" value={formData.email} onChange={handleMemberChange} style={editMemberId ? readOnlyStyle : inputStyle} readOnly={!!editMemberId} placeholder="example@gmail.com" />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>이름</div>
          <div style={contentStyle}>
            <input type="text" name="name" value={formData.name} onChange={handleMemberChange} style={inputStyle} placeholder="이름 입력" />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>연락처 (휴대폰)</div>
          <div style={contentStyle}>
            <input type="text" name="phone" value={formData.phone} onChange={handleMemberChange} style={inputStyle} placeholder="010-0000-0000" />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>회원구분</div>
          <div style={contentStyle}>
            <select name="role" value={formData.role} onChange={handleMemberChange} style={{ height: 40, padding: "0 14px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827", background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 160 }}>
              <option value="일반회원">일반회원</option>
              <option value="부동산회원">부동산회원</option>
              <option value="최고관리자">최고관리자</option>
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>가입일</div>
          <div style={contentStyle}><span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>{formData.created_at || "[자동 등록]"}</span></div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>가입 완료 여부</div>
          <div style={contentStyle}>
            {formData.role === "부동산회원" ? (
              isAdmin ? (
                <select name="status" value={agencyData.status} onChange={(e) => setAgencyData({...agencyData, status: e.target.value})} style={{ height: 40, padding: "0 14px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827", background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 160 }}>
                  <option value="PENDING">승인대기</option>
                  <option value="APPROVED">정상승인</option>
                  <option value="REJECTED">서류보완</option>
                </select>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, padding: "4px 10px", borderRadius: 4, ...((agencyData.status === "APPROVED") ? { background: "#d1fae5", color: "#065f46" } : (agencyData.status === "REJECTED") ? { background: "#fee2e2", color: "#b91c1c" } : { background: "#fef3c7", color: "#92400e" }) }}>
                    {agencyData.status === "APPROVED" ? "정상승인" : agencyData.status === "REJECTED" ? "서류보완 필요" : "승인대기"}
                  </span>
                  {agencyData.status === "PENDING" && (
                    <span style={{ fontSize: 13, color: darkMode ? "#a1a1aa" : "#6b7280" }}>서류를 꼼꼼히 확인하고 있어요! 조금만 기다려주세요 🐰</span>
                  )}
                  {agencyData.status === "REJECTED" && (
                    <span style={{ fontSize: 13, color: darkMode ? "#fca5a5" : "#ef4444", fontWeight: 600 }}>앗! 제출하신 서류가 조금 부족해요 😭 아래에서 다시 첨부해주세요!</span>
                  )}
                </div>
              )
            ) : (
              <span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>{editMemberId ? "정상" : "대기"}</span>
            )}
          </div>
        </div>
      </div>

      {formData.role === "부동산회원" && (
        <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden", marginBottom: 24 }}>
          
          <div style={rowStyle}>
            <div style={labelStyle}>상호(사업장명)</div>
            <div style={contentStyle}>
              <input type="text" name="name" value={agencyData.name} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="중개업소명 입력" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>대표자명</div>
            <div style={contentStyle}>
              <input type="text" name="ceo_name" value={agencyData.ceo_name} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>대표자 연락처</div>
            <div style={contentStyle}>
              <input type="text" name="cell" value={agencyData.cell} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="010-0000-0000" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>사무실 전화</div>
            <div style={contentStyle}>
              <input type="text" name="phone" value={agencyData.phone} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>사무실 주소</div>
            <div style={{...contentStyle, flexDirection: "column", gap: 10, alignItems: "stretch"}}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" name="zipcode" value={agencyData.zipcode} onChange={handleAgencyChange} style={{...inputStyle, width: 120, flex: "none"}} placeholder="우편번호" readOnly />
                <button type="button" onClick={openDaumPostcode} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>우편번호 검색</button>
              </div>
              <input type="text" name="address" value={agencyData.address} onChange={handleAgencyChange} style={{...inputStyle, width: "100%", maxWidth: "none" }} placeholder="기본주소" readOnly />
              <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", maxWidth: "none" }}>
                <span style={{ fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280", flexShrink: 0 }}>상세주소</span>
                <input type="text" name="address_detail" value={agencyData.address_detail} onChange={handleAgencyChange} style={{...inputStyle, flex: 1}} placeholder="상세주소 입력" />
              </div>
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>등록번호</div>
            <div style={contentStyle}>
              <input type="text" name="reg_num" value={agencyData.reg_num} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="중개업 등록번호" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>등록증 사본 첨부</div>
            <div style={{ ...contentStyle, gap: 16 }}>
              {filePreviews.reg_cert && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img 
                    src={filePreviews.reg_cert} 
                    alt="등록증 원본" 
                    style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                    onClick={() => setPreviewImage(filePreviews.reg_cert!)}
                  />
                  <button onClick={() => handleFileRemove("reg_cert")} style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #fff", fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}>&times;</button>
                </div>
              )}
              {!filePreviews.reg_cert && (
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "reg_cert")} style={{ fontSize: 14 }} />
              )}
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>사업자등록번호</div>
            <div style={contentStyle}>
              <input type="text" name="biz_num" value={agencyData.biz_num} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="000-00-00000" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>사업자등록증 첨부</div>
            <div style={{ ...contentStyle, gap: 16 }}>
              {filePreviews.biz_cert && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img 
                    src={filePreviews.biz_cert} 
                    alt="사업자 사본 원본" 
                    style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                    onClick={() => setPreviewImage(filePreviews.biz_cert!)}
                  />
                  <button onClick={() => handleFileRemove("biz_cert")} style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #fff", fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}>&times;</button>
                </div>
              )}
              {!filePreviews.biz_cert && (
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "biz_cert")} style={{ fontSize: 14 }} />
              )}
            </div>
          </div>

        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 10, paddingBottom: 60 }}>
        <button onClick={handleSubmit} disabled={loading} style={{ height: 42, padding: "0 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "등록 중..." : "저장"}
        </button>
        <button onClick={onBack} style={{ height: 42, padding: "0 24px", background: darkMode ? "#2c2d31" : "#fff", color: darkMode ? "#e1e4e8" : "#111827", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          목록
        </button>
        <button onClick={onBack} style={{ height: 42, padding: "0 24px", background: darkMode ? "#2c2d31" : "#fff", color: darkMode ? "#e1e4e8" : "#111827", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          취소
        </button>
      </div>

      {previewImage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button 
            onClick={() => setPreviewImage(null)} 
            style={{ position: "absolute", top: 30, right: 40, background: "none", border: "none", color: "#fff", fontSize: 48, cursor: "pointer", padding: 0, lineHeight: 1 }}
          >
            &times;
          </button>
          <img src={previewImage} alt="크게 보기" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: 8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }} />
        </div>
      )}

    </div>
  );
}
