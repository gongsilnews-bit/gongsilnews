"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialTab = searchParams.get('tab') === 'agency' ? 'agency' : 'basic';
  const [tab, setTab] = useState<"basic" | "agency" | "marketing">(initialTab as any);

  /* 마케팅 정보 (SNS, API) */
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
  const [rejectReason, setRejectReason] = useState<string | null>(null);
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

        if (m.sns_links) {
          setSnsLinks(prev => {
            const merged = { ...prev };
            Object.keys(m.sns_links).forEach(k => {
              if (k === "api_list") return;
              if (typeof m.sns_links[k] === "string") {
                merged[k] = { ...merged[k], url: m.sns_links[k] };
              } else if (m.sns_links[k]) {
                merged[k] = { ...merged[k], ...m.sns_links[k] };
              }
            });
            return merged;
          });
          if (m.sns_links.api_list && Array.isArray(m.sns_links.api_list)) {
            setApiList(m.sns_links.api_list);
          }
        }

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
          setRejectReason(a.reject_reason || null);
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

  const handleSnsObjChange = (key: string, field: string, value: string) => {
    setSnsLinks(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("클립보드에 복사되었습니다.");
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  const handleAddApi = () => setApiList([...apiList, { ...initialApiObj }]);
  const handleRemoveApi = (idx: number) => setApiList(apiList.filter((_, i) => i !== idx));
  const handleApiChange = (idx: number, field: string, value: string) => {
    const newList = [...apiList];
    (newList[idx] as any)[field] = value;
    setApiList(newList);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, type: "profile" | "reg" | "biz") => {
    if (!e.target.files?.[0]) return;
    const compressed = await compressToWebP(e.target.files[0]);
    const preview = URL.createObjectURL(compressed);
    if (type === "profile") { setProfileFile(compressed); setProfilePreview(preview); }
    else if (type === "reg") { setRegCertFile(compressed); setRegCertPreview(preview); }
    else { setBizCertFile(compressed); setBizCertPreview(preview); }
  };

  const handleSave = async (isTempSave: boolean | React.MouseEvent = false) => {
    const isTemp = typeof isTempSave === 'boolean' ? isTempSave : false;
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
        sns_links: { ...snsLinks, api_list: apiList },
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

        // 반려 상태에서 재저장 시 → 자동으로 승인대기로 변경 (임시저장이 아닐 때만)
        let saveStatus = (!isTemp && agencyStatus === 'REJECTED') ? 'PENDING' : agencyStatus;

        // [AI 서류 자동 검증]
        let aiReason = "";
        if (bizCertFile && saveStatus !== 'APPROVED') {
          try {
            const verifyFd = new FormData();
            verifyFd.append("file", bizCertFile);
            verifyFd.append("companyName", agencyName);
            verifyFd.append("representative", ceoName);

            const verifyRes = await fetch("/api/agents/verify", {
              method: "POST",
              body: verifyFd,
            });
            const verifyResult = await verifyRes.json();
            
            if (verifyResult.status === "APPROVED") {
              saveStatus = "APPROVED"; // AI가 검증 통과시키면 자동 승인
              setAgencyStatus("APPROVED");
              alert("🤖 AI 서류 검증 완료!\n서류와 정보가 일치하여 자동으로 [정상승인] 처리되었습니다.");
            } else if (verifyResult.status === "NEEDS_REVIEW") {
              saveStatus = "PENDING";
              setAgencyStatus("PENDING");
              let diffMsg = "";
              if (verifyResult.diff && verifyResult.diff.found) {
                const isNameDiff = verifyResult.diff.expected?.companyName !== verifyResult.diff.found?.companyName;
                const isRepDiff = verifyResult.diff.expected?.representative !== verifyResult.diff.found?.representative;
                diffMsg = "[불일치 내역]\n";
                if (isNameDiff) diffMsg += `- 상호명 (입력: ${verifyResult.diff.expected?.companyName} / 서류: ${verifyResult.diff.found?.companyName})\n`;
                if (isRepDiff) diffMsg += `- 대표자 (입력: ${verifyResult.diff.expected?.representative} / 서류: ${verifyResult.diff.found?.representative})\n`;
              }
              aiReason = "🤖 AI 자동 검증 보류: 서류 내용 불일치. " + diffMsg;
              alert("🤖 AI 검증 안내: 서류와 입력하신 정보가 일부 불일치하여 관리자 수동 검토(승인대기)로 넘어갑니다.\n\n" + diffMsg + "\n\n서류에 적힌 텍스트와 완벽히 일치하게 입력하시면 즉시 자동 승인됩니다!");
            } else if (verifyResult.status === "ERROR") {
              alert("🤖 AI 검증 에러: " + verifyResult.message + "\n(임시로 승인대기 처리됩니다)");
            }
          } catch (e) {
            console.error("AI Verify Error:", e);
            // 에러 나면 기존처럼 PENDING으로 진행
          }
        }

        await adminUpdateAgency(memberId, {
          name: agencyName, ceo_name: ceoName, cell, phone: officePhone,
          zipcode, address, address_detail: addressDetail,
          intro, reg_num: regNum, biz_num: bizNum,
          reg_cert_url: regUrl, biz_cert_url: bizUrl,
          lat: coords?.lat || null, lng: coords?.lng || null,
          status: saveStatus,
        });

        if (saveStatus === "APPROVED" && agencyStatus !== "APPROVED") {
          const { adminApproveRealtorApplication } = await import("@/app/admin/actions");
          await adminApproveRealtorApplication(memberId);
          setIsRealtor(true);
        }
      }

      if (tab === "agency" && !isRealtor && saveStatus !== "APPROVED") {
        if (!isTemp) {
          setIsRealtor(true);
          setRejectReason(null);
          alert("✅ 부동산회원 전환 신청이 완료되었습니다!\n\n서류 확인 후 승인 처리됩니다.\n(보통 당일~1영업일 소요)");
          router.push("/m/admin/dashboard");
        } else {
          alert("임시저장되었습니다.");
        }
      } else if (!isTemp && agencyStatus === 'REJECTED') {
        setAgencyStatus('PENDING');
        setRejectReason(null);
        alert("✅ 서류가 재제출되었습니다!\n\n관리자 재심사 후 승인 처리됩니다.");
        router.push("/m/admin/dashboard");
      } else {
        alert(isTemp ? "임시저장되었습니다." : "저장되었습니다.");
        if (!isTemp) router.push("/m?menu=open");
      }
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (confirm("정말로 회원을 탈퇴하시겠습니까?\n탈퇴 시 모든 회원 정보가 파기되며 복구할 수 없습니다.")) {
      alert("회원 탈퇴 요청이 정상적으로 접수되었습니다.\n1~2영업일 내에 처리 완료 후 안내 이메일이 발송됩니다.");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/m");
    }
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
        <button onClick={() => handleSave(true)} disabled={saving}
          style={{ height: 36, padding: "0 16px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "저장중..." : "임시저장"}
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        {[{ key: "basic" as const, label: "기본정보" }, { key: "agency" as const, label: "부동산정보" }, { key: "marketing" as const, label: "마케팅정보" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: "14px 0", border: "none", background: "none", fontSize: 14, fontWeight: tab === t.key ? 800 : 500, color: tab === t.key ? "#2563eb" : "#6b7280", borderBottom: tab === t.key ? "3px solid #2563eb" : "3px solid transparent", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 40px" }}>
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
            {/* 승인 상태 Step Indicator */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 12 }}>📋 승인 진행 상태</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {/* Step 1: 작성 중 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", background: !isRealtor && agencyStatus !== "PENDING" && agencyStatus !== "APPROVED" && agencyStatus !== "REJECTED" ? "#3b82f6" : "#d1d5db" }}>1</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: !isRealtor && agencyStatus !== "PENDING" && agencyStatus !== "APPROVED" && agencyStatus !== "REJECTED" ? "#3b82f6" : "#9ca3af" }}>작성 중</div>
                </div>
                <div style={{ width: 40, height: 2, background: agencyStatus === "PENDING" || agencyStatus === "APPROVED" || agencyStatus === "REJECTED" ? "#3b82f6" : "#e5e7eb", flexShrink: 0 }} />
                {/* Step 2: 심사 대기 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", background: agencyStatus === "PENDING" ? "#f59e0b" : agencyStatus === "APPROVED" ? "#d1d5db" : agencyStatus === "REJECTED" ? "#d1d5db" : "#d1d5db" }}>2</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: agencyStatus === "PENDING" ? "#f59e0b" : "#9ca3af" }}>심사 대기</div>
                </div>
                <div style={{ width: 40, height: 2, background: agencyStatus === "APPROVED" || agencyStatus === "REJECTED" ? (agencyStatus === "APPROVED" ? "#10b981" : "#ef4444") : "#e5e7eb", flexShrink: 0 }} />
                {/* Step 3: 결과 */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", background: agencyStatus === "APPROVED" ? "#10b981" : agencyStatus === "REJECTED" ? "#ef4444" : "#d1d5db" }}>{agencyStatus === "APPROVED" ? "✓" : agencyStatus === "REJECTED" ? "!" : "3"}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: agencyStatus === "APPROVED" ? "#10b981" : agencyStatus === "REJECTED" ? "#ef4444" : "#9ca3af" }}>{agencyStatus === "APPROVED" ? "승인 완료" : agencyStatus === "REJECTED" ? "서류 보완" : "승인 완료"}</div>
                </div>
              </div>
            </div>

            {/* 반려 사유 알림 박스 */}
            {agencyStatus === "REJECTED" && (
              <div style={{ background: "#fef2f2", borderRadius: 14, padding: 16, border: "1.5px solid #fecaca", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>🚨</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#b91c1c" }}>심사 반려 - 서류 보완이 필요합니다</span>
                </div>
                {rejectReason && (
                  <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>📌 반려 사유</div>
                    <div style={{ fontSize: 13, color: "#991b1b", lineHeight: 1.5, fontWeight: 600, whiteSpace: "pre-wrap" }}>{rejectReason}</div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>아래 정보를 수정한 후 하단의 <strong>[수정 후 재심사 신청]</strong> 버튼을 눌러주세요.</div>
              </div>
            )}

            {/* 승인대기 안내 */}
            {agencyStatus === "PENDING" && isRealtor && (
              <div style={{ background: "#fffbeb", borderRadius: 14, padding: "12px 16px", border: "1.5px solid #fde68a", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>⏳</span>
                <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.4 }}>
                  <strong>서류 검토 중입니다.</strong> 관리자 확인 후 승인 처리됩니다.
                </div>
              </div>
            )}

            {/* 승인 완료 안내 */}
            {agencyStatus === "APPROVED" && (
              <div style={{ background: "#ecfdf5", borderRadius: 14, padding: "12px 16px", border: "1.5px solid #a7f3d0", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.4 }}>
                  <strong>정상 승인 완료.</strong> 부동산회원 서비스를 정상적으로 이용할 수 있습니다.
                </div>
              </div>
            )}
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

        {/* ── 마케팅정보 탭 ── */}
        {tab === "marketing" && (
          <>
            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 10, fontSize: 13, color: "#64748b", lineHeight: 1.5, marginBottom: 16 }}>
              아래 마케팅 항목은 원하시는 분만 입력하는 <strong style={{color: "#3b82f6"}}>선택사항</strong>입니다.<br/>
              <span style={{color: "#ef4444", fontSize: 12}}>※ 우측에 메모하시는 ID/PW 정보는 관리자나 외부인에게 노출되지 않으며, **오직 본인만** 열람할 수 있도록 안전하게 보관됩니다.</span>
            </div>

            {/* API 관리 */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>🔑 API Key 메모</div>
                <button onClick={handleAddApi} style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>+ 추가</button>
              </div>
              
              {apiList.map((api, idx) => (
                <div key={idx} style={{ background: "#f9fafb", borderRadius: 10, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
                  <select value={api.provider} onChange={(e) => handleApiChange(idx, 'provider', e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "#fff" }}>
                    <option value="챗GPT">챗GPT</option>
                    <option value="클로드">클로드</option>
                    <option value="구글">구글 (Gemini)</option>
                    <option value="기타">기타 API</option>
                  </select>
                  <div style={{ display: "flex", position: "relative", marginBottom: 8 }}>
                    <input type="text" value={api.key_value} onChange={(e) => handleApiChange(idx, 'key_value', e.target.value)} style={{ ...inputStyle, paddingRight: 40 }} placeholder="API Key 또는 주소" />
                    <button onClick={() => handleCopy(api.key_value)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4 }}>📋</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input type="text" value={api.login_id} onChange={(e) => handleApiChange(idx, 'login_id', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="ID" />
                    <input type="password" value={api.login_pw} onChange={(e) => handleApiChange(idx, 'login_pw', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="비밀번호" />
                  </div>
                  <button onClick={() => handleRemoveApi(idx)} style={{ width: "100%", height: 36, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>삭제</button>
                </div>
              ))}
              {apiList.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "10px 0" }}>등록된 API 정보가 없습니다.</div>}
            </div>

            {/* SNS 링크 */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 16 }}>🔗 마케팅 및 SNS 링크</div>
              {Object.keys(snsLabels).map((key) => {
                const sns = snsLinks[key] || initialSnsObj;
                return (
                  <div key={key} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>{snsLabels[key]}</div>
                    <div style={{ display: "flex", position: "relative", marginBottom: 8 }}>
                      <input type="text" value={sns.url} onChange={(e) => handleSnsObjChange(key, 'url', e.target.value)} style={{ ...inputStyle, paddingRight: 40 }} placeholder={`${snsLabels[key]} 주소(URL) 입력`} />
                      <button onClick={() => handleCopy(sns.url)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4 }}>📋</button>
                    </div>
                    <select value={sns.login_type} onChange={(e) => handleSnsObjChange(key, 'login_type', e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "#f9fafb" }}>
                      <option value="일반">일반/직접가입</option>
                      <option value="네이버">네이버 가입</option>
                      <option value="카카오">카카오 가입</option>
                      <option value="구글">구글 가입</option>
                      <option value="다음">다음(Daum)</option>
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" value={sns.login_id} onChange={(e) => handleSnsObjChange(key, 'login_id', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="로그인 ID (메모)" />
                      <input type="password" value={sns.login_pw} onChange={(e) => handleSnsObjChange(key, 'login_pw', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="비밀번호 (메모)" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── 하단 버튼 영역 (스크롤 끝, 고정바 아님) ── */}
        <div style={{ marginTop: 32, marginBottom: 16 }}>
          {tab === "agency" && (!isRealtor || agencyStatus === "REJECTED") ? (
            <button onClick={() => {
              if (!agencyName || !ceoName || !cell || !officePhone || !address || !intro || !bizNum || !regNum || (!bizCertPreview && !bizCertFile) || (!regCertPreview && !regCertFile)) {
                alert("필수 정보를 모두 입력하고 사업자등록증과 중개사무소 등록증을 첨부해야 승인 신청이 가능합니다.");
                return;
              }
              if (confirm(agencyStatus === "REJECTED" ? "수정된 정보로 재심사를 신청하시겠습니까?" : "부동산회원 승인 심사를 신청하시겠습니까?\n\n제출 후 관리자 검토가 진행됩니다.")) {
                handleSave(false);
              }
            }} disabled={saving}
              style={{ width: "100%", height: 56, borderRadius: 12, border: "none", background: agencyStatus === "REJECTED" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: agencyStatus === "REJECTED" ? "0 4px 12px rgba(245,158,11,0.3)" : "0 4px 12px rgba(59,130,246,0.3)" }}>
              {saving ? "처리 중..." : agencyStatus === "REJECTED" ? "📋 수정 후 재심사 신청" : "📋 승인 심사 신청하기"}
            </button>
          ) : (
            <button onClick={() => handleSave(false)} disabled={saving}
              style={{ width: "100%", height: 56, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
              {saving ? "저장 중..." : "💾 정보 수정 저장"}
            </button>
          )}
        </div>

        {/* ── 회원 탈퇴 버튼 ── */}
        <div style={{ paddingBottom: 24, textAlign: "center" }}>
          <button onClick={handleDeleteAccount}
            style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: "8px 16px" }}>
            회원 탈퇴 (계정 삭제)
          </button>
        </div>
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
