"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, getLectures, createLectureReview, enrollLecture, checkEnrollment } from "@/app/actions/lecture";
import { getPointBalance } from "@/app/actions/point";
import { createClient } from "@/utils/supabase/client";
import HomeHeader from "../_components/HomeHeader";

export default function MobileStudyReadClient({ initialLecture }: { initialLecture: any }) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("introduce");
  const [lecture, setLecture] = useState<any>(initialLecture);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimer = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const tabBarRef = useRef<HTMLDivElement>(null);
  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  /* ?Ä?Ä ?òÍ∞ï ?±Î°ù ?ÅÌÉú ?Ä?Ä */
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [pointBalance, setPointBalance] = useState(0);

  const toEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
    if (url.includes("youtube.com/embed")) return url + (url.includes("?") ? "&autoplay=1" : "?autoplay=1");
    return url;
  };

  /* ?Ä?Ä ?§ÌÅ¨Î°????ÑÏû¨ ?πÏÖò??ÎßûÍ≤å ???êÎèô ?úÏÑ±???Ä?Ä */
  useEffect(() => {
    const sectionIds = ["introduce", "curriculum", "review", "creator"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        });
      },
      { rootMargin: "-90px 0px -60% 0px", threshold: 0 }
    );
    const timer = setTimeout(() => {
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 500);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [lecture]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        const { data: member } = await supabase.from("members").select("name").eq("id", data.user.id).single();
        setUserName(member?.name || data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "?µÎ™Ö");
        const balRes = await getPointBalance(data.user.id);
        if (balRes.success) setPointBalance(balRes.balance);
      }
    });
  }, []);

  // ?òÍ∞ï ?±Î°ù ?¨Î? ?ïÏù∏
  useEffect(() => {
    if (!lecture?.id || !user?.id) return;
    checkEnrollment(lecture.id, user.id).then(res => {
      if (res.success) setIsEnrolled(res.enrolled);
    });
  }, [lecture?.id, user?.id]);

  const handleEnroll = async () => {
    if (!user) { alert("Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??"); return; }
    if (isEnrolled) { router.push(`/m/study_watch?id=${lecture.id}`); return; }
    // Í≤∞Ï†ú ???§ÏãúÍ∞??òÍ∞ï ?¨Î? ?¨Ìôï??(?¥Ï§ë Í≤∞Ï†ú Î∞©Ï?)
    const enrollCheck = await checkEnrollment(lecture.id, user.id);
    if (enrollCheck.success && enrollCheck.enrolled) {
      setIsEnrolled(true);
      router.push(`/m/study_watch?id=${lecture.id}`);
      return;
    }
    const dp = lecture.discount_price || lecture.price || 0;
    if (dp <= 0) {
      setEnrolling(true);
      const res = await enrollLecture(lecture.id, user.id);
      if (res.success) { setIsEnrolled(true); router.push(`/m/study_watch?id=${lecture.id}`); }
      else alert(res.error || "?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.");
      setEnrolling(false);
      return;
    }
    const balRes = await getPointBalance(user.id);
    if (balRes.success) setPointBalance(balRes.balance);
    setShowEnrollModal(true);
  };

  const confirmEnroll = async () => {
    if (!user || !lecture) return;
    setEnrolling(true);
    const res = await enrollLecture(lecture.id, user.id);
    if (res.success) {
      setIsEnrolled(true); setShowEnrollModal(false);
      if (res.balance !== undefined) setPointBalance(res.balance);
      alert("?òÍ∞ï ?±Î°ù ?ÑÎ£å!"); router.push(`/m/study_watch?id=${lecture.id}`);
    } else if (res.error === "insufficient_points") {
      alert(`?¨Ïù∏??Î∂ÄÏ°?\nÎ≥¥Ïú†: ${(res as any).balance?.toLocaleString()}P\n?ÑÏöî: ${(res as any).required?.toLocaleString()}P`);
    } else { alert(res.error || "?òÍ∞ï ?±Î°ù ?§Ìå®"); }
    setEnrolling(false);
  };

  useEffect(() => {
    if (!lecture && initialLecture) {
      setLecture(initialLecture);
    }
  }, [initialLecture]);

  const allImages: string[] = lecture
    ? [...(lecture.images || []), ...(lecture.thumbnail_url && !(lecture.images || []).includes(lecture.thumbnail_url) ? [lecture.thumbnail_url] : [])]
    : [];
  const slideImages = allImages.length > 0 ? allImages : (lecture?.thumbnail_url ? [lecture.thumbnail_url] : []);

  const startAutoSlide = useCallback(() => {
    if (slideTimer.current) clearInterval(slideTimer.current);
    if (slideImages.length <= 1) return;
    slideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 4000);
  }, [slideImages.length]);

  useEffect(() => {
    startAutoSlide();
    return () => { if (slideTimer.current) clearInterval(slideTimer.current); };
  }, [startAutoSlide]);

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleReviewSubmit = async () => {
    if (!newReview.trim()) return alert("Î¶¨Î∑∞ ?¥Ïö©???ÖÎ†•?¥Ï£º?∏Ïöî.");
    if (!lecture?.id || !user) return;
    setIsSubmitting(true);
    const res = await createLectureReview({ lecture_id: lecture.id, rating: newRating, content: newReview, user_id: user.id, user_name: userName });
    setIsSubmitting(false);
    if (res.success) {
      alert("Î¶¨Î∑∞Í∞Ä ?±Î°ù?òÏóà?µÎãà??");
      setNewReview(""); setNewRating(5);
      const d = await getLectureDetail(lecture.id);
      if (d.success && d.data) setLecture(d.data);
    } else { alert("?±Î°ù ?§Ìå®"); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#fff', height: '54px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '8px', marginLeft: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
          Î∂Ä?ôÏÇ∞?πÍ∞ï
        </div>
        <button onClick={() => router.push('/m/search')} style={{ background: 'none', border: 'none', padding: '8px', marginRight: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>
      <div style={{ flex: 1, backgroundColor: "#fff" }} />
    </div>
  );
  if (!lecture) return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#fff', height: '54px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '8px', marginLeft: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
          Î∂Ä?ôÏÇ∞?πÍ∞ï
        </div>
        <button onClick={() => router.push('/m/search')} style={{ background: 'none', border: 'none', padding: '8px', marginRight: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>
      <div style={{ textAlign: "center", padding: 80, color: "#999" }}>?ì≠ ?±Î°ù??Í∞ïÏùòÍ∞Ä ?ÜÏäµ?àÎã§.</div>
    </div>
  );

  const displayPrice = lecture.discount_price || lecture.price;
  const originalPrice = lecture.discount_price ? lecture.price : null;
  const monthlyPrice = displayPrice && lecture.duration_months ? Math.round(displayPrice / lecture.duration_months) : null;
  const chapters = lecture.chapters || [];
  const reviews = lecture.reviews || [];
  const totalLessons = chapters.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const tabs = [
    { id: "introduce", label: "?πÍ∞ï ?åÍ∞ú" },
    { id: "curriculum", label: "Ïª§Î¶¨?òÎüº" },
    { id: "review", label: `Î¶¨Î∑∞ ${reviews.length}` },
    { id: "creator", label: "?¨Î¶¨?êÏù¥?? },
  ];

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", paddingTop: 50, paddingBottom: 76 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: '#fff', height: '54px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '8px', marginLeft: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
          Î∂Ä?ôÏÇ∞?πÍ∞ï
        </div>
        <button onClick={() => router.push('/m/search')} style={{ background: 'none', border: 'none', padding: '8px', marginRight: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>

      {/* ?Ä?Ä 1. ?¥Î?ÏßÄ (ÎπÑÏú® ?†Ï? Ï∂ïÏÜå) ?Ä?Ä */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", overflow: "hidden", background: "#f0f0f0" }}>
        {slideImages.length > 0 ? (
          <>
            <div style={{ display: "flex", width: `${slideImages.length * 100}%`, height: "100%", transform: `translateX(-${currentSlide * (100 / slideImages.length)}%)`, transition: "transform 0.5s ease" }}>
              {slideImages.map((url: string, i: number) => (
                <div key={i} style={{ width: `${100 / slideImages.length}%`, height: "100%", flexShrink: 0 }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
            {slideImages.length > 1 && (
              <div style={{ position: "absolute", bottom: 10, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 12, padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
                {currentSlide + 1} / {slideImages.length}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#a8edea,#fed6e3)", fontSize: 28, fontWeight: 800 }}>{lecture.category || "?πÍ∞ï"}</div>
        )}
      </div>

      {/* ?Ä?Ä 2. ?§Î™Ö (?úÎ™©, Í∞ÄÍ≤? CTA) ?Ä?Ä */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13, fontWeight: 700, color: "#333" }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", overflow: "hidden", background: "#eee", display: "inline-block", flexShrink: 0 }}>
            {lecture.instructor_photo && <img src={lecture.instructor_photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </span>
          {lecture.instructor_name || "Í∞ïÏÇ¨"} ??
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.4, wordBreak: "keep-all" }}>{lecture.title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12 }}>
          <span style={{ color: "#f5a623" }}>‚≠?{lecture.rating || "5.0"}</span>
          <span style={{ color: "#ccc" }}>|</span>
          <span style={{ color: "#858a8d" }}>?ëç Ï∂îÏ≤ú ?πÍ∞ï</span>
        </div>
        {lecture.discount_label && <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>{lecture.discount_label}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {originalPrice && (
            <>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#ff3f3f" }}>{Math.round((1 - displayPrice / originalPrice) * 100)}%</span>
              <span style={{ fontSize: 14, color: "#aaa", textDecoration: "line-through" }}>{originalPrice.toLocaleString()}P</span>
            </>
          )}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>{displayPrice ? displayPrice.toLocaleString() + "P" : "Î¨¥Î£å"}</div>
        {monthlyPrice && <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 12 }}>??{monthlyPrice.toLocaleString()}P <span style={{ color: "#999", fontWeight: 500 }}>({lecture.duration_months}Í∞úÏõî)</span></div>}

        {/* CTA */}
        <button onClick={handleEnroll} disabled={enrolling} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: isEnrolled ? "#2563eb" : "#059669", color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          {enrolling ? "Ï≤òÎ¶¨ Ï§?.." : isEnrolled ? "???òÍ∞ï ?¥Ïñ¥?òÍ∏∞" : displayPrice ? `${displayPrice.toLocaleString()}P Í≤∞Ï†ú ???òÍ∞ï?òÍ∏∞` : "Î¨¥Î£å ?òÍ∞ï ?úÏûë?òÍ∏∞"}
        </button>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#555", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            {totalLessons}Í∞?Í∞ïÏùò {lecture.total_duration ? `(Ï¥?${lecture.total_duration})` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            ?òÏóÖ ?∏Ìä∏ Î∞?PDF ÍµêÏû¨ ?úÍ≥µ
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            ?¨Î¶¨?êÏù¥??Q&A Î∞??ºÎìúÎ∞?
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Í≤∞Ï†ú ??{lecture.duration_months || 5}Í∞úÏõî Î¨¥Ï†ú???òÍ∞ï
          </div>
        </div>
      </div>

      {/* ?Ä?Ä 3. Î¶¨Î∑∞ ÎØ∏Î¶¨Î≥¥Í∏∞ (3Í∞? ?Ä?Ä */}
      {reviews.length > 0 && (
        <div style={{ padding: "0 16px 16px", borderBottom: "6px solid #f5f5f5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
            {"‚≠ê‚≠ê‚≠ê‚≠ê‚≠?.split("").map((s, i) => <span key={i} style={{ fontSize: 16, color: i < Math.round(lecture.rating || 5) ? "#f5a623" : "#e0e0e0" }}>??/span>)}
            <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 4 }}>{reviews.length}Í±?/span>
          </div>
          {reviews.slice(0, 3).map((r: any, i: number) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid #f5f5f5" : "none", fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{r.user_name || "?òÍ∞ï??}</div>
              <div style={{ color: "#666", lineHeight: 1.6 }}>{r.content}</div>
            </div>
          ))}
          {reviews.length > 3 && (
            <button onClick={() => scrollToSection("review")} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#333", marginTop: 8 }}>
              Î¶¨Î∑∞ {reviews.length}Í∞??ÑÏ≤¥Î≥¥Í∏∞ ??
            </button>
          )}
        </div>
      )}

      {/* ?Ä?Ä 4. Î©îÎâ¥ ??∞î (Sticky) ?Ä?Ä */}
      <style>{`.sticky-tab-bar { position: -webkit-sticky; position: sticky; top: 50px; z-index: 40; background-color: #fff; border-bottom: 1px solid #f0f0f0; overflow-x: auto; -webkit-overflow-scrolling: touch; }`}</style>
      <div ref={tabBarRef} className="sticky-tab-bar">
        <div style={{ display: "flex", whiteSpace: "nowrap", minWidth: "100%" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => scrollToSection(tab.id)}
                style={{ flex: "1 0 auto", padding: "14px 16px", fontSize: 14, fontWeight: 700, color: isActive ? "#1a1a1a" : "#999", background: "none", border: "none", borderBottom: isActive ? "2px solid #1a1a1a" : "2px solid transparent", transition: "all 0.2s" }}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ?Ä?Ä ??ÏΩòÌÖêÏ∏??Ä?Ä */}
      <div style={{ padding: "0 16px" }}>

        {/* ?πÍ∞ï ?åÍ∞ú */}
        <div id="introduce" style={{ paddingTop: 24, paddingBottom: 24, borderBottom: "6px solid #f5f5f5" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16, lineHeight: 1.5 }}>???πÍ∞ï???£Í≥† ?òÎ©¥<br />?¥Îü∞ Í±??????àÍ≤å ??Í±∞Ïòà??/h2>
          <div style={{ position: "relative", maxHeight: expandedSections["introduce"] ? "none" : 280, overflow: "hidden", transition: "max-height 0.3s ease" }}>
            {lecture.description ? (
              <div style={{ fontSize: 14, lineHeight: 1.8, color: "#444", wordBreak: "keep-all" }} dangerouslySetInnerHTML={{ __html: lecture.description }} />
            ) : (
              <div style={{ fontSize: 14, color: "#999" }}>Í∞ïÏùò ?ÅÏÑ∏ ?åÍ∞úÍ∞Ä Ï§ÄÎπ?Ï§ëÏûÖ?àÎã§.</div>
            )}
            {!expandedSections["introduce"] && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #fff)" }} />
            )}
          </div>
          <button onClick={() => toggleSection("introduce")} style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #e8e8e8", background: "#fff", fontSize: 13, fontWeight: 600, color: "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 16, transform: expandedSections["introduce"] ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>??/span>
            {expandedSections["introduce"] ? "?®Í∏∞Í∏? : "?îÎ≥¥Í∏?}
          </button>
        </div>

        {/* Ïª§Î¶¨?òÎüº */}
        <div id="curriculum" style={{ paddingTop: 24, paddingBottom: 24, borderBottom: "6px solid #f5f5f5" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>Ïª§Î¶¨?òÎüº</h2>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Ï¥?{chapters.length}Í∞?Ï±ïÌÑ∞, {totalLessons}Í∞??∏Î? Í∞ïÏùò</div>
          <div style={{ position: "relative", maxHeight: expandedSections["curriculum"] ? "none" : 300, overflow: "hidden", transition: "max-height 0.3s ease" }}>
          {chapters.length > 0 ? chapters.map((ch: any, ci: number) => (
            <div key={ch.id || ci} style={{ marginBottom: 12, border: "1px solid #f0f0f0", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setExpandedChapters(prev => ({ ...prev, [ci]: !prev[ci] }))}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px", background: "#fafafa", border: "none", textAlign: "left" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: 4, marginRight: 8 }}>Ch.{ch.chapter_no}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{ch.title}</span>
                </div>
                <span style={{ fontSize: 18, color: "#999", transform: expandedChapters[ci] ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>??/span>
              </button>
              {expandedChapters[ci] && ch.lessons?.map((lesson: any, li: number) => {
                const hasVideo = !!lesson.video_url;
                const canPreview = lesson.is_preview && hasVideo;
                return (
                  <div key={li}
                    onClick={() => { if (canPreview) { setPreviewUrl(lesson.video_url); setPreviewTitle(`${ch.chapter_no}-${lesson.lesson_no}. ${lesson.title}`); } }}
                    style={{ padding: "12px 14px 12px 40px", borderTop: "1px solid #f5f5f5", fontSize: 13, color: canPreview ? "#1a1a1a" : "#555", display: "flex", alignItems: "center", gap: 8, cursor: canPreview ? "pointer" : "default" }}>
                    <span style={{ color: "#aaa", flexShrink: 0 }}>{lesson.lesson_no || li + 1}.</span>
                    <span style={{ fontWeight: canPreview ? 700 : 400 }}>{lesson.title}</span>
                    {lesson.is_preview && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: hasVideo ? "#fff" : "#059669", background: hasVideo ? "#059669" : "#ecfdf5", padding: "3px 7px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {hasVideo ? "??ÎØ∏Î¶¨Î≥¥Í∏∞" : "ÎØ∏Î¶¨Î≥¥Í∏∞"}
                      </span>
                    )}
                    {lesson.duration && <span style={{ marginLeft: "auto", fontSize: 12, color: "#bbb", flexShrink: 0 }}>{lesson.duration}</span>}
                  </div>
                );
              })}
            </div>
          )) : <div style={{ fontSize: 14, color: "#999" }}>Ïª§Î¶¨?òÎüº??Ï§ÄÎπ?Ï§ëÏûÖ?àÎã§.</div>}
            {!expandedSections["curriculum"] && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #fff)" }} />
            )}
          </div>
          <button onClick={() => toggleSection("curriculum")} style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 8, border: "1px solid #e8e8e8", background: "#fff", fontSize: 13, fontWeight: 600, color: "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <span style={{ fontSize: 16, transform: expandedSections["curriculum"] ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>??/span>
            {expandedSections["curriculum"] ? "?®Í∏∞Í∏? : "?îÎ≥¥Í∏?}
          </button>
        </div>

        {/* Î¶¨Î∑∞ ?ÑÏ≤¥ */}
        <div id="review" style={{ paddingTop: 24, paddingBottom: 24, borderBottom: "6px solid #f5f5f5" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>?òÍ∞ï??Î¶¨Î∑∞ {reviews.length}Í±?/h2>
          {visibleReviews.map((r: any, i: number) => (
            <div key={i} style={{ padding: "12px 0", borderTop: i > 0 ? "1px solid #f5f5f5" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{r.user_name || "?òÍ∞ï??}</span>
                <span style={{ fontSize: 12, color: "#f5a623" }}>{"??.repeat(r.rating || 5)}</span>
              </div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{r.content}</div>
            </div>
          ))}
          {reviews.length > 3 && !showAllReviews && (
            <button onClick={() => setShowAllReviews(true)} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
              ?ÑÏ≤¥ Î¶¨Î∑∞ {reviews.length}Í∞?Î≥¥Í∏∞
            </button>
          )}
          {showAllReviews && reviews.length > 3 && (
            <button onClick={() => setShowAllReviews(false)} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
              ?®Í∏∞Í∏?
            </button>
          )}
          {/* Î¶¨Î∑∞ ?ëÏÑ± */}
          {user && (
            <div style={{ marginTop: 20, padding: 16, background: "#fafafa", borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>?çÔ∏è {userName}?? Î¶¨Î∑∞Î•??®Í≤®Ï£ºÏÑ∏??/div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setNewRating(s)} style={{ fontSize: 22, background: "none", border: "none", color: s <= newRating ? "#f5a623" : "#ddd", padding: 0 }}>??/button>
                ))}
              </div>
              <textarea value={newReview} onChange={e => setNewReview(e.target.value)} placeholder="?òÍ∞ï ?ÑÍ∏∞Î•??ëÏÑ±?¥Ï£º?∏Ïöî..." style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #e0e0e0", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
              <button onClick={handleReviewSubmit} disabled={isSubmitting} style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 14, fontWeight: 700, opacity: isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? "?±Î°ù Ï§?.." : "Î¶¨Î∑∞ ?±Î°ù"}
              </button>
            </div>
          )}
        </div>

        <div id="creator" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>?¨Î¶¨?êÏù¥???åÍ∞ú</h2>
          <div>
            <div style={{ padding: 20, background: "#fafafa", borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", background: "#e4e4e4", flexShrink: 0 }}>
                  {lecture.instructor_photo ? <img src={lecture.instructor_photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#a8edea,#fed6e3)", fontSize: 24 }}>?ë®?çüè?/div>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#999", marginBottom: 2 }}>Í≥µÏã§?¥Ïä§ Í≥µÏù∏ ?¨Î¶¨?êÏù¥??/div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>{lecture.instructor_name || "Í∞ïÏÇ¨"}</div>
                </div>
              </div>
              {lecture.instructor_bio ? (
                <div style={{ fontSize: 13, lineHeight: 1.8, color: "#555" }} dangerouslySetInnerHTML={{ __html: lecture.instructor_bio.replace(/\n/g, "<br/>") }} />
              ) : (
                <div style={{ fontSize: 13, color: "#999" }}>Í∞ïÏÇ¨ ?åÍ∞úÍ∞Ä Ï§ÄÎπ?Ï§ëÏûÖ?àÎã§.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ?Ä?Ä ?ÅÏÉÅ ÎØ∏Î¶¨Î≥¥Í∏∞ Î™®Îã¨ ?Ä?Ä */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{previewTitle}</div>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", background: "#000" }}>
            {(() => { const embed = toEmbedUrl(previewUrl); return embed && embed.includes("youtube") ? (
              <iframe src={embed} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay; encrypted-media" allowFullScreen />
            ) : (
              <video src={previewUrl} controls autoPlay style={{ width: "100%", height: "100%" }} />
            ); })()}
          </div>
          <button onClick={() => setPreviewUrl(null)} style={{ marginTop: 16, padding: "10px 32px", borderRadius: 8, border: "none", background: "#fff", fontSize: 14, fontWeight: 700 }}>?´Í∏∞</button>
        </div>
      )}

      {/* ?Ä?Ä ?òÎã® Í≥†Ï†ï Í≤∞Ï†ú Î∞??Ä?Ä */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 448, background: "#fff", borderTop: "1px solid #eee", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))", zIndex: 50, boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => alert('Ï§ÄÎπÑÏ§ë?ÖÎãà??)} style={{ width: 46, height: 46, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <button onClick={handleEnroll} disabled={enrolling} style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: isEnrolled ? "#2563eb" : "#059669", color: "#fff", fontSize: 15, fontWeight: 700 }}>
            {enrolling ? "Ï≤òÎ¶¨ Ï§?.." : isEnrolled ? "???òÍ∞ï ?¥Ïñ¥?òÍ∏∞" : "?πÍ∞ï ?òÍ∞ï ?úÏûë?òÍ∏∞"}
          </button>
        </div>
      </div>

      {/* ?¨Ïù∏??Í≤∞Ï†ú Î™®Îã¨ */}
      {showEnrollModal && (
        <div onClick={() => setShowEnrollModal(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 20px", width: "100%", maxWidth: 380 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 16 }}>?πÍ∞ï ?òÍ∞ï ?†Ï≤≠</h3>
            <div style={{ background: "#f8f9fb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{lecture?.title}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#374151" }}>?òÍ∞ïÎ£?/span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{(lecture?.discount_price || lecture?.price || 0).toLocaleString()}P</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: 13, color: "#374151" }}>???¨Ïù∏??/span>
                <span style={{ fontSize: 15, fontWeight: 800, color: pointBalance >= (lecture?.discount_price || lecture?.price || 0) ? "#059669" : "#ef4444" }}>{pointBalance.toLocaleString()}P</span>
              </div>
              {pointBalance < (lecture?.discount_price || lecture?.price || 0) && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                  ?†Ô∏è ?¨Ïù∏?∏Í? {((lecture?.discount_price || lecture?.price || 0) - pointBalance).toLocaleString()}P Î∂ÄÏ°±Ìï©?àÎã§
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowEnrollModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", fontWeight: 700, fontSize: 14 }}>?´Í∏∞</button>
              <button onClick={confirmEnroll} disabled={enrolling || pointBalance < (lecture?.discount_price || lecture?.price || 0)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: pointBalance >= (lecture?.discount_price || lecture?.price || 0) ? "#059669" : "#d1d5db", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                {enrolling ? "Ï≤òÎ¶¨ Ï§?.." : "Í≤∞Ï†ú ???òÍ∞ï"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
