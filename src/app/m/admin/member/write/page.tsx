"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminGetMemberDetail, adminUpdateAgency, adminUpdateMember } from "@/app/admin/actions";
import { createClient } from "@/utils/supabase/client";

function MobileMemberWrite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [agency, setAgency] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "agency" | "marketing">("basic");
  
  // Photo viewer state
  const [fullImage, setFullImage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Check auth
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      if (!data || (data.role !== 'ADMIN' && data.role !== 'SUPER_ADMIN' && data.role !== '최고관리자')) {
        alert("접근 권한이 없습니다.");
        router.push("/m");
        return;
      }

      if (id) {
        const res = await adminGetMemberDetail(id);
        if (res.success) {
          setMember(res.member);
          setAgency(res.agency);
          if (res.member.role === 'REALTOR' || res.member.role === '부동산회원') {
            setActiveTab("agency"); // Default to agency info if realtor, as that's what usually needs approval
          }
        } else {
          alert("회원 정보를 불러오지 못했습니다.");
          router.back();
        }
      }
      setLoading(false);
    }
    init();
  }, [id, router]);

  const handleApprove = async (status: "APPROVED" | "REJECTED") => {
    if (!member || !agency) return;
    const isApprove = status === "APPROVED";
    if (!confirm(`이 회원을 ${isApprove ? '승인' : '반려'} 처리하시겠습니까?`)) return;

    setLoading(true);
    const res = await adminUpdateAgency(member.id, { status });
    if (res.success) {
      alert(`${isApprove ? '승인' : '반려'} 처리되었습니다.`);
      router.back();
    } else {
      alert("처리 중 오류가 발생했습니다: " + res.error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ color: "#9ca3af", fontWeight: 600 }}>불러오는 중...</div>
      </div>
    );
  }

  if (!member) return null;

  const roleMap: any = { 'ADMIN': '최고관리자', 'REALTOR': '부동산회원', 'USER': '일반회원' };
  const roleName = roleMap[member.role] || member.role || '일반회원';
  
  const isPending = agency?.status === "PENDING";
  const isRejected = agency?.status === "REJECTED";
  const isApproved = agency?.status === "APPROVED";

  const renderInfoRow = (label: string, value: string | React.ReactNode) => (
    <div style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ width: "100px", fontSize: "13px", color: "#6b7280", fontWeight: 600, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, fontSize: "14px", color: "#111827", fontWeight: 500, wordBreak: "break-all" }}>{value || "-"}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>회원 상세 및 처리</h1>
      </div>

      {/* Profile Header */}
      <div style={{ background: "#fff", padding: "24px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f3f4f6", overflow: "hidden", flexShrink: 0, border: "1px solid #e5e7eb" }}>
          {member.profile_image_url ? (
            <img src={member.profile_image_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#9ca3af" }}>
              {member.name?.[0] || "?"}
            </div>
          )}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{member.name || "이름없음"}</span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <select 
                value={member.role === 'ADMIN' ? 'ADMIN' : member.role === 'REALTOR' ? 'REALTOR' : 'USER'}
                onChange={async (e) => {
                  const newRole = e.target.value;
                  if (!confirm("해당 회원의 등급(권한)을 변경하시겠습니까?")) return;
                  setLoading(true);
                  const res = await adminUpdateMember(member.id, { role: newRole });
                  if (res.success) {
                    setMember({ ...member, role: newRole });
                    alert("회원 등급이 변경되었습니다.");
                  } else {
                    alert("변경 실패: " + res.error);
                  }
                  setLoading(false);
                }}
                style={{ 
                  fontSize: 11, fontWeight: 700, padding: "2px 14px 2px 6px", borderRadius: 4, 
                  background: member.role === 'REALTOR' ? "#dbeafe" : "#f3f4f6", 
                  color: member.role === 'REALTOR' ? "#1e40af" : "#4b5563",
                  border: "none", outline: "none", appearance: "none", cursor: "pointer"
                }}
              >
                <option value="USER">일반회원</option>
                <option value="REALTOR">부동산회원</option>
                <option value="ADMIN">최고관리자</option>
              </select>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", right: "4px", pointerEvents: "none", color: member.role === 'REALTOR' ? "#1e40af" : "#4b5563" }}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {member.role === 'REALTOR' && agency && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: isPending ? "#fef3c7" : isApproved ? "#d1fae5" : "#fee2e2", color: isPending ? "#92400e" : isApproved ? "#065f46" : "#b91c1c" }}>
                {isPending ? "승인대기" : isApproved ? "정상승인" : "서류보완"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{member.email}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <button onClick={() => setActiveTab("basic")} style={{ flex: 1, height: 48, background: "none", border: "none", borderBottom: activeTab === "basic" ? "2px solid #111" : "2px solid transparent", color: activeTab === "basic" ? "#111" : "#6b7280", fontSize: 14, fontWeight: activeTab === "basic" ? 800 : 600, cursor: "pointer" }}>기본 정보</button>
        {member.role === 'REALTOR' && (
          <button onClick={() => setActiveTab("agency")} style={{ flex: 1, height: 48, background: "none", border: "none", borderBottom: activeTab === "agency" ? "2px solid #111" : "2px solid transparent", color: activeTab === "agency" ? "#111" : "#6b7280", fontSize: 14, fontWeight: activeTab === "agency" ? 800 : 600, cursor: "pointer" }}>부동산/서류</button>
        )}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "16px" }}>
        {activeTab === "basic" && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            {renderInfoRow("회원번호", member.memberNumber ? `#${member.memberNumber}` : "-")}
            {renderInfoRow("연락처", member.phone)}
            {renderInfoRow("가입일", member.created_at ? new Date(member.created_at).toLocaleDateString() : "-")}
            {member.role === 'REALTOR' && (
              <>
                {renderInfoRow("요금제", member.plan_type === 'news_premium' ? '공실뉴스부동산' : member.plan_type === 'vacancy_premium' ? '공실등록부동산' : '무료부동산')}
                {renderInfoRow("최대 매물", `${member.max_vacancies || 5}개`)}
                {renderInfoRow("월 기사", `${member.max_articles_per_month || 0}개`)}
              </>
            )}
          </div>
        )}

        {activeTab === "agency" && agency && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 12px 0" }}>중개업소 정보</h3>
              {renderInfoRow("상호명", agency.name)}
              {renderInfoRow("대표자명", agency.ceo_name)}
              {renderInfoRow("휴대폰", agency.cell)}
              {renderInfoRow("사무실번호", agency.phone)}
              {renderInfoRow("주소", `[${agency.zipcode || '-'}] ${agency.address || ''} ${agency.address_detail || ''}`)}
              {renderInfoRow("등록번호", agency.reg_num)}
              {renderInfoRow("사업자번호", agency.biz_num)}
              {renderInfoRow("소개", agency.intro)}
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: "0 0 12px 0" }}>첨부 서류</h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "140px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>사업자등록증</div>
                  <div 
                    onClick={() => agency.biz_cert_url && setFullImage(agency.biz_cert_url)}
                    style={{ height: 120, background: "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e5e7eb", cursor: agency.biz_cert_url ? "pointer" : "default" }}
                  >
                    {agency.biz_cert_url ? (
                      <img src={agency.biz_cert_url} alt="사업자등록증" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>미등록</span>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: "140px" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>중개업등록증</div>
                  <div 
                    onClick={() => agency.reg_cert_url && setFullImage(agency.reg_cert_url)}
                    style={{ height: 120, background: "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e5e7eb", cursor: agency.reg_cert_url ? "pointer" : "default" }}
                  >
                    {agency.reg_cert_url ? (
                      <img src={agency.reg_cert_url} alt="중개업등록증" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>미등록</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>* 이미지를 탭하면 크게 볼 수 있습니다.</div>
            </div>
          </div>
        )}
      </div>

      {/* Full Image Viewer */}
      {fullImage && (
        <div 
          onClick={() => setFullImage(null)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <img src={fullImage} alt="Full Document" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
          <div style={{ position: "absolute", top: 20, right: 20, color: "#fff", background: "rgba(0,0,0,0.5)", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, cursor: "pointer" }}>&times;</div>
        </div>
      )}

      {/* Fixed Bottom Bar for Approval */}
      {member.role === 'REALTOR' && agency && isPending && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px 24px", display: "flex", gap: 12, zIndex: 100 }}>
          <button 
            onClick={() => handleApprove("REJECTED")}
            style={{ flex: 1, height: 48, background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            ❌ 서류보완 요청
          </button>
          <button 
            onClick={() => handleApprove("APPROVED")}
            style={{ flex: 1, height: 48, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            ✅ 승인 완료
          </button>
        </div>
      )}
    </div>
  );
}

export default function MobileMemberWritePage() {
  return (
    <Suspense fallback={null}>
      <MobileMemberWrite />
    </Suspense>
  );
}
