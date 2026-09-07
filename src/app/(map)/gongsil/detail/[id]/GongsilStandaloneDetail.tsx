"use client";

import React, { useState, useEffect, useRef } from "react";
import GongsilDetailPanel from "../../GongsilDetailPanel";
import { getCleanAddrText, getPriceText } from "../../gongsilHelpers";
import { createClient } from "@/utils/supabase/client";

interface GongsilStandaloneDetailProps {
  initialVacancy: any;
  photos: any[];
  flyer: any;
  agencyInfo: any;
}

export default function GongsilStandaloneDetail({
  initialVacancy,
  photos,
  flyer,
  agencyInfo: initialAgencyInfo,
}: GongsilStandaloneDetailProps) {
  // Combine photos to ensure images array is complete
  const [vacancy, setVacancy] = useState(() => {
    const sortedPhotoUrls = (photos || [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p) => p.url)
      .filter(Boolean);

    const existingImages = initialVacancy.images || [];
    const mergedImages =
      sortedPhotoUrls.length > 0
        ? sortedPhotoUrls
        : existingImages.length > 0
        ? existingImages
        : [initialVacancy.photo_url || ""];

    return {
      ...initialVacancy,
      images: mergedImages,
      flyer,
    };
  });

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "info" | "realtor" | "auction_detail" | "auction_property" | "auction_bid" | "auction_market"
  >(() => {
    if (vacancy.onbid_id || vacancy.auction_id || vacancy.is_auction) {
      return "auction_detail";
    }
    return "info";
  });

  const [userLevel, setUserLevel] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement | null>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any>(null);

  const [agencyInfo, setAgencyInfo] = useState(initialAgencyInfo);
  const [realtorTradeType, setRealtorTradeType] = useState("전체");
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const itemMapRef = useRef<HTMLDivElement | null>(null);
  const roadviewRef = useRef<HTMLDivElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const isAuctionMode = Boolean(vacancy.onbid_id || vacancy.auction_id || vacancy.is_auction);

  // 1. Check Auth & User Level
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
        supabase
          .from("members")
          .select("role, plan_type, agencies(status)")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: member }) => {
            if (member) {
              let level = 1;
              if (member.role === "admin" || member.role === "superadmin") level = 4;
              else if (member.role === "realtor") level = 2;
              else if (member.plan_type === "pro") level = 3;
              setUserLevel(level);
            }
          });
      }
    });

    // Load wishlist from localStorage
    try {
      const savedWishlist = localStorage.getItem("gongsil_wishlist");
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 2. Load Kakao Maps SDK
  useEffect(() => {
    if ((window as any).kakao?.maps?.LatLng) {
      setMapLoaded(true);
      return;
    }

    const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if ((window as any).kakao?.maps) {
          (window as any).kakao.maps.load(() => setMapLoaded(true));
        }
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services,clusterer&autoload=false`;
    script.onload = () => {
      if ((window as any).kakao?.maps) {
        (window as any).kakao.maps.load(() => setMapLoaded(true));
      }
    };
    document.head.appendChild(script);
  }, []);

  // 3. Render Mini Map & Roadview when ready
  useEffect(() => {
    if (!mapLoaded || !(window as any).kakao?.maps) return;
    const kakao = (window as any).kakao;

    const lat = vacancy.lat || vacancy.latitude;
    const lng = vacancy.lng || vacancy.longitude;

    const renderMapAndRoadview = (pos: any) => {
      const exp = vacancy.address_exposure;
      const propType = vacancy.property_type || "";
      const subCategory = vacancy.sub_category || "";
      const isApt = ["아파트", "오피스텔", "도시형생활주택"].some((t) =>
        propType.includes(t) || subCategory.includes(t)
      );
      const isPrivateAddr = exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";
      const useCircle = isPrivateAddr && !isApt;

      if (itemMapRef.current) {
        itemMapRef.current.innerHTML = "";
        const map = new kakao.maps.Map(itemMapRef.current, {
          center: pos,
          level: useCircle ? 5 : 3,
        });

        if (useCircle) {
          map.setMinLevel(5);
          map.setMaxLevel(8);
          new kakao.maps.Circle({
            center: pos,
            radius: 500,
            strokeWeight: 2,
            strokeColor: "#3b82f6",
            strokeOpacity: 0.6,
            strokeStyle: "solid",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            map: map,
          });
        } else {
          new kakao.maps.Marker({ position: pos, map: map });
        }
      }

      if (roadviewRef.current) {
        roadviewRef.current.innerHTML = "";
        const rv = new kakao.maps.Roadview(roadviewRef.current);
        const rvClient = new kakao.maps.RoadviewClient();

        rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
          if (panoId) {
            rv.setPanoId(panoId, pos);
          } else if (roadviewRef.current) {
            roadviewRef.current.innerHTML =
              '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">해당 위치 근처의 로드뷰가 제공되지 않습니다.</div>';
          }
        });
      }
    };

    if (lat && lng) {
      const pos = new kakao.maps.LatLng(lat, lng);
      renderMapAndRoadview(pos);
    } else if (vacancy.address) {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(vacancy.address, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const pos = new kakao.maps.LatLng(result[0].y, result[0].x);
          renderMapAndRoadview(pos);
        }
      });
    }
  }, [mapLoaded, vacancy, activeDetailTab]);

  // Toast Timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Wishlist toggle
  const toggleWishlist = (id: any) => {
    setWishlist((prev) => {
      const isExist = prev.includes(id);
      const next = isExist ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("gongsil_wishlist", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      setToastMessage(isExist ? "관심 목록에서 제외되었습니다." : "관심 목록에 등록되었습니다.");
      return next;
    });
  };

  // Close handler: Close standalone tab, fallback to back/map if window.close is not allowed
  const handleClose = () => {
    try {
      window.close();
    } catch (e) {
      console.warn("window.close failed:", e);
    }
    setTimeout(() => {
      if (!window.closed) {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = `/gongsil?id=${vacancy.id}`;
        }
      }
    }, 300);
  };

  // Print handler
  const handlePrint = (prop: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      alert("팝업 차단을 해제해주세요.");
      return;
    }
    const addrText = getCleanAddrText(prop);
    const priceText = getPriceText(prop);
    const images = prop.images && prop.images.length > 0 ? prop.images : [];
    const imageHtml = images
      .slice(0, 4)
      .map(
        (img: string) =>
          `<img src="${img}" style="width:100%;height:180px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>공실광고 인쇄 - ${addrText}</title>
        <style>
          body { font-family: 'Pretendard', -apple-system, sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 20px; margin: 0; color: #2563eb; }
          .gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
          .price { font-size: 22px; font-weight: bold; color: #2563eb; margin-bottom: 16px; }
          .info-row { display: flex; border-bottom: 1px solid #eee; padding: 8px 0; font-size: 14px; }
          .info-label { width: 120px; color: #888; font-weight: 500; }
          .info-value { flex: 1; color: #222; }
          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>공실뉴스</h1>
          <span style="font-size:12px;color:#666;">부동산 중개망의 스마트한 변화</span>
        </div>
        <div class="gallery">${imageHtml}</div>
        <h2 style="font-size:18px;margin-bottom:8px;">${addrText}</h2>
        <div class="price">${priceText}</div>
        <div class="info-row"><div class="info-label">소재지</div><div class="info-value">${prop.address || "-"}</div></div>
        <div class="info-row"><div class="info-label">면적</div><div class="info-value">${prop.supply_m2 ? prop.supply_m2 + "㎡" : "-"} / ${prop.exclusive_m2 ? prop.exclusive_m2 + "㎡" : "-"}</div></div>
        <div class="info-row"><div class="info-label">해당층/총층</div><div class="info-value">${prop.current_floor || "-"} / ${prop.total_floor || "-"}</div></div>
        <div class="info-row"><div class="info-label">입주가능일</div><div class="info-value">${prop.move_in_date || "즉시입주"}</div></div>
        ${prop.description ? `<div class="info-row"><div class="info-label">상세설명</div><div class="info-value" style="white-space:pre-line;">${prop.description}</div></div>` : ""}
        <div class="footer">공실뉴스 | https://gongsilnews.com/gongsil?id=${prop.id} | 인쇄일: ${new Date().toLocaleDateString("ko-KR")}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 800);
  };

  // Kakao Share handler
  const handleKakaoShare = (prop: any) => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK가 준비되지 않았습니다.");
      return;
    }
    const addrText = getCleanAddrText(prop);
    const priceText = getPriceText(prop);
    const shareUrl = `https://gongsilnews.com/gongsil/detail/${prop.id}`;
    const imageUrl = prop.images?.[0] || "";

    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `${addrText} ${priceText}`,
        description: `${prop.property_type || "부동산"} · ${prop.exclusive_m2 || 0}㎡`,
        imageUrl: imageUrl,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: "공실 상세 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
    setShowShareDropdown(false);
  };

  // Copy URL
  const handleCopyUrl = (propId: any) => {
    const url = `${window.location.origin}/gongsil/detail/${propId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setToastMessage("상세보기 링크가 복사되었습니다."))
      .catch(() => {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setToastMessage("상세보기 링크가 복사되었습니다.");
      });
    setShowShareDropdown(false);
  };

  // Comment submission
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("vacancy_comments").insert({
        vacancy_id: vacancy.id,
        author_id: currentUser.id,
        content: newComment.trim(),
        is_secret: isSecret,
        parent_id: replyTarget ? replyTarget.id : null,
      }).select();

      if (error) throw error;
      if (data) {
        setComments((prev) => [...prev, ...data]);
        setNewComment("");
        setReplyTarget(null);
        setToastMessage("댓글이 등록되었습니다.");
      }
    } catch (e: any) {
      alert("댓글 등록 실패: " + e.message);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#ffffff",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <GongsilDetailPanel
        showDetail={true}
        activeProperty={vacancy.id}
        dbVacancies={[vacancy]}
        fullDetailsMap={{ [vacancy.id]: vacancy }}
        galleryIndex={galleryIndex}
        setGalleryIndex={setGalleryIndex}
        prevPropertyId={null}
        setPrevPropertyId={() => {}}
        setActiveProperty={() => {}}
        setShowDetail={() => {}}
        onBack={handleClose}
        activeDetailTab={activeDetailTab}
        setActiveDetailTab={setActiveDetailTab}
        userLevel={userLevel}
        handlePrint={handlePrint}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        showShareDropdown={showShareDropdown}
        setShowShareDropdown={setShowShareDropdown}
        shareDropdownRef={shareDropdownRef}
        handleKakaoShare={handleKakaoShare}
        handleCopyUrl={handleCopyUrl}
        itemMapRef={itemMapRef}
        roadviewRef={roadviewRef}
        comments={comments}
        currentUser={currentUser}
        newComment={newComment}
        setNewComment={setNewComment}
        isSecret={isSecret}
        setIsSecret={setIsSecret}
        replyTarget={replyTarget}
        setReplyTarget={setReplyTarget}
        handleCommentSubmit={handleCommentSubmit}
        agencyInfo={agencyInfo}
        realtorTradeType={realtorTradeType}
        setRealtorTradeType={setRealtorTradeType}
        openGalleryModal={() => setShowGalleryModal(true)}
        isAuctionMode={isAuctionMode}
        isStandalone={true}
      />

      {/* 갤러리 풀스크린 모달 */}
      {showGalleryModal && (
        <div
          onClick={() => setShowGalleryModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.92)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowGalleryModal(false);
            }}
            style={{
              position: "absolute",
              top: 20,
              right: 30,
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 45,
              cursor: "pointer",
              zIndex: 100000,
              lineHeight: 1,
            }}
          >
            ×
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "85%",
              maxHeight: "85%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={vacancy.images?.[galleryIndex] || ""}
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: 8,
              }}
              alt="확대 이미지"
            />

            {vacancy.images && vacancy.images.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))}
                  style={{
                    position: "absolute",
                    left: -50,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 44,
                    height: 44,
                    fontSize: 24,
                    cursor: "pointer",
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={() =>
                    setGalleryIndex(Math.min(vacancy.images.length - 1, galleryIndex + 1))
                  }
                  style={{
                    position: "absolute",
                    right: -50,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 44,
                    height: 44,
                    fontSize: 24,
                    cursor: "pointer",
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.9)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 99999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
