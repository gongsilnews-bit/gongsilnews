"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getArticles, getArticleDetail, incrementArticleView } from "@/app/actions/article";
import { getVacancyCountByKeyword, getVacancyListByKeyword } from "@/app/actions/vacancy";
import HomeHeader from "../_components/HomeHeader";
import AuthorProfileHeader from "../_components/AuthorProfileHeader";
import AuthModal from "@/components/AuthModal";
import { getPermissionLevel } from "@/utils/permissionCheck";
import { handleLocationPermissionDenied, handleLocationUnavailable } from "@/utils/locationPermission";

function formatPrice(v: any): string {
  const formatValue = (val: number) => {
    if (!val) return "";
    const m = Math.floor(val / 10000);
    if (m === 0) return "";
    const e = Math.floor(m / 10000);
    const r = m % 10000;
    let result = "";
    if (e > 0) result += `${e}억`;
    if (r > 0) {
      const c = Math.floor(r / 1000);
      const rem = r % 1000;
      let rest = "";
      if (c > 0) rest += `${c}천`;
      if (rem > 0) rest += `${rem}`;
      result += (result ? " " : "") + rest + "만";
    }
    return result;
  };

  if (v.trade_type === '매매') return formatValue(v.sale_price || 0);
  if (v.trade_type === '전세') return formatValue(v.deposit || 0);
  if (v.trade_type === '월세') {
    const depStr = formatValue(v.deposit || 0);
    const rentStr = formatValue(v.monthly_rent || 0);
    return `${depStr || '0'} / ${rentStr || '0'}`;
  }
  return '';
}

const SearchOverlay = dynamic(() => import("../_components/header/SearchOverlay"), { ssr: false });

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

const CATEGORIES = [
  { key: "news_gongsil", label: "공실뉴스", path: "/m/news_gongsil", section1: "공실뉴스" },
  { key: "news_politics", label: "부동산·경제", path: "/m/news_politics", section1: "부동산·경제" },
  { key: "news_marketing", label: "AI마케팅", path: "/m/news_marketing", section1: "AI마케팅" },
  { key: "news_etc", label: "라이프·오피니언", path: "/m/news_etc", section1: "라이프·오피니언" },
];

const KEY_TO_SECTION1: Record<string, string> = {
  "news_gongsil": "공실뉴스",
  "news_politics": "부동산·경제",
  "news_marketing": "AI마케팅",
  "news_etc": "라이프·오피니언"
};

const SECTION1_TO_KEY: Record<string, string> = {
  "공실뉴스": "news_gongsil",
  "부동산·경제": "news_politics",
  "AI마케팅": "news_marketing",
  "라이프·오피니언": "news_etc"
};

// PC와 동일한 2차 카테고리 맵
const SECTION2_MAP: Record<string, string[]> = {
  "공실뉴스": ["아파트/오피스텔", "빌라/주택", "원룸/투룸(풀옵션)", "상가/사무실/공장/토지", "신축/분양/경매"],
  "부동산·경제": ["부동산 정책/동향", "경제/재테크/주식", "법률/세무 지식"],
  "AI마케팅": ["AI/NEWS", "부동산유튜브/블로그", "공실/임대관리"],
  "라이프·오피니언": ["인물/인터뷰", "부동산/인테리어 꿀팁", "맛집/여행/건강", "자유 에세이"],
};

const SECTION2_ICONS: Record<string, React.ReactNode> = {
  "전체": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  "아파트/오피스텔": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 22V4c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v18"/><path d="M4 22h16"/><path d="M10 22v-4h4v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>,
  "빌라/주택": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  "원룸/투룸(풀옵션)": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  "상가/사무실/공장/토지": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m2 7 4.04-4.04c.73-.73 1.83-1.06 2.87-.84L12 3l3.09-.88c1.04-.22 2.14.11 2.87.84L22 7"/><path d="M2 7h20v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z"/><path d="M12 23V7"/><path d="M2 11h20"/></svg>,
  "신축/분양/경매": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 4-3 3M17 6l-3 3M14 9l-9 9a2 2 0 0 0 2.8 2.8l9-9"/><circle cx="16" cy="5" r="2.5"/></svg>,
  "부동산 정책/동향": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>,
  "경제/재테크/주식": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  "법률/세무 지식": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20"/><path d="M4 14l3-6 3 6"/><path d="M4 14h6"/><path d="M14 14l3-6 3 6"/><path d="M14 14h6"/><path d="M12 8h9"/><path d="M3 8h9"/><path d="M8 22h8"/></svg>,
  "AI/NEWS": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M9 15h6"/></svg>,
  "부동산유튜브/블로그": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>,
  "공실/임대관리": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>,
  "인물/인터뷰": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>,
  "부동산/인테리어 꿀팁": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
  "맛집/여행/건강": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>,
  "자유 에세이": <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
};

const SECTION2_ICONS_FILLED: Record<string, React.ReactNode> = {
  "전체": <svg width="28" height="28" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor"/></svg>,
  "아파트/오피스텔": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M6 2h12a2 2 0 012 2v18H4V4a2 2 0 012-2z" fill="currentColor"/><rect x="10" y="18" width="4" height="4" rx=".5" fill="white"/><rect x="7" y="5" width="2.5" height="2" rx=".5" fill="white"/><rect x="14.5" y="5" width="2.5" height="2" rx=".5" fill="white"/><rect x="7" y="9" width="2.5" height="2" rx=".5" fill="white"/><rect x="14.5" y="9" width="2.5" height="2" rx=".5" fill="white"/><rect x="7" y="13" width="2.5" height="2" rx=".5" fill="white"/><rect x="14.5" y="13" width="2.5" height="2" rx=".5" fill="white"/></svg>,
  "빌라/주택": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2.5L2 10.5V22h20V10.5L12 2.5z" fill="currentColor"/><rect x="9" y="13" width="6" height="9" rx="1" fill="white"/></svg>,
  "원룸/투룸(풀옵션)": <svg width="28" height="28" viewBox="0 0 24 24"><rect x="1" y="3" width="3" height="18" rx="1.5" fill="currentColor"/><path d="M4 8h16a2 2 0 012 2v11H4V8z" fill="currentColor"/><rect x="4" y="16.5" width="18" height="1.5" fill="white"/></svg>,
  "상가/사무실/공장/토지": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M2 7h20v14a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" fill="currentColor"/><path d="M6 3.5c.5-.6 1.3-.8 2-.6L12 4l4-1.1c.7-.2 1.5 0 2 .6L22 7H2l4-3.5z" fill="currentColor"/><line x1="12" y1="7" x2="12" y2="23" stroke="white" strokeWidth="1.5"/><line x1="2" y1="11" x2="22" y2="11" stroke="white" strokeWidth="1.5"/></svg>,
  "신축/분양/경매": <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="16" cy="5" r="3" fill="currentColor"/><path d="M14 9L5 18a2 2 0 002.8 2.8l9-9L14 9z" fill="currentColor"/><path d="M15 4l-3 3M17 6l-3 3" stroke="white" strokeWidth="1.2"/></svg>,
  "부동산 정책/동향": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" fill="currentColor"/><path d="M14 2v6h6" fill="white" opacity=".3"/><rect x="8" y="12" width="8" height="1.5" rx=".5" fill="white"/><rect x="8" y="16" width="6" height="1.5" rx=".5" fill="white"/></svg>,
  "경제/재테크/주식": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 3h2v16h16v2H3V3z" fill="currentColor"/><path d="M7 14l3-3 4 4 5-5v8H7v-4z" fill="currentColor" opacity=".3"/><path d="M7 14l3-3 4 4 5-5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "법률/세무 지식": <svg width="28" height="28" viewBox="0 0 24 24"><rect x="11" y="2" width="2" height="18" rx="1" fill="currentColor"/><rect x="7" y="20" width="10" height="2.5" rx="1" fill="currentColor"/><rect x="3" y="7" width="18" height="2" rx="1" fill="currentColor"/><path d="M4 14h6L7 9 4 14z" fill="currentColor"/><path d="M14 14h6l-3-5-3 5z" fill="currentColor"/></svg>,
  "AI/NEWS": <svg width="28" height="28" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="3" fill="currentColor"/><circle cx="9" cy="10" r="1.5" fill="white"/><circle cx="15" cy="10" r="1.5" fill="white"/><rect x="8" y="14" width="8" height="2" rx="1" fill="white"/></svg>,
  "부동산유튜브/블로그": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.33 29 29 0 00-.46-5.33z" fill="currentColor"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48" fill="white"/></svg>,
  "공실/임대관리": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 10-4-4L2 18z" fill="currentColor"/><circle cx="16.5" cy="7.5" r="1.5" fill="white"/></svg>,
  "인물/인터뷰": <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5" fill="currentColor"/><path d="M4 21a8 8 0 0116 0H4z" fill="currentColor"/></svg>,
  "부동산/인테리어 꿀팁": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2a6 6 0 00-6 6c0 1.23.23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8a6 6 0 00-6-6z" fill="currentColor"/><rect x="9" y="16" width="6" height="2" rx="1" fill="currentColor"/><rect x="10" y="20" width="4" height="2" rx="1" fill="currentColor"/></svg>,
  "맛집/여행/건강": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 2c0-.6.4-1 1-1s1 .4 1 1v7a2 2 0 01-2 2v10c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V11a2 2 0 01-2-2V2c0-.6.4-1 1-1s1 .4 1 1v7c.6 0 1-.4 1-1V2c0-.6.4-1 1-1s1 .4 1 1v6c0 1.7-1.3 3-3 3v10c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1V11c-1.7 0-3-1.3-3-3V2c0-.6.4-1 1-1z" fill="currentColor" transform="translate(1,0)"/><path d="M20 2c0-.6.4-1 1-1s1 .4 1 1v13h1c1.1 0 2-.9 2-2V7a5 5 0 00-5-5v13h0v6c0 .6-.4 1-1 1s-1-.4-1-1V2z" fill="currentColor" transform="translate(-2,0)"/></svg>,
  "자유 에세이": <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z" fill="currentColor"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" fill="currentColor"/><circle cx="11" cy="11" r="2" fill="white"/></svg>,
};

