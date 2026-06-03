"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { adminGetMemberDetail, adminUpdateMember, adminUpdateAgency, adminUploadAgencyDocument } from "@/app/admin/actions";
import { geocodeAddress } from "@/app/actions/geocode";

import imageCompression from "browser-image-compression";

/* ?€?€ WebP ?•ì¶• (browser-image-compression ?œìš©) ?€?€ */
const compressToWebP = async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
  if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
    return file;
  }
  try {
    const options = {
      maxSizeMB: 1,          // ìµœë? ?©ëŸ‰ 1MB ?œí•œ
      maxWidthOrHeight: maxWidth, // ê°€ë¡œì„¸ë¡?ìµœë? maxWidth ë¦¬ì‚¬?´ì§•
      useWebWorker: true,
      fileType: "image/webp", // WebP ?¬ë§·?¼ë¡œ ë³€??ê°•ì œ
      initialQuality: quality
    };
    // HEIC ë°?ê³ í•´?ë„ ì²˜ë¦¬ë¥??„ë²½?˜ê²Œ ëª¨ë°”???˜ë“œ?¨ì–´ ?¨ì—??ìµœì ??ì§€??    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
      type: "image/webp"
    });
  } catch (error) {
    console.error("?•ì¶• ?¤íŒ¨, ?ë³¸ ?…ë¡œ??", error);
    return file;
  }
};

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

  /* ë§ˆì????•ë³´ (SNS, API) */
  const initialSnsObj = { url: "", login_id: "", login_pw: "", login_type: "?¼ë°˜" };
  const [snsLinks, setSnsLinks] = useState<Record<string, typeof initialSnsObj>>({
    homepage: { ...initialSnsObj }, contact: { ...initialSnsObj }, shopping_mall: { ...initialSnsObj }, 
    blog: { ...initialSnsObj }, cafe: { ...initialSnsObj }, youtube: { ...initialSnsObj }, 
    facebook: { ...initialSnsObj }, twitter: { ...initialSnsObj }, instagram: { ...initialSnsObj }, 
    kakao: { ...initialSnsObj }, threads: { ...initialSnsObj }
  });
  const snsLabels: Record<string, string> = { homepage: "?ˆí˜?´ì?", contact: "ë¬¸ì˜?˜ê¸°", shopping_mall: "?¼í•‘ëª?, blog: "ë¸”ë¡œê·?, cafe: "ì¹´í˜", youtube: "? íŠœë¸?, facebook: "?˜ì´?¤ë¶", twitter: "?¸ìœ„??, instagram: "?¸ìŠ¤?€ê·¸ë¨", kakao: "ì¹´ì¹´??, threads: "?°ë ˆ?? };
  const initialApiObj = { provider: "ì±—GPT", key_value: "", login_id: "", login_pw: "" };
  const [apiList, setApiList] = useState<typeof initialApiObj[]>([]);
  const [isRealtor, setIsRealtor] = useState(false);

  /* ê¸°ë³¸ ?•ë³´ */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const profileRef = useRef<HTMLInputElement>(null);

  /* ë¶€?™ì‚° ?•ë³´ */
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

  /* ?œë¥˜ ?¬ì§„ */
  const [regCertPreview, setRegCertPreview] = useState<string | null>(null);
  const [regCertFile, setRegCertFile] = useState<File | null>(null);
  const [bizCertPreview, setBizCertPreview] = useState<string | null>(null);
  const [bizCertFile, setBizCertFile] = useState<File | null>(null);
  const regCertRef = useRef<HTMLInputElement>(null);
  const bizCertRef = useRef<HTMLInputElement>(null);

  /* ?´ë?ì§€ ?•ë? */
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
        setIsRealtor(m.role === "REALTOR" || m.role === "ë¶€?™ì‚°?Œì›");
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

  /* ?¤ìŒ ?°í¸ë²ˆí˜¸ */
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
    } else alert("?°í¸ë²ˆí˜¸ ?¤í¬ë¦½íŠ¸ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤‘ì…?ˆë‹¤.");
  };

  const handleSnsObjChange = (key: string, field: string, value: string) => {
    setSnsLinks(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("?´ë¦½ë³´ë“œ??ë³µì‚¬?˜ì—ˆ?µë‹ˆ??");
    } catch {
      alert("ë³µì‚¬???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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
      /* ?„ë¡œ???¬ì§„ */
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

      /* ë¶€?™ì‚° ?•ë³´ */
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

        // ë°˜ë ¤ ?íƒœ?ì„œ ?¬ì????????ë™?¼ë¡œ ?¹ì¸?€ê¸°ë¡œ ë³€ê²?(?„ì‹œ?€?¥ì´ ?„ë‹ ?Œë§Œ)
        let saveStatus = (!isTemp && agencyStatus === 'REJECTED') ? 'PENDING' : agencyStatus;

        // [AI ?œë¥˜ ?ë™ ê²€ì¦?
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
              saveStatus = "APPROVED"; // AIê°€ ê²€ì¦??µê³¼?œí‚¤ë©??ë™ ?¹ì¸
              setAgencyStatus("APPROVED");
              alert("?¤– AI ?œë¥˜ ê²€ì¦??„ë£Œ!\n?œë¥˜?€ ?•ë³´ê°€ ?¼ì¹˜?˜ì—¬ ?ë™?¼ë¡œ [?•ìƒ?¹ì¸] ì²˜ë¦¬?˜ì—ˆ?µë‹ˆ??");
            } else if (verifyResult.status === "NEEDS_REVIEW") {
              saveStatus = "PENDING";
              setAgencyStatus("PENDING");
              let diffMsg = "";
              if (verifyResult.diff && verifyResult.diff.found) {
                const isNameDiff = verifyResult.diff.expected?.companyName !== verifyResult.diff.found?.companyName;
                const isRepDiff = verifyResult.diff.expected?.representative !== verifyResult.diff.found?.representative;
                diffMsg = "[ë¶ˆì¼ì¹??´ì—­]\n";
                if (isNameDiff) diffMsg += `- ?í˜¸ëª?(?…ë ¥: ${verifyResult.diff.expected?.companyName} / ?œë¥˜: ${verifyResult.diff.found?.companyName})\n`;
                if (isRepDiff) diffMsg += `- ?€?œì (?…ë ¥: ${verifyResult.diff.expected?.representative} / ?œë¥˜: ${verifyResult.diff.found?.representative})\n`;
              }
              aiReason = "?¤– AI ?ë™ ê²€ì¦?ë³´ë¥˜: ?œë¥˜ ?´ìš© ë¶ˆì¼ì¹? " + diffMsg;
              alert("?¤– AI ê²€ì¦??ˆë‚´: ?œë¥˜?€ ?…ë ¥?˜ì‹  ?•ë³´ê°€ ?¼ë? ë¶ˆì¼ì¹˜í•˜??ê´€ë¦¬ì ?˜ë™ ê²€???¹ì¸?€ê¸?ë¡??˜ì–´ê°‘ë‹ˆ??\n\n" + diffMsg + "\n\n?œë¥˜???íŒ ?ìŠ¤?¸ì? ?„ë²½???¼ì¹˜?˜ê²Œ ?…ë ¥?˜ì‹œë©?ì¦‰ì‹œ ?ë™ ?¹ì¸?©ë‹ˆ??");
            } else if (verifyResult.status === "ERROR") {
              alert("?¤– AI ê²€ì¦??ëŸ¬: " + verifyResult.message + "\n(?„ì‹œë¡??¹ì¸?€ê¸?ì²˜ë¦¬?©ë‹ˆ??");
            }
          } catch (e) {
            console.error("AI Verify Error:", e);
            // ?ëŸ¬ ?˜ë©´ ê¸°ì¡´ì²˜ëŸ¼ PENDING?¼ë¡œ ì§„í–‰
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
          alert("??ë¶€?™ì‚°?Œì› ?„í™˜ ? ì²­???„ë£Œ?˜ì—ˆ?µë‹ˆ??\n\n?œë¥˜ ?•ì¸ ???¹ì¸ ì²˜ë¦¬?©ë‹ˆ??\n(ë³´í†µ ?¹ì¼~1?ì—…???Œìš”)");
          router.push("/m/admin/dashboard");
        } else {
          alert("?„ì‹œ?€?¥ë˜?ˆìŠµ?ˆë‹¤.");
        }
      } else if (!isTemp && agencyStatus === 'REJECTED') {
        setAgencyStatus('PENDING');
        setRejectReason(null);
        alert("???œë¥˜ê°€ ?¬ì œì¶œë˜?ˆìŠµ?ˆë‹¤!\n\nê´€ë¦¬ì ?¬ì‹¬?????¹ì¸ ì²˜ë¦¬?©ë‹ˆ??");
        router.push("/m/admin/dashboard");
      } else {
        alert(isTemp ? "?„ì‹œ?€?¥ë˜?ˆìŠµ?ˆë‹¤." : "?€?¥ë˜?ˆìŠµ?ˆë‹¤.");
        if (!isTemp) router.back();
      }
    } catch (err: any) {
      alert("?€???¤íŒ¨: " + err.message);
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (confirm("?•ë§ë¡??Œì›???ˆí‡´?˜ì‹œê² ìŠµ?ˆê¹Œ?\n?ˆí‡´ ??ëª¨ë“  ?Œì› ?•ë³´ê°€ ?Œê¸°?˜ë©° ë³µêµ¬?????†ìŠµ?ˆë‹¤.")) {
      alert("?Œì› ?ˆí‡´ ?”ì²­???•ìƒ?ìœ¼ë¡??‘ìˆ˜?˜ì—ˆ?µë‹ˆ??\n1~2?ì—…???´ì— ì²˜ë¦¬ ?„ë£Œ ???ˆë‚´ ?´ë©”?¼ì´ ë°œì†¡?©ë‹ˆ??");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/m");
    }
  };

  const statusLabel = agencyStatus === "APPROVED" ? "?•ìƒ?¹ì¸" : agencyStatus === "REJECTED" ? "?œë¥˜ë³´ì™„" : "?¹ì¸?€ê¸?;
  const statusColor = agencyStatus === "APPROVED" ? "#059669" : agencyStatus === "REJECTED" ? "#dc2626" : "#d97706";
  const statusBg = agencyStatus === "APPROVED" ? "#ecfdf5" : agencyStatus === "REJECTED" ? "#fef2f2" : "#fffbeb";

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>?™ï¸</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>?•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { width: "100%", height: 46, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ?¤ë” */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>?•ë³´?¤ì •</h1>
        </div>
        <button onClick={() => handleSave(true)} disabled={saving}
          style={{ height: 36, padding: "0 16px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {saving ? "?€?¥ì¤‘..." : "?„ì‹œ?€??}
        </button>
      </div>

      {/* ??*/}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        {[{ key: "basic" as const, label: "ê¸°ë³¸?•ë³´" }, { key: "agency" as const, label: "ë¶€?™ì‚°?•ë³´" }, { key: "marketing" as const, label: "ë§ˆì??…ì •ë³? }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: "14px 0", border: "none", background: "none", fontSize: 14, fontWeight: tab === t.key ? 800 : 500, color: tab === t.key ? "#2563eb" : "#6b7280", borderBottom: tab === t.key ? "3px solid #2563eb" : "3px solid transparent", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 40px" }}>
        {/* ?€?€ ê¸°ë³¸?•ë³´ ???€?€ */}
        {tab === "basic" && (
          <>
            {/* ?„ë¡œ???¬ì§„ */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
              <div style={{ position: "relative", marginBottom: 8 }}>
                {profilePreview ? (
                  <img src={profilePreview} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #e5e7eb" }} onClick={() => setPreviewImg(profilePreview)} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f3f4f6", border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#9ca3af" }}>?‘¤</div>
                )}
                <button onClick={() => profileRef.current?.click()}
                  style={{ position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: "50%", background: "#2563eb", color: "#fff", border: "2px solid #fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>?“·</button>
                <input ref={profileRef} type="file" accept="image/*" onChange={e => handlePhotoCapture(e, "profile")} style={{ display: "none" }} />
              </div>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>?°ì¹˜?˜ì—¬ ?„ë¡œ???¬ì§„ ë³€ê²?/span>
            </div>

            {/* ?¹ì¸ ?íƒœ */}
            {isRealtor && (
              <div style={{ background: statusBg, border: `1px solid ${statusColor}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{role === "REALTOR" || role === "ë¶€?™ì‚°?Œì›" ? "ë¶€?™ì‚°?Œì›" : "?¼ë°˜?Œì›"}</span>
              </div>
            )}

            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <Field label="?´ë©”?? value={email} readOnly />
              <Field label="?´ë¦„" value={name} onChange={setName} />
              <Field label="?°ë½ì²? value={phone} onChange={v => setPhone(formatPhone(v))} placeholder="010-0000-0000" />
            </div>
          </>
        )}

        {/* ?€?€ ë¶€?™ì‚°?•ë³´ ???€?€ */}
        {tab === "agency" && (
          <>
            {/* ?¹ì¸ ?íƒœ Step Indicator */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 12 }}>?“‹ ?¹ì¸ ì§„í–‰ ?íƒœ</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {/* Step 1: ?‘ì„± ì¤?*/}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", background: !isRealtor && agencyStatus !== "PENDING" && agencyStatus !== "APPROVED" && agencyStatus !== "REJECTED" ? "#3b82f6" : "#d1d5db" }}>1</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: !isRealtor && agencyStatus !== "PENDING" && agencyStatus !== "APPROVED" && agencyStatus !== "REJECTED" ? "#3b82f6" : "#9ca3af" }}>?‘ì„± ì¤?/div>
                </div>
                <div style={{ width: 40, height: 2, background: agencyStatus === "PENDING" || agencyStatus === "APPROVED" || agencyStatus === "REJECTED" ? "#3b82f6" : "#e5e7eb", flexShrink: 0 }} />
                {/* Step 2: ?¬ì‚¬ ?€ê¸?*/}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", background: agencyStatus === "PENDING" ? "#f59e0b" : agencyStatus === "APPROVED" ? "#d1d5db" : agencyStatus === "REJECTED" ? "#d1d5db" : "#d1d5db" }}>2</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: agencyStatus === "PENDING" ? "#f59e0b" : "#9ca3af" }}>?¬ì‚¬ ?€ê¸?/div>
                </div>
                <div style={{ width: 40, height: 2, background: agencyStatus === "APPROVED" || agencyStatus === "REJECTED" ? (agencyStatus === "APPROVED" ? "#10b981" : "#ef4444") : "#e5e7eb", flexShrink: 0 }} />
                {/* Step 3: ê²°ê³¼ */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", background: agencyStatus === "APPROVED" ? "#10b981" : agencyStatus === "REJECTED" ? "#ef4444" : "#d1d5db" }}>{agencyStatus === "APPROVED" ? "?? : agencyStatus === "REJECTED" ? "!" : "3"}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: agencyStatus === "APPROVED" ? "#10b981" : agencyStatus === "REJECTED" ? "#ef4444" : "#9ca3af" }}>{agencyStatus === "APPROVED" ? "?¹ì¸ ?„ë£Œ" : agencyStatus === "REJECTED" ? "?œë¥˜ ë³´ì™„" : "?¹ì¸ ?„ë£Œ"}</div>
                </div>
              </div>
            </div>

            {/* ë°˜ë ¤ ?¬ìœ  ?Œë¦¼ ë°•ìŠ¤ */}
            {agencyStatus === "REJECTED" && (
              <div style={{ background: "#fef2f2", borderRadius: 14, padding: 16, border: "1.5px solid #fecaca", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>?š¨</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#b91c1c" }}>?¬ì‚¬ ë°˜ë ¤ - ?œë¥˜ ë³´ì™„???„ìš”?©ë‹ˆ??/span>
                </div>
                {rejectReason && (
                  <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>?“Œ ë°˜ë ¤ ?¬ìœ </div>
                    <div style={{ fontSize: 13, color: "#991b1b", lineHeight: 1.5, fontWeight: 600, whiteSpace: "pre-wrap" }}>{rejectReason}</div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>?„ë˜ ?•ë³´ë¥??˜ì •?????˜ë‹¨??<strong>[?˜ì • ???¬ì‹¬??? ì²­]</strong> ë²„íŠ¼???ŒëŸ¬ì£¼ì„¸??</div>
              </div>
            )}

            {/* ?¹ì¸?€ê¸??ˆë‚´ */}
            {agencyStatus === "PENDING" && isRealtor && (
              <div style={{ background: "#fffbeb", borderRadius: 14, padding: "12px 16px", border: "1.5px solid #fde68a", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>??/span>
                <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.4 }}>
                  <strong>?œë¥˜ ê²€??ì¤‘ì…?ˆë‹¤.</strong> ê´€ë¦¬ì ?•ì¸ ???¹ì¸ ì²˜ë¦¬?©ë‹ˆ??
                </div>
              </div>
            )}

            {/* ?¹ì¸ ?„ë£Œ ?ˆë‚´ */}
            {agencyStatus === "APPROVED" && (
              <div style={{ background: "#ecfdf5", borderRadius: 14, padding: "12px 16px", border: "1.5px solid #a7f3d0", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>??/span>
                <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.4 }}>
                  <strong>?•ìƒ ?¹ì¸ ?„ë£Œ.</strong> ë¶€?™ì‚°?Œì› ?œë¹„?¤ë? ?•ìƒ?ìœ¼ë¡??´ìš©?????ˆìŠµ?ˆë‹¤.
                </div>
              </div>
            )}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <Field label="?í˜¸(?¬ì—…?¥ëª…)" value={agencyName} onChange={setAgencyName} required />
              <Field label="?€?œìëª? value={ceoName} onChange={setCeoName} required />
              <Field label="?€?œì ?°ë½ì²? value={cell} onChange={v => setCell(formatPhone(v))} placeholder="010-0000-0000" required />
              <Field label="?¬ë¬´???„í™”" value={officePhone} onChange={v => setOfficePhone(formatPhone(v))} required />
            </div>

            {/* ì£¼ì†Œ */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 10 }}>?“ ?¬ë¬´??ì£¼ì†Œ</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="text" value={zipcode} readOnly style={{ ...inputStyle, flex: "none", width: 100, background: "#f9fafb" }} placeholder="?°í¸ë²ˆí˜¸" />
                <button onClick={openPostcode} style={{ height: 46, padding: "0 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>ì£¼ì†Œ ê²€??/button>
              </div>
              <input type="text" value={address} readOnly style={{ ...inputStyle, marginBottom: 8, background: "#f9fafb" }} placeholder="ê¸°ë³¸ì£¼ì†Œ" />
              <input type="text" value={addressDetail} onChange={e => setAddressDetail(e.target.value)} style={inputStyle} placeholder="?ì„¸ì£¼ì†Œ ?…ë ¥" />
              {coords && <div style={{ fontSize: 11, color: "#10b981", marginTop: 6 }}>??ì¢Œí‘œ: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}
            </div>

            {/* ?Œê°œ */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 10 }}>?ï¸ ë¶€?™ì‚° ?Œê°œ</div>
              <textarea value={intro} onChange={e => setIntro(e.target.value)} maxLength={100}
                style={{ ...inputStyle, height: 80, padding: 14, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} placeholder="ë¶€?™ì‚° ?Œê°œ (100???´ë‚´)" />
              <div style={{ textAlign: "right", fontSize: 11, color: intro.length >= 100 ? "#ef4444" : "#9ca3af", marginTop: 4 }}>{intro.length}/100</div>
            </div>

            {/* ?±ë¡ë²ˆí˜¸ & ?¬ì—…?ë²ˆ??*/}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <Field label="ì¤‘ê°œ?±ë¡ë²ˆí˜¸" value={regNum} onChange={setRegNum} required />
              <Field label="?¬ì—…?ë“±ë¡ë²ˆ?? value={bizNum} onChange={v => setBizNum(formatBizNum(v))} placeholder="000-00-00000" required />
            </div>

            {/* ?œë¥˜ ?¬ì§„ */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 12 }}>?“„ ?œë¥˜ ì²¨ë?</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 }}>
                ì¹´ë©”?¼ë¡œ ì´¬ì˜?˜ê±°??ê°¤ëŸ¬ë¦¬ì—??? íƒ?´ì£¼?¸ìš”.
              </div>

              {/* ì¤‘ê°œ?±ë¡ì¦?*/}
              <DocUpload
                label="ì¤‘ê°œ?±ë¡ì¦?
                preview={regCertPreview}
                inputRef={regCertRef}
                onCapture={e => handlePhotoCapture(e, "reg")}
                onPreview={() => regCertPreview && setPreviewImg(regCertPreview)}
                onRemove={() => { setRegCertFile(null); setRegCertPreview(null); }}
              />

              {/* ?¬ì—…?ë“±ë¡ì¦ */}
              <DocUpload
                label="?¬ì—…?ë“±ë¡ì¦"
                preview={bizCertPreview}
                inputRef={bizCertRef}
                onCapture={e => handlePhotoCapture(e, "biz")}
                onPreview={() => bizCertPreview && setPreviewImg(bizCertPreview)}
                onRemove={() => { setBizCertFile(null); setBizCertPreview(null); }}
              />
            </div>
          </>
        )}

        {/* ?€?€ ë§ˆì??…ì •ë³????€?€ */}
        {tab === "marketing" && (
          <>
            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 10, fontSize: 13, color: "#64748b", lineHeight: 1.5, marginBottom: 16 }}>
              ?„ë˜ ë§ˆì?????ª©?€ ?í•˜?œëŠ” ë¶„ë§Œ ?…ë ¥?˜ëŠ” <strong style={{color: "#3b82f6"}}>? íƒ?¬í•­</strong>?…ë‹ˆ??<br/>
              <span style={{color: "#ef4444", fontSize: 12}}>???°ì¸¡??ë©”ëª¨?˜ì‹œ??ID/PW ?•ë³´??ê´€ë¦¬ì???¸ë??¸ì—ê²??¸ì¶œ?˜ì? ?Šìœ¼ë©? **?¤ì§ ë³¸ì¸ë§?* ?´ëŒ?????ˆë„ë¡??ˆì „?˜ê²Œ ë³´ê??©ë‹ˆ??</span>
            </div>

            {/* API ê´€ë¦?*/}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>?”‘ API Key ë©”ëª¨</div>
                <button onClick={handleAddApi} style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>+ ì¶”ê?</button>
              </div>
              
              {apiList.map((api, idx) => (
                <div key={idx} style={{ background: "#f9fafb", borderRadius: 10, padding: 14, border: "1px solid #e5e7eb", marginBottom: 12 }}>
                  <select value={api.provider} onChange={(e) => handleApiChange(idx, 'provider', e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "#fff" }}>
                    <option value="ì±—GPT">ì±—GPT</option>
                    <option value="?´ë¡œ??>?´ë¡œ??/option>
                    <option value="êµ¬ê?">êµ¬ê? (Gemini)</option>
                    <option value="ê¸°í?">ê¸°í? API</option>
                  </select>
                  <div style={{ display: "flex", position: "relative", marginBottom: 8 }}>
                    <input type="text" value={api.key_value} onChange={(e) => handleApiChange(idx, 'key_value', e.target.value)} style={{ ...inputStyle, paddingRight: 40 }} placeholder="API Key ?ëŠ” ì£¼ì†Œ" />
                    <button onClick={() => handleCopy(api.key_value)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4 }}>?“‹</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input type="text" value={api.login_id} onChange={(e) => handleApiChange(idx, 'login_id', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="ID" />
                    <input type="password" value={api.login_pw} onChange={(e) => handleApiChange(idx, 'login_pw', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="ë¹„ë?ë²ˆí˜¸" />
                  </div>
                  <button onClick={() => handleRemoveApi(idx)} style={{ width: "100%", height: 36, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>?? œ</button>
                </div>
              ))}
              {apiList.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "10px 0" }}>?±ë¡??API ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤.</div>}
            </div>

            {/* SNS ë§í¬ */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 16 }}>?”— ë§ˆì???ë°?SNS ë§í¬</div>
              {Object.keys(snsLabels).map((key) => {
                const sns = snsLinks[key] || initialSnsObj;
                return (
                  <div key={key} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>{snsLabels[key]}</div>
                    <div style={{ display: "flex", position: "relative", marginBottom: 8 }}>
                      <input type="text" value={sns.url} onChange={(e) => handleSnsObjChange(key, 'url', e.target.value)} style={{ ...inputStyle, paddingRight: 40 }} placeholder={`${snsLabels[key]} ì£¼ì†Œ(URL) ?…ë ¥`} />
                      <button onClick={() => handleCopy(sns.url)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4 }}>?“‹</button>
                    </div>
                    <select value={sns.login_type} onChange={(e) => handleSnsObjChange(key, 'login_type', e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "#f9fafb" }}>
                      <option value="?¼ë°˜">?¼ë°˜/ì§ì ‘ê°€??/option>
                      <option value="?¤ì´ë²?>?¤ì´ë²?ê°€??/option>
                      <option value="ì¹´ì¹´??>ì¹´ì¹´??ê°€??/option>
                      <option value="êµ¬ê?">êµ¬ê? ê°€??/option>
                      <option value="?¤ìŒ">?¤ìŒ(Daum)</option>
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" value={sns.login_id} onChange={(e) => handleSnsObjChange(key, 'login_id', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="ë¡œê·¸??ID (ë©”ëª¨)" />
                      <input type="password" value={sns.login_pw} onChange={(e) => handleSnsObjChange(key, 'login_pw', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="ë¹„ë?ë²ˆí˜¸ (ë©”ëª¨)" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ?€?€ ?˜ë‹¨ ë²„íŠ¼ ?ì—­ (?¤í¬ë¡??? ê³ ì •ë°??„ë‹˜) ?€?€ */}
        <div style={{ marginTop: 32, marginBottom: 16 }}>
          {tab === "agency" && (!isRealtor || agencyStatus === "REJECTED") ? (
            <button onClick={() => {
              if (!agencyName || !ceoName || !cell || !officePhone || !address || !intro || !bizNum || !regNum || (!bizCertPreview && !bizCertFile) || (!regCertPreview && !regCertFile)) {
                alert("?„ìˆ˜ ?•ë³´ë¥?ëª¨ë‘ ?…ë ¥?˜ê³  ?¬ì—…?ë“±ë¡ì¦ê³?ì¤‘ê°œ?¬ë¬´???±ë¡ì¦ì„ ì²¨ë??´ì•¼ ?¹ì¸ ? ì²­??ê°€?¥í•©?ˆë‹¤.");
                return;
              }
              if (confirm(agencyStatus === "REJECTED" ? "?˜ì •???•ë³´ë¡??¬ì‹¬?¬ë? ? ì²­?˜ì‹œê² ìŠµ?ˆê¹Œ?" : "ë¶€?™ì‚°?Œì› ?¹ì¸ ?¬ì‚¬ë¥?? ì²­?˜ì‹œê² ìŠµ?ˆê¹Œ?\n\n?œì¶œ ??ê´€ë¦¬ì ê²€? ê? ì§„í–‰?©ë‹ˆ??")) {
                handleSave(false);
              }
            }} disabled={saving}
              style={{ width: "100%", height: 56, borderRadius: 12, border: "none", background: agencyStatus === "REJECTED" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: agencyStatus === "REJECTED" ? "0 4px 12px rgba(245,158,11,0.3)" : "0 4px 12px rgba(59,130,246,0.3)" }}>
              {saving ? "ì²˜ë¦¬ ì¤?.." : agencyStatus === "REJECTED" ? "?“‹ ?˜ì • ???¬ì‹¬??? ì²­" : "?“‹ ?¹ì¸ ?¬ì‚¬ ? ì²­?˜ê¸°"}
            </button>
          ) : (
            <button onClick={() => handleSave(false)} disabled={saving}
              style={{ width: "100%", height: 56, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
              {saving ? "?€??ì¤?.." : "?’¾ ?•ë³´ ?˜ì • ?€??}
            </button>
          )}
        </div>

        {/* ?€?€ ?Œì› ?ˆí‡´ ë²„íŠ¼ ?€?€ */}
        <div style={{ paddingBottom: 24, textAlign: "center" }}>
          <button onClick={handleDeleteAccount}
            style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: "8px 16px" }}>
            ?Œì› ?ˆí‡´ (ê³„ì • ?? œ)
          </button>
        </div>
      </div>

      {/* ?´ë?ì§€ ?•ë? ëª¨ë‹¬ */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={previewImg} alt="" style={{ maxWidth: "100%", maxHeight: "80dvh", borderRadius: 8, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

/* ?€?€ ?¬ì‚¬???„ë“œ ì»´í¬?ŒíŠ¸ ?€?€ */
function Field({ label, value, onChange, placeholder, readOnly, required }: {
  label: string; value: string; onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
        {label}
        {required && !value && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>?„ìˆ˜</span>}
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

/* ?€?€ ?œë¥˜ ?…ë¡œ??ì»´í¬?ŒíŠ¸ ?€?€ */
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
              style={{ flex: 1, height: 36, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>?“· ?¤ì‹œ ì´¬ì˜</button>
            <button onClick={onRemove}
              style={{ height: 36, padding: "0 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>?? œ</button>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          style={{ width: "100%", padding: "20px 0", border: "2px dashed #d1d5db", borderRadius: 10, background: "#fafafa", cursor: "pointer", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>?“·</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>?°ì¹˜?˜ì—¬ ì´¬ì˜ ?ëŠ” ê°¤ëŸ¬ë¦¬ì—??? íƒ</div>
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
