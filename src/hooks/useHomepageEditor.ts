"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getHomepageSettings,
  saveHomepageSettings,
  checkSubdomainAvailable,
  changeHomepageSubdomain,
  uploadHomepageFile,
} from "@/app/actions/homepage";
import {
  heroSlides,
  safeExt,
  shrinkToWebp,
  HERO_DEFAULTS,
  MAX_HERO_SLIDES,
  type HeroSlide,
} from "@/app/sites/[subdomain]/theme";
import { adminGetMemberDetail } from "@/app/admin/actions";
import { getVacanciesByOwnerId } from "@/app/actions/vacancy";
import { getMyArticles } from "@/app/actions/article";

/**
 * 홈페이지(물건접수장) 편집기의 속.
 *
 * 불러오기·저장·사진 업로드·슬라이드 다루기·주소 변경은 PC 편집기와 폰 편집기가
 * 똑같이 한다. 화면만 다르다. 두 벌로 짜두면 칸을 하나 늘릴 때마다 두 곳을 고쳐야
 * 하고, 한쪽은 반드시 낡는다. 그래서 속은 여기 한 군데에 둔다.
 */
export function useHomepageEditor(memberId: string) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [shareNotice, setShareNotice] = useState("");
  const [error, setError] = useState("");
  const [member, setMember] = useState<any>(null);
  const [agency, setAgency] = useState<any>(null);
  // 미리보기에도 실제 매물·기사를 넣는다. 빈 화면을 보고 "안 나온다"는 문의가 온다.
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);

  const [subdomain, setSubdomain] = useState("");
  const [initialSubdomain, setInitialSubdomain] = useState("");
  const [requestingAddress, setRequestingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [subStatus, setSubStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const subTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyIntro, setCompanyIntro] = useState("");

  const [intake, setIntake] = useState<Record<string, any>>({
    theme_color: "teal",
    brand_mode: "both",
    logo_size: "medium",
    // 첫 화면은 한 장으로 시작하고 필요하면 최대 세 장까지 늘린다. 빈 칸을 세 개
    // 세워두면 안 쓰는 칸까지 채워야 할 것처럼 보인다.
    // 기본 문구는 여기 적어만 두고 화면에서 되살리지 않는다 — 지우면 그대로 사라진다.
    hero_slides: [
      {
        title: HERO_DEFAULTS.title,
        highlight: HERO_DEFAULTS.highlight,
        desc: HERO_DEFAULTS.desc,
        cta: { type: "intake", label: HERO_DEFAULTS.cta },
      },
    ],
    cta_label: "",
    show_seeking: true,
    show_photos: true,
    show_budget: true,
    show_notes: true,
  });

  // ── 불러오기 ──
  useEffect(() => {
    (async () => {
      const res = await getHomepageSettings(memberId);
      if (res.success && res.data) {
        const d: any = res.data;
        setSubdomain(d.subdomain || "");
        setInitialSubdomain(d.subdomain || "");
        setIsActive(d.is_active !== false);
        setLogoUrl(d.logo_url || null);
        setSiteTitle(d.site_title || "");
        setContactPhone(d.contact_phone || "");
        setCompanyIntro(d.company_intro || "");
        if (d.intake) {
          // 슬라이드가 생기기 전에 저장한 중개사는 hero_image·hero_title 만 가지고 있다.
          // 그 값을 1번 칸으로 옮겨줘야 편집기에서 지금 쓰는 화면이 그대로 보인다.
          const filled = heroSlides(d.intake);
          setIntake((prev) => ({
            ...prev,
            ...d.intake,
            hero_slides: filled.length ? filled : prev.hero_slides,
          }));
        }
      }
      // 회사 정보는 [정보설정]의 부동산 등록 내용을 그대로 쓴다. 여기서 따로 입력받지 않는다.
      const md = await adminGetMemberDetail(memberId);
      if (md.success) {
        setMember((md as any).member || null);
        setAgency((md as any).agency || null);
        // 대표 전화를 아직 안 정했으면 부동산 정보의 번호를 기본값으로 쓴다
        const ag: any = (md as any).agency;
        if (ag) {
          setContactPhone((prev) => prev || ag.phone || ag.cell || "");
        }
      }

      const [vacRes, artRes] = await Promise.all([
        getVacanciesByOwnerId(memberId),
        getMyArticles(memberId),
      ]);
      if (vacRes.success && vacRes.data) setVacancies((vacRes.data as any[]).slice(0, 12));
      if (artRes.success && artRes.data) {
        setArticles((artRes.data as any[]).filter((a: any) => a.status === "APPROVED").slice(0, 4));
      }

      setLoading(false);
    })();
  }, [memberId]);

  // ── 서브도메인 중복 검사 (타이핑 멈추면) ──
  const onSubdomainChange = (v: string) => {
    const next = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(next);
    setAddressMessage("");
    if (subTimer.current) clearTimeout(subTimer.current);
    if (next === initialSubdomain) return setSubStatus("idle");
    if (!next) return setSubStatus("idle");
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(next) || next.length < 2 || next.length > 30) {
      return setSubStatus("invalid");
    }
    setSubStatus("checking");
    subTimer.current = setTimeout(async () => {
      const res = await checkSubdomainAvailable(next, memberId);
      setSubStatus(res.success && (res as any).available ? "ok" : "taken");
    }, 450);
  };

  const handleAddressChange = async () => {
    setError("");
    setAddressMessage("");
    if (subStatus !== "ok") return;
    setRequestingAddress(true);
    const res = await changeHomepageSubdomain(memberId, subdomain);
    setRequestingAddress(false);
    if (!res.success) return setError(res.error || "주소 변경에 실패했습니다.");
    setInitialSubdomain(subdomain);
    setSubStatus("idle");
    setAddressMessage("홈페이지 주소가 변경되었습니다.");
  };

  const onLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > 2 * 1024 * 1024) {
      setError("로고 파일은 2MB 이하만 업로드할 수 있습니다.");
      return;
    }
    // 로고는 작게 쓰이므로 512px 로 줄이되 화질은 높게 잡는다. SVG 는 원본 그대로 올린다.
    const shrunk = await shrinkToWebp(file, 512, 0.92);
    const ext = shrunk.type === "image/webp" ? "webp" : safeExt(file);
    const fd = new FormData();
    fd.append("file", shrunk);
    fd.append("path", `logo/${memberId}_${Date.now()}.${ext}`);
    const up = await uploadHomepageFile(fd);
    if (up.success) setLogoUrl((up as any).url);
    else setError((up as any).error || "로고 업로드에 실패했습니다.");
  };

  const slides: HeroSlide[] = Array.isArray(intake.hero_slides) && intake.hero_slides.length
    ? intake.hero_slides.slice(0, MAX_HERO_SLIDES)
    : [{}];

  const editSlides = (fn: (list: HeroSlide[]) => HeroSlide[]) => {
    setIntake((prev) => {
      const current: HeroSlide[] = Array.isArray(prev.hero_slides) && prev.hero_slides.length
        ? [...prev.hero_slides].slice(0, MAX_HERO_SLIDES)
        : [{}];
      return { ...prev, hero_slides: fn(current).slice(0, MAX_HERO_SLIDES) };
    });
  };

  const setSlide = (i: number, patch: Partial<HeroSlide>) => {
    editSlides((list) => {
      while (list.length <= i) list.push({});
      list[i] = { ...list[i], ...patch };
      return list;
    });
  };

  /** 버튼은 장 안에 들어있다. 장마다 다른 곳으로 보낼 수 있어야 한다 */
  const setCta = (i: number, patch: Partial<NonNullable<HeroSlide["cta"]>>) => {
    editSlides((list) => {
      while (list.length <= i) list.push({});
      list[i] = { ...list[i], cta: { ...(list[i].cta || {}), ...patch } };
      return list;
    });
  };

  const addSlide = () => editSlides((list) => [...list, { cta: { type: "intake", label: "" } }]);
  const removeSlide = (i: number) => editSlides((list) => list.filter((_, n) => n !== i));

  const onSlidePhoto = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    // 첫 화면은 화면을 가득 채우는 자리다. 폰으로 찍은 4~8MB 사진을 그대로 올리면
    // 방문자가 그걸 다 받고 나서야 문구가 보인다. 긴 변 1280px WebP 로 줄여 보낸다.
    const shrunk = await shrinkToWebp(file);
    const fd = new FormData();
    fd.append("file", shrunk);
    fd.append("path", `hero/${memberId}_${i}_${Date.now()}.webp`);
    const up = await uploadHomepageFile(fd);
    if (up.success) setSlide(i, { image: (up as any).url });
    else setError((up as any).error || "사진 업로드에 실패했습니다.");
  };

  const handleSave = async () => {
    setError("");
    if (!subdomain) return setError("주소(서브도메인)를 입력해 주세요.");
    if (subStatus === "taken") return setError("이미 사용 중인 주소입니다.");
    if (subStatus === "invalid") return setError("주소는 영문 소문자·숫자·하이픈으로 2~30자입니다.");

    setSaving(true);
    const res = await saveHomepageSettings(memberId, {
      subdomain,
      theme_name: "intake",
      logo_url: logoUrl,
      site_title: siteTitle,
      contact_phone: contactPhone,
      company_intro: companyIntro,
      is_active: isActive,
      intake,
    });
    setSaving(false);
    if (!res.success) return setError(res.error || "저장에 실패했습니다.");
    setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
  };

  const liveSubdomain = initialSubdomain || subdomain;
  const liveUrl = liveSubdomain ? `https://${liveSubdomain}.gongsilnews.com` : "";

  const handleShare = async () => {
    if (!liveUrl) return;
    setShareNotice("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: siteTitle || "물건접수장",
          text: `${siteTitle || "물건접수장"} 홈페이지`,
          url: liveUrl,
        });
        setShareNotice("공유 완료");
      } else {
        await navigator.clipboard.writeText(liveUrl);
        setShareNotice("주소 복사됨");
      }
      window.setTimeout(() => setShareNotice(""), 2000);
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(liveUrl);
        setShareNotice("주소 복사됨");
        window.setTimeout(() => setShareNotice(""), 2000);
      } catch {
        setError("공유하지 못했습니다. URL 바로가기를 길게 눌러 주소를 복사해 주세요.");
      }
    }
  };

  // 미리보기에 넘길 값. 저장 전에도 편집 중인 값이 그대로 보인다.
  const previewSettings = {
    site_title: siteTitle,
    logo_url: logoUrl,
    contact_phone: contactPhone,
    company_intro: companyIntro,
    intake,
  };

  return {
    loading,
    saving,
    savedAt,
    shareNotice,
    error,
    setError,
    member,
    agency,
    vacancies,
    articles,
    subdomain,
    initialSubdomain,
    onSubdomainChange,
    subStatus,
    requestingAddress,
    addressMessage,
    handleAddressChange,
    isActive,
    setIsActive,
    logoUrl,
    setLogoUrl,
    onLogoPick,
    siteTitle,
    setSiteTitle,
    contactPhone,
    setContactPhone,
    companyIntro,
    setCompanyIntro,
    intake,
    setIntake,
    slides,
    setSlide,
    setCta,
    addSlide,
    removeSlide,
    onSlidePhoto,
    handleSave,
    handleShare,
    previewSettings,
    liveSubdomain,
    liveUrl,
  };
}