const PERSONALIZED_MENTAL_MAP: Record<string, Record<string, string>> = {
  "news_gongsil": {
    "전체": "실시간 중개용 공실 소식",
    "아파트/오피스텔": "공동중개 추천 아파트·오피스텔",
    "빌라/주택": "계약 확률 높은 빌라·주택 매물",
    "원룸/투룸(풀옵션)": "원룸·투룸 실무 트렌드",
    "상가/사무실/공장/토지": "고수익 상가·사무실 실무 정보",
    "신축/분양/경매": "단기 차익 신축·분양·경매 뉴스"
  },
  "news_politics": {
    "전체": "고객 브리핑용 오늘의 시장 동향",
    "부동산 정책/동향": "상담 필수 정책 분석 & 규제 동향",
    "경제/재테크/주식": "거시경제·재테크 바이블",
    "법률/세무 지식": "고객이 묻기 전에 대비하는 세무·법률 솔루션"
  },
  "news_marketing": {
    "전체": "매물 문의 폭발하는 마케팅 비법",
    "AI/NEWS": "업무 시간을 절반으로 줄여줄 AI 활용법",
    "부동산유튜브/블로그": "지역 1등 중개업소 블로그·유튜브 공략법",
    "공실/임대관리": "효율적인 공실·임대관리 노하우"
  },
  "news_etc": {
    "전체": "일의 보람과 성공을 더해줄 스토리",
    "인물/인터뷰": "억대 연봉 중개사들의 실전 성공 인터뷰",
    "부동산/인테리어 꿀팁": "실전 공간/인테리어 노하우",
    "맛집/여행/건강": "현장 활동이 많은 대표님 전용 건강 바이블",
    "자유 에세이": "일상의 쉼표, 감성 에세이"
  }
};

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - dt.getTime()) / 3600000);
  if (diff < 1) return "방금 전";
  if (diff < 24) return `${diff}시간 전`;
  const days = Math.floor(diff / 24);
  if (days < 7) return `${days}일 전`;
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

function formatDateFull(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const hour = d.getHours();
  const ampm = hour >= 12 ? "오후" : "오전";
  const h12 = hour > 12 ? hour - 12 : hour || 12;
  return `입력 ${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}. ${ampm} ${h12}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const stripHtml = (html: string) => html ? html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() : "";

const extractYoutubeId = (url?: string, html?: string): string | null => {
  const rx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
  if (url) {
    const m = url.match(rx);
    if (m) return m[1];
  }
  if (html) {
    const m = html.match(rx);
    if (m) return m[1];
  }
  return null;
};

interface RecommendedNewsCarouselProps {
  importantArticles: any[];
  currentCatLabel: string;
  activeTab: string;
  extractYoutubeId: (url?: string, html?: string) => string | null;
}

const RecommendedNewsCarousel = React.memo(({ 
  importantArticles, 
  currentCatLabel, 
  activeTab,
  extractYoutubeId 
}: RecommendedNewsCarouselProps) => {
  const [recIndex, setRecIndex] = useState(0);

  // Reset index when articles set changes
  React.useEffect(() => {
    setRecIndex(0);
  }, [importantArticles]);

  // Premium lightweight auto-rotation
  React.useEffect(() => {
    if (importantArticles.length <= 1) return;
    const timer = setInterval(() => {
      setRecIndex((prev) => (prev + 1) % importantArticles.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [importantArticles.length]);

  const a = importantArticles[recIndex];
  if (!a) return null;

  return (
    <div style={{ padding: "20px 16px", borderBottom: "8px solid #f4f6f8" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#508bf5" }}>{currentCatLabel}</span>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#1f2937", marginLeft: "5px" }}>추천 뉴스</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 700, fontFamily: "monospace" }}>
            {recIndex + 1} / {importantArticles.length}
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button 
              onClick={() => setRecIndex((prev) => (prev === 0 ? importantArticles.length - 1 : prev - 1))}
              style={{ 
                background: "#f3f4f6", 
                border: "none", 
                borderRadius: "4px", 
                width: "24px", 
                height: "24px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                cursor: "pointer",
                color: "#4b5563"
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button 
              onClick={() => setRecIndex((prev) => (prev === importantArticles.length - 1 ? 0 : prev + 1))}
              style={{ 
                background: "#f3f4f6", 
                border: "none", 
                borderRadius: "4px", 
                width: "24px", 
                height: "24px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                cursor: "pointer",
                color: "#4b5563"
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <Link
        href={`/m/news/${a.article_no || a.id}`}
        onClick={() => sessionStorage.setItem(`news_scroll_${activeTab}`, window.scrollY.toString())}
        style={{
          textDecoration: "none",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        <div style={{ width: "100%", aspectRatio: "16/9", position: "relative", backgroundColor: "#f3f4f6", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {(a.thumbnail_url || extractYoutubeId(a.youtube_url, a.content)) ? (
            <Image
              src={a.thumbnail_url || `https://img.youtube.com/vi/${extractYoutubeId(a.youtube_url, a.content)}/mqdefault.jpg`}
              alt={a.title}
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", background: "#f8f9fa", border: "1px solid #eaeaea" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
          )}
        </div>
        <div style={{ padding: "4px 4px 0" }}>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", lineHeight: 1.4, marginBottom: "6px", wordBreak: "keep-all" }}>
            {a.title}
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5, wordBreak: "keep-all" }}>
            {a.content ? a.content.replace(/<[^>]*>/g, '').substring(0, 100) : ""}
          </div>
        </div>
      </Link>
    </div>
  );
});
RecommendedNewsCarousel.displayName = "RecommendedNewsCarousel";

