"use client";

import React, { useState } from "react";
import { adminCreateMember, adminUpdateAgency, adminUploadAgencyDocument } from "@/app/admin/actions";

interface MemberRegisterFormProps {
  onBack: () => void;
  darkMode?: boolean;
}

export default function MemberRegisterForm({ onBack, darkMode = false }: MemberRegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: "일반회원"
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
    biz_num: ""
  });

  const [files, setFiles] = useState<{ reg_cert?: File; biz_cert?: File }>({});

  const handleMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAgencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgencyData({ ...agencyData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "reg_cert" | "biz_cert") => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [type]: e.target.files[0] });
    }
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.name || !formData.role) {
      alert("회원ID, 이름, 회원구분은 필수 항목입니다.");
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("email", formData.email);
      form.append("name", formData.name);
      form.append("phone", formData.phone);
      form.append("role", formData.role);

      const memberRes = await adminCreateMember(form);

      if (!memberRes.success || !memberRes.userId) {
        throw new Error(memberRes.error || "회원 등록에 실패했습니다.");
      }

      const memberId = memberRes.userId;

      if (formData.role === "부동산회원") {
        let regCertUrl = null;
        let bizCertUrl = null;

        if (files.reg_cert) {
          const fileForm = new FormData();
          fileForm.append("file", files.reg_cert);
          fileForm.append("path", `${memberId}/reg_cert_${Date.now()}.png`);
          const uploadRes = await adminUploadAgencyDocument(fileForm);
          if (uploadRes.success) regCertUrl = uploadRes.url;
        }

        if (files.biz_cert) {
          const fileForm = new FormData();
          fileForm.append("file", files.biz_cert);
          fileForm.append("path", `${memberId}/biz_cert_${Date.now()}.png`);
          const uploadRes = await adminUploadAgencyDocument(fileForm);
          if (uploadRes.success) bizCertUrl = uploadRes.url;
        }

        const finalAgencyData = {
          ...agencyData,
          reg_cert_url: regCertUrl,
          biz_cert_url: bizCertUrl,
          status: "PENDING"
        };

        const agencyRes = await adminUpdateAgency(memberId, finalAgencyData);
        if (!agencyRes.success) {
          throw new Error("중개업소 정보 등록에 실패했습니다: " + agencyRes.error);
        }
      }

      alert("회원 등록이 완료되었습니다.");
      onBack();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    flex: 1, height: 40, padding: "0 14px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6,
    fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827", background: darkMode ? "#2c2d31" : "#fff", outline: "none"
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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: darkMode ? "#e1e4e8" : "#111827", margin: 0 }}>회원 상세정보</h1>
      </div>

      <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden", marginBottom: 24 }}>
        <div style={rowStyle}>
          <div style={labelStyle}>회원번호</div>
          <div style={contentStyle}>
            <span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>[자동 부여]</span>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>회원ID (이메일)</div>
          <div style={contentStyle}>
            <input type="email" name="email" value={formData.email} onChange={handleMemberChange} style={inputStyle} placeholder="example@gmail.com" />
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
          <div style={contentStyle}><span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>[자동 등록]</span></div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>멤버십</div>
          <div style={contentStyle}><span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>[추후 적용]</span></div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>가입 완료 여부</div>
          <div style={contentStyle}><span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>대기</span></div>
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
            <div style={{...contentStyle, flexDirection: "column", gap: 10, alignItems: "flex-start"}}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" name="zipcode" value={agencyData.zipcode} onChange={handleAgencyChange} style={{...inputStyle, width: 120, flex: "none"}} placeholder="우편번호" />
                <button type="button" style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>우편번호 검색</button>
              </div>
              <input type="text" name="address" value={agencyData.address} onChange={handleAgencyChange} style={{...inputStyle, width: "100%", maxWidth: 600 }} placeholder="기본주소" />
              <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", maxWidth: 600 }}>
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
            <div style={contentStyle}>
              <input type="file" onChange={(e) => handleFileChange(e, "reg_cert")} style={{ fontSize: 14 }} />
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
            <div style={contentStyle}>
              <input type="file" onChange={(e) => handleFileChange(e, "biz_cert")} style={{ fontSize: 14 }} />
            </div>
          </div>

        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 10, paddingBottom: 60 }}>
        <button onClick={handleSubmit} disabled={loading} style={{ height: 42, padding: "0 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "등록 중..." : "💾 저장"}
        </button>
        <button onClick={onBack} style={{ height: 42, padding: "0 24px", background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          취소
        </button>
      </div>

    </div>
  );
}
