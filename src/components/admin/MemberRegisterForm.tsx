"use client";

import React, { useState, useEffect } from "react";
import { adminCreateMember, adminUpdateAgency, adminUploadAgencyDocument, adminGetMemberDetail, adminUpdateMember } from "@/app/admin/actions";
import { geocodeAddress } from "@/app/actions/geocode";

interface MemberRegisterFormProps {
  onBack: () => void;
  darkMode?: boolean;
  editMemberId?: string | null;
  isAdmin?: boolean;
  initialTab?: number;
}

export default function MemberRegisterForm({ onBack, darkMode = false, editMemberId = null, isAdmin = false, initialTab = 0 }: MemberRegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(!editMemberId);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: "일반회원",
    created_at: "",
    memberNumber: "",
    plan_type: "free",
    plan_start_date: "",
    plan_end_date: "",
    max_vacancies: 5,
    max_articles_per_month: 0
  });

  const [agencyData, setAgencyData] = useState({
    name: "",
    ceo_name: "",
    cell: "",
    phone: "",
    zipcode: "",
    address: "",
    address_detail: "",
    intro: "",
    reg_num: "",
    biz_num: "",
    status: "PENDING"
  });

  const [originalAgencyData, setOriginalAgencyData] = useState<any>(null);

  const [files, setFiles] = useState<{ reg_cert?: File; biz_cert?: File }>({});
  const [filePreviews, setFilePreviews] = useState<{ reg_cert?: string; biz_cert?: string }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab); 

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const initialSnsObj = { url: "", login_id: "", login_pw: "", login_type: "일반" };
  const [snsLinks, setSnsLinks] = useState<Record<string, typeof initialSnsObj>>({
    homepage: { ...initialSnsObj }, contact: { ...initialSnsObj }, shopping_mall: { ...initialSnsObj }, 
    blog: { ...initialSnsObj }, cafe: { ...initialSnsObj }, youtube: { ...initialSnsObj }, 
    facebook: { ...initialSnsObj }, twitter: { ...initialSnsObj }, instagram: { ...initialSnsObj }, 
    kakao: { ...initialSnsObj }, threads: { ...initialSnsObj }
  });
  const snsLabels: Record<string, string> = { homepage: "홈페이지", contact: "문의하기", shopping_mall: "쇼핑몰", blog: "블로그", cafe: "카페", youtube: "유튜브", facebook: "페이스북", twitter: "트위터", instagram: "인스타그램", kakao: "카카오", threads: "쓰레드" };
  
  const initialApiObj = { provider: "챗GPT", key_value: "", login_id: "", login_pw: "" };
  const [apiList, setApiList] = useState<typeof initialApiObj[]>([]);

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
            memberNumber: res.member.memberNumber || "",
            plan_type: res.member.plan_type || "free",
            plan_start_date: res.member.plan_start_date ? new Date(res.member.plan_start_date).toISOString().split('T')[0] : "",
            plan_end_date: res.member.plan_end_date ? new Date(res.member.plan_end_date).toISOString().split('T')[0] : "",
            max_vacancies: res.member.max_vacancies ?? 5,
            max_articles_per_month: res.member.max_articles_per_month ?? 0
          });
          if (res.member.profile_image_url) {
            setProfilePhotoPreview(res.member.profile_image_url);
          }
          if (res.member.sns_links) {
            setSnsLinks(prev => {
              const merged = { ...prev };
              Object.keys(res.member.sns_links).forEach(k => {
                if (k === "api_list") return; // JSON의 api_list 무시
                if (typeof res.member.sns_links[k] === "string") {
                  merged[k] = { ...merged[k], url: res.member.sns_links[k] };
                } else if (res.member.sns_links[k]) {
                  merged[k] = { ...merged[k], ...res.member.sns_links[k] };
                }
              });
              return merged;
            });
            if (res.member.sns_links.api_list && Array.isArray(res.member.sns_links.api_list)) {
              setApiList(res.member.sns_links.api_list);
            }
          }
          if (res.agency) {
            setAgencyData({
              name: res.agency.name || "",
              ceo_name: res.agency.ceo_name || "",
              cell: res.agency.cell || "",
              phone: res.agency.phone || "",
              zipcode: res.agency.zipcode || "",
              address: res.agency.address || "",
              address_detail: res.agency.address_detail || "",
              intro: res.agency.intro || "",
              reg_num: res.agency.reg_num || "",
              biz_num: res.agency.biz_num || "",
              status: res.agency.status || "PENDING"
            });
            setOriginalAgencyData({
              name: res.agency.name || "",
              ceo_name: res.agency.ceo_name || "",
              address: res.agency.address || "",
              reg_num: res.agency.reg_num || "",
              biz_num: res.agency.biz_num || ""
            });
            setFilePreviews({
              reg_cert: res.agency.reg_cert_url || undefined,
              biz_cert: res.agency.biz_cert_url || undefined
            });
            // DB에 저장된 좌표를 coords state에 복원
            if (res.agency.lat && res.agency.lng) {
              setCoords({ lat: Number(res.agency.lat), lng: Number(res.agency.lng) });
            }
          }
        }
        setLoading(false);
        setInitialFetchDone(true);
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
        oncomplete: async function(data: any) {
          setAgencyData({
            ...agencyData,
            zipcode: data.zonecode,
            address: data.address
          });

          // 카카오 Geocoder REST API로 좌표 자동 추출
          setGeocoding(true);
          try {
            const result = await geocodeAddress(data.address);
            if (result.success && result.lat && result.lng) {
              setCoords({ lat: result.lat, lng: result.lng });
              console.log(`✅ 좌표 변환 성공: ${result.lat}, ${result.lng}`);
            } else {
              console.warn('⚠️ 좌표 변환 실패:', result.error);
              setCoords(null);
            }
          } catch (err) {
            console.error('좌표 변환 중 오류:', err);
            setCoords(null);
          } finally {
            setGeocoding(false);
          }
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

  const handleAgencyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (["phone", "cell"].includes(e.target.name)) val = formatPhone(val);
    if (e.target.name === "biz_num") val = formatBizNum(val);
    setAgencyData({ ...agencyData, [e.target.name]: val });
  };

  const handleSnsObjChange = (key: string, field: string, value: string) => {
    setSnsLinks(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("클립보드에 복사되었습니다.");
    } catch (err) {
      alert("복사에 실패했습니다.");
    }
  };

  const handleAddApi = () => {
    setApiList([...apiList, { ...initialApiObj }]);
  };

  const handleRemoveApi = (idx: number) => {
    setApiList(apiList.filter((_, i) => i !== idx));
  };

  const handleApiChange = (idx: number, field: string, value: string) => {
    const newList = [...apiList];
    (newList[idx] as any)[field] = value;
    setApiList(newList);
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

  const handleSubmit = async (e?: React.MouseEvent | React.FormEvent, requestApproval: boolean = false) => {
    if (e) e.preventDefault();
    if (requestApproval) {
      if (!agencyData.name || !agencyData.ceo_name || !agencyData.cell || !agencyData.phone || !agencyData.address || !agencyData.intro || !agencyData.reg_num || !agencyData.biz_num || (!files.reg_cert && !filePreviews.reg_cert) || (!files.biz_cert && !filePreviews.biz_cert)) {
        alert("필수 정보를 모두 입력하고 서류를 첨부해야 승인대기 신청이 가능합니다.");
        setActiveTab(1);
        return;
      }
    }

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
        form.append("sns_links", JSON.stringify({ ...snsLinks, api_list: apiList }));
        form.append("plan_type", formData.plan_type);
        if (formData.plan_start_date) form.append("plan_start_date", formData.plan_start_date);
        if (formData.plan_end_date) form.append("plan_end_date", formData.plan_end_date);
        form.append("max_vacancies", String(formData.max_vacancies));
        form.append("max_articles_per_month", String(formData.max_articles_per_month));

        const memberRes = await adminCreateMember(form);

        if (!memberRes.success || !memberRes.userId) {
          throw new Error(memberRes.error || "회원 등록에 실패했습니다.");
        }
        memberId = memberRes.userId;
      } else {
        // 프로필 사진 업로드 처리
        let profileImageUrl: string | null | undefined = undefined;
        if (profilePhoto) {
          const fileForm = new FormData();
          fileForm.append("file", profilePhoto);
          fileForm.append("path", `${editMemberId}/profile_${Date.now()}.webp`);
          const uploadRes = await adminUploadAgencyDocument(fileForm);
          if (uploadRes.success) profileImageUrl = uploadRes.url || null;
        } else if (profilePhotoPreview === null && !profilePhoto) {
          // 사진이 삭제된 경우
          profileImageUrl = null;
        }

        const updateRes = await adminUpdateMember(editMemberId, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role === '최고관리자' ? 'ADMIN' : formData.role === '부동산회원' ? 'REALTOR' : 'USER',
          sns_links: { ...snsLinks, api_list: apiList },
          plan_type: formData.plan_type,
          plan_start_date: formData.plan_start_date || null,
          plan_end_date: formData.plan_end_date || null,
          max_vacancies: Number(formData.max_vacancies) || 0,
          max_articles_per_month: Number(formData.max_articles_per_month) || 0,
          ...(profileImageUrl !== undefined ? { profile_image_url: profileImageUrl } : {})
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

        const isCoreRealtorDataChanged = !isAdmin && agencyData.status === "APPROVED" && (
          files.reg_cert !== undefined || files.biz_cert !== undefined ||
          (originalAgencyData && (
            agencyData.name !== originalAgencyData.name ||
            agencyData.ceo_name !== originalAgencyData.ceo_name ||
            agencyData.reg_num !== originalAgencyData.reg_num ||
            agencyData.biz_num !== originalAgencyData.biz_num ||
            agencyData.address !== originalAgencyData.address
          ))
        );

        let finalStatus = agencyData.status;
        if (isAdmin) {
          finalStatus = agencyData.status;
        } else if (requestApproval) {
          finalStatus = "PENDING";
        } else if (isCoreRealtorDataChanged) {
          finalStatus = "PENDING";
        }

        const finalAgencyData = {
          ...agencyData,
          reg_cert_url: regCertUrl,
          biz_cert_url: bizCertUrl,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          status: finalStatus
        };

        const agencyRes = await adminUpdateAgency(memberId, finalAgencyData);
        if (!agencyRes.success) {
          throw new Error("중개업소 정보 저장에 실패했습니다: " + agencyRes.error);
        }
      }

      if (!isAdmin && agencyData.status === "APPROVED" && formData.role === "부동산회원") {
        // Find if we downgraded
        const wasDowngraded = isAdmin ? false : (!requestApproval && (
          files.reg_cert !== undefined || files.biz_cert !== undefined ||
          (originalAgencyData && (
            agencyData.name !== originalAgencyData.name ||
            agencyData.ceo_name !== originalAgencyData.ceo_name ||
            agencyData.reg_num !== originalAgencyData.reg_num ||
            agencyData.biz_num !== originalAgencyData.biz_num ||
            agencyData.address !== originalAgencyData.address
          ))
        ));

        if (wasDowngraded) {
          alert("중요 회원정보(주소, 등록번호, 서류 등)가 변경되어 다시 [승인대기] 상태로 전환되었습니다.\n관리자 재승인 완료 시 정상 이용이 가능합니다.");
        } else {
          alert(editMemberId ? "회원 수정이 완료되었습니다." : "회원 등록이 완료되었습니다.");
        }
      } else {
        alert(editMemberId ? "회원 수정이 완료되었습니다." : "회원 등록이 완료되었습니다.");
      }
      
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'button') return;
      e.preventDefault();
      
      const focusableElements = 'input:not([disabled]):not([readonly]), select:not([disabled])';
      const elements = Array.from(document.querySelectorAll(focusableElements)) as HTMLElement[];
      const index = elements.indexOf(target);
      
      if (index > -1 && index < elements.length - 1) {
        elements[index + 1].focus();
      }
    }
  };

  if (!initialFetchDone) {
    return (
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400, color: darkMode ? "#9ca3af" : "#6b7280", fontSize: 15, fontWeight: 600 }}>
        회원 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div onKeyDown={handleKeyDown} style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: darkMode ? "#1a1b1e" : "#f4f5f7" }}>
      {/* 타이틀 및 백버튼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ height: 36, padding: "0 16px", background: "#fff", color: "#4b5563", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          ← 목록으로
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: darkMode ? "#e1e4e8" : "#111827", margin: 0 }}>
          {editMemberId ? "회원수정" : "회원등록"}
        </h1>
      </div>

      <div style={{ display: "flex", gap: "2px", marginBottom: "20px" }}>
        <button onClick={() => setActiveTab(0)} style={{ flex: 1, padding: "14px", background: activeTab === 0 ? (darkMode ? "#3b82f6" : "#2563eb") : (darkMode ? "#2c2d31" : "#fff"), color: activeTab === 0 ? "#fff" : (darkMode ? "#9ca3af" : "#6b7280"), border: activeTab !== 0 ? `1px solid ${darkMode ? "#333" : "#e5e7eb"}` : "none", borderBottom: activeTab === 0 ? "none" : `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}>기본정보</button>
        {formData.role === "부동산회원" && (
          <button onClick={() => setActiveTab(1)} style={{ flex: 1, padding: "14px", background: activeTab === 1 ? (darkMode ? "#3b82f6" : "#2563eb") : (darkMode ? "#2c2d31" : "#fff"), color: activeTab === 1 ? "#fff" : (darkMode ? "#9ca3af" : "#6b7280"), border: activeTab !== 1 ? `1px solid ${darkMode ? "#333" : "#e5e7eb"}` : "none", borderBottom: activeTab === 1 ? "none" : `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}>부동산정보</button>
        )}
        <button onClick={() => setActiveTab(2)} style={{ flex: 1, padding: "14px", background: activeTab === 2 ? (darkMode ? "#3b82f6" : "#2563eb") : (darkMode ? "#2c2d31" : "#fff"), color: activeTab === 2 ? "#fff" : (darkMode ? "#9ca3af" : "#6b7280"), border: activeTab !== 2 ? `1px solid ${darkMode ? "#333" : "#e5e7eb"}` : "none", borderBottom: activeTab === 2 ? "none" : `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}>마케팅정보</button>
      </div>

      {activeTab === 0 && (
      <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, borderTop: "none", overflow: "hidden", marginBottom: 24 }}>
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

        {/* 프로필 사진 (선택) */}
        <div style={rowStyle}>
          <div style={{...labelStyle, flexDirection: "column" as const, alignItems: "flex-start", gap: 4, justifyContent: "center"}}>
            프로필 사진
            <span style={{ fontSize: 11, color: "#888", fontWeight: "normal" }}>(선택사항)</span>
          </div>
          <div style={{...contentStyle, gap: 16}}>
            {profilePhotoPreview ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={profilePhotoPreview}
                  alt="프로필"
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${darkMode ? "#444" : "#e5e7eb"}`, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                  onClick={() => setPreviewImage(profilePhotoPreview)}
                />
                <button
                  onClick={() => { setProfilePhoto(null); setProfilePhotoPreview(null); }}
                  style={{ position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "2px solid #fff", fontSize: 13, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}
                >&times;</button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: darkMode ? "#333" : "#f0f4f8", border: `2px dashed ${darkMode ? "#555" : "#d1d5db"}`, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 2, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#508bf5"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = darkMode ? "#555" : "#d1d5db"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "#888" : "#aaa"} strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span style={{ fontSize: 10, color: "#aaa" }}>사진 추가</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const compressed = await compressToWebP(e.target.files[0]);
                      setProfilePhoto(compressed);
                      setProfilePhotoPreview(URL.createObjectURL(compressed));
                    }
                  }}
                />
              </label>
            )}
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
            {isAdmin ? (
              <select name="role" value={formData.role} onChange={handleMemberChange} style={{ height: 40, padding: "0 14px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827", background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 160 }}>
                <option value="일반회원">일반회원</option>
                <option value="부동산회원">부동산회원</option>
                <option value="최고관리자">최고관리자</option>
              </select>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 700, color: darkMode ? "#3b82f6" : "#2563eb", background: darkMode ? "#1e3a8a" : "#dbeafe", padding: "4px 10px", borderRadius: 6 }}>{formData.role}</span>
            )}
          </div>
        </div>

        {formData.role === "부동산회원" && (
          <>
            <div style={rowStyle}>
              <div style={labelStyle}>부동산 요금제</div>
              <div style={contentStyle}>
                <select name="plan_type" value={formData.plan_type} onChange={handleMemberChange} disabled={!isAdmin} style={{ height: 40, padding: "0 14px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827", background: darkMode ? "#2c2d31" : "#fff", outline: "none", width: 180 }}>
                  <option value="free">무료부동산 (Free)</option>
                  <option value="news_premium">공실뉴스부동산</option>
                  <option value="vacancy_premium">공실등록부동산</option>
                </select>
              </div>
            </div>
            {formData.plan_type !== "free" && (
              <div style={rowStyle}>
                <div style={labelStyle}>요금제 적용기간</div>
                <div style={{ ...contentStyle, gap: 12, alignItems: 'center' }}>
                  <input type="date" name="plan_start_date" value={formData.plan_start_date} onChange={handleMemberChange} disabled={!isAdmin} style={{ ...inputStyle, flex: "none", width: 160 }} />
                  <span style={{ fontWeight: "bold", color: darkMode ? "#ccc" : "#555" }}>~</span>
                  <input type="date" name="plan_end_date" value={formData.plan_end_date} onChange={handleMemberChange} disabled={!isAdmin} style={{ ...inputStyle, flex: "none", width: 160 }} />
                  <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>종료일이 지나면 자동으로 기본(무료) 요금제로 전환 취급됩니다.</span>
                </div>
              </div>
            )}

            <div style={rowStyle}>
              <div style={labelStyle}>개별 등록 한도 설정</div>
              <div style={{ ...contentStyle, gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <span style={{ fontWeight: 600, color: darkMode ? '#ccc' : '#444' }}>매물 등록(총 건수):</span>
                  <input type="number" name="max_vacancies" value={formData.max_vacancies} onChange={handleMemberChange} disabled={!isAdmin} style={{ ...inputStyle, flex: "none", width: 80, textAlign: 'right' }} min={0} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <span style={{ fontWeight: 600, color: darkMode ? '#ccc' : '#444' }}>뉴스 작성(월 단위):</span>
                  <input type="number" name="max_articles_per_month" value={formData.max_articles_per_month} onChange={handleMemberChange} disabled={!isAdmin} style={{ ...inputStyle, flex: "none", width: 80, textAlign: 'right' }} min={0} />
                </label>
                <div style={{ width: '100%', fontSize: 12, color: "#888" }}>0으로 설정 시 해당 기능을 사용할 수 없으며, 매우 높은 숫자 입력 시 무제한과 동일합니다. (기본값: 매물 5, 기사 0)</div>
              </div>
            </div>
          </>
        )}

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
                  <span 
                    onClick={() => { if (agencyData.status === "REJECTED") setActiveTab(1); }}
                    style={{ 
                      fontSize: 14, fontWeight: 700, padding: "4px 10px", borderRadius: 4, 
                      cursor: agencyData.status === "REJECTED" ? "pointer" : "default",
                      ...((agencyData.status === "APPROVED") ? { background: "#d1fae5", color: "#065f46" } : (agencyData.status === "REJECTED") ? { background: "#fee2e2", color: "#b91c1c" } : { background: "#fef3c7", color: "#92400e" }) 
                    }}
                  >
                    {agencyData.status === "APPROVED" ? "정상승인" : agencyData.status === "REJECTED" ? "서류보완 필요" : "승인대기"}
                  </span>
                  {agencyData.status === "PENDING" && (
                    <span style={{ fontSize: 13, color: darkMode ? "#a1a1aa" : "#6b7280" }}>서류를 꼼꼼히 확인하고 있어요! 조금만 기다려주세요 🐰</span>
                  )}
                  {agencyData.status === "REJECTED" && (
                    <span onClick={() => setActiveTab(1)} style={{ fontSize: 13, color: darkMode ? "#fca5a5" : "#ef4444", fontWeight: 600, cursor: "pointer" }}>
                      앗! 제출하신 정보가 다소 부족해요 😭 <span style={{ textDecoration: "underline" }}>여기를 눌러서 마저 입력해주세요!</span>
                    </span>
                  )}
                </div>
              )
            ) : (
              <span style={{ fontSize: 14, color: darkMode ? "#9ca3af" : "#6b7280" }}>{editMemberId ? "정상" : "대기"}</span>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 1 && formData.role === "부동산회원" && (
        <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, borderTop: "none", overflow: "hidden", marginBottom: 24 }}>
          
          <div style={{ ...rowStyle, borderTop: "none" }}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              상호(사업장명)
              {!agencyData.name && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={contentStyle}>
              <input type="text" name="name" value={agencyData.name} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="중개업소명 입력" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              대표자명
              {!agencyData.ceo_name && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={contentStyle}>
              <input type="text" name="ceo_name" value={agencyData.ceo_name} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              대표자 연락처
              {!agencyData.cell && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={contentStyle}>
              <input type="text" name="cell" value={agencyData.cell} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="010-0000-0000" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              사무실 전화
              {!agencyData.phone && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={contentStyle}>
              <input type="text" name="phone" value={agencyData.phone} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              사무실 주소
              {!agencyData.address && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={{...contentStyle, flexDirection: "column", gap: 10, alignItems: "stretch"}}>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" name="zipcode" value={agencyData.zipcode} onChange={handleAgencyChange} style={{...readOnlyStyle, width: 120, flex: "none"}} placeholder="우편번호" readOnly />
                <button type="button" onClick={openDaumPostcode} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>우편번호 검색</button>
              </div>
              <input type="text" name="address" value={agencyData.address} onChange={handleAgencyChange} style={{...readOnlyStyle, width: "100%", maxWidth: "none" }} placeholder="기본주소" readOnly />
              <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", maxWidth: "none" }}>
                <span style={{ fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280", flexShrink: 0 }}>상세주소</span>
                <input type="text" name="address_detail" value={agencyData.address_detail} onChange={handleAgencyChange} style={{...inputStyle, flex: 1}} placeholder="상세주소 입력" />
              </div>
              {/* 좌표 변환 결과 표시 */}
              {geocoding && (
                <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  ⏳ 주소로부터 좌표를 추출하는 중...
                </div>
              )}
              {!geocoding && coords && (
                <div style={{ fontSize: 12, color: "#10b981", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  ✅ 좌표 추출 완료: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </div>
              )}
              {!geocoding && agencyData.address && !coords && (
                <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  ⚠️ 좌표 추출 실패 — 나중에 다시 주소를 검색해 주세요.
                </div>
              )}
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              <div>부동산 소개<br/><span style={{fontSize: 11, color: "#888", fontWeight: "normal"}}>(100자 이내)</span></div>
              {!agencyData.intro && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={{...contentStyle, flexDirection: "column", alignItems: "flex-end"}}>
              <textarea 
                name="intro" 
                value={agencyData.intro} 
                onChange={handleAgencyChange} 
                maxLength={100}
                style={{...inputStyle, width: "100%", maxWidth: "none", height: 80, padding: "10px 14px", resize: "none"}} 
                placeholder="부동산에 대한 간단한 소개를 작성해주세요." 
              />
              <span style={{ fontSize: 12, color: agencyData.intro?.length >= 100 ? "#ef4444" : "#9ca3af", marginTop: 4 }}>
                {agencyData.intro?.length || 0} / 100
              </span>
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              등록번호
              {!agencyData.reg_num && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={contentStyle}>
              <input type="text" name="reg_num" value={agencyData.reg_num} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="중개업 등록번호" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              등록증 사본 첨부
              {!filePreviews.reg_cert && !files.reg_cert && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수첨부 누락</span>
              )}
            </div>
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
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              사업자등록번호
              {!agencyData.biz_num && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수입력 누락</span>
              )}
            </div>
            <div style={contentStyle}>
              <input type="text" name="biz_num" value={agencyData.biz_num} onChange={handleAgencyChange} style={{...inputStyle, maxWidth: 300}} placeholder="000-00-00000" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ ...labelStyle, flexWrap: "wrap", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "center", lineHeight: 1.2 }}>
              사업자등록증 첨부
              {!filePreviews.biz_cert && !files.biz_cert && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>🚨 필수첨부 누락</span>
              )}
            </div>
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

      {activeTab === 2 && (
        <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, borderTop: "none", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", color: darkMode ? "#9ca3af" : "#65748b", fontSize: 13, borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, background: darkMode ? "#333" : "#f8fafc", lineHeight: 1.5 }}>
            아래 마케팅 항목은 원하시는 분만 입력하는 <strong style={{color: "#3b82f6"}}>선택사항</strong>입니다.<br/>
            <span style={{color: "#ef4444", fontSize: 12}}>※ 우측에 메모하시는 ID/PW 정보는 관리자나 외부인에게 노출되지 않으며, **오직 본인만** 열람할 수 있도록 안전하게 보관됩니다.</span>
          </div>

          <div style={rowStyle}>
            <div style={{...labelStyle, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 6}}>
              <div>API Key 메모</div>
              <button onClick={handleAddApi} style={{ padding: "4px 10px", fontSize: 12, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>+ 추가하기</button>
            </div>
            <div style={{ ...contentStyle, flexDirection: "column", gap: 10, alignItems: "stretch" }}>
              {apiList.map((api, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: darkMode ? "#333" : "#f9fafb", padding: "10px 14px", borderRadius: 8, border: `1px solid ${darkMode ? "#444" : "#e5e7eb"}` }}>
                  <select 
                    value={api.provider} 
                    onChange={(e) => handleApiChange(idx, 'provider', e.target.value)} 
                    style={{ ...inputStyle, flex: "none", width: 120 }}
                  >
                    <option value="챗GPT">챗GPT</option>
                    <option value="클로드">클로드</option>
                    <option value="구글">구글 (Gemini)</option>
                    <option value="기타">기타 API</option>
                  </select>
                  <div style={{ display: "flex", flex: 2, minWidth: 200, position: "relative" }}>
                    <input
                      type="text"
                      value={api.key_value}
                      onChange={(e) => handleApiChange(idx, 'key_value', e.target.value)}
                      style={{ ...inputStyle, width: "100%", paddingRight: 32 }}
                      placeholder="API Key 또는 주소"
                    />
                    <button 
                      type="button"
                      onClick={() => handleCopy(api.key_value)}
                      title="복사하기"
                      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "#9ca3af" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={api.login_id}
                    onChange={(e) => handleApiChange(idx, 'login_id', e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 100 }}
                    placeholder="로그인 ID"
                  />
                  <input
                    type="password"
                    value={api.login_pw}
                    onChange={(e) => handleApiChange(idx, 'login_pw', e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 100 }}
                    placeholder="비밀번호"
                  />
                  <button onClick={() => handleRemoveApi(idx)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, height: 36, padding: "0 14px", fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>삭제</button>
                </div>
              ))}
              {apiList.length === 0 && (
                <span style={{ fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280", padding: "10px 0" }}>등록된 API 정보가 없습니다. 좌측의 추가 버튼을 눌러 추가해주세요.</span>
              )}
            </div>
          </div>

          {Object.keys(snsLabels).map((key) => {
            const sns = snsLinks[key] || initialSnsObj;
            return (
              <div style={rowStyle} key={key}>
                <div style={labelStyle}>{snsLabels[key]}</div>
                <div style={{ ...contentStyle, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flex: 2, minWidth: 200, position: "relative" }}>
                    <input
                      type="text"
                      value={sns.url}
                      onChange={(e) => handleSnsObjChange(key, 'url', e.target.value)}
                      style={{ ...inputStyle, width: "100%", paddingRight: 32 }}
                      placeholder={`${snsLabels[key]} 주소(URL) 입력`}
                    />
                    <button 
                      type="button"
                      onClick={() => handleCopy(sns.url)}
                      title="복사하기"
                      style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "#9ca3af" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                  <select 
                    value={sns.login_type} 
                    onChange={(e) => handleSnsObjChange(key, 'login_type', e.target.value)} 
                    style={{ ...inputStyle, flex: "none", width: 130, padding: "0 10px" }}
                  >
                    <option value="일반">일반/직접가입</option>
                    <option value="네이버">네이버 가입</option>
                    <option value="카카오">카카오 가입</option>
                    <option value="구글">구글 가입</option>
                    <option value="다음">다음(Daum)</option>
                  </select>
                  <input
                    type="text"
                    value={sns.login_id}
                    onChange={(e) => handleSnsObjChange(key, 'login_id', e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 100 }}
                    placeholder="로그인 ID (메모)"
                  />
                  <input
                    type="password"
                    value={sns.login_pw}
                    onChange={(e) => handleSnsObjChange(key, 'login_pw', e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                    placeholder="비밀번호 (메모)"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 10, paddingBottom: 60 }}>
        {formData.role === "부동산회원" && !isAdmin && agencyData.status === "REJECTED" && (
          <button onClick={(e) => handleSubmit(e, true)} disabled={loading} style={{ height: 42, padding: "0 24px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "처리 중..." : "승인대기 신청"}
          </button>
        )}
        <button onClick={(e) => handleSubmit(e, false)} disabled={loading} style={{ height: 42, padding: "0 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
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