const ArticleRow = React.memo(({ a, activeTab, formatDate, stripHtml, extractYoutubeId }: any) => {
  return (
    <Link
      href={`/m/news/${a.article_no || a.id}`}
      className="article-row"
      onClick={() => sessionStorage.setItem(`news_scroll_${activeTab}`, window.scrollY.toString())}
      style={{
        display: "flex",
        gap: "14px",
        padding: "16px",
        borderBottom: "1px solid #f0f0f0",
        cursor: "pointer",
        background: "#fff",
        transition: "background 0.15s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* 왼쪽 썸네일 (존재할 경우) */}
      {(a.thumbnail_url || extractYoutubeId(a.youtube_url, a.content)) && (
        <div style={{ flexShrink: 0, width: "130px", height: "88px", borderRadius: "6px", overflow: "hidden", backgroundColor: "#f3f4f6", position: "relative" }}>
          <Image
            src={a.thumbnail_url || `https://img.youtube.com/vi/${extractYoutubeId(a.youtube_url, a.content)}/mqdefault.jpg`}
            alt={a.title}
            fill
            style={{ objectFit: "cover" }}
            sizes="130px"
          />
        </div>
      )}

      {/* 오른쪽 텍스트 컨텐츠 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, justifyContent: "center" }}>
        <div style={{ fontSize: "13px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "6px" }}>
          <span style={{ color: "#508bf5", fontWeight: 700 }}>{a.section2 || "뉴스"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#666", fontWeight: 500 }}>
              {formatDate(a.published_at || a.created_at)} · {a.author_name || "공실뉴스"}
            </span>
            {a.location_name && <span style={{ color: "#666", fontWeight: 500 }}>📍{a.location_name}</span>}
          </div>
        </div>
        <div style={{ fontSize: "16px", fontWeight: 800, color: "#111", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", marginBottom: "4px", lineHeight: 1.4 }}>
          {a.title}
        </div>
        <div style={{ fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
          {a.subtitle || stripHtml(a.content || "").slice(0, 80)}
        </div>
      </div>
    </Link>
  );
});
ArticleRow.displayName = "ArticleRow";

function MobileNewsClient({ initialTab, initialArticles, initialAuthorName, initialKeyword, authorProfile }: { initialTab: string, initialArticles: any[], initialAuthorName?: string, initialKeyword?: string, authorProfile?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [articles, setArticles] = useState<any[]>(initialArticles);
  const [localArticles, setLocalArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [section2Tab, setSection2Tab] = useState<string>(searchParams.get("section2") || "");
  // Compute importantArticles at top level to maintain clean state
  const filteredBySection2 = useMemo(() => {
    return section2Tab
      ? articles.filter(a => a.section2 === section2Tab)
      : articles;
  }, [articles, section2Tab]);

  const importantArticles = useMemo(() => {
    return filteredBySection2.filter(a => a.is_important);
  }, [filteredBySection2]);

  // URL 파라미터가 변경되면 상태 동기화 (뒤로가기 시 복구용)
  useEffect(() => {
    setSection2Tab(searchParams.get("section2") || "");
  }, [searchParams]);

  // 2차 탭 클릭 시 상태 변경 및 URL 업데이트 (history에 저장되어 뒤로가기 시 복구 가능)
  const handleSection2Click = (sub: string) => {
    setSection2Tab(sub);
    const params = new URLSearchParams(searchParams.toString());
    if (sub) {
      params.set("section2", sub);
    } else {
      params.delete("section2");
    }
    // 스크롤 위치를 유지하며 URL만 조용히 변경
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_VACANCY_OVERLAY') {
        window.history.back(); // Trigger popstate
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (selectedVacancyId) {
      window.history.pushState({ ...window.history.state, panel: 'vacancy-overlay' }, '', window.location.href);
    }
  }, [selectedVacancyId]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (selectedVacancyId && e.state?.panel !== 'vacancy-overlay') {
        setSelectedVacancyId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVacancyId]);

  // 기사 상세 보기 상태 (우리동네뉴스 슬라이딩 패널용)
  const [showDetail, setShowDetail] = useState(false);
  const [showListPanel, setShowListPanel] = useState(false);
  const [listPanelArticles, setListPanelArticles] = useState<any[]>([]);
  const [articleDetail, setArticleDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 기사 상세 패널 뒤로가기 처리 (showDetail 선언 이후에 배치)
  // 기사 상세/리스트 패널 뒤로가기 처리
  useEffect(() => {
    const handleDetailPopState = (e: PopStateEvent) => {
      const searchParams = new URLSearchParams(window.location.search);
      const panel = searchParams.get('panel');
      if (panel === 'article-detail') {
        setShowDetail(true);
        setShowListPanel(true);
      } else if (panel === 'list-panel') {
        setShowDetail(false);
        setShowListPanel(true);
      } else {
        setShowDetail(false);
        setShowListPanel(false);
      }
    };
    window.addEventListener('popstate', handleDetailPopState);
    return () => window.removeEventListener('popstate', handleDetailPopState);
  }, []);

  // 애니메이션 오버레이 상태는 완전히 제거됨 (즉각적인 화면 전환을 위해)
  // URL의 탭이 변경되면 activeTab 상태를 동기화 (구버전 파라미터 로직 제거)
  useEffect(() => {
    if (initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [visibleArticles, setVisibleArticles] = useState<any[]>(initialArticles || []);
  const [vacancyCount, setVacancyCount] = useState<number>(0);
  const [vacancyList, setVacancyList] = useState<any[]>([]);
  const [searchTab, setSearchTab] = useState<'article' | 'vacancy'>('article');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [clusterMode, setClusterMode] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberName, setMemberName] = useState<string>("부동산");
  const [userLevel, setUserLevel] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    async function initUser() {
      const { createClient } = await import("@/utils/supabase/client");
      const client = createClient();
      const { data } = await client.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
        const { data: memberData } = await client.from('members')
          .select('name, role, plan_type').eq('id', data.user.id).single();
        if (memberData) {
          setUserLevel(getPermissionLevel(memberData));
          if (memberData.name) {
            setMemberName(memberData.name);
          } else if (data.user.user_metadata?.full_name) {
            setMemberName(data.user.user_metadata.full_name);
          }
        } else {
          setUserLevel(1);
          if (data.user.user_metadata?.full_name) {
            setMemberName(data.user.user_metadata.full_name);
          }
        }
      }
    }
    initUser();
  }, []);

  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const clusterModeRef = useRef(false);
  const suppressIdleRef = useRef(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  // ── 우리동네뉴스 위치 필터 상태 ──
  const [locActivePanel, setLocActivePanel] = useState<string | null>(null);
  const [locLabel, setLocLabel] = useState("위치");
  const [sidoList, setSidoList] = useState<any[]>([]);
  const [gugunList, setGugunList] = useState<any[]>([]);
  const [dongList, setDongList] = useState<any[]>([]);
  const [selSido, setSelSido] = useState("");
  const [selGugun, setSelGugun] = useState("");
  const [selSidoCode, setSelSidoCode] = useState("");
  const [selGugunCode, setSelGugunCode] = useState("");
  const [regTab, setRegTab] = useState<"sido"|"gugun"|"dong">("sido");
  const [locKeyword, setLocKeyword] = useState("");
  const [locResults, setLocResults] = useState<any[]>([]);
  const [locTab, setLocTab] = useState<"region"|"keyword">("region");
  const [section1Filter, setSection1Filter] = useState(searchParams.get("section1") || "");
  const [section2Filter, setSection2Filter] = useState(searchParams.get("section2") || "");

  // URL 파라미터가 변경되면 지도 필터도 동기화 (뒤로가기/전환용)
  useEffect(() => {
    setSection1Filter(searchParams.get("section1") || "");
    setSection2Filter(searchParams.get("section2") || "");
  }, [searchParams]);



  const loadSidoData = async () => {
    try {
      const res = await fetch('https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=*00000000');
      const data = await res.json();
      setSidoList(data.regcodes || []);
    } catch (e) { console.error(e); }
  };

  const loadGugunData = async (code: string) => {
    setGugunList([]);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${code.substring(0,2)}*00000&is_ignore_zero=true`);
      const data = await res.json();
      setGugunList((data.regcodes || []).sort((a:any,b:any) => a.name.localeCompare(b.name)).map((c:any) => ({ code: c.code, name: c.name.split(' ').slice(1).join(' ') })));
    } catch (e) { console.error(e); }
  };

  const loadDongData = async (code: string) => {
    setDongList([]);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${code.substring(0,5)}*&is_ignore_zero=true`);
      const data = await res.json();
      setDongList((data.regcodes || []).filter((c:any) => c.code !== code).sort((a:any,b:any) => a.name.localeCompare(b.name)).map((c:any) => { const p = c.name.split(' '); return { code: c.code, name: p[p.length-1] }; }));
    } catch (e) { console.error(e); }
  };

  const moveToLocation = (keyword: string, zoom: number) => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services || !kakaoMapRef.current) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        const latlng = new kakao.maps.LatLng(parseFloat(data[0].y), parseFloat(data[0].x));
        kakaoMapRef.current.panTo(latlng);
        kakaoMapRef.current.setLevel(zoom);
      }
    });
  };

  const doLocKeywordSearch = () => {
    if (!locKeyword.trim()) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(locKeyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        setLocResults(data || []);
      } else {
        setLocResults([]);
      }
    });
  };

  const resetFilters = () => {
    setSection1Filter("");
    setSection2Filter("");
    setLocLabel("위치");
    setSelSido("");
    setSelGugun("");
    setSelSidoCode("");
    setSelGugunCode("");
    setRegTab("sido");
    setLocKeyword("");
    setLocResults([]);
    setLocTab("region");
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete("section1");
    params.delete("section2");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    if (kakaoMapRef.current) {
      const kakao = (window as any).kakao;
      kakaoMapRef.current.panTo(new kakao.maps.LatLng(37.5665, 126.978));
      kakaoMapRef.current.setLevel(6);
    }
  };

  useEffect(() => { if (activeTab === 'local' && sidoList.length === 0) loadSidoData(); }, [activeTab]);

  // 섹션 필터가 적용된 localArticles (지도 마커 + 리스트 모두에 사용)
  const filteredLocalArticles = useMemo(() => {
    return localArticles.filter((a: any) => {
      if (section1Filter && a.section1 !== section1Filter) return false;
      if (section2Filter && a.section2 !== section2Filter) return false;
      return true;
    });
  }, [localArticles, section1Filter, section2Filter]);

  // 섹션 필터 적용 (section1/section2 정확 매칭)
  const filteredVisibleArticles = useMemo(() => {
    return visibleArticles.filter((a: any) => {
      if (section1Filter && a.section1 !== section1Filter) return false;
      if (section2Filter && a.section2 !== section2Filter) return false;
      return true;
    });
  }, [visibleArticles, section1Filter, section2Filter]);

  useEffect(() => { clusterModeRef.current = clusterMode; }, [clusterMode]);

  // 일반 뉴스 로드 (서버에서 받은 initialArticles 최우선 사용)
  useEffect(() => {
    const keywordMatch = searchParams.get("keyword") || "";
    const authorMatch = searchParams.get("author_name") || "";
    const savedKeyword = initialKeyword || "";
    const savedAuthor = initialAuthorName || "";

    const loadSearchData = async () => {
      setLoading(true);
      const filters: any = { status: "APPROVED", limit: 30 };
      if (authorMatch) filters.author_name = authorMatch;
      if (keywordMatch) filters.keyword = keywordMatch;

      if (keywordMatch) {
        const [vRes, listRes, res] = await Promise.all([
          getVacancyCountByKeyword(keywordMatch),
          getVacancyListByKeyword(keywordMatch),
          getArticles(filters)
        ]);
        if (vRes.success) setVacancyCount(vRes.count || 0);
        else setVacancyCount(0);
        if (listRes.success) setVacancyList(listRes.data || []);
        else setVacancyList([]);
        if (res.success && res.data) setArticles(res.data);
      } else {
        setVacancyCount(0);
        setVacancyList([]);
        const res = await getArticles(filters);
        if (res.success && res.data) setArticles(res.data);
      }
      setLoading(false);
    };

    if (keywordMatch !== savedKeyword || authorMatch !== savedAuthor) {
      loadSearchData();
    } else {
      setArticles(initialArticles);
    }
  }, [searchParams, initialArticles, initialKeyword, initialAuthorName]);

  // 탭 전환 시 해당 카테고리 기사를 클라이언트에서 직접 fetch (SPA 전환으로 서버 컴포넌트가 안 돌 때 대비)
  useEffect(() => {
    if (activeTab === initialTab || activeTab === "local") return;
    const cat = CATEGORIES.find(c => c.key === activeTab);
    if (!cat || !cat.section1) return;

    const fetchCategoryArticles = async () => {
      setLoading(true);
      const res = await getArticles({ status: "APPROVED", limit: 30, section1: cat.section1 });
      if (res.success && res.data) setArticles(res.data);
      setLoading(false);
    };
    fetchCategoryArticles();
  }, [activeTab, initialTab]);

  // 우리동네뉴스 (lat/lng 있는 기사) 로드
  useEffect(() => {
    const loadLocalArticles = async () => {
      const res = await getArticles({ status: "APPROVED", limit: 100 });
      if (res.success && res.data) {
        const withLocation = res.data.filter((a: any) => a.lat && a.lng);
        setLocalArticles(withLocation);
      }
    };
    loadLocalArticles();
  }, []);
  // 뒤로 가기(안드로이드 하드웨어 백버튼 등) 처리 - pushState로 통일하여 Next.js 라우터 충돌 방지
  // popstate 핸들러는 위의 통합 useEffect에서 처리

  // 기사 상세 변경 시 스크롤 최상단 강제 초기화 (가장 확실한 방법)
  useEffect(() => {
    if (showDetail && detailPanelRef.current) {
      const el = detailPanelRef.current;
      el.scrollTop = 0;

      // 혹시 모를 렌더링 딜레이를 대비해 여러 번 강제 초기화
      let attempts = 0;
      const interval = setInterval(() => {
        if (el) el.scrollTop = 0;
        attempts++;
        if (attempts > 5) clearInterval(interval);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [articleDetail, showDetail]);

  // 기사 상세 조회 (우리동네뉴스는 인라인 패널, 나머지는 새 페이지)
  const handleSelectArticle = async (id: string, isLocal: boolean = false, e?: React.MouseEvent) => {
    if (isLocal) {
      // 1. 로컬 데이터에서 즉시 표시 (네트워크 대기 없이 0ms 렌더링)
      const localMatch = localArticles.find((a: any) => a.id === id);
      if (localMatch) {
        setArticleDetail(localMatch);
        setDetailLoading(false);
      } else {
        setDetailLoading(true);
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('panel') !== 'article-detail') {
        params.set('panel', 'article-detail');
        window.history.pushState({ panel: 'article-detail' }, '', '?' + params.toString());
      }
      setShowDetail(true);

      // 2. 백그라운드에서 상세 데이터 보완 (조회수 증가, 댓글, 키워드 등)
      const res = await getArticleDetail(id);
      if (res.success && res.data) {
        setArticleDetail((prev: any) => {
          if (prev && prev.id === res.data.id && prev.content?.includes("iframe")) {
            // 유튜브 등 iframe이 포함된 경우, 렌더링 깜빡임(영상 끊김)을 방지하기 위해 기존 content 유지
            return { ...res.data, content: prev.content };
          }
          return res.data;
        });
      }
      setDetailLoading(false);
    } else {
      router.push(`/m/news/${id}`);
    }
  };

  // 카카오 지도 초기화
  useEffect(() => {
    if (activeTab !== "local") {
      kakaoMapRef.current = null;
      setMapLoaded(false);
      return;
    }

    const initMap = () => {
      if (!mapRef.current || kakaoMapRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 6,
      });
      kakaoMapRef.current = map;
      setMapLoaded(true);
    };

    // Kakao Maps SDK 로드
    if ((window as any).kakao?.maps?.LatLng && (window as any).kakao?.maps?.MarkerClusterer) {
      initMap();
    } else {
      const scriptId = "kakao-map-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
        script.onload = () => {
          (window as any).kakao.maps.load(initMap);
        };
        document.head.appendChild(script);
      } else {
        const check = setInterval(() => {
          if ((window as any).kakao?.maps?.LatLng) {
            clearInterval(check);
            // clusterer 라이브러리 로드 대기
            if ((window as any).kakao.maps.MarkerClusterer) {
              initMap();
            } else {
              const check2 = setInterval(() => {
                if ((window as any).kakao?.maps?.MarkerClusterer) {
                  clearInterval(check2);
                  initMap();
                }
              }, 50);
              setTimeout(() => clearInterval(check2), 5000); // 5초 타임아웃
            }
          }
        }, 100);
      }
    }
  }, [activeTab, localArticles]);

  const localArticlesRef = useRef<any[]>([]);
  useEffect(() => {
    localArticlesRef.current = localArticles;
  }, [localArticles]);

  // 지도에 마커 업데이트 (localArticles 변경 시)
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;

    markersRef.current.forEach((m: any) => m.setMap(null));
    if (!clustererRef.current && kakao.maps.MarkerClusterer) {
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map: kakaoMapRef.current,
        averageCenter: true,
        minLevel: 4,
        gridSize: 60,
        disableClickZoom: true,
        calculator: [5, 10, 30, 50],
        texts: (count: number) => count.toString(),
        styles: [
          { width: '56px', height: '56px', background: 'rgba(255, 142, 21, 0.85)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '20px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
          { width: '66px', height: '66px', background: 'rgba(255, 130, 0, 0.88)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '22px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
          { width: '78px', height: '78px', background: 'rgba(230, 115, 0, 0.9)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '24px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 3px 10px rgba(0,0,0,0.25)' },
          { width: '90px', height: '90px', background: 'rgba(204, 102, 0, 0.92)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '26px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 3px 12px rgba(0,0,0,0.3)' },
          { width: '105px', height: '105px', background: 'rgba(178, 89, 0, 0.95)', color: '#fff', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 'bold', fontSize: '28px', border: '3px solid rgba(255,255,255,0.7)', boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }
        ]
      });

      kakao.maps.event.addListener(clustererRef.current, 'clusterclick', (cluster: any) => {
        const clusterMarkers = cluster.getMarkers();
        const clusterArticleIds = clusterMarkers.map((m: any) => m._articleId).filter(Boolean);
        const matched = localArticlesRef.current.filter(a => clusterArticleIds.includes(a.id));

        suppressIdleRef.current = true;
        kakaoMapRef.current.panTo(cluster.getCenter());
        setTimeout(() => { suppressIdleRef.current = false; }, 600);

        if (matched.length > 0) {
          setListPanelArticles(matched);
          setShowListPanel(true);
          const params = new URLSearchParams(window.location.search);
          if (params.get('panel') !== 'list-panel') {
            params.set('panel', 'list-panel');
            window.history.pushState({ panel: 'list-panel' }, '', '?' + params.toString());
          }
        }
      });
    }

    if (clustererRef.current) clustererRef.current.clear();
    markersRef.current = [];

    const newMarkers: any[] = [];
    filteredLocalArticles.forEach((a: any) => {
      if (!a.lat || !a.lng) return;
      const size = 48;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#ff8e15" stroke="white" stroke-width="3"/>
        <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="19" font-weight="bold" font-family="sans-serif">1</text>
      </svg>`;

      const markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(a.lat, a.lng),
        image: markerImage,
      });

      (marker as any)._articleId = a.id;

      kakao.maps.event.addListener(marker, "click", () => {
        const matched = filteredLocalArticles.filter((la: any) => la.lat === a.lat && la.lng === a.lng);
        setListPanelArticles(matched.length > 0 ? matched : [a]);
        setShowListPanel(true);
        
        suppressIdleRef.current = true;
        kakaoMapRef.current.panTo(new kakao.maps.LatLng(a.lat, a.lng));
        setTimeout(() => { suppressIdleRef.current = false; }, 600);
        
        const params = new URLSearchParams(window.location.search);
        if (params.get('panel') !== 'list-panel') {
          params.set('panel', 'list-panel');
          window.history.pushState({ panel: 'list-panel' }, '', '?' + params.toString());
        }
      });

      newMarkers.push(marker);
      markersRef.current.push(marker);
    });

    if (clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    } else {
      newMarkers.forEach(m => m.setMap(kakaoMapRef.current));
    }

    const updateVisible = () => {
      if (clusterModeRef.current) return;
      if (suppressIdleRef.current) return;
      const bounds = kakaoMapRef.current.getBounds();
      if (!bounds) return;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const visible = filteredLocalArticles.filter((a: any) => {
        if (!a.lat || !a.lng) return false;
        return a.lat >= sw.getLat() && a.lat <= ne.getLat() && a.lng >= sw.getLng() && a.lng <= ne.getLng();
      });
      setVisibleArticles(visible);
    };

    kakao.maps.event.addListener(kakaoMapRef.current, "idle", updateVisible);

    // Slight delay to allow map to render fully before taking bounds
    setTimeout(updateVisible, 300);

    return () => {
      kakao.maps.event.removeListener(kakaoMapRef.current, "idle", updateVisible);
    };
  }, [filteredLocalArticles, mapLoaded]);

  // ── 스와이프(좌우 슬라이드) 기능이 제거되고 상단 탭 클릭 방식으로 단순화되었습니다 ──
  const tabBarRef = useRef<HTMLDivElement>(null);

  // 탭 변경 시 카테고리 바 자동 스크롤
  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeBtn = tabBarRef.current.querySelector("[data-active='true']") as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  // 스크롤 복원 효과: activeTab이나 기사 목록이 바뀔 때 세션스토리지에 저장된 위치로 복원
  useEffect(() => {
    const scrollKey = `news_scroll_${activeTab}`;
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll && articles.length > 0) {
      // 렌더링 후 약간의 지연을 주어 정확한 스크롤 복구
      setTimeout(() => {
        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: "instant" });
        sessionStorage.removeItem(scrollKey); // 한 번 복원하면 삭제
      }, 50);
    }
  }, [activeTab, articles]);

  const handleArticleClick = () => {
    // 기사 상세로 넘어가기 전에 현재 스크롤 위치 저장
    sessionStorage.setItem(`news_scroll_${activeTab}`, window.scrollY.toString());
  };

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >

      {/* 카테고리 탭바 */}
          {/*
            외부 wrapper: position fixed + borderBottom 여기에만 지정 → 회색 바 절대 안 사라짘
            내부 자식에는 border 없음
          */}
          <div
            style={{
              position: "fixed",
              top: "0px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "448px",
              zIndex: 40,
              backgroundColor: "#ffffff",
              borderBottom: "9px solid #F4F6F8",
              display: "flex",
              alignItems: "stretch",
              height: "56px",
            }}
          >
            {/* 좌측 로고 — 고정 */}
            <button
              onClick={() => router.push("/m")}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "flex-end",
                padding: "0 8px 6px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <img src="/new_logo.png" alt="홈" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
            </button>

            {/* 중앙 스크롤 메뉴 */}
            <div
              ref={tabBarRef}
              className="hide-scrollbar"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-x",
                scrollBehavior: "smooth",
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  data-active={activeTab === cat.key ? "true" : "false"}
                  onClick={() => { 
                    router.push(cat.path);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: "0 14px 0",
                    fontSize: "17px",
                    fontWeight: activeTab === cat.key ? 700 : 500,
                    color: activeTab === cat.key ? "#1a2e50" : "#222222",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "color 0.2s",
                    whiteSpace: "nowrap",
                    letterSpacing: "-0.3px",
                  }}
                >
                  <span style={{
                    display: "inline-block",
                    paddingBottom: "3px",
                    borderBottom: activeTab === cat.key ? "3px solid #1a2e50" : "3px solid transparent",
                  }}>
                    {cat.label}
                  </span>
                </button>
              ))}
              {/* 검색 버튼에 가려지지 않도록 끝부분 여백 추가 */}
              <div style={{ flexShrink: 0, width: "40px" }} />
            </div>
            {/* 우측 검색 버튼 — 고정 */}
            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                position: "absolute",
                right: "0",
                top: "4px",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

          </div>


          {/* 탭바(56px) 만큼 콘텐츠 밀리기 */}
          <div style={{ height: "56px" }} />

          {/* 검색 오버레이 */}
          {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}

      {/* 우리동네뉴스: 카카오 지도 + 목록 스플릿 뷰 (키워드 검색이나 작가 검색이 아닐 때만 지도 뷰로 렌더링) */}
      {(activeTab === "local" && !searchParams.get("keyword") && !searchParams.get("author_name") && !initialKeyword && !initialAuthorName) ? (
        <div style={{ position: "fixed", top: "56px", bottom: "60px", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "448px", display: "flex", flexDirection: "column", zIndex: 10, background: "#fff" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: "0px" }}>
            {/* ═══ 위치·카테고리 필터 바 ═══ */}
            <style>{`
              @keyframes newsSheetUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }
              .news-filter-scroll::-webkit-scrollbar { display: none; }
              .news-filter-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div style={{ display: "flex", alignItems: "center", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 0", flexShrink: 0, width: "100%" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden" }}>
                <div className="news-filter-scroll" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} style={{ overflowX: "auto", display: "flex", gap: "8px", padding: "0 12px", WebkitOverflowScrolling: "touch" as any, alignItems: "center" }}>
                  <button onClick={() => setLocActivePanel(locActivePanel === "loc" ? null : "loc")} style={{ padding: "7px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, border: (locActivePanel === "loc" || locLabel !== "위치") ? "1.5px solid #508bf5" : "1px solid #d1d5db", background: (locActivePanel === "loc" || locLabel !== "위치") ? "#f0f6ff" : "#fff", color: (locActivePanel === "loc" || locLabel !== "위치") ? "#508bf5" : "#374151", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "4px" }}>
                    📍 {locLabel} ▾
                  </button>
                  <select value={section1Filter} onChange={(e) => { setSection1Filter(e.target.value); setSection2Filter(""); }} style={{ padding: "7px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, border: section1Filter ? "1.5px solid #508bf5" : "1px solid #d1d5db", background: section1Filter ? "#f0f6ff" : "#fff", color: section1Filter ? "#508bf5" : "#374151", cursor: "pointer", outline: "none", flexShrink: 0, appearance: "none" as any, WebkitAppearance: "none" as any, paddingRight: "24px", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                    <option value="">1차섹션 전체</option>
                    <option value="공실뉴스">공실뉴스</option>
                    <option value="부동산·경제">부동산·경제</option>
                    <option value="AI마케팅">AI마케팅</option>
                    <option value="라이프·오피니언">라이프·오피니언</option>
                  </select>
                  <select value={section2Filter} onChange={(e) => setSection2Filter(e.target.value)} style={{ padding: "7px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, border: section2Filter ? "1.5px solid #508bf5" : "1px solid #d1d5db", background: section2Filter ? "#f0f6ff" : "#fff", color: section2Filter ? "#508bf5" : "#374151", cursor: "pointer", outline: "none", flexShrink: 0, appearance: "none" as any, WebkitAppearance: "none" as any, paddingRight: "24px", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                    <option value="">2차섹션 전체</option>
                    {section1Filter && SECTION2_MAP[section1Filter]?.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div style={{ flexShrink: 0, width: "8px" }} />
                </div>
                <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "24px", background: "linear-gradient(to right, transparent, #fff)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* 위치 검색 바텀시트 */}
            {locActivePanel === "loc" && (
              <>
                <div onClick={() => setLocActivePanel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9990, transition: "opacity 0.2s" }} />
                <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 448, background: "#fff", borderRadius: "16px 16px 0 0", zIndex: 9991, maxHeight: "55vh", display: "flex", flexDirection: "column", animation: "newsSheetUp 0.3s ease-out" }}>
                  <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#111" }}>📍 위치 검색</span>
                    <button onClick={() => setLocActivePanel(null)} style={{ background: "none", border: "none", fontSize: "22px", color: "#9ca3af", cursor: "pointer", padding: "4px" }}>✕</button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}>
                    {/* 탭 */}
                    <div style={{ display: "flex", borderBottom: "2px solid #f3f4f6", marginBottom: "16px" }}>
                      <button onClick={() => setLocTab("region")} style={{ flex: 1, padding: "10px", fontSize: "14px", fontWeight: locTab === "region" ? 700 : 500, color: locTab === "region" ? "#508bf5" : "#9ca3af", borderBottom: locTab === "region" ? "2px solid #508bf5" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }}>지역선택</button>
                      <button onClick={() => setLocTab("keyword")} style={{ flex: 1, padding: "10px", fontSize: "14px", fontWeight: locTab === "keyword" ? 700 : 500, color: locTab === "keyword" ? "#508bf5" : "#9ca3af", borderBottom: locTab === "keyword" ? "2px solid #508bf5" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }}>키워드검색</button>
                    </div>

                    {locTab === "region" ? (
                      <div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                          {(["sido","gugun","dong"] as const).map(t => (
                            <button key={t} onClick={() => setRegTab(t)} style={{ flex: 1, padding: "8px 4px", fontSize: "13px", fontWeight: regTab === t ? 700 : 500, background: regTab === t ? "#508bf5" : "#f3f4f6", color: regTab === t ? "#fff" : "#6b7280", borderRadius: "6px", border: "none", cursor: "pointer" }}>
                              {t === "sido" ? "시/도" : t === "gugun" ? "시/군/구" : "읍/면/동"}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                          {regTab === "sido" && (sidoList.length > 0 ? sidoList.map((c: any) => (
                            <button key={c.code} onClick={() => { setSelSidoCode(c.code); setSelSido(c.name); setSelGugun(""); setRegTab("gugun"); loadGugunData(c.code); moveToLocation(c.name, 8); setLocLabel(c.name); }} style={{ padding: "10px 4px", borderRadius: "8px", fontSize: "13px", fontWeight: selSido === c.name ? 700 : 500, textAlign: "center", border: selSido === c.name ? "1.5px solid #508bf5" : "1px solid #e5e7eb", background: selSido === c.name ? "#f0f6ff" : "#fff", color: selSido === c.name ? "#508bf5" : "#374151", cursor: "pointer", transition: "all 0.15s" }}>{c.name}</button>
                          )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
                          {regTab === "gugun" && (!selSidoCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/도를 먼저 선택하세요</div> : gugunList.length > 0 ? gugunList.map((c: any) => (
                            <button key={c.code} onClick={() => { setSelGugunCode(c.code); setSelGugun(c.name); setRegTab("dong"); loadDongData(c.code); moveToLocation(`${selSido} ${c.name}`, 6); setLocLabel(`${c.name}`); }} style={{ padding: "10px 4px", borderRadius: "8px", fontSize: "13px", fontWeight: selGugun === c.name ? 700 : 500, textAlign: "center", border: selGugun === c.name ? "1.5px solid #508bf5" : "1px solid #e5e7eb", background: selGugun === c.name ? "#f0f6ff" : "#fff", color: selGugun === c.name ? "#508bf5" : "#374151", cursor: "pointer", transition: "all 0.15s" }}>{c.name}</button>
                          )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
                          {regTab === "dong" && (!selGugunCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/군/구를 먼저 선택하세요</div> : dongList.length > 0 ? dongList.map((c: any) => (
                            <button key={c.code} onClick={() => { moveToLocation(`${selSido} ${selGugun} ${c.name}`, 4); setLocLabel(`${selGugun} ${c.name}`); setLocActivePanel(null); }} style={{ padding: "10px 4px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, textAlign: "center", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer", transition: "all 0.15s" }}>{c.name}</button>
                          )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                          <input type="text" placeholder="동, 읍, 면 또는 랜드마크 검색" value={locKeyword} onChange={e => setLocKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && doLocKeywordSearch()} style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none" }} />
                          <button onClick={doLocKeywordSearch} style={{ padding: "10px 16px", background: "#508bf5", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>이동</button>
                        </div>
                        <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                          {locResults.map((r: any, i: number) => (
                            <div key={i} onClick={() => {
                              if (kakaoMapRef.current) {
                                const kakao = (window as any).kakao;
                                const latlng = new kakao.maps.LatLng(parseFloat(r.y), parseFloat(r.x));
                                kakaoMapRef.current.panTo(latlng);
                                kakaoMapRef.current.setLevel(5);
                              }
                              setLocLabel(r.place_name || r.address_name);
                              setLocActivePanel(null);
                            }} style={{ padding: "12px 4px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                              <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>{r.place_name || r.address_name}</div>
                              <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{r.address_name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 상단: 카카오 지도 (풀화면) */}
          <div
            className="map-container"
            style={{ position: "relative", width: "100%", flex: 1, flexShrink: 0 }}
          >
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

            {/* 지도 미로드 시 스켈레톤 */}
            {!mapLoaded && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#e8ecf0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div className="skeleton" style={{ width: "120px", height: "20px" }} />
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>지도를 불러오는 중...</p>
              </div>
            )}

            {/* 초기화 버튼 (좌측 상단 컴팩트하게) */}
            {mapLoaded && (
              <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 20 }}>
                <button 
                  onClick={resetFilters}
                  style={{ background: "rgba(255,255,255,0.9)", borderRadius: "20px", padding: "8px 14px", border: "1px solid #ddd", fontSize: "13px", fontWeight: 700, color: "#f97316", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                >
                  <span style={{ fontSize: "15px", lineHeight: 1 }}>↻</span>
                  초기화
                </button>
              </div>
            )}

            {/* 내 위치 검색 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.geolocation && kakaoMapRef.current) {
                  setIsLocating(true);
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const kakao = (window as any).kakao;
                    const latlng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                    kakaoMapRef.current.panTo(latlng);
                    kakaoMapRef.current.setLevel(5);
                    setIsLocating(false);
                  }, (err) => {
                    console.error("Geolocation error:", err);
                    setIsLocating(false);
                    handleLocationPermissionDenied();
                  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                } else {
                  handleLocationUnavailable();
                }
              }}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                zIndex: 20,
                background: "#f97316",
                color: "#fff",
                border: "none",
                borderRadius: "20px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(249,115,22,0.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {isLocating ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              )}
              내 위치
            </button>

            {/* 위치 검색 로딩 오버레이 */}
            {isLocating && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                <style>{`
                  @keyframes pulseRing {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                  }
                `}</style>
                <div style={{ position: "relative", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                  <div style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "#fed7aa", animation: "pulseRing 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite" }} />
                  <div style={{ position: "relative", width: "32px", height: "32px", borderRadius: "50%", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                  </div>
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>현재 위치를 찾고 있습니다</h3>
                <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>
                  GPS 상태에 따라<br/>수 초 정도 소요될 수 있습니다.
                </p>
              </div>
            )}

            {/* 지도위 기사 목록 보기 버튼 */}
            {visibleArticles.length > 0 && mapLoaded && (
              <div style={{ position: "absolute", bottom: "80px", left: "0", width: "100%", display: "flex", justifyContent: "center", zIndex: 20 }}>
                <button
                  onClick={() => {
                    setListPanelArticles(visibleArticles);
                    setShowListPanel(true);
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('panel') !== 'list-panel') {
                      params.set('panel', 'list-panel');
                      window.history.pushState({ panel: 'list-panel' }, '', '?' + params.toString());
                    }
                  }}
                  style={{
                    background: "#f97316",
                    color: "#fff",
                    border: "none",
                    borderRadius: "30px",
                    padding: "12px 24px",
                    fontSize: "16px",
                    fontWeight: 800,
                    boxShadow: "0 6px 16px rgba(249,115,22,0.4)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  지도 위 기사 {visibleArticles.length}개
                </button>
              </div>
            )}
          </div>

          {/* ── 리스트 패널 (우→좌 슬라이드) ── */}
          <div className={`news-detail-panel ${showListPanel ? "open" : ""}`} style={{ zIndex: 1500 }}>
            {/* 헤더 */}
            <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <button onClick={() => window.history.back()} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111" }}>해당 지역 기사 {listPanelArticles.length}개</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", background: "#fff", paddingBottom: "40px" }}>
              {listPanelArticles.map((article: any) => (
                <div
                  key={article.id}
                  onClick={() => handleSelectArticle(article.id, true)}
                  style={{ display: "flex", flexDirection: "column", padding: "20px 16px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", background: "#fff" }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#dc2626", marginBottom: "8px" }}>NEWS</div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#111", lineHeight: 1.35, marginBottom: "10px", wordBreak: "keep-all" }}>{article.title}</div>
                  <div style={{ fontSize: "14px", color: "#666", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "14px" }}>
                    {article.subtitle || stripHtml(article.content || "").slice(0, 100)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#222222", fontWeight: 500 }}>
                      {formatDate(article.published_at || article.created_at)} · {article.author_name || "공실뉴스"}
                      {article.location_name && ` · 📍${article.location_name}`}
                    </span>
                    <span style={{ color: "#f97316", fontWeight: 700 }}>기사상세보기 &gt;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      ) : (
        /* 일반 뉴스 리스트 뷰 */
        <div style={{ flex: 1, paddingBottom: "20px" }}>
          {/* 2차 카테고리 탭바 (PC와 동일) */}
          {(() => {
            const cat = CATEGORIES.find(c => c.key === activeTab);
            const subs = cat?.section1 ? SECTION2_MAP[cat.section1] : null;
            if (!subs || subs.length === 0) return null;
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.max(4, Math.min(5, subs.length + 1))}, 1fr)`,
                  gap: "4px",
                  padding: "14px 12px",
                  background: "#fff",
                  borderBottom: "8px solid #f4f6f8",
                }}
              >
                {/* '전체' 아이콘 */}
                {(() => {
                  const isActive = section2Tab === "";
                  return (
                    <button
                      onClick={() => handleSection2Click("")}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 0",
                        color: isActive ? "#508bf5" : "#333",
                        transition: "color 0.2s",
                      }}
                    >
                      {isActive ? SECTION2_ICONS_FILLED["전체"] : SECTION2_ICONS["전체"]}
                      <span style={{ fontSize: "12px", fontWeight: isActive ? 700 : 400, color: isActive ? "#508bf5" : "#333", letterSpacing: "-0.5px", lineHeight: 1.2 }}>전체</span>
                    </button>
                  );
                })()}
                
                {/* 각 2차 카테고리 아이콘 */}
                {subs.map(sub => {
                  const isActive = section2Tab === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => handleSection2Click(sub)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 0",
                        color: isActive ? "#508bf5" : "#333",
                        transition: "color 0.2s",
                      }}
                    >
                      {isActive ? (SECTION2_ICONS_FILLED[sub] || SECTION2_ICONS_FILLED["전체"]) : (SECTION2_ICONS[sub] || SECTION2_ICONS["전체"])}
                      <span style={{ fontSize: "12px", fontWeight: isActive ? 700 : 400, color: isActive ? "#508bf5" : "#333", letterSpacing: "-0.5px", textAlign: "center", wordBreak: "keep-all", lineHeight: 1.2 }}>
                        {sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* 2줄 프리미엄 개인화 헤더 카드 */}
          {(() => {
            const isKeywordSearch = !!(initialKeyword || searchParams.get("keyword"));
            const isAuthorView = !!(authorProfile || initialAuthorName);
            if (isKeywordSearch || isAuthorView) return null;

            const activeSub = section2Tab || "전체";
            const mentalText = PERSONALIZED_MENTAL_MAP[activeTab]?.[activeSub] || "추천 뉴스";
            const displayName = memberName || "부동산";

            return (
              <div style={{ padding: "20px 20px 12px", backgroundColor: "#fff", borderBottom: "8px solid #f4f6f8" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280", letterSpacing: "-0.3px" }}>
                    <span style={{ fontWeight: 800, color: "#111", background: "linear-gradient(180deg, transparent 50%, rgba(254, 240, 138, 0.9) 50%)", padding: "2px 4px", borderRadius: "2px" }}>{displayName} 대표님</span>을 위한
                  </span>
                  <h2 style={{ fontSize: "19px", fontWeight: 900, color: "#508bf5", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.3 }}>
                    {mentalText} <span style={{ color: "#111", fontWeight: "normal" }}>News</span>
                  </h2>
                </div>
              </div>
            );
          })()}
          {/* Author Profile Header */}
          {(authorProfile || initialAuthorName) && (
            <AuthorProfileHeader profile={authorProfile || { name: initialAuthorName, role: 'REALTOR', profile_image_url: null }} />
          )}

          {/* Keyword Search Result Header (Tab UI) */}
          {(initialKeyword || searchParams.get("keyword")) && (
            <div style={{ background: "#fff", display: "flex", flexDirection: "column", borderBottom: "1px solid #eee" }}>
              <div style={{ padding: "16px 16px 12px" }}>
                <span style={{ fontSize: "18px", fontWeight: 800, color: "#111" }}>#{initialKeyword || searchParams.get("keyword")}</span>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#666", marginLeft: "6px" }}>검색결과</span>
              </div>
              
              <div style={{ display: "flex" }}>
                <div 
                  onClick={() => setSearchTab('article')}
                  style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: "15px", fontWeight: searchTab === 'article' ? 800 : 600, color: searchTab === 'article' ? "#111" : "#888", borderBottom: searchTab === 'article' ? "3px solid #111" : "3px solid transparent", cursor: "pointer" }}>
                  관련기사 <span style={{ color: searchTab === 'article' ? "#508bf5" : "#888" }}>{articles.length}</span>
                </div>
                <div 
                  onClick={() => setSearchTab('vacancy')}
                  style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: "15px", fontWeight: searchTab === 'vacancy' ? 800 : 600, color: searchTab === 'vacancy' ? "#111" : "#888", borderBottom: searchTab === 'vacancy' ? "3px solid #111" : "3px solid transparent", cursor: "pointer" }}>
                  관련공실 <span style={{ color: searchTab === 'vacancy' ? "#508bf5" : "#888" }}>{vacancyCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* 스켈레톤 로딩 */}
          {loading && articles.length === 0 && (
            <div style={{ padding: "16px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", gap: "12px", padding: "16px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: "16px", width: "90%", marginBottom: "8px" }} />
                    <div className="skeleton" style={{ height: "16px", width: "70%", marginBottom: "8px" }} />
                    <div className="skeleton" style={{ height: "12px", width: "40%" }} />
                  </div>
                  <div className="skeleton" style={{ width: "84px", height: "64px", borderRadius: "8px", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}

          {/* 공실 리스트 (관련공실 탭일 경우) */}
          {searchTab === 'vacancy' && (
            <div style={{ background: "#f9fafb", padding: "8px 16px 20px" }}>
              {vacancyList.map((v: any) => {
                const cardMasked = v.exposure_type === '부동산노출' && userLevel < 2;
                const showCommission = userLevel >= 2;
                const baseAddr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ");
                const cardAddr = cardMasked ? (baseAddr || "주소 없음").replace(/[^\s]/g, "X") : baseAddr;
                return (
                  <div
                    key={v.id}
                    className="v-card"
                    onClick={() => {
                        if (cardMasked) {
                            setIsAuthModalOpen(true);
                            return;
                        }
                        setSelectedVacancyId(v.id);
                    }}
                    style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s", background: "#fff" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Badges & Date */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                        {showCommission && (v.realtor_commission || v.commission_type) && (
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#508bf5", border: "1px solid #508bf5", padding: "1px 6px", borderRadius: "3px" }}>
                            {v.realtor_commission || v.commission_type}
                          </span>
                        )}
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#508bf5" }}>{v.vacancy_no || '-'}</span>
                        <span style={{ fontSize: "12px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                        {cardMasked && <span onClick={(e) => { e.stopPropagation(); setIsAuthModalOpen(true); }} style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "3px 8px", borderRadius: "4px", cursor: "pointer" }}>🔒 부동산회원 무료열람</span>}
                      </div>

                      {/* Title */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <p style={{ fontSize: "16px", fontWeight: 800, color: cardMasked ? "#bbb" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: cardMasked ? 1 : 0 }}>
                          {cardAddr}
                        </p>
                      </div>
                      
                      {/* Price (Blue) */}
                      <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a73e8", marginBottom: "6px" }}>
                        {v.trade_type} {formatPrice(v)}
                      </p>
                      
                      {/* Specs 1: Type | Direction | Area */}
                      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                      </p>
                      
                      {/* Specs 2: Rooms, Options */}
                      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {[v.room_count !== undefined ? `룸 ${v.room_count}개` : null, v.bath_count !== undefined ? `욕실 ${v.bath_count}개` : null, ...(v.options || [])].filter(Boolean).join(", ")}
                      </p>

                      {/* Themes */}
                      {v.themes && v.themes.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                          {v.themes.map((theme: string, idx: number) => (
                            <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: "12px", padding: "2px 8px", borderRadius: "12px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                              {theme.startsWith('#') ? theme : `# ${theme}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {v.images?.[0] && (
                      <div style={{ width: "90px", height: "72px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, backgroundColor: "#e5e7eb", alignSelf: "center" }}>
                        <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ flexShrink: 0, alignSelf: "center" }}><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                );
              })}
              {vacancyList.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏢</div>
                  <p style={{ fontSize: "15px", fontWeight: 600 }}>해당 키워드의 공실이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 실 기사 리스트 */}
          {searchTab === 'article' && (() => {
            const regularArticles = filteredBySection2.filter(a => !a.is_important);
            
            const currentCatLabel = CATEGORIES.find(c => c.key === activeTab)?.label || "공실뉴스";
            const popularArticles = [...filteredBySection2]
              .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
              .slice(0, 5);
            
            return (
              <div>
                {/* 중요 뉴스 슬라이딩 캐러셀 (추천) */}
                {importantArticles.length > 0 && (
                  <RecommendedNewsCarousel 
                    importantArticles={importantArticles}
                    currentCatLabel={currentCatLabel}
                    activeTab={activeTab}
                    extractYoutubeId={extractYoutubeId}
                  />
                )}

                {/* 많이 본 뉴스 순위 리스트 (2차 카테고리가 전체일 때만 노출) */}
                {section2Tab === "" && popularArticles.length > 0 && (
                  <div style={{ padding: "20px 16px", borderBottom: "8px solid #f4f6f8", backgroundColor: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{ fontSize: "16px", fontWeight: 800, color: "#508bf5" }}>{currentCatLabel}</span>
                      <span style={{ fontSize: "16px", fontWeight: 800, color: "#1f2937", marginLeft: "5px" }}>많이 본 뉴스</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {popularArticles.map((a: any, idx: number) => {
                        const rank = idx + 1;
                        const isTop3 = rank <= 3;
                        return (
                          <Link
                            href={`/m/news/${a.article_no || a.id}`}
                            key={`popular-${a.id}`}
                            onClick={() => sessionStorage.setItem(`news_scroll_${activeTab}`, window.scrollY.toString())}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "12px",
                              textDecoration: "none",
                              cursor: "pointer",
                              padding: "4px 0"
                            }}
                          >
                            <span
                              style={{
                                fontSize: "17px",
                                fontWeight: 800,
                                fontStyle: "italic",
                                color: isTop3 ? "#508bf5" : "#71717a",
                                width: "18px",
                                textAlign: "center",
                                flexShrink: 0,
                                marginTop: "1px"
                              }}
                            >
                              {rank}
                            </span>
                            <span
                              style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "#1f2937",
                                lineHeight: "1.4",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                wordBreak: "keep-all"
                              }}
                            >
                              {a.title}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* 일반 뉴스 리스트 */}
                {regularArticles.map((a: any) => (
                  <ArticleRow 
                    key={a.id}
                    a={a}
                    activeTab={activeTab}
                    formatDate={formatDate}
                    stripHtml={stripHtml}
                    extractYoutubeId={extractYoutubeId}
                  />
                ))}
              </div>
            );
          })()}

          {!loading && searchTab === 'article' && articles.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📰</div>
                  <p style={{ fontSize: "15px", fontWeight: 600 }}>아직 기사가 없습니다.</p>
                </div>
              )}
        </div>
      )}
      {/* 기사 상세 뷰 (모바일 슬라이딩 패널) - 우리동네뉴스 전용 */}
      <div ref={detailPanelRef} className={`news-detail-panel ${showDetail ? "open" : ""}`} style={{ zIndex: 2000 }}>
        {/* 헤더 */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <button onClick={() => window.history.back()} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: "pointer" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        </div>

        {/* 로딩 상태 */}
        {detailLoading ? (
          <div style={{ padding: "20px" }}>
            <div className="skeleton" style={{ width: "80%", height: "24px", marginBottom: "16px" }} />
            <div className="skeleton" style={{ width: "40%", height: "16px", marginBottom: "30px" }} />
            <div className="skeleton" style={{ width: "100%", height: "200px", marginBottom: "16px" }} />
          </div>
        ) : articleDetail ? (
          <div style={{ padding: "0 20px 40px", backgroundColor: "#fff" }}>
            {/* 섹션 */}
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", marginTop: "16px" }}>
              [{articleDetail.section1 || "뉴스"} &gt; {articleDetail.section2 || "전체"}]
            </div>
            {/* 제목 */}
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: "16px", wordBreak: "keep-all" }}>
              {articleDetail.title}
            </h1>
            {/* 작성자 & 작성일 & 원본보기 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", color: "#666" }}>
                <span style={{ fontWeight: 700, color: "#111", marginRight: "8px" }}>{articleDetail.author_name || "공실뉴스"}</span>
                <span style={{ color: "#d1d5db", margin: "0 4px" }}>|</span>
                {formatDateFull(articleDetail.published_at || articleDetail.created_at)}
              </div>
              <button
                onClick={() => router.push(`/m/news/${articleDetail.article_no || articleDetail.id}`)}
                style={{ fontSize: "12px", color: "#508bf5", border: "1px solid #508bf5", background: "#fff", borderRadius: "20px", padding: "4px 10px", cursor: "pointer" }}
              >
                원본보기
              </button>
            </div>

            {/* 부제목 */}
            {articleDetail.subtitle && (
              <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderLeft: "4px solid #d97706", fontSize: "15px", color: "#374151", lineHeight: 1.6, marginBottom: "24px", fontWeight: 600 }}>
                {articleDetail.subtitle}
              </div>
            )}

            {/* 본문 */}
            <div
              style={{ fontSize: "16px", lineHeight: 1.8, color: "#333", wordBreak: "keep-all" }}
              dangerouslySetInnerHTML={{ 
                __html: (articleDetail.content || "")
                  .replace(/<button[^>]*class="editor-media-delete"[^>]*>.*?<\/button>/gi, '') 
              }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const a = target.closest('a');
                if (a && a.href) {
                  e.preventDefault();
                  let url = a.href;
                  try {
                    const urlObj = new URL(url);
                    if (urlObj.pathname === '/gongsil' || urlObj.pathname === '/m/gongsil') {
                      const id = urlObj.searchParams.get('id');
                      if (id) {
                        setSelectedVacancyId(id);
                        return;
                      }
                    }
                    if (urlObj.origin === window.location.origin) {
                      router.push(urlObj.pathname + urlObj.search + urlObj.hash);
                    } else {
                      window.location.href = url;
                    }
                  } catch (err) {
                    window.location.href = url;
                  }
                }
              }}
            />
          </div>
        ) : (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#999" }}>
            기사를 불러올 수 없습니다.
          </div>
        )}
      </div>
      
      {/* Vacancy Iframe Overlay */}
      <div 
        className={`vacancy-iframe-overlay ${selectedVacancyId ? "open" : ""}`} 
        style={{
          position: "fixed", top: 0, left: "50%", width: "100%", maxWidth: "448px",
          marginLeft: "-224px", height: "100dvh", background: "#fff", zIndex: 9999999,
          transform: selectedVacancyId ? "translateX(0)" : "translateX(100vw)",
          transition: "transform 0.35s cubic-bezier(0.25,1,0.5,1)",
          display: "flex", flexDirection: "column"
        }}
      >
        <style>{`@media (max-width: 448px) { .vacancy-iframe-overlay { margin-left: -50vw !important; } }`}</style>
        {selectedVacancyId && (
          <iframe 
            src={`/m/gongsil?id=${selectedVacancyId}&embed=true`} 
            style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
            title="vacancy-detail"
          />
        )}
      </div>
      
      {/* 플로팅 지도 <-> 목록 토글 버튼 (심플 원형 오렌지) */}
      {!showDetail && (
        <>
          {/* 목록 페이지일 때 -> 지도보기 버튼 */}
          {activeTab !== 'local' && searchTab === 'article' && (() => {
            const section1 = KEY_TO_SECTION1[activeTab] || "";
            const mapUrl = `/m/news_map?from=${activeTab}${section1 ? `&section1=${encodeURIComponent(section1)}` : ""}${section2Tab ? `&section2=${encodeURIComponent(section2Tab)}` : ""}`;
            return (
              <Link
                href={mapUrl}
                style={{
                  position: "fixed",
                  bottom: "80px",
                  right: "16px",
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  backgroundColor: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(234, 88, 12, 0.4)",
                  zIndex: 9998,
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                  color: "#fff"
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ userSelect: "none" }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </Link>
            );
          })()}


        </>
      )}

      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .news-detail-panel {
          position: fixed; top: 0; left: 50%; width: 100%; max-width: 448px; height: 100dvh;
          margin-left: -224px; /* max-width 448px 의 절반 */
          background: #fff; z-index: 9999; transform: translateX(100vw);
          transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
          overflow-y: auto;
        }
        @media (max-width: 448px) {
          .news-detail-panel {
            margin-left: -50vw;
          }
        }
        .news-detail-panel.open { transform: translateX(0); }
        .skeleton { background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .article-row { -webkit-user-select: none; user-select: none; }
        .article-row:active { background: #f3f4f6 !important; }
        .slide-out-left { animation: slideOutLeft 0.15s ease forwards; }
        .slide-out-right { animation: slideOutRight 0.15s ease forwards; }
        .slide-in-left { animation: slideInLeft 0.2s ease forwards; }
        .slide-in-right { animation: slideInRight 0.2s ease forwards; }
        @keyframes slideOutLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-100%); opacity: 0; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        @keyframes slideInLeft { from { transform: translateX(-40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function MobileNewsClientWrapper(props: { initialTab: string, initialArticles: any[], initialAuthorName?: string, initialKeyword?: string, authorProfile?: any }) {
  return (
    <Suspense fallback={null}>
      <MobileNewsClient {...props} />
    </Suspense>
  );
}
